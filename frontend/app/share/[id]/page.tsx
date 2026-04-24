'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/services/api';

export default function ShareAccessPage() {
    const params = useParams();
    const rawId = params?.id;
    const token =
        typeof rawId === 'string'
            ? rawId.trim()
            : Array.isArray(rawId)
                ? rawId[0]?.trim() || ''
                : '';
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const getApiMessage = async (err: any) => {
        const response = err?.response;
        const data = response?.data;
        if (data && typeof data === 'object' && !(data instanceof Blob)) {
            return data.message;
        }
        if (data instanceof Blob) {
            const text = await data.text();
            try {
                return JSON.parse(text)?.message || text;
            } catch (_) {
                return text;
            }
        }
        return undefined;
    };

    const extractFilename = (disposition?: string) => {
        if (!disposition) return 'shared-file';
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match?.[1]) {
            return decodeURIComponent(utf8Match[1]);
        }
        const asciiMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
        if (asciiMatch?.[1]) {
            return asciiMatch[1];
        }
        return 'shared-file';
    };

    const handleAccess = async (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        setMessage(null);

        if (!token) {
            setError('Invalid share link.');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post(
                `/share/access/${token}`,
                password.trim() ? { password: password.trim() } : {},
                { responseType: 'blob' }
            );

            const filename = extractFilename(response.headers?.['content-disposition']);
            const blobUrl = window.URL.createObjectURL(response.data);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
            setMessage('Download started.');
        } catch (err: any) {
            const status = err?.response?.status;
            const apiMessage = await getApiMessage(err);
            if (status === 401) {
                setError(apiMessage || 'Password required to access this file.');
            } else if (status === 404) {
                setError(apiMessage || 'Link not found or expired.');
            } else if (status === 410) {
                setError(apiMessage || 'This share link is no longer available.');
            } else {
                setError(apiMessage || 'Unable to access shared file.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="glass-card p-8 w-full max-w-lg border-white/5 space-y-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Share Securely</h1>
                    <p className="text-slate-400 text-sm">
                        Enter the password if required, then download the shared file.
                    </p>
                </div>

                <form onSubmit={handleAccess} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                            Password (optional)
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-primary/50 transition-all font-sans"
                            placeholder="Enter password if required"
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="text-xs rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="text-xs rounded-xl border border-green-500/30 bg-green-500/10 text-green-300 px-3 py-2">
                            {message}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !token}
                        className="w-full glass-button bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                    >
                        {loading ? 'Accessing...' : 'Download File'}
                    </button>
                </form>
            </div>
        </div>
    );
}
