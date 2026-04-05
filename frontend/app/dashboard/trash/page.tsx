'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FileExplorer from '@/components/files/FileExplorer';
import { Trash2, AlertTriangle } from 'lucide-react';

export default function TrashPage() {
    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-widest">
                            <Trash2 size={12} /> Recycle Bin
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight">Recycle Bin</h2>
                        <p className="text-slate-400">Items here will be permanently deleted after 30 days.</p>
                    </div>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                    <AlertTriangle className="text-amber-500 flex-shrink-0 mt-1" />
                    <div className="text-sm text-amber-200/80 leading-relaxed">
                        <p className="font-bold text-amber-500">Notice</p>
                        <p>Restoring a folder will also restore all files inside it. Deleting a folder permanently will also permanently remove its contents from the secure storage.</p>
                    </div>
                </div>

                <FileExplorer isTrash={true} />
            </div>
        </DashboardLayout>
    );
}
