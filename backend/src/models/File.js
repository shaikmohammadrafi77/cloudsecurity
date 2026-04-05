const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    filename: {
        type: String,
        required: true,
    },
    originalName: {
        type: String,
        required: true,
    },
    mimeType: {
        type: String,
        required: true,
    },
    s3Key: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
    },
    folder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Folder',
        default: null, // null means root
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
    isEncrypted: {
        type: Boolean,
        default: true,
    },
    iv: {
        type: String, // Initialization vector for AES
        required: true,
    },
    encryptionAlgorithm: {
        type: String,
        enum: ['aes-256-cbc', 'aes-256-gcm'],
        default: 'aes-256-cbc',
    },
    authTag: {
        type: String,
        default: null,
    },
    tags: [String],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('File', fileSchema);
