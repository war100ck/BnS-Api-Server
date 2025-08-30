-- =========================================================
-- Restore_GameItemsDB_and_DonationsDb_2008R2.sql
-- This script restores GameItemsDB and DonationsDb
-- using exported .sql files for SQL Server 2008 R2
-- Paths are preconfigured for your environment
-- =========================================================

-- Switch to master database
USE master;
GO

-- Create databases if they do not exist
IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = 'GameItemsDB')
BEGIN
    CREATE DATABASE GameItemsDB
    ON 
    (NAME = 'GameItemsDB', FILENAME = 'D:\DataDB_2017\GameItemsDB.mdf'),
    (NAME = 'GameItemsDB_log', FILENAME = 'D:\DataDB_2017\GameItemsDB_log.ldf')
    FOR ATTACH;
    PRINT 'Database GameItemsDB created.';
END;

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = 'DonationsDb')
BEGIN
    CREATE DATABASE DonationsDb
    ON 
    (NAME = 'DonationsDb', FILENAME = 'D:\DataDB_2017\DonationsDb.mdf'),
    (NAME = 'DonationsDb_log', FILENAME = 'D:\DataDB_2017\DonationsDb_log.ldf')
    FOR ATTACH;
    PRINT 'Database DonationsDb created.';
END;
GO

-- Set both databases to SINGLE_USER to avoid conflicts
ALTER DATABASE GameItemsDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
ALTER DATABASE DonationsDb SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO

-- ===============================================
-- 1) Restore GameItemsDB
-- Execute the SQL script: D:\Server-Api-BnS-2017\DB\GameItemsDB.sql
-- Replace DATE types with DATETIME if needed
-- ===============================================
USE GameItemsDB;
GO
PRINT 'Restoring GameItemsDB from GameItemsDB.sql...';

-- Option 1: Open GameItemsDB.sql in SSMS and execute it manually
-- Option 2: Copy all contents of GameItemsDB.sql here and execute
-- Example placeholder:
-- CREATE TABLE [dbo].[Items](
--   [ItemID] INT NOT NULL,
--   [ItemName] NVARCHAR(100),
--   [CreatedDate] DATETIME
-- );
-- INSERT INTO [dbo].[Items] (...) VALUES (...);

-- ===============================================
-- 2) Restore DonationsDb
-- Execute the SQL script: D:\Server-Api-BnS-2017\DB\DonationsDb.sql
-- Replace DATE types with DATETIME if needed
-- ===============================================
USE DonationsDb;
GO
PRINT 'Restoring DonationsDb from DonationsDb.sql...';

-- Option 1: Open DonationsDb.sql in SSMS and execute it manually
-- Option 2: Copy all contents of DonationsDb.sql here and execute
-- Example placeholder:
-- CREATE TABLE [dbo].[Donations](
--   [DonationID] INT NOT NULL,
--   [UserID] INT,
--   [Amount] MONEY,
--   [DonationDate] DATETIME
-- );
-- INSERT INTO [dbo].[Donations] (...) VALUES (...);

-- ===============================================
-- Set databases back to MULTI_USER
ALTER DATABASE GameItemsDB SET MULTI_USER;
ALTER DATABASE DonationsDb SET MULTI_USER;
GO

PRINT 'Databases restored successfully!';
