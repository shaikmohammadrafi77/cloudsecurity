const express = require('express');
const router = express.Router();
const { createShareLink, getSharedFile, getMyShareLinks } = require('../controllers/shareController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getMyShareLinks);
router.post('/create', protect, createShareLink);
router.post('/access/:token', getSharedFile); // POST to allow password transmission

module.exports = router;
