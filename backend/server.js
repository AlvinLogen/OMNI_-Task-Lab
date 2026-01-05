const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const logger = require('./utils/logger');
const routes = require('./routes/index');
const { connectDB, disconnectDB } = require('./database/connection');

const server = express();
const PORT = process.env.PORT || 8080;

// Security Middleware
server.use(helmet({
    contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"]
    }
}));

// Rate Limiting
server.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true, 
    legacyHeaders: false
}));

// CORS Configuration
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5500',
    `http://localhost:${PORT}`
].filter(Boolean);

server.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Compression Configuration
server.use(compression());
server.use(express.json({limit: '10mb'}));
server.use(express.urlencoded({extended: true, limit: '10mb'}));

// Input validation error handling
server.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        logger.error('Invalid JSON payload:', err);
        return res.status(400).json({ 
            status: 'error', 
            message: 'Invalid JSON payload' 
        });
    }
    next(err);
});

// Routes
server.use('/', routes);

// Global Error Handler (must be last)
server.use((err, req, res, next) => {
    logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    res.status(err.status || 500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            logger.info(`OMNI Task Lab server running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV} || 'development`);
            console.log(`Server is running on http://localhost/${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

//  Handle graceful shutdown
process.on('SIGTERM', async () => {
    await disconnectDB();
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', async () => {
    await disconnectDB();
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

startServer();

module.exports = server;

