// routes/systemStatsRoutes.js
import express from 'express';
import os from 'os';
import { isAdmin } from '../middleware/adminMiddleware.js';
import pidusage from 'pidusage';

const router = express.Router();

// Функция для получения характеристик системы
function getSystemInfo() {
    const cpus = os.cpus();
    const cpuModel = cpus[0].model;
    const cpuSpeed = cpus[0].speed;
    const cpuCores = cpus.length;

    const totalMemory = (os.totalmem() / (1024 * 1024)).toFixed(2);
    const freeMemory = (os.freemem() / (1024 * 1024)).toFixed(2);
    const osType = os.type();
    const osRelease = os.release();
    const platform = os.platform();

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

// Функция для расчета CPU usage
function calculateCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    
    cpus.forEach(core => {
        for (const type in core.times) {
            totalTick += core.times[type];
        }
        totalIdle += core.times.idle;
    });

    return {
        totalIdle,
        totalTick
    };
}

// Переменные для хранения предыдущих значений CPU
let previousCpuUsage = calculateCpuUsage();
let previousCpuUsageTime = Date.now();

// Функция для получения информации о процессе
function getProcessInfo() {
    return new Promise((resolve, reject) => {
        const currentPid = process.pid;

        pidusage(currentPid, (err, stats) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    pid: stats.pid || 'N/A',
                    name: 'ServerApi.js',
                    memory: (stats.memory / (1024 * 1024)).toFixed(2) + ' MB',
                    cpu: (stats.cpu).toFixed(2) + '%',
                });
            }
        });
    });
}

// Сохраняем время запуска сервера
const serverStartTime = new Date();

// Обработчик маршрута для API
router.get('/api/system-stats', async (req, res) => {
    try {
        const systemInfo = getSystemInfo();
        const processInfo = await getProcessInfo();

        // Расчет CPU usage
        const currentCpuUsage = calculateCpuUsage();
        const currentTime = Date.now();
        const timeDiff = currentTime - previousCpuUsageTime;
        
        const idleDiff = currentCpuUsage.totalIdle - previousCpuUsage.totalIdle;
        const totalDiff = currentCpuUsage.totalTick - previousCpuUsage.totalTick;
        
        const cpuUsage = 100 - (100 * idleDiff / totalDiff);
        const freeCpu = (100 - cpuUsage).toFixed(2);
        const usedCpu = cpuUsage.toFixed(2);

        // Обновляем предыдущие значения
        previousCpuUsage = currentCpuUsage;
        previousCpuUsageTime = currentTime;

        // Расчет памяти
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const memoryUsage = totalMemory - freeMemory;
        const usedMemory = (memoryUsage / totalMemory) * 100;

        res.json({
            systemInfo,
            processInfo,
            usedCpu,
            freeCpu,
            usedMemory: usedMemory.toFixed(2),
            totalMemory: (totalMemory / (1024 * 1024)).toFixed(2),
            freeMemory: (freeMemory / (1024 * 1024)).toFixed(2),
            serverStartTime
        });
    } catch (error) {
        console.error('Error fetching system stats:', error);
        res.status(500).send('Error fetching system stats');
    }
});

// Обработчик маршрута для отображения информации о системе
router.get('/admin/system-stats', isAdmin, (req, res) => {
    res.render('systemStats', {
        pathname: req.originalUrl.split('?')[0]
    });
});

export default router;