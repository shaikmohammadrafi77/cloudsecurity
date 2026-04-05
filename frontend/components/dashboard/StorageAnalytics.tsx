'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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

const fallbackData: StorageCategory[] = [
    { name: 'Documents', value: 400, color: '#8b5cf6' },
    { name: 'Images', value: 300, color: '#3b82f6' },
    { name: 'Media', value: 300, color: '#ec4899' },
    { name: 'Others', value: 200, color: '#64748b' },
];

export default function StorageAnalytics({
    used = 700,
    limit = 1000,
    categories = fallbackData,
}: StorageAnalyticsProps) {
    const safeLimit = limit > 0 ? limit : 1;
    const boundedUsed = Math.max(0, Math.min(used, safeLimit));
    const usagePercent = Math.round((boundedUsed / safeLimit) * 100);
    const remaining = Math.max(0, safeLimit - boundedUsed);
    const chartData = categories.length > 0 ? categories : fallbackData;

    return (
        <div className="glass-card p-6 h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-6">Storage Overview</h3>

            <div className="flex-1 min-h-[250px] relative">
                {/* Recharts needs a concrete height; `height="100%"` can become -1 during prerender/layout */}
                <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                    <p className="text-2xl font-bold">{usagePercent}%</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Used</p>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Capacity</span>
                    <span className="font-medium">{safeLimit} MB</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${usagePercent}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 pt-2">
                    <span>{boundedUsed} MB used</span>
                    <span>{remaining} MB remaining</span>
                </div>
            </div>
        </div>
    );
}
