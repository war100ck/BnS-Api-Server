// routes/signin.js

import express from 'express';
import sql from 'mssql';
import chalk from 'chalk';
import { WH_config } from '../config/dbConfig.js'; // Импортируйте конфигурацию базы данных

const router = express.Router();

// Обработчик POST запроса для входа в систему
router.post('/', async (req, res) => {
    const { signin_email, signin_password } = req.body;

    if (process.env.LOG_TO_CONSOLE === 'true') {
        console.log(chalk.yellow(`POST /signin: Received data - Email: ${signin_email}, Password: ${signin_password}`));
    }

    if (!signin_email || !signin_password) {
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.error(chalk.red('POST /signin: Invalid request data'));
        }
        return res.status(400).send('Email and password cannot be empty.');
    }

    let pool = null; // Объявляем pool перед try, чтобы оно было доступно в finally

    try {
        pool = await sql.connect(WH_config);

        // Проверка, существует ли пользователь с указанным email и паролем
        const result = await pool.request()
            .input('email', sql.NVarChar, signin_email)
            .input('password', sql.NVarChar, signin_password)
            .query('SELECT UserName FROM dbo.Users WHERE LoginName = @email AND WebsitePassword = @password');

        if (result.recordset.length > 0) {
            const userName = result.recordset[0].UserName;
            if (process.env.LOG_TO_CONSOLE === 'true') {
                console.log(chalk.green(`POST /signin: Authentication successful - UserName: ${userName}`));
            }
            res.status(200).send(userName); // Отправляем имя пользователя
        } else {
            if (process.env.LOG_TO_CONSOLE === 'true') {
                console.error(chalk.red('POST /signin: Authentication failed'));
            }
            res.status(401).send('Invalid email or password.');
        }
    } catch (err) {
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.error(chalk.red('POST /signin: Error during signin:', err.message));
        }
        res.status(500).send('An error occurred during signin.');
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (err) {
                if (process.env.LOG_TO_CONSOLE === 'true') {
                    console.error(chalk.red('POST /signin: Error closing database connection:', err.message));
                }
            }
        }
    }
});

export default router;
