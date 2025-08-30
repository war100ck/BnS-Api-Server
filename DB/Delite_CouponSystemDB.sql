-- Скрипт безопасного удаления базы данных CouponSystemDB
USE master;
GO

-- Проверяем существование базы данных
IF EXISTS(SELECT * FROM sys.databases WHERE name = 'CouponSystemDB')
BEGIN
    PRINT 'Начинаем процесс удаления базы данных CouponSystemDB...';
    
    -- Пытаемся перевести базу в SINGLE_USER mode с откатом активных подключений
    BEGIN TRY
        ALTER DATABASE CouponSystemDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        PRINT '✓ База данных переведена в SINGLE_USER mode';
    END TRY
    BEGIN CATCH
        PRINT '⚠ Не удалось перевести в SINGLE_USER mode, пробуем продолжить...';
    END CATCH

    -- Пытаемся закрыть все активные подключения
    BEGIN TRY
        DECLARE @kill_connections NVARCHAR(MAX) = N'';
        SELECT @kill_connections += N'KILL ' + CAST(session_id AS NVARCHAR(10)) + ';'
        FROM sys.dm_exec_sessions 
        WHERE database_id = DB_ID('CouponSystemDB');
        
        IF @kill_connections <> N''
        BEGIN
            EXEC sp_executesql @kill_connections;
            PRINT '✓ Активные подключения к базе данных закрыты';
        END
    END TRY
    BEGIN CATCH
        PRINT '⚠ Не удалось закрыть все подключения, пробуем продолжить...';
    END CATCH

    -- Пытаемся удалить базу данных
    BEGIN TRY
        DROP DATABASE IF EXISTS CouponSystemDB;
        PRINT '✓ База данных CouponSystemDB успешно удалена';
    END TRY
    BEGIN CATCH
        PRINT '❌ Ошибка при удалении базы данных: ' + ERROR_MESSAGE();
        
        -- Дополнительная попытка через offline mode
        BEGIN TRY
            PRINT 'Пробуем альтернативный метод удаления...';
            ALTER DATABASE CouponSystemDB SET OFFLINE WITH ROLLBACK IMMEDIATE;
            DROP DATABASE CouponSystemDB;
            PRINT '✓ База данных удалена через OFFLINE mode';
        END TRY
        BEGIN CATCH
            PRINT '❌ Критическая ошибка: ' + ERROR_MESSAGE();
            PRINT 'Возможно, требуется ручное вмешательство или перезагрузка SQL Server';
        END CATCH
    END CATCH
END
ELSE
BEGIN
    PRINT 'База данных CouponSystemDB не существует';
END
GO