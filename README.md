# Cloudescurity

Secure, full-stack file storage with modern encryption, sharing, and auditing. Cloudescurity combines a Next.js dashboard with an Express API to deliver an end-to-end secure file vault experience.

## Features
- AES-256 file encryption (CBC + GCM support)
- Secure file upload, download, sharing, and trash
- Two-factor authentication (TOTP)
- Security activity logs + dashboard analytics
- Mock mode for local development without MongoDB
- SMTP-based password reset flow

## Tech Stack
- Frontend: Next.js (App Router), Tailwind CSS, Framer Motion
- Backend: Node.js, Express, Mongoose
- Storage: AWS S3 (with mock/offline fallback)
- Auth: JWT + TOTP (otplib)

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB (optional if using mock mode)
- AWS S3 (optional if using mock mode)

### Install
```
cd backend
npm install
cd ../frontend
npm install
```

### Environment Variables
Create `backend/.env`:
```
PORT=5000
MONGODB_URI=YOUR_MONGODB_URI
MOCK_MONGO_ON_FAIL=true
JWT_SECRET=YOUR_JWT_SECRET
ENCRYPTION_KEY=YOUR_32_CHAR_KEY
ENCRYPTION_ALGORITHM=aes-256-cbc
AWS_ACCESS_KEY_ID=YOUR_AWS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET
AWS_REGION=us-east-1
AWS_S3_BUCKET=YOUR_BUCKET
FRONTEND_URL=http://localhost:3000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=YOUR_EMAIL
SMTP_PASS=YOUR_APP_PASSWORD
SMTP_FROM_NAME=Cloudescurity
SMTP_FROM_EMAIL=YOUR_EMAIL
```

Create `frontend/.env.production` (optional for production builds):
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

## Run Locally
Start backend:
```
cd backend
npm start
```

Start frontend:
```
cd frontend
npm run dev
```

Open the app at `http://localhost:3000`.

## Useful Scripts
Backend:
```
npm run test:e2e-mfa
```

Frontend:
```
npm run lint
npm run build
```

## Notes
- Mock mode: if MongoDB is unavailable and `MOCK_MONGO_ON_FAIL=true`, the API starts with in-memory auth/storage for local testing.
- AES-256-GCM uploads store an auth tag for verified decryption; CBC remains the default for backward compatibility.

## Deployment
For EC2 or Linux deployments, configure `backend/.env` and run the backend + frontend as systemd services. If you want, I can provide Nginx + HTTPS deployment scripts too.
