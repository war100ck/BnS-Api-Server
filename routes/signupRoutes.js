// routes/signupRoutes.js

import express from 'express';
import axios from 'axios';
import chalk from 'chalk';
import sql from 'mssql';
import { logRegistrationData } from '../utils/logUtils.js'; // Импортируем функцию для логирования
import { cutStr } from '../utils/dataTransformations.js'; // Импортируем вспомогательную функцию
import { WH_config } from '../config/dbConfig.js'; // Импортируем конфигурацию базы данных

const router = express.Router();

// Проверка переменной окружения для логирования в консоли
const logToConsole = process.env.LOG_TO_CONSOLE === 'true';

// Обработчик POST запроса для регистрации
router.post('/signup', async (req, res) => {
  const accountName = req.body.account_name;
  const email = req.body.email;
  const password = req.body.account_password;

  if (logToConsole) {
    console.log(chalk.yellow(`POST /signup: Received data - User Name: ${accountName}, Email: ${email}, Password: ${password}`));
  }

  if (!accountName || !email || !password) {
    if (logToConsole) {
      console.error(chalk.red('POST /signup: Invalid request data'));
    }
    return res.status(400).send('Account name, email, and password cannot be empty.');
  }
  
  let pool = null; // Объявляем переменную pool

  try {
    if (logToConsole) {
      console.log(chalk.cyan('POST /signup: Checking service status'));
    }
    const response = await axios.get(`${process.env.SERVICE_URL}/apps-state`);
    const resultApp = cutStr('<AppName>AuthSrv</AppName>', '</App>', response.data);
    const epoch = cutStr('<Epoch>', '</Epoch>', resultApp);

    if (logToConsole) {
      console.log(chalk.cyan('POST /signup: Creating registration request'));
    }
    const postRequest = {
      loginName: email,
      userName: accountName,
      password: password,
      effectiveUntil: '',
      loginNameValidated: 1,
      userCenter: 17
    };

    const url = `${process.env.SERVICE_URL}/spawned/AuthSrv.1.${epoch}/test/create_account?` +
                `loginName=${encodeURIComponent(postRequest.loginName)}&` +
                `userName=${encodeURIComponent(postRequest.userName)}&` +
                `password=${encodeURIComponent(postRequest.password)}&` +
                `effectiveUntil=${encodeURIComponent(postRequest.effectiveUntil)}&` +
                `loginNameValidated=${encodeURIComponent(postRequest.loginNameValidated)}&` +
                `userCenter=${encodeURIComponent(postRequest.userCenter)}`;

    if (logToConsole) {
      console.log(chalk.magenta('POST /signup: Request URL:', url));
    }
    const result = await axios.get(url);

    // Extracting UserId and UserCenter from response
    const userId = cutStr('<UserId>', '</UserId>', result.data);
    const userCenter = cutStr('<UserCenter>', '</UserCenter>', result.data);

    // Get registration date from database
    pool = await sql.connect(WH_config);
    const registrationResult = await pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .query('SELECT Created FROM dbo.Users WHERE UserId = @userId');
    
    const registrationDate = registrationResult.recordset[0]?.Created;

    // Update the Users table to include WebsitePassword
    await pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .input('websitePassword', sql.NVarChar, password) // Store the password for the website
      .query('UPDATE dbo.Users SET WebsitePassword = @websitePassword WHERE UserId = @userId');

    // Log the registration data to file
    logRegistrationData(accountName, email, password, userId, userCenter, registrationDate);

    if (logToConsole) {
      // Output the message in the console in the required format
      console.log(chalk.bgGreen('==============================================================='));  
      console.log(chalk.blue('Successful registration of a new user:'));
      console.log(
        chalk.green('User Name:') +
        chalk.cyan(` ${accountName}`)
      );
      console.log(
        chalk.green('Email:') +
        chalk.cyan(` ${email}`)
      );
      console.log(
        chalk.green('Password:') +
        chalk.cyan(` ${password}`)
      );
      console.log(
        chalk.green('UserId:') +
        chalk.cyan(` ${userId}`)
      );
      console.log(
        chalk.green('UserCenter:') +
        chalk.cyan(` ${userCenter}`)
      );
      console.log(
        chalk.green('Registration Date:') +
        chalk.cyan(` ${registrationDate}`)
      );
      console.log(chalk.bgGreen('==============================================================='));  
    }

    // Send response message with highlighted username
    res.status(200).send(`Congratulations <strong>${accountName}</strong>! You have successfully registered on our server.`);
  } catch (err) {
    if (logToConsole) {
      console.error(chalk.red('POST /signup: Error during signup:', err.message));
    }
    res.status(500).send('An error occurred during signup.');
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (err) {
        if (logToConsole) {
          console.error(chalk.red('POST /signup: Error closing database connection:', err.message));
        }
      }
    }
  }
});

export default router;
