const nodemailer = require('nodemailer');

let cachedTransporter = null;

function getSmtpConfig() {
    const host = process.env.SMTP_HOST || '';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || '';
    const rawPass = process.env.SMTP_PASS || '';
    const pass = rawPass.replace(/\s+/g, '');
    const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

    return {
        host,
        port,
        secure,
        auth: {
            user,
            pass,
        },
    };
}

function isSmtpConfigured() {
    const cfg = getSmtpConfig();
    return Boolean(cfg.host && cfg.port && cfg.auth.user && cfg.auth.pass);
}

function getTransporter() {
    if (cachedTransporter) {
        return cachedTransporter;
    }

    const cfg = getSmtpConfig();
    cachedTransporter = nodemailer.createTransport(cfg);
    return cachedTransporter;
}

async function sendPasswordResetEmail({ to, resetUrl, displayName }) {
    if (!isSmtpConfigured()) {
        throw new Error('SMTP is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS in backend/.env');
    }

    const fromName = process.env.SMTP_FROM_NAME || 'Cloudescurity';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

    const transporter = getTransporter();

    const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;line-height:1.5">
            <h2 style="margin-bottom:8px">Reset your password</h2>
            <p>Hello ${displayName || 'there'},</p>
            <p>We received a request to reset your Cloudescurity password.</p>
            <p style="margin:24px 0">
                <a href="${resetUrl}" style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;display:inline-block;font-weight:600">
                    Reset Password
                </a>
            </p>
            <p>If the button does not work, copy and paste this URL:</p>
            <p style="word-break:break-all;color:#475569">${resetUrl}</p>
            <p>This link expires in 30 minutes.</p>
            <p>If you did not request this, you can safely ignore this email.</p>
        </div>
    `;

    await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: 'Reset your Cloudescurity password',
        html,
    });
}

module.exports = {
    isSmtpConfigured,
    sendPasswordResetEmail,
};

