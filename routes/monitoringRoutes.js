import express from 'express';
import axios from 'axios';
import xml2js from 'xml2js';
import { isAdmin } from '../middleware/adminMiddleware.js';
import discordBot from '../utils/discordBot.js';
import { readConfig } from '../utils/configManager.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Настройки логирования из .env
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE === 'true'; // Основные логи (ошибки, важные события)
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true'; // Отладочные логи (запросы, подробная информация)

// Настройки цветов для логов
const log = {
    // Основные логи (включаются при LOG_TO_CONSOLE=true)
    error: (message) => LOG_TO_CONSOLE && console.log(chalk.red(`[MONITORING ERROR] ${message}`)),
    warning: (message) => LOG_TO_CONSOLE && console.log(chalk.yellow(`[MONITORING WARNING] ${message}`)),
    info: (message) => LOG_TO_CONSOLE && console.log(chalk.blue(`[MONITORING INFO] ${message}`)),
    success: (message) => LOG_TO_CONSOLE && console.log(chalk.green(`[MONITORING SUCCESS] ${message}`)),

    // Отладочные логи (включаются при DEBUG_LOGS=true)
    debug: (message) => DEBUG_LOGS && console.log(chalk.gray(`[MONITORING DEBUG] ${message}`)),
    api: (message) => DEBUG_LOGS && console.log(chalk.cyan(`[MONITORING API] ${message}`)),
    discord: (message) => DEBUG_LOGS && console.log(chalk.magenta(`[MONITORING DISCORD] ${message}`))
};

const checkPresenceSrvStatus = async() => {
    try {
        const targetUrl = 'http://127.0.0.1:6605/spawned/PresenceSrv.1.$/users';
        log.debug(`Checking PresenceSrv status at: ${chalk.yellow(targetUrl)}`);
        
        const response = await axios.get(targetUrl, {
            timeout: 5000
        });
        
        if (response.status === 200) {
            log.debug('PresenceSrv is running');
            return { status: 'active', version: '$' };
        }
        
        log.warning(`PresenceSrv check returned status: ${response.status}`);
        return { status: 'inactive', version: null };
    } catch (error) {
        log.error(`Error checking PresenceSrv status: ${chalk.red(error.message)}`);
        return { status: 'inactive', version: null };
    }
};

const extractUserInfo = (data) => {
    log.debug('Extracting user info from XML data...');
    const objectData = data?.Info?.Object || [];
    const normalizedObjectData = Array.isArray(objectData) ? objectData : [objectData];
    const usersMap = new Map();

    normalizedObjectData.forEach(({
            Data: user
        }) => {
        if (!user)
            return;

        const logins = user?.Logins?.Login || [];
        const pcname =
            user?.AppDataSet?.AppData?.find(appData => appData.Data?.pcname)?.Data?.pcname || 'N/A';

        logins.forEach(({
                GameCode,
                ClientNetAddress,
                LoginTime
            }) => {
            const userId = user.UserId;

            if (usersMap.has(userId)) {
                usersMap.get(userId).Logins += 1;
            } else {
                usersMap.set(userId, {
                    UserCenter: user.UserCenter || 'N/A',
                    GameCode: GameCode || 'N/A',
                    UserId: user.UserId || 'N/A',
                    UserName: user.UserName || 'N/A',
                    PcName: pcname,
                    ClientNetAddress: ClientNetAddress || 'N/A',
                    LoginTime: LoginTime || 'N/A',
                    Status: user.Status || 'N/A',
                    Logins: 1,
                });
            }
        });
    });

    log.debug(`Extracted info for ${chalk.green(usersMap.size)} users`);
    return Array.from(usersMap.values());
};

router.get('/admin/monitoring', isAdmin, async(req, res) => {
    const currentUser = req.session.user;
    log.info(`Monitoring page accessed by admin: ${chalk.magenta(currentUser.username)}`);
    
    try {
        log.debug('Checking PresenceSrv status...');
        const { status, version } = await checkPresenceSrvStatus();
        
        if (status === 'inactive') {
            log.warning('PresenceSrv is not running');
            return res.render('monitoring', {
                users: [],
                onlineCount: 0,
                presenceStatus: 'inactive',
                pathname: req.originalUrl,
                jsonData: {}
            });
        }

        const targetUrl = `http://127.0.0.1:6605/spawned/PresenceSrv.1.${version}/users`;
        log.api(`Fetching user data from: ${chalk.yellow(targetUrl)}`);
        
        const response = await axios.get(targetUrl, {
            timeout: 5000
        });

        if (response.headers['content-type'].includes('xml')) {
            log.debug('Parsing XML response...');
            const parser = new xml2js.Parser({
                explicitArray: false
            });
            const jsonData = await parser.parseStringPromise(response.data);

            if (!jsonData?.Info?.Object) {
                log.warning('No users found in monitoring data');
                return res.render('monitoring', {
                    users: [],
                    onlineCount: 0,
                    presenceStatus: 'active',
                    pathname: req.originalUrl,
                    jsonData: {}
                });
            }

            const users = extractUserInfo(jsonData);
            const onlineCount = users.filter(({
                        Status
                    }) => Status === 'online').length;

            log.success(`Monitoring data loaded: ${chalk.green(onlineCount)} online users out of ${chalk.green(users.length)} total`);
            res.render('monitoring', {
                users,
                onlineCount,
                presenceStatus: 'active',
                pathname: req.originalUrl,
                jsonData
            });
        } else {
            log.error('Invalid data format received from PresenceSrv');
            res.render('monitoring', {
                users: [],
                onlineCount: 0,
                presenceStatus: 'error',
                pathname: req.originalUrl,
                jsonData: {}
            });
        }
    } catch (error) {
        log.error(`Monitoring failed: ${chalk.red(error.message)}`);
        res.render('monitoring', {
            users: [],
            onlineCount: 0,
            presenceStatus: 'error',
            pathname: req.originalUrl,
            jsonData: {}
        });
    }
});

router.get('/admin/discord/settings', isAdmin, async(req, res) => {
    const currentUser = req.session.user;
    log.debug(`Discord settings requested by admin: ${chalk.magenta(currentUser.username)}`);
    
    try {
        log.debug('Reading Discord bot config...');
        const config = readConfig();
        log.success('Discord settings retrieved successfully');
        res.json({
            botToken: config?.botToken || '',
            statusChannelId: config?.statusChannelId || '',
            autoUpdates: config?.autoUpdates || false,
            updateInterval: config?.updateInterval || 5,
            botEnabled: config?.botEnabled || false
        });
    } catch (error) {
        log.error(`Failed to read Discord settings: ${chalk.red(error.message)}`);
        res.status(500).json({
            error: error.message
        });
    }
});

router.post('/admin/discord/settings', isAdmin, async(req, res) => {
    const currentUser = req.session.user;
    const { botToken, statusChannelId, autoUpdates, updateInterval, enabled } = req.body;
    
    log.info(`Updating Discord settings by admin: ${chalk.magenta(currentUser.username)}`);
    log.debug(`New settings: token=${botToken ? '***' : 'empty'}, channel=${statusChannelId}, autoUpdates=${autoUpdates}, interval=${updateInterval}, enabled=${enabled}`);

    try {
        if (!botToken || !statusChannelId) {
            log.warning('Validation failed: Bot Token and Channel ID are required');
            return res.status(400).json({
                error: 'Bot Token and Channel ID are required'
            });
        }

        log.debug('Updating Discord bot settings...');
        discordBot.updateSettings({
            token: botToken,
            channelId: statusChannelId,
            autoUpdates: autoUpdates,
            updateInterval: parseInt(updateInterval) || 5,
            enabled: enabled
        });

        log.success('Discord settings updated successfully');
        res.json({
            success: true
        });
    } catch (error) {
        log.error(`Failed to update Discord settings: ${chalk.red(error.message)}`);
        res.status(500).json({
            error: error.message
        });
    }
});

router.get('/admin/discord/test', isAdmin, async(req, res) => {
    const currentUser = req.session.user;
    log.debug(`Discord test requested by admin: ${chalk.magenta(currentUser.username)}`);
    
    try {
        log.debug('Testing Discord bot connection...');
        const { onlineCount } = await discordBot.getOnlinePlayers();
        
        log.success(`Discord test successful. Online players: ${chalk.green(onlineCount)}`);
        res.json({
            success: true,
            onlineCount,
            message: `Test successful. Current online: ${onlineCount} players`
        });
    } catch (error) {
        log.error(`Discord test failed: ${chalk.red(error.message)}`);
        res.status(500).json({
            error: error.message
        });
    }
});

export default router;