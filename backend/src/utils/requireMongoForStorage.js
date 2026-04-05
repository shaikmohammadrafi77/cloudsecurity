const mongoose = require('mongoose');

/** Send 503 and return false when DB-backed file storage is unavailable (mock auth or disconnected). */
function requireMongoForStorage(res) {
    if (process.env.MOCK_MONGO === 'true' || mongoose.connection.readyState !== 1) {
        res.status(503).json({
            message:
                'File storage requires a connected MongoDB. Mock/offline mode only supports sign-in and security settings; connect the database to upload or manage files.',
        });
        return false;
    }
    return true;
}

module.exports = requireMongoForStorage;
