'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { History, Shield, Globe, Monitor, Terminal, FileCheck } from 'lucide-react';
import api from '@/services/api';

export default function ActivityPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data } = await api.get('/security/logs');
            setLogs(data);
            setErrorMessage(null);
        } catch (error) {
            setLogs([]);
            setErrorMessage('Unable to load activity logs right now.');
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (action: string) => {
        switch (action) {
            case 'LOGIN_SUCCESS': return <Shield className="text-green-500" />;
            case 'LOGIN_FAILURE': return <Shield className="text-red-500" />;
            case 'FILE_UPLOAD': return <FileCheck className="text-blue-500" />;
            case 'FILE_DOWNLOAD': return <Terminal className="text-amber-500" />;
            case '2FA_ENABLED': return <Monitor className="text-purple-500" />;
            default: return <History className="text-slate-400" />;
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-6xl mx-auto">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black uppercase tracking-widest">
                        <History size={12} /> Live Audit
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">Security Activities</h2>
                    <p className="text-slate-400">Total transparency on every sensitive action performed in your vault.</p>
                </div>

                <div className="glass-card overflow-hidden border-white/5">
                    {errorMessage && (
                        <div className="px-6 py-3 text-xs text-amber-300 border-b border-amber-500/20 bg-amber-500/10">
                            {errorMessage}
                        </div>
                    )}
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-slate-500 text-[10px] uppercase tracking-widest font-bold border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4">Event</th>
                                <th className="px-6 py-4">IP Address</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-slate-500">Retrieving secure logs...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center text-slate-500">No security events recorded.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log._id} className="hover:bg-white/5 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center opacity-60">
                                                    {getIcon(log.action)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-200 text-xs tracking-tight">{log.action.replace(/_/g, ' ')}</span>
                                                    <span className="text-[10px] text-slate-500 truncate max-w-xs">{log.details}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                                                <Globe size={12} className="opacity-30" />
                                                {log.ipAddress}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm ${
                                                log.action.includes('FAILURE') ? 'bg-red-500/20 text-red-500 border-red-500/20' : 'bg-green-500/20 text-green-500 border-green-500/20'
                                            } border`}>
                                                {log.action.includes('FAILURE') ? 'FAILED' : 'VERIFIED'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
