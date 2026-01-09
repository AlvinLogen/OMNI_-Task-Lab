const { executeQuery } = require('../connection');
const logger = require('../../utils/logger');
const { type } = require('os');

class DatabaseQueries {
    // Get all tasks with optional filters
    async getAllTasks(filters = {}) {
        try {
            let query = `
                SELECT t.*, a.app_name, a.app_type, s.server_name, s.server_env,
                u.first_name, u.last_name, u.email
                FROM tasks t
                LEFT JOIN application a ON t.app_id = a.app_id
                LEFT JOIN server s ON t.server_id = s.server_id
                LEFT JOIN users u ON t.user_id = u.user_id
                WHERE 1=1 
            `;

            const params = [];
            let paramIndex = 1; 

            if(filters.task_type){
                query += ` AND t.task_type = @param${paramIndex}`;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'NVarChar',
                    value: filters.task_type
                });
                paramIndex++;
            }

            if(filters.task_status){
                query += ` AND t.task_status = @param${paramIndex}`;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'NVarChar',
                    value: filters.task_status
                });
                paramIndex++;
            }

            if(filters.app_id){
                query += ` AND t.app_id = @param${paramIndex}`;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'Int',
                    value: filters.app_id
                });
                paramIndex++;
            }

            if(filters.server_id){
                query += ` AND t.server_id = @param${paramIndex}`;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'Int',
                    value: filters.server_id
                });
                paramIndex++;
            }

            query += ` ORDER BY t.created_at DESC`;

            const result = await executeQuery(query, params);
            return result.recordset;

        } catch (error) {
            logger.error('Error in getAllTasks', error);
            throw error;
        }
    }


    // Get single task by ID



    // Create new task



    // Update a single task


    // Delete a task


    // Get task execution history

}

module.exports = DatabaseQueries();