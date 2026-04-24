'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '@/services/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const getApiErrorMessage = (submitError: any) => {
        const responseData = submitError?.response?.data;
        if (typeof responseData === 'string') {
            return responseData;
        }
        if (responseData?.message) {
            return responseData.message;
        }
        if (submitError?.response?.status === 429) {
            return 'Too many attempts. Please wait a few minutes and try again.';
        }
        return submitError?.message || 'Unable to process password reset request.';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            const devToken = data?.devResetToken ? ` Dev token: ${data.devResetToken}` : '';
            setMessage(`${data?.message || 'Reset link sent if account exists.'}${devToken}`);
        } catch (submitError: any) {
            setError(getApiErrorMessage(submitError));
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
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Forgot Password</h2>
                    <p className="text-slate-400 mt-2">Enter your email to receive a reset link.</p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="email"
                                id="forgot-email"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary/50 transition-colors"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className="text-xs rounded-xl border border-green-500/30 bg-green-500/10 text-green-300 px-3 py-2 break-all">
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
                        {loading ? 'Sending...' : 'Send Reset Link'} <ArrowRight size={20} />
                    </button>
                </form>

                <p className="text-center text-slate-400 text-sm">
                    Remembered your password?{' '}
                    <Link href="/auth/login" className="text-primary hover:underline font-medium">Back to Login</Link>
                </p>
            </div>
        </div>
    );
}
