const { executeQuery } = require('../connection');
const logger = require('../../utils/logger');

class ServerQueries {
    async getAllServers(filters = {}) { 
        try {
            let query = `
                SELECT s.*,
                    (SELECT COUNT(*) FROM tasks WHERE server_id = s.server_id) as task_count,
                    (SELECT COUNT(*) FROM server_applications WHERE server_id = s.server_id) as app_count,
                    (SELECT COUNT(*) FROM server_drives WHERE server_id = s.server_id) as drive_count
                FROM server s
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            if(filters,server_env) {
                query += ` AND s.server_env = @param${paramIndex}`;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'NVarChar',
                    value: filters.server_env
                });
                paramIndex++;
            }

            if(filters,server_type) {
                query += ` AND s.server_type = @param${paramIndex}`;
                params.push({
                    name: `param${paramIndex}`,
                    type: 'NVarChar',
                    value: filters.server_type
                });
                paramIndex++;
            }

            query += 'ORDER BY s.server_env DESC, s.server_name ASC';

            const result = await executeQuery(query, params);
            return result.recordset;

        } catch (error) {
            logger.error('Error in getAllServers:', error);
            throw error;            
        }
    }
   async getServerById(serverId) {
        try {
            const query = `
                SELECT 
                    s.*,
                    (SELECT COUNT(*) FROM tasks WHERE server_id = s.server_id) as task_count,
                    (SELECT COUNT(*) FROM server_applications WHERE server_id = s.server_id) as app_count,
                    (SELECT COUNT(*) FROM server_drives WHERE server_id = s.server_id) as drive_count,
                    (SELECT COUNT(*) FROM application_databases WHERE server_id = s.server_id) as database_count
                FROM server s
                WHERE s.server_id = @serverId
            `;

            const params = [{ name: 'serverId', type: 'Int', value: serverId }];
            const result = await executeQuery(query, params);
            return result.recordset[0];
        } catch (error) {
            logger.error('Error in getServerById:', error);
            throw error;
        }
    }

    async getServerDrives(serverId) {
        try {
            const query = `
                SELECT 
                    sd.*
                FROM server_drives sd
                WHERE sd.server_id = @serverId
                ORDER BY sd.drive_letter ASC
            `;

            const params = [{ name: 'serverId', type: 'Int', value: serverId }];
            const result = await executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error in getServerDrives:', error);
            throw error;
        }
    }

    async getServerApplications(serverId) {
        try {
            const query = `
                SELECT 
                    a.*,
                    sa.installed_date,
                    sa.version as installed_version
                FROM server_applications sa
                INNER JOIN application a ON sa.app_id = a.app_id
                WHERE sa.server_id = @serverId
                ORDER BY a.app_name ASC
            `;

            const params = [{ name: 'serverId', type: 'Int', value: serverId }];
            const result = await executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error in getServerApplications:', error);
            throw error;
        }
    }

    async getServerTasks(serverId) {
        try {
            const query = `
                SELECT 
                    t.*,
                    a.app_name,
                    u.first_name,
                    u.last_name
                FROM tasks t
                LEFT JOIN application a ON t.app_id = a.app_id
                LEFT JOIN users u ON t.user_id = u.user_id
                WHERE t.server_id = @serverId
                ORDER BY t.created_at DESC
            `;

            const params = [{ name: 'serverId', type: 'Int', value: serverId }];
            const result = await executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error in getServerTasks:', error);
            throw error;
        }
    }

    async getServerDatabases(serverId) {
        try {
            const query = `
                SELECT 
                    ad.*,
                    a.app_name,
                    a.app_code
                FROM application_databases ad
                INNER JOIN application a ON ad.app_id = a.app_id
                WHERE ad.server_id = @serverId
                ORDER BY ad.database_name ASC
            `;

            const params = [{ name: 'serverId', type: 'Int', value: serverId }];
            const result = await executeQuery(query, params);
            return result.recordset;
        } catch (error) {
            logger.error('Error in getServerDatabases:', error);
            throw error;
        }
    }

    async createServer(serverData) {
        try {
            const query = `
                INSERT INTO server (
                    server_name,
                    server_fqdn,
                    server_ip,
                    server_desc,
                    server_env,
                    server_type,
                    server_purpose,
                    operating_system,
                    location
                )
                VALUES (
                    @server_name,
                    @server_fqdn,
                    @server_ip,
                    @server_desc,
                    @server_env,
                    @server_type,
                    @server_purpose,
                    @operating_system,
                    @location
                );
                SELECT SCOPE_IDENTITY() AS server_id;
            `;

            const params = [
                { name: 'server_name', type: 'NVarChar', value: serverData.server_name },
                { name: 'server_fqdn', type: 'NVarChar', value: serverData.server_fqdn || null },
                { name: 'server_ip', type: 'NVarChar', value: serverData.server_ip },
                { name: 'server_desc', type: 'NVarChar', value: serverData.server_desc || null },
                { name: 'server_env', type: 'NVarChar', value: serverData.server_env || 'Staging' },
                { name: 'server_type', type: 'NVarChar', value: serverData.server_type || 'Application' },
                { name: 'server_purpose', type: 'NVarChar', value: serverData.server_purpose || null },
                { name: 'operating_system', type: 'NVarChar', value: serverData.operating_system || null },
                { name: 'location', type: 'NVarChar', value: serverData.location || null }
            ];

            const result = await executeQuery(query, params);
            const serverId = result.recordset[0].server_id;
            logger.info(`Server created successfully: ${serverId}`);
            return { server_id: serverId };
        } catch (error) {
            logger.error('Error in createServer:', error);
            throw error;
        }
    }

    async updateServer(serverId, serverData) {
        try {
            const query = `
                UPDATE server
                SET
                    server_name = @server_name,
                    server_fqdn = @server_fqdn,
                    server_ip = @server_ip,
                    server_desc = @server_desc,
                    server_env = @server_env,
                    server_type = @server_type,
                    server_purpose = @server_purpose,
                    operating_system = @operating_system,
                    location = @location,
                    updated_at = GETUTCDATE()
                WHERE server_id = @server_id
            `;

            const params = [
                { name: 'server_id', type: 'Int', value: serverId },
                { name: 'server_name', type: 'NVarChar', value: serverData.server_name },
                { name: 'server_fqdn', type: 'NVarChar', value: serverData.server_fqdn || null },
                { name: 'server_ip', type: 'NVarChar', value: serverData.server_ip },
                { name: 'server_desc', type: 'NVarChar', value: serverData.server_desc || null },
                { name: 'server_env', type: 'NVarChar', value: serverData.server_env },
                { name: 'server_type', type: 'NVarChar', value: serverData.server_type },
                { name: 'server_purpose', type: 'NVarChar', value: serverData.server_purpose || null },
                { name: 'operating_system', type: 'NVarChar', value: serverData.operating_system || null },
                { name: 'location', type: 'NVarChar', value: serverData.location || null }
            ];

            const result = await executeQuery(query, params);
            logger.info(`Server updated successfully: ${serverId}`);
            return { rowsAffected: result.rowsAffected[0] };
        } catch (error) {
            logger.error('Error in updateServer:', error);
            throw error;
        }
    }

    async deleteServer(serverId) { 
        try {
            const query = 'DELETE FROM server WHERE server_id = @serverId';
            const params = [{ name: 'serverId', type: 'Int', value: serverId}];

            const result = await executeQuery(query, params);
            logger.info(`Server deleted successfully: ${serverId}`);
            return { rowsAffected: result.rowsAffected[0]};

        } catch (error) {
            logger.error('Error in deleteServer:', error);
            throw error;
        }
    }

}

module.exports = new ServerQueries();