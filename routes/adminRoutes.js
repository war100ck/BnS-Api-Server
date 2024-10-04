// routes/adminRoutes.js
import express from 'express';
import sql from 'mssql';
import { configPlatformAcctDb, configBlGame } from '../config/dbConfig.js';

const router = express.Router();

// Обработчик маршрута для отображения административной панели
router.get('/admin', async (req, res) => {
  let pool = null;

  try {
    // Подключение к базе данных PlatformAcctDb
    pool = await sql.connect(configPlatformAcctDb);

    // Запрос для получения списка всех пользователей
    const usersResult = await pool.request().query('SELECT UserId, UserName FROM Users');
    const users = usersResult.recordset;

    if (!users) {
      return res.status(404).send('Пользователи не найдены');
    }

    // Закрываем соединение с базой данных PlatformAcctDb
    await pool.close();

    // Подключение к базе данных BlGame
    pool = await sql.connect(configBlGame);

    // Запрос для получения количества созданных персонажей
    const creatureCountResult = await pool.request().query('SELECT COUNT(name) AS CreatureCount FROM CreatureProperty');
    const creatureCount = creatureCountResult.recordset[0].CreatureCount;

    // Запрос для получения количества удаленных персонажей
    const deletedCreatureCountResult = await pool.request().query('SELECT COUNT(name) AS DeletedCreatureCount FROM CreatureProperty WHERE deletion = 1');
    const deletedCreatureCount = deletedCreatureCountResult.recordset[0].DeletedCreatureCount;

    // Закрываем соединение с базой данных BlGame
    await pool.close();

    // Отправляем данные в шаблон admin.ejs
    res.render('admin', {
      users: users,
      creatureCount: creatureCount, // Передаем количество созданных персонажей в шаблон
      deletedCreatureCount: deletedCreatureCount // Передаем количество удаленных персонажей в шаблон
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
