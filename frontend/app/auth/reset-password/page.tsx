'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '@/services/api';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);
    const initialToken = useMemo(() => searchParams.get('token') || '', [searchParams]);

    const [email, setEmail] = useState(initialEmail);
    const [token, setToken] = useState(initialToken);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        if (password !== confirmPassword) {
            setLoading(false);
            setError('Passwords do not match.');
            return;
        }

        try {
            const { data } = await api.post('/auth/reset-password', {
                email,
                token,
                password,
            });
            setMessage(data?.message || 'Password reset successful. Redirecting to login...');
            setTimeout(() => router.push('/auth/login'), 1400);
        } catch (submitError: any) {
            setError(submitError?.response?.data?.message || 'Unable to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card p-10 max-w-md w-full border-white/5 space-y-8">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 mb-4">
                        <ShieldCheck className="text-primary w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Reset Password</h2>
                    <p className="text-slate-400 mt-2">Use your reset token and choose a new password.</p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="email"
                                id="reset-email"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Reset Token</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                id="reset-token"
                                name="token"
                                value={token}
                                onChange={(e) => setToken(e.target.value.trim())}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="Paste reset token"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="password"
                                id="reset-password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="At least 8 characters"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Confirm Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="password"
                                id="reset-confirm-password"
                                name="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="Re-enter password"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className="text-xs rounded-xl border border-green-500/30 bg-green-500/10 text-green-300 px-3 py-2">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="text-xs rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full glass-button bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                    >
                        {loading ? 'Resetting...' : 'Reset Password'} <ArrowRight size={20} />
                    </button>
                </form>

                <p className="text-center text-slate-400 text-sm">
                    Back to{' '}
                    <Link href="/auth/login" className="text-primary hover:underline font-medium">Login</Link>
                </p>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center p-4 text-slate-400">
                    Loading reset form...
                </div>
            }
        >
            <ResetPasswordForm />
        </Suspense>
    );
}
