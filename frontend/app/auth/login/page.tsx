'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';
import api from '@/services/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mfaToken, setMfaToken] = useState('');
    const [mfaRequired, setMfaRequired] = useState(false);
    const [mfaUserId, setMfaUserId] = useState('');
    const [mfaMethod, setMfaMethod] = useState<'authenticator' | 'email'>('authenticator');
    const [emailOtpAvailable, setEmailOtpAvailable] = useState(false);
    const [mfaEmailHint, setMfaEmailHint] = useState('');
    const [emailOtpStatus, setEmailOtpStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const router = useRouter();

    const getApiErrorMessage = (error: any, fallback: string) => {
        const responseData = error?.response?.data;
        if (typeof responseData === 'string') {
            return responseData;
        }
        return responseData?.message || fallback;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            
            if (data.mfaRequired) {
                setMfaRequired(true);
                setMfaUserId(data.userId);
                setMfaMethod('authenticator');
                setEmailOtpAvailable(Boolean(data.emailOtpAvailable));
                setMfaEmailHint(data.emailMasked || data.email || '');
                setEmailOtpStatus(null);
                setMfaToken('');
                setLoading(false);
                return;
            }

            localStorage.setItem('user', JSON.stringify(data));
            router.push('/dashboard');
        } catch (error: any) {
            setErrorMessage(getApiErrorMessage(error, 'Login failed'));
            setLoading(false);
        }
    };

    const handleMFAVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);
        try {
            const { data } = await api.post('/auth/verify-mfa', { 
                userId: mfaUserId, 
                token: mfaToken,
                method: mfaMethod,
            });
            localStorage.setItem('user', JSON.stringify(data));
            router.push('/dashboard');
        } catch (error: any) {
            setErrorMessage(getApiErrorMessage(error, 'Invalid 2FA token'));
        } finally {
            setLoading(false);
        }
    };

    const handleSendEmailOtp = async () => {
        if (!mfaUserId) return;
        setLoading(true);
        setErrorMessage(null);
        setEmailOtpStatus(null);
        try {
            const { data } = await api.post('/auth/verify-mfa/email/request', {
                userId: mfaUserId,
            });
            setMfaMethod('email');
            setEmailOtpStatus(data?.message || 'Verification code sent to your email.');
        } catch (error: any) {
            setErrorMessage(getApiErrorMessage(error, 'Failed to send email verification code'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card p-10 max-w-md w-full border-white/5">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 mb-4">
                        <ShieldCheck className="text-primary w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Welcome Back</h2>
                    <p className="text-slate-400 mt-2">Access your secure files</p>
                </div>

                {mfaRequired ? (
                    <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" onSubmit={handleMFAVerify}>
                        {errorMessage && (
                            <div className="text-xs rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2">
                                {errorMessage}
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col items-center gap-2">
                                <ShieldCheck className="text-primary w-8 h-8" />
                                <p className="text-sm font-bold text-primary uppercase tracking-widest text-center">2FA Verification Required</p>
                            </div>
                            {emailOtpAvailable && (
                                <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-2 border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMfaMethod('authenticator');
                                            setEmailOtpStatus(null);
                                        }}
                                        className={`rounded-lg py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                                            mfaMethod === 'authenticator'
                                                ? 'bg-primary text-white'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        App Code
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMfaMethod('email')}
                                        className={`rounded-lg py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                                            mfaMethod === 'email'
                                                ? 'bg-primary text-white'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        Email Code
                                    </button>
                                </div>
                            )}
                            {mfaMethod === 'email' && emailOtpAvailable && (
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={handleSendEmailOtp}
                                        disabled={loading}
                                        className="w-full glass-button border-white/10 text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                                    >
                                        {emailOtpStatus ? 'Resend Email Code' : 'Send Email Code'}
                                    </button>
                                    {mfaEmailHint && (
                                        <p className="text-xs text-slate-500 text-center">Code will be sent to {mfaEmailHint}</p>
                                    )}
                                    {emailOtpStatus && (
                                        <p className="text-xs text-green-400 text-center">{emailOtpStatus}</p>
                                    )}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">
                                    {mfaMethod === 'email' ? 'Email Verification Code' : 'Authenticator Code'}
                                </label>
                                <input
                                    type="text"
                                    id="login-mfa-token"
                                    name="mfaToken"
                                    value={mfaToken}
                                    onChange={(e) => setMfaToken(e.target.value)}
                                    maxLength={6}
                                    required
                                    autoFocus
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-center text-3xl font-black tracking-[0.5em] focus:outline-none focus:border-primary/50 transition-all font-mono"
                                    placeholder="000000"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full glass-button bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Verify & Login'} <ArrowRight size={20} />
                        </button>
                        
                        <button 
                            type="button"
                            onClick={() => {
                                setMfaRequired(false);
                                setMfaMethod('authenticator');
                                setEmailOtpStatus(null);
                                setMfaToken('');
                                setErrorMessage(null);
                            }}
                            className="w-full text-xs text-slate-500 font-bold uppercase tracking-widest hover:text-white transition-colors py-2"
                        >
                            Back to Login
                        </button>
                    </form>
                ) : (
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {errorMessage && (
                            <div className="text-xs rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 px-3 py-2">
                                {errorMessage}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="email"
                                    id="login-email"
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
                            <label className="text-sm font-medium text-slate-300">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                <input
                                    type="password"
                                    id="login-password"
                                    name="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary/50 transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="text-right pt-1">
                                <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline font-medium">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full glass-button bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] mb-6 disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Secure Login'} <ArrowRight size={20} />
                        </button>
                    </form>
                )}

                <p className="text-center text-slate-400 text-sm">
                    {"Don't have an account? "}
                    <Link href="/auth/register" className="text-primary hover:underline font-medium">Create one</Link>
                </p>
            </div>
        </div>
    );
}
