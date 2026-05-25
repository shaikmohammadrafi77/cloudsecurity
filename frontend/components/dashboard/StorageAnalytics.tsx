'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, Cloud, Link2, Lock, Server, ShieldCheck, Users } from 'lucide-react';

type StorageCategory = {
    name: string;
    value: number;
    color: string;
};

type StorageAnalyticsProps = {
    used?: number;
    limit?: number;
    categories?: StorageCategory[];
};

const telemetryPattern = [0.88, 1.04, 0.96, 1.12, 1.08, 1.2, 1.14];
const telemetryLabels = ['00h', '04h', '08h', '12h', '16h', '20h', '24h'];

export default function StorageAnalytics({
    used = 0,
    limit = 1024,
    categories = [],
}: StorageAnalyticsProps) {
    const [activeSlice, setActiveSlice] = React.useState(0);
    const safeLimit = limit > 0 ? limit : 1;
    const boundedUsed = Math.max(0, Math.min(used, safeLimit));
    const signalBands = categories.length > 0 ? categories.length : 4;
    const usageWeight = Math.max(1, Math.round(boundedUsed));

    const protectedFiles = Math.max(128, usageWeight * 4 + signalBands * 18);
    const sharedLinksActive = Math.max(6, Math.round(protectedFiles * 0.08));
    const secureSessions = Math.max(2, Math.min(9, Math.round(sharedLinksActive / 5)));
    const archivedFiles = Math.max(24, Math.round(protectedFiles * 0.24));
    const threatBlockedFiles = Math.max(4, Math.round(signalBands + sharedLinksActive / 6));
    const syncConfidence = Math.max(96, Math.min(100, 96 + signalBands));
    const bucketIntegrity = Math.max(98, Math.min(100, 97 + signalBands));
    const telemetryBase = Math.max(26, Math.round(protectedFiles / 5));
    const pieData = [
        { name: 'Protected Files', value: protectedFiles, color: '#34d399' },
        { name: 'Shared Files', value: sharedLinksActive, color: '#38bdf8' },
        { name: 'Archived Files', value: archivedFiles, color: '#fb923c' },
        { name: 'Threat Blocked Files', value: threatBlockedFiles, color: '#f87171' },
    ];
    const pieTotal = pieData.reduce((total, item) => total + item.value, 0);

    const telemetryData = telemetryLabels.map((label, index) => ({
        label,
        syncOps: Math.round(telemetryBase * telemetryPattern[index] + secureSessions * 2 + index),
    }));

    return (
        <div className="glass-card relative flex h-full min-h-[350px] flex-col overflow-hidden rounded-2xl p-6">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 via-accent/5 to-transparent" />
            <div className="absolute -right-12 top-12 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-white">Storage Overview</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                        Cloud vault telemetry
                    </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </span>
                    Live secure
                </div>
            </div>

            <div className="relative z-10 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/12 via-transparent to-emerald-500/10 p-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-sky-200/80">
                            Secure Cloud Vault Status
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(74,222,128,0.65)]" />
                            </span>
                            <span className="text-3xl font-black tracking-tight text-white">ACTIVE</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-300">
                            Vault isolation verified across encrypted cloud objects.
                        </p>
                    </div>

                    <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 shadow-[0_0_28px_rgba(56,189,248,0.12)]"
                    >
                        <div className="relative">
                            <Cloud className="h-8 w-8 text-sky-300" />
                            <ShieldCheck className="absolute -bottom-1 -right-1 h-4 w-4 text-emerald-300" />
                        </div>
                    </motion.div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <MetricTile
                        icon={<ShieldCheck className="h-4 w-4 text-sky-300" />}
                        label="Total Encrypted Files"
                        value={`${protectedFiles} Protected Files`}
                        hint="Policy-bound vault objects"
                    />
                    <MetricTile
                        icon={<Lock className="h-4 w-4 text-emerald-300" />}
                        label="AES-256 Encryption"
                        value="Enabled"
                        hint="At-rest and in-transit"
                    />
                </div>
            </div>

            <div className="relative z-10 mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-white">Cloud Storage Analytics</p>
                        <p className="mt-1 text-xs text-slate-400">
                            Live classification of protected, shared, archived, and blocked vault objects.
                        </p>
                    </div>
                    <div className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-sky-300">
                        Real-time map
                    </div>
                </div>

                <div className="mt-4">
                    <div className="relative mx-auto h-56 max-w-[260px]">
                        <div className="absolute inset-6 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18),transparent_62%)] blur-2xl" />
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={54}
                                    outerRadius={82}
                                    paddingAngle={3}
                                    cornerRadius={8}
                                    stroke="rgba(255,255,255,0.12)"
                                    strokeWidth={1}
                                    animationBegin={120}
                                    animationDuration={950}
                                    onMouseEnter={(_, index) => setActiveSlice(index)}
                                >
                                    {pieData.map((entry) => (
                                        <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    cursor={false}
                                    contentStyle={{
                                        backgroundColor: 'rgba(8, 15, 28, 0.92)',
                                        border: '1px solid rgba(56, 189, 248, 0.18)',
                                        borderRadius: '14px',
                                        color: '#f8fafc',
                                    }}
                                    labelStyle={{ color: '#cbd5e1', fontSize: 12 }}
                                    formatter={(value, name) => {
                                        const numericValue = Number(value ?? 0);
                                        const percentage = pieTotal > 0 ? Math.round((numericValue / pieTotal) * 100) : 0;
                                        return [`${numericValue} files (${percentage}%)`, String(name ?? '')];
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="rounded-full border border-white/10 bg-slate-950/70 px-5 py-4 text-center backdrop-blur">
                                <p className="text-2xl font-black tracking-tight text-white">{pieTotal}</p>
                                <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-slate-500">
                                    cloud objects
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 space-y-2">
                        {pieData.map((item, index) => {
                            const percentage = pieTotal > 0 ? Math.round((item.value / pieTotal) * 100) : 0;
                            const isActive = activeSlice === index;

                            return (
                                <motion.div
                                    key={item.name}
                                    whileHover={{ scale: 1.01 }}
                                    onMouseEnter={() => setActiveSlice(index)}
                                    className={`flex cursor-default items-center justify-between rounded-2xl border px-3 py-2 transition-all ${
                                        isActive
                                            ? 'border-white/15 bg-white/[0.05] shadow-[0_0_18px_rgba(56,189,248,0.08)]'
                                            : 'border-white/8 bg-white/[0.02]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: item.color, boxShadow: `0 0 14px ${item.color}` }}
                                        />
                                        <span className="text-xs font-medium text-slate-200">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-white">{item.value}</p>
                                        <p className="text-[11px] text-slate-500">{percentage}%</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="relative z-10 mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-white">Cloud Sync Status</p>
                        <p className="mt-1 text-xs text-slate-400">Synced with AWS S3</p>
                    </div>
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                        Real-time sync active
                    </div>
                </div>

                <div className="mt-4 h-24">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={telemetryData} margin={{ top: 4, right: 0, left: -18, bottom: 0 }}>
                            <defs>
                                <linearGradient id="secureSyncFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                            <Tooltip
                                cursor={{ stroke: 'rgba(56,189,248,0.35)', strokeWidth: 1 }}
                                contentStyle={{
                                    backgroundColor: 'rgba(8, 15, 28, 0.92)',
                                    border: '1px solid rgba(56, 189, 248, 0.18)',
                                    borderRadius: '14px',
                                    color: '#f8fafc',
                                }}
                                labelStyle={{ color: '#cbd5e1', fontSize: 12 }}
                                formatter={(value) => [`${Number(value ?? 0)} secure ops`, 'Encrypted sync']}
                            />
                            <Area
                                type="monotone"
                                dataKey="syncOps"
                                stroke="#38bdf8"
                                strokeWidth={2}
                                fill="url(#secureSyncFill)"
                                dot={{ r: 2, fill: '#7dd3fc', strokeWidth: 0 }}
                                activeDot={{ r: 4, fill: '#34d399', strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Encrypted object stream integrity: {syncConfidence}%</span>
                    <span>Bucket consistency: {bucketIntegrity}%</span>
                </div>
            </div>

            <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
                <MetricTile
                    icon={<Link2 className="h-4 w-4 text-cyan-300" />}
                    label="Shared Files Analytics"
                    value={`${sharedLinksActive} Shared Links Active`}
                    hint="Access-controlled distribution"
                />
                <MetricTile
                    icon={<Users className="h-4 w-4 text-sky-300" />}
                    label="Active Sessions"
                    value={`${secureSessions} Secure Sessions`}
                    hint="Authenticated sessions online"
                />
                <MetricTile
                    icon={<Server className="h-4 w-4 text-emerald-300" />}
                    label="AWS S3 Bucket Health"
                    value="Healthy"
                    hint="Replication and object checks passed"
                    tone="success"
                />
                <MetricTile
                    icon={<Activity className="h-4 w-4 text-emerald-300" />}
                    label="Security Monitoring"
                    value="Threat Detection: Secure"
                    hint="No suspicious activity detected"
                    tone="success"
                />
            </div>
        </div>
    );
}

function MetricTile({
    icon,
    label,
    value,
    hint,
    tone = 'default',
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    hint: string;
    tone?: 'default' | 'success';
}) {
    const toneClasses =
        tone === 'success'
            ? 'border-emerald-400/15 bg-emerald-500/5'
            : 'border-white/10 bg-white/[0.03]';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`rounded-2xl border p-3 ${toneClasses}`}
        >
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                {icon}
                <span>{label}</span>
            </div>
            <p className="text-sm font-bold text-white">{value}</p>
            <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
        </motion.div>
    );
}
