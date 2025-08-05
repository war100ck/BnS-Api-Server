import express from 'express';
import sql from 'mssql';
import chalk from 'chalk';
import { configPlatformAcctDb, configBlGame } from '../config/dbConfig.js';
import { isAdmin } from '../middleware/adminMiddleware.js';
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

// Страница входа
router.get('/admin/login', (req, res) => {
    log.debug(`Rendering login page`);
    res.render('adminLogin', {
        errorMessage: req.query.error || null,
        pathname: req.originalUrl
    });
});

// Обработка входа
router.post('/admin/login', async(req, res) => {
    const { username, password } = req.body;
    log.debug(`Login attempt for username: ${chalk.cyan(username)}`);

    try {
        const result = await executeQuery(
                configPlatformAcctDb,
                'SELECT UserId, UserName, WebsitePassword, admin FROM dbo.Users WHERE UserName = @username', {
                username
            });

        const user = result.recordset[0];

        if (!user || user.WebsitePassword !== password) {
            log.auth(username, false);
            log.warning(`Invalid credentials for username: ${chalk.cyan(username)}`);
            return res.render('adminLogin', {
                errorMessage: 'Invalid username or password',
                pathname: req.originalUrl
            });
        }

        req.session.user = {
            id: user.UserId,
            username: user.UserName,
            admin: user.admin
        };

        if (user.admin) {
            log.auth(username, true, true);
            log.adminAction(`User logged in to admin panel`, req.session.user);
            return res.redirect('/admin');
        }

        log.auth(username, true, false);
        log.warning(`Regular user attempted admin access: ${chalk.cyan(user.UserName)}`);
        res.render('adminLogin', {
            errorMessage: 'Administrator access only',
            pathname: req.originalUrl
        });
    } catch (err) {
        log.error(`Login process failed: ${chalk.red(err.message)}`);
        res.status(500).render('adminLogin', {
            errorMessage: 'Server error during authentication',
            pathname: req.originalUrl
        });
    }
});

// Главная страница админки
router.get('/admin', isAdmin, async(req, res) => {
    log.debug(`Admin dashboard accessed by: ${formatAdminStatus(true)} ${chalk.magenta(req.session.user.username)}`);

    try {
        // Получаем пользователей
        const usersResult = await executeQuery(
                configPlatformAcctDb,
                'SELECT UserId, UserName, admin FROM dbo.Users ORDER BY UserId');

        // Статистика по существам (если доступна БД)
        let creatureStats = {
            count: 0,
            deleted: 0
        };
        try {
            const [creatureResult, deletedResult] = await Promise.all([
                        executeQuery(configBlGame, 'SELECT COUNT(*) AS count FROM CreatureProperty'),
                        executeQuery(configBlGame, 'SELECT COUNT(*) AS count FROM CreatureProperty WHERE deletion = 1')
                    ]);

            creatureStats = {
                count: creatureResult.recordset[0]?.count || 0,
                deleted: deletedResult.recordset[0]?.count || 0
            };
            log.db(`Creature stats loaded: ${chalk.green(creatureStats.count)} total, ${chalk.red(creatureStats.deleted)} deleted`);
        } catch (dbError) {
            log.warning(`Game DB unavailable: ${chalk.yellow(dbError.message)}`);
        }

        log.success(`Admin dashboard rendered for: ${formatAdminStatus(true)} ${chalk.magenta(req.session.user.username)}`);
        res.render('admin', {
            users: usersResult.recordset,
            creatureCount: creatureStats.count,
            deletedCreatureCount: creatureStats.deleted,
            totalUsers: usersResult.recordset.length,
            pathname: req.originalUrl,
            user: req.session.user
        });
    } catch (err) {
        log.error(`Failed to load admin dashboard: ${chalk.red(err.message)}`);
        res.status(500).render('error', {
            message: 'Failed to load admin dashboard',
            error: err,
            pathname: req.originalUrl
        });
    }
});

// Обновление статуса администратора
router.post('/admin/update-admin-status', isAdmin, async(req, res) => {
    const { userId, admin } = req.body;
    const isAdminStatus = admin === '1';
    const currentUser = req.session.user;

    log.adminAction(`Attempting to change admin status for user ID ${chalk.cyan(userId)} to ${isAdminStatus ? chalk.green('ADMIN') : chalk.blue('USER')}`, currentUser);

    try {
        const userResult = await executeQuery(
                configPlatformAcctDb,
                'SELECT UserName FROM dbo.Users WHERE UserId = @userId', {
                userId
            });

        if (!userResult.recordset.length) {
            log.warning(`User not found: ID ${chalk.red(userId)}`);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const targetUsername = userResult.recordset[0].UserName;

        await executeQuery(
            configPlatformAcctDb,
            'UPDATE dbo.Users SET admin = @isAdmin WHERE UserId = @userId', {
            userId,
            isAdmin: isAdminStatus ? 1 : 0
        });

        log.adminAction(`Changed admin status for ${formatAdminStatus(isAdminStatus)} ${chalk.cyan(targetUsername)} (ID: ${chalk.yellow(userId)})`, currentUser);

        res.json({
            success: true,
            message: 'Admin status updated successfully',
            user: {
                id: userId,
                username: targetUsername,
                admin: isAdminStatus
            },
            changedBy: currentUser.username,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        log.error(`Failed to update admin status: ${chalk.red(err.message)}`);
        res.status(500).json({
            success: false,
            message: 'Failed to update admin status',
            error: err.message
        });
    }
});

// Поиск пользователей
router.get('/admin/search', isAdmin, async(req, res) => {
    const { term } = req.query;
    const currentUser = req.session.user;

    if (!term) {
        log.debug(`Empty search request from ${formatAdminStatus(true)} ${chalk.magenta(currentUser.username)}`);
        return res.json([]);
    }

    log.debug(`Search initiated by ${formatAdminStatus(true)} ${chalk.magenta(currentUser.username)}: "${chalk.yellow(term)}"`);

    try {
        const result = await executeQuery(
                configPlatformAcctDb,
                'SELECT UserId, UserName, admin FROM dbo.Users WHERE UserName LIKE @term ORDER BY UserName', {
                term: `%${term}%`
            });

        log.success(`Found ${chalk.green(result.recordset.length)} users for search "${chalk.yellow(term)}"`);
        res.json(result.recordset);
    } catch (err) {
        log.error(`Search failed: ${chalk.red(err.message)}`);
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: err.message
        });
    }
});

// Выход
router.get('/admin/logout', isAdmin, (req, res) => {
    const user = req.session.user;
    log.debug(`Logout initiated for ${formatAdminStatus(true)} ${chalk.magenta(user.username)}`);

    req.session.destroy(err => {
        if (err) {
            log.error(`Logout failed for ${formatAdminStatus(true)} ${chalk.magenta(user.username)}: ${chalk.red(err.message)}`);
            return res.status(500).send('Logout failed');
        }
        log.auth(user.username, true, user.admin);
        log.adminAction(`User logged out`, user);
        res.redirect('/admin/login');
    });
});

export default router;
