import '../styles/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Cloudescurity | Secure File Storage',
    description: 'Production-ready full-stack cloud application enabling secure file storage, sharing, and monitoring.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.className} gradient-mesh min-h-screen text-slate-200`} suppressHydrationWarning>
                <div className="relative z-10">
                    {children}
                </div>
            </body>
        </html>
    );
}
