const resolveAppUrl = () => {
    const candidate =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.FRONTEND_URL ||
        process.env.NEXT_PUBLIC_FRONTEND_URL ||
        'http://localhost:3000';

    return String(candidate).replace(/\/+$/, '');
};

module.exports = resolveAppUrl;
