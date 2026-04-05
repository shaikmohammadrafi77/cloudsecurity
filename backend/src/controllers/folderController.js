const mongoose = require('mongoose');
const { parseOptionalObjectIdParam, isBenignListStorageError, ownerObjectIdOrNull } = require('../utils/queryId');
const logger = require('../utils/logger');
const requireMongoForStorage = require('../utils/requireMongoForStorage');
const Folder = require('../models/Folder');
const File = require('../models/File');
const mockStorageStore = require('../utils/mockStorageStore');

const createFolder = async (req, res) => {
    try {
        const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;
        const { name, parentFolderId } = req.body;
        const parentFolder = parseOptionalObjectIdParam(parentFolderId);

        if (mockMode) {
            const folder = mockStorageStore.createFolder({
                name,
                owner: req.user._id,
                parentFolder,
            });
            return res.status(201).json(folder);
        }

        if (!requireMongoForStorage(res)) return;
        const folder = await Folder.create({
            name,
            owner: req.user._id,
            parentFolder,
        });
        res.status(201).json(folder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const listFolders = async (req, res) => {
    try {
        const ownerId = ownerObjectIdOrNull(req);
        if (!ownerId) {
            return res.status(401).json({ message: 'Invalid session' });
        }
        const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;
        const parentFolderId = parseOptionalObjectIdParam(req.query.parentFolderId);
        const trashed = req.query.trashed;
        const query = { 
            owner: ownerId,
            isDeleted: trashed === 'true'
        };

        if (mockMode) {
            const trashMode = trashed === 'true';
            const mockParentFolder = parentFolderId
                ? parentFolderId
                : trashMode
                  ? undefined
                  : null;
            const folders = mockStorageStore.listFolders({
                owner: ownerId,
                parentFolder: mockParentFolder,
                trashed: trashMode,
            });
            return res.json(folders);
        }

        if (parentFolderId) {
            query.parentFolder = parentFolderId;
        } else if (trashed !== 'true') {
            query.parentFolder = null; // List root folders
        }

        const folders = await Folder.find(query).sort({ name: 1 }).lean();
        res.json(folders);
    } catch (error) {
        const rs = mongoose.connection.readyState;
        if (isBenignListStorageError(error, rs)) {
            return res.json([]);
        }
        logger.error('listFolders', { message: error?.message, name: error?.name });
        return res.json([]);
    }
};

const deleteFolder = async (req, res) => {
    try {
        const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;
        const { permanent } = req.query;

        if (mockMode) {
            const folder = mockStorageStore.findFolderById({ owner: req.user._id, id: req.params.id });
            if (!folder) return res.status(404).json({ message: 'Folder not found' });

            if (permanent === 'true') {
                // Best-effort: remove folder metadata, and soft-delete its files (S3 deletion can be added later).
                mockStorageStore.deleteFolderPermanent({ owner: req.user._id, id: req.params.id });
                mockStorageStore.markFolderFilesDeleted({ owner: req.user._id, folder: folder._id, isDeleted: true });
            } else {
                mockStorageStore.softDeleteFolder({ owner: req.user._id, id: req.params.id });
                mockStorageStore.markFolderFilesDeleted({ owner: req.user._id, folder: folder._id, isDeleted: true });
            }

            return res.json({ message: permanent === 'true' ? 'Folder permanently deleted' : 'Folder moved to trash' });
        }

        if (!requireMongoForStorage(res)) return;
        const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
        
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        if (permanent === 'true') {
            // Recursive deletion would be needed here for production
            // For now, let's just delete the folder
            await Folder.deleteOne({ _id: req.params.id });
        } else {
            folder.isDeleted = true;
            folder.deletedAt = new Date();
            await folder.save();
            
            // Also soft-delete all files in this folder
            await File.updateMany({ folder: folder._id }, { isDeleted: true, deletedAt: new Date() });
        }

        res.json({ message: permanent === 'true' ? 'Folder permanently deleted' : 'Folder moved to trash' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const restoreFolder = async (req, res) => {
    try {
        const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;
        if (mockMode) {
            const restored = mockStorageStore.restoreFolder({ owner: req.user._id, id: req.params.id });
            if (!restored) return res.status(404).json({ message: 'Folder not found in trash' });
            mockStorageStore.markFolderFilesDeleted({ owner: req.user._id, folder: restored._id, isDeleted: false });
            return res.json(restored);
        }

        if (!requireMongoForStorage(res)) return;
        const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id, isDeleted: true });
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found in trash' });
        }

        folder.isDeleted = false;
        folder.deletedAt = null;
        await folder.save();

        // Also restore files in this folder
        await File.updateMany({ folder: folder._id }, { isDeleted: false, deletedAt: null });

        res.json(folder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateFolder = async (req, res) => {
    try {
        const mockMode = process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1;
        const { name, parentFolderId } = req.body;

        if (mockMode) {
            const updated = mockStorageStore.updateFolder({
                owner: req.user._id,
                id: req.params.id,
                patch: {
                    ...(name !== undefined ? { name } : {}),
                    ...(parentFolderId !== undefined ? { parentFolder: parseOptionalObjectIdParam(parentFolderId) } : {}),
                },
            });
            if (!updated) return res.status(404).json({ message: 'Folder not found' });
            return res.json(updated);
        }

        if (!requireMongoForStorage(res)) return;
        const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id });
        if (!folder) return res.status(404).json({ message: 'Folder not found' });

        if (name) folder.name = name;
        if (parentFolderId !== undefined) {
            // Prevent moving folder into itself or its children?
            // (Simple version for now: just move)
            folder.parentFolder = parentFolderId;
        }

        await folder.save();
        res.json(folder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createFolder,
    listFolders,
    deleteFolder,
    restoreFolder,
    updateFolder,
};
