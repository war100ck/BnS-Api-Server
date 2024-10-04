@echo off
setlocal
call :setESC

:: Clear the console
cls

:: Database connection details
set SERVER=127.0.0.1
set DATABASE=PlatformAcctDb
set USER=SA
set PASSWORD=U6SjJk3ZyQhrv5tq

:: Check if the column exists and add it
sqlcmd -S %SERVER% -d %DATABASE% -U %USER% -P %PASSWORD% -Q "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'WebsitePassword') BEGIN ALTER TABLE Users ADD WebsitePassword NVARCHAR(255) NULL; END"

:: Check the result of the SQL command
if %ERRORLEVEL% NEQ 0 (
    echo %ESC%[31mError: Failed to add WebsitePassword column to Users table. Check SQL Server logs for more details.%ESC%[0m
) else (
    echo %ESC%[32mSuccess: WebsitePassword column successfully added to Users table or it already exists.%ESC%[0m
)

:: Wait for user input before closing
echo.
pause

:: Function to set escape character for ANSI color codes
:setESC
for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do (
  set ESC=%%b
  exit /B 0
)
exit /B 0
