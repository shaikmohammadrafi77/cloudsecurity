const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

/** Only brute-force–sensitive POSTs; do not throttle /profile or 2FA setup (was causing false “API broken” in dev). */
const isDev = process.env.NODE_ENV !== 'production';

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: isDev ? 300 : 15,
    message: 'Too many signup attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: isDev ? 500 : 15,
    message: 'Too many login attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: isDev ? 300 : 10,
    message: 'Too many password reset requests. Please try again in 10 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

const resetPasswordLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: isDev ? 300 : 20,
    message: 'Too many password reset attempts. Please request a new reset link.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', registerLimiter, registerUser);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', loginLimiter, loginUser);

/**
 * @swagger
 * /api/auth/verify-mfa:
 *   post:
 *     summary: Verify MFA token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Verification successful
 */
router.post('/verify-mfa', loginLimiter, verify2FALogin);
router.post('/verify-mfa/email/request', loginLimiter, requestEmailMfaCode);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);

router.get('/profile', protect, getUserProfile);

// 2FA Routes (GET matches dashboard; POST supported for API clients)
router.get('/2fa/setup', protect, setup2FA);
router.post('/2fa/setup', protect, setup2FA);
router.post('/2fa/enable', protect, enable2FA);
router.post('/2fa/disable', protect, disable2FA);

module.exports = router;
