import api from './api';

export const listFolders = (parentFolderId: string | null = null, trashed = false) => {
    return api.get('/folders', {
        params: { parentFolderId, trashed: trashed ? 'true' : 'false' },
    });
};

export const createFolder = (name: string, parentFolderId: string | null = null) => {
    return api.post('/folders', { name, parentFolderId });
};

export const deleteFolder = (folderId: string, permanent = false) => {
    return api.delete(`/folders/${folderId}`, { params: { permanent } });
};

export const restoreFolder = (folderId: string) => {
    return api.patch(`/folders/${folderId}/restore`);
};

export const updateFolder = (folderId: string, data: { name?: string, parentFolderId?: string | null }) => {
    return api.patch(`/folders/${folderId}`, data);
};
