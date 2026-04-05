import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
});

// Add auth token to requests (guard for SSR - localStorage is only available client-side)
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('user');
        if (raw) {
            try {
                const user = JSON.parse(raw);
                if (user && user.token) {
                    config.headers.Authorization = `Bearer ${user.token}`;
                }
            } catch (_) {
                // Corrupt data — ignore
            }
        }
    }
    return config;
});

export default api;
