import express from 'express';
import os from 'os';
import osUtils from 'os-utils';
import { isAdmin } from '../middleware/adminMiddleware.js';
import pidusage from 'pidusage';  // для ES6 модулей

const router = express.Router();

// Функция для получения характеристик системы
function getSystemInfo() {
    const cpus = os.cpus();
    const cpuModel = cpus[0].model; // Модель процессора
    const cpuSpeed = cpus[0].speed; // Скорость процессора в МГц
    const cpuCores = cpus.length; // Количество ядер процессора

    const totalMemory = (os.totalmem() / (1024 * 1024)).toFixed(2); // Общая память в МБ
    const freeMemory = (os.freemem() / (1024 * 1024)).toFixed(2); // Свободная память в МБ
    const osType = os.type(); // Операционная система
    const osRelease = os.release(); // Версия ОС
    const platform = os.platform(); // Платформа

    return {
        cpuModel,
        cpuSpeed,
        cpuCores,
        totalMemory,
        freeMemory,
        osType,
        osRelease,
        platform
    };
}

// Функция для получения информации о процессе
function getProcessInfo() {
    return new Promise((resolve, reject) => {
        const currentPid = process.pid; // Получаем текущий PID процесса

        // Используем pidusage для получения информации о процессе по его PID
        pidusage(currentPid, (err, stats) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    pid: stats.pid || 'N/A', // PID процесса
                    name: 'ServerApi.js', // Имя вашего процесса
                    memory: (stats.memory / (1024 * 1024)).toFixed(2) + ' MB', // Память в MB
                    cpu: (stats.cpu).toFixed(2) + '%', // CPU Usage в процентах от конкретного процесса
                });
            }
        });
    });
}

// Сохраняем время запуска сервера
const serverStartTime = new Date();

// Обработчик маршрута для API (возвращает данные в формате JSON)
router.get('/api/system-stats', async (req, res) => {
    try {
        const systemInfo = getSystemInfo();
        const processInfo = await getProcessInfo(); // Получаем информацию о процессе

        osUtils.cpuUsage((cpuUsage) => {
            const totalMemory = os.totalmem(); // Общая память
            const freeMemory = os.freemem(); // Свободная память
            const memoryUsage = totalMemory - freeMemory; // Использованная память
            const usedMemory = (memoryUsage / totalMemory) * 100; // Использованная память в процентах

            const totalCpu = 100; // Общая мощность CPU (100%)
            const freeCpu = (100 - cpuUsage * 100).toFixed(2); // Свободная мощность CPU в процентах
            const usedCpu = (cpuUsage * 100).toFixed(2); // Загруженная мощность CPU в процентах

            // Возвращаем данные в формате JSON, включая время запуска сервера и информацию о процессе
            res.json({
                systemInfo, // Информация о системе
                processInfo, // Информация о процессе
                usedCpu, // Использованная мощность CPU
                freeCpu, // Свободная мощность CPU
                usedMemory: usedMemory.toFixed(2), // Использованная память в процентах
                totalMemory: (totalMemory / (1024 * 1024)).toFixed(2), // Общая память в МБ
                freeMemory: (freeMemory / (1024 * 1024)).toFixed(2), // Свободная память в МБ
                serverStartTime // Время запуска сервера
            });
        });
    } catch (error) {
        console.error('Error fetching process info:', error);
        res.status(500).send('Error fetching process info');
    }
});

// Обработчик маршрута для отображения информации о системе
router.get('/admin/system-stats', isAdmin, (req, res) => {
    res.render('systemStats', {
        pathname: req.originalUrl.split('?')[0]  // Убираем query-параметры для чистого пути
    });
});

export default router;
