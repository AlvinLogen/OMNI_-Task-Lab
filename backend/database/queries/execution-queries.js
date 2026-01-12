const { executeQuery } = require('../connection');
const logger = require('../../utils/logger');

class ExecutionQueries {
    async getAllExecutions(options = {}) {
        try {
            const pagination = options.pagination || { page: 1, limit: 20 };
            const filters = options.filters || {};
            const offset = (pagination.page - 1) * pagination.limit;

            let countQuery = `
                SELECT COUNT(*) as total
                FROM executions e
                WHERE 1=1
            `;

            let dataQuery = `
                SELECT 
                    e.*,
                    t.task_name,
                    t.task_type,
                    a.app_name,
                    s.server_name,
                    u.first_name,
                    u.last_name,
                    u.email
                FROM executions e
                LEFT JOIN tasks t ON e.task_id = t.task_id
                LEFT JOIN application a ON e.app_id = a.app_id
                LEFT JOIN server s ON e.server_id = s.server_id
                LEFT JOIN users u ON e.triggered_by = u.user_id
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Apply filters to both queries
            if (filters.status) {
                const filterClause = ` AND e.status = @param${paramIndex}`;
                countQuery += filterClause;
                dataQuery += filterClause;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'NVarChar',
                    value: filters.status
                });
                paramIndex++;
            }

            if (filters.task_id) {
                const filterClause = ` AND e.task_id = @param${paramIndex}`;
                countQuery += filterClause;
                dataQuery += filterClause;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'Int',
                    value: filters.task_id
                });
                paramIndex++;
            }

            if (filters.execution_type) {
                const filterClause = ` AND e.execution_type = @param${paramIndex}`;
                countQuery += filterClause;
                dataQuery += filterClause;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'NVarChar',
                    value: filters.execution_type
                });
                paramIndex++;
            }

            // Get total count
            const countResult = await executeQuery(countQuery, params);
            const total = countResult.recordset[0].total;

            // Add pagination and sorting to data query
            dataQuery += `
                ORDER BY e.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `;

            const dataParams = [
                ...params,
                { name: 'offset', type: 'Int', value: offset },
                { name: 'limit', type: 'Int', value: pagination.limit }
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
            logger.error('Error in getAllExecutions:', error);
            throw error;
        }
    }

    async getExecutionById(executionId) {
        try {
            const query = `
                SELECT 
                    e.*,
                    t.task_name,
                    t.task_type,
                    t.task_desc,
                    a.app_name,
                    a.app_code,
                    s.server_name,
                    s.server_ip,
                    u.first_name,
                    u.last_name,
                    u.email
                FROM executions e
                LEFT JOIN tasks t ON e.task_id = t.task_id
                LEFT JOIN application a ON e.app_id = a.app_id
                LEFT JOIN server s ON e.server_id = s.server_id
                LEFT JOIN users u ON e.triggered_by = u.user_id
                WHERE e.execution_id = @executionId
            `;

            const params = [{ name: 'executionId', type: 'UniqueIdentifier', value: executionId }];
            const result = await executeQuery(query, params);
            return result.recordset[0];
        } catch (error) {
            logger.error('Error in getExecutionById:', error);
            throw error;
        }
    }

    async getRecentExecutions(limit = 10) {
        try {
            const query = `
                SELECT TOP (@limit)
                    e.execution_id,
                    e.task_id,
                    e.status,
                    e.started_at,
                    e.completed_at,
                    e.duration_ms,
                    e.exit_code,
                    e.execution_type,
                    t.task_name,
                    t.task_type,
                    a.app_name,
                    s.server_name
                FROM executions e
                LEFT JOIN tasks t ON e.task_id = t.task_id
                LEFT JOIN application a ON e.app_id = a.app_id
                LEFT JOIN server s ON e.server_id = s.server_id
                ORDER BY e.created_at DESC
            `;

            const params = [{ name: 'limit', type: 'Int', value: limit }];
            const result = await executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error in getRecentExecutions:', error);
            throw error;
        }
    }

    async getExecutionStats() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_executions,
                    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 'Running' THEN 1 ELSE 0 END) as running,
                    SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN status = 'Timeout' THEN 1 ELSE 0 END) as timeout,
                    AVG(CAST(duration_ms AS FLOAT)) as avg_duration_ms,
                    MIN(duration_ms) as min_duration_ms,
                    MAX(duration_ms) as max_duration_ms
                FROM executions
                WHERE duration_ms IS NOT NULL
            `;

            const result = await executeQuery(query, []);
            const stats = result.recordset[0];

            // Calculate success rate
            const total = stats.total_executions || 0;
            const completed = stats.completed || 0;
            stats.success_rate = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;

            return stats;
        } catch (error) {
            logger.error('Error in getExecutionStats:', error);
            throw error;
        }
    }

    async createExecution(executionData) {
        try {
            const query = `
                INSERT INTO executions (
                    task_id,
                    app_id,
                    server_id,
                    execution_type,
                    triggered_by,
                    status,
                    started_at
                )
                VALUES (
                    @task_id,
                    @app_id,
                    @server_id,
                    @execution_type,
                    @triggered_by,
                    @status,
                    GETUTCDATE()
                );
                SELECT CAST(SCOPE_IDENTITY() AS UNIQUEIDENTIFIER) AS execution_id;
            `;

            const params = [
                { name: 'task_id', type: 'Int', value: executionData.task_id },
                { name: 'app_id', type: 'Int', value: executionData.app_id || null },
                { name: 'server_id', type: 'Int', value: executionData.server_id || null },
                { name: 'execution_type', type: 'NVarChar', value: executionData.execution_type || 'Manual' },
                { name: 'triggered_by', type: 'Int', value: executionData.triggered_by || null },
                { name: 'status', type: 'NVarChar', value: executionData.status || 'Pending' }
            ];

            const result = await executeQuery(query, params);
            const executionId = result.recordset[0].execution_id;
            logger.info(`Execution created successfully: ${executionId}`);
            return { execution_id: executionId };
        } catch (error) {
            logger.error('Error in createExecution:', error);
            throw error;
        }
    }

    async updateExecutionStatus(executionId, statusData) {
        try {
            const query = `
                UPDATE executions
                SET
                    status = @status,
                    completed_at = @completed_at,
                    duration_ms = @duration_ms,
                    exit_code = @exit_code,
                    output = @output,
                    error_output = @error_output,
                    result_data = @result_data,
                    retry_count = @retry_count
                WHERE execution_id = @execution_id
            `;

            const params = [
                { name: 'execution_id', type: 'UniqueIdentifier', value: executionId },
                { name: 'status', type: 'NVarChar', value: statusData.status },
                { name: 'completed_at', type: 'DateTime2', value: statusData.completed_at || null },
                { name: 'duration_ms', type: 'BigInt', value: statusData.duration_ms || null },
                { name: 'exit_code', type: 'Int', value: statusData.exit_code || null },
                { name: 'output', type: 'NVarChar', value: statusData.output || null },
                { name: 'error_output', type: 'NVarChar', value: statusData.error_output || null },
                { name: 'result_data', type: 'NVarChar', value: statusData.result_data ? JSON.stringify(statusData.result_data) : null },
                { name: 'retry_count', type: 'Int', value: statusData.retry_count || 0 }
            ];

            const result = await executeQuery(query, params);
            logger.info(`Execution status updated: ${executionId} -> ${statusData.status}`);
            return { rowsAffected: result.rowsAffected[0] };
        } catch (error) {
            logger.error('Error in updateExecutionStatus:', error);
            throw error;
        }
    }

    async cancelExecution(executionId) {
        try {
            const query = `
                UPDATE executions
                SET
                    status = 'Cancelled',
                    completed_at = GETUTCDATE(),
                    duration_ms = DATEDIFF(MILLISECOND, started_at, GETUTCDATE())
                WHERE execution_id = @execution_id
                AND status IN ('Pending', 'Running')
            `;

            const params = [{ name: 'execution_id', type: 'UniqueIdentifier', value: executionId }];
            const result = await executeQuery(query, params);
            
            if (result.rowsAffected[0] > 0) {
                logger.info(`Execution cancelled: ${executionId}`);
            }
            
            return { rowsAffected: result.rowsAffected[0] };
        } catch (error) {
            logger.error('Error in cancelExecution:', error);
            throw error;
        }
    }
}

module.exports = new ExecutionQueries();