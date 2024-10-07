// utils/logger.js
import chalk from 'chalk';

// Вспомогательная функция для форматирования даты и времени
function getCurrentTime() {
    const now = new Date();
    
    // Получаем компоненты даты
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Месяцы начинаются с 0
    const year = now.getFullYear();
    
    // Получаем компоненты времени
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Возвращаем дату в формате DD.MM.YYYY HH:mm:ss
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

// Переопределяем console.log с добавлением временной метки
console.log = (function(originalLog) {
    return function(...args) {
        const timestamp = chalk.green(`[${getCurrentTime()}]`); // Цвет для даты
        const logMessage = `${timestamp} ${args.join(' ')}`;
        originalLog.call(console, logMessage); // Вызов оригинального console.log
    };
})(console.log);

// Переопределяем console.error для ошибок
console.error = (function(originalError) {
    return function(...args) {
        const timestamp = chalk.red(`[${getCurrentTime()}]`); // Цвет для даты
        const logMessage = `${timestamp} ${args.join(' ')}`;
        originalError.call(console, logMessage); // Вызов оригинального console.error
    };
})(console.error);
