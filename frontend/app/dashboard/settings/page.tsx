'use client';

import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Settings, Shield, History, ChevronRight } from 'lucide-react';

const settingsTabs = [
    {
        href: '/dashboard/security',
        title: 'Security',
        description: 'Manage 2FA and account protection controls.',
        icon: Shield,
    },
    {
        href: '/dashboard/activity',
        title: 'Activity',
        description: 'Review audit logs and recent vault events.',
        icon: History,
    },
];

export default function SettingsPage() {
    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-5xl mx-auto">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest">
                        <Settings size={12} /> Settings Hub
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                    <p className="text-slate-400">Open each tab below to manage account and security preferences.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {settingsTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className="glass-card-hover rounded-3xl border border-white/10 p-6 space-y-4 group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:bg-primary/20 group-hover:border-primary/30 transition-all">
                                    <Icon size={22} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold flex items-center justify-between">
                                        {tab.title}
                                        <ChevronRight size={18} className="text-slate-500 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                    </h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">{tab.description}</p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </DashboardLayout>
    );
}
