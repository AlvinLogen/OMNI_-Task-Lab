const { executeQuery } = require('../connection');
const logger = require('../../utils/logger');

class ServerQueries {
    async getAllServers(filters = {}) { }
    async getServerById(serverId) { }
    async getServerDrives(serverId) { }
    async getServerApplications(serverId) { }
}

module.exports = new ServerQueries();