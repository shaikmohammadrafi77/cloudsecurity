'use client';

import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { Share2, Folder, Copy, ExternalLink, RefreshCcw } from 'lucide-react';
import api from '@/services/api';

type ShareLinkItem = {
    id: string;
    token: string;
    url: string;
    hasPassword: boolean;
    fileId: string;
    fileName: string;
    mimeType: string;
    size: number;
    createdAt: string | null;
    expiresAt: string | null;
    maxDownloads: number;
    downloadCount: number;
    isExpired: boolean;
    isDownloadLimitReached: boolean;
    isActive: boolean;
};

export default function SharedLinksPage() {
    const [links, setLinks] = useState<ShareLinkItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchLinks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/share');
            setLinks(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Failed to load share links');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLinks();
    }, [fetchLinks]);

    const formatDate = (value: string | null) => {
        if (!value) return 'Never';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleString();
    };

    const copyLink = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch (_) {
            // No-op
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
                        <Share2 size={12} /> Shared links
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">Shared Links</h2>
                    <p className="text-slate-400 max-w-xl">
                        Create secure share links from the actions menu on any file in{' '}
                        <Link href="/dashboard/files" className="text-primary hover:underline font-medium">
                            My Files
                        </Link>
                        . Active links you create appear here.
                    </p>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={fetchLinks}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/30 bg-primary/12 hover:bg-primary/20 text-primary shadow-[0_0_24px_rgba(56,189,248,0.16)] transition-colors text-sm font-semibold"
                    >
                        <RefreshCcw size={16} />
                        Refresh
                    </button>
                </div>

                {error && (
                    <div className="glass-card-hover rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="glass-card-hover border border-white/10 rounded-3xl p-12 text-center space-y-4">
                        <RefreshCcw className="animate-spin w-8 h-8 mx-auto text-primary" />
                        <p className="text-slate-400 text-sm">Loading shared links...</p>
                    </div>
                ) : links.length === 0 ? (
                    <div className="glass-card-hover border border-white/10 rounded-3xl p-12 text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Share2 className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-slate-400 text-sm max-w-md mx-auto">
                            No active share links yet. Use <strong className="text-slate-300">Share</strong> on a file to generate one.
                        </p>
                        <Link
                            href="/dashboard/files"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/20 border border-primary/30 text-primary font-semibold text-sm hover:bg-primary/30 transition-colors"
                        >
                            <Folder size={18} />
                            Go to My Files
                        </Link>
                    </div>
                ) : (
                    <div className="glass-card-hover border border-white/10 rounded-3xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/[0.02] text-slate-500 text-[10px] uppercase tracking-widest font-bold border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4">File</th>
                                        <th className="px-6 py-4">Downloads</th>
                                        <th className="px-6 py-4">Security</th>
                                        <th className="px-6 py-4">Expires</th>
                                        <th className="px-6 py-4">Share Link</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {links.map((linkItem) => (
                                        <tr key={linkItem.id} className="hover:bg-white/[0.03]">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-slate-100">{linkItem.fileName}</p>
                                                <p className="text-xs text-slate-500">{formatDate(linkItem.createdAt)}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-300">
                                                {linkItem.downloadCount}
                                                {linkItem.maxDownloads > 0 ? ` / ${linkItem.maxDownloads}` : ' / Unlimited'}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span
                                                    className={`inline-flex min-w-[108px] items-center justify-center px-3 py-1 rounded-xl border text-xs font-semibold ${
                                                        linkItem.hasPassword
                                                            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.12)]'
                                                            : 'border-red-400/30 bg-red-500/10 text-red-300 shadow-[0_0_18px_rgba(248,113,113,0.12)]'
                                                    }`}
                                                >
                                                    {linkItem.hasPassword ? 'Password' : 'No Password'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-300">{formatDate(linkItem.expiresAt)}</td>
                                            <td className="px-6 py-4 max-w-[420px]">
                                                <p className="font-mono text-xs text-primary truncate">{linkItem.url}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => copyLink(linkItem.url)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold"
                                                        title="Copy link"
                                                    >
                                                        <Copy size={14} />
                                                        Copy
                                                    </button>
                                                    <a
                                                        href={linkItem.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold"
                                                        title="Open link"
                                                    >
                                                        <ExternalLink size={14} />
                                                        Open
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
