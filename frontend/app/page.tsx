'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Lock, Zap, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
    return (
        <main className="relative min-h-screen overflow-hidden bg-background text-foreground gradient-mesh">
            {/* Hero Section */}
            <div className="container mx-auto px-6 pt-32 pb-20 relative z-10">
                <div className="flex flex-col items-center text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium animate-pulse"
                    >
                        <Shield className="w-4 h-4" />
                        <span>AES-256 Bank-Grade Encryption Active</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-extrabold tracking-tight glow-text leading-tight"
                    >
                        Your Data, <br />
                        <span className="text-white">Fortified in the Cloud.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        Cloudescurity combines cutting-edge AES-256 encryption with a seamless user experience. 
                        Store, share, and manage your files with absolute peace of mind.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-wrap gap-6 justify-center pt-4"
                    >
                        <Link href="/auth/register" className="glass-button bg-primary text-white scale-110 shadow-lg shadow-primary/20">
                            Start Securely
                        </Link>
                        <Link href="/auth/login" className="glass-button border-white/10 hover:bg-white/5">
                            Member Login
                        </Link>
                    </motion.div>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32">
                    {[
                        {
                            icon: <Lock className="w-8 h-8 text-primary" />,
                            title: "AES-256 Encryption",
                            desc: "Every file is encrypted on the server using industry-standard AES-256-CBC or AES-256-GCM before reaching storage."
                        },
                        {
                            icon: <Zap className="w-8 h-8 text-accent" />,
                            title: "Real-time Monitoring",
                            desc: "Get instant notification of file access and security events via integrated WebSockets."
                        },
                        {
                            icon: <CheckCircle2 className="w-8 h-8 text-green-400" />,
                            title: "Zero Compromise",
                            desc: "Enjoy the convenience of the cloud without sacrificing the security of your private data."
                        }
                    ].map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                            className="glass-card-hover p-8 rounded-3xl space-y-4"
                        >
                            <div className="p-3 bg-white/5 rounded-2xl inline-block">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold">{feature.title}</h3>
                            <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Background Decorations */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/20 blur-[150px] rounded-full -z-10 animate-float" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent/20 blur-[150px] rounded-full -z-10 animate-float" style={{ animationDelay: '2s' }} />
        </main>
    );
}

