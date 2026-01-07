-- ============================================
-- Database: OMNITaskLab
-- Purpose: OMNI Task Management Database
-- Author: Alvin Logenstein
-- Date: 2025-12-16
-- ============================================

-- CREATE Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'OMNITaskLab')
BEGIN
    CREATE DATABASE OMNITaskLab
END
GO

-- USE New Database
USE OMNITaskLab;
GO

-- Create Department table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'departments')
BEGIN 
    CREATE TABLE departments (
        department_id INT IDENTITY(1,1) PRIMARY KEY,
        department_name NVARCHAR(50) DEFAULT 'Omni' CHECK(department_name IN('Integration', 'Service Desk', 'BI Reporting', 'Commerce', 'Omni','Finance', 'Merchandising', 'Infrastructure')),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE()
    );
END

-- Create User table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN 
    CREATE TABLE users (
        user_id INT IDENTITY(1,1) PRIMARY KEY,
        first_name NVARCHAR(50) NOT NULL,
        last_name NVARCHAR(50),
        user_type NVARCHAR(50) DEFAULT 'Employee' CHECK(user_type IN ('Employee', 'Service Account', 'Other')),
        password_hash NVARCHAR(255) NOT NULL,
        email NVARCHAR(255) UNIQUE NOT NULL,
        department_id INT NULL,
        employee_num NVARCHAR(10) NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),

        -- General Constraint
        CONSTRAINT ck_users_email CHECK(email LIKE '%_@_%.%'),
        CONSTRAINT fk_users_department_id FOREIGN KEY (department_id) REFERENCES departments(department_id)
    );
END

-- Create Application Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'application')
BEGIN 
    CREATE TABLE application  (
        app_id INT IDENTITY(1,1) PRIMARY KEY,
        app_name VARCHAR(50) NOT NULL,
        app_code VARCHAR(50) NULL,
        app_desc NVARCHAR(255),
        app_type NVARCHAR(20) DEFAULT 'Online' CHECK(app_type IN ('Online', 'Instore', 'Reporting','Integration', 'Other')),
        app_status NVARCHAR(20) DEFAULT 'Active' CHECK (app_status IN ('Active', 'Inactive')),
        vendor NVARCHAR(100) NULL,
        version NVARCHAR(50) NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE()
    );
END

-- Create Server Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'server')
BEGIN 
    CREATE TABLE server (
        server_id INT IDENTITY(1,1) PRIMARY KEY,
        server_name NVARCHAR(20) NOT NULL,
        server_fqdn NVARCHAR(255) NULL,
        server_ip NVARCHAR(20) NOT NULL,
        server_desc NVARCHAR(255),
        server_env NVARCHAR(20) DEFAULT 'Staging' CHECK (server_env IN ('Production', 'Staging')),
        server_type NVARCHAR(20) DEFAULT 'Application' CHECK (server_type IN ('FTP', 'Web', 'File', 'Remote', 'Database')),
        server_purpose NVARCHAR(255) NULL,
        operating_system NVARCHAR(100) NULL,
        location NVARCHAR(100) NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE()
    );
END

-- Create Tasks Table (credential_id will be added later after credentials table exists)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tasks')
BEGIN 
    CREATE TABLE tasks (
        task_id INT IDENTITY(1,1) PRIMARY KEY,
        task_name NVARCHAR(20) NOT NULL,
        task_desc NVARCHAR(255),
        task_type NVARCHAR(30) DEFAULT 'User' CHECK (task_type IN('User', 'Scheduled', 'Integration', 'Reporting', 'Notification', 'Server')),
        task_status NVARCHAR(20) DEFAULT 'New' CHECK(task_status IN ('New', 'In Progress', 'Completed', 'Blocked')),
        execution_type NVARCHAR(50) NULL CHECK (execution_type IN ('Manual', 'Scheduled', 'Event', 'Dependency')),
        app_id INT NULL, --Task can be seperate from an application and thus allow nulls
        server_id INT NULL, --Task can be seperate from an servers and thus allow nulls
        parent_task_id INT NULL, -- Child Task can be linked to parent tasks for managing sub-tasks
        user_id INT NULL,
        timeout_seconds INT DEFAULT 300,
        max_retries INT DEFAULT 3,
        retry_delay_seconds INT DEFAULT 60,
        task_config NVARCHAR(MAX) NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE()
        
        --Foreign Key Constraints
        CONSTRAINT fk_tasks_app_id FOREIGN KEY (app_id) REFERENCES application(app_id) ON DELETE CASCADE, 
        CONSTRAINT fk_tasks_server_id FOREIGN KEY (server_id) REFERENCES server(server_id) ON DELETE CASCADE,
        CONSTRAINT fk_tasks_parent_task_id FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id) ON UPDATE NO ACTION ON DELETE CASCADE,
        CONSTRAINT fk_tasks_user_id FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );
END
GO

-- Connection Types Table (SQL, FTP, API, Server/File)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'connection_types')
BEGIN 
    CREATE TABLE connection_types (
        connection_type_id INT IDENTITY(1,1) PRIMARY KEY,
        connection_type_name VARCHAR(50) NOT NULL UNIQUE,
        connection_type_desc NVARCHAR(255),
        requires_credentials BIT DEFAULT 1,
        default_port INT NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE()
    );
END

-- Server Drives Table (C:, D:, I:)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'server_drives')
BEGIN 
    CREATE TABLE server_drives (
        drive_id INT IDENTITY(1,1) PRIMARY KEY,
        server_id INT NOT NULL,
        drive_letter CHAR(1) NOT NULL,
        drive_path NVARCHAR(255),
        drive_purpose NVARCHAR(255),
        total_size_gb DECIMAL(10,2) NULL,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),
        
        CONSTRAINT fk_server_drives_server_id FOREIGN KEY (server_id) REFERENCES server(server_id) ON DELETE CASCADE,
        CONSTRAINT uq_server_drive UNIQUE (server_id, drive_letter)
    );
END

-- Application Databases Table (for apps like Cowhills with 4 databases)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'application_databases')
BEGIN 
    CREATE TABLE application_databases (
        app_database_id INT IDENTITY(1,1) PRIMARY KEY,
        app_id INT NOT NULL,
        database_name NVARCHAR(100) NOT NULL,
        database_instance NVARCHAR(100),
        server_id INT NULL,
        server_env NVARCHAR(20) CHECK (server_env IN ('Production', 'Staging')),
        database_purpose NVARCHAR(255),
        connection_string_template NVARCHAR(500),
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),
        
        CONSTRAINT fk_app_databases_app_id FOREIGN KEY (app_id) REFERENCES application(app_id) ON DELETE CASCADE,
        CONSTRAINT fk_app_databases_server_id FOREIGN KEY (server_id) REFERENCES server(server_id)
    );
END

-- Credentials Table (Encrypted connection credentials)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'credentials')
BEGIN 
    CREATE TABLE credentials (
        credential_id INT IDENTITY(1,1) PRIMARY KEY,
        credential_name NVARCHAR(100) NOT NULL UNIQUE,
        app_id INT NOT NULL,
        connection_type_id INT NOT NULL,
        server_env NVARCHAR(20) CHECK (server_env IN ('Production', 'Staging')),
        
        -- Connection details (some encrypted)
        username NVARCHAR(255) NULL,
        password_encrypted NVARCHAR(MAX) NULL,
        host NVARCHAR(255) NULL,
        port INT NULL,
        database_name NVARCHAR(100) NULL,
        api_key_encrypted NVARCHAR(MAX) NULL,
        api_endpoint NVARCHAR(500) NULL,
        additional_config NVARCHAR(MAX) NULL,
        
        -- Metadata
        is_active BIT DEFAULT 1,
        expires_at DATETIME2 NULL,
        last_used_at DATETIME2 NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),
        created_by INT NULL,
        
        CONSTRAINT fk_credentials_app_id FOREIGN KEY (app_id) REFERENCES application(app_id) ON DELETE CASCADE,
        CONSTRAINT fk_credentials_connection_type FOREIGN KEY (connection_type_id) REFERENCES connection_types(connection_type_id),
        CONSTRAINT fk_credentials_created_by FOREIGN KEY (created_by) REFERENCES users(user_id)
    );
END

-- Application Connection Types Mapping
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'application_connection_types')
BEGIN 
    CREATE TABLE application_connection_types (
        app_conn_id INT IDENTITY(1,1) PRIMARY KEY,
        app_id INT NOT NULL,
        connection_type_id INT NOT NULL,
        is_primary BIT DEFAULT 0,
        priority_order INT DEFAULT 1,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        
        CONSTRAINT fk_app_conn_app_id FOREIGN KEY (app_id) REFERENCES application(app_id) ON DELETE CASCADE,
        CONSTRAINT fk_app_conn_type_id FOREIGN KEY (connection_type_id) REFERENCES connection_types(connection_type_id),
        CONSTRAINT uq_app_connection_type UNIQUE (app_id, connection_type_id)
    );
END

-- Server Applications Mapping
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'server_applications')
BEGIN 
    CREATE TABLE server_applications (
        server_app_id INT IDENTITY(1,1) PRIMARY KEY,
        server_id INT NOT NULL,
        app_id INT NOT NULL,
        drive_id INT NULL,
        installation_path NVARCHAR(500),
        is_active BIT DEFAULT 1,
        installed_at DATETIME2 NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),
        
        CONSTRAINT fk_server_app_server_id FOREIGN KEY (server_id) REFERENCES server(server_id) ON DELETE CASCADE,
        CONSTRAINT fk_server_app_app_id FOREIGN KEY (app_id) REFERENCES application(app_id) ON DELETE CASCADE,
        CONSTRAINT fk_server_app_drive_id FOREIGN KEY (drive_id) REFERENCES server_drives(drive_id)
    );
END

-- Executions Table (Task execution history)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'executions')
BEGIN 
    CREATE TABLE executions (
        execution_id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        task_id INT NOT NULL,
        app_id INT NULL,
        server_id INT NULL,
        execution_type NVARCHAR(50) CHECK (execution_type IN ('Manual', 'Scheduled', 'Event', 'Dependency')),
        triggered_by INT NULL,
        status NVARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Running', 'Completed', 'Failed', 'Cancelled', 'Timeout')),
        started_at DATETIME2,
        completed_at DATETIME2,
        duration_ms BIGINT,
        exit_code INT,
        output NVARCHAR(MAX),
        error_output NVARCHAR(MAX),
        result_data NVARCHAR(MAX),
        retry_count INT DEFAULT 0,
        parent_execution_id UNIQUEIDENTIFIER NULL,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        
        CONSTRAINT fk_executions_task_id FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
        CONSTRAINT fk_executions_app_id FOREIGN KEY (app_id) REFERENCES application(app_id),
        CONSTRAINT fk_executions_server_id FOREIGN KEY (server_id) REFERENCES server(server_id),
        CONSTRAINT fk_executions_triggered_by FOREIGN KEY (triggered_by) REFERENCES users(user_id),
        CONSTRAINT fk_executions_parent FOREIGN KEY (parent_execution_id) REFERENCES executions(execution_id)
    );
END

-- Schedules Table (Cron-based scheduling)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'schedules')
BEGIN 
    CREATE TABLE schedules (
        schedule_id INT IDENTITY(1,1) PRIMARY KEY,
        task_id INT NOT NULL,
        cron_expression VARCHAR(100) NOT NULL,
        timezone VARCHAR(50) DEFAULT 'UTC',
        is_enabled BIT DEFAULT 1,
        next_run_at DATETIME2,
        last_run_at DATETIME2,
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE(),
        
        CONSTRAINT fk_schedules_task_id FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
        CONSTRAINT uq_schedule_task_cron UNIQUE (task_id, cron_expression)
    );
END
GO

-- Add credential_id to tasks table (after credentials table exists)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('tasks') AND name = 'credential_id')
BEGIN
    ALTER TABLE tasks ADD credential_id INT NULL;
    ALTER TABLE tasks ADD CONSTRAINT fk_tasks_credential_id 
        FOREIGN KEY (credential_id) REFERENCES credentials(credential_id);
END
GO

-- Table Indexes
-- User Table indexes 
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_user_email' AND object_id = OBJECT_ID('users')) CREATE NONCLUSTERED INDEX idx_user_email ON users(email);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_user_name' AND object_id = OBJECT_ID('users')) CREATE NONCLUSTERED INDEX idx_user_name ON users(first_name);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_user_department_id'  AND object_id = OBJECT_ID('users')) CREATE NONCLUSTERED INDEX idx_user_department_id ON users(department_id);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_user_type' AND object_id = OBJECT_ID('users')) CREATE NONCLUSTERED INDEX idx_user_type ON users(user_type);
-- Application Table Indexes 
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_app_name' AND object_id = OBJECT_ID('application')) CREATE NONCLUSTERED INDEX idx_app_name ON application(app_name);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_app_type' AND object_id = OBJECT_ID('application')) CREATE NONCLUSTERED INDEX idx_app_type ON application(app_type);
-- Server Table Indexes
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_server_name' AND object_id = OBJECT_ID('server')) CREATE NONCLUSTERED INDEX idx_server_name ON server(server_name);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_server_env' AND object_id = OBJECT_ID('server')) CREATE NONCLUSTERED INDEX idx_server_env ON server(server_env);
-- Tasks Table Indexes 
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_parent_task_id' AND object_id = OBJECT_ID('tasks')) CREATE NONCLUSTERED INDEX idx_parent_task_id ON tasks(parent_task_id);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_task_name' AND object_id = OBJECT_ID('tasks')) CREATE NONCLUSTERED INDEX idx_task_name ON tasks(task_name);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_task_type' AND object_id = OBJECT_ID('tasks')) CREATE NONCLUSTERED INDEX idx_task_type ON tasks(task_type);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_task_status' AND object_id = OBJECT_ID('tasks')) CREATE NONCLUSTERED INDEX idx_task_status ON tasks(task_status);
GO

-- Connection Types Indexes
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_connection_type_name' AND object_id = OBJECT_ID('connection_types')) CREATE NONCLUSTERED INDEX idx_connection_type_name ON connection_types(connection_type_name);

-- Server Drives Indexes
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_server_drives_server' AND object_id = OBJECT_ID('server_drives')) CREATE NONCLUSTERED INDEX idx_server_drives_server ON server_drives(server_id);

-- Application Databases Indexes
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_app_databases_app' AND object_id = OBJECT_ID('application_databases')) CREATE NONCLUSTERED INDEX idx_app_databases_app ON application_databases(app_id);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_app_databases_env' AND object_id = OBJECT_ID('application_databases')) CREATE NONCLUSTERED INDEX idx_app_databases_env ON application_databases(server_env);

-- Credentials Indexes
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_credentials_app_env' AND object_id = OBJECT_ID('credentials')) CREATE NONCLUSTERED INDEX idx_credentials_app_env ON credentials(app_id, server_env);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_credentials_type' AND object_id = OBJECT_ID('credentials')) CREATE NONCLUSTERED INDEX idx_credentials_type ON credentials(connection_type_id);

-- Application Connection Types Indexes
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_app_conn_app' AND object_id = OBJECT_ID('application_connection_types')) CREATE NONCLUSTERED INDEX idx_app_conn_app ON application_connection_types(app_id);

-- Server Applications Indexes
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_server_app_server' AND object_id = OBJECT_ID('server_applications')) CREATE NONCLUSTERED INDEX idx_server_app_server ON server_applications(server_id);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_server_app_app' AND object_id = OBJECT_ID('server_applications')) CREATE NONCLUSTERED INDEX idx_server_app_app ON server_applications(app_id);

-- Executions Indexes
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_executions_task_time' AND object_id = OBJECT_ID('executions')) CREATE NONCLUSTERED INDEX idx_executions_task_time ON executions(task_id, started_at DESC);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_executions_status' AND object_id = OBJECT_ID('executions')) CREATE NONCLUSTERED INDEX idx_executions_status ON executions(status, started_at DESC);
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_executions_created' AND object_id = OBJECT_ID('executions')) CREATE NONCLUSTERED INDEX idx_executions_created ON executions(created_at DESC);

-- Schedules Indexes
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'idx_schedules_next_run' AND object_id = OBJECT_ID('schedules')) CREATE NONCLUSTERED INDEX idx_schedules_next_run ON schedules(next_run_at) WHERE is_enabled = 1;

