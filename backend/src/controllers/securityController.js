const SecurityLog = require('../models/SecurityLog');

const getLogs = async (req, res) => {
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
