@echo off
:: Set text color to green
color 0A

:: Create package.json
echo Creating package.json...
echo { > package.json
echo   "name": "Server API", >> package.json
echo   "version": "1.0.0", >> package.json
echo   "description": "Server for user registration and login for a gaming server, including profile management and data retrieval.", >> package.json
echo   "main": "server.js", >> package.json
echo   "scripts": { >> package.json
echo     "start": "node server.js" >> package.json
echo   }, >> package.json
echo   "dependencies": { >> package.json
echo     "express": "latest", >> package.json
echo     "mssql": "latest", >> package.json
echo     "dotenv": "latest", >> package.json
echo     "axios": "latest", >> package.json
echo     "cors": "latest", >> package.json
echo     "ejs": "latest", >> package.json
echo     "argon2": "latest", >> package.json
echo     "bcrypt": "latest", >> package.json
echo     "chalk": "latest", >> package.json
echo     "express-session": "latest", >> package.json
echo     "mysql2": "latest", >> package.json
echo     "os-utils":"latest", >> package.json
echo     "pidusage": "latest" >> package.json
echo   }, >> package.json
echo   "devDependencies": {}, >> package.json
echo   "engines": { >> package.json
echo     "node": ">=14.0.0" >> package.json
echo   }, >> package.json
echo   "license": "MIT", >> package.json
echo   "type": "module" >> package.json
echo } >> package.json
timeout /t 1 /nobreak > NUL
echo ===============================
echo File creation .... completed
echo ===============================

:: Create Start_Api.bat
echo Creating Start_Api.bat...
echo @echo off > Start_Api.bat
echo @cls >> Start_Api.bat
echo Color 03 >> Start_Api.bat 
echo echo. >> Start_Api.bat
echo set NODE_NO_WARNINGS=1 >> Start_Api.bat
echo node --trace-deprecation ServerApi.js >> Start_Api.bat
echo pause >> Start_Api.bat

timeout /t 1 /nobreak > NUL
echo ===============================
echo File creation .... completed
echo ===============================

:: Create .env
echo Creating .env...
echo # Порт для сервера > .env
echo PORT=3000 >> .env
echo. >> .env
echo # Настройки для PlatformAcctDb >> .env
echo PLATFORM_ACCT_DB_USER=sa >> .env
echo PLATFORM_ACCT_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo PLATFORM_ACCT_DB_SERVER=localhost >> .env
echo PLATFORM_ACCT_DB_DATABASE=PlatformAcctDb >> .env
echo. >> .env
echo # Настройки для BlGame >> .env
echo BLGAME_DB_USER=sa >> .env
echo BLGAME_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo BLGAME_DB_SERVER=localhost >> .env
echo BLGAME_DB_DATABASE=BlGame >> .env
echo. >> .env
echo # Настройки для VirtualCurrencyDb >> .env
echo VIRTUAL_CURRENCY_DB_USER=sa >> .env
echo VIRTUAL_CURRENCY_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo VIRTUAL_CURRENCY_DB_SERVER=localhost >> .env
echo VIRTUAL_CURRENCY_DB_DATABASE=VirtualCurrencyDb >> .env
echo. >> .env
echo # Настройки для LobbyDB >> .env
echo LOBBY_DB_USER=sa >> .env
echo LOBBY_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo LOBBY_DB_SERVER=localhost >> .env
echo LOBBY_DB_DATABASE=LobbyDB >> .env
echo. >> .env
echo # Конфигурация базы данных (Web) >> .env
echo DB_USER=sa >> .env
echo DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo DB_SERVER=localhost >> .env
echo DB_NAME=PlatformAcctDb >> .env
echo. >> .env
echo # Внешний сервис >> .env
echo SERVICE_URL=http://127.0.0.1:6605 >> .env
echo. >> .env
echo # Логи >> .env
echo LOG_FILE_PATH=registration_log.txt >> .env
echo. >> .env
echo # Вкл/Откл. Логирования в консоли >> .env
echo LOG_TO_CONSOLE=true >> .env
echo. >> .env
echo # Секрет для сессий: Используется для подписи сессионных данных (не забудьте заменить на свой собственный секретный ключ) >> .env
echo SESSION_SECRET=9f4e85ecdc9bb4038d0a5ed2d20a06f739c6bdb539e217f8252b033e2c3dbd5e >> .env
echo. >> .env
echo # Безопасность cookie: Если true, сессионные cookie будут передаваться только по HTTPS (используйте true для HTTPS) >> .env
echo SESSION_COOKIE_SECURE=false >> .env
timeout /t 1 /nobreak > NUL
echo ===============================
echo File creation .... completed
echo ===============================

:: Install dependencies
echo Installing dependencies...
npm install
timeout /t 1 /nobreak > NUL
echo ===============================
echo Dependencies installation .... completed
echo ===============================

echo.
echo Installation completed!
pause
