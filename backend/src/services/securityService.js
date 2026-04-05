const mongoose = require('mongoose');
const SecurityLog = require('../models/SecurityLog');

const logAction = async (userId, action, req, details = '') => {
    if (process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1) {
        return;
    }
    try {
        await SecurityLog.create({
            user: userId,
            action,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            details,
        });
    } catch (error) {
        console.error('Failed to log security action:', error);
    }
};

module.exports = {
    logAction,
};
