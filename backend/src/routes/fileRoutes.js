const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadFile, listFiles, downloadFile, deleteFile, restoreFile, updateFile } = require('../controllers/fileController');
const { protect } = require('../middleware/auth');

// Multer setup for memory storage
const storage = multer.memoryStorage();
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 50);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const upload = multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_BYTES }
});

const uploadSingleFile = (req, res, next) => {
    upload.single('file')(req, res, (error) => {
        if (error && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: `File too large. Maximum upload size is ${MAX_UPLOAD_MB}MB.` });
        }
        if (error) {
            return res.status(400).json({ message: error.message || 'Upload failed' });
        }
        return next();
    });
};

router.use(protect);

router.post('/upload', uploadSingleFile, uploadFile);
router.get('/', listFiles);
router.get('/:id', downloadFile);
router.delete('/:id', deleteFile);
router.patch('/:id', updateFile);
router.patch('/:id/restore', restoreFile);

module.exports = router;
