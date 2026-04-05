const express = require("express");
const router = express.Router();
const File = require("../src/models/File");
const SecurityLog = require("../src/models/SecurityLog");
const User = require("../src/models/User");

router.get("/stats", async (req, res) => {
  try {
    const totalFiles = await File.countDocuments({ isDeleted: false });
    
    // 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAccesslogs = await SecurityLog.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } });
    
    // Calculate total storage used across non-deleted files
    const fileStats = await File.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, totalSize: { $sum: "$size" } } }
    ]);
    
    let storageUsedMB = 0;
    if (fileStats.length > 0 && fileStats[0].totalSize) {
      storageUsedMB = (fileStats[0].totalSize / (1024 * 1024)).toFixed(2);
    }
    
    const usersCount = await User.countDocuments();

    res.json({
      vaultStatus: "Active",
      transfers: totalFiles,
      recentAccess: recentAccesslogs,
      securityLevel: "Maximum",
      storageUsed: storageUsedMB,
      totalUsers: usersCount
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
