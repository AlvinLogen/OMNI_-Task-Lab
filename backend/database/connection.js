require('dotenv').config();

const sql = require('mssql');

const config = {
    user: process.env.STG_DB_USR,
    password: process.env.STG_DB_PWD,
    database: process.env.STG_DB_NME,
    server: process.env.STG_DB_IP,
    pool: {
        max: 10,
        min:0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
        trustServerCertificate: false
    }
};

let pool = null;

const connectDB = async () => {
    if (pool) return pool;
    pool = await sql.connect(config);
    console.log(`Connected to Database: ${config.database}`);
    return pool;
};

const getPool = () => pool;

const disconnectDB = async () => {
    if (pool) {
        await pool.close();
        pool = null;
    }
};

module.exports = {connectDB, disconnectDB, sql, getPool};
