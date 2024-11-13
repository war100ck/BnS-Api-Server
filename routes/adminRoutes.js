// routes/adminRoutes.js
import express from 'express';
import sql from 'mssql';
import chalk from 'chalk';
import { configPlatformAcctDb, configBlGame } from '../config/dbConfig.js';
import { isAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Обработчик маршрута для отображения страницы входа администратора
router.get('/admin/login', (req, res) => {
    const errorMessage = req.query.error || null;
    res.render('adminLogin', { errorMessage });
});

// Обработчик маршрута для обработки входа администратора
router.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    let pool = null;

    try {
        pool = await sql.connect(configPlatformAcctDb);
        const userResult = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT UserId, UserName, WebsitePassword, admin FROM Users WHERE UserName = @username');
        const user = userResult.recordset[0];

        if (!user || user.WebsitePassword !== password) {
            return res.render('adminLogin', { errorMessage: 'Invalid login or password' });
        }

        req.session.user = {
            id: user.UserId,
            username: user.UserName,
            admin: user.admin
        };

        if (user.admin) {
            if (process.env.LOG_TO_CONSOLE === 'true') {
                console.log(chalk.green(`POST /admin/login: Admin `) + 
            chalk.red.bold(username) + 
            chalk.green(' logged in successfully.'));
            }
            if (!req.session.adminLoggedIn) {
                console.log(chalk.green(`GET /admin: Rendering admin page for the first time, displaying users.`));
                req.session.adminLoggedIn = true;  // Устанавливаем флаг, что админ уже вошел
            }
            res.redirect('/admin');
        } else {
            if (process.env.LOG_TO_CONSOLE === 'true') {
                console.log(chalk.yellow(`POST /admin/login: User ${username} tried to log in as admin.`));
            }
            res.render('adminLogin', { errorMessage: 'This panel is for administrators only!' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

// Защита маршрута /admin
router.get('/admin', isAdmin, async (req, res) => {
    let platformPool = null;
    let gamePool = null;

    try {
        platformPool = await sql.connect(configPlatformAcctDb);
        const usersResult = await platformPool.request().query('SELECT UserId, UserName, admin FROM Users ORDER BY UserId');
        
        // Убираем логирование рендера страницы, не выводим логи
        // if (process.env.LOG_TO_CONSOLE === 'true' && req.session.adminLoggedIn) {
        //     console.log(chalk.green(`GET /admin: Rendering admin page, displaying ${totalUsers} users.`));
        // }

        await platformPool.close();
        platformPool = null;

        gamePool = await sql.connect(configBlGame);
        const creatureCountResult = await gamePool.request().query('SELECT COUNT(name) AS CreatureCount FROM CreatureProperty');
        const deletedCreatureCountResult = await gamePool.request().query('SELECT COUNT(name) AS DeletedCreatureCount FROM CreatureProperty WHERE deletion = 1');
        
        res.render('admin', {
            users: usersResult.recordset,
            creatureCount: creatureCountResult.recordset[0].CreatureCount,
            deletedCreatureCount: deletedCreatureCountResult.recordset[0].DeletedCreatureCount,
            totalUsers: usersResult.recordset.length, // Убираем пагинацию
            pathname: req.originalUrl
        });
    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).send('Server error');
    } finally {
        if (platformPool) await platformPool.close();
        if (gamePool) await gamePool.close();
    }
});

// Обработчик маршрута для обновления статуса администратора
router.post('/admin/update-admin-status', async (req, res) => {
    const { userId, admin } = req.body;
    const isAdmin = admin === '1' ? 1 : 0;
    let pool = null;

    try {
        // Получаем никнейм пользователя для отображения в логе
        pool = await sql.connect(configPlatformAcctDb);
        const userResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query('SELECT UserName FROM Users WHERE UserId = @userId');
        
        const userName = userResult.recordset[0]?.UserName || 'Unknown User';
        const roleNameConsole = isAdmin ? chalk.red('Admin') : chalk.green('User'); // для консоли с цветом
        const roleNameResponse = isAdmin ? 'Admin' : 'User'; // для ответа без цвета

        // Логирование с никнеймом пользователя
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(chalk.blue(`POST /admin/update-admin-status: `) + 
                        `Updating role for user ${chalk.bold.cyan(userName)} ` + 
                        `(ID: ${chalk.yellow(userId)}) to ${roleNameConsole}`);
        }

        // Обновляем статус
        await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .input('isAdmin', sql.SmallInt, isAdmin)
            .query('UPDATE Users SET admin = @isAdmin WHERE UserId = @userId');

        // Логирование успешного обновления
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(chalk.green(`POST /admin/update-admin-status: `) + 
                        `Role for user ${chalk.bold.cyan(userName)} ` + 
                        `(ID: ${chalk.yellow(userId)}) successfully updated to ${roleNameConsole}.`);
        }

        // Отправка ответа на клиент без цветовых кодов
        res.status(200).json({ message: `Role for user ${userName} successfully updated to ${roleNameResponse}.` });
    } catch (err) {
        // Логирование ошибки
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(chalk.red(`Error updating user role for user ${chalk.bold(userId)}: ${err.message}`));
        }
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (pool) await pool.close();
    }
});

// Обработчик маршрута для поиска пользователей
router.get('/admin/search', async(req, res) => {
    const searchTerm = req.query.term || '';
    let pool = null;

    try {
        pool = await sql.connect(configPlatformAcctDb);
        const usersResult = await pool.request()
            .input('searchTerm', sql.NVarChar, `%${searchTerm}%`)
            .query('SELECT UserId, UserName, admin FROM Users WHERE UserName LIKE @searchTerm ORDER BY UserId');
        
        res.json(usersResult.recordset);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    } finally {
        if (pool) await pool.close();
    }
});

// Маршрут для выхода
router.get('/admin/logout', (req, res) => {
    // Удаляем сессию пользователя или делаем логаут
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/admin'); // Если ошибка, перенаправляем все равно на /admin
        }
        res.redirect('/admin');
    });
});

export default router;
