@echo off
setlocal
call :setESC

:: Очистка консоли
cls

:: Заголовок скрипта с цветом
echo %ESC%[36m==========================================
echo     Database Column Addition Script     
echo ==========================================%ESC%[0m

:: Данные для подключения к базе данных
set SERVER=127.0.0.1
set DATABASE=PlatformAcctDb
set USER=sa
set PASSWORD=U6SjJk3ZyQhrv5tq

:: Переменная для отслеживания успешности выполнения
set SUCCESS=true

:: Добавление столбца 'WebsitePassword', если его нет
echo %ESC%[33mChecking if 'WebsitePassword' column exists...%ESC%[0m
sqlcmd -S %SERVER% -d %DATABASE% -U %USER% -P %PASSWORD% -Q "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'WebsitePassword') BEGIN ALTER TABLE Users ADD WebsitePassword NVARCHAR(255) NULL; END"
if %ERRORLEVEL% NEQ 0 (
    echo %ESC%[31mError: Failed to add 'WebsitePassword' column%ESC%[0m
    set SUCCESS=false
) else (
    echo %ESC%[32mResult of WebsitePassword check: WebsitePassword%ESC%[0m
    echo %ESC%[32mSuccess: Column 'WebsitePassword' successfully added.%ESC%[0m
)

:: Добавление столбца 'admin', если его нет
echo %ESC%[33mChecking if 'admin' column exists...%ESC%[0m
sqlcmd -S %SERVER% -d %DATABASE% -U %USER% -P %PASSWORD% -Q "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'admin') BEGIN ALTER TABLE Users ADD admin BIT NOT NULL DEFAULT 0; END"
if %ERRORLEVEL% NEQ 0 (
    echo %ESC%[31mError: Failed to add 'admin' column%ESC%[0m
    set SUCCESS=false
) else (
    echo %ESC%[32mResult of admin check: admin%ESC%[0m
    echo %ESC%[32mSuccess: Column 'admin' successfully added.%ESC%[0m
)

:: Завершающее сообщение с цветом
echo %ESC%[36m==========================================
if "%SUCCESS%"=="true" (
    echo        Column Addition Complete        
    echo %ESC%[32mAll operations completed successfully%ESC%[0m
) else (
    echo        Column Addition Failed        
    echo %ESC%[31mSome operations failed. Check errors above.%ESC%[0m
)
echo ==========================================%ESC%[0m

:: Добавляем финальное сообщение для веб-интерфейса
echo WEB_INTERFACE_COMPLETE: %SUCCESS%

:: Завершаем без ожидания (убираем pause)
exit /B %ERRORLEVEL%

:: Функция для установки escape-последовательности (ANSI-коды)
:setESC
for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do (
  set ESC=%%b
  exit /B 0
)