// Quick test script to verify logging configuration
const { logger, databaseLogger, apiLogger } = require('./utils/logger');

console.log('Testing logging system...\n');

// Test general logger
logger.info('General logger test - INFO level');
logger.warn('General logger test - WARN level');
logger.error('General logger test - ERROR level');
logger.debug('General logger test - DEBUG level');

// Test database logger
databaseLogger.info('Database logger test - Query executed', {
    query: 'SELECT * FROM users',
    duration: '45ms',
    rows: 150
});

// Test API logger
apiLogger.info('API logger test - Request received', {
    method: 'GET',
    url: '/api/tasks',
    statusCode: 200,
    duration: '120ms'
});

console.log('\nLogging test complete!');
console.log('Check the following directories:');
console.log('- backend/logs/backend/ for backend logs');
console.log('- backend/logs/frontend/ for frontend logs');
console.log('\nLog files should be created with date stamps (e.g., combined-2026-01-05.log)');
