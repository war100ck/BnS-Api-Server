// routes/kickUserRouter.js
import express from 'express';
import axios from 'axios';
import sql from 'mssql';
import chalk from 'chalk';
import { configPlatformAcctDb } from '../config/dbConfig.js'; // Путь к конфигу базы данных
import { isAdmin } from '../middleware/adminMiddleware.js'; // Проверка, является ли пользователь администратором

const orange = chalk.rgb(255, 165, 0);

// Регулярное выражение для проверки GUID
const isValidGuid = (guid) => {
    const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return guidRegex.test(guid);
};

const router = express.Router();

// Получаем текущую версию AccessSrv
const getAccessSrvVersion = async() => {
    try {
        const targetUrl = 'http://127.0.0.1:6605/spawned/AccessSrv.1.$/'; // Версия указана как $

        const response = await axios.get(targetUrl, {
            timeout: 5000
        });
        return response.status === 200 ? '$' : null; // Версия возвращается как "$" (для простоты).
    } catch (error) {
        console.error('Error fetching AccessSrv version:', error.message);
        return null;
    }
};

// Функция для кика пользователя
router.get('/admin/kick-user', isAdmin, async(req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).send('Missing userId');
    }

    if (!isValidGuid(userId)) {
        return res.status(400).send('Invalid userId format');
    }

    let pool;
    let userName = null;

    try {
        // Получение userName по userId из базы данных
        pool = await sql.connect(configPlatformAcctDb);
        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query('SELECT UserName FROM Users WHERE UserId = @userId');

        const user = result.recordset[0];
        if (!user) {
            return res.status(404).send('User not found');
        }

        userName = user.UserName;

        // Формируем URL запроса на кик пользователя
        const currentVersion = await getAccessSrvVersion();
        if (!currentVersion) {
            return res.status(500).send('Error fetching AccessSrv version');
        }

        const url = `http://127.0.0.1:6605/spawned/AccessSrv.1.${currentVersion}/access/kick`;

        const params = {
            UserId: userId,
            Reason: 'Banned',
            AppGroupId: 2,
            AppId: 'bns'
        };

        // Отправляем GET запрос на кик
        const response = await axios.get(url, {
            params
        });

        // Логируем информацию о кике пользователя
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(
                chalk.green(`User `) +
                orange(`${userName}`) +
                chalk.green(` (UserId: `) +
                orange(`${userId}`) +
                chalk.green(`) has been kicked for reason: Banned`));
        }

        // Отправляем успешный ответ
        res.json({
            success: true,
            message: `User ${userName} (UserId: ${userId}) has been kicked for reason: Banned`
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Error kicking user');
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

router.get('/admin/kick-user-form', isAdmin, (req, res) => {
    res.render('kickUserForm'); // Отображаем форму для ввода данных
});

router.get('/admin/kick-user', isAdmin, async(req, res) => {
    const { userId, reason, appGroupId, appId } = req.query;

    if (!userId || !reason || !appGroupId || !appId) {
        return res.status(400).send('Missing required fields');
    }

    if (!isValidGuid(userId)) {
        return res.status(400).send('Invalid userId format');
    }

    let pool;
    let userName = null;

    try {
        // Получаем userName по userId
        pool = await sql.connect(configPlatformAcctDb);
        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query('SELECT UserName FROM Users WHERE UserId = @userId');

        const user = result.recordset[0];
        if (!user) {
            return res.status(404).send('User not found');
        }

        userName = user.UserName;

        // Формируем URL для запроса на кик
        const currentVersion = await getAccessSrvVersion();
        if (!currentVersion) {
            return res.status(500).send('Error fetching AccessSrv version');
        }

        const url = `http://127.0.0.1:6605/spawned/AccessSrv.1.${currentVersion}/access/kick`;

        const params = {
            UserId: userId,
            Reason: reason,
            AppGroupId: appGroupId,
            AppId: appId
        };

        // Отправляем запрос на кик
        await axios.get(url, {
            params
        });

        // Логируем информацию о кике пользователя
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(
                chalk.green(`User `) +
                orange(`${userName}`) +
                chalk.green(` (UserId: `) +
                orange(`${userId}`) +
                chalk.green(`) has been kicked for reason: `) +
                orange(`${reason}`));
        }

        // Отправляем успешный ответ
        res.json({
            success: true,
            message: `User ${userName} (UserId: ${userId}) has been kicked for reason: ${reason}`
        });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Error kicking user');
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

export default router;
