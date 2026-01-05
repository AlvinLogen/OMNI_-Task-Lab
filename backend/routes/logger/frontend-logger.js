const express = require('express');
const router = express.Router();
const { frontendLogger } = require('../../utils/logger');

// Frontend logging endpoint
router.post('/api/logs/frontend', (req, res) => {
    try {
        const { level, message, meta } = req.body;

        // Validate log level
        const validLevels = ['error', 'warn', 'info', 'debug'];
        const logLevel = validLevels.includes(level) ? level : 'info';

        // Log with appropriate level
        frontendLogger.log(logLevel, message, {
            ...meta,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        res.status(200).json({
            status: 'success',
            message: 'Log recorded'
        });
    } catch (error) {
        // Don't use logger here to avoid infinite loop
        console.error('Frontend logging error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to log'
        });
    }
});

module.exports = router;
