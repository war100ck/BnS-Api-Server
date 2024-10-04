// routes/profileRoutes.js
import express from 'express';
import sql from 'mssql';
import { configPlatformAcctDb, configBlGame, configVirtualCurrencyDb, configLobbyDb } from '../config/dbConfig.js';
import { convertFaction, convertSex, convertRace, convertMoney, convertJob } from '../utils/dataTransformations.js';

const router = express.Router();

// Обработчик маршрута для профиля пользователя
router.get('/profile', async (req, res) => {
  const { userName } = req.query;

  let pool = null; // Объявляем pool в начале, чтобы он был доступен в try и finally

  try {
    // Подключение к базе данных PlatformAcctDb
    pool = await sql.connect(configPlatformAcctDb);

    // Запрос для получения UserId по UserName
    let result = await pool.request()
      .input('userName', sql.NVarChar, userName)
      .query('SELECT UserId, UserName, LoginName, Created FROM Users WHERE UserName = @userName');

    let user = result.recordset[0];

    if (!user) {
      return res.status(404).send('Пользователь не найден');
    }

    // Закрываем соединение с первой базой данных
    await pool.close();

    // Подключение к базе данных BlGame
    pool = await sql.connect(configBlGame);

    // Запрос для получения всех данных из таблицы CreatureProperty по game_account_id
    result = await pool.request()
  .input('game_account_id', sql.UniqueIdentifier, user.UserId)
  .query(`SELECT 
            pcid, game_account_id, world_id, race, sex, job, 
            name, yaw, level, exp, mastery_level, mastery_exp, hp, 
            money, money_diff, faction, faction2, faction_reputation, 
            inventory_size, depository_size, wardrobe_size, 
            premium_depository_size, acquired_skill_build_up_point, 
            account_exp_to_add, account_exp_added, account_exp_added_time, 
            account_exp_by_pc, activated_badge_page, pvp_mode, 
            guild_invitation_refusal, slate_page, guild_point
          FROM CreatureProperty 
          WHERE game_account_id = @game_account_id AND deletion != 1`); // Добавлено условие для удаления

    let creatures = result.recordset;

    if (!creatures || creatures.length === 0) {
      // Если персонажи не найдены, устанавливаем в null
      creatures = null;
    } else {
      // Преобразование пола, расы и класса персонажа
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
          sexImageUrl: convertedSex.imageUrl,
          race: convertedRace.name,
          raceImageUrl: convertedRace.imageUrl,
          job: convertedJob.name,
          jobImageUrl: convertedJob.imageUrl,
          money: convertedMoney,
        };
      });
    }

    // Закрываем соединение с базой данных BlGame
    await pool.close();

    // Подключение к базе данных VirtualCurrencyDb
    pool = await sql.connect(configVirtualCurrencyDb);

    // Запрос для получения данных о депозите по UserId
    result = await pool.request()
      .input('userId', sql.UniqueIdentifier, user.UserId)
      .query('SELECT Amount, Balance FROM Deposits WHERE UserId = @userId');

    let deposits = result.recordset;

    if (!deposits || deposits.length === 0) {
      deposits = [];
    }

    // Вычисление общего баланса и суммы
    let totalBalance = deposits.reduce((acc, deposit) => acc + Number(deposit.Balance), 0);
    let totalAmount = deposits.reduce((acc, deposit) => acc + Number(deposit.Amount), 0);

    // Закрываем соединение с базой данных VirtualCurrencyDb
    await pool.close();

    // Получение значения gameAccountId
    pool = await sql.connect(configLobbyDb);

    result = await pool.request()
      .input('userId', sql.UniqueIdentifier, user.UserId)
      .query('SELECT GameAccountID FROM GameAccountExp WHERE GameAccountID = @userId');

    let gameAccountExp = result.recordset;

    let gameAccountId = gameAccountExp.length > 0 ? gameAccountExp[0].GameAccountID : null;

    // Получение AccountExp для найденного GameAccountID
    let accountExp = null;
    if (gameAccountId) {
      result = await pool.request()
        .input('gameAccountId', sql.UniqueIdentifier, gameAccountId)
        .query('SELECT AccountExp FROM GameAccountExp WHERE GameAccountID = @gameAccountId');

      let accountExpResult = result.recordset;
      accountExp = accountExpResult.length > 0 ? accountExpResult[0].AccountExp : null;
    }

    // Закрываем соединение с базой данных LobbyDB
    await pool.close();

    // Отправляем данные в шаблон
    res.render('profile', {
      UserName: user.UserName,
      LoginName: user.LoginName,
      Created: user.Created,
      creatures: creatures,
      deposits: deposits,
      totalBalance: totalBalance,
      totalAmount: totalAmount,
      gameAccountId: gameAccountId,
      accountExp: accountExp
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (err) {
        console.error('Ошибка при закрытии подключения к базе данных:', err.message);
      }
    }
  }
});

export default router;
