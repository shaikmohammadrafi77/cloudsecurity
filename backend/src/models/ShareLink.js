const mongoose = require('mongoose');
const crypto = require('crypto');

const shareLinkSchema = new mongoose.Schema({
    file: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        required: true,
    },
    token: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomBytes(32).toString('hex'),
    },
    passwordHash: {
        type: String, // Optional password protection
    },
    expiresAt: {
        type: Date,
    },
    maxDownloads: {
        type: Number,
        default: 0, // 0 for unlimited
    },
    downloadCount: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('ShareLink', shareLinkSchema);
