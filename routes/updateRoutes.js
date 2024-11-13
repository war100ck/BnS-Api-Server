// routes/updateRoutes.js
import express from 'express';
import sql from 'mssql';
import { configBlGame, configVirtualCurrencyDb } from '../config/dbConfig.js';

const router = express.Router();

router.post('/update-character', async (req, res) => {
  const { pcid, field, value, userName } = req.body;

  if (!pcid || !field || !value || !userName) {
    return res.status(400).send('Недостаточно параметров');
  }

  let pool = null;

  try {
    // Подключение к базе данных BlGame
    pool = await sql.connect(configBlGame);

    // Проверяем тип поля и подбираем соответствующий тип данных
    let sqlType;
    if (['level', 'exp', 'mastery_level', 'mastery_exp', 'hp', 'money', 'money_diff', 'faction_reputation'].includes(field)) {
      sqlType = sql.Int; // Для целочисленных значений
    } else {
      sqlType = sql.NVarChar; // Для строковых значений
    }

    // Обновление данных персонажа
    await pool.request()
      .input('pcid', sql.Int, pcid)
      .input('field', sql.NVarChar, field)
      .input('value', sqlType, value)
      .query(`UPDATE CreatureProperty 
              SET ${field} = @value 
              WHERE pcid = @pcid`);

    // Закрываем соединение с базой данных
    await pool.close();

    // Перенаправление на страницу редактирования с корректным userName
    res.redirect(`/admin/edit-character?userName=${encodeURIComponent(userName)}`);
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


router.post('/update-deposit', async (req, res) => {
  const { deposit_id, amount, balance, userName } = req.body;

  if (!deposit_id || amount === undefined || balance === undefined || !userName) {
    console.log(`Received data: deposit_id=${deposit_id}, amount=${amount}, balance=${balance}, userName=${userName}`);
    return res.status(400).send('Недостаточно данных для обновления');
  }

  let pool = null;

  try {
    // Подключение к базе данных VirtualCurrencyDb
    pool = await sql.connect(configVirtualCurrencyDb);

    // Обновление данных в базе данных
    await pool.request()
      .input('deposit_id', sql.Int, deposit_id)
      .input('amount', sql.BigInt, amount)
      .input('balance', sql.BigInt, balance)
      .query('UPDATE Deposits SET Amount = @amount, Balance = @balance WHERE DepositId = @deposit_id');

    await pool.close();

    // Перенаправление на страницу редактирования с корректным userName
    res.redirect(`/admin/edit-character?userName=${encodeURIComponent(userName)}`);
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
