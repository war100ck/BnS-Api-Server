// routes/gameWorldRoutes.js
import express from 'express';
import sql from 'mssql';
import {
    configLobbyDb
}
from '../config/dbConfig.js';
import { isAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// Обработчик маршрута для получения данных из GameWorld и GameWorldCluster
router.get('/admin/gameworld', isAdmin, async(req, res) => {
    let pool = null;

    try {
        // Подключение к базе данных LobbyDB
        pool = await sql.connect(configLobbyDb);

        // Запрос для получения всех колонок из таблицы GameWorld
        const gameWorldResult = await pool.request().query('SELECT * FROM GameWorld');
        const gameWorldData = gameWorldResult.recordset;

        // Запрос для получения всех колонок из таблицы GameWorldCluster
        const gameWorldClusterResult = await pool.request().query('SELECT * FROM GameWorldCluster');
        const gameWorldClusterData = gameWorldClusterResult.recordset;

        // Проверка на наличие данных
        if (!gameWorldData || gameWorldData.length === 0) {
            return res.status(404).send('GameWorld data not found');
        }
        if (!gameWorldClusterData || gameWorldClusterData.length === 0) {
            return res.status(404).send('GameWorldCluster data not found');
        }

        // Получаем сообщение из query параметров
        const message = req.query.message;

        // Отправляем данные в шаблон gameWorld.ejs
        res.render('gameWorld', {
            gameWorldData: gameWorldData, // Передаем данные в шаблон
            gameWorldClusterData: gameWorldClusterData, // Передаем данные из GameWorldCluster в шаблон
            message: message, // Передаем сообщение в шаблон
			pathname: req.originalUrl.split('?')[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (err) {
                console.error('Error closing database connection:', err.message);
            }
        }
    }
});

// Обработчик маршрута для обновления данных игрового мира
router.post('/update-game-world', async(req, res) => {
    const {
        WorldID,
        WorldClusterID,
        WorldName,
        WorldType,
        PlayType,
        Usable = '0', // значение по умолчанию, если чекбокс не отправлен
            Enterable = '0',
            CharacterCreationLimit = '0',
            CharacterOfNewAccountCreationLimit = '0',
            BrandNew = '0',
            Recommendation = '0',
            Crowdedness
    } = req.body;

    let pool = null;

    try {
        pool = await sql.connect(configLobbyDb);

        await pool.request()
            .input('WorldID', sql.SmallInt, WorldID)
            .input('WorldClusterID', sql.SmallInt, WorldClusterID)
            .input('WorldName', sql.NVarChar, WorldName)
            .input('WorldType', sql.TinyInt, WorldType)
            .input('PlayType', sql.TinyInt, PlayType)
            .input('Usable', sql.Bit, Usable === '1')
            .input('Enterable', sql.Bit, Enterable === '1')
            .input('CharacterCreationLimit', sql.Bit, CharacterCreationLimit === '1')
            .input('CharacterOfNewAccountCreationLimit', sql.Bit, CharacterOfNewAccountCreationLimit === '1')
            .input('BrandNew', sql.Bit, BrandNew === '1')
            .input('Recommendation', sql.Bit, Recommendation === '1')
            .input('Crowdedness', sql.TinyInt, Crowdedness)
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

        // Отправка JSON-ответа с сообщением об успешном обновлении
        res.json({
            success: true,
            message: 'GameWorld data updated successfully!'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (err) {
                console.error('Error closing database connection:', err.message);
            }
        }
    }
});

// Обработчик маршрута для обновления данных в GameWorldCluster
router.post('/update-game-world-cluster', async(req, res) => {
    const {
        WorldClusterID,
        GamePublicIPv4Address,
        GamePublicPort,
        MaxPlayerCount,
        MaxWaitingCount,
        GameInternalIPv4Address,
        GameInternalPort
    } = req.body;

    // Логируем полученное значение WorldClusterID
    // console.log('Received WorldClusterID:', WorldClusterID);

    // Преобразование WorldClusterID в число
    const worldClusterIdAsNumber = Array.isArray(WorldClusterID) ? Number(WorldClusterID[0]) : Number(WorldClusterID);

    // Логируем преобразованное значение
    // console.log('Converted WorldClusterID to number:', worldClusterIdAsNumber);

    if (isNaN(worldClusterIdAsNumber)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid WorldClusterID'
        });
    }

    let pool = null;

    try {
        pool = await sql.connect(configLobbyDb);

        await pool.request()
            .input('WC_WorldClusterID', sql.SmallInt, worldClusterIdAsNumber) // Используйте префикс для уникальности
            .input('GW_GamePublicIPv4Address', sql.NChar, GamePublicIPv4Address)
            .input('GW_GamePublicPort', sql.Int, GamePublicPort)
            .input('GW_MaxPlayerCount', sql.Int, MaxPlayerCount)
            .input('GW_MaxWaitingCount', sql.Int, MaxWaitingCount)
            .input('GW_GameInternalIPv4Address', sql.NChar, GameInternalIPv4Address)
            .input('GW_GameInternalPort', sql.Int, GameInternalPort)
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

        // Отправка JSON-ответа с сообщением об успешном обновлении
        res.json({
            success: true,
            message: 'GameWorldCluster data updated successfully!'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (err) {
                console.error('Error closing database connection:', err.message);
            }
        }
    }
});

export default router;