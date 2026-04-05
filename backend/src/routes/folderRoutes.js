const express = require('express');
const router = express.Router();
const { createFolder, listFolders, deleteFolder, restoreFolder, updateFolder } = require('../controllers/folderController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createFolder);
router.get('/', listFolders);
router.delete('/:id', deleteFolder);
router.patch('/:id', updateFolder);
router.patch('/:id/restore', restoreFolder);

module.exports = router;
