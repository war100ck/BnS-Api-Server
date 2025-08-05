import express from 'express';
import sql from 'mssql';
import { isAdmin } from '../middleware/adminMiddleware.js';
import { configPlatformAcctDb, configBlGame, configVirtualCurrencyDb, configLobbyDb } from '../config/dbConfig.js';
import { convertFaction, convertSex, convertRace, convertJob } from '../utils/dataTransformations.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Настройки логирования из .env
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE === 'true';
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';

// Список полей, которые нужно логировать при изменениях
const LOGGED_FIELDS = [
    'level', 'exp', 'mastery_level', 'mastery_exp', 'hp',
    'money', 'money_diff', 'faction', 'faction2', 'faction_reputation',
    'inventory_size', 'depository_size', 'wardrobe_size',
    'premium_depository_size', 'acquired_skill_build_up_point',
    'account_exp_to_add', 'account_exp_added', 'account_exp_added_time',
    'account_exp_by_pc', 'activated_badge_page', 'pvp_mode',
    'guild_invitation_refusal', 'slate_page', 'guild_point'

];

// Форматирование статуса администратора
const formatAdminStatus = (status) => {
    return status
        ? chalk.bgGreen.white.bold(' ADMIN ')
        : chalk.bgBlue.white.bold(' USER ');
};

// Логирование (приведено в соответствие с adminRoutes.js)
const log = {
    // Основные логи
    error: (message) => LOG_TO_CONSOLE && console.log(chalk.red(`[ERROR] ${message}`)),
    warning: (message) => LOG_TO_CONSOLE && console.log(chalk.yellow(`[WARNING] ${message}`)),
    adminAction: (message, user = null) => {
        if (!LOG_TO_CONSOLE) return;
        const userInfo = user
            ? `${formatAdminStatus(user.admin)} ${chalk.magenta(user.username)} (ID: ${chalk.cyan(user.id)})`
            : '';
        console.log(chalk.magenta(`[ADMIN] ${message} ${userInfo}`));
    },

    // Отладочные логи
    info: (message) => DEBUG_LOGS && console.log(chalk.blue(`[INFO] ${message}`)),
    success: (message) => DEBUG_LOGS && console.log(chalk.green(`[SUCCESS] ${message}`)),
    db: (message) => DEBUG_LOGS && console.log(chalk.cyan(`[DB] ${message}`)),
    debug: (message) => DEBUG_LOGS && console.log(chalk.gray(`[DEBUG] ${message}`)),
    
    // Специфичные логи для изменений персонажей
    changes: (username, isAdmin, characterName, changes) => {
        if (!LOG_TO_CONSOLE || !changes.length) return;
        
        const changesText = changes.map(change => 
            `${change.field}: ${change.oldValue} → ${change.newValue}`
        ).join(', ');
        
        console.log(
            `${chalk.magenta('[ADMIN]')} ${formatAdminStatus(isAdmin)} ${chalk.magenta(username)} ` +
            `updated character ${chalk.yellow(characterName)}. ` +
            `Changes: ${chalk.green(changesText)}`
        );
    }
};

// Функция для работы с БД (обновлена для логирования соединений)
async function executeQuery(config, query, inputs = {}) {
    let pool = null;
    try {
        log.db(`Connecting to database: ${chalk.yellow(config.database)}`);
        pool = await sql.connect(config);
        log.db(`Connection established to: ${chalk.yellow(config.database)}`);
        
        const request = pool.request();
        Object.entries(inputs).forEach(([name, value]) => {
            request.input(name, value);
        });

        log.db(`Executing query: ${chalk.yellow(query.substring(0, 50))}...`);
        const result = await request.query(query);
        log.success(`Query completed successfully on ${chalk.yellow(config.database)}`);
        return result;
    } catch (err) {
        log.error(`Database error on ${chalk.yellow(config.database)}: ${chalk.red(err.message)}\nQuery: ${chalk.yellow(query)}`);
        throw err;
    } finally {
        if (pool) {
            try {
                await pool.close();
                log.db(`Connection closed for database: ${chalk.yellow(config.database)}`);
            } catch (err) {
                log.error(`Connection close error for ${chalk.yellow(config.database)}: ${chalk.red(err.message)}`);
            }
        }
    }
}

// Получение страницы редактирования персонажа
router.get('/admin/edit-character', isAdmin, async(req, res) => {
    const { userId, userName } = req.query;
    const currentUser = req.session.user;

    if (!userId && !userName) {
        log.warning(`Missing userId or userName parameter from ${formatAdminStatus(true)} ${chalk.magenta(currentUser.username)}`);
        return res.status(400).send('Требуется userId или userName');
    }

    log.info(`Edit character request by ${formatAdminStatus(true)} ${chalk.magenta(currentUser.username)} for ${userId ? 'userId: ' + chalk.yellow(userId) : 'userName: ' + chalk.yellow(userName)}`);

    let pool = null;
    try {
        // Подключение к PlatformAcctDb
        const userResult = await executeQuery(
            configPlatformAcctDb,
            'SELECT UserId, UserName, LoginName, Created FROM Users WHERE ' + 
            (userId ? 'UserId = @userId' : 'UserName = @userName'),
            userId ? { userId } : { userName }
        );

        const user = userResult.recordset[0];
        if (!user) {
            log.warning(`User not found: ${userId ? 'userId: ' + chalk.red(userId) : 'userName: ' + chalk.red(userName)}`);
            return res.status(404).send('Пользователь не найден');
        }

        // Подключение к BlGame для данных персонажей
        const creaturesResult = await executeQuery(
            configBlGame,
            `SELECT
                pcid, game_account_id, world_id, race, sex, job, 
                name, yaw, level, exp, mastery_level, mastery_exp, hp, 
                money, money_diff, faction, faction2, faction_reputation, 
                inventory_size, depository_size, wardrobe_size, 
                premium_depository_size, acquired_skill_build_up_point, 
                account_exp_to_add, account_exp_added, account_exp_added_time, 
                account_exp_by_pc, activated_badge_page, pvp_mode, 
                guild_invitation_refusal, slate_page, guild_point,
                deletion, deletion_time
             FROM CreatureProperty 
             WHERE game_account_id = @game_account_id`,
            { game_account_id: user.UserId }
        );

        log.db(`Found ${chalk.green(creaturesResult.recordset.length)} characters for user ${chalk.cyan(user.UserName)}`);

        // Преобразование данных персонажей
        let creatures = creaturesResult.recordset.map(creature => {
            const displayJob = convertJob(creature.job);
            const displayRace = convertRace(creature.race);
            const displaySex = convertSex(creature.sex);
            const displayFaction = convertFaction(creature.faction);

            return {
                ...creature,
                deletion: creature.deletion === 1 || creature.deletion === true,
                displayData: {
                    job: displayJob.name,
                    jobImageUrl: displayJob.imageUrl,
                    race: displayRace.name,
                    raceImageUrl: displayRace.imageUrl,
                    sex: displaySex.name,
                    sexImageUrl: displaySex.imageUrl,
                    faction: displayFaction.name,
                    factionImageUrl: displayFaction.imageUrl
                }
            };
        });

        // Подключение к VirtualCurrencyDb для данных депозитов
        const depositsResult = await executeQuery(
            configVirtualCurrencyDb,
            'SELECT DepositId, Amount, Balance FROM Deposits WHERE UserId = @userId',
            { userId: user.UserId }
        );

        const deposits = depositsResult.recordset || [];
        const totalBalance = deposits.reduce((acc, deposit) => acc + Number(deposit.Balance), 0);
        const totalAmount = deposits.reduce((acc, deposit) => acc + Number(deposit.Amount), 0);
        
        log.db(`Deposit info: ${chalk.green(deposits.length)} deposits, total balance: ${chalk.green(totalBalance)}, total amount: ${chalk.green(totalAmount)}`);
		
		// Получаем данные о последней активности из LobbyDb
const gameAccountQuery = 'SELECT LastLoginTime, LastLogoutTime, LastAccessIPv4Address FROM GameAccount WITH (NOLOCK) WHERE GameAccountID = @gameAccountId';
const gameAccountResult = await executeQuery(
    configLobbyDb,
    gameAccountQuery,
    { gameAccountId: user.UserId }
);
const gameAccountData = gameAccountResult.recordset[0] || {};


        // Рендеринг страницы
        res.render('edit-character', {
            UserId: user.UserId,
            UserName: user.UserName,
            LoginName: user.LoginName,
            Created: user.Created,
            creatures: creatures,
            deposits: deposits,
            totalBalance: totalBalance,
            totalAmount: totalAmount,
            pathname: req.originalUrl,
			lastLoginTime: formatDateTime(gameAccountData.LastLoginTime),
            lastLogoutTime: formatDateTime(gameAccountData.LastLogoutTime),
            lastAccessIP: gameAccountData.LastAccessIPv4Address || 'Unknown'
        });

        log.success(`Successfully rendered edit page for user ${chalk.cyan(user.UserName)} with ${chalk.green(creatures.length)} characters`);

    } catch (err) {
        log.error(`Server error: ${chalk.red(err.message)}`);
        res.status(500).send('Ошибка сервера');
    }
});

// Обновление данных персонажа
router.post('/update-character', isAdmin, async(req, res) => {
    const { pcid, field, value } = req.body;
    const currentUser = req.session.user;

    log.debug(`Update request from ${formatAdminStatus(true)} ${chalk.magenta(currentUser.username)}: character ID ${chalk.yellow(pcid)}, field ${chalk.yellow(field)} to ${chalk.yellow(value)}`);

    // Проверяем, нужно ли логировать это поле
    const shouldLogField = LOGGED_FIELDS.includes(field);

    try {
        // Получаем текущее значение поля и имя персонажа
        const characterInfo = await executeQuery(
            configBlGame,
            `SELECT ${field}, name FROM CreatureProperty WHERE pcid = @pcid`,
            { pcid }
        );

        if (!characterInfo.recordset.length) {
            log.warning(`Character not found: pcid ${chalk.red(pcid)}`);
            return res.status(404).json({ success: false, message: 'Character not found' });
        }

        const oldValue = characterInfo.recordset[0][field];
        const characterName = characterInfo.recordset[0].name;
        
        // Если значение не изменилось, пропускаем обновление
        if (oldValue == value) {
            log.debug(`No changes detected for field ${chalk.yellow(field)} (old: ${oldValue}, new: ${value})`);
            return res.json({ success: true, message: 'No changes detected', updatedField: field, updatedValue: value, characterName });
        }

        // Обновляем значение в базе данных
        await executeQuery(
            configBlGame,
            `UPDATE CreatureProperty SET ${field} = @value WHERE pcid = @pcid`,
            { pcid, value: value }
        );

        // Логируем изменения только для важных полей
        if (shouldLogField) {
            log.changes(
                currentUser.username,
                currentUser.admin,
                characterName,
                [{ field, oldValue, newValue: value }]
            );
        }

        res.json({ 
            success: true, 
            message: 'Character updated successfully', 
            updatedField: field, 
            updatedValue: value, 
            characterName 
        });

        log.success(`Successfully updated field ${chalk.yellow(field)} for character ${chalk.yellow(characterName)}`);

    } catch (err) {
        log.error(`Update failed: ${chalk.red(err.message)}`);
        res.status(500).json({ success: false, message: 'Failed to update character', error: err.message });
    }
});

// Функция для определения типа SQL параметра на основе имени поля
function getSqlType(field) {
    if ([
        'level', 'exp', 'exp_boost', 'mastery_level', 'mastery_exp', 'mastery_penalty_exp',
        'hp', 'money', 'money_diff', 'faction_reputation', 'achievement_step', 
        'ability_achievement_step', 'enter_world_duration', 'combat_duration',
        'inventory_size', 'depository_size', 'wardrobe_size', 'production_1', 
        'production_2', 'gathering_1', 'gathering_2', 'production_1_exp', 
        'production_2_exp', 'gathering_1_exp', 'gathering_2_exp', 'duel_point', 
        'party_battle_point', 'field_play_point', 'shop_sale_count', 'heart_count'
    ].includes(field)) {
        return sql.Int;
    }
    
    return sql.NVarChar;
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


export default router;