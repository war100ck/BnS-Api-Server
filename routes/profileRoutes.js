// /routes/profileRoutes.js
import express from 'express';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { configPlatformAcctDb, configBlGame, configVirtualCurrencyDb, configBanDb, configLobbyDb } from '../config/dbConfig.js';
import { convertFaction, convertSex, convertRace, convertMoney, convertJob } from '../utils/dataTransformations.js';
import { getVipLevelByUserIdAndAppGroupCode, getSubscriptionDetails } from './GradeMembersRoutes.js';

// Инициализация avatars.json
const avatarsPath = path.join(process.cwd(), 'config', 'avatars.json');
const configDir = path.join(process.cwd(), 'config');

// Проверяем и создаем avatars.json при старте роутера
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
    log.info('Created config directory');
}

if (!fs.existsSync(avatarsPath)) {
    fs.writeFileSync(avatarsPath, JSON.stringify({}, null, 2));
    log.info('Created default avatars.json file');
}

const router = express.Router();
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';

const log = {
    info: (message) => DEBUG_LOGS && console.log(chalk.blue(`[INFO] ${message}`)),
    success: (message) => DEBUG_LOGS && console.log(chalk.green(`[SUCCESS] ${message}`)),
    db: (message) => DEBUG_LOGS && console.log(chalk.cyan(`[DB] ${message}`)),
    debug: (message) => DEBUG_LOGS && console.log(chalk.gray(`[DEBUG] ${message}`)),
    error: (message) => console.error(chalk.red(`[ERROR] ${message}`)),
    warning: (message) => console.log(chalk.yellow(`[WARNING] ${message}`)),
    dbConnect: (dbName) => DEBUG_LOGS && console.log(chalk.cyan(`[DB] Connecting to ${chalk.bold(dbName)}...`)),
    dbConnected: (dbName) => DEBUG_LOGS && console.log(chalk.green(`[DB] Successfully connected to ${chalk.bold(dbName)}`)),
    dbQuery: (query, dbName) => DEBUG_LOGS && console.log(chalk.cyan(`[DB] Executing query on ${chalk.bold(dbName)}: ${chalk.yellow(query.substring(0, 50))}...`))
};

// Проверка и создание avatars.json при инициализации роутера
const avatarsFilePath = path.join(process.cwd(), 'config', 'avatars.json');
if (!fs.existsSync(avatarsFilePath)) {
    fs.writeFileSync(avatarsFilePath, JSON.stringify({}, null, 2));
    log.info('Created default avatars.json file');
}

// Функция для форматирования даты в нужный формат
const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Never';
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getUTCDate();
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    
    return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
};

router.get('/profile', async(req, res) => {
    const { userName } = req.query;

    if (!userName) {
        log.warning('Username is required');
        return res.status(400).render('profile', {
            errorMessage: 'Username is required',
            UserName: '',
            LoginName: '',
            Created: '',
            creatures: null,
            deposits: [],
            totalBalance: 0,
            totalAmount: 0,
            vipLevel: 'Not set',
            statusMessage: { message: '', color: '' },
            expirationDate: null,
            currentAvatar: 'user-avatar.gif',
            activeBan: null,
            lastLoginTime: 'Never',
            lastLogoutTime: 'Never',
            lastAccessIP: 'Unknown'
        });
    }

    let pool = null;

    try {
        log.dbConnect('PlatformAcctDb');
        pool = await sql.connect(configPlatformAcctDb);
        log.dbConnected('PlatformAcctDb');

        const userQuery = 'SELECT UserId, UserName, LoginName, Created FROM PlatformAcctDb.dbo.Users WITH (NOLOCK) WHERE UserName = @userName';
        log.dbQuery(userQuery, 'PlatformAcctDb');

        let result = await pool.request()
            .input('userName', sql.NVarChar, userName)
            .query(userQuery);

        let user = result.recordset[0];

        if (!user) {
            log.warning(`User not found: ${chalk.yellow(userName)}`);
            return res.status(404).render('profile', {
                errorMessage: 'User not found',
                UserName: userName,
                LoginName: '',
                Created: '',
                creatures: null,
                deposits: [],
                totalBalance: 0,
                totalAmount: 0,
                vipLevel: 'Not set',
                statusMessage: { message: '', color: '' },
                expirationDate: null,
                currentAvatar: 'user-avatar.gif',
                activeBan: null,
                lastLoginTime: 'Never',
                lastLogoutTime: 'Never',
                lastAccessIP: 'Unknown'
            });
        }

        log.success(`User found: ${chalk.cyan(user.UserName)} (ID: ${chalk.yellow(user.UserId)})`);

        await pool.close();
        log.debug(`Connection to PlatformAcctDb closed`);
        pool = null;

        // Get GameAccount data from LobbyDb
        log.dbConnect('LobbyDb');
        pool = await sql.connect(configLobbyDb);
        log.dbConnected('LobbyDb');

        const gameAccountQuery = 'SELECT LastLoginTime, LastLogoutTime, LastAccessIPv4Address FROM GameAccount WITH (NOLOCK) WHERE GameAccountID = @gameAccountId';
        log.dbQuery(gameAccountQuery, 'LobbyDb');

        result = await pool.request()
            .input('gameAccountId', sql.UniqueIdentifier, user.UserId)
            .query(gameAccountQuery);

        const gameAccountData = result.recordset[0] || {};
        log.debug(`GameAccount data loaded for user ${chalk.cyan(user.UserId)}`);

        await pool.close();
        log.debug(`Connection to LobbyDb closed`);
        pool = null;

        // Get creatures data
        log.dbConnect('BlGame');
        pool = await sql.connect(configBlGame);
        log.dbConnected('BlGame');

        const creatureQuery = `SELECT
                        pcid, game_account_id, world_id, race, sex, job, 
            name, yaw, level, exp, mastery_level, mastery_exp, hp, 
            money, money_diff, faction, faction2, faction_reputation, 
            inventory_size, depository_size, wardrobe_size, 
            premium_depository_size, acquired_skill_build_up_point, 
            account_exp_to_add, account_exp_added, account_exp_added_time, 
            account_exp_by_pc, activated_badge_page, pvp_mode, 
            guild_invitation_refusal, slate_page, guild_point
          FROM CreatureProperty WITH (NOLOCK)
          WHERE game_account_id = @game_account_id AND deletion != 1`;

        log.dbQuery(creatureQuery, 'BlGame');
        result = await pool.request()
            .input('game_account_id', sql.UniqueIdentifier, user.UserId)
            .query(creatureQuery);

        let creatures = result.recordset;
        log.info(`Found ${chalk.yellow(creatures?.length || 0)} creatures for user ${chalk.cyan(user.UserId)}`);

        if (!creatures || creatures.length === 0) {
            log.warning(`No creatures found for user ID: ${chalk.yellow(user.UserId)}`);
            creatures = null;
        } else {
            // Get server names for all creatures
            await pool.close();
            log.debug(`Connection to BlGame closed`);
            
            log.dbConnect('LobbyDb');
            pool = await sql.connect(configLobbyDb);
            log.dbConnected('LobbyDb');

            const worldQuery = 'SELECT WorldName FROM GameWorld WITH (NOLOCK) WHERE WorldId = @world_id';
            
            for (let creature of creatures) {
                log.dbQuery(worldQuery, 'LobbyDb');
                const serverResult = await pool.request()
                    .input('world_id', sql.Int, creature.world_id)
                    .query(worldQuery);
                
                creature.worldName = serverResult.recordset[0]?.WorldName || 'Unknown';
            }

            await pool.close();
            log.debug(`Connection to LobbyDb closed`);
            
            log.dbConnect('BlGame');
            pool = await sql.connect(configBlGame);
            log.dbConnected('BlGame');

            creatures = creatures.map(creature => {
                const convertedFaction = convertFaction(creature.faction);
                const convertedMoney = convertMoney(creature.money);
                const convertedSex = convertSex(creature.sex);
                const convertedRace = convertRace(creature.race);
                const convertedJob = convertJob(creature.job);

                return {
                    ...creature,
                    faction: convertedFaction.name,
                    factionImageUrl: convertedFaction.imageUrl,
                    sex: convertedSex.name,
                    sexIconClass: convertedSex.iconClass,
                    sexImageUrl: convertedSex.imageUrl,
                    race: convertedRace.name,
                    raceImageUrl: convertedRace.imageUrl,
                    job: convertedJob.name,
                    jobImageUrl: convertedJob.imageUrl,
                    money: convertedMoney,
                };
            });
        }

        await pool.close();
        log.debug(`Connection to BlGame closed`);
        pool = null;

        // Get virtual currency data
        log.dbConnect('VirtualCurrencyDb');
        pool = await sql.connect(configVirtualCurrencyDb);
        log.dbConnected('VirtualCurrencyDb');

        const depositQuery = 'SELECT Amount, Balance FROM Deposits WITH (NOLOCK) WHERE UserId = @userId';
        log.dbQuery(depositQuery, 'VirtualCurrencyDb');

        result = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.UserId)
            .query(depositQuery);

        let deposits = result.recordset;
        log.info(`Found ${chalk.yellow(deposits?.length || 0)} deposits for user ${chalk.cyan(user.UserId)}`);

        if (!deposits || deposits.length === 0) {
            log.warning(`No deposits found for user ID: ${chalk.yellow(user.UserId)}`);
            deposits = [];
        }

        let totalBalance = deposits.reduce((acc, deposit) => acc + Number(deposit.Balance), 0);
        let totalAmount = deposits.reduce((acc, deposit) => acc + Number(deposit.Amount), 0);

        await pool.close();
        log.debug(`Connection to VirtualCurrencyDb closed`);
        pool = null;

        // Get ban data
        log.dbConnect('BanDb');
        pool = await sql.connect(configBanDb);
        log.dbConnected('BanDb');

        const banQuery = `SELECT TOP 1 
                B.EffectiveTo, 
                R.BanReason AS BanReason
            FROM [dbo].[BannedUsers] AS B
            LEFT JOIN [dbo].[BanPolicies] AS P ON B.BanPolicyId = P.BanPolicyId
            LEFT JOIN [dbo].[BanReasons] AS R ON P.BanReasonCode = R.BanReasonCode
            WHERE B.UserId = @userId AND B.UnbanStatus = 1 AND B.EffectiveTo > SYSDATETIMEOFFSET()`;

        log.dbQuery(banQuery, 'BanDb');
        result = await pool.request()
            .input('userId', sql.UniqueIdentifier, user.UserId)
            .query(banQuery);

        const activeBan = result.recordset[0] || null;
        log.info(`Active ban status: ${activeBan ? chalk.red('BANNED') : chalk.green('CLEAN')}`);

        await pool.close();
        log.debug(`Connection to BanDb closed`);
        pool = null;

        // Get VIP and subscription data
        log.debug(`Checking VIP status for user ${chalk.cyan(user.UserId)}`);
        const vipLevel = await getVipLevelByUserIdAndAppGroupCode(user.UserId, 'bns');
        const subscriptionDetails = await getSubscriptionDetails(user.UserId);
        log.debug(`VIP Level: ${vipLevel ? chalk.green(vipLevel) : chalk.yellow('Not set')}`);
        log.debug('Subscription Details:', JSON.stringify(subscriptionDetails));

        const isVipExpired = subscriptionDetails && subscriptionDetails.ExpirationDateTime
     ? new Date(subscriptionDetails.ExpirationDateTime) < new Date()
     : true;

// Новый блок: определяем VIP уровень для отображения
const vipLevelToDisplay = !isVipExpired 
    ? (vipLevel || 'Active (no level)') 
    : 'Not set';

const statusMessage = !isVipExpired
     ? {
        message: 'VIP Active',
        color: 'lightgreen',
        imageUrl: '/images/shop/vip-active.png'
    }
     : {
        message: 'No VIP subscription',
        color: 'grey'
    };

        const formattedCreated = new Date(user.Created).toLocaleString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        let currentAvatar = 'user-avatar.gif';

        try {
            const avatarsData = JSON.parse(fs.readFileSync(avatarsFilePath, 'utf8'));
            if (avatarsData[user.UserName]) {
                currentAvatar = avatarsData[user.UserName];
                log.debug(`Loaded custom avatar for ${chalk.cyan(user.UserName)}: ${currentAvatar}`);
            } else {
                log.debug(`Using default avatar for ${chalk.cyan(user.UserName)}`);
            }
        } catch (err) {
            log.error(`Error reading avatars.json: ${chalk.red(err.message)}`);
        }

        log.success(`Profile data loaded successfully for ${chalk.cyan(user.UserName)}`);
res.render('profile', {
    UserName: user.UserName,
    LoginName: user.LoginName,
    Created: formattedCreated,
    creatures: creatures,
    deposits: deposits,
    totalBalance: totalBalance,
    totalAmount: totalAmount,
    vipLevel: vipLevelToDisplay, // Используем исправленное значение
    statusMessage: statusMessage,
    expirationDate: subscriptionDetails ? subscriptionDetails.ExpirationDateTime : null,
    currentAvatar: currentAvatar,
    activeBan: activeBan,
    lastLoginTime: formatDateTime(gameAccountData.LastLoginTime),
    lastLogoutTime: formatDateTime(gameAccountData.LastLogoutTime),
    lastAccessIP: gameAccountData.LastAccessIPv4Address || 'Unknown'
});

    } catch (err) {
        log.error(`Error in profile route: ${chalk.red(err.message)}`);
        log.debug(`Stack trace: ${err.stack}`);
        log.debug(`Request details:`, {
            userName: userName,
            time: new Date().toISOString(),
            dbConfig: pool?.config
        });

        if (pool && pool.connected) {
            try {
                await pool.close();
                log.debug('Connection pool closed after error');
            } catch (closeErr) {
                log.error(`Connection close error: ${chalk.red(closeErr.message)}`);
            }
        }

        res.status(500).render('profile', {
            errorMessage: 'Server error',
            UserName: userName || '',
            LoginName: '',
            Created: '',
            creatures: null,
            deposits: [],
            totalBalance: 0,
            totalAmount: 0,
            vipLevel: 'Not set',
            statusMessage: { message: '', color: '' },
            expirationDate: null,
            currentAvatar: 'user-avatar.gif',
            activeBan: null,
            lastLoginTime: 'Never',
            lastLogoutTime: 'Never',
            lastAccessIP: 'Unknown'
        });
    }
});

router.post('/api/profile/avatar', async(req, res) => {
    const { userName, avatar } = req.body;

    if (!avatar || !userName) {
        log.warning('Invalid request: userName and avatar are required.');
        return res.status(400).send('Invalid request: userName and avatar are required.');
    }

    try {
        let avatarsData = {};

        if (fs.existsSync(avatarsFilePath)) {
            avatarsData = JSON.parse(fs.readFileSync(avatarsFilePath, 'utf8'));
            log.debug(`Loaded existing avatars data with ${Object.keys(avatarsData).length} entries`);
        }

        avatarsData[userName] = avatar;
        log.debug(`Setting avatar for ${chalk.cyan(userName)}: ${avatar}`);

        fs.writeFileSync(avatarsFilePath, JSON.stringify(avatarsData, null, 2), 'utf8');
        log.success(`Avatar updated for user: ${chalk.cyan(userName)}`);
        res.status(200).send('Avatar updated successfully.');
    } catch (err) {
        log.error(`Error updating avatar: ${chalk.red(err.message)}`);
        res.status(500).send('Server error while updating avatar.');
    }
});

router.get('/avatars', async(req, res) => {
    try {
        const avatarsDir = path.join(process.cwd(), 'public/images/avatars');
        log.debug(`Scanning avatars directory: ${avatarsDir}`);

        const files = fs.readdirSync(avatarsDir);
        const avatars = files.filter(file => /\.(png|jpg|jpeg|webp|gif)$/i.test(file) && file !== 'user-avatar.gif');
        
        log.debug(`Loaded ${chalk.yellow(avatars.length)} avatars from directory`);
        res.json({
            success: true,
            avatars
        });
    } catch (err) {
        log.error(`Error reading avatars directory: ${chalk.red(err.message)}`);
        res.status(500).json({
            success: false,
            message: 'Error loading avatars.'
        });
    }
});

router.get('/api/user/avatar', async (req, res) => {
    try {
        const userName = req.query.userName;
        if (!userName) {
            log.warning('Username is required for avatar request');
            return res.status(400).json({ success: false, message: 'Username is required' });
        }

        const avatarsData = await fs.promises.readFile(avatarsPath, 'utf-8');
        const avatars = JSON.parse(avatarsData);
        const userAvatar = avatars[userName] || null;
        const avatarUrl = userAvatar ? `/images/avatars/${userAvatar}` : null;

        log.debug(`Avatar request for ${userName}: ${avatarUrl || 'default avatar'}`);
        res.json({ success: true, avatarUrl });
    } catch (error) {
        log.error(`Error fetching avatar: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error.message 
        });
    }
});

export default router;