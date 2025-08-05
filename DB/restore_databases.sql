-- Этот скрипт выполняет восстановление баз данных GameItemsDB и DonationsDb из резервных копий.
-- This script restores the GameItemsDB and DonationsDb databases from backup files.

-- Переключаемся на системную базу данных master.
-- Switch to the master database.
USE master;
GO

-- Переводим базу данных GameItemsDB в режим одного пользователя, чтобы завершить все активные подключения.
-- Set the GameItemsDB database to single-user mode to terminate all active connections.
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'GameItemsDB')
BEGIN
    ALTER DATABASE GameItemsDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    PRINT 'Database GameItemsDB is set to SINGLE_USER mode.';
END;
GO

-- Выполняем восстановление базы данных GameItemsDB из указанного файла резервной копии.
-- Restore the GameItemsDB database from the specified backup file.
RESTORE DATABASE GameItemsDB
FROM DISK = 'D:\Server-Api-BnS-Server\DB\GameItemsDB.bak' -- Путь к файлу резервной копии (.bak). -- Path to the backup file (.bak).
WITH
    -- Задаём путь для основного файла данных (.mdf) после восстановления.
    -- Specifies the path for the main data file (.mdf) after restoration.
    MOVE 'GameItemsDB' TO 'D:\DataDB\GameItemsDB.mdf',
    
    -- Задаём путь для журнала транзакций (.ldf) после восстановления.
    -- Specifies the path for the transaction log file (.ldf) after restoration.
    MOVE 'GameItemsDB_log' TO 'D:\DataDB\GameItemsDB_log.ldf',

    -- Указываем параметр REPLACE, чтобы заменить существующую базу данных.
    -- The REPLACE option is used to overwrite the existing database, if it exists.
    REPLACE,

    -- Параметр STATS выводит информацию о ходе выполнения операции каждые 10%.
    -- The STATS option displays progress updates every 10%.
    STATS = 10;
GO

-- Возвращаем базу данных GameItemsDB в режим многопользовательского доступа.
-- Set the GameItemsDB database back to multi-user mode.
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'GameItemsDB')
BEGIN
    ALTER DATABASE GameItemsDB SET MULTI_USER;
    PRINT 'Database GameItemsDB is set to MULTI_USER mode.';
END;
GO

-- Переводим базу данных DonationsDb в режим одного пользователя, чтобы завершить все активные подключения.
-- Set the DonationsDb database to single-user mode to terminate all active connections.
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'DonationsDb')
BEGIN
    ALTER DATABASE DonationsDb SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    PRINT 'Database DonationsDb is set to SINGLE_USER mode.';
END;
GO

-- Выполняем восстановление базы данных DonationsDb из указанного файла резервной копии.
-- Restore the DonationsDb database from the specified backup file.
RESTORE DATABASE DonationsDb
FROM DISK = 'D:\Server-Api-BnS-Server\DB\DonationsDb.bak' -- Путь к файлу резервной копии DonationsDb (.bak). -- Path to the DonationsDb backup file (.bak).
WITH
    -- Задаём путь для основного файла данных (.mdf) после восстановления.
    -- Specifies the path for the main data file (.mdf) after restoration.
    MOVE 'DonationsDb' TO 'D:\DataDB\DonationsDb.mdf',
    
    -- Задаём путь для журнала транзакций (.ldf) после восстановления.
    -- Specifies the path for the transaction log file (.ldf) after restoration.
    MOVE 'DonationsDb_log' TO 'D:\DataDB\DonationsDb_log.ldf',

    -- Указываем параметр REPLACE, чтобы заменить существующую базу данных.
    -- The REPLACE option is used to overwrite the existing database, if it exists.
    REPLACE,

    -- Параметр STATS выводит информацию о ходе выполнения операции каждые 10%.
    -- The STATS option displays progress updates every 10%.
    STATS = 10;
GO

-- Возвращаем базу данных DonationsDb в режим многопользовательского доступа.
-- Set the DonationsDb database back to multi-user mode.
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'DonationsDb')
BEGIN
    ALTER DATABASE DonationsDb SET MULTI_USER;
    PRINT 'Database DonationsDb is set to MULTI_USER mode.';
END;
GO
