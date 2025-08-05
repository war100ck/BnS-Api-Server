import express from 'express';
import { configPlatformAcctDb, configBlGame } from '../config/dbConfig.js';
import { convertFaction, convertSex, convertRace, convertJob, convertMoney } from '../utils/dataTransformations.js';
import { isAdmin } from '../middleware/adminMiddleware.js';
import sql from 'mssql';

const router = express.Router();

// Обработчик запроса на получение статистики
router.get('/admin/game-stats', isAdmin, async(req, res) => {
    let pool = null;

    try {
        // Подключение к базе данных BlGame
        await sql.connect(configBlGame);

        // Запрос для получения статистики по персонажам
        const result = await sql.query(`
      SELECT
        deletion, race, sex, job, name, faction, game_account_id, level, money
      FROM
        dbo.CreatureProperty
    `);

        // Статистика
        const statistics = {
            deletionCount: 0,
            races: {},
            sexes: {
                male: 0,
                female: 0
            },
            jobs: {},
            names: [],
            factions: {
                "Cerulean Order": 0,
                "Crimson Legion": 0
            },
            accounts: {},
            characters: [],
            accountCount: 0,
            levels: {},
            totalUsers: 0,
            totalMoney: {
                gold: 0,
                silver: 0,
                copper: 0
            }
        };

        // Обработка данных из BlGame
        result.recordset.forEach((character) => {
            if (Number(character.deletion) === 1)
                statistics.deletionCount++;
            const race = convertRace(character.race).name;
            statistics.races[race] = (statistics.races[race] || 0) + 1;

            const sex = convertSex(character.sex).name;
            if (sex === 'Male')
                statistics.sexes.male++;
            else if (sex === 'Female')
                statistics.sexes.female++;

            const job = convertJob(character.job).name;
            statistics.jobs[job] = (statistics.jobs[job] || 0) + 1;

            statistics.names.push(character.name);
            statistics.characters.push({
                name: character.name,
                race: convertRace(character.race).name,
                raceImageUrl: convertRace(character.race).imageUrl,
                sex: convertSex(character.sex).name,
                sexIconClass: convertSex(character.sex).iconClass,
                job: convertJob(character.job).name,
                jobImageUrl: convertJob(character.job).imageUrl,
                deletion: Number(character.deletion) === 1 ? 'Deleted' : 'Not deleted',
                deletionClass: Number(character.deletion) === 1 ? 'deleted-count' : '',
                money: convertMoney(character.money) // Возвращает объект с value и imageUrl
            });

            // Обработка денег персонажа
            const money = convertMoney(character.money);

            // Сначала добавляем медь (может вызвать переполнение)
            statistics.totalMoney.copper += money.copper.value;

            // Перенос избыточной меди в серебро (если медь >= 100)
            statistics.totalMoney.silver += Math.floor(statistics.totalMoney.copper / 100);
            statistics.totalMoney.copper %= 100;

            // Добавляем серебро персонажа + перенос из меди
            statistics.totalMoney.silver += money.silver.value;

            // Перенос избыточного серебра в золото (если серебро >= 100)
            statistics.totalMoney.gold += Math.floor(statistics.totalMoney.silver / 100);
            statistics.totalMoney.silver %= 100;

            // Добавляем золото персонажа + перенос из серебра
            statistics.totalMoney.gold += money.gold.value;

            const faction = convertFaction(character.faction).name;
            if (faction === "Cerulean Order" || faction === "Crimson Legion") {
                statistics.factions[faction] = (statistics.factions[faction] || 0) + 1;
            }

            // Добавление в список аккаунтов
            if (character.game_account_id) {
                statistics.accounts[character.game_account_id] = true;
            }

            // Группировка уровней по диапазонам
            const levelGroup = Math.ceil(character.level / 10); // Деление уровня на 10 и округление вверх
            const levelRange = `${(levelGroup - 1) * 10 + 1}-${levelGroup * 10}`; // Диапазон, например, "1-10"
            statistics.levels[levelRange] = (statistics.levels[levelRange] || 0) + 1;
        });

        // Подсчёт уникальных аккаунтов
        statistics.accountCount = Object.keys(statistics.accounts).length;

        // Подключение к базе PlatformAcctDb
        pool = await sql.connect(configPlatformAcctDb);

        // Запрос количества записей в таблице Users
        const userCountResult = await pool.request().query(`
  SELECT COUNT(*) AS count
  FROM [PlatformAcctDb].[dbo].[Users]
`);

        // Сохранение количества пользователей в статистику
        statistics.totalUsers = userCountResult.recordset[0].count;

        // Отправка статистики
        res.render('gameStats', {
            statistics,
            pathname: req.originalUrl,
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка сервера');
    } finally {
        // Закрытие соединения с базой данных
        sql.close();
    }
});

export default router;
