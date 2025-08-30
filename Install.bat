@echo off
:: Set text color to green
color 0A

:: Create package.json
echo Creating package.json...
echo { > package.json
echo   "name": "Server API", >> package.json
echo   "version": "1.1", >> package.json
echo   "description": "Server for user registration and login for a gaming server, including profile management and data retrieval.", >> package.json
echo   "main": "ServerApi.js", >> package.json
echo   "scripts": { >> package.json
echo     "start": "node ServerApi" >> package.json
echo   }, >> package.json
echo   "dependencies": { >> package.json
echo     "@fortawesome/fontawesome-free": "^6.7.2", >> package.json
echo     "archiver": "^7.0.1", >> package.json
echo     "argon2": "^0.43.0", >> package.json
echo     "axios": "^1.9.0", >> package.json
echo     "bcrypt": "^5.1.0", >> package.json
echo     "body-parser": "^1.20.2", >> package.json
echo     "bootstrap": "^5.3.3", >> package.json
echo     "bootstrap-icons": "^1.13.1", >> package.json
echo     "chalk": "^5.3.0", >> package.json
echo     "chart.js": "^4.4.0", >> package.json
echo     "cheerio": "^1.1.0-rc.12", >> package.json
echo     "compression": "^1.8.0", >> package.json
echo     "cookie-parser": "^1.4.6", >> package.json
echo     "cors": "^2.8.5", >> package.json
echo     "csurf": "^1.2.2", >> package.json
echo     "discord.js": "^14.19.3", >> package.json
echo     "dotenv": "^16.5.0", >> package.json
echo     "ejs": "^3.1.9", >> package.json
echo     "express": "^4.21.2", >> package.json
echo     "express-rate-limit": "^6.7.0", >> package.json
echo     "express-session": "^1.17.3", >> package.json
echo     "express-validator": "^7.0.1", >> package.json
echo     "helmet": "^8.0.0", >> package.json
echo     "jquery": "^3.7.1", >> package.json
echo     "jsonwebtoken": "^9.0.2", >> package.json
echo     "marked": "^4.3.0", >> package.json
echo     "moment": "^2.29.4", >> package.json
echo     "mssql": "^11.0.1", >> package.json
echo     "multer": "^1.4.5-lts.1", >> package.json
echo     "mysql2": "^3.3.3", >> package.json
echo     "nodemailer": "^6.9.4", >> package.json
echo     "os-utils": "^0.0.14", >> package.json
echo     "pidusage": "^3.0.0", >> package.json
echo     "ps-node": "^0.1.6", >> package.json
echo     "request": "^2.88.2", >> package.json
echo     "serve-favicon": "^2.5.0", >> package.json
echo     "sweetalert2": "^11.6.13", >> package.json
echo     "tedious": "^18.6.1", >> package.json
echo     "winston": "^3.8.2", >> package.json
echo     "xml2js": "^0.6.2" >> package.json
echo   }, >> package.json
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
echo REM echo %%date%% %%time%% - Server started >> server_log.txt >> Start_Api.bat
echo. >> Start_Api.bat
echo :: Kill all previous instances >> Start_Api.bat
echo taskkill /IM node.exe /F ^>nul 2^>^&1 >> Start_Api.bat
echo. >> Start_Api.bat
echo :: Main server start >> Start_Api.bat
echo node --trace-deprecation ServerApi.js >> Start_Api.bat
echo. >> Start_Api.bat
echo echo. >> Start_Api.bat
echo echo [Start_Api] Server stopped. Auto-restarting... >> Start_Api.bat
echo timeout /t 3 /nobreak ^>nul >> Start_Api.bat
echo. >> Start_Api.bat
echo :: Restart in the same window >> Start_Api.bat
echo start "" /B "cmd" /c "Start_Api.bat" >> Start_Api.bat
echo exit >> Start_Api.bat

timeout /t 1 /nobreak > NUL
echo ===============================
echo File creation .... completed
echo ===============================

:: Create Restart_Api.bat
echo Creating Restart_Api.bat...
echo @echo off > Restart_Api.bat
echo @cls >> Restart_Api.bat
echo echo [Restart_Api] Initiating server restart... >> Restart_Api.bat
echo. >> Restart_Api.bat
echo :: Properly terminate all node processes >> Restart_Api.bat
echo taskkill /IM node.exe /F ^>nul 2^>^&1 >> Restart_Api.bat
echo timeout /t 2 /nobreak ^>nul >> Restart_Api.bat
echo. >> Restart_Api.bat
echo :: Start main script without creating new window >> Restart_Api.bat
echo start "" /B "cmd" /c "Start_Api.bat" >> Restart_Api.bat
echo exit >> Restart_Api.bat

timeout /t 1 /nobreak > NUL
echo ===============================
echo File creation .... completed
echo ===============================

:: Create .env
echo Creating .env...
echo # ============================================= > .env
echo # SERVER CONFIGURATION >> .env
echo # ============================================= >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Server Settings >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo # Port number for the server to listen on >> .env
echo PORT=3000 >> .env
echo. >> .env
echo # External service URL >> .env
echo SERVICE_URL=http://127.0.0.1:6605 >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Session Configuration >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo # Session secret: Used to sign session data (replace with your own secret key) >> .env
echo SESSION_SECRET=9f4e85ecdc9bb4038d0a5ed2d20a06f739c6bdb539e217f8252b033e2c3dbd5e >> .env
echo. >> .env
echo # Cookie security: If true, session cookies will only be sent over HTTPS (use true for HTTPS) >> .env
echo SESSION_COOKIE_SECURE=false >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Logging Settings >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo # Path for new user registration logs >> .env
echo LOG_FILE_PATH=registration_log.txt >> .env
echo. >> .env
echo # Enable/Disable console logging (true/false) >> .env
echo LOG_TO_CONSOLE=true >> .env
echo. >> .env
echo # Enable/Disable debug logging (DB queries, detailed info) (true/false) >> .env
echo DEBUG_LOGS=false >> .env
echo. >> .env
echo # Enable/Disable API update logging in console (true/false) >> .env
echo ENABLE_LOGGING=true >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Discord Bot Settings >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo # Enable/Disable Discord bot (true/false) >> .env
echo BOT_ENABLED=false >> .env
echo. >> .env
echo # Discord bot token (replace with your actual token) (https://discord.com/developers/) >> .env
echo DISCORD_BOT_TOKEN=Your Discord Bot Token >> .env
echo. >> .env
echo # ============================================= >> .env
echo # DATABASE CONFIGURATIONS >> .env
echo # ============================================= >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Common database credentials (used for all databases unless overridden) >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo DB_USER=sa >> .env
echo. >> .env
echo DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo DB_SERVER=localhost >> .env
echo. >> .env
echo DB_NAME=PlatformAcctDb >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Platform Account Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo PLATFORM_ACCT_DB_USER=sa >> .env
echo. >> .env
echo PLATFORM_ACCT_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo PLATFORM_ACCT_DB_SERVER=localhost >> .env
echo. >> .env
echo PLATFORM_ACCT_DB_DATABASE=PlatformAcctDb >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Grade Members Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo GRADE_MEMBERS_DB_USER=sa >> .env
echo. >> .env
echo GRADE_MEMBERS_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo GRADE_MEMBERS_DB_SERVER=localhost >> .env
echo. >> .env
echo GRADE_MEMBERS_DB_DATABASE=GradeMembersDb >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Ban Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo BAN_DB_USER=sa >> .env
echo. >> .env
echo BAN_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo BAN_DB_SERVER=localhost >> .env
echo. >> .env
echo BAN_DB_DATABASE=BanDb >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # BL Game Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo BLGAME_DB_USER=sa >> .env
echo. >> .env
echo BLGAME_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo BLGAME_DB_SERVER=localhost >> .env
echo. >> .env
echo BLGAME_DB_DATABASE=BLGAME >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Virtual Currency Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo VIRTUAL_CURRENCY_DB_USER=sa >> .env
echo. >> .env
echo VIRTUAL_CURRENCY_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo VIRTUAL_CURRENCY_DB_SERVER=localhost >> .env
echo. >> .env
echo VIRTUAL_CURRENCY_DB_DATABASE=VirtualCurrencyDb >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Game Warehouse Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo GAME_WAREHOUSE_DB_USER=sa >> .env
echo. >> .env
echo GAME_WAREHOUSE_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo GAME_WAREHOUSE_DB_SERVER=localhost >> .env
echo. >> .env
echo GAME_WAREHOUSE_DB_DATABASE=GameWarehouseDB >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Level Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo LEVEL_DB_USER=sa >> .env
echo. >> .env
echo LEVEL_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo LEVEL_DB_SERVER=localhost >> .env
echo. >> .env
echo LEVEL_DB_DATABASE=LevelDb >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Game Items Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo GAME_ITEMS_DB_USER=sa >> .env
echo. >> .env
echo GAME_ITEMS_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo GAME_ITEMS_DB_SERVER=localhost >> .env
echo. >> .env
echo GAME_ITEMS_DB_DATABASE=GameItemsDB >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Lobby Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo LOBBY_DB_USER=sa >> .env
echo. >> .env
echo LOBBY_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo LOBBY_DB_SERVER=localhost >> .env
echo. >> .env
echo LOBBY_DB_DATABASE=LobbyDB >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Donations Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo DONATIONS_DB_USER=sa >> .env
echo. >> .env
echo DONATIONS_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo DONATIONS_DB_SERVER=localhost >> .env
echo. >> .env
echo DONATIONS_DB_DATABASE=DonationsDb >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Promotion Stamp Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo PROMOTION_STAMP_DB_USER=sa >> .env
echo. >> .env
echo PROMOTION_STAMP_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo PROMOTION_STAMP_DB_SERVER=localhost >> .env
echo. >> .env
echo PROMOTION_STAMP_DB_DATABASE=PromotionStampDb >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Promotion Role Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo ROLE_DB_USER=sa >> .env
echo. >> .env
echo ROLE_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo ROLE_DB_SERVER=localhost >> .env
echo. >> .env
echo ROLE_DB_DATABASE=RoleDb >> .env
echo. >> .env
echo # ---------------------------- >> .env
echo # Coupon System Database >> .env
echo # ---------------------------- >> .env
echo. >> .env
echo COUPON_SYSTEM_DB_USER=sa >> .env
echo. >> .env
echo COUPON_SYSTEM_DB_PASSWORD=U6SjJk3ZyQhrv5tq >> .env
echo. >> .env
echo COUPON_SYSTEM_DB_SERVER=localhost >> .env
echo. >> .env
echo COUPON_SYSTEM_DB_DATABASE=CouponSystemDB >> .env
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