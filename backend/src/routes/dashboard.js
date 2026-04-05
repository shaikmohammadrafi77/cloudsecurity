const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const File = require('../models/File');
const SecurityLog = require('../models/SecurityLog');
const mockStorageStore = require('../utils/mockStorageStore');

const router = express.Router();

const toMbString = (bytes) => {
    if (!bytes || Number.isNaN(Number(bytes))) return '0';
    return (Number(bytes) / (1024 * 1024)).toFixed(2);
};

router.get('/stats', protect, async (req, res) => {
    try {
        const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;
        const storageUsedBytes = req.user?.storageUsed ?? 0;
        const securityLevel = req.user?.twoFactorEnabled ? 'Maximum' : 'Standard';

        if (mockMode) {
            const files = mockStorageStore.listFiles({ owner: req.user._id, folder: undefined, trashed: false });
            return res.json({
                vaultStatus: 'Active',
                transfers: files.length,
                recentAccess: 0,
                securityLevel,
                storageUsed: toMbString(storageUsedBytes),
            });
        }

        const totalFiles = await File.countDocuments({ owner: req.user._id, isDeleted: false });

        // 24 hours ago
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentAccesslogs = await SecurityLog.countDocuments({
            user: req.user._id,
            createdAt: { $gte: twentyFourHoursAgo },
        });

        res.json({
            vaultStatus: 'Active',
            transfers: totalFiles,
            recentAccess: recentAccesslogs,
            securityLevel,
            storageUsed: toMbString(storageUsedBytes),
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
