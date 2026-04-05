'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import FileExplorer from '@/components/files/FileExplorer';

export default function FilesPage() {
    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Files</h2>
                    <p className="text-slate-400">Manage and organize your secure storage library.</p>
                </div>
                <FileExplorer />
            </div>
        </DashboardLayout>
    );
}
