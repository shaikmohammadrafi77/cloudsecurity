'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Shield, Smartphone, CheckCircle, XCircle, RefreshCcw, Lock } from 'lucide-react';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function SecurityPage() {
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [verificationToken, setVerificationToken] = useState('');
    const [setupMode, setSetupMode] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data } = await api.get('/auth/profile');
            setTwoFactorEnabled(Boolean(data.twoFactorEnabled));
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSetup2FA = async () => {
        try {
            const { data } = await api.get('/auth/2fa/setup');
            setQrCode(data.qrCodeUrl);
            setSetupMode(true);
        } catch (error: unknown) {
            const ax = error as { response?: { status?: number; data?: { message?: string } } };
            const msg =
                ax.response?.data?.message ||
                (ax.response?.status === 503
                    ? 'Database unavailable. Check MongoDB or use MOCK_MONGO mode for local dev.'
                    : 'Failed to start 2FA setup.');
            console.error('Failed to setup 2FA:', error);
            alert(msg);
        }
    };

    const handleEnable2FA = async () => {
        try {
            await api.post('/auth/2fa/enable', { token: verificationToken });
            setTwoFactorEnabled(true);
            setSetupMode(false);
            setQrCode(null);
            setVerificationToken('');
        } catch (error) {
            alert('Invalid token or verification failed.');
        }
    };

    const handleDisable2FA = async () => {
        if (!confirm('Are you sure you want to disable 2FA? This will decrease your account security.')) return;
        try {
            await api.post('/auth/2fa/disable');
            setTwoFactorEnabled(false);
        } catch (error) {
            console.error('Failed to disable 2FA:', error);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-4xl mx-auto">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-black uppercase tracking-widest">
                        <Shield size={12} /> Security Center
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">Security Settings</h2>
                    <p className="text-slate-400 font-medium">Strengthen your account protection with industrial-grade encryption and 2FA.</p>
                </div>

                <div className="grid gap-6">
                    {/* 2FA Status Card */}
                    <div className="glass-card p-8 flex flex-col md:flex-row items-center gap-8 border-white/5">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${
                            twoFactorEnabled ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                        } border-[2px]`}>
                            <Smartphone size={40} />
                        </div>
                        <div className="flex-1 space-y-2 text-center md:text-left">
                            <h3 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2">
                                Two-Factor Authentication
                                {twoFactorEnabled ? <CheckCircle size={18} className="text-green-500" /> : <XCircle size={18} className="text-red-500" />}
                            </h3>
                            <p className="text-slate-500 text-sm max-w-md leading-relaxed">
                                Add an extra layer of security to your account by requiring a code from your mobile authenticator app.
                            </p>
                        </div>
                        <div className="w-full md:w-auto">
                            {twoFactorEnabled ? (
                                <button onClick={handleDisable2FA} className="glass-button bg-red-500 text-white w-full">
                                    Disable 2FA
                                </button>
                            ) : (
                                <button onClick={handleSetup2FA} className="glass-button bg-primary text-white w-full">
                                    Setup 2FA
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Setup 2FA Flow */}
                    <AnimatePresence>
                        {setupMode && qrCode && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="glass-card-hover p-8 border-primary/20 space-y-8"
                            >
                                <div className="text-center space-y-4">
                                    <h4 className="text-2xl font-black uppercase tracking-tighter">Secure Link Setup</h4>
                                    <p className="text-slate-400 text-sm max-w-sm mx-auto">
                                        Scan the QR code below using Google Authenticator or Authy, then enter the 6-digit code.
                                    </p>
                                </div>
                                
                                <div className="flex flex-col md:flex-row items-center justify-center gap-12 bg-black/20 p-8 rounded-3xl">
                                    <div className="p-4 bg-white rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                                        {/* eslint-disable-next-line @next/next/no-img-element -- data: URL from API */}
                                        <img
                                            src={qrCode}
                                            alt="2FA setup QR code"
                                            width={192}
                                            height={192}
                                            className="w-48 h-48"
                                        />
                                    </div>
                                    <div className="space-y-6 w-full max-w-xs">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Verification Code</label>
                                            <input 
                                                type="text" 
                                                id="security-2fa-token"
                                                name="verificationToken"
                                                placeholder="000000" 
                                                maxLength={6}
                                                value={verificationToken}
                                                onChange={(e) => setVerificationToken(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-center text-3xl font-black tracking-[0.5em] focus:outline-none focus:border-primary/50 transition-all font-mono"
                                            />
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => setSetupMode(false)} className="glass-button flex-1 border-white/10">Cancel</button>
                                            <button onClick={handleEnable2FA} className="glass-button bg-primary text-white flex-1">Verify</button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Encryption Info */}
                    <div className="glass-card p-8 border-white/5 bg-gradient-to-br from-primary/5 to-transparent">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                                <Lock size={24} />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-bold">End-to-End Governance</h4>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Your files are encrypted with unique initialization vectors (IV) using AES-256-CBC or AES-256-GCM. We never store your raw data; only your encrypted segments are safely held in our decentralized S3 vaults.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
