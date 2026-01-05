require('dotenv').config();

const sql = require('mssql');
const logger = require('../utils/logger');
const { error } = require('console');

const config = {
    user: process.env.STG_DB_USR,
    password: process.env.STG_DB_PWD,
    database: process.env.STG_DB_NME,
    server: process.env.STG_DB_IP,
    pool: {
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
        trustServerCertificate: false,
        enableArithAbort: true,
        requestTimeout: 30000
    }
};

let pool;

// Create database connection 
const connectDB = async () => {
    try {
        pool = await sql.connect(config);
        logger.info(`Connected to SQL Server Database: ${config.database}`);
        return pool;
    } catch (error) {
        logger.error(`Connection to Database: ${config.database} failed`, error);
        throw error;   
    }
};

// Create database connection pool
const getPool = () => {

    if (!pool){
        throw new Error('Database not connected. Call connectDB first');
    }

    return pool;
};

// Execute SQL Queries with parameterized inputs
const executeQuery = async (query, parameters = {}) => {
    try {
        const pool = await getPool();
        const request = pool.request();

        // Escape each parameter
        Object.keys(parameters).forEach(key => {
            request.input(key, parameters[key])
        });

        // Query with parameters safely embedded
        const result = await request.query(query);

        if(process.env.NODE_ENV === 'development'){
            logger.debug('Query executed succesfully:', {
                query,
                parameters
            })
        }

        return result;
        
    } catch (error) {
        logger.error('Query execution failed:', {
            error: error.message,
            query,
            parameters
        });
        throw error;
    }
};

// Execute SQL Procedures with parameterized inputs
const executeProcedure = async(procedureName, parameters = {}) => {
    try {
        const pool = await getPool();
        const request = pool.request();

        // Escape Parameters in Procedure
        Object.keys(parameters).forEach(key => {
            request.input(key, parameters[key]);
        });

        const result = await request.execute(procedureName);

        return result;

    } catch (error) {
        logger.error('Procedure exeution failed', {
            error: error.message,
            procedureName, 
            parameters
        });
        throw error;
    }
};

// Disconnect from database gracefully
const disconnectDB = async () => {
    try {
        if(pool){
            await pool.close();
            logger.info(`Connection to database: ${config.database} closed`);
            pool = null;
        }
    } catch (error) {
        logger.error('Error closing database connection:', error);
        throw error;
    }
};

module.exports = {
    connectDB, 
    disconnectDB, 
    sql, 
    getPool,
    executeQuery,
    executeProcedure
};
