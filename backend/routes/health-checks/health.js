const express = require('express');
const router = express.Router();

// Database Connection Check
router.get('/db-health', async (req, res) => {
    const { getPool } = require('../../database/connection');

    try {
        const result = await getPool().request().query(
            `
            SELECT
                @@SERVERNAME AS ServerName, 
                DB_NAME() AS CurrentDatabase, 
                SYSTEM_USER AS ConnectedUser, 
                SYSDATETIME() AS CurrentTime;
            `
        );

        res.json({
            status: 'OK',
            database: 'Database Connected',
            info: result.recordset[0]
        });

    } catch (error) {
        res.status(503).json({
            status: 'error',
            error_details: error,
            database: 'disconnected'
        })
    }
});

module.exports = router;