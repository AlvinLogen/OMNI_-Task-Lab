const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Create logs directories
const logsDir = path.join(__dirname, '../logs');
const backendLogsDir = path.join(logsDir, 'backend');
const frontendLogsDir = path.join(logsDir, 'frontend');

[logsDir, backendLogsDir, frontendLogsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Common log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Backend error logs with rotation
const backendErrorTransport = new DailyRotateFile({
    filename: path.join(backendLogsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '1m', // 1MB
    maxFiles: '30d', // Keep logs for 30 days
    zippedArchive: true, // Compress old logs
    format: logFormat
});

// Backend combined logs with rotation
const backendCombinedTransport = new DailyRotateFile({
    filename: path.join(backendLogsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '1m', // 1MB
    maxFiles: '30d', // Keep logs for 30 days
    zippedArchive: true,
    format: logFormat
});

// Backend database logs with rotation
const backendDatabaseTransport = new DailyRotateFile({
    filename: path.join(backendLogsDir, 'database-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'debug',
    maxSize: '1m',
    maxFiles: '30d',
    zippedArchive: true,
    format: logFormat
});

// Backend API logs with rotation
const backendApiTransport = new DailyRotateFile({
    filename: path.join(backendLogsDir, 'api-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '1m',
    maxFiles: '30d',
    zippedArchive: true,
    format: logFormat
});

// Frontend logs with rotation
const frontendTransport = new DailyRotateFile({
    filename: path.join(frontendLogsDir, 'frontend-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '1m',
    maxFiles: '30d',
    zippedArchive: true,
    format: logFormat
});

// Configure winston logger with rotation
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: {
        service: 'omni-task-lab-backend',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [
        backendErrorTransport,
        backendCombinedTransport,
        backendDatabaseTransport,
        backendApiTransport
    ]
});

// Console logging for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
        )
    }));
}

// Log rotation events
backendErrorTransport.on('rotate', (oldFilename, newFilename) => {
    logger.info('Backend error log rotated', { oldFilename, newFilename });
});

backendCombinedTransport.on('rotate', (oldFilename, newFilename) => {
    logger.info('Backend combined log rotated', { oldFilename, newFilename });
});

// Create separate logger for database operations
const databaseLogger = winston.createLogger({
    level: 'debug',
    format: logFormat,
    defaultMeta: {
        service: 'omni-task-lab-database',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [backendDatabaseTransport]
});

// Create separate logger for API operations
const apiLogger = winston.createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: {
        service: 'omni-task-lab-api',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [backendApiTransport]
});

// Create separate logger for frontend
const frontendLogger = winston.createLogger({
    level: 'info',
    format: logFormat,
    defaultMeta: {
        service: 'omni-task-lab-frontend',
        environment: process.env.NODE_ENV || 'development'
    },
    transports: [frontendTransport]
});

// Add console to all loggers in development
if (process.env.NODE_ENV !== 'production') {
    const consoleTransport = new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
                const metaStr = Object.keys(meta).length && Object.keys(meta).length < 5 
                    ? JSON.stringify(meta) 
                    : '';
                return `${timestamp} [${service}] [${level}]: ${message} ${metaStr}`;
            })
        )
    });
    
    databaseLogger.add(consoleTransport);
    apiLogger.add(consoleTransport);
    frontendLogger.add(consoleTransport);
}

module.exports = {
    logger,           // General backend logger
    databaseLogger,   // Database operations logger
    apiLogger,        // API requests logger
    frontendLogger    // Frontend events logger
};