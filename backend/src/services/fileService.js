const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, BUCKET_NAME } = require('../config/s3');
const File = require('../models/File');
const User = require('../models/User');
const encryptionService = require('./encryptionService');
const { v4: uuidv4 } = require('uuid');
const mockStorageStore = require('../utils/mockStorageStore');
const mockAuthStore = require('../utils/mockAuthStore');

const uploadFile = async (user, fileData, originalName, mimeType, vaultKey, folder = null, options = {}) => {
    const mockMode = Boolean(options.mockMode);
    const selectedAlgorithm = encryptionService.normalizeAlgorithm(options.encryptionAlgorithm);
    const fileId = uuidv4();
    const s3Key = `${user._id}/${fileId}`;

    // Encrypt file data with user-specific vault key
    const { iv, encryptedData, algorithm, authTag } = encryptionService.encrypt(fileData, vaultKey, {
        algorithm: selectedAlgorithm,
    });

    const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: encryptedData,
        ContentType: mimeType,
        Metadata: {
            originalName: originalName,
            owner: user._id.toString(),
            isEncrypted: 'true',
            encryptionAlgorithm: algorithm,
        },
    };

    try {
        await s3Client.send(new PutObjectCommand(uploadParams));
    } catch (err) {
        if (!mockMode) throw err;

        // Mock/offline fallback: store encrypted bytes in-memory so upload/download works even if S3 is misconfigured.
        const file = mockStorageStore.createFileMetadata({
            owner: user._id,
            filename: fileId,
            originalName,
            mimeType,
            s3Key,
            size: fileData.length,
            iv,
            folder,
            encryptionAlgorithm: algorithm,
            authTag,
        });
        mockStorageStore.setEncryptedDataForFile(fileId, encryptedData);

        const current = user.storageUsed ?? 0;
        mockAuthStore.updateUser(user._id, { storageUsed: current + fileData.length });
        return file;
    }

    if (mockMode) {
        const file = mockStorageStore.createFileMetadata({
            owner: user._id,
            filename: fileId,
            originalName,
            mimeType,
            s3Key,
            size: fileData.length,
            iv,
            folder,
            encryptionAlgorithm: algorithm,
            authTag,
        });
        // Update in-memory quota (best-effort for dev UX)
        const current = user.storageUsed ?? 0;
        mockAuthStore.updateUser(user._id, { storageUsed: current + fileData.length });
        return file;
    }

    // Save metadata to MongoDB
    const file = await File.create({
        owner: user._id,
        filename: fileId,
        originalName,
        mimeType,
        s3Key,
        size: fileData.length,
        iv,
        encryptionAlgorithm: algorithm,
        authTag,
        folder,
        isEncrypted: true,
    });

    // Update user storage quota
    await User.findByIdAndUpdate(user._id, { $inc: { storageUsed: fileData.length } });

    return file;
};

const getDownloadUrl = async (fileId, userId) => {
    const file = await File.findOne({ _id: fileId, owner: userId, isDeleted: false });
    if (!file) throw new Error('File not found or access denied');
    
    // ... existing logic ...
};

const deleteFile = async (fileId, userId, permanent = false) => {
    const file = await File.findOne({ _id: fileId, owner: userId });
    if (!file) throw new Error('File not found');

    if (permanent) {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: file.s3Key,
        }));
        await File.deleteOne({ _id: fileId });
    } else {
        file.isDeleted = true;
        file.deletedAt = new Date();
        await file.save();
    }

    // Decrement user storage quota if permanent delete (or keep it if soft delete? 
    // Usually quota counts even trashed files until emptied)
    if (permanent) {
        await User.findByIdAndUpdate(userId, {
            $inc: { storageUsed: -file.size },
        });
        // Safety clamp: ensure it doesn't go below 0
        await User.updateOne({ _id: userId, storageUsed: { $lt: 0 } }, { $set: { storageUsed: 0 } });
    }
};

const restoreFile = async (fileId, userId) => {
    const file = await File.findOne({ _id: fileId, owner: userId, isDeleted: true });
    if (!file) throw new Error('File not found in trash');

    file.isDeleted = false;
    file.deletedAt = null;
    await file.save();
    return file;
};

module.exports = {
    uploadFile,
    getDownloadUrl,
    deleteFile,
    restoreFile,
};
