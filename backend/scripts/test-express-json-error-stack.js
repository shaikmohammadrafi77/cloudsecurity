/**
 * Minimal Express stack: verify JSON parse errors hit 4-arg middleware after express.json().
 * Run: node scripts/test-express-json-error-stack.js
 */
const express = require('express');
const http = require('http');

function isJsonBodyParseError(err) {
    if (!err) return false;
    if (err.type === 'entity.parse.failed' || err.type === 'entity.verify.failed') return true;
    const msg = String(err.message || '');
    if (/in JSON at position/i.test(msg)) return true;
    if (/Expected property name or/i.test(msg) && /in JSON/i.test(msg)) return true;
    const status = err.statusCode ?? err.status;
    if (status === 400) {
        return (
            /in JSON|JSON\.parse|invalid json/i.test(msg) ||
            /Unexpected token|Expected property|Unexpected end/i.test(msg)
        );
    }
    if (err.cause && typeof err.cause === 'object') {
        return isJsonBodyParseError(err.cause);
    }
    return false;
}

const app = express();
app.use(express.json());
app.use((err, req, res, next) => {
    if (isJsonBodyParseError(err)) {
        return res.status(400).json({ message: 'Invalid JSON in request body' });
    }
    next(err);
});
app.use((err, req, res, next) => {
    res.status(500).json({ message: 'Internal Server Error' });
});
app.post('/api/auth/register', (req, res) => res.json({ ok: true }));

const srv = app.listen(0, '127.0.0.1', () => {
    const port = srv.address().port;
    const body = '{not valid}';
    const req = http.request(
        {
            hostname: '127.0.0.1',
            port,
            path: '/api/auth/register',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
        },
        (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => {
                const ok = res.statusCode === 400 && d.includes('Invalid JSON');
                console.log(JSON.stringify({ statusCode: res.statusCode, body: d, pass: ok }));
                srv.close();
                process.exit(ok ? 0 : 1);
            });
        }
    );
    req.on('error', (e) => {
        console.error(e);
        process.exit(1);
    });
    req.end(body);
});
