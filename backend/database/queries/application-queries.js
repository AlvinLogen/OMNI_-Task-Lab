const { executeQuery } = require('../connection');
const logger = require('../../utils/logger');

class ApplicationQueries {
    async getAllApplications(filters = {}) {
        try {
            let query = `
                SELECT a.*,
                    (SELECT COUNT(*) FROM tasks WHERE app_id = a.app_id) as task_count,
                    (SELECT COUNT(*) FROM application_databases WHERE app_id = a.app_id) as database_count,
                    (SELECT COUNT(*) FROM server_applications WHERE app_id = a.app_id) as server_count
                FROM application a
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            if(filters.app_type){
                query += ` AND a.app_type = @param${paramIndex}`;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'NVarChar',
                    value: filters.app_type
                });
                paramIndex++;
            }

            if(filters.app_status){
                query += ` AND a.app_status = @param${paramIndex}`;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'NVarChar',
                    value: filters.app_status
                });
                paramIndex++;
            }

            query += ` ORDER BY a.app_name ASC`;

            const result = await executeQuery(query, params);
            return result.recordset;
            
        } catch (error) {
            logger.error('Error in getAllApplications:', error);
            throw error;
        }
     }

    async getApplicationById(appId) {
        try {
            const query = `
                SELECT 
                    a.*,
                    (SELECT COUNT(*) FROM tasks WHERE app_id = a.app_id) as task_count,
                    (SELECT COUNT(*) FROM application_databases WHERE app_id = a.app_id) as database_count,
                    (SELECT COUNT(*) FROM server_applications WHERE app_id = a.app_id) as server_count,
                    (SELECT COUNT(*) FROM application_connection_types WHERE app_id = a.app_id) as connection_count
                FROM application a
                WHERE a.app_id = @appId
            `;

            const params = [{ name: 'appId', type: 'Int', value: appId }];
            const result = await executeQuery(query, params);
            return result.recordset[0];
        } catch (error) {
            logger.error('Error in getApplicationById:', error);
            throw error;
        }
    }

    async getApplicationDatabases(appId) {
        try {
            const query = `
                SELECT 
                    ad.*,
                    s.server_name,
                    s.server_ip,
                    s.server_env
                FROM application_databases ad
                LEFT JOIN server s ON ad.server_id = s.server_id
                WHERE ad.app_id = @appId
                ORDER BY ad.database_name ASC
            `;

            const params = [{ name: 'appId', type: 'Int', value: appId }];
            const result = await executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error in getApplicationDatabases:', error);
            throw error;
        }
    }

    async getApplicationConnections(appId) {
        try {
            const query = `
                SELECT 
                    act.*,
                    ct.connection_type_name,
                    ct.connection_desc,
                    ct.requires_authentication
                FROM application_connection_types act
                INNER JOIN connection_types ct ON act.connection_type_id = ct.connection_type_id
                WHERE act.app_id = @appId
                ORDER BY ct.connection_type_name ASC
            `;

            const params = [{ name: 'appId', type: 'Int', value: appId }];
            const result = await executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error in getApplicationConnections:', error);
            throw error;
        }
    }

    async getApplicationServers(appId) {
        try {
            const query = `
                SELECT 
                    s.*,
                    sa.installed_date,
                    sa.version as installed_version
                FROM server_applications sa
                INNER JOIN server s ON sa.server_id = s.server_id
                WHERE sa.app_id = @appId
                ORDER BY s.server_env DESC, s.server_name ASC
            `;

            const params = [{ name: 'appId', type: 'Int', value: appId }];
            const result = await executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error in getApplicationServers:', error);
            throw error;
        }
    }

    async getApplicationTasks(appId) {
        try {
            const query = `
                SELECT 
                    t.*,
                    s.server_name,
                    u.first_name,
                    u.last_name
                FROM tasks t
                LEFT JOIN server s ON t.server_id = s.server_id
                LEFT JOIN users u ON t.user_id = u.user_id
                WHERE t.app_id = @appId
                ORDER BY t.created_at DESC
            `;

            const params = [{ name: 'appId', type: 'Int', value: appId }];
            const result = await executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error in getApplicationTasks:', error);
            throw error;
        }
    }

    async createApplication(appData) {
        try {
            const query = `
                INSERT INTO application (
                    app_name,
                    app_code,
                    app_desc,
                    app_type,
                    app_status,
                    vendor,
                    version
                )
                VALUES (
                    @app_name,
                    @app_code,
                    @app_desc,
                    @app_type,
                    @app_status,
                    @vendor,
                    @version
                );
                SELECT SCOPE_IDENTITY() AS app_id;
            `;

            const params = [
                { name: 'app_name', type: 'VarChar', value: appData.app_name },
                { name: 'app_code', type: 'VarChar', value: appData.app_code || null },
                { name: 'app_desc', type: 'NVarChar', value: appData.app_desc || null },
                { name: 'app_type', type: 'NVarChar', value: appData.app_type || 'Online' },
                { name: 'app_status', type: 'NVarChar', value: appData.app_status || 'Active' },
                { name: 'vendor', type: 'NVarChar', value: appData.vendor || null },
                { name: 'version', type: 'NVarChar', value: appData.version || null }
            ];

            const result = await executeQuery(query, params);
            const appId = result.recordset[0].app_id;
            logger.info(`Application created successfully: ${appId}`);
            return { app_id: appId };
        } catch (error) {
            logger.error('Error in createApplication:', error);
            throw error;
        }
    }

    async updateApplication(appId, appData) {
        try {
            const query = `
                UPDATE application
                SET
                    app_name = @app_name,
                    app_code = @app_code,
                    app_desc = @app_desc,
                    app_type = @app_type,
                    app_status = @app_status,
                    vendor = @vendor,
                    version = @version,
                    updated_at = GETUTCDATE()
                WHERE app_id = @app_id
            `;

            const params = [
                { name: 'app_id', type: 'Int', value: appId },
                { name: 'app_name', type: 'VarChar', value: appData.app_name },
                { name: 'app_code', type: 'VarChar', value: appData.app_code || null },
                { name: 'app_desc', type: 'NVarChar', value: appData.app_desc || null },
                { name: 'app_type', type: 'NVarChar', value: appData.app_type },
                { name: 'app_status', type: 'NVarChar', value: appData.app_status },
                { name: 'vendor', type: 'NVarChar', value: appData.vendor || null },
                { name: 'version', type: 'NVarChar', value: appData.version || null }
            ];

            const result = await executeQuery(query, params);
            logger.info(`Application updated successfully: ${appId}`);
            return { rowsAffected: result.rowsAffected[0] };
        } catch (error) {
            logger.error('Error in updateApplication:', error);
            throw error;
        }
    }

    async deleteApplication(appId) {
        try {
            // Note: Consider cascade delete implications
            // May need to handle related records (tasks, databases, etc.)
            const query = 'DELETE FROM application WHERE app_id = @appId';
            const params = [{ name: 'appId', type: 'Int', value: appId }];

            const result = await executeQuery(query, params);
            logger.info(`Application deleted successfully: ${appId}`);
            return { rowsAffected: result.rowsAffected[0] };
        } catch (error) {
            logger.error('Error in deleteApplication:', error);
            throw error;
        }
    }

}

module.exports = new ApplicationQueries();