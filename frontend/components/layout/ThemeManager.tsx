'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'theme';

type ThemeChoice = 'light' | 'dark';

const applyTheme = (choice: ThemeChoice) => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = choice;
    document.documentElement.style.colorScheme = choice;
};

export default function ThemeManager() {
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const resolved = stored === 'light' || stored === 'dark' ? stored : 'dark';
        applyTheme(resolved);

        const handleStorage = (event: StorageEvent) => {
            if (event.key !== STORAGE_KEY) return;
            const next = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'dark';
            applyTheme(next);
        };

        const handleCustomEvent = (event: Event) => {
            const detail = (event as CustomEvent<ThemeChoice>).detail;
            if (detail) applyTheme(detail);
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener('theme-change', handleCustomEvent);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('theme-change', handleCustomEvent);
        };
    }, []);

    return null;
}
