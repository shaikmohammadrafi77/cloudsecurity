'use client';

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Link from 'next/link';
import { Share2, Folder } from 'lucide-react';

export default function SharedLinksPage() {
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
                        . Active links you have created will appear here when listing is enabled on the API.
                    </p>
                </div>

                <div className="glass-card-hover border border-white/10 rounded-3xl p-12 text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <Share2 className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-sm max-w-md mx-auto">
                        No share links to show yet. Use <strong className="text-slate-300">Share</strong> on a file to generate a link.
                    </p>
                    <Link
                        href="/dashboard/files"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/20 border border-primary/30 text-primary font-semibold text-sm hover:bg-primary/30 transition-colors"
                    >
                        <Folder size={18} />
                        Go to My Files
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    );
}
