// utils/logUtils.js
import fs from 'fs';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Загрузка переменных окружения из .env файла
dotenv.config();

// Получение пути к текущему каталогу
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Проверка переменной окружения
const logToConsole = process.env.LOG_TO_CONSOLE === 'true';

// Функция для логирования данных о регистрации
export function logRegistrationData(accountName, email, password, userId, userCenter, registrationDate) {
  // Путь к файлу логов в папке Logs в корне проекта
  const logFilePath = path.join(__dirname, '..', 'Logs', process.env.LOG_FILE_PATH);

  const logContent = `\
===============================================================
Successful registration of a new user:
User Name: ${accountName}
Email: ${email}
Password: ${password}
UserId: ${userId}
UserCenter: ${userCenter}
Registration Date: ${registrationDate}
===============================================================\n`;

  // Создание папки Logs, если она не существует
  fs.mkdir(path.dirname(logFilePath), { recursive: true }, (err) => {
    if (err) {
      console.error(chalk.red('Error creating Logs directory:', err));
      return;
    }

    // Запись в лог-файл
    fs.appendFile(logFilePath, logContent, (err) => {
      if (err) {
        console.error(chalk.red('Error writing to log file:', err));
      } else if (logToConsole) {
        console.log(chalk.green('Registration data successfully logged.'));
      }
    });
  });
}
