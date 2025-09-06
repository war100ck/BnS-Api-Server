@echo off
SETLOCAL

REM --- SQL Server connection settings ---
set "SQL_SERVER=localhost"
set "DB_USER=sa"
set "DB_PASS=U6SjJk3ZyQhrv5tq"

REM --- Folder with SQL scripts ---
set "SQL_PATH=%~dp0"

REM --- Переменная для отслеживания успешности ---
set SUCCESS=true

echo ==========================================
echo Restoring databases from SQL scripts...
echo ==========================================

echo Running Donate.sql...
sqlcmd -S %SQL_SERVER% -U %DB_USER% -P %DB_PASS% -i "%SQL_PATH%Donate.sql"
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to restore Donate.sql
    set SUCCESS=false
) ELSE (
    echo [OK] Donate.sql executed successfully
)

echo Running GameItems.sql...
sqlcmd -S %SQL_SERVER% -U %DB_USER% -P %DB_PASS% -i "%SQL_PATH%GameItems.sql"
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to restore GameItems.sql
    set SUCCESS=false
) ELSE (
    echo [OK] GameItems.sql executed successfully
)

echo Running CouponSystem.sql...
sqlcmd -S %SQL_SERVER% -U %DB_USER% -P %DB_PASS% -i "%SQL_PATH%CouponSystem.sql"
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to restore CouponSystem.sql
    set SUCCESS=false
) ELSE (
    echo [OK] CouponSystem.sql executed successfully
)

echo ==========================================
if "%SUCCESS%"=="true" (
    echo All databases restored successfully.
) else (
    echo Some databases failed to restore. Check errors above.
)
echo ==========================================

:: Добавляем финальное сообщение для веб-интерфейса
echo WEB_INTERFACE_COMPLETE: %SUCCESS%

:: Завершаем без ожидания (убираем pause)
exit /B %ERRORLEVEL%
