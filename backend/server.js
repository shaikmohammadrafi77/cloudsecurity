const express = require('express');
require('express-async-errors');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const logger = require('./src/utils/logger');

// Load environment variables
dotenv.config();

// Malformed JSON body → 400 (not 500). body-parser sets type entity.parse.failed; also match V8 SyntaxError text.
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

// Initialize app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*', // In production, restrict this to frontend URL
        methods: ['GET', 'POST'],
    },
});

// Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(globalLimiter);
app.use(helmet({
    crossOriginResourcePolicy: false,
}));
const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_FRONTEND_URL,
].filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.length === 0) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use((err, req, res, next) => {
    if (isJsonBodyParseError(err)) {
        return res.status(400).json({ message: 'Invalid JSON in request body' });
    }
    next(err);
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/files', require('./src/routes/fileRoutes'));
app.use('/api/folders', require('./src/routes/folderRoutes'));
app.use('/api/share', require('./src/routes/shareRoutes'));
app.use('/api/security', require('./src/routes/securityRoutes'));
app.use('/api', require('./src/routes/dashboard'));

// API Documentation (Swagger)
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./src/config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Root route
app.get('/', (req, res) => {
    res.send('Secure File Storage API is running...');
});

// Database connection
const PORT = process.env.PORT || 5000;

// Global Error Handler
app.use((err, req, res, next) => {
    if (isJsonBodyParseError(err)) {
        return res.status(400).json({ message: 'Invalid JSON in request body' });
    }
    logger.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    res.status(500).json({ message: 'Internal Server Error' });
});

const startServer = () => {
    server.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });
};

if (process.env.MOCK_MONGO === 'true') {
    logger.warn('MOCK_MONGO=true - skipping MongoDB connection and starting with in-memory mock storage');
    startServer();
} else {

mongoose
    .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 12_000,
    })
    .then(() => {
        logger.info('MongoDB connected');
        startServer();
    })
    .catch((err) => {
        logger.error('MongoDB connection error:', err);
        const explicitMock = process.env.MOCK_MONGO_ON_FAIL === 'true';
        const forbidDevFallback = process.env.MOCK_MONGO_ON_FAIL === 'false';
        const devAutoMock =
            !forbidDevFallback && process.env.NODE_ENV !== 'production';

        if (explicitMock || devAutoMock) {
            process.env.MOCK_MONGO = 'true';
            if (explicitMock) {
                logger.warn('MongoDB unavailable — MOCK_MONGO (MOCK_MONGO_ON_FAIL=true)');
            } else {
                logger.warn(
                    'MongoDB unavailable — dev MOCK_MONGO auto-fallback (set MOCK_MONGO_ON_FAIL=false to refuse start, or fix MONGODB_URI)'
                );
            }
            startServer();
        } else {
            logger.error(
                'MongoDB connection failed. Fix MONGODB_URI (Atlas: user/password, authSource=admin, IP allowlist) or set MOCK_MONGO_ON_FAIL=true.'
            );
            process.exit(1);
        }
    });
}
