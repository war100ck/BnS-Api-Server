// routes/checkAvailability.js

import express from 'express';
import sql from 'mssql';
import chalk from 'chalk';
import { WH_config } from '../config/dbConfig.js'; // Импортируйте конфигурацию базы данных

const router = express.Router();

// Обработчик GET запроса для проверки доступности имени пользователя и email
router.get('/', async (req, res) => {
    const accountName = req.query.account_name;
    const email = req.query.email;

    if (process.env.LOG_TO_CONSOLE === 'true') {
        console.log(chalk.yellow(`GET /check-availability: Received data { accountName: ${accountName}, email: ${email} }`));
    }

    let pool = null; // Объявляем pool перед блоком try

    try {
        pool = await sql.connect(WH_config);
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(chalk.blue('GET /check-availability: Database connection successful'));
        }

        const accountNameCheck = accountName ? await pool.request()
            .input('accountName', sql.NVarChar, accountName)
            .query('SELECT COUNT(*) AS count FROM dbo.Users WHERE UserName = @accountName') : { recordset: [{ count: 0 }] };

        const emailCheck = email ? await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT COUNT(*) AS count FROM dbo.Users WHERE LoginName = @email') : { recordset: [{ count: 0 }] };

        // Set colors based on check results
        const accountNameColor = accountNameCheck.recordset[0].count > 0 ? chalk.red : chalk.green;
        const emailColor = emailCheck.recordset[0].count > 0 ? chalk.red : chalk.green;

        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(chalk.yellow(`GET /check-availability: Check results`));
            console.log(`  ${chalk.bold('Account Name Check:')} ${accountNameColor(accountNameCheck.recordset[0].count > 0 ? 'Occupied' : 'Available')}`);
            console.log(`  ${chalk.bold('Email Check:')} ${emailColor(emailCheck.recordset[0].count > 0 ? 'Occupied' : 'Available')}`);
        }

        const isAccountNameTaken = accountNameCheck.recordset[0].count > 0;
        const isEmailTaken = emailCheck.recordset[0].count > 0;

        res.json({ accountNameTaken: isAccountNameTaken, emailTaken: isEmailTaken });
    } catch (err) {
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.error(chalk.red('GET /check-availability: Error executing query:', err));
        }
        res.status(500).send('An error occurred while checking availability.');
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (err) {
                if (process.env.LOG_TO_CONSOLE === 'true') {
                    console.error(chalk.red('GET /check-availability: Error closing database connection:', err.message));
                }
            }
        }
    }
});

export default router;