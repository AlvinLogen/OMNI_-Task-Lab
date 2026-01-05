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
        app_desc NVARCHAR(255),
        app_type NVARCHAR(20) DEFAULT 'Online' CHECK(app_type IN ('Online', 'Instore', 'Reporting','Integration', 'Other')),
        app_status NVARCHAR(20) DEFAULT 'Active' CHECK (app_status IN ('Active', 'Inactive')),
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
        server_ip NVARCHAR(20) NOT NULL,
        server_desc NVARCHAR(255),
        server_env NVARCHAR(20) DEFAULT 'Staging' CHECK (server_env IN ('Production', 'Staging')),
        server_type NVARCHAR(20) DEFAULT 'Application' CHECK (server_type IN ('FTP', 'Web', 'File', 'Remote', 'Database')),
        created_at DATETIME2 DEFAULT GETUTCDATE(),
        updated_at DATETIME2 DEFAULT GETUTCDATE()
    );
END

-- Create Tasks Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tasks')
BEGIN 
    CREATE TABLE tasks (
        task_id INT IDENTITY(1,1) PRIMARY KEY,
        task_name NVARCHAR(20) NOT NULL,
        task_desc NVARCHAR(255),
        task_type NVARCHAR(30) DEFAULT 'User' CHECK (task_type IN('User', 'Scheduled', 'Integration', 'Reporting', 'Notification', 'Server')),
        task_status NVARCHAR(20) DEFAULT 'New' CHECK(task_status IN ('New', 'In Progress', 'Completed', 'Blocked')),
        app_id INT NULL, --Task can be seperate from an application and thus allow nulls
        server_id INT NULL, --Task can be seperate from an servers and thus allow nulls
        parent_task_id INT NULL, -- Child Task can be linked to parent tasks for managing sub-tasks
        user_id INT NULL, 
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