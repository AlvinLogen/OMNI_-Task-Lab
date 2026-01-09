const taskQueries = require('./task-queries');
const applicationQueries = require('./application-queries');
const serverQueries = require('./server-queries');
const executionQueries = require('./execution-queries');
const userQueries = require('./user-queries');

module.exports = {
    tasks: taskQueries,
    applications: applicationQueries,
    servers: serverQueries,
    executions: executionQueries,
    users: userQueries
};