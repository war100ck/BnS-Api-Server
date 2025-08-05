import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import archiver from 'archiver';
import chalk from 'chalk';
import { isAdmin } from '../middleware/adminMiddleware.js';

dotenv.config();

const router = express.Router();
const ENABLE_LOGGING = process.env.LOG_TO_CONSOLE === 'true';

// Настройки репозитория
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_OWNER = 'war100ck';
const REPO_NAME = 'BnS-Api-Server';
const BRANCH = 'main';
const MANIFEST_FILE = 'manifest.json';
const UPDATE_FILE = 'update.md';
const LOCAL_MANIFEST_PATH = path.resolve(__dirname, '../manifest.json');
const LOCAL_FILES_PATH = path.resolve(__dirname, '../');

// Клиенты для Server-Sent Events
const clients = new Map();

// Функция для отправки событий клиентам
function sendEventToClients(type, data) {
    const eventData = JSON.stringify({
        type,
        ...data
    });
    
    clients.forEach((res, id) => {
        try {
            res.write(`data: ${eventData}\n\n`);
            res.flush(); // Принудительно отправляем данные
        } catch (err) {
            console.error(`Error sending event to client ${id}:`, err);
            clients.delete(id);
        }
    });
}

// Функция для красивого логирования (без временных меток)
function log(message, level = 'info') {
    if (ENABLE_LOGGING) {
        let coloredLevel;
        let coloredMessage;

        switch (level) {
        case 'error':
            coloredLevel = chalk.bgRed.white.bold(` ${level.toUpperCase()} `);
            coloredMessage = chalk.red(message);
            break;
        case 'warn':
            coloredLevel = chalk.bgYellow.black.bold(` ${level.toUpperCase()} `);
            coloredMessage = chalk.yellow(message);
            break;
        case 'success':
            coloredLevel = chalk.bgGreen.white.bold(` SUCCESS `);
            coloredMessage = chalk.green(message);
            break;
        case 'debug':
            coloredLevel = chalk.bgBlue.white.bold(` DEBUG `);
            coloredMessage = chalk.blue(message);
            break;
        default:
            coloredLevel = chalk.bgWhite.black.bold(` INFO `);
            coloredMessage = message;
        }

        console.log(`${coloredLevel} ${coloredMessage}`);
    }
}

// Функция для создания бэкапа файлов
async function createBackup(filesToBackup, backupPath) {
    return new Promise((resolve, reject) => {
        try {
            log(`Creating backup in ${chalk.cyan(backupPath)}...`);

            const output = fs.createWriteStream(backupPath);
            const archive = archiver('zip', {
                zlib: {
                    level: 9
                }
            });

            output.on('close', () => {
                log(`Backup created successfully: ${chalk.cyan(backupPath)} (${archive.pointer()} bytes)`, 'success');
                resolve(backupPath);
            });

            archive.on('error', (err) => {
                log(`Backup error: ${err.message}`, 'error');
                reject(err);
            });

            archive.pipe(output);

            filesToBackup.forEach(file => {
                const filePath = path.resolve(LOCAL_FILES_PATH, file);
                if (fs.existsSync(filePath)) {
                    archive.file(filePath, {
                        name: file
                    });
                } else {
                    log(`File not found, skipping: ${chalk.yellow(file)}`, 'warn');
                }
            });

            archive.finalize();
        } catch (err) {
            log(`Backup failed: ${err.message}`, 'error');
            reject(err);
        }
    });
}

// Функция для загрузки и парсинга update.md с GitHub
async function fetchUpdateLog() {
    const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${UPDATE_FILE}`;
    try {
        log(`Fetching update log from GitHub: ${chalk.cyan(url)}`);
        const { data } = await axios.get(url);
        log('Update log fetched successfully', 'success');
        return marked(data);
    } catch (err) {
        log(`Could not fetch update log: ${err.message}`, 'error');
        return '<p>Failed to load update news.</p>';
    }
}

// Загрузка локального манифеста
function loadLocalManifest() {
    try {
        log(`Loading local manifest from ${chalk.cyan(LOCAL_MANIFEST_PATH)}`);
        const localManifest = fs.readFileSync(LOCAL_MANIFEST_PATH, 'utf8');
        log('Local manifest loaded successfully', 'success');
        return JSON.parse(localManifest);
    } catch (err) {
        log(`Local manifest not found or invalid: ${err.message}`, 'warn');
        return null;
    }
}

// Получение списка файлов для обновления
async function getFilesToUpdate() {
    try {
        const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${MANIFEST_FILE}`;
        log(`Fetching remote manifest from ${chalk.cyan(url)}`);

        const { data: remoteManifest } = await axios.get(url);
        const localManifest = loadLocalManifest();
        const filesToUpdate = [];

        log('Comparing remote and local manifests...');
        if (remoteManifest) {
            for (const file in remoteManifest) {
                if (file.startsWith('.git/'))
                    continue;

                const remoteHash = remoteManifest[file];
                const localHash = localManifest ? localManifest[file] : null;

                if (!localHash || remoteHash !== localHash) {
                    log(`File needs update: ${chalk.yellow(file)}`);
                    filesToUpdate.push(file);
                }
            }
        }

        if (filesToUpdate.length > 0) {
            log(`Found ${chalk.yellow(filesToUpdate.length)} files to update:`, 'warn');
            filesToUpdate.forEach((file, index) => {
                log(`  ${index + 1}. ${chalk.cyan(file)}`, 'debug');
            });
        } else {
            log('All files are up to date', 'success');
        }

        return filesToUpdate;
    } catch (err) {
        log(`Failed to fetch or compare manifests: ${err.message}`, 'error');
        throw err;
    }
}

// SSE endpoint для обновления прогресса
router.get('/admin/update/stream', isAdmin, (req, res) => {
    const clientId = Date.now();
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Отключаем буферизацию для Nginx
    
    // Отправляем начальное сообщение
    res.write(`id: ${clientId}\n`);
    res.write('event: connected\n');
    res.write('data: {"status": "connected"}\n\n');
    
    // Добавляем клиента в Map
    clients.set(clientId, res);
    log(`New SSE client connected: ${chalk.cyan(clientId)}`, 'debug');

    // Обработчик закрытия соединения
    req.on('close', () => {
        clients.delete(clientId);
        log(`SSE client disconnected: ${chalk.cyan(clientId)}`, 'debug');
    });
});

// Маршрут для создания бэкапа
router.post('/admin/update/backup', isAdmin, async(req, res) => {
    log('Received backup request');

    try {
        const { backupPath } = req.body;
        const filesToUpdate = await getFilesToUpdate();

        if (!backupPath || !filesToUpdate.length) {
            log('Backup path is required or no files to backup', 'warn');
            return res.status(400).json({
                success: false,
                message: 'Backup path is required or no files to backup'
            });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilePath = path.join(backupPath, `backup_${timestamp}.zip`);

        if (!fs.existsSync(backupPath)) {
            log(`Creating backup directory: ${chalk.cyan(backupPath)}`);
            fs.mkdirSync(backupPath, {
                recursive: true
            });
        }

        await createBackup(filesToUpdate, backupFilePath);

        log(`Backup created successfully at ${chalk.green(backupFilePath)}`, 'success');
        res.json({
            success: true,
            message: 'Backup created successfully',
            path: backupFilePath
        });

    } catch (err) {
        log(`Backup failed: ${err.message}`, 'error');
        res.status(500).json({
            success: false,
            message: 'Backup failed: ' + err.message
        });
    }
});

// Маршрут для проверки обновлений
router.get('/admin/update/check', isAdmin, async(req, res) => {
    log('Received request to check updates');
    try {
        const filesToUpdate = await getFilesToUpdate();
        const updateLog = await fetchUpdateLog();
        res.render('updateChecker', {
            pathname: req.path,
            filesToUpdate,
            checked: true,
            updateLog
        });
    } catch (err) {
        log(`Error during update check: ${err.message}`, 'error');
        res.status(500).send('Error checking for updates.');
    }
});

// Маршрут для обновления файлов
router.post('/admin/update', isAdmin, async(req, res) => {
    log('Starting update process', 'warn');
    try {
        const filesToUpdate = await getFilesToUpdate();
        const totalFiles = filesToUpdate.length;
        let currentFile = 0;

        if (totalFiles === 0) {
            log('No files to update - everything is up to date', 'success');
            sendEventToClients('complete', {
                message: 'No files to update'
            });
            return res.status(200).end();
        }

        log(`Starting update for ${chalk.yellow(totalFiles)} files`, 'warn');
        
        // Отправляем начальное сообщение о начале процесса
        sendEventToClients('start', {
            total: totalFiles,
            message: 'Update process started'
        });

        for (const file of filesToUpdate) {
            currentFile++;
            const fileUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${file}`;
            const localFilePath = path.resolve(LOCAL_FILES_PATH, file);

            const message = `Processing file ${currentFile}/${totalFiles}: ${file}`;
            log(message);

            sendEventToClients('progress', {
                current: currentFile,
                total: totalFiles,
                file: file,
                message: message,
                percent: Math.round((currentFile / totalFiles) * 100)
            });

            try {
                log(`Downloading from ${chalk.cyan(fileUrl)}`);
                const response = await axios.get(fileUrl, {
                    responseType: 'stream'
                });

                const dir = path.dirname(localFilePath);
                if (!fs.existsSync(dir)) {
                    log(`Creating directory: ${chalk.cyan(dir)}`);
                    fs.mkdirSync(dir, {
                        recursive: true
                    });
                }

                const writer = fs.createWriteStream(localFilePath);
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', () => {
                        log(`File saved: ${chalk.green(localFilePath)}`, 'success');
                        resolve();
                    });
                    writer.on('error', reject);
                });

                const successMessage = `Successfully updated: ${file}`;
                log(successMessage, 'success');

                sendEventToClients('progress', {
                    current: currentFile,
                    total: totalFiles,
                    file: file,
                    message: successMessage,
                    percent: Math.round((currentFile / totalFiles) * 100)
                });

            } catch (err) {
                const errorMessage = `Failed to update ${file}: ${err.message}`;
                log(errorMessage, 'error');

                sendEventToClients('error', {
                    message: errorMessage
                });

                return res.status(500).end();
            }
        }

        const completeMessage = 'All files updated successfully. Please restart the API server to apply changes';
        log(completeMessage, 'success');

        sendEventToClients('complete', {
            message: completeMessage
        });

        res.status(200).end();

    } catch (err) {
        const errorMessage = `Update process failed: ${err.message}`;
        log(errorMessage, 'error');

        sendEventToClients('error', {
            message: errorMessage
        });

        res.status(500).end();
    }
});

// Маршрут для отображения страницы по умолчанию
router.get('/admin/update', isAdmin, async(req, res) => {
    log('Rendering update checker page');
    const updateLog = await fetchUpdateLog();
    res.render('updateChecker', {
        pathname: req.path,
        filesToUpdate: [],
        checked: false,
        updateLog
    });
});

export {
    router
};