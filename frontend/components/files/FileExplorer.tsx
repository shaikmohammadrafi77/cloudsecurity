'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { 
    Upload, 
    File, 
    Folder as FolderIcon,
    MoreVertical, 
    Search, 
    Plus, 
    Filter, 
    Download, 
    Trash2, 
    Link as LinkIcon,
    ChevronRight,
    ArrowLeft,
    RefreshCcw,
    FolderPlus,
    Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import * as folderService from '@/services/folderService';

const ENCRYPTION_ALGORITHMS = [
    { value: 'aes-256-cbc', label: 'AES-256-CBC' },
    { value: 'aes-256-gcm', label: 'AES-256-GCM' },
];

export default function FileExplorer({ isTrash = false }: { isTrash?: boolean }) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [selectedEncryptionAlgorithm, setSelectedEncryptionAlgorithm] = useState('aes-256-cbc');

    const getApiErrorMessage = (error: any) => {
        return (
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            error?.message ||
            'Request failed'
        );
    };

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const listParams = { trashed: isTrash ? 'true' : 'false' };
            if (currentFolderId) {
                Object.assign(listParams, { folderId: currentFolderId, parentFolderId: currentFolderId });
            }
            const [filesRes, foldersRes] = await Promise.all([
                api.get('/files', { params: listParams }),
                api.get('/folders', { params: listParams }),
            ]);

            const combinedItems = [
                ...foldersRes.data.map((f: any) => ({ ...f, type: 'folder' })),
                ...filesRes.data.map((f: any) => ({ ...f, type: 'file' }))
            ];
            setItems(combinedItems);
        } catch (error) {
            const msg = getApiErrorMessage(error);
            setErrorMessage(msg);
            console.error('Error fetching items:', error);
        } finally {
            setLoading(false);
        }
    }, [currentFolderId, isTrash]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleCreateFolder = async () => {
        const name = prompt('Folder Name:');
        if (!name) return;
        try {
            await folderService.createFolder(name, currentFolderId);
            setErrorMessage(null);
            fetchItems();
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
            console.error('Failed to create folder:', error);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolderId) formData.append('folderId', currentFolderId);
        formData.append('encryptionAlgorithm', selectedEncryptionAlgorithm);

        try {
            await api.post('/files/upload', formData);
            setErrorMessage(null);
            fetchItems();
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
            console.error('Upload failed:', error);
        }
    };

    const handleDelete = async (id: string, type: 'file' | 'folder', permanent = false) => {
        try {
            if (type === 'file') {
                await api.delete(`/files/${id}`, { params: { permanent } });
            } else {
                await folderService.deleteFolder(id, permanent);
            }
            setErrorMessage(null);
            fetchItems();
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
            console.error('Delete failed:', error);
        }
    };

    const handleRestore = async (id: string, type: 'file' | 'folder') => {
        try {
            if (type === 'file') {
                await api.patch(`/files/${id}/restore`);
            } else {
                await folderService.restoreFolder(id);
            }
            setErrorMessage(null);
            fetchItems();
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
            console.error('Restore failed:', error);
        }
    };

    const handleRename = async (id: string, type: 'file' | 'folder', oldName: string) => {
        const newName = prompt('Enter new name:', oldName);
        if (!newName || newName === oldName) return;

        try {
            if (type === 'file') {
                await api.patch(`/files/${id}`, { originalName: newName });
            } else {
                await folderService.updateFolder(id, { name: newName });
            }
            setErrorMessage(null);
            fetchItems();
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
            console.error('Rename failed:', error);
        }
    };

    const handleMove = async (id: string, type: 'file' | 'folder') => {
        const folderId = prompt('Enter destination folder ID (or leave empty for root):');
        if (folderId === null) return;

        try {
            if (type === 'file') {
                await api.patch(`/files/${id}`, { folderId: folderId || null });
            } else {
                await folderService.updateFolder(id, { parentFolderId: folderId || null });
            }
            setErrorMessage(null);
            fetchItems();
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
            console.error('Move failed:', error);
        }
    };

    const [previewItem, setPreviewItem] = useState<any | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handlePreview = async (item: any) => {
        if (item.type === 'folder') return;
        try {
            const response = await api.get(`/files/${item._id}`, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            setPreviewItem(item);
            setPreviewUrl(url);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
            console.error('Preview failed:', error);
        }
    };

    const closePreview = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewItem(null);
        setPreviewUrl(null);
    };

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareItem, setShareItem] = useState<any | null>(null);
    const [shareConfig, setShareConfig] = useState({ password: '', expiresAt: '', maxDownloads: 0 });
    const [shareUrl, setShareUrl] = useState('');

    const handleCreateShare = async () => {
        try {
            const { data } = await api.post('/share', { 
                fileId: shareItem._id, 
                ...shareConfig 
            });
            setErrorMessage(null);
            setShareUrl(data.url);
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
            console.error('Share failed:', error);
        }
    };

    const navigateTo = (folder: any) => {
        if (!folder) {
            setCurrentFolderId(null);
            setBreadcrumbs([]);
        } else {
            setCurrentFolderId(folder._id);
            setBreadcrumbs([...breadcrumbs, folder]);
        }
    };

    const goBack = () => {
        const newBreadcrumbs = [...breadcrumbs];
        newBreadcrumbs.pop();
        setBreadcrumbs(newBreadcrumbs);
        setCurrentFolderId(newBreadcrumbs.length > 0 ? newBreadcrumbs[newBreadcrumbs.length - 1]._id : null);
    };

    const filteredItems = items.filter(item => 
        (item.originalName || item.name).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatAlgorithmLabel = (algorithm?: string) => {
        const normalized = String(algorithm || 'aes-256-cbc').toLowerCase();
        const found = ENCRYPTION_ALGORITHMS.find((entry) => entry.value === normalized);
        return found ? found.label : normalized.toUpperCase();
    };

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <Shield size={12} className="fill-emerald-500/20" /> Zero-Trust Verified
                    </div>
                    {currentFolderId && (
                        <button onClick={goBack} className="p-2 hover:bg-white/10 rounded-lg">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div className="relative flex-1 md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search library..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>
                </div>

                {!isTrash && (
                    <div className="flex gap-3">
                        <select
                            value={selectedEncryptionAlgorithm}
                            onChange={(e) => setSelectedEncryptionAlgorithm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-primary/40"
                            title="Encryption algorithm for uploaded files"
                        >
                            {ENCRYPTION_ALGORITHMS.map((algorithm) => (
                                <option key={algorithm.value} value={algorithm.value} className="bg-slate-900">
                                    {algorithm.label}
                                </option>
                            ))}
                        </select>
                        <button onClick={handleCreateFolder} className="glass-button border-white/10 flex items-center gap-2">
                            <FolderPlus size={18} /> New Folder
                        </button>
                        <label className="glass-button bg-primary text-white flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all">
                            <Plus size={18} /> Upload
                            <input type="file" className="hidden" onChange={handleUpload} />
                        </label>
                    </div>
                )}
            </div>

            {errorMessage && (
                <div className="glass-card-hover rounded-3xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                </div>
            )}

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-slate-400 overflow-x-auto pb-2 px-2">
                <button onClick={() => navigateTo(null)} className="hover:text-white transition-colors">Root</button>
                {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb._id}>
                        <ChevronRight size={14} className="flex-shrink-0" />
                        <button 
                            onClick={() => {
                                const newCrumbs = breadcrumbs.slice(0, idx + 1);
                                setBreadcrumbs(newCrumbs);
                                setCurrentFolderId(crumb._id);
                            }}
                            className="hover:text-white transition-colors whitespace-nowrap"
                        >
                            {crumb.name}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* Table */}
            <div className="glass-card-hover rounded-3xl overflow-hidden border border-white/5">
                <table className="w-full text-left">
                    <thead className="bg-white/[0.02] text-slate-500 text-[10px] uppercase tracking-widest font-bold border-b border-white/5">
                        <tr>
                            <th className="px-6 py-5 font-bold">Name</th>
                            <th className="px-6 py-5 font-bold">Modified</th>
                            <th className="px-6 py-5 font-bold">Size</th>
                            {!isTrash && <th className="px-6 py-5 font-bold">Privacy</th>}
                            <th className="px-6 py-5 font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center">
                                    <RefreshCcw className="animate-spin mx-auto text-primary w-10 h-10 opacity-50" />
                                </td>
                            </tr>
                        ) : filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-30">
                                        <Plus className="w-16 h-16" />
                                        <p className="text-lg font-medium">Empty Space</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {filteredItems.map((item: any) => (
                                    <motion.tr 
                                        key={item._id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="hover:bg-white/[0.03] transition-all group cursor-pointer"
                                        onClick={() => item.type === 'folder' && navigateTo(item)}
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                                                    item.type === 'folder' 
                                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' 
                                                        : 'bg-primary/10 border-primary/20 text-primary'
                                                }`}>
                                                    {item.type === 'folder' ? <FolderIcon size={20} /> : <File size={20} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-100 group-hover:text-primary transition-colors">
                                                        {item.originalName || item.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                        {item.type === 'folder' ? `Directory` : item.mimeType.split('/')[1]}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-slate-400 text-sm">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-slate-400 text-sm">
                                            {item.type === 'folder' ? '--' : `${(item.size / 1024).toFixed(1)} KB`}
                                        </td>
                                        {!isTrash && (
                                            <td className="px-6 py-5">
                                                {item.type === 'file' ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 uppercase tracking-tighter shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                                        {formatAlgorithmLabel(item.encryptionAlgorithm)}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-500">--</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                {isTrash ? (
                                                    <>
                                                        <button 
                                                            onClick={() => handleRestore(item._id, item.type)}
                                                            className="p-2.5 hover:bg-green-500/10 text-green-500 rounded-xl transition-all" 
                                                            title="Restore"
                                                        >
                                                            <RefreshCcw size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(item._id, item.type, true)}
                                                            className="p-2.5 hover:bg-red-500/10 text-red-500 rounded-xl transition-all" 
                                                            title="Delete Permanently"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button 
                                                            onClick={() => handlePreview(item)}
                                                            className="p-2.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all" 
                                                            title="Preview"
                                                        >
                                                            <Plus size={18} className="rotate-45" /> 
                                                        </button>
                                                        <button 
                                                            onClick={() => handleRename(item._id, item.type, item.originalName || item.name)}
                                                            className="p-2.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all" 
                                                            title="Rename"
                                                        >
                                                            {/* We can use an icon or just text, let's use text for simplicity in MoreVertical or add an icon */}
                                                            <RefreshCcw size={18} className="rotate-90" /> 
                                                        </button>
                                                        <button 
                                                            onClick={() => handleMove(item._id, item.type)}
                                                            className="p-2.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all" 
                                                            title="Move"
                                                        >
                                                            <FolderIcon size={18} />
                                                        </button>
                                                        <button className="p-2.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all" title="Download">
                                                            <Download size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => { setShareItem(item); setIsShareModalOpen(true); }}
                                                            className="p-2.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all" 
                                                            title="Share"
                                                        >
                                                            <LinkIcon size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(item._id, item.type)}
                                                            className="p-2.5 hover:bg-red-500/10 text-red-400 rounded-xl transition-all" 
                                                            title="Move to Trash"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                <button className="p-2.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all">
                                                    <MoreVertical size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Preview Modal */}
            <AnimatePresence>
                {previewItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closePreview}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-card w-full max-w-4xl rounded-3xl overflow-hidden glass-card border-white/5 relative z-10 shadow-2xl"
                        >
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-xl font-bold">{previewItem.originalName || previewItem.name}</h3>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/20 text-primary border border-primary/20 uppercase tracking-tighter">
                                        SECURE PREVIEW (AES-256)
                                    </span>
                                </div>
                                <button onClick={closePreview} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                    <RefreshCcw size={20} className="rotate-45" />
                                </button>
                            </div>
                            <div className="p-8 flex items-center justify-center bg-black/20 min-h-[400px]">
                                {previewItem.mimeType?.startsWith('image/') ? (
                                    <Image
                                        src={previewUrl!}
                                        alt="Preview"
                                        width={1200}
                                        height={800}
                                        unoptimized
                                        className="max-w-full max-h-[70vh] rounded-xl shadow-2xl h-auto w-auto"
                                    />
                                ) : (
                                    <div className="text-center space-y-6">
                                        <div className="w-32 h-32 rounded-3xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center">
                                            <File className="text-primary w-16 h-16" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold">Preview not available</p>
                                            <p className="text-slate-500">Download the file to view its content.</p>
                                        </div>
                                        <button className="glass-button bg-primary text-white">
                                            Download Now
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Share Modal */}
            <AnimatePresence>
                {isShareModalOpen && shareItem && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setIsShareModalOpen(false); setShareUrl(''); setShareConfig({ password: '', expiresAt: '', maxDownloads: 0 }); }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card w-full max-w-lg rounded-3xl overflow-hidden glass-card border-white/5 relative z-10 p-8 space-y-6"
                        >
                            <div>
                                <h3 className="text-2xl font-bold tracking-tight">Share Securely</h3>
                                <p className="text-slate-400 text-sm mt-1 truncate">Set protection for {shareItem.originalName}</p>
                            </div>

                            {shareUrl ? (
                                <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl break-all font-mono text-sm text-primary">
                                        {shareUrl}
                                    </div>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(shareUrl); alert('Copied!'); }}
                                        className="w-full glass-button bg-primary text-white"
                                    >
                                        Copy Link
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Password Protection</label>
                                        <input 
                                            type="password" 
                                            placeholder="Optional password" 
                                            value={shareConfig.password}
                                            onChange={(e) => setShareConfig({ ...shareConfig, password: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-primary/50 transition-all font-sans"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Expiration</label>
                                            <input 
                                                type="date" 
                                                value={shareConfig.expiresAt}
                                                onChange={(e) => setShareConfig({ ...shareConfig, expiresAt: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-primary/50 transition-all text-sm color-white"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Max Uses</label>
                                            <input 
                                                type="number" 
                                                placeholder="Unlimited" 
                                                value={shareConfig.maxDownloads || ''}
                                                onChange={(e) => setShareConfig({ ...shareConfig, maxDownloads: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-primary/50 transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleCreateShare}
                                        className="w-full glass-button bg-primary text-white py-4 mt-2"
                                    >
                                        Generate Secure Link
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}


