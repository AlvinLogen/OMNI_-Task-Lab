const { executeQuery } = require('../connection');
const logger = require('../../utils/logger');

class UserQueries {
    async getAllUsers() { }
    async getUserById(userId) { }
    async getAllDepartments() { }
}

module.exports = new UserQueries();