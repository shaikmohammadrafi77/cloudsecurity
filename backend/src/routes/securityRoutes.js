const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/securityController');
const { protect } = require('../middleware/auth');

router.get('/logs', protect, getLogs);

module.exports = router;
