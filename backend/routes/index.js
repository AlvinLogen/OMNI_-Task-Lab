const express = require('express');
const path = require('path');
const router = express.Router();

// Sub-Routes
const healthRoutes = require('./health-checks/health');
const swaggerRoutes = require('./api-docs/swagger');

// Serve static files (CSS, JS, images, etc.) with caching
router.use(express.static(path.join(__dirname, '../../frontend/public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Cache CSS and JS files for 1 day in production
        if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
        // Cache images for 7 days
        if (filePath.match(/\.(jpg|jpeg|png|gif|ico|svg)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=604800');
        }
    }
}));

// Serve landing page
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/index.html'));
});

// API Routes
router.get('/api', (req, res) => {
    res.json({
        name: "OMNI Task Lab API",
        version: "1.0.0",
        status: "active"
    });
});

// Mount Sub-Routes
router.use('/', healthRoutes);
router.use('/api/swagger', swaggerRoutes);

module.exports = router;