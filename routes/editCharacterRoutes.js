import express from 'express';
import sql from 'mssql';
import { isAdmin } from '../middleware/adminMiddleware.js';
import { configPlatformAcctDb, configBlGame, configVirtualCurrencyDb, configLobbyDb } from '../config/dbConfig.js';

const router = express.Router();

// Обработчик маршрута для отображения страницы редактирования персонажа
 router.get('/admin/edit-character', isAdmin, async (req, res) => {
  const { userName } = req.query;

  if (!userName) {
    return res.status(400).send('Отсутствует значение userName');
  }

  let pool = null;

  try {
    // Подключение к базе данных PlatformAcctDb для поиска UserId
    pool = await sql.connect(configPlatformAcctDb);

    let result = await pool.request()
      .input('userName', sql.NVarChar, userName)
      .query('SELECT UserId, UserName, LoginName, Created FROM Users WHERE UserName = @userName');

    let user = result.recordset[0];

    if (!user) {
      await pool.close();
      return res.status(404).send('Пользователь не найден');
    }

    await pool.close();

    // Подключение к базе данных LobbyDB для поиска данных в таблице GameAccountExp
    pool = await sql.connect(configLobbyDb);

    result = await pool.request()
      .input('gameAccountId', sql.UniqueIdentifier, user.UserId)
      .query(`SELECT 
                GameAccountID, 
                AccountExp, 
                AccountExpQuotaPerDay, 
                LastUpdateTime 
              FROM GameAccountExp 
              WHERE GameAccountID = @gameAccountId`);

    let gameAccountExp = result.recordset;

    // Если данных нет, оставляем массив пустым
    if (!gameAccountExp.length) {
      gameAccountExp = [];
    }

    await pool.close();

    // Подключение к базе данных BlGame для получения данных о персонажах
    pool = await sql.connect(configBlGame);

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
                guild_invitation_refusal, slate_page, guild_point,
                deletion, deletion_time
              FROM CreatureProperty 
              WHERE game_account_id = @game_account_id`);

    let creatures = result.recordset;

    await pool.close();

    // Подключение к базе данных VirtualCurrencyDb для получения данных о депозитах
    pool = await sql.connect(configVirtualCurrencyDb);

    result = await pool.request()
      .input('userId', sql.UniqueIdentifier, user.UserId)
      .query('SELECT DepositId, Amount, Balance FROM Deposits WHERE UserId = @userId');

    let deposits = result.recordset || [];
	
	// Вычисление общего баланса
    let totalBalance = deposits.reduce((acc, deposit) => acc + Number(deposit.Balance), 0);
	
    // Вычисление общей суммы Amount
    let totalAmount = deposits.reduce((acc, deposit) => acc + Number(deposit.Amount), 0);

    await pool.close();

    // Рендеринг страницы редактирования персонажа с данными из GameAccountExp
    res.render('edit-character', {
      UserName: user.UserName,
      LoginName: user.LoginName,
      Created: user.Created,
      gameAccountExp: gameAccountExp,
      creatures: creatures,
      deposits: deposits,
	  totalBalance: totalBalance, // Передача общего баланса в шаблон
	  totalAmount: totalAmount, // Передача общей суммы Amount в шаблон
	  pathname: req.originalUrl
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  } finally {
    // Гарантированное закрытие подключения
    if (pool) {
      try {
        await pool.close();
      } catch (err) {
        console.error('Ошибка при закрытии подключения к базе данных:', err.message);
      }
    }
  }
});

// Обработчик маршрута для обновления данных GameAccountExp
router.post('/admin/update-game-account-exp', isAdmin, async (req, res) => {
  const { gameAccountId, accountExp, accountExpQuotaPerDay } = req.body;

  if (!gameAccountId || accountExp === undefined || accountExpQuotaPerDay === undefined) {
    return res.status(400).send('Отсутствуют необходимые данные');
  }

  let pool = null;

  try {
    pool = await sql.connect(configLobbyDb);

    await pool.request()
      .input('gameAccountId', sql.UniqueIdentifier, gameAccountId)
      .input('accountExp', sql.BigInt, accountExp)
      .input('accountExpQuotaPerDay', sql.BigInt, accountExpQuotaPerDay)
      .query(`UPDATE GameAccountExp
              SET AccountExp = @accountExp,
                  AccountExpQuotaPerDay = @accountExpQuotaPerDay,
                  LastUpdateTime = DATEDIFF_BIG(MILLISECOND, '1970-01-01', GETDATE())
              WHERE GameAccountID = @gameAccountId`);

    res.redirect(`/admin/edit-character?userName=${req.body.userName}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  } finally {
    if (pool) { // Проверяем, инициализирован ли pool
      try {
        await pool.close();
      } catch (err) {
        console.error('Ошибка при закрытии подключения к базе данных:', err.message);
      }
    }
  }
});


export default router;
