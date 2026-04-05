/**
 * Quick mock-mode 2FA flow check (run with server in MOCK_MONGO mode).
 * Usage: node scripts/e2e-mfa-flow.js [baseUrl]
 */
const { generateSync } = require('otplib');

const base = process.argv[2] || 'http://127.0.0.1:5001';
const email = `e2e_${Date.now()}@test.local`;
const password = 'Password123!';

async function main() {
    let r = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'E2E', email, password }),
    });
    let j = await r.json();
    if (!r.ok) throw new Error(`register ${r.status}: ${JSON.stringify(j)}`);
    const token = j.token;

    r = await fetch(`${base}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    j = await r.json();
    if (!r.ok) throw new Error(`profile ${r.status}: ${JSON.stringify(j)}`);
    if (j.twoFactorEnabled !== false) throw new Error(`expected twoFactorEnabled false, got ${j.twoFactorEnabled}`);

    r = await fetch(`${base}/api/auth/2fa/setup`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    j = await r.json();
    if (!r.ok) throw new Error(`setup ${r.status}: ${JSON.stringify(j)}`);
    if (!j.secret || !j.qrCodeUrl) throw new Error('setup missing secret or qrCodeUrl');

    const code = generateSync({ secret: j.secret });
    r = await fetch(`${base}/api/auth/2fa/enable`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: code }),
    });
    j = await r.json();
    if (!r.ok) throw new Error(`enable ${r.status}: ${JSON.stringify(j)}`);

    r = await fetch(`${base}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    j = await r.json();
    if (!r.ok) throw new Error(`profile2 ${r.status}: ${JSON.stringify(j)}`);
    if (j.twoFactorEnabled !== true) throw new Error(`expected twoFactorEnabled true, got ${j.twoFactorEnabled}`);

    r = await fetch(`${base}/api/auth/2fa/disable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    j = await r.json();
    if (!r.ok) throw new Error(`disable ${r.status}: ${JSON.stringify(j)}`);

    r = await fetch(`${base}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    j = await r.json();
    if (!r.ok) throw new Error(`profile3 ${r.status}: ${JSON.stringify(j)}`);
    if (j.twoFactorEnabled !== false) throw new Error(`expected twoFactorEnabled false after disable, got ${j.twoFactorEnabled}`);

    console.log('E2E MFA flow OK');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
