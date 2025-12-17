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
        styleSrc: ["'self'","'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'","'data:'","'https:'"]
    }
}));

// Rate Limiting
server.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per WindowMS
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true, 
    legacyHeaders: true
}));

// CORS Configuration
server.use(cors({
    origin: process.env.FRONTEND_URL || `http://localhost:${PORT}`,
    credentials: true
}));

// Session Configuration
server.use(compression());
server.use(express.json({limit: '10mb'}));
server.use(express.urlencoded({extended: true, limit: '10mb'}));

// Routes
server.use('/', routes);

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
        console.log(`Server is running on http://localhost/:${PORT}`);
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            error_details: error
        });
    }
};

//  Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', async () => {
    await disconnectDB();
    process.exit(0);
});

startServer();

module.export = server;

