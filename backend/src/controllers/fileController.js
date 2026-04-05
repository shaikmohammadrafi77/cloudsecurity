const mongoose = require('mongoose');
const { parseOptionalObjectIdParam, isBenignListStorageError, ownerObjectIdOrNull } = require('../utils/queryId');
const logger = require('../utils/logger');
const requireMongoForStorage = require('../utils/requireMongoForStorage');
const fileService = require('../services/fileService');
const mockStorageStore = require('../utils/mockStorageStore');
const mockAuthStore = require('../utils/mockAuthStore');
const File = require('../models/File');
const securityService = require('../services/securityService');
const encryptionService = require('../services/encryptionService');
const { GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, BUCKET_NAME } = require('../config/s3');
const { Readable } = require('stream');

const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;

        const folderIdBody = parseOptionalObjectIdParam(req.body?.folderId);
        const selectedAlgorithm = req.body?.encryptionAlgorithm;

        let vaultKey;
        if (req.user.vaultSecret && req.user.vaultSalt) {
            vaultKey = encryptionService.generateVaultKey(req.user.vaultSecret, req.user.vaultSalt);
        } else if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length === 32) {
            vaultKey = process.env.ENCRYPTION_KEY;
        } else {
            return res.status(503).json({
                message: 'User vault keys are missing and ENCRYPTION_KEY is not a valid 32-character value.',
            });
        }

        const file = await fileService.uploadFile(
            req.user,
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            vaultKey,
            folderIdBody,
            {
                mockMode,
                encryptionAlgorithm: selectedAlgorithm,
            }
        );

        await securityService.logAction(req.user._id, 'FILE_UPLOAD', req, `File: ${file.originalName}`);
        res.status(201).json(file);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const listFiles = async (req, res) => {
    try {
        const ownerId = ownerObjectIdOrNull(req);
        if (!ownerId) {
            return res.status(401).json({ message: 'Invalid session' });
        }
        const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;
        const folderId = parseOptionalObjectIdParam(req.query.folderId);
        const trashed = req.query.trashed;

        if (mockMode) {
            const trashMode = trashed === 'true';
            const mockFolder = folderId
                ? folderId
                : trashMode
                  ? undefined
                  : null;
            const files = mockStorageStore.listFiles({ owner: ownerId, folder: mockFolder, trashed: trashMode });
            return res.json(files);
        }

        const query = { 
            owner: ownerId,
            isDeleted: trashed === 'true'
        };
        
        if (folderId) {
            query.folder = folderId;
        } else if (trashed !== 'true') {
            query.folder = null; // List root files
        }

        const files = await File.find(query).sort({ createdAt: -1 }).lean();
        res.json(files);
    } catch (error) {
        const rs = mongoose.connection.readyState;
        if (isBenignListStorageError(error, rs)) {
            return res.json([]);
        }
        logger.error('listFiles', { message: error?.message, name: error?.name });
        return res.json([]);
    }
};

const downloadFile = async (req, res) => {
    try {
        const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;
        const file = mockMode
            ? mockStorageStore.findFileById({ owner: req.user._id, id: req.params.id, trashed: false })
            : await File.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: false });
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        let encryptedBuffer = null;
        if (mockMode) {
            encryptedBuffer = mockStorageStore.getEncryptedDataForFile(req.params.id);
        }

        if (!encryptedBuffer) {
            const command = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: file.s3Key,
            });

            const response = await s3Client.send(command);
            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            encryptedBuffer = Buffer.concat(chunks);
        }

        // Derive Zero-Trust Vault Key for decryption
        let vaultKey = process.env.ENCRYPTION_KEY;
        if (req.user.vaultSecret && req.user.vaultSalt) {
            vaultKey = encryptionService.generateVaultKey(req.user.vaultSecret, req.user.vaultSalt);
        }

        // Decrypt the buffer
        let decryptedBuffer;
        const decryptionOptions = {
            algorithm: file.encryptionAlgorithm,
            authTag: file.authTag,
        };
        try {
            decryptedBuffer = encryptionService.decrypt(encryptedBuffer, file.iv, vaultKey, decryptionOptions);
        } catch (error) {
            // Fallback for files encrypted with legacy global key
            decryptedBuffer = encryptionService.decrypt(encryptedBuffer, file.iv, process.env.ENCRYPTION_KEY, decryptionOptions);
        }

        res.set({
            'Content-Type': file.mimeType,
            'Content-Disposition': `attachment; filename="${file.originalName}"`,
            'Content-Length': decryptedBuffer.length,
        });

        await securityService.logAction(req.user._id, 'FILE_DOWNLOAD', req, `File: ${file.originalName}`);
        res.send(decryptedBuffer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteFile = async (req, res) => {
    try {
        const { permanent } = req.query;

        const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;
        if (mockMode) {
            const file = mockStorageStore.findFileById({ owner: req.user._id, id: req.params.id, trashed: permanent === 'true' ? null : false });
            if (!file) {
                return res.status(404).json({ message: 'File not found' });
            }

            if (permanent === 'true') {
                try {
                    await s3Client.send(
                        new DeleteObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: file.s3Key,
                        })
                    );
                } catch (_) {
                    // In dev/mock mode, S3 may be misconfigured; metadata + encrypted bytes still work.
                }
                mockStorageStore.deleteFilePermanent({ owner: req.user._id, id: req.params.id });
                const current = req.user.storageUsed ?? 0;
                const next = Math.max(0, current - (file.size ?? 0));
                mockAuthStore.updateUser(req.user._id, { storageUsed: next });
            } else {
                mockStorageStore.softDeleteFile({ owner: req.user._id, id: req.params.id });
            }
        } else {
            await fileService.deleteFile(req.params.id, req.user._id, permanent === 'true');
        }

        await securityService.logAction(req.user._id, 'FILE_DELETE', req, `File: ${req.params.id}, Permanent: ${permanent}`);
        res.json({ message: permanent === 'true' ? 'File permanently deleted' : 'File moved to trash' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const restoreFile = async (req, res) => {
    try {
        const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;
        if (mockMode) {
            const restored = mockStorageStore.restoreFile({ owner: req.user._id, id: req.params.id });
            if (!restored) return res.status(404).json({ message: 'File not found in trash' });
            return res.json(restored);
        }

        const file = await fileService.restoreFile(req.params.id, req.user._id);
        return res.json(file);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateFile = async (req, res) => {
    try {
        const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;
        const { originalName, folderId } = req.body;
        if (mockMode) {
            const updated = mockStorageStore.updateFile({
                owner: req.user._id,
                id: req.params.id,
                patch: {
                    ...(originalName !== undefined ? { originalName } : {}),
                    ...(folderId !== undefined ? { folder: parseOptionalObjectIdParam(folderId) } : {}),
                },
            });
            if (!updated) return res.status(404).json({ message: 'File not found' });
            return res.json(updated);
        }

        const file = await File.findOne({ _id: req.params.id, owner: req.user._id });
        if (!file) return res.status(404).json({ message: 'File not found' });

        if (originalName) file.originalName = originalName;
        if (folderId !== undefined) {
            file.folder = parseOptionalObjectIdParam(folderId);
        }

        await file.save();
        res.json(file);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    uploadFile,
    listFiles,
    downloadFile,
    deleteFile,
    restoreFile,
    updateFile,
};
