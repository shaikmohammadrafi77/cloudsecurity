"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StorageAnalytics from "@/components/dashboard/StorageAnalytics";
import { ShieldCheck, ArrowRightLeft, Clock, Lock } from "lucide-react";
import api from "@/services/api";

type DashboardStats = {
  vaultStatus: string;
  transfers: number;
  recentAccess: number;
  securityLevel: string;
  storageUsed: string;
};

const fallbackStats: DashboardStats = {
  vaultStatus: "Active",
  transfers: 0,
  recentAccess: 0,
  securityLevel: "Maximum",
  storageUsed: "0",
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const stats = data ?? fallbackStats;

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await api.get("/stats");
        setData({ ...fallbackStats, ...response.data });
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        setErrorMessage("Live stats unavailable. Showing fallback values.");
        setData(fallbackStats);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading && !data) return (
      <DashboardLayout>
          <div className="flex items-center justify-center h-[50vh]">
            <p className="text-slate-400 animate-pulse text-lg tracking-wide uppercase">System Booting...</p>
          </div>
      </DashboardLayout>
  );

  return (
    <DashboardLayout>
        {errorMessage && (
          <div className="mb-6 glass-card-hover rounded-3xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {errorMessage}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
          <DashboardCard
              title="Vault Isolation"
              value={stats.vaultStatus || "Active"}
              icon={<ShieldCheck className="text-blue-300 w-6 h-6" />}
              href="/dashboard/security"
          />
          <DashboardCard
              title="File Transfers"
              value={stats.transfers || 0}
              icon={<ArrowRightLeft className="text-sky-300 w-6 h-6" />}
              href="/dashboard/files"
          />
          <DashboardCard
              title="Recent Access (24h)"
              value={stats.recentAccess || 0}
              icon={<Clock className="text-cyan-300 w-6 h-6" />}
              href="/dashboard/activity"
          />
          <DashboardCard
              title="Security Level"
              value={stats.securityLevel || "Maximum"}
              icon={<Lock className="text-blue-200 w-6 h-6" />}
              href="/dashboard/security"
          />

        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col min-h-[350px]">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
                 <h3 className="text-lg font-semibold mb-4 text-white z-10">System Event Log</h3>
                 
                 <div className="flex-1 flex items-center justify-center relative z-10">
                     <div className="text-slate-400 text-sm flex flex-col items-center gap-2 border border-dashed border-white/10 p-8 rounded-xl bg-white/5">
                         <Clock className="w-8 h-8 text-slate-500 mb-2 opacity-50" />
                         <span>No extraordinary events detected in the last cycle.</span>
                         <span className="text-xs text-primary/70">All systems green.</span>
                         <Link href="/dashboard/activity" className="mt-2 text-primary hover:underline font-semibold text-xs uppercase tracking-wider">
                            Open Activity Logs
                         </Link>
                     </div>
                 </div>
            </div>
            
            <div className="lg:col-span-1">
                 <StorageAnalytics used={Number(stats.storageUsed || "0")} limit={1024} />
            </div>
        </div>
    </DashboardLayout>
  );
}

function DashboardCard({
    title,
    value,
    icon,
    href,
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    href: string;
}) {
    return (
        <Link href={href} className="glass-card p-6 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-blue-400/30 hover:shadow-[0_12px_48px_rgba(59,130,246,0.12)] transition-all duration-300 relative overflow-hidden cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
                <h2 className="text-sm font-medium text-slate-400 mb-2">{title}</h2>
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 group-hover:to-white transition-all">{value}</h1>
            </div>
            <div className="relative z-10 w-14 h-14 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-center group-hover:border-blue-300/20 group-hover:bg-blue-400/10 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 shadow-lg shadow-black/20">
                {icon}
            </div>
        </Link>
    );
}
