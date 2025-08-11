// /routes/blockRoutes.js
import express from 'express';
import sql from 'mssql';
import chalk from 'chalk';
import axios from 'axios';
import { configLobbyDb, configPlatformAcctDb } from '../config/dbConfig.js';
import { convertJob } from '../utils/dataTransformations.js';
import { isAdmin } from '../middleware/adminMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Настройки логирования из .env
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE === 'true'; // Основные логи (ошибки, важные события)
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true'; // Отладочные логи (запросы к БД, подробная информация)

// Функция для форматирования статуса администратора
const formatAdminStatus = (status) => {
    return status
     ? chalk.bgGreen.white.bold(' ADMIN ')
     : chalk.bgBlue.white.bold(' USER ');
};

// Настройки цветов для логов
const log = {
    // Основные логи (включаются при LOG_TO_CONSOLE=true)
    error: (message) => LOG_TO_CONSOLE && console.log(chalk.red(`[ERROR] ${message}`)),
    warning: (message) => LOG_TO_CONSOLE && console.log(chalk.yellow(`[WARNING] ${message}`)),
    action: (message, user = null) => {
        if (!LOG_TO_CONSOLE) return;
        const userInfo = user
             ? `${formatAdminStatus(user.admin)} ${chalk.magenta(user.username)} (ID: ${chalk.cyan(user.id)})`
             : '';
        console.log(chalk.magenta(`[ACTION] ${message} ${userInfo}`));
    },
    kick: (userName, userId, reason = '') => {
        if (!LOG_TO_CONSOLE) return;
        const reasonText = reason ? `for ${chalk.yellow(reason)}` : '';
        console.log(chalk.magenta(`[KICK] Kicking user ${chalk.cyan(userName)} (ID: ${chalk.yellow(userId)}) ${reasonText}`));
    },
    block: (action, pcid, characterName, userName, userId, byUser) => {
        if (!LOG_TO_CONSOLE) return;
        const actionText = action === 'block' 
            ? chalk.bgRed.white.bold(' BLOCKED ') 
            : chalk.bgGreen.white.bold(' UNBLOCKED ');
        const byText = byUser ? `by ${formatAdminStatus(true)} ${chalk.magenta(byUser)}` : '';
        console.log(`${actionText} Character ${chalk.cyan(characterName)} (PCID: ${chalk.yellow(pcid)}) of user ${chalk.cyan(userName)} (ID: ${chalk.yellow(userId)}) ${byText}`);
    },

    // Отладочные логи (включаются при DEBUG_LOGS=true)
    info: (message) => DEBUG_LOGS && console.log(chalk.blue(`[INFO] ${message}`)),
    success: (message) => DEBUG_LOGS && console.log(chalk.green(`[SUCCESS] ${message}`)),
    db: (message) => DEBUG_LOGS && console.log(chalk.cyan(`[DB] ${message}`)),
    debug: (message) => DEBUG_LOGS && console.log(chalk.gray(`[DEBUG] ${message}`)),
    dbConnect: (dbName) => DEBUG_LOGS && console.log(chalk.cyan(`[DB] Connecting to ${chalk.bold(dbName)}...`)),
    dbConnected: (dbName) => DEBUG_LOGS && console.log(chalk.green(`[DB] Successfully connected to ${chalk.bold(dbName)}`)),
    dbQuery: (query, dbName) => DEBUG_LOGS && console.log(chalk.cyan(`[DB] Executing query on ${chalk.bold(dbName)}: ${chalk.yellow(query.substring(0, 50))}...`))
};

const getCharacterStatus = (state) => {
    const statusMap = {
        1: 'Creating',
        2: 'Normal',
        3: 'Deleting',
        4: 'Pending Deletion',
        5: 'Restoring',
        6: 'Deleted'
    };
    return statusMap[state] || 'Unknown';
};

const getBlockStatus = async (pool, pcid) => {
    try {
        const blockQuery = `SELECT TOP 1 * FROM [LobbyDb].[dbo].[Block] 
                          WHERE PCID = @pcid 
                          ORDER BY BlockTime DESC`;
        
        const result = await pool.request()
            .input('pcid', sql.BigInt, pcid)
            .query(blockQuery);

        if (result.recordset.length === 0) {
            return { isBlocked: false };
        }

        const latestBlock = result.recordset[0];
        return {
            isBlocked: !latestBlock.ReleaseTime,
            blockData: latestBlock
        };
    } catch (err) {
        log.error(`Error checking block status for PCID ${pcid}: ${err.message}`);
        return { isBlocked: false };
    }
};

const getAccessSrvVersion = async () => {
    try {
        const targetUrl = 'http://127.0.0.1:6605/spawned/AccessSrv.1.$/';
        const response = await axios.get(targetUrl, { timeout: 5000 });
        return response.status === 200 ? '$' : null;
    } catch (error) {
        log.error(`Error fetching AccessSrv version: ${error.message}`);
        return null;
    }
};

const kickUser = async (userId, reason = 'Banned') => {
    try {
        const currentVersion = await getAccessSrvVersion();
        if (!currentVersion) {
            throw new Error('Could not get AccessSrv version');
        }

        const url = `http://127.0.0.1:6605/spawned/AccessSrv.1.${currentVersion}/access/kick`;
        const params = {
            UserId: userId,
            Reason: reason,
            AppGroupId: 2,
            AppId: 'bns'
        };

        await axios.get(url, { params });
        return true;
    } catch (error) {
        log.error(`Error kicking user ${userId}: ${error.message}`);
        return false;
    }
};

router.get('/admin/block', isAdmin, async (req, res) => {
    const { userName: queryUserName, userId: queryUserId } = req.query;
    const currentUser = req.session.user;

    if (!queryUserName && !queryUserId) {
        log.warning('Username or UserId is required');
        log.action('Attempted to access block page without username or user ID', currentUser);
        return res.status(400).render('block', {
            errorMessage: 'Username or UserId is required',
            userName: '',
            userId: '',
            characters: null,
            pathname: req.originalUrl
        });
    }

    let platformPool = null;
    let lobbyPool = null;
    let targetUserName = queryUserName || '';
    let targetUserId = queryUserId || '';

    try {
        if (queryUserName && !queryUserId) {
            log.dbConnect('PlatformAcctDb');
            platformPool = await sql.connect(configPlatformAcctDb);
            log.dbConnected('PlatformAcctDb');

            const userQuery = 'SELECT UserId, UserName FROM PlatformAcctDb.dbo.Users WITH (NOLOCK) WHERE UserName = @userName';
            log.dbQuery(userQuery, 'PlatformAcctDb');

            const result = await platformPool.request()
                .input('userName', sql.NVarChar, queryUserName)
                .query(userQuery);

            if (result.recordset.length === 0) {
                log.warning(`User not found: ${chalk.cyan(queryUserName)}`);
                log.action(`Attempted to find non-existent user: ${chalk.cyan(queryUserName)}`, currentUser);
                return res.status(404).render('block', {
                    errorMessage: 'User not found',
                    userName: queryUserName,
                    userId: '',
                    characters: null,
                    pathname: req.originalUrl
                });
            }

            targetUserId = result.recordset[0].UserId;
            targetUserName = result.recordset[0].UserName;
            log.success(`Found UserId: ${chalk.yellow(targetUserId)} for username: ${chalk.cyan(queryUserName)}`);
        } else if (queryUserId && !queryUserName) {
            log.dbConnect('PlatformAcctDb');
            platformPool = await sql.connect(configPlatformAcctDb);
            log.dbConnected('PlatformAcctDb');

            const userQuery = 'SELECT UserName FROM PlatformAcctDb.dbo.Users WITH (NOLOCK) WHERE UserId = @userId';
            log.dbQuery(userQuery, 'PlatformAcctDb');

            const result = await platformPool.request()
                .input('userId', sql.UniqueIdentifier, queryUserId)
                .query(userQuery);

            if (result.recordset.length === 0) {
                log.warning(`User not found with ID: ${chalk.yellow(queryUserId)}`);
                log.action(`Attempted to find non-existent user ID: ${chalk.yellow(queryUserId)}`, currentUser);
                return res.status(404).render('block', {
                    errorMessage: 'User not found',
                    userName: '',
                    userId: queryUserId,
                    characters: null,
                    pathname: req.originalUrl
                });
            }

            targetUserName = result.recordset[0].UserName;
            log.success(`Found UserName: ${chalk.cyan(targetUserName)} for userId: ${chalk.yellow(queryUserId)}`);
        }

        log.action(`Accessing block management for user ${chalk.cyan(targetUserName)} (ID: ${chalk.yellow(targetUserId)})`, currentUser);

        log.dbConnect('LobbyDb');
        lobbyPool = await sql.connect(configLobbyDb);
        log.dbConnected('LobbyDb');

        const charactersQuery = `SELECT 
                c.PCID, 
                c.Job, 
                c.CharacterName,
                c.Level,
                c.CharacterState,
                c.RegistrationTime,
                c.LastPlayStartTime,
                c.LastPlayEndTime
            FROM [LobbyDb].[dbo].[Character] c WITH (NOLOCK)
            WHERE c.GameAccountID = @gameAccountId
            ORDER BY c.RegistrationTime DESC`;

        log.dbQuery(charactersQuery, 'LobbyDb');
        const charactersResult = await lobbyPool.request()
            .input('gameAccountId', sql.UniqueIdentifier, targetUserId)
            .query(charactersQuery);

        let characters = charactersResult.recordset;
        log.info(`Found ${chalk.green(characters?.length || 0)} characters for user ${chalk.yellow(targetUserId)}`);

        if (!characters || characters.length === 0) {
            log.warning(`No characters found for user ID: ${chalk.yellow(targetUserId)}`);
            characters = null;
        } else {
            for (let character of characters) {
                const convertedJob = convertJob(character.Job);
                const blockStatus = await getBlockStatus(lobbyPool, character.PCID);

                character.jobName = convertedJob.name;
                character.jobImageUrl = convertedJob.imageUrl;
                character.registrationDate = new Date(character.RegistrationTime).toLocaleString();
                character.lastPlayStart = character.LastPlayStartTime ? 
                    new Date(character.LastPlayStartTime).toLocaleString() : 'Never';
                character.lastPlayEnd = character.LastPlayEndTime ? 
                    new Date(character.LastPlayEndTime).toLocaleString() : 'Never';
                character.status = getCharacterStatus(character.CharacterState);
                character.isBlocked = blockStatus.isBlocked;
                character.blockData = blockStatus.blockData;
                character.userId = targetUserId;
            }
        }

        log.success(`Characters data loaded successfully for ${chalk.cyan(targetUserName)} (ID: ${chalk.yellow(targetUserId)})`);
        res.render('block', {
            userName: targetUserName,
            userId: targetUserId,
            characters: characters,
            errorMessage: null,
            pathname: req.originalUrl
        });

    } catch (err) {
        log.error(`Error in block route: ${chalk.red(err.message)}`);
        log.error(`Stack trace: ${chalk.gray(err.stack)}`);
        res.status(500).render('block', {
            errorMessage: 'Server error',
            userName: targetUserName,
            userId: targetUserId,
            characters: null,
            pathname: req.originalUrl
        });
    } finally {
        const closeConnection = async (pool, name) => {
            try {
                if (pool && pool.connected) {
                    await pool.close();
                    log.debug(`Closed ${name} connection`);
                }
            } catch (closeErr) {
                log.error(`Error closing ${name} connection: ${chalk.red(closeErr.message)}`);
            }
        };

        await closeConnection(platformPool, 'PlatformAcctDb');
        await closeConnection(lobbyPool, 'LobbyDb');
    }
});

router.post('/admin/block/character', isAdmin, async (req, res) => {
    const { pcid, blockerName, blockReason, blockComment } = req.body;
    const { userId, characterName } = req.body;
    let pool = null;

    if (!pcid || !blockerName || !blockReason) {
        log.warning('Missing required fields for block character');
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required fields: pcid, blockerName, blockReason' 
        });
    }

    try {
        log.dbConnect('LobbyDb');
        pool = await sql.connect(configLobbyDb);
        log.dbConnected('LobbyDb');

        const insertQuery = `INSERT INTO [LobbyDb].[dbo].[Block] (
            PCID, BlockType, BlockReason, BlockerName, BlockComment, BlockTime
        ) VALUES (
            @pcid, 1, @blockReason, @blockerName, @blockComment, GETDATE()
        )`;

        await pool.request()
            .input('pcid', sql.BigInt, pcid)
            .input('blockReason', sql.TinyInt, blockReason)
            .input('blockerName', sql.NVarChar, blockerName)
            .input('blockComment', sql.NVarChar, blockComment || '')
            .query(insertQuery);

        log.block('block', pcid, characterName, blockerName, userId, blockerName);
        log.success(`Character ${chalk.cyan(characterName)} (PCID: ${chalk.yellow(pcid)}) blocked by ${chalk.magenta(blockerName)}`);
        
        res.json({ 
            success: true, 
            message: 'Character blocked successfully' 
        });
    } catch (err) {
        log.error(`Error blocking character ${chalk.yellow(pcid)}: ${chalk.red(err.message)}`);
        res.status(500).json({ 
            success: false, 
            message: 'Error blocking character',
            error: err.message 
        });
    } finally {
        try {
            if (pool && pool.connected) {
                await pool.close();
                log.debug('Closed LobbyDb connection');
            }
        } catch (closeErr) {
            log.error(`Error closing LobbyDb connection: ${chalk.red(closeErr.message)}`);
        }
    }
});

router.post('/admin/unblock/character', isAdmin, async (req, res) => {
    const { pcid, releaserName, releaseReason, releaseComment } = req.body;
    const { userId, characterName } = req.body;
    let pool = null;

    if (!pcid || !releaserName || !releaseReason) {
        log.warning('Missing required fields for unblock character');
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required fields: pcid, releaserName, releaseReason' 
        });
    }

    try {
        log.dbConnect('LobbyDb');
        pool = await sql.connect(configLobbyDb);
        log.dbConnected('LobbyDb');

        const findBlockQuery = `SELECT TOP 1 BlockID FROM [LobbyDb].[dbo].[Block] 
                              WHERE PCID = @pcid AND ReleaseTime IS NULL 
                              ORDER BY BlockTime DESC`;

        const blockResult = await pool.request()
            .input('pcid', sql.BigInt, pcid)
            .query(findBlockQuery);

        if (!blockResult.recordset[0]) {
            log.warning(`No active block found for character ${chalk.yellow(pcid)}`);
            return res.status(404).json({ 
                success: false, 
                message: 'No active block found for this character' 
            });
        }

        const blockId = blockResult.recordset[0].BlockID;

        const updateQuery = `UPDATE [LobbyDb].[dbo].[Block] SET
            ReleaseReason = @releaseReason,
            ReleaserName = @releaserName,
            ReleaseComment = @releaseComment,
            ReleaseTime = GETDATE()
            WHERE BlockID = @blockId`;

        await pool.request()
            .input('blockId', sql.BigInt, blockId)
            .input('releaseReason', sql.TinyInt, releaseReason)
            .input('releaserName', sql.NVarChar, releaserName)
            .input('releaseComment', sql.NVarChar, releaseComment || '')
            .query(updateQuery);

        log.block('unblock', pcid, characterName, releaserName, userId, releaserName);
        log.success(`Character ${chalk.cyan(characterName)} (PCID: ${chalk.yellow(pcid)}) unblocked by ${chalk.magenta(releaserName)}`);
        
        res.json({ 
            success: true, 
            message: 'Character unblocked successfully' 
        });
    } catch (err) {
        log.error(`Error unblocking character ${chalk.yellow(pcid)}: ${chalk.red(err.message)}`);
        res.status(500).json({ 
            success: false, 
            message: 'Error unblocking character',
            error: err.message 
        });
    } finally {
        try {
            if (pool && pool.connected) {
                await pool.close();
                log.debug('Closed LobbyDb connection');
            }
        } catch (closeErr) {
            log.error(`Error closing LobbyDb connection: ${chalk.red(closeErr.message)}`);
        }
    }
});

router.post('/admin/kick/user', isAdmin, async (req, res) => {
    const { userId, kickerName, kickReason } = req.body;
    const currentUser = req.session.user;

    if (!userId || !kickerName || !kickReason) {
        log.warning('Missing required fields for kick user');
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required fields: userId, kickerName, kickReason' 
        });
    }

    let pool = null;
    let userName = null;

    try {
        log.dbConnect('PlatformAcctDb');
        pool = await sql.connect(configPlatformAcctDb);
        log.dbConnected('PlatformAcctDb');

        const userQuery = 'SELECT UserName FROM PlatformAcctDb.dbo.Users WHERE UserId = @userId';
        const result = await pool.request()
            .input('userId', sql.UniqueIdentifier, userId)
            .query(userQuery);

        if (result.recordset.length === 0) {
            log.warning(`User not found for kick: ${chalk.yellow(userId)}`);
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        userName = result.recordset[0].UserName;

        const kickSuccess = await kickUser(userId, kickReason);
        if (!kickSuccess) {
            throw new Error('Failed to kick user');
        }

        log.kick(userName, userId, kickReason);
        log.action(`Kicked user ${chalk.cyan(userName)} (ID: ${chalk.yellow(userId)}) for reason: ${chalk.yellow(kickReason)}`, currentUser);

        res.json({ 
            success: true, 
            message: `User ${userName} kicked successfully` 
        });
    } catch (err) {
        log.error(`Error kicking user ${chalk.cyan(userName || userId)}: ${chalk.red(err.message)}`);
        res.status(500).json({ 
            success: false, 
            message: 'Error kicking user',
            error: err.message 
        });
    } finally {
        try {
            if (pool && pool.connected) {
                await pool.close();
                log.debug('Closed PlatformAcctDb connection');
            }
        } catch (closeErr) {
            log.error(`Error closing PlatformAcctDb connection: ${chalk.red(closeErr.message)}`);
        }
    }
});

export default router;