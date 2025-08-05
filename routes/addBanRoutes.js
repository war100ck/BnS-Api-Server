// routes/addBanRoutes.js
import express from 'express';
import sql from 'mssql';
import { configPlatformAcctDb, configBanDb } from '../config/dbConfig.js';
import { isAdmin } from '../middleware/adminMiddleware.js';
import path from 'path';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Настройки логирования из .env
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE === 'true'; // Основные логи (ошибки, авторизация, важные события)
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true'; // Отладочные логи (запросы к БД, подробная информация)

// Функция для форматирования статуса администратора
const formatAdminStatus = (status) => {
    return status
     ? chalk.bgGreen.white.bold(' ADMIN ')
     : chalk.bgBlue.white.bold(' USER ');
};

// Настройки цветов для логов
const log = {
    // Основные логи (включаются при LOG_TO_CONSOLE=true)
    error: (message) => LOG_TO_CONSOLE && console.log(chalk.red(`[ERROR] ${message}`)),
    warning: (message) => LOG_TO_CONSOLE && console.log(chalk.yellow(`[WARNING] ${message}`)),
    auth: (username, success, admin = false) => {
        if (!LOG_TO_CONSOLE)
            return;
        const status = success
             ? chalk.bgGreen.white.bold(' SUCCESS ')
             : chalk.bgRed.white.bold(' FAILED ');
        const role = admin
             ? chalk.magenta('ADMIN')
             : chalk.blue('USER');
        console.log(`${chalk.yellow(`[AUTH]`)} ${status} ${role} ${chalk.cyan(username)}`);
    },
    adminAction: (message, user = null) => {
        if (!LOG_TO_CONSOLE)
            return;
        const userInfo = user
             ? `${formatAdminStatus(user.admin)} ${chalk.magenta(user.username)} (ID: ${chalk.cyan(user.id)})`
             : '';
        console.log(chalk.magenta(`[ADMIN] ${message} ${userInfo}`));
    },

    // Отладочные логи (включаются при DEBUG_LOGS=true)
    info: (message) => DEBUG_LOGS && console.log(chalk.blue(`[INFO] ${message}`)),
    success: (message) => DEBUG_LOGS && console.log(chalk.green(`[SUCCESS] ${message}`)),
    db: (message) => DEBUG_LOGS && console.log(chalk.cyan(`[DB] ${message}`)),
    debug: (message) => DEBUG_LOGS && console.log(chalk.gray(`[DEBUG] ${message}`))
};

// Функция для работы с БД
async function executeQuery(config, query, inputs = {}) {
    let pool = null;
    try {
        pool = await sql.connect(config);
        const request = pool.request();

        Object.entries(inputs).forEach(([name, value]) => {
            request.input(name, value);
        });

        log.db(`Executing query: ${chalk.yellow(query.substring(0, 50))}...`);
        const result = await request.query(query);
        log.db(`Query completed successfully`);
        return result;
    } catch (err) {
        log.error(`Database error: ${chalk.red(err.message)}\nQuery: ${chalk.yellow(query)}`);
        throw err;
    } finally {
        if (pool) {
            try {
                await pool.close();
                log.debug(`Connection pool closed`);
            } catch (err) {
                log.error(`Connection close error: ${chalk.red(err.message)}`);
            }
        }
    }
}

// Функция для проверки существования UserId и получения имени пользователя
async function check_user_id(userId) {
    let pool;
    try {
        log.debug(`Checking user ID: ${chalk.cyan(userId)}`);
        pool = await sql.connect(configPlatformAcctDb);
        const result = await pool.request()
            .input('userId', sql.VarChar, userId)
            .query('SELECT UserId, UserName FROM Users WHERE UserId = @userId');
        
        if (result.recordset.length > 0) {
            log.success(`User found: ${chalk.cyan(result.recordset[0].UserName)} (ID: ${chalk.yellow(userId)})`);
            return result.recordset[0];
        } else {
            log.warning(`User not found: ID ${chalk.red(userId)}`);
            return null;
        }
    } catch (err) {
        log.error(`Error checking user ID: ${chalk.red(err.message)}`);
        throw err;
    } finally {
        if (pool) {
            await pool.close();
            log.debug(`Connection pool closed for user check`);
        }
    }
}

async function getCurrentVersion() {
    try {
        log.debug('Fetching current BanSrv version');
        const response = await axios.get('http://127.0.0.1:6605/apps-state');
        const xmlData = response.data;
        const parsedData = await parseStringPromise(xmlData);

        const apps = parsedData?.Info?.Apps?.[0]?.App;
        let version = null;

        for (const app of apps) {
            if (app?.AppName?.[0] === "BanSrv") {
                const instances = app?.Instances?.[0]?.Instance;
                if (instances && instances.length > 0) {
                    version = instances[0]?.Epoch?.[0];
                    break;
                }
            }
        }

        if (!version) {
            log.error('Version not found for BanSrv');
            throw new Error('Version not found for BanSrv');
        }

        log.debug(`Current BanSrv version: ${chalk.green(version)}`);
        return version;
    } catch (error) {
        log.error(`Error fetching current version: ${chalk.red(error.message)}`);
        throw new Error('Failed to fetch current version');
    }
}

async function restartService(version) {
    try {
        log.info(`Attempting to restart BanSrv service (version: ${version})`);
        const stopUrl = `http://127.0.0.1:6605/apps/1108.1.1.${version}/stop?_method=post`;
        await axios.post(stopUrl);
        log.adminAction('BanSrv service has been successfully restarted and will be available in 3 minutes');
    } catch (error) {
        log.error(`Error restarting service: ${chalk.red(error.message)}`);
        throw error;
    }
}

router.get('/admin/add-ban', isAdmin, async(req, res) => {
    const { userId } = req.query;
    const currentUser = req.session.user;

    if (!userId) {
        log.warning(`Missing UserId value in request from ${formatAdminStatus(true)} ${chalk.magenta(currentUser.username)}`);
        return res.status(400).send('Missing UserId value');
    }

    log.debug(`Accessing ban management for user ID: ${chalk.cyan(userId)}`, currentUser);

    const userData = await check_user_id(userId);
    if (!userData) {
        log.warning(`User not found: ID ${chalk.red(userId)}`);
        return res.send('User with this ID not found.');
    }

    let bans = [];
    let banReasons = [];
    let pool;

    try {
        pool = await sql.connect(configBanDb);

        const banResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query(`
               SELECT 
               B.BanId, 
               B.EffectiveFrom, 
               B.EffectiveTo, 
               R.BanReason AS BanReason,
               B.UnbanStatus
               FROM [dbo].[BannedUsers] AS B
               LEFT JOIN [dbo].[BanPolicies] AS P ON B.BanPolicyId = P.BanPolicyId
               LEFT JOIN [dbo].[BanReasons] AS R ON P.BanReasonCode = R.BanReasonCode
               LEFT JOIN [dbo].[BannedUserExtensions] AS BE ON B.BanId = BE.BanId
               WHERE B.UserId = @userId;
            `);

        bans = banResult.recordset || [];
        log.debug(`Found ${chalk.green(bans.length)} bans for user ${chalk.cyan(userData.UserName)}`);

        const reasonResult = await pool.request().query(`
            SELECT BanReasonCode, BanReason 
            FROM [dbo].[BanReasons];
        `);

        banReasons = reasonResult.recordset || [];
        log.debug(`Loaded ${chalk.green(banReasons.length)} ban reasons`);
    } catch (error) {
        log.error(`Error while receiving ban data: ${chalk.red(error.message)}`);
    } finally {
        if (pool) {
            await pool.close();
            log.debug('Connection pool closed for ban data');
        }
    }

    res.render('addBan', {
        userId,
        userName: userData.UserName,
        bans,
        banReasons,
        pathname: req.path
    });
});

router.post('/admin/add-ban', isAdmin, async(req, res) => {
    const { userId, reason, duration } = req.body;
    const currentUser = req.session.user;

    if (!userId || !reason || !duration) {
        log.warning(`Missing parameters in ban request from ${formatAdminStatus(true)} ${chalk.magenta(currentUser.username)}`);
        return res.status(400).send('Please provide userId, ban reason and duration');
    }

    log.adminAction(`Banning user ID: ${chalk.cyan(userId)} (Reason: ${reason}, Duration: ${duration})`, currentUser);

    let pool;
    try {
        pool = await sql.connect(configBanDb);

        const policyResult = await pool.request()
            .input('BanReasonCode', sql.Int, reason)
            .query(`
                SELECT BanPolicyId
                FROM [dbo].[BanPolicies]
                WHERE BanReasonCode = @BanReasonCode;
            `);

        const banPolicyId = policyResult.recordset.length > 0 ? policyResult.recordset[0].BanPolicyId : 3;
        log.debug(`Using ban policy ID: ${chalk.yellow(banPolicyId)}`);

        const EffectiveFrom = new Date().toISOString();
        let EffectiveTo;

        if (duration === 'permanent') {
            EffectiveTo = new Date(new Date().setFullYear(new Date().getFullYear() + 70)).toISOString();
            log.adminAction(`Applying PERMANENT ban to user ID: ${chalk.cyan(userId)}`, currentUser);
        } else {
            EffectiveTo = new Date(new Date().getTime() + parseInt(duration) * 60 * 60 * 1000).toISOString();
            log.adminAction(`Applying TEMPORARY ban (${duration} hours) to user ID: ${chalk.cyan(userId)}`, currentUser);
        }

        await pool.request()
        .input('UserId', sql.UniqueIdentifier, userId)
        .input('AppGroupId', sql.Int, 2)
        .input('BanPolicyId', sql.Int, banPolicyId)
        .input('EffectiveFrom', sql.DateTimeOffset, EffectiveFrom)
        .input('EffectiveTo', sql.DateTimeOffset, EffectiveTo)
        .query(`
                INSERT INTO [dbo].[BannedUsers] 
                ([UserId], [AppGroupId], [BanPolicyId], [EffectiveFrom], [EffectiveTo], [UnbanStatus], [UnbanStatusChanged]) 
                VALUES 
                (@UserId, @AppGroupId, @BanPolicyId, @EffectiveFrom, @EffectiveTo, 1, @EffectiveFrom);

                DECLARE @BanId INT = SCOPE_IDENTITY();

                INSERT INTO [dbo].[BannedUserExtensions]
                (BanId, UnbannerType, UnbannerLoginName, Unbanned, EffectiveUntil, IsAccumulative, 
                 RegistrarPriorityLevel, RegistrarType, RegistrarLoginName, RegistrarMemo, Registered, WorldCode, CharName)
                VALUES
                (@BanId, 0, 'accountadmin', NULL, SYSDATETIMEOFFSET(), 0, 0, 1, 'accountadmin', 'undefined', SYSDATETIMEOFFSET(), NULL, NULL);
            `);

        log.adminAction(`Ban successfully applied to user ID: ${chalk.cyan(userId)}`, currentUser);

        const currentVersion = await getCurrentVersion();
        await restartService(currentVersion);

        res.send(duration === 'permanent' ? 'The user is permanently blocked' : 'User blocked');
    } catch (err) {
        log.error(`Failed to apply ban: ${chalk.red(err.message)}`);
        res.status(500).send('There was an error adding the ban.');
    } finally {
        if (pool) {
            await pool.close();
            log.debug('Connection pool closed after ban operation');
        }
    }
});

router.post('/admin/unban-user', isAdmin, async(req, res) => {
    const { userId, banId, userName } = req.body;
    const currentUser = req.session.user;

    if (!userId || !banId) {
        log.warning(`Missing parameters in unban request from ${formatAdminStatus(true)} ${chalk.magenta(currentUser.username)}`);
        return res.status(400).send('Please provide userId and banId');
    }

    log.adminAction(`Unbanning user: ${chalk.cyan(userName || 'Unknown')} (ID: ${userId}, BanID: ${banId})`, currentUser);

    let pool;
    try {
        pool = await sql.connect(configBanDb);

        await pool.request()
            .input('BanId', sql.Int, banId)
            .input('UserId', sql.UniqueIdentifier, userId)
            .query(`
                UPDATE [dbo].[BannedUsers]
                SET UnbanStatus = 3, UnbanStatusChanged = SYSDATETIMEOFFSET()
                WHERE BanId = @BanId AND UserId = @UserId;
            `);

        log.adminAction(`User ${chalk.cyan(userName || 'Unknown')} (ID: ${chalk.yellow(userId)}) successfully UNBANNED`, currentUser);

        const currentVersion = await getCurrentVersion();
        await restartService(currentVersion);

        res.send('User has been unbanned successfully');
    } catch (err) {
        log.error(`Failed to unban user: ${chalk.red(err.message)}`);
        res.status(500).send('There was an error unbanning the user.');
    } finally {
        if (pool) {
            await pool.close();
            log.debug('Connection pool closed after unban operation');
        }
    }
});

// Маршрут для перезапуска сервиса
router.post('/admin/restart-service', isAdmin, async(req, res) => {
    const currentUser = req.session.user;
    log.adminAction('Restarting BanSrv service', currentUser);

    try {
        const currentVersion = await getCurrentVersion();
        await restartService(currentVersion);
        log.adminAction('BanSrv service restarted successfully', currentUser);
        res.sendStatus(200);
    } catch (err) {
        log.error(`Failed to restart service: ${chalk.red(err.message)}`);
        res.status(500).send('There was an error restarting the service.');
    }
});

export default router;