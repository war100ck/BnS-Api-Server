@echo off
SETLOCAL

set "SQL_SERVER=localhost"
set "DB_USER=sa"
set "DB_PASS=U6SjJk3ZyQhrv5tq"

echo ==========================================
echo Deleting databases if they exist...
echo ==========================================

sqlcmd -S %SQL_SERVER% -U %DB_USER% -P %DB_PASS% -Q "IF EXISTS (SELECT 1 FROM sys.databases WHERE name = N'CouponSystemDB') BEGIN ALTER DATABASE [CouponSystemDB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [CouponSystemDB]; PRINT 'CouponSystemDB deleted'; END ELSE PRINT 'CouponSystemDB not found';"

sqlcmd -S %SQL_SERVER% -U %DB_USER% -P %DB_PASS% -Q "IF EXISTS (SELECT 1 FROM sys.databases WHERE name = N'DonationsDb') BEGIN ALTER DATABASE [DonationsDb] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [DonationsDb]; PRINT 'DonationsDb deleted'; END ELSE PRINT 'DonationsDb not found';"

sqlcmd -S %SQL_SERVER% -U %DB_USER% -P %DB_PASS% -Q "IF EXISTS (SELECT 1 FROM sys.databases WHERE name = N'GameItemsDB') BEGIN ALTER DATABASE [GameItemsDB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [GameItemsDB]; PRINT 'GameItemsDB deleted'; END ELSE PRINT 'GameItemsDB not found';"

echo ==========================================
echo Done.
ENDLOCAL
