const ShareLink = require('../models/ShareLink');
const File = require('../models/File');
const User = require('../models/User');
const securityService = require('../services/securityService');
const encryptionService = require('../services/encryptionService');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, BUCKET_NAME } = require('../config/s3');
const bcrypt = require('bcryptjs');

const createShareLink = async (req, res) => {
    const { fileId, password, expiresAt, maxDownloads } = req.body;

    try {
        const file = await File.findOne({ _id: fileId, owner: req.user._id });
        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        const shareData = {
            file: fileId,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            maxDownloads: maxDownloads || 0,
        };

        if (password) {
            shareData.passwordHash = await bcrypt.hash(password, 10);
        }

        const shareLink = await ShareLink.create(shareData);

        await securityService.logAction(req.user._id, 'SHARE_LINK_CREATED', req, `File: ${file.originalName}`);

        res.status(201).json({
            token: shareLink.token,
            url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${shareLink.token}`,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSharedFile = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const shareLink = await ShareLink.findOne({ token }).populate('file');
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
            if (!password) {
                return res.status(401).json({ message: 'Password required', passwordRequired: true });
            }
            const isMatch = await bcrypt.compare(password, shareLink.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid password' });
            }
        }

        const file = shareLink.file;

        // Increment download count
        shareLink.downloadCount += 1;
        await shareLink.save();

        // Stream the file from S3
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: file.s3Key,
        });

        const response = await s3Client.send(command);
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const encryptedBuffer = Buffer.concat(chunks);

        // Derive Zero-Trust Vault Key from owner's secrets
        const owner = await User.findById(file.owner);
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

        await securityService.logAction(file.owner, 'SHARE_LINK_ACCESSED', req, `File: ${file.originalName}, Token: ${token}`);

        res.send(decryptedBuffer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createShareLink,
    getSharedFile,
};
