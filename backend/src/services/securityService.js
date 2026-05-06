const mongoose = require('mongoose');
const SecurityLog = require('../models/SecurityLog');

const logAction = (userId, action, req, details = '') => {
    if (process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1) {
        return;
    }

    // Fire-and-forget: avoid adding DB-write latency to user requests.
    setImmediate(() => {
        SecurityLog.create({
            user: userId,
            action,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            details,
        }).catch((error) => {
            console.error('Failed to log security action:', error);
        });
    });
};

module.exports = {
    logAction,
};
