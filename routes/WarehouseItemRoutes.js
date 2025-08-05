// routes/WarehouseItemRoutes.js
import express from 'express';
import sql from 'mssql';
import chalk from 'chalk';
import { isAdmin } from '../middleware/adminMiddleware.js';
import { configBlGame, configGameWarehouseDB, configGameItemsDB } from '../config/dbConfig.js';
import { convertJob } from '../utils/dataTransformations.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Настройки логирования из .env
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE === 'true'; // Основные логи
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true'; // Отладочные логи

// Настройки цветов для логов
const log = {
    // Основные логи (включаются при LOG_TO_CONSOLE=true)
    error: (message) => LOG_TO_CONSOLE && console.log(chalk.red(`[ERROR] ${message}`)),
    warning: (message) => LOG_TO_CONSOLE && console.log(chalk.yellow(`[WARNING] ${message}`)),
    action: (message) => LOG_TO_CONSOLE && console.log(chalk.green(`[ACTION] ${message}`)),

    // Отладочные логи (включаются при DEBUG_LOGS=true)
    success: (message) => DEBUG_LOGS && console.log(chalk.green(`[SUCCESS] ${message}`)),
    info: (message) => DEBUG_LOGS && console.log(chalk.blue(`[INFO] ${message}`)),
    db: (message) => DEBUG_LOGS && console.log(chalk.cyan(`[DB] ${message}`)),
    debug: (message) => DEBUG_LOGS && console.log(chalk.gray(`[DEBUG] ${message}`)),
    dbQuery: (query) => DEBUG_LOGS && console.log(chalk.magenta(`[DB QUERY] ${chalk.yellow(query.substring(0, 100))}...`))
};

// Инициализация начального номера предмета
let currentItemNumber = 182;

// Функция для получения следующего номера предмета
async function getNextItemNumber() {
    const nextNumber = currentItemNumber;
    log.debug(`Current item number: ${chalk.yellow(currentItemNumber)}`);

    // Логика циклического переключения между номерами
    if (currentItemNumber === 182) {
        currentItemNumber = 185;
    } else if (currentItemNumber === 185) {
        currentItemNumber = 186;
    } else if (currentItemNumber === 186) {
        currentItemNumber = 226;
    } else {
        currentItemNumber = 182; // Возврат к началу
    }

    log.debug(`Next item number will be: ${chalk.yellow(currentItemNumber)}`);
    return nextNumber;
}

// Функция для получения ID аккаунта владельца персонажа
async function getOwnerAccountId(charname) {
    log.db(`Attempting to get account ID for character: ${chalk.cyan(charname)}`);
    
    let pool;
    try {
        pool = await sql.connect(configBlGame);
        log.db(`Connected to game database for character lookup`);
        
        const query = "SELECT game_account_id FROM dbo.CreatureProperty WHERE name = @charname AND deletion = 0";
        log.dbQuery(query);
        
        const result = await pool
            .request()
            .input('charname', sql.NVarChar, charname)
            .query(query);

        const ownerAccountID = result.recordset[0]?.game_account_id;
        if (!ownerAccountID) {
            log.warning(`Character not found or deleted: ${chalk.yellow(charname)}`);
            throw new Error("Character name not found or deleted.");
        }

        log.db(`Found account ID: ${chalk.green(ownerAccountID)} for character: ${chalk.cyan(charname)}`);
        return ownerAccountID.toString();
    } catch (error) {
        log.error(`Failed to get account ID: ${chalk.red(error.message)}`);
        throw error;
    } finally {
        if (pool) {
            try {
                await pool.close();
                log.debug(`Closed game database connection`);
            } catch (err) {
                log.error(`Connection close error: ${chalk.red(err.message)}`);
            }
        }
    }
}

// Функция для регистрации предмета в базе данных
async function registerItem(ownerAccountID, goodsID, itemID, quantity, senderDescription, senderMessage) {
    log.db(`Starting item registration process for account: ${chalk.cyan(ownerAccountID)}`);
    
    let pool;
    try {
        pool = await sql.connect(configGameWarehouseDB);
        log.db(`Connected to warehouse database`);

        // Получение следующего номера предмета
        const itemNumber = await getNextItemNumber();
        log.debug(`Using item number: ${chalk.yellow(itemNumber)}`);

        // Выполнение процедуры регистрации предмета
        const procedure = 'usp_TryWarehouseRegistration';
        log.db(`Executing stored procedure: ${chalk.yellow(procedure)}`);
        
        const result = await pool
            .request()
            .input('OwnerAccountID', sql.UniqueIdentifier, ownerAccountID)
            .input('GoodsID', sql.BigInt, goodsID)
            .input('GoodsNumber', sql.Int, 233)
            .input('SenderDescription', sql.NVarChar, senderDescription || null)
            .input('SenderMessage', sql.NVarChar, senderMessage || null)
            .input('PurchaseTime', sql.DateTime, new Date())
            .input('GoodsItemNumber_1', sql.Int, itemNumber)
            .input('ItemDataID_1', sql.Int, itemID)
            .input('ItemAmount_1', sql.Int, quantity)
            .input('UsableDuration_1', sql.Int, null)
            .input('OwnerPCID', sql.BigInt, null)
            .input('OwnerWID', sql.BigInt, null)
            .input('FirstRequestFromCode', sql.Bit, 0)
            .output('NewLabelID', sql.BigInt)
            .execute(procedure);

        const newLabelID = result.output.NewLabelID;
        log.debug(`Item registered successfully. LabelID: ${chalk.green(newLabelID)}`);

        // Обновление состояния предметов после регистрации
        await updateItemStates(newLabelID);

        return newLabelID;
    } catch (error) {
        log.error(`Item registration failed: ${chalk.red(error.message)}`);
        throw error;
    } finally {
        if (pool) {
            try {
                await pool.close();
                log.debug(`Closed warehouse database connection`);
            } catch (err) {
                log.error(`Connection close error: ${chalk.red(err.message)}`);
            }
        }
    }
}

// Функция для обновления состояния предметов в базе данных
async function updateItemStates(labelID) {
    log.db(`Updating item states for LabelID: ${chalk.yellow(labelID)}`);
    
    let pool;
    try {
        pool = await sql.connect(configGameWarehouseDB);
        log.db(`Connected to warehouse database for state update`);

        // Обновление состояния в таблице WarehouseGoods
        const updateGoodsQuery = 'UPDATE WarehouseGoods SET RegistrationState = 2 WHERE LabelID = @LabelID';
        log.dbQuery(updateGoodsQuery);
        
        await pool
            .request()
            .input('LabelID', sql.BigInt, labelID)
            .query(updateGoodsQuery);

        // Обновление состояния в таблице WarehouseItem
        const updateItemQuery = 'UPDATE WarehouseItem SET ItemState = 1 WHERE LabelID = @LabelID';
        log.dbQuery(updateItemQuery);
        
        await pool
            .request()
            .input('LabelID', sql.BigInt, labelID)
            .query(updateItemQuery);

        log.debug(`Item states updated successfully for LabelID: ${chalk.green(labelID)}`);
    } catch (error) {
        log.error(`Failed to update item states: ${chalk.red(error.message)}`);
        throw error;
    } finally {
        if (pool) {
            try {
                await pool.close();
                log.debug(`Closed warehouse database connection`);
            } catch (err) {
                log.error(`Connection close error: ${chalk.red(err.message)}`);
            }
        }
    }
}

// Функция для получения следующего уникального GoodsID
async function getNextGoodsID() {
    log.db(`Getting next GoodsID from warehouse database`);
    
    let pool;
    try {
        pool = await sql.connect(configGameWarehouseDB);
        log.db(`Connected to warehouse database for GoodsID generation`);

        const query = 'SELECT MAX(CAST(GoodsID AS BIGINT)) AS MaxGoodsID FROM WarehouseGoods';
        log.dbQuery(query);
        
        const result = await pool.request().query(query);

        let maxGoodsID = result.recordset[0].MaxGoodsID || 0;
        maxGoodsID = parseInt(maxGoodsID.toString().slice(-5)) + 1;
        const formattedGoodsID = `${Math.floor(maxGoodsID / 100000)}${maxGoodsID % 100000}`;

        log.debug(`Generated next GoodsID: ${chalk.green(formattedGoodsID)}`);
        return formattedGoodsID;
    } catch (error) {
        log.error(`Failed to get next GoodsID: ${chalk.red(error.message)}`);
        throw error;
    } finally {
        if (pool) {
            try {
                await pool.close();
                log.debug(`Closed warehouse database connection`);
            } catch (err) {
                log.error(`Connection close error: ${chalk.red(err.message)}`);
            }
        }
    }
}

// Роут для отображения интерфейса добавления предмета
router.get('/admin/add-item', isAdmin, async(req, res) => {
    const { userId, charname } = req.query;
    log.debug(`Admin add-item page accessed by user ID: ${chalk.cyan(userId)}`);

    // Проверка наличия UserID
    if (!userId) {
        log.warning('Add-item request without UserID');
        return res.status(400).send('UserID is required.');
    }

    try {
        log.db(`Starting data loading for add-item interface`);
        
        const poolGameDB = await sql.connect(configBlGame);
        const poolItemsDB = await sql.connect(configGameItemsDB);
        log.db(`Connected to game and items databases`);

        // Исправленный запрос без комментариев
        const charactersQuery = `
            SELECT 
                name, 
                job, 
                deletion 
            FROM dbo.CreatureProperty 
            WHERE game_account_id = @userId
            AND deletion = 0
        `;
        
        const categoriesQuery = `
            USE GameItemsDB;
            SELECT 
              c.CategoryID,
              c.CategoryName,
              c.SubCategoryName,
              i.ItemID,
              i.Alias,
              i.EN_Description,
              i.CN_Description,
              i.FileName
            FROM 
              dbo.ItemCategories c
            LEFT JOIN 
              dbo.GameItems i ON c.CategoryID = i.CategoryID
            ORDER BY 
              c.CategoryName, c.SubCategoryName, i.ItemID
        `;

        log.dbQuery(charactersQuery);
        log.dbQuery(categoriesQuery.substring(0, 100) + '...');

        const [charactersResult, categoriesResult] = await Promise.all([
            poolGameDB
                .request()
                .input('userId', sql.UniqueIdentifier, userId)
                .query(charactersQuery),
            poolItemsDB.request().query(categoriesQuery),
        ]);

        // Формирование списка персонажей с преобразованием профессии
        const characters = charactersResult.recordset.map(creature => {
            const displayJob = convertJob(creature.job);
            return {
                name: creature.name,
                job: displayJob.name,
                isDeleted: false
            };
        });

        // Формирование категорий предметов
        const categories = categoriesResult.recordset.reduce((acc, row) => {
            const categoryKey = `${row.CategoryName} - ${row.SubCategoryName || 'General'}`;
            if (!acc[categoryKey]) {
                acc[categoryKey] = [];
            }
            if (row.ItemID) {
                acc[categoryKey].push({
                    ItemID: row.ItemID,
                    Alias: row.Alias,
                    EN_Description: row.EN_Description,
                    CN_Description: row.CN_Description,
                    FileName: row.FileName,
                });
            }
            return acc;
        }, {});

        log.debug(`Loaded ${chalk.green(characters.length)} characters and ${chalk.green(Object.keys(categories).length)} item categories`);

        await poolGameDB.close();
        await poolItemsDB.close();
        log.debug(`Closed database connections`);

        // Отображение шаблона с переданными данными
        res.render('warehouseItem', {
            characters,
            categories,
            userId: userId,
            gameAccountId: charname ? await getOwnerAccountId(charname) : null,
            pathname: req.originalUrl
        });
    } catch (error) {
        log.error(`Add-item interface error: ${chalk.red(error.message)}`);
        res.status(500).send('Error processing data.');
    }
});

// Роут для обработки запроса на добавление предмета
router.get('/process', isAdmin, async(req, res) => {
    const { itemid, charname, quantity, senderDescription, senderMessage } = req.query;
    log.debug(`Processing item send request: ${chalk.yellow(itemid)} to ${chalk.cyan(charname)}`);

    // Проверка обязательных параметров запроса
    if (!itemid || !charname || !quantity || isNaN(itemid) || isNaN(quantity) || quantity <= 0) {
        log.warning(`Invalid parameters in item send request: itemid=${itemid}, charname=${charname}, quantity=${quantity}`);
        return res.status(400).send('Item ID, Quantity or Character Name is invalid.');
    }

    try {
        log.action(`Sending item ${chalk.yellow(itemid)} (Qty: ${chalk.yellow(quantity)}) to character ${chalk.cyan(charname)}`);

        // Получение ID аккаунта владельца
        const ownerAccountID = await getOwnerAccountId(charname);
        if (!ownerAccountID) {
            log.warning(`Character not found: ${chalk.yellow(charname)}`);
            return res.status(404).send('Character not found.');
        }

        // Получение уникального GoodsID
        const newGoodsID = await getNextGoodsID();
        log.debug(`Generated GoodsID: ${chalk.green(newGoodsID)}`);

        // Регистрация предмета
        const labelID = await registerItem(
            ownerAccountID, 
            newGoodsID, 
            itemid, 
            parseInt(quantity), 
            senderDescription, 
            senderMessage
        );

        log.debug(`Item sent successfully. LabelID: ${chalk.green(labelID)}`);
        res.send(`LabelID=${labelID}<br>Item added. Please relog in game.`);
    } catch (error) {
        log.error(`Item send failed: ${chalk.red(error.message)}`);
        res.status(500).send('Error processing request.');
    }
});

export default router;