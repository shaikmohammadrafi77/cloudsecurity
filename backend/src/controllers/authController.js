const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateSecret, generateURI, verifySync } = require('otplib');
const securityService = require('../services/securityService');
const { isMongoUnavailable, dbUnavailableMessage } = require('../utils/mongoError');
const { isSmtpConfigured, sendPasswordResetEmail, sendLoginOtpEmail } = require('../utils/mailer');

function sendAuthError(res, error) {
    if (isMongoUnavailable(error)) {
        return res.status(503).json({ message: dbUnavailableMessage() });
    }
    return res.status(500).json({ message: error.message });
}

const generateToken = (id) => {
    return jwt.sign({ id: String(id) }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const isMockMongo = () => process.env.MOCK_MONGO === 'true';

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const MFA_EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
const MFA_EMAIL_OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const MFA_EMAIL_OTP_MAX_ATTEMPTS = 5;

function hashResetToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function hashEmailOtp(code) {
    return crypto.createHash('sha256').update(String(code)).digest('hex');
}

const QR_OPTIONS = {
    errorCorrectionLevel: 'H',
    margin: 2,
    scale: 8,
    color: {
        dark: '#000000',
        light: '#FFFFFF',
    },
};

function createPasswordResetToken() {
    const plainToken = crypto.randomBytes(32).toString('hex');
    return {
        plainToken,
        hashedToken: hashResetToken(plainToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    };
}

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function escapeRegex(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateEmailOtpCode() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function maskEmail(email) {
    const text = String(email || '');
    const [localPart, domainPart] = text.split('@');
    if (!localPart || !domainPart) return text;
    if (localPart.length <= 2) return `${localPart[0] || '*'}*@${domainPart}`;
    return `${localPart[0]}${'*'.repeat(Math.max(1, localPart.length - 2))}${localPart[localPart.length - 1]}@${domainPart}`;
}

function buildMfaRequiredPayload(user) {
    const emailOtpAvailable = isSmtpConfigured();
    return {
        mfaRequired: true,
        email: user.email,
        userId: user._id,
        emailMasked: maskEmail(user.email),
        mfaMethods: emailOtpAvailable ? ['authenticator', 'email'] : ['authenticator'],
        emailOtpAvailable,
    };
}

function isWithinMs(dateValue, durationMs) {
    if (!dateValue) return false;
    const t = new Date(dateValue).getTime();
    if (Number.isNaN(t)) return false;
    return Date.now() - t < durationMs;
}

const registerUser = async (req, res) => {
    if (isMockMongo()) {
        const mockStore = require('../utils/mockAuthStore');
        const { name, email, password } = req.body;
        try {
            const userExists = mockStore.findByEmail(email);
            if (userExists) {
                return res.status(400).json({ message: 'User already exists' });
            }
            const user = await mockStore.createUser({ name, email, password });
            if (!user) {
                return res.status(400).json({ message: 'Invalid user data' });
            }
            await securityService.logAction(user._id, 'LOGIN_SUCCESS', req, 'Zero-Trust Vault Initialized');
            return res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    const { name, email, password } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
            vaultSalt: crypto.randomBytes(16).toString('hex'),
            vaultSecret: crypto.randomBytes(32).toString('hex'),
        });

        await securityService.logAction(user._id, 'LOGIN_SUCCESS', req, 'Zero-Trust Vault Initialized');

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        sendAuthError(res, error);
    }
};

const loginUser = async (req, res) => {
    if (isMockMongo()) {
        const mockStore = require('../utils/mockAuthStore');
        const { email, password } = req.body;
        try {
            const user = mockStore.findByEmail(email);
            if (user && (await mockStore.comparePassword(user, password))) {
                if (user.twoFactorEnabled) {
                    return res.json(buildMfaRequiredPayload(user));
                }
                await securityService.logAction(user._id, 'LOGIN_SUCCESS', req);
                return res.json({
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user._id),
                });
            }
            if (user) await securityService.logAction(user._id, 'LOGIN_FAILURE', req);
            const devHint =
                !user && process.env.NODE_ENV !== 'production'
                    ? 'User not found. If MOCK_MONGO is enabled, register this account first.'
                    : 'Invalid email or password';
            return res.status(401).json({ message: devHint });
        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            if (user.twoFactorEnabled) {
                return res.json(buildMfaRequiredPayload(user));
            }

            await securityService.logAction(user._id, 'LOGIN_SUCCESS', req);

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            if (user) await securityService.logAction(user._id, 'LOGIN_FAILURE', req);
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        sendAuthError(res, error);
    }
};

const setup2FA = async (req, res) => {
    if (isMockMongo()) {
        const mockStore = require('../utils/mockAuthStore');
        try {
            const user = mockStore.findById(req.user._id);
            if (!user) return res.status(404).json({ message: 'User not found' });
            const qrcode = require('qrcode');

            const secret = generateSecret();
            const otpauth = generateURI({
                issuer: 'Cloudescurity',
                label: user.email,
                secret,
            });
            const qrCodeUrl = await qrcode.toDataURL(otpauth, QR_OPTIONS);

            mockStore.updateUser(req.user._id, { twoFactorSecret: secret });

            return res.json({ qrCodeUrl, secret });
        } catch (error) {
            return sendAuthError(res, error);
        }
    }

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: dbUnavailableMessage() });
        }
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const qrcode = require('qrcode');

        const secret = generateSecret();
        const otpauth = generateURI({
            issuer: 'Cloudescurity',
            label: user.email,
            secret,
        });
        const qrCodeUrl = await qrcode.toDataURL(otpauth, QR_OPTIONS);

        user.twoFactorSecret = secret;
        await user.save();

        res.json({ qrCodeUrl, secret });
    } catch (error) {
        sendAuthError(res, error);
    }
};

const enable2FA = async (req, res) => {
    const rawToken = req.body?.token;
    const token = rawToken != null ? String(rawToken).replace(/\s/g, '') : '';

    if (isMockMongo()) {
        const mockStore = require('../utils/mockAuthStore');
        try {
            const user = mockStore.findById(req.user._id);
            if (!user) return res.status(404).json({ message: 'User not found' });
            if (!user.twoFactorSecret) {
                return res.status(400).json({ message: 'Complete 2FA setup first' });
            }
            if (!/^\d{6}$/.test(token)) {
                return res.status(400).json({ message: 'Enter a valid 6-digit code' });
            }

            let isValid = false;
            try {
                ({ valid: isValid } = verifySync({ token, secret: user.twoFactorSecret }));
            } catch (_) {
                return res.status(400).json({ message: 'Invalid or expired verification code' });
            }
            if (!isValid) return res.status(400).json({ message: 'Invalid token' });

            mockStore.updateUser(req.user._id, { twoFactorEnabled: true });

            await securityService.logAction(user._id, '2FA_ENABLED', req);

            return res.json({ message: '2FA enabled successfully' });
        } catch (error) {
            return sendAuthError(res, error);
        }
    }

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: dbUnavailableMessage() });
        }
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!user.twoFactorSecret) {
            return res.status(400).json({ message: 'Complete 2FA setup first' });
        }
        if (!/^\d{6}$/.test(token)) {
            return res.status(400).json({ message: 'Enter a valid 6-digit code' });
        }

        let isValid = false;
        try {
            ({ valid: isValid } = verifySync({ token, secret: user.twoFactorSecret }));
        } catch (_) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }
        if (!isValid) return res.status(400).json({ message: 'Invalid token' });

        user.twoFactorEnabled = true;
        await user.save();

        await securityService.logAction(user._id, '2FA_ENABLED', req);

        res.json({ message: '2FA enabled successfully' });
    } catch (error) {
        sendAuthError(res, error);
    }
};

const requestEmailMfaCode = async (req, res) => {
    const { userId } = req.body || {};

    if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
    }
    if (!isSmtpConfigured()) {
        return res.status(503).json({ message: 'SMTP is not configured for email OTP' });
    }

    if (isMockMongo()) {
        const mockStore = require('../utils/mockAuthStore');
        try {
            const user = mockStore.findById(userId);
            if (!user) return res.status(404).json({ message: 'User not found' });
            if (!user.twoFactorEnabled) {
                return res.status(400).json({ message: '2FA is not configured for this account' });
            }
            if (isWithinMs(user.mfaEmailOtpLastSentAt, MFA_EMAIL_OTP_RESEND_COOLDOWN_MS)) {
                return res.status(429).json({ message: 'Please wait before requesting another code' });
            }

            const code = generateEmailOtpCode();
            const expiresAt = new Date(Date.now() + MFA_EMAIL_OTP_TTL_MS);

            mockStore.updateUser(user._id, {
                mfaEmailOtpHash: hashEmailOtp(code),
                mfaEmailOtpExpires: expiresAt,
                mfaEmailOtpLastSentAt: new Date(),
                mfaEmailOtpAttempts: 0,
            });

            await sendLoginOtpEmail({
                to: user.email,
                code,
                displayName: user.name,
                expiresInMinutes: Math.floor(MFA_EMAIL_OTP_TTL_MS / 60000),
            });

            return res.json({ message: `Verification code sent to ${maskEmail(user.email)}` });
        } catch (error) {
            return sendAuthError(res, error);
        }
    }

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: dbUnavailableMessage() });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!user.twoFactorEnabled) {
            return res.status(400).json({ message: '2FA is not configured for this account' });
        }
        if (isWithinMs(user.mfaEmailOtpLastSentAt, MFA_EMAIL_OTP_RESEND_COOLDOWN_MS)) {
            return res.status(429).json({ message: 'Please wait before requesting another code' });
        }

        const code = generateEmailOtpCode();
        user.mfaEmailOtpHash = hashEmailOtp(code);
        user.mfaEmailOtpExpires = new Date(Date.now() + MFA_EMAIL_OTP_TTL_MS);
        user.mfaEmailOtpLastSentAt = new Date();
        user.mfaEmailOtpAttempts = 0;
        await user.save({ validateBeforeSave: false });

        await sendLoginOtpEmail({
            to: user.email,
            code,
            displayName: user.name,
            expiresInMinutes: Math.floor(MFA_EMAIL_OTP_TTL_MS / 60000),
        });

        return res.json({ message: `Verification code sent to ${maskEmail(user.email)}` });
    } catch (error) {
        return sendAuthError(res, error);
    }
};

const verify2FALogin = async (req, res) => {
    const rawToken = req.body?.token;
    const token = rawToken != null ? String(rawToken).replace(/\s/g, '') : '';
    const method = String(req.body?.method || 'authenticator').toLowerCase();
    const { userId } = req.body || {};

    if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
    }
    if (!['authenticator', 'email'].includes(method)) {
        return res.status(400).json({ message: 'Invalid MFA method' });
    }
    if (!/^\d{6}$/.test(token)) {
        return res.status(400).json({ message: 'Enter a valid 6-digit code' });
    }

    if (isMockMongo()) {
        const mockStore = require('../utils/mockAuthStore');
        try {
            const user = mockStore.findById(userId);
            if (!user) return res.status(404).json({ message: 'User not found' });
            if (!user.twoFactorEnabled) {
                return res.status(400).json({ message: '2FA is not configured for this account' });
            }

            if (method === 'email') {
                if (!user.mfaEmailOtpHash || !user.mfaEmailOtpExpires) {
                    return res.status(400).json({ message: 'Request an email verification code first' });
                }

                const expiresAtMs = new Date(user.mfaEmailOtpExpires).getTime();
                if (Number.isNaN(expiresAtMs) || Date.now() > expiresAtMs) {
                    mockStore.updateUser(user._id, {
                        mfaEmailOtpHash: undefined,
                        mfaEmailOtpExpires: undefined,
                        mfaEmailOtpAttempts: 0,
                    });
                    return res.status(400).json({ message: 'Email verification code expired. Request a new code.' });
                }

                const currentAttempts = Number(user.mfaEmailOtpAttempts || 0);
                if (currentAttempts >= MFA_EMAIL_OTP_MAX_ATTEMPTS) {
                    return res.status(429).json({ message: 'Too many attempts. Request a new email code.' });
                }

                if (hashEmailOtp(token) !== user.mfaEmailOtpHash) {
                    mockStore.updateUser(user._id, { mfaEmailOtpAttempts: currentAttempts + 1 });
                    return res.status(400).json({ message: 'Invalid verification code' });
                }

                mockStore.updateUser(user._id, {
                    mfaEmailOtpHash: undefined,
                    mfaEmailOtpExpires: undefined,
                    mfaEmailOtpAttempts: 0,
                });
            } else {
                if (!user.twoFactorSecret) {
                    return res.status(400).json({ message: '2FA is not configured for this account' });
                }

                let isValid = false;
                try {
                    ({ valid: isValid } = verifySync({ token, secret: user.twoFactorSecret }));
                } catch (_) {
                    return res.status(400).json({ message: 'Invalid or expired verification code' });
                }

                if (!isValid) return res.status(400).json({ message: 'Invalid token' });
            }

            await securityService.logAction(user._id, 'LOGIN_SUCCESS', req, '2FA Verified');

            return res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } catch (error) {
            return sendAuthError(res, error);
        }
    }

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: dbUnavailableMessage() });
        }
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (!user.twoFactorEnabled) {
            return res.status(400).json({ message: '2FA is not configured for this account' });
        }

        if (method === 'email') {
            if (!user.mfaEmailOtpHash || !user.mfaEmailOtpExpires) {
                return res.status(400).json({ message: 'Request an email verification code first' });
            }

            const expiresAtMs = new Date(user.mfaEmailOtpExpires).getTime();
            if (Number.isNaN(expiresAtMs) || Date.now() > expiresAtMs) {
                user.mfaEmailOtpHash = undefined;
                user.mfaEmailOtpExpires = undefined;
                user.mfaEmailOtpAttempts = 0;
                await user.save({ validateBeforeSave: false });
                return res.status(400).json({ message: 'Email verification code expired. Request a new code.' });
            }

            const currentAttempts = Number(user.mfaEmailOtpAttempts || 0);
            if (currentAttempts >= MFA_EMAIL_OTP_MAX_ATTEMPTS) {
                return res.status(429).json({ message: 'Too many attempts. Request a new email code.' });
            }

            if (hashEmailOtp(token) !== user.mfaEmailOtpHash) {
                user.mfaEmailOtpAttempts = currentAttempts + 1;
                await user.save({ validateBeforeSave: false });
                return res.status(400).json({ message: 'Invalid verification code' });
            }

            user.mfaEmailOtpHash = undefined;
            user.mfaEmailOtpExpires = undefined;
            user.mfaEmailOtpAttempts = 0;
            await user.save({ validateBeforeSave: false });
        } else {
            if (!user.twoFactorSecret) {
                return res.status(400).json({ message: '2FA is not configured for this account' });
            }

            let isValid = false;
            try {
                ({ valid: isValid } = verifySync({ token, secret: user.twoFactorSecret }));
            } catch (_) {
                return res.status(400).json({ message: 'Invalid or expired verification code' });
            }

            if (!isValid) return res.status(400).json({ message: 'Invalid token' });
        }

        await securityService.logAction(user._id, 'LOGIN_SUCCESS', req, '2FA Verified');

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } catch (error) {
        sendAuthError(res, error);
    }
};

const disable2FA = async (req, res) => {
    if (isMockMongo()) {
        const mockStore = require('../utils/mockAuthStore');
        try {
            const user = mockStore.findById(req.user._id);
            if (!user) return res.status(404).json({ message: 'User not found' });
            mockStore.updateUser(req.user._id, {
                twoFactorEnabled: false,
                twoFactorSecret: undefined,
                mfaEmailOtpHash: undefined,
                mfaEmailOtpExpires: undefined,
                mfaEmailOtpLastSentAt: undefined,
                mfaEmailOtpAttempts: 0,
            });
            return res.json({ message: '2FA disabled' });
        } catch (error) {
            return sendAuthError(res, error);
        }
    }

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: dbUnavailableMessage() });
        }
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined;
        user.mfaEmailOtpHash = undefined;
        user.mfaEmailOtpExpires = undefined;
        user.mfaEmailOtpLastSentAt = undefined;
        user.mfaEmailOtpAttempts = 0;
        await user.save();
        res.json({ message: '2FA disabled' });
    } catch (error) {
        sendAuthError(res, error);
    }
};

const getUserProfile = async (req, res) => {
    if (isMockMongo()) {
        const mockStore = require('../utils/mockAuthStore');
        const user = mockStore.findById(req.user._id);
        if (user) {
            return res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                twoFactorEnabled: user.twoFactorEnabled,
                storageUsed: user.storageUsed,
                totalStorageLimit: user.totalStorageLimit,
            });
        }
        return res.status(404).json({ message: 'User not found' });
    }

    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                twoFactorEnabled: user.twoFactorEnabled,
                storageUsed: user.storageUsed,
                totalStorageLimit: user.totalStorageLimit,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        if (isMongoUnavailable(error)) {
            return res.status(503).json({ message: dbUnavailableMessage() });
        }
        res.status(500).json({ message: error.message });
    }
};

const forgotPassword = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    const genericMessage = 'If an account with that email exists, a reset link has been sent.';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (isMockMongo()) {
        const mockStore = require('../utils/mockAuthStore');
        const user = mockStore.findByEmail(email);
        if (!user) {
            return res.json({ message: genericMessage });
        }

        const tokenRecord = createPasswordResetToken();
        mockStore.updateUser(user._id, {
            passwordResetToken: tokenRecord.hashedToken,
            passwordResetExpires: tokenRecord.expiresAt,
        });

        const resetUrl = `${frontendUrl}/auth/reset-password?token=${tokenRecord.plainToken}&email=${encodeURIComponent(user.email)}`;

        try {
            await sendPasswordResetEmail({
                to: user.email,
                resetUrl,
                displayName: user.name,
            });
            await securityService.logAction(user._id, 'PASSWORD_RESET_REQUEST', req);
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                await securityService.logAction(user._id, 'PASSWORD_RESET_REQUEST', req, 'SMTP unavailable in dev fallback');
                return res.json({
                    message: `${genericMessage} (dev fallback: email not sent)`,
                    devResetToken: tokenRecord.plainToken,
                });
            }
            mockStore.updateUser(user._id, {
                passwordResetToken: undefined,
                passwordResetExpires: undefined,
            });
            return res.status(500).json({ message: `Failed to send reset email: ${error.message}` });
        }

        return res.json({
            message: genericMessage,
            devResetToken: process.env.NODE_ENV !== 'production' ? tokenRecord.plainToken : undefined,
        });
    }

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: dbUnavailableMessage() });
        }

        const emailRegex = new RegExp(`^${escapeRegex(email)}$`, 'i');
        const user = await User.findOne({ email: emailRegex });
        if (!user) {
            return res.json({ message: genericMessage });
        }

        const tokenRecord = createPasswordResetToken();
        user.passwordResetToken = tokenRecord.hashedToken;
        user.passwordResetExpires = tokenRecord.expiresAt;
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${frontendUrl}/auth/reset-password?token=${tokenRecord.plainToken}&email=${encodeURIComponent(user.email)}`;

        try {
            await sendPasswordResetEmail({
                to: user.email,
                resetUrl,
                displayName: user.name,
            });
            await securityService.logAction(user._id, 'PASSWORD_RESET_REQUEST', req);
        } catch (error) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            return res.status(500).json({ message: `Failed to send reset email: ${error.message}` });
        }

        return res.json({ message: genericMessage });
    } catch (error) {
        return sendAuthError(res, error);
    }
};

const resetPassword = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const token = String(req.body?.token || '').trim();
    const nextPassword = String(req.body?.password || '');

    if (!email || !token || !nextPassword) {
        return res.status(400).json({ message: 'Email, token, and password are required' });
    }

    if (nextPassword.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const hashedToken = hashResetToken(token);

    if (isMockMongo()) {
        const mockStore = require('../utils/mockAuthStore');
        const user = mockStore.findByEmail(email);
        const notMatch =
            !user ||
            !user.passwordResetToken ||
            user.passwordResetToken !== hashedToken ||
            !user.passwordResetExpires ||
            new Date(user.passwordResetExpires).getTime() < Date.now();

        if (notMatch) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        await mockStore.setPassword(user._id, nextPassword);
        mockStore.updateUser(user._id, {
            passwordResetToken: undefined,
            passwordResetExpires: undefined,
        });
        await securityService.logAction(user._id, 'PASSWORD_RESET_SUCCESS', req);
        return res.json({ message: 'Password reset successful' });
    }

    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: dbUnavailableMessage() });
        }

        const emailRegex = new RegExp(`^${escapeRegex(email)}$`, 'i');
        const user = await User.findOne({
            email: emailRegex,
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: new Date() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        user.password = nextPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        await securityService.logAction(user._id, 'PASSWORD_RESET_SUCCESS', req);
        return res.json({ message: 'Password reset successful' });
    } catch (error) {
        return sendAuthError(res, error);
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    setup2FA,
    enable2FA,
    requestEmailMfaCode,
    verify2FALogin,
    disable2FA,
    forgotPassword,
    resetPassword,
};
