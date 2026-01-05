const express = require('express');
const path = require('path');
const router = express.Router();

// Sub-Routes
const healthRoutes = require('./health-checks/health');
const swaggerRoutes = require('./api-docs/swagger');

// Serve static files (CSS, JS, images, etc.)
router.use(express.static(path.join(__dirname, '../../frontend/public')));

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