# Cloudescurity Sample Code Documentation

This document explains how the sample code in this repository works, how to run it, and how the main security and file flows are implemented.

## 1. What This Sample Demonstrates

- Secure authentication with JWT and optional TOTP 2FA
- Encrypted file upload/download (AES-256-CBC and AES-256-GCM)
- Folder and trash workflows
- Share links with optional password, expiration, and download limits
- Security logging and dashboard stats
- Local fallback mode when MongoDB is unavailable

## 2. Project Layout

```text
cloud/
  backend/      Express API, Mongo models, security/encryption logic
  frontend/     Next.js App Router UI
  DOC/Human/    Human-readable project docs and diagrams
```

Key backend files:
- `backend/server.js` - app bootstrap, middleware, routes, Mongo/mock startup
- `backend/src/routes/*.js` - API route definitions
- `backend/src/controllers/*.js` - request handlers
- `backend/src/services/encryptionService.js` - encryption/decryption primitives
- `backend/src/services/fileService.js` - S3 + metadata upload/delete behavior

Key frontend files:
- `frontend/services/api.js` - Axios client with JWT interceptor
- `frontend/components/files/FileExplorer.tsx` - file/folder UX and API calls
- `frontend/app/auth/*` - auth, MFA, forgot/reset password screens
- `frontend/app/share/[id]/page.tsx` - shared-file access page

## 3. Run Locally

Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
npm install
```

Run both services from repo root:

```bash
npm start
```

Or run separately:

```bash
cd backend && npm start
cd frontend && npm run dev
```

## 4. Required Environment Variables

Set `backend/.env` at minimum:

```env
PORT=5000
MONGODB_URI=...
JWT_SECRET=...
ENCRYPTION_KEY=YOUR_32_CHARACTER_STRING
ENCRYPTION_ALGORITHM=aes-256-cbc
FRONTEND_URL=http://localhost:3000

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=...

SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM_NAME=Cloudescurity
SMTP_FROM_EMAIL=...
```

Optional frontend env (`frontend/.env.production` or `.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

## 5. Backend Request Flow (Sample Walkthrough)

1. `server.js` applies middleware:
- rate limit
- `helmet`
- CORS
- `express.json()`
- JSON parse error mapping to HTTP 400

2. Routes are mounted under `/api/*`:
- `/api/auth`
- `/api/files`
- `/api/folders`
- `/api/share`
- `/api/security`
- `/api/stats` (via dashboard route module)

3. Protected routes use `protect` middleware:
- Reads `Authorization: Bearer <token>`
- Verifies JWT using `JWT_SECRET`
- Loads user from MongoDB (or mock store in mock mode)

4. File upload path:
- `multer` reads file into memory (`/files/upload`)
- `fileController.uploadFile` derives a vault key
- `fileService.uploadFile` encrypts data then uploads to S3
- Metadata (IV/algorithm/authTag) is saved for later decryption

5. File download path:
- File metadata is resolved by owner + file id
- Encrypted blob is fetched (S3 or mock memory store)
- Decryption uses stored IV/algorithm (+ auth tag for GCM)
- Original bytes are returned as attachment

## 6. API Quick Reference With Examples

Base URL: `http://localhost:5000/api`

### Auth

Register:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Demo User\",\"email\":\"demo@example.com\",\"password\":\"Password123!\"}"
```

Login:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"demo@example.com\",\"password\":\"Password123!\"}"
```

If 2FA is enabled, login returns `mfaRequired: true`; then verify:

```bash
curl -X POST http://localhost:5000/api/auth/verify-mfa \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"<userId>\",\"token\":\"123456\"}"
```

### Files

Upload:

```bash
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@./example.pdf" \
  -F "encryptionAlgorithm=aes-256-gcm"
```

List:

```bash
curl -H "Authorization: Bearer <JWT>" \
  "http://localhost:5000/api/files?trashed=false"
```

Download:

```bash
curl -L -H "Authorization: Bearer <JWT>" \
  "http://localhost:5000/api/files/<fileId>" \
  --output downloaded.bin
```

### Folders

Create folder:

```bash
curl -X POST http://localhost:5000/api/folders \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Reports\",\"parentFolderId\":null}"
```

### Share Links

Create:

```bash
curl -X POST http://localhost:5000/api/share/create \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d "{\"fileId\":\"<fileId>\",\"password\":\"optional\",\"maxDownloads\":3}"
```

Access shared file:

```bash
curl -X POST http://localhost:5000/api/share/access/<token> \
  -H "Content-Type: application/json" \
  -d "{\"password\":\"optional\"}" \
  --output shared-download.bin
```

## 7. Frontend Integration Pattern

Frontend uses `frontend/services/api.js`:
- sets `baseURL` from `NEXT_PUBLIC_API_URL`
- reads `user` from `localStorage`
- auto-attaches `Authorization: Bearer <token>` for authenticated calls

Primary file manager UI (`FileExplorer.tsx`) uses:
- `GET /files` + `GET /folders` for mixed listing
- `POST /files/upload` for encrypted upload
- `PATCH /files/:id` and `PATCH /folders/:id` for rename/move
- share modal via `POST /share/create`

## 8. Security Notes in This Sample

- Passwords are hashed with `bcryptjs`
- JWT sessions expire in 30 days (`authController.generateToken`)
- 2FA uses `otplib` with QR generation
- Encryption supports:
  - `aes-256-cbc` (default)
  - `aes-256-gcm` (stores auth tag for integrity)
- Vault key derivation uses PBKDF2 from user-specific secret + salt

## 9. Mock/Offline Behavior

- If MongoDB is unavailable and `MOCK_MONGO_ON_FAIL=true`, server can auto-switch to mock mode.
- Mock mode uses in-memory stores (`mockAuthStore`, `mockStorageStore`) for development flows.
- Data in mock mode is not persistent and resets on server restart.

## 10. Testing Scripts

From `backend/`:

```bash
npm run test:e2e-mfa
node scripts/test-express-json-error-stack.js
```

From `frontend/`:

```bash
npm run lint
npm run build
```

## 11. Swagger API Docs

When backend is running, open:

`http://localhost:5000/api-docs`

Swagger configuration is defined in `backend/src/config/swagger.js`.

## 12. 4.5 SAMPLE CODE

### Backend (`server.js`) - Basic Startup Sample

```js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('Database Connected'))
    .catch((err) => console.log(err));

app.get('/', (req, res) => {
    res.send('Server Running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

### Backend (`routes/fileRoutes.js`) - Protected File Routes Sample

```js
const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth');
const { uploadFile, listFiles, downloadFile } = require('../controllers/fileController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/', listFiles);
router.get('/:id', downloadFile);

module.exports = router;
```

### Backend (`middleware/auth.js`) - JWT Protection Sample

```js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'User no longer exists' });
            }

            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };
```

### Backend (`controllers/authController.js`) - Login With Optional 2FA Sample

```js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id: String(id) }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
        if (user.twoFactorEnabled) {
            return res.json({
                mfaRequired: true,
                email: user.email,
                userId: user._id,
            });
        }

        return res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    }

    return res.status(401).json({ message: 'Invalid email or password' });
};

module.exports = { loginUser };
```

### Backend (`services/encryptionService.js`) - AES-256 Encrypt/Decrypt Sample

```js
const crypto = require('crypto');

const encrypt = (buffer, key) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    const encryptedData = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData };
};

const decrypt = (encryptedBuffer, ivHex, key) => {
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
};

module.exports = { encrypt, decrypt };
```

### Backend (`models/User.js`) - User Schema Sample

```js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    storageUsed: { type: Number, default: 0 },
    totalStorageLimit: { type: Number, default: 1024 * 1024 * 100 },
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

### Backend (`controllers/shareController.js`) - Share Link Creation Sample

```js
const ShareLink = require('../models/ShareLink');
const File = require('../models/File');
const bcrypt = require('bcryptjs');

const createShareLink = async (req, res) => {
    const { fileId, password, expiresAt, maxDownloads } = req.body;

    const file = await File.findOne({ _id: fileId, owner: req.user._id });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const shareData = {
        file: fileId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxDownloads: maxDownloads || 0,
    };

    if (password) {
        shareData.passwordHash = await bcrypt.hash(password, 10);
    }

    const shareLink = await ShareLink.create(shareData);
    return res.status(201).json({
        token: shareLink.token,
        url: `${process.env.FRONTEND_URL}/share/${shareLink.token}`,
    });
};

module.exports = { createShareLink };
```

### Frontend (`services/api.js`) - Axios Client With Token Sample

```js
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('user');
        if (raw) {
            const user = JSON.parse(raw);
            if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
        }
    }
    return config;
});

export default api;
```

### Frontend (`app/auth/login/page.tsx`) - Login Form API Call Sample

```tsx
const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
        const { data } = await api.post('/auth/login', { email, password });

        if (data.mfaRequired) {
            setMfaRequired(true);
            setMfaUserId(data.userId);
            setLoading(false);
            return;
        }

        localStorage.setItem('user', JSON.stringify(data));
        router.push('/dashboard');
    } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || 'Login failed');
    } finally {
        setLoading(false);
    }
};
```

### Frontend (`components/files/FileExplorer.tsx`) - File Upload Sample

```tsx
const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('encryptionAlgorithm', selectedEncryptionAlgorithm);

    if (currentFolderId) {
        formData.append('folderId', currentFolderId);
    }

    try {
        await api.post('/files/upload', formData);
        fetchItems();
    } catch (error: any) {
        setErrorMessage(error?.response?.data?.message || 'Upload failed');
    }
};
```

### Frontend (`app/share/[id]/page.tsx`) - Shared File Access Sample

```tsx
const handleAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
        const response = await api.post(
            `/share/access/${token}`,
            password.trim() ? { password: password.trim() } : {},
            { responseType: 'blob' }
        );

        const blobUrl = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'shared-file';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
        setError(err?.response?.data?.message || 'Unable to access shared file');
    } finally {
        setLoading(false);
    }
};
```
