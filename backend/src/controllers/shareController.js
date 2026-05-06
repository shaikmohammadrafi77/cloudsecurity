const ShareLink = require('../models/ShareLink');
const File = require('../models/File');
const User = require('../models/User');
const securityService = require('../services/securityService');
const encryptionService = require('../services/encryptionService');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, BUCKET_NAME } = require('../config/s3');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const crypto = require('crypto');
const mockStorageStore = require('../utils/mockStorageStore');
const mockAuthStore = require('../utils/mockAuthStore');

const mockShareLinks = new Map();

const isMockMode = () => process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;

const buildShareUrl = (token) => `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${token}`;

const normalizeMaxDownloads = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return 0;
    return Math.floor(numeric);
};

const parseExpiresAt = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date;
};

const readObjectFromS3 = async (key) => {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    const response = await s3Client.send(command);
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};

const mapShareLinkForResponse = (shareLink, file) => {
    const expiresAt = shareLink.expiresAt ? new Date(shareLink.expiresAt) : null;
    const maxDownloads = Number(shareLink.maxDownloads || 0);
    const downloadCount = Number(shareLink.downloadCount || 0);
    const isExpired = Boolean(expiresAt && expiresAt < new Date());
    const isDownloadLimitReached = maxDownloads > 0 && downloadCount >= maxDownloads;

    return {
        id: shareLink._id ? String(shareLink._id) : String(shareLink.token),
        token: shareLink.token,
        url: buildShareUrl(shareLink.token),
        hasPassword: Boolean(shareLink.passwordHash),
        fileId: file?._id ? String(file._id) : String(shareLink.file || ''),
        fileName: file?.originalName || 'Unknown file',
        mimeType: file?.mimeType || 'application/octet-stream',
        size: Number(file?.size || 0),
        createdAt: shareLink.createdAt || null,
        expiresAt,
        maxDownloads,
        downloadCount,
        isExpired,
        isDownloadLimitReached,
        isActive: !isExpired && !isDownloadLimitReached,
    };
};

const createShareLink = async (req, res) => {
    const { fileId, password, expiresAt, maxDownloads } = req.body;
    const normalizedFileId = String(fileId || '').trim();
    const normalizedPassword = typeof password === 'string' ? password.trim() : '';
    const normalizedExpiresAt = parseExpiresAt(expiresAt);
    const normalizedMaxDownloads = normalizeMaxDownloads(maxDownloads);
    const mockMode = isMockMode();

    if (!normalizedFileId) {
        return res.status(400).json({ message: 'fileId is required' });
    }
    if (normalizedExpiresAt === undefined) {
        return res.status(400).json({ message: 'Invalid expiration date' });
    }
    if (!mockMode && !mongoose.isValidObjectId(normalizedFileId)) {
        return res.status(404).json({ message: 'File not found' });
    }

    try {
        const file = mockMode
            ? mockStorageStore.findFileById({ owner: req.user._id, id: normalizedFileId, trashed: false })
            : await File.findOne({ _id: normalizedFileId, owner: req.user._id }).select('originalName');

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        let passwordHash = null;
        if (normalizedPassword) {
            passwordHash = await bcrypt.hash(normalizedPassword, 10);
        }

        let token;
        if (mockMode) {
            token = crypto.randomBytes(32).toString('hex');
            while (mockShareLinks.has(token)) {
                token = crypto.randomBytes(32).toString('hex');
            }

            mockShareLinks.set(token, {
                token,
                file: normalizedFileId,
                owner: req.user._id,
                passwordHash: passwordHash || undefined,
                expiresAt: normalizedExpiresAt,
                maxDownloads: normalizedMaxDownloads,
                downloadCount: 0,
                createdAt: new Date(),
            });
        } else {
            const shareData = {
                file: normalizedFileId,
                expiresAt: normalizedExpiresAt,
                maxDownloads: normalizedMaxDownloads,
            };
            if (passwordHash) {
                shareData.passwordHash = passwordHash;
            }

            const shareLink = await ShareLink.create(shareData);
            token = shareLink.token;
        }

        securityService.logAction(req.user._id, 'SHARE_LINK_CREATED', req, `File: ${file.originalName}`);

        res.status(201).json({
            token,
            url: buildShareUrl(token),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSharedFile = async (req, res) => {
    const { token } = req.params;
    const normalizedToken = String(token || '').trim();
    const { password } = req.body || {};
    const normalizedPassword = typeof password === 'string' ? password.trim() : '';
    const mockMode = isMockMode();

    if (!normalizedToken) {
        return res.status(404).json({ message: 'Link not found or expired' });
    }

    try {
        const shareLink = mockMode
            ? mockShareLinks.get(normalizedToken)
            : await ShareLink.findOne({ token: normalizedToken }).populate('file');

        if (!shareLink) {
            return res.status(404).json({ message: 'Link not found or expired' });
        }

        // Check expiration
        if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
            return res.status(410).json({ message: 'Link has expired' });
        }

        // Check download limit
        if (shareLink.maxDownloads > 0 && shareLink.downloadCount >= shareLink.maxDownloads) {
            return res.status(410).json({ message: 'Download limit reached' });
        }

        // Check password
        if (shareLink.passwordHash) {
            if (!normalizedPassword) {
                return res.status(401).json({ message: 'Password required', passwordRequired: true });
            }
            const isMatch = await bcrypt.compare(normalizedPassword, shareLink.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid password' });
            }
        }

        const file = mockMode
            ? mockStorageStore.findFileById({ owner: shareLink.owner, id: shareLink.file, trashed: false })
            : shareLink.file;
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Increment download count
        shareLink.downloadCount += 1;
        if (!mockMode) {
            await shareLink.save();
        }

        const encryptedBuffer =
            (mockMode && mockStorageStore.getEncryptedDataForFile(file._id)) ||
            (await readObjectFromS3(file.s3Key));

        // Derive Zero-Trust Vault Key from owner's secrets
        const owner = mockMode ? mockAuthStore.findById(file.owner) : await User.findById(file.owner);
        let vaultKey = process.env.ENCRYPTION_KEY;
        if (owner && owner.vaultSecret && owner.vaultSalt) {
            vaultKey = encryptionService.generateVaultKey(owner.vaultSecret, owner.vaultSalt);
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

        securityService.logAction(file.owner, 'SHARE_LINK_ACCESSED', req, `File: ${file.originalName}, Token: ${normalizedToken}`);

        res.send(decryptedBuffer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMyShareLinks = async (req, res) => {
    const includeInactive = String(req.query.includeInactive || 'false') === 'true';
    const mockMode = isMockMode();

    try {
        if (mockMode) {
            const ownerId = String(req.user._id);
            const links = [];

            for (const link of mockShareLinks.values()) {
                if (String(link.owner) !== ownerId) continue;
                const file = mockStorageStore.findFileById({ owner: req.user._id, id: link.file, trashed: false });
                if (!file) continue;
                const mapped = mapShareLinkForResponse(link, file);
                if (!includeInactive && !mapped.isActive) continue;
                links.push(mapped);
            }

            links.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            return res.json(links);
        }

        const ownedFileIds = await File.find({ owner: req.user._id }).distinct('_id');
        if (!ownedFileIds.length) {
            return res.json([]);
        }

        const shareLinks = await ShareLink.find({ file: { $in: ownedFileIds } })
            .populate('file', 'originalName mimeType size')
            .sort({ createdAt: -1 })
            .lean();

        const response = [];
        for (const link of shareLinks) {
            if (!link.file) continue;
            const mapped = mapShareLinkForResponse(link, link.file);
            if (!includeInactive && !mapped.isActive) continue;
            response.push(mapped);
        }

        return res.json(response);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createShareLink,
    getSharedFile,
    getMyShareLinks,
};
