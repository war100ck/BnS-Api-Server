// routes/systemStatsRoutes.js

import express from 'express';
import os from 'os';
import osUtils from 'os-utils';

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

// Обработчик маршрута для API (возвращает данные в формате JSON)
router.get('/api/system-stats', (req, res) => {
    const systemInfo = getSystemInfo();

    osUtils.cpuUsage((cpuUsage) => {
        const totalMemory = os.totalmem(); // Общая память
        const freeMemory = os.freemem(); // Свободная память
        const memoryUsage = totalMemory - freeMemory; // Использованная память
        const usedMemory = (memoryUsage / totalMemory) * 100; // Использованная память в процентах

        const totalCpu = 100; // Общая мощность CPU (100%)
        const freeCpu = (100 - cpuUsage * 100).toFixed(2); // Свободная мощность CPU в процентах
        const usedCpu = (cpuUsage * 100).toFixed(2); // Загруженная мощность CPU в процентах

        // Возвращаем данные в формате JSON
        res.json({
            systemInfo, // Информация о системе
            usedCpu, // Использованная мощность CPU
            freeCpu, // Свободная мощность CPU
            usedMemory: usedMemory.toFixed(2), // Использованная память в процентах
            totalMemory: (totalMemory / (1024 * 1024)).toFixed(2), // Общая память в МБ
            freeMemory: (freeMemory / (1024 * 1024)).toFixed(2) // Свободная память в МБ
        });
    });
});

// Обработчик маршрута для отображения информации о системе
router.get('/system-stats', (req, res) => {
    res.render('systemStats'); // Рендерим шаблон
});

export default router;
