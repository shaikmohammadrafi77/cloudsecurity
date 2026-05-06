const SecurityLog = require('../models/SecurityLog');
const mongoose = require('mongoose');

const getLogs = async (req, res) => {
    const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;
    if (mockMode) {
        return res.json([]);
    }

    try {
        const logs = await SecurityLog.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getLogs,
};
