const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isMongoUnavailable, dbUnavailableMessage } = require('../utils/mongoError');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (process.env.MOCK_MONGO === 'true') {
                const mockStore = require('../utils/mockAuthStore');
                const user = mockStore.findById(decoded.id);
                if (!user) {
                    return res.status(401).json({ message: 'User no longer exists' });
                }
                req.user = {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    twoFactorEnabled: user.twoFactorEnabled,
                    vaultSalt: user.vaultSalt,
                    vaultSecret: user.vaultSecret,
                    storageUsed: user.storageUsed,
                    totalStorageLimit: user.totalStorageLimit,
                };
                return next();
            }

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'User no longer exists' });
            }

            next();
        } catch (error) {
            if (process.env.MOCK_MONGO !== 'true' && isMongoUnavailable(error)) {
                return res.status(503).json({ message: dbUnavailableMessage() });
            }
            console.error('Auth error:', error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, admin };
