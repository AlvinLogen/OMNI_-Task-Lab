const { executeQuery } = require('../connection');
const logger = require('../../utils/logger');

class TaskQueries {
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
    async getTaskById(taskId) {
        try {
            const query = `
                SELECT t.*, a.app_name, a.app_code, a.app_type, s.server_name, s.server_ip, s.server_env, u.first_name, u.last_name, u.email
                FROM tasks t
                LEFT JOIN application a ON t.app_id = a.app_id
                LEFT JOIN server s ON t.server_id = s.server_id
                LEFT JOIN users u ON t.user_id = u.user_id
                WHERE t.task_id = @taskId
            `;

            const params = [{
                name: 'taskId',
                type: 'Int',
                value: taskId
            }];

            const result = await executeQuery(query, params);
            return result.recordset[0];

        } catch (error) {
            logger.error('Error in getTaskById', error);
            throw error;
        }
    }

    // Create new task
    async createTask(taskData) {
        try {
            const query = `
                INSERT INTO tasks(task_name, task_desc, task_type, task_status, execution_type, app_id, server_id, parent_task_id, user_id, credential_id, 
                                  timeout_seconds, max_retries, retry_delay_seconds, task_config
                )
                VALUES(@task_name, @task_desc, @task_type, @task_status, @execution_type, @app_id, @server_id, @parent_task_id, @user_id, @credential_id, 
                       @timeout_seconds, @max_retries, @retry_delay_seconds, @task_config
                );
                SELECT SCOPE_IDENTITY() AS task_id;
            `;

            const params = [
                {name: 'task_name', type: 'NVarChar', value: taskData.task_name},
                {name: 'task_desc', type: 'NVarChar', value: taskData.task_desc || null},
                {name: 'task_type', type: 'NVarChar', value: taskData.task_type || 'User'},
                {name: 'task_status', type: 'NVarChar', value: taskData.task_status || 'New'},
                {name: 'execution_type', type: 'NVarChar', value: taskData.execution_type || 'Manual'},
                {name: 'app_id', type: 'NVarChar', value: taskData.app_id || null},
                {name: 'server_id', type: 'NVarChar', value: taskData.server_id || null},
                {name: 'parent_task_id', type: 'NVarChar', value: taskData.parent_task_id || null},
                {name: 'user_id', type: 'NVarChar', value: taskData.user_id || null},
                {name: 'credential_id', type: 'NVarChar', value: taskData.credential_id || null},
                {name: 'timeout_seconds', type: 'NVarChar', value: taskData.timeout_seconds || 300},
                {name: 'max_retries', type: 'NVarChar', value: taskData.max_retries || 3},
                {name: 'retry_delay_seconds', type: 'NVarChar', value: taskData.retry_delay_seconds || 60},
                {name: 'task_config', type: 'NVarChar', value: taskData.task_config ? JSON.stringify(taskData.task_config) : null}
            ];

            const result = await executeQuery(query, params);
            const taskId = result.recordset[0].task_id;
            logger.info(`Task created successfully:, ${taskId}`);
            return {task_id: taskId};

        } catch (error) {
            logger.error('Error in createTask', error);
            throw error;
        }
    }

    // Update a single task
    async updateTask(taskId, taskData) {
        try {

            const query = `
                UPDATE tasks
                SET 
                    task_name = @task_name,
                    task_desc = @task_desc,
                    task_type = @task_type,
                    task_status = @task_status,
                    execution_type = @execution_type,
                    app_id = @app_id,
                    server_id = @server_id, 
                    user_id = @user_id,
                    credential_id = @credential_id, 
                    timeout_seconds = @timeout_seconds,
                    max_retries = @max_retries,
                    retry_delay_seconds = @retry_delay_seconds,
                    task_config = @task_config,
                    updated_at = GETUTCDATE()
                WHERE task_id = @task_id
            `;
            
            const params = [
                {name: 'task_id', type: 'NVarChar', value: taskId},
                {name: 'task_name', type: 'NVarChar', value: taskData.task_name},
                {name: 'task_desc', type: 'NVarChar', value: taskData.task_desc || null},
                {name: 'task_type', type: 'NVarChar', value: taskData.task_type},
                {name: 'task_status', type: 'NVarChar', value: taskData.task_status},
                {name: 'execution_type', type: 'NVarChar', value: taskData.execution_type},
                {name: 'app_id', type: 'NVarChar', value: taskData.app_id || null},
                {name: 'server_id', type: 'NVarChar', value: taskData.server_id || null},
                {name: 'user_id', type: 'NVarChar', value: taskData.user_id || null},
                {name: 'credential_id', type: 'NVarChar', value: taskData.credential_id || null},
                {name: 'timeout_seconds', type: 'NVarChar', value: taskData.timeout_seconds || 300},
                {name: 'max_retries', type: 'NVarChar', value: taskData.max_retries || 3},
                {name: 'retry_delay_seconds', type: 'NVarChar', value: taskData.retry_delay_seconds || 60},
                {name: 'task_config', type: 'NVarChar', value: taskData.task_config ? JSON.stringify(taskData.task_config) : null}
            ];

            const result = await executeQuery(query, params);
            logger.info(`Task updated successfully: ${taskId}`);
            return { rowsAffected: result.rowsAffected[0]};

        } catch (error) {
            logger.error('Error in updateTask:', error);
            throw error;
        }
    }

    // Delete a task
    async deleteTask(taskId) {
        try {
            await executeQuery(
                'DELETE FROM executions WHERE task_id = @task_id',
                [{name: 'taskId', type: 'Int', value: taskId}]
            );

            const result = await executeQuery(
                'DELETE FROM tasks WHERE task_id = @task_id',
                [{name: 'taskId', type: 'Int', value: taskId}]
            );

            logger.info(`Task deleted successfully: ${taskId}`);
            return { rowsAffected: result.rowsAffected[0]};

        } catch (error) {
            logger.error('Error in deleteTask:', error);
            throw error;
        }
    }

    // Get task execution history
    async getTaskExecutions(taskId, pagination = {page: 1, limit: 20}) {
        try {
            const offset = (pagination.page - 1) * pagination.limit;

            const countQuery = `SELECT COUNT(*) as total FROM executions WHERE task_id = @task_id`;
            const countResult = await executeQuery(countQuery, [{name: 'taskId', type: 'Int', value: taskId}]);
            const total = countResult.recordset[0].total;

            const dataQuery = `
                SELECT e.*, t.task_name, t.task_type, u.first_name, u.last_name
                FROM executions e
                LEFT JOIN tasks t ON e.task_id = t.task_id
                LEFT JOIN users u ON e.triggered_by = u.user_id
                WHERE e.task_id = @taskId
                ORDER BY e.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `;

            const dataParams = [
                {name: 'taskId', type: 'Int', value: taskId},
                {name: 'offest', type: 'Int', value: offset},
                {name: 'limit', type: 'Int', value: pagination.limit}
            ];

            const dataResult = await executeQuery(dataQuery, dataParams);
            return {
                executions: dataResult.recordset,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total: total,
                    pages: Math.ceil(total / pagination.limit)
                }
            };

        } catch (error) {
            logger.error('Error in getTaskExecutions', error);
            throw error;
        }
    }

}

module.exports = new TaskQueries();