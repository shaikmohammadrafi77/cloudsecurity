const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    action: {
        type: String,
        required: true,
        enum: [
            'LOGIN_SUCCESS',
            'LOGIN_FAILURE',
            '2FA_ENABLED',
            '2FA_DISABLED',
            'FILE_UPLOAD',
            'FILE_DOWNLOAD',
            'FILE_DELETE',
            'SHARE_LINK_CREATED',
            'SHARE_LINK_ACCESSED',
            'PASSWORD_CHANGE'
        ],
    },
    details: {
        type: String,
    },
    ipAddress: {
        type: String,
    },
    userAgent: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('SecurityLog', securityLogSchema);
