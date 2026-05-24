'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';
import { 
    LayoutDashboard, 
    Folder, 
    Share2, 
    Settings, 
    LogOut, 
    ShieldCheck, 
    Shield,
    History,
    HardDrive,
    Trash2,
    Search,
    Bell,
    Sun,
    Moon
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const pathSegments = pathname.split('/').filter(Boolean);
    const [currentUser, setCurrentUser] = React.useState<{
        name?: string;
        role?: string;
        storageUsed?: number;
        totalStorageLimit?: number;
    } | null>(null);
    const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
    const [themeChoice, setThemeChoice] = React.useState<'light' | 'dark'>('dark');
    const profileMenuRef = React.useRef<HTMLDivElement | null>(null);

    const formatSegmentLabel = (segment: string) => {
        return segment
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    };

    const breadcrumbItems = [
        { href: '/', label: 'Home' },
        ...pathSegments.map((segment, index) => ({
            href: `/${pathSegments.slice(0, index + 1).join('/')}`,
            label: formatSegmentLabel(segment),
        })),
    ];

    const currentSection = pathSegments.length > 0 ? formatSegmentLabel(pathSegments[pathSegments.length - 1]) : 'Dashboard';

    const displayName = currentUser?.name || 'Secure User';
    const roleLabel = currentUser?.role
        ? `${currentUser.role.charAt(0).toUpperCase()}${currentUser.role.slice(1)}`
        : 'Premium';
    const accountLabel = `${roleLabel} Account`;
    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'SU';

    const storageUsedBytes = Number(currentUser?.storageUsed ?? 0);
    const storageLimitBytes = Number(currentUser?.totalStorageLimit ?? 10 * 1024 * 1024 * 1024);
    const safeStorageLimit = storageLimitBytes > 0 ? storageLimitBytes : 1;
    const storageUsedPercent = Math.max(0, Math.min(100, (storageUsedBytes / safeStorageLimit) * 100));

    const formatStorage = (bytes: number) => {
        const gb = 1024 * 1024 * 1024;
        const mb = 1024 * 1024;
        if (bytes >= gb) return `${(bytes / gb).toFixed(1)} GB`;
        if (bytes >= mb) return `${(bytes / mb).toFixed(1)} MB`;
        return `${Math.max(0, Math.round(bytes / 1024))} KB`;
    };

    const menuItems = [
        { href: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Overview' },
        { href: '/dashboard/files', icon: <Folder size={20} />, label: 'My Files' },
        { href: '/dashboard/share', icon: <Share2 size={20} />, label: 'Shared Links' },
        { href: '/dashboard/activity', icon: <History size={20} />, label: 'Activity' },
        { href: '/dashboard/trash', icon: <Trash2 size={20} />, label: 'Recycle Bin' },
        { href: '/dashboard/security', icon: <Shield size={20} />, label: 'Security' },
        { href: '/dashboard/settings', icon: <Settings size={20} />, label: 'Settings' },
    ];

    const isRouteActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard';
        }
        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
        }
        setProfileMenuOpen(false);
        router.push('/auth/login');
    };

    const applyThemeChoice = (choice: 'light' | 'dark') => {
        setThemeChoice(choice);
        if (typeof window === 'undefined') return;
        localStorage.setItem('theme', choice);
        window.dispatchEvent(new CustomEvent('theme-change', { detail: choice }));
    };

    React.useEffect(() => {
        let isMounted = true;

        const loadSessionUser = () => {
            if (typeof window === 'undefined') return;
            const raw = localStorage.getItem('user');
            if (!raw) return;
            try {
                const parsed = JSON.parse(raw) as { name?: string; role?: string };
                if (isMounted) {
                    setCurrentUser({
                        name: parsed.name,
                        role: parsed.role,
                    });
                }
            } catch (_) {
                if (isMounted) {
                    setCurrentUser(null);
                }
            }
        };

        const loadProfile = async () => {
            try {
                const { data } = await api.get('/auth/profile');
                if (!isMounted) return;
                setCurrentUser((prev) => ({
                    name: data?.name || prev?.name,
                    role: data?.role || prev?.role,
                    storageUsed: typeof data?.storageUsed === 'number' ? data.storageUsed : prev?.storageUsed,
                    totalStorageLimit: typeof data?.totalStorageLimit === 'number' ? data.totalStorageLimit : prev?.totalStorageLimit,
                }));
            } catch (_) {
                // Keep local session fallback.
            }
        };

        loadSessionUser();
        loadProfile();

        return () => {
            isMounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark') {
            setThemeChoice(stored);
        } else {
            setThemeChoice('dark');
        }
        const handleThemeChange = (event: Event) => {
            const detail = (event as CustomEvent<'light' | 'dark'>).detail;
            if (detail === 'light' || detail === 'dark') setThemeChoice(detail);
        };
        window.addEventListener('theme-change', handleThemeChange);
        return () => window.removeEventListener('theme-change', handleThemeChange);
    }, []);

    React.useEffect(() => {
        if (!profileMenuOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (!profileMenuRef.current) return;
            if (!profileMenuRef.current.contains(event.target as Node)) {
                setProfileMenuOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setProfileMenuOpen(false);
        };
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [profileMenuOpen]);

    return (
        <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
            {/* Sidebar */}
            <aside className="w-72 glass-card m-4 mr-0 flex flex-col border-white/5 relative group">
                <div className="p-8 pb-4 flex items-center gap-3">
                    <motion.div 
                        whileHover={{ rotate: 180 }}
                        className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30"
                    >
                        <ShieldCheck className="text-primary w-6 h-6" />
                    </motion.div>
                    <span className="text-xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        CLOUDESCURITY
                    </span>
                </div>

                <div className="px-6 py-4">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input 
                            type="text" 
                            id="sidebar-search"
                            name="sidebarSearch"
                            placeholder="Quick search..." 
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                        />
                    </div>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    {menuItems.map((item) => (
                        <NavItem 
                            key={item.href}
                            href={item.href} 
                            icon={item.icon} 
                            label={item.label} 
                            active={isRouteActive(item.href)} 
                        />
                    ))}
                </nav>

                {/* Storage Info */}
                <div className="p-6 m-4 mt-auto rounded-3xl bg-primary/5 border border-white/5 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-400 font-medium">
                            <HardDrive size={16} />
                            <span>Storage</span>
                        </div>
                        <span className="text-white font-bold">{formatStorage(storageUsedBytes)}/{formatStorage(storageLimitBytes)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${storageUsedPercent}%` }}
                            className="h-full bg-gradient-to-r from-primary to-accent"
                        />
                    </div>
                    <button className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold transition-all">
                        Upgrade Plan
                    </button>
                </div>

                <div className="p-4 border-t border-white/5">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 transition-colors group/logout">
                        <LogOut size={20} className="group-hover/logout:-translate-x-1 transition-transform" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-20 flex justify-between items-center px-12 border-b border-white/5">
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold truncate">{currentSection}</h2>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            {breadcrumbItems.map((item, index) => {
                                const isLast = index === breadcrumbItems.length - 1;
                                return (
                                    <React.Fragment key={item.href}>
                                        {index > 0 && <span>/</span>}
                                        <Link
                                            href={item.href}
                                            className={`transition-colors ${isLast ? 'text-slate-300 font-semibold hover:text-white' : 'hover:text-white'}`}
                                        >
                                            {item.label}
                                        </Link>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <Link
                            href="/dashboard/activity"
                            aria-label="Open activity notifications"
                            className="relative p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                        </Link>
                        
                        <div className="relative" ref={profileMenuRef}>
                            <button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setProfileMenuOpen((prev) => !prev);
                                }}
                                className="flex items-center gap-4 pl-6 border-l border-white/10 group/profile"
                                aria-haspopup="menu"
                                aria-expanded={profileMenuOpen}
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold group-hover/profile:text-primary transition-colors">{displayName}</p>
                                    <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{accountLabel}</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-accent to-emerald-400 p-[1px] shadow-lg shadow-primary/20 group-hover/profile:scale-105 transition-transform cursor-pointer">
                                    <div className="w-full h-full rounded-[14px] bg-background flex items-center justify-center overflow-hidden">
                                        <span className="text-lg font-black text-primary">{initials}</span>
                                    </div>
                                </div>
                            </button>

                            <AnimatePresence>
                                {profileMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                        className="absolute right-0 mt-3 w-64 rounded-2xl border border-white/10 bg-card/95 backdrop-blur-xl shadow-2xl z-30 p-3"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <div className="px-2 py-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                                            Account
                                        </div>
                                        <Link
                                            href="/dashboard/settings"
                                            onClick={() => setProfileMenuOpen(false)}
                                            className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-200 hover:bg-white/5 transition-colors"
                                        >
                                            Settings
                                            <span className="text-[10px] text-slate-500">Profile</span>
                                        </Link>

                                        <div className="mt-3 px-2 py-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                                            Theme
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 px-1">
                                            <button
                                                onClick={() => applyThemeChoice('light')}
                                                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs transition-colors ${
                                                    themeChoice === 'light'
                                                        ? 'bg-primary/20 text-primary'
                                                        : 'text-slate-300 hover:bg-white/5'
                                                }`}
                                            >
                                                <Sun size={16} />
                                                Light
                                            </button>
                                            <button
                                                onClick={() => applyThemeChoice('dark')}
                                                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-xs transition-colors ${
                                                    themeChoice === 'dark'
                                                        ? 'bg-primary/20 text-primary'
                                                        : 'text-slate-300 hover:bg-white/5'
                                                }`}
                                            >
                                                <Moon size={16} />
                                                Dark
                                            </button>
                                        </div>

                                        <div className="mt-3 border-t border-white/10 pt-3">
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-2 px-3 py-2 w-full rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                            >
                                                <LogOut size={16} />
                                                Logout
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
}

function NavItem({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all duration-300 relative group ${active
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
        >
            {active && (
                <motion.div 
                    layoutId="active-nav"
                    className="absolute inset-0 bg-sky-400/10 border border-sky-300/25 rounded-2xl -z-10 shadow-[0_0_24px_rgba(56,189,248,0.14)]"
                />
            )}
            <span className={`${active ? 'text-sky-300' : 'group-hover:text-sky-300'} transition-colors`}>
                {icon}
            </span>
            <span className="font-semibold text-sm tracking-wide">{label}</span>
        </Link>
    );
}
