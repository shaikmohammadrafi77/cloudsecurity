const winston = require('winston');
require('winston-mongodb');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
    }));
}

// Optional: logs to Mongo (off by default — avoids extra connections/errors when DB is down or in mock mode)
if (process.env.MONGODB_URI && process.env.WINSTON_MONGO_LOG === 'true') {
    try {
        logger.add(new winston.transports.MongoDB({
            db: process.env.MONGODB_URI,
            collection: 'system_logs',
            level: 'info',
        }));
    } catch (e) {
        console.error('Winston MongoDB transport not started:', e.message);
    }
}

module.exports = logger;
