// routes/gameWorldRoutes.js
import express from 'express';
import sql from 'mssql';
import { configLobbyDb } from '../config/dbConfig.js';
import { isAdmin } from '../middleware/adminMiddleware.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Настройки логирования из .env
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE === 'true'; // Основные логи (ошибки, авторизация, важные события)
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true'; // Отладочные логи (запросы к БД, подробная информация)

// Функция для форматирования статуса администратора
const formatAdminStatus = (status) => {
    return status
     ? chalk.bgGreen.white.bold(' ADMIN ')
     : chalk.bgBlue.white.bold(' USER ');
};

// Функция для форматирования битовых значений
const formatBit = (value) => {
    return value ? chalk.green('Yes') : chalk.red('No');
};

// Настройки цветов для логов
const log = {
    // Основные логи (включаются при LOG_TO_CONSOLE=true)
    error: (message) => LOG_TO_CONSOLE && console.log(chalk.red(`[GAME-WORLD-ERROR] ${message}`)),
    warning: (message) => LOG_TO_CONSOLE && console.log(chalk.yellow(`[GAME-WORLD-WARNING] ${message}`)),
    adminAction: (message, user = null) => {
        if (!LOG_TO_CONSOLE) return;
        const userInfo = user
             ? `${formatAdminStatus(true)} ${chalk.magenta(user.username)} (ID: ${chalk.cyan(user.id)})`
             : '';
        console.log(chalk.magenta(`[GAME-WORLD-ADMIN] ${message} ${userInfo}`));
    },

    // Отладочные логи (включаются при DEBUG_LOGS=true)
    info: (message) => DEBUG_LOGS && console.log(chalk.blue(`[GAME-WORLD-INFO] ${message}`)),
    success: (message) => DEBUG_LOGS && console.log(chalk.green(`[GAME-WORLD-SUCCESS] ${message}`)),
    db: {
        connect: () => DEBUG_LOGS && console.log(chalk.cyan('[GAME-WORLD-DB] Connecting to database')),
        query: (query) => DEBUG_LOGS && console.log(chalk.cyan(`[GAME-WORLD-DB] Executing: ${query.substring(0, 50)}...`)),
        result: (count, table) => DEBUG_LOGS && console.log(chalk.cyan(`[GAME-WORLD-DB] Retrieved ${count} records from ${table}`)),
        close: () => DEBUG_LOGS && console.log(chalk.cyan('[GAME-WORLD-DB] Connection closed')),
        error: (error) => DEBUG_LOGS && console.log(chalk.red(`[GAME-WORLD-DB-ERROR] ${error}`))
    },
    data: (message) => DEBUG_LOGS && console.log(chalk.gray(`[GAME-WORLD-DATA] ${message}`)),
    changes: (message) => LOG_TO_CONSOLE && console.log(chalk.magenta(`[GAME-WORLD-CHANGES] ${message}`))
};

// Функция для сравнения значений и логирования изменений
const logChanges = (entity, id, user, oldValues, newValues) => {
    const changes = [];
    const ignoredFields = ['WorldID', 'WorldClusterID'];

    for (const [field, newValue] of Object.entries(newValues)) {
        if (ignoredFields.includes(field)) continue;
        
        const oldValue = oldValues[field];
        if (oldValue !== newValue) {
            const formattedNewValue = typeof newValue === 'boolean' ? formatBit(newValue) : newValue;
            const formattedOldValue = typeof oldValue === 'boolean' ? formatBit(oldValue) : oldValue;
            
            changes.push(`${field}: ${chalk.red(formattedOldValue)} → ${chalk.green(formattedNewValue)}`);
        }
    }

    if (changes.length > 0) {
        log.changes(`Updated ${entity} ID:${id} by ${formatAdminStatus(true)} ${chalk.magenta(user.username)}. Changes:\n  ${changes.join('\n  ')}`);
    } else {
        log.info(`No changes detected for ${entity} ID:${id} by ${user.username}`);
    }
};

// Обработчик маршрута для получения данных из GameWorld и GameWorldCluster
router.get('/admin/gameworld', isAdmin, async(req, res) => {
    const user = req.session.user;
    log.adminAction('Accessing GameWorld data', user);
    
    let pool = null;

    try {
        log.db.connect();
        pool = await sql.connect(configLobbyDb);

        // Получаем данные GameWorld
        const gameWorldResult = await pool.request().query('SELECT * FROM GameWorld');
        const gameWorldData = gameWorldResult.recordset;
        log.db.result(gameWorldData.length, 'GameWorld');

        // Получаем данные GameWorldCluster
        const gameWorldClusterResult = await pool.request().query('SELECT * FROM GameWorldCluster');
        const gameWorldClusterData = gameWorldClusterResult.recordset;
        log.db.result(gameWorldClusterData.length, 'GameWorldCluster');

        if (!gameWorldData.length) {
            log.warning('No GameWorld data found');
            return res.status(404).send('GameWorld data not found');
        }
        if (!gameWorldClusterData.length) {
            log.warning('No GameWorldCluster data found');
            return res.status(404).send('GameWorldCluster data not found');
        }

        const message = req.query.message;
        if (message) log.data(`Message parameter: ${message}`);

        log.success(`GameWorld data loaded successfully for ${user.username}`);
        
        res.render('gameWorld', {
            gameWorldData,
            gameWorldClusterData,
            message,
            pathname: req.originalUrl.split('?')[0]
        });
    } catch (err) {
        log.error(`Failed to load GameWorld data: ${err.message}`);
        res.status(500).send('Server error');
    } finally {
        if (pool) {
            try {
                await pool.close();
                log.db.close();
            } catch (err) {
                log.db.error(`Connection close error: ${err.message}`);
            }
        }
    }
});

// Обработчик маршрута для обновления данных игрового мира
router.post('/update-game-world', isAdmin, async(req, res) => {
    const user = req.session.user;
    const { WorldID, ...updateData } = req.body;
    
    log.adminAction(`Updating GameWorld ID:${WorldID}`, user);

    let pool = null;

    try {
        log.db.connect();
        pool = await sql.connect(configLobbyDb);

        // Получаем текущие данные для сравнения
        const currentDataResult = await pool.request()
            .input('WorldID', sql.SmallInt, WorldID)
            .query('SELECT * FROM GameWorld WHERE WorldID = @WorldID');
        
        if (!currentDataResult.recordset.length) {
            log.warning(`GameWorld ID:${WorldID} not found`);
            return res.status(404).json({ success: false, message: 'GameWorld not found' });
        }

        const currentData = currentDataResult.recordset[0];
        
        // Подготавливаем данные для обновления
        const preparedData = {
            WorldClusterID: updateData.WorldClusterID,
            WorldName: updateData.WorldName,
            WorldType: updateData.WorldType,
            PlayType: updateData.PlayType,
            Usable: updateData.Usable === '1',
            Enterable: updateData.Enterable === '1',
            CharacterCreationLimit: updateData.CharacterCreationLimit === '1',
            CharacterOfNewAccountCreationLimit: updateData.CharacterOfNewAccountCreationLimit === '1',
            BrandNew: updateData.BrandNew === '1',
            Recommendation: updateData.Recommendation === '1',
            Crowdedness: updateData.Crowdedness
        };

        // Логируем изменения
        logChanges('GameWorld', WorldID, user, currentData, preparedData);

        // Выполняем обновление
        await pool.request()
            .input('WorldID', sql.SmallInt, WorldID)
            .input('WorldClusterID', sql.SmallInt, preparedData.WorldClusterID)
            .input('WorldName', sql.NVarChar, preparedData.WorldName)
            .input('WorldType', sql.TinyInt, preparedData.WorldType)
            .input('PlayType', sql.TinyInt, preparedData.PlayType)
            .input('Usable', sql.Bit, preparedData.Usable)
            .input('Enterable', sql.Bit, preparedData.Enterable)
            .input('CharacterCreationLimit', sql.Bit, preparedData.CharacterCreationLimit)
            .input('CharacterOfNewAccountCreationLimit', sql.Bit, preparedData.CharacterOfNewAccountCreationLimit)
            .input('BrandNew', sql.Bit, preparedData.BrandNew)
            .input('Recommendation', sql.Bit, preparedData.Recommendation)
            .input('Crowdedness', sql.TinyInt, preparedData.Crowdedness)
            .query(`
                UPDATE GameWorld
                SET 
                    WorldClusterID = @WorldClusterID,
                    WorldName = @WorldName,
                    WorldType = @WorldType,
                    PlayType = @PlayType,
                    Usable = @Usable,
                    Enterable = @Enterable,
                    CharacterCreationLimit = @CharacterCreationLimit,
                    CharacterOfNewAccountCreationLimit = @CharacterOfNewAccountCreationLimit,
                    BrandNew = @BrandNew,
                    Recommendation = @Recommendation,
                    Crowdedness = @Crowdedness
                WHERE WorldID = @WorldID
            `);

        log.success(`GameWorld ID:${WorldID} updated successfully by ${user.username}`);
        res.json({ success: true, message: 'GameWorld data updated successfully!' });
    } catch (err) {
        log.error(`Update failed for GameWorld ID:${WorldID}: ${err.message}`);
        res.status(500).send('Server error');
    } finally {
        if (pool) {
            try {
                await pool.close();
                log.db.close();
            } catch (err) {
                log.db.error(`Connection close error: ${err.message}`);
            }
        }
    }
});

// Обработчик маршрута для обновления данных в GameWorldCluster
router.post('/update-game-world-cluster', isAdmin, async(req, res) => {
    const user = req.session.user;
    const { WorldClusterID, ...updateData } = req.body;
    
    const clusterId = Array.isArray(WorldClusterID) ? Number(WorldClusterID[0]) : Number(WorldClusterID);
    log.adminAction(`Updating GameWorldCluster ID:${clusterId}`, user);

    if (isNaN(clusterId)) {
        log.warning(`Invalid WorldClusterID: ${WorldClusterID}`);
        return res.status(400).json({ success: false, message: 'Invalid WorldClusterID' });
    }

    let pool = null;

    try {
        log.db.connect();
        pool = await sql.connect(configLobbyDb);

        // Получаем текущие данные для сравнения
        const currentDataResult = await pool.request()
            .input('WC_WorldClusterID', sql.SmallInt, clusterId)
            .query('SELECT * FROM GameWorldCluster WHERE WorldClusterID = @WC_WorldClusterID');
        
        if (!currentDataResult.recordset.length) {
            log.warning(`GameWorldCluster ID:${clusterId} not found`);
            return res.status(404).json({ success: false, message: 'GameWorldCluster not found' });
        }

        const currentData = currentDataResult.recordset[0];
        
        // Подготавливаем данные для обновления
        const preparedData = {
            GamePublicIPv4Address: updateData.GamePublicIPv4Address,
            GamePublicPort: updateData.GamePublicPort,
            MaxPlayerCount: updateData.MaxPlayerCount,
            MaxWaitingCount: updateData.MaxWaitingCount,
            GameInternalIPv4Address: updateData.GameInternalIPv4Address,
            GameInternalPort: updateData.GameInternalPort
        };

        // Логируем изменения
        logChanges('GameWorldCluster', clusterId, user, currentData, preparedData);

        // Выполняем обновление
        await pool.request()
            .input('WC_WorldClusterID', sql.SmallInt, clusterId)
            .input('GW_GamePublicIPv4Address', sql.NChar, preparedData.GamePublicIPv4Address)
            .input('GW_GamePublicPort', sql.Int, preparedData.GamePublicPort)
            .input('GW_MaxPlayerCount', sql.Int, preparedData.MaxPlayerCount)
            .input('GW_MaxWaitingCount', sql.Int, preparedData.MaxWaitingCount)
            .input('GW_GameInternalIPv4Address', sql.NChar, preparedData.GameInternalIPv4Address)
            .input('GW_GameInternalPort', sql.Int, preparedData.GameInternalPort)
            .query(`
                UPDATE GameWorldCluster
                SET 
                    GamePublicIPv4Address = @GW_GamePublicIPv4Address,
                    GamePublicPort = @GW_GamePublicPort,
                    MaxPlayerCount = @GW_MaxPlayerCount,
                    MaxWaitingCount = @GW_MaxWaitingCount,
                    GameInternalIPv4Address = @GW_GameInternalIPv4Address,
                    GameInternalPort = @GW_GameInternalPort
                WHERE WorldClusterID = @WC_WorldClusterID
            `);

        log.success(`GameWorldCluster ID:${clusterId} updated successfully by ${user.username}`);
        res.json({ success: true, message: 'GameWorldCluster data updated successfully!' });
    } catch (err) {
        log.error(`Update failed for GameWorldCluster ID:${clusterId}: ${err.message}`);
        res.status(500).send('Server error');
    } finally {
        if (pool) {
            try {
                await pool.close();
                log.db.close();
            } catch (err) {
                log.db.error(`Connection close error: ${err.message}`);
            }
        }
    }
});

export default router;