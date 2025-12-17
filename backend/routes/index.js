const express = require('express');
const router = express.Router();

//Sub-Routes
const healthRoutes = require('./health-checks/health');

// Home Route
router.get('/', (req, res) => {
    res.send("Cape Union Mart OMNI Task Lab.");
});

// Mount Sub-Routes
router.use('/', healthRoutes);

module.exports = router;