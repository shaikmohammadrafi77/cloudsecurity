const mongoose = require('mongoose');

// In-memory storage metadata for MOCK_MONGO / offline dev mode.
// Files still live in S3; this store only keeps metadata (so list/download/delete work).
const foldersById = new Map(); // idStr -> folder record
const filesById = new Map(); // idStr -> file record
const encryptedDataById = new Map(); // fileIdStr -> Buffer

function idStr(id) {
    if (id == null) return '';
    if (id instanceof mongoose.Types.ObjectId) return String(id);
    return String(id);
}

function normalizeFolderId(folderId) {
    if (folderId == null) return null;
    if (folderId === 'null') return null;
    if (folderId instanceof mongoose.Types.ObjectId) return String(folderId);
    return folderId;
}

function normalizeOwnerId(ownerId) {
    return ownerId instanceof mongoose.Types.ObjectId ? ownerId : new mongoose.Types.ObjectId(idStr(ownerId));
}

function createObjectId() {
    return new mongoose.Types.ObjectId();
}

// Folder ops
function createFolder({ name, owner, parentFolder = null }) {
    const _id = createObjectId();
    const record = {
        _id,
        name,
        owner: normalizeOwnerId(owner),
        parentFolder: parentFolder ? normalizeFolderId(parentFolder) : null,
        isDeleted: false,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    foldersById.set(idStr(_id), record);
    return record;
}

function listFolders({ owner, parentFolder = null, trashed = false }) {
    const ownerId = idStr(owner);
    return Array.from(foldersById.values())
        .filter((f) => idStr(f.owner) === ownerId)
        .filter((f) => {
            if (parentFolder === undefined) return true;
            return normalizeFolderId(f.parentFolder) === normalizeFolderId(parentFolder);
        })
        .filter((f) => f.isDeleted === trashed)
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function findFolderById({ owner, id, trashed = null }) {
    const rec = foldersById.get(idStr(id));
    if (!rec) return null;
    if (idStr(rec.owner) !== idStr(owner)) return null;
    if (trashed === true && rec.isDeleted !== true) return null;
    if (trashed === false && rec.isDeleted !== false) return null;
    return rec;
}

function updateFolder({ owner, id, patch }) {
    const folder = findFolderById({ owner, id });
    if (!folder) return null;
    if (patch.name !== undefined) folder.name = patch.name;
    if (patch.parentFolder !== undefined) folder.parentFolder = patch.parentFolder;
    folder.updatedAt = new Date();
    return folder;
}

function softDeleteFolder({ owner, id }) {
    const folder = findFolderById({ owner, id });
    if (!folder) return null;
    folder.isDeleted = true;
    folder.deletedAt = new Date();
    folder.updatedAt = new Date();
    return folder;
}

function restoreFolder({ owner, id }) {
    const folder = findFolderById({ owner, id, trashed: true });
    if (!folder) return null;
    folder.isDeleted = false;
    folder.deletedAt = null;
    folder.updatedAt = new Date();
    return folder;
}

function deleteFolderPermanent({ owner, id }) {
    const folder = findFolderById({ owner, id });
    if (!folder) return null;
    foldersById.delete(idStr(id));
    return folder;
}

// File ops
function createFileMetadata({
    owner,
    filename,
    originalName,
    mimeType,
    s3Key,
    size,
    iv,
    folder = null,
    encryptionAlgorithm = 'aes-256-cbc',
    authTag = null,
}) {
    const _id = filename; // for compatibility with code that uses filename as fileId
    const record = {
        _id,
        owner: normalizeOwnerId(owner),
        filename,
        originalName,
        mimeType,
        s3Key,
        size,
        folder: folder ? normalizeFolderId(folder) : null,
        isDeleted: false,
        deletedAt: null,
        isEncrypted: true,
        iv,
        encryptionAlgorithm,
        authTag,
        createdAt: new Date(),
        tags: [],
    };
    filesById.set(idStr(_id), record);
    return record;
}

function setEncryptedDataForFile(id, encryptedBuffer) {
    if (!id) return;
    if (!encryptedBuffer) return;
    encryptedDataById.set(idStr(id), encryptedBuffer);
}

function getEncryptedDataForFile(id) {
    if (!id) return null;
    return encryptedDataById.get(idStr(id)) || null;
}

function deleteEncryptedDataForFile(id) {
    if (!id) return;
    encryptedDataById.delete(idStr(id));
}

function listFiles({ owner, folder = undefined, trashed = false }) {
    const ownerId = idStr(owner);
    return Array.from(filesById.values())
        .filter((f) => idStr(f.owner) === ownerId)
        .filter((f) => {
            if (folder === undefined) return true;
            return normalizeFolderId(f.folder) === normalizeFolderId(folder);
        })
        .filter((f) => f.isDeleted === trashed)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function findFileById({ owner, id, trashed = false }) {
    const rec = filesById.get(idStr(id));
    if (!rec) return null;
    if (idStr(rec.owner) !== idStr(owner)) return null;
    if (trashed === true && rec.isDeleted !== true) return null;
    if (trashed === false && rec.isDeleted !== false) return null;
    return rec;
}

function softDeleteFile({ owner, id }) {
    const file = findFileById({ owner, id, trashed: false });
    if (!file) return null;
    file.isDeleted = true;
    file.deletedAt = new Date();
    return file;
}

function restoreFile({ owner, id }) {
    const file = findFileById({ owner, id, trashed: true });
    if (!file) return null;
    file.isDeleted = false;
    file.deletedAt = null;
    return file;
}

function updateFile({ owner, id, patch }) {
    const file = findFileById({ owner, id, trashed: false });
    if (!file) return null;
    if (patch.originalName !== undefined) file.originalName = patch.originalName;
    if (patch.folder !== undefined) file.folder = patch.folder;
    return file;
}

function deleteFilePermanent({ owner, id }) {
    const file = findFileById({ owner, id, trashed: true }) || findFileById({ owner, id, trashed: false });
    if (!file) return null;
    filesById.delete(idStr(id));
    deleteEncryptedDataForFile(id);
    return file;
}

function listFilesInFolder({ owner, folder }) {
    const ownerId = idStr(owner);
    return Array.from(filesById.values()).filter(
        (f) => idStr(f.owner) === ownerId && normalizeFolderId(f.folder) === normalizeFolderId(folder)
    );
}

function markFolderFilesDeleted({ owner, folder, isDeleted }) {
    const files = listFilesInFolder({ owner, folder });
    files.forEach((f) => {
        f.isDeleted = isDeleted;
        f.deletedAt = isDeleted ? new Date() : null;
    });
    return files;
}

module.exports = {
    createFolder,
    listFolders,
    findFolderById,
    updateFolder,
    softDeleteFolder,
    restoreFolder,
    deleteFolderPermanent,

    createFileMetadata,
    setEncryptedDataForFile,
    getEncryptedDataForFile,
    listFiles,
    findFileById,
    softDeleteFile,
    restoreFile,
    updateFile,
    deleteFilePermanent,
    listFilesInFolder,
    markFolderFilesDeleted,
};
