const { executeQuery } = require('../connection');
const logger = require('../../utils/logger');

class UserQueries {
    async getAllUsers(filters = {}) {
        try {
            let query = `
                SELECT 
                    u.*,
                    d.department_name,
                    d.department_code,
                    (SELECT COUNT(*) FROM tasks WHERE user_id = u.user_id) as task_count
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.department_id
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            if (filters.department_id) {
                query += ` AND u.department_id = @param${paramIndex}`;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'Int',
                    value: filters.department_id
                });
                paramIndex++;
            }

            if (filters.is_active !== undefined) {
                query += ` AND u.is_active = @param${paramIndex}`;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'Bit',
                    value: filters.is_active
                });
                paramIndex++;
            }

            if (filters.user_type) {
                query += ` AND u.user_type = @param${paramIndex}`;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'NVarChar',
                    value: filters.user_type
                });
                paramIndex++;
            }

            query += ` ORDER BY u.first_name ASC, u.last_name ASC`;

            const result = await executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error in getAllUsers:', error);
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const query = `
                SELECT 
                    u.*,
                    d.department_name,
                    d.department_code,
                    d.department_head,
                    (SELECT COUNT(*) FROM tasks WHERE user_id = u.user_id) as task_count,
                    (SELECT COUNT(*) FROM executions WHERE triggered_by = u.user_id) as execution_count
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.department_id
                WHERE u.user_id = @userId
            `;

            const params = [{ name: 'userId', type: 'Int', value: userId }];
            const result = await executeQuery(query, params);
            return result.recordset[0];
        } catch (error) {
            logger.error('Error in getUserById:', error);
            throw error;
        }
    }

    async getUserByEmail(email) {
        try {
            const query = `
                SELECT 
                    u.*,
                    d.department_name
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.department_id
                WHERE u.email = @email
            `;

            const params = [{ name: 'email', type: 'NVarChar', value: email }];
            const result = await executeQuery(query, params);
            return result.recordset[0];
        } catch (error) {
            logger.error('Error in getUserByEmail:', error);
            throw error;
        }
    }

    async createUser(userData) {
        try {
            const query = `
                INSERT INTO users (
                    first_name,
                    last_name,
                    user_type,
                    password_hash,
                    email,
                    department_id,
                    employee_num,
                    is_active
                )
                VALUES (
                    @first_name,
                    @last_name,
                    @user_type,
                    @password_hash,
                    @email,
                    @department_id,
                    @employee_num,
                    @is_active
                );
                SELECT SCOPE_IDENTITY() AS user_id;
            `;

            const params = [
                { name: 'first_name', type: 'NVarChar', value: userData.first_name },
                { name: 'last_name', type: 'NVarChar', value: userData.last_name || null },
                { name: 'user_type', type: 'NVarChar', value: userData.user_type || 'Employee' },
                { name: 'password_hash', type: 'NVarChar', value: userData.password_hash },
                { name: 'email', type: 'NVarChar', value: userData.email },
                { name: 'department_id', type: 'Int', value: userData.department_id || null },
                { name: 'employee_num', type: 'NVarChar', value: userData.employee_num || null },
                { name: 'is_active', type: 'Bit', value: userData.is_active !== undefined ? userData.is_active : true }
            ];

            const result = await executeQuery(query, params);
            const userId = result.recordset[0].user_id;
            logger.info(`User created successfully: ${userId}`);
            return { user_id: userId };
        } catch (error) {
            logger.error('Error in createUser:', error);
            throw error;
        }
    }

    async updateUser(userId, userData) {
        try {
            const query = `
                UPDATE users
                SET
                    first_name = @first_name,
                    last_name = @last_name,
                    user_type = @user_type,
                    email = @email,
                    department_id = @department_id,
                    employee_num = @employee_num,
                    is_active = @is_active,
                    updated_at = GETUTCDATE()
                WHERE user_id = @user_id
            `;

            const params = [
                { name: 'user_id', type: 'Int', value: userId },
                { name: 'first_name', type: 'NVarChar', value: userData.first_name },
                { name: 'last_name', type: 'NVarChar', value: userData.last_name || null },
                { name: 'user_type', type: 'NVarChar', value: userData.user_type },
                { name: 'email', type: 'NVarChar', value: userData.email },
                { name: 'department_id', type: 'Int', value: userData.department_id || null },
                { name: 'employee_num', type: 'NVarChar', value: userData.employee_num || null },
                { name: 'is_active', type: 'Bit', value: userData.is_active }
            ];

            const result = await executeQuery(query, params);
            logger.info(`User updated successfully: ${userId}`);
            return { rowsAffected: result.rowsAffected[0] };
        } catch (error) {
            logger.error('Error in updateUser:', error);
            throw error;
        }
    }

    async updateUserPassword(userId, passwordHash) {
        try {
            const query = `
                UPDATE users
                SET
                    password_hash = @password_hash,
                    updated_at = GETUTCDATE()
                WHERE user_id = @user_id
            `;

            const params = [
                { name: 'user_id', type: 'Int', value: userId },
                { name: 'password_hash', type: 'NVarChar', value: passwordHash }
            ];

            const result = await executeQuery(query, params);
            logger.info(`User password updated: ${userId}`);
            return { rowsAffected: result.rowsAffected[0] };
        } catch (error) {
            logger.error('Error in updateUserPassword:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            const query = 'DELETE FROM users WHERE user_id = @userId';
            const params = [{ name: 'userId', type: 'Int', value: userId }];

            const result = await executeQuery(query, params);
            logger.info(`User deleted successfully: ${userId}`);
            return { rowsAffected: result.rowsAffected[0] };
        } catch (error) {
            logger.error('Error in deleteUser:', error);
            throw error;
        }
    }

    // ==================== DEPARTMENT QUERIES ====================
    async getAllDepartments() {
        try {
            const query = `
                SELECT 
                    d.*,
                    (SELECT COUNT(*) FROM users WHERE department_id = d.department_id) as user_count
                FROM departments d
                ORDER BY d.department_name ASC
            `;

            const result = await executeQuery(query, []);
            return result.recordset;
        } catch (error) {
            logger.error('Error in getAllDepartments:', error);
            throw error;
        }
    }

    async getDepartmentById(departmentId) {
        try {
            const query = `
                SELECT 
                    d.*,
                    (SELECT COUNT(*) FROM users WHERE department_id = d.department_id) as user_count,
                    (SELECT COUNT(*) FROM users WHERE department_id = d.department_id AND is_active = 1) as active_user_count
                FROM departments d
                WHERE d.department_id = @departmentId
            `;

            const params = [{ name: 'departmentId', type: 'Int', value: departmentId }];
            const result = await executeQuery(query, params);
            return result.recordset[0];
        } catch (error) {
            logger.error('Error in getDepartmentById:', error);
            throw error;
        }
    }

    async getDepartmentUsers(departmentId) {
        try {
            const query = `
                SELECT 
                    u.*,
                    (SELECT COUNT(*) FROM tasks WHERE user_id = u.user_id) as task_count
                FROM users u
                WHERE u.department_id = @departmentId
                ORDER BY u.first_name ASC, u.last_name ASC
            `;

            const params = [{ name: 'departmentId', type: 'Int', value: departmentId }];
            const result = await executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error in getDepartmentUsers:', error);
            throw error;
        }
    }
}

module.exports = new UserQueries();