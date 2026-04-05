const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFile, listFiles, downloadFile, deleteFile, restoreFile, updateFile } = require('../controllers/fileController');
const { protect } = require('../middleware/auth');

// Multer setup for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(protect);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/', listFiles);
router.get('/:id', downloadFile);
router.delete('/:id', deleteFile);
router.patch('/:id', updateFile);
router.patch('/:id/restore', restoreFile);

module.exports = router;
