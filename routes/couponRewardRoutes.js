// routes/couponRewardRoutes.js
import express from 'express';
import sql from 'mssql';
import chalk from 'chalk';
import { configCouponSystemDB, configGameWarehouseDB } from '../config/dbConfig.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Настройки логирования
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE === 'true';
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';

const log = {
    error: (message) => LOG_TO_CONSOLE && console.log(chalk.red(`[ERROR] ${message}`)),
    warning: (message) => LOG_TO_CONSOLE && console.log(chalk.yellow(`[WARNING] ${message}`)),
    action: (message) => LOG_TO_CONSOLE && console.log(chalk.green(`[ACTION] ${message}`)),
    success: (message) => DEBUG_LOGS && console.log(chalk.green(`[SUCCESS] ${message}`)),
    info: (message) => DEBUG_LOGS && console.log(chalk.blue(`[INFO] ${message}`)),
    db: (message) => DEBUG_LOGS && console.log(chalk.cyan(`[DB] ${message}`)),
    debug: (message) => DEBUG_LOGS && console.log(chalk.gray(`[DEBUG] ${message}`)),
    dbQuery: (query) => DEBUG_LOGS && console.log(chalk.magenta(`[DB QUERY] ${chalk.yellow(query.substring(0, 100))}...`))
};

// Инициализация начального номера предмета (как в WarehouseItemRoutes.js)
let currentItemNumber = 182;

// Функция для получения следующего номера предмета (как в WarehouseItemRoutes.js)
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

// Функция для получения следующего уникального GoodsID (как в WarehouseItemRoutes.js)
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
        
        // Fallback если таблица не существует
        if (error.message.includes('Invalid object name') || error.message.includes('does not exist')) {
            log.warning('WarehouseGoods table not found, using fallback GoodsID generation');
            return Date.now().toString();
        }
        
        throw error;
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (closeError) {
                log.error(`Error closing warehouse pool: ${closeError.message}`);
            }
        }
    }
}

// Функция для регистрации предмета в базе данных (обновленная версия)
async function registerItem(ownerAccountID, goodsID, itemID, quantity, senderDescription, senderMessage) {
    log.db(`Starting item registration process for account: ${chalk.cyan(ownerAccountID)}`);
    
    let pool;
    try {
        pool = await sql.connect(configGameWarehouseDB);
        log.db(`Connected to warehouse database`);

        // Получение следующего номера предмета
        const itemNumber = await getNextItemNumber();
        log.debug(`Using item number: ${chalk.yellow(itemNumber)}`);

        // Выполнение процедуры регистрации предмета (обновленная версия)
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
        await updateItemStates(pool, newLabelID);

        return newLabelID;
    } catch (error) {
        log.error(`Item registration failed: ${chalk.red(error.message)}`);
        throw error;
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (closeError) {
                log.error(`Error closing warehouse pool: ${closeError.message}`);
            }
        }
    }
}

// Функция для обновления состояния предметов в базе данных
async function updateItemStates(pool, labelID) {
    log.db(`Updating item states for LabelID: ${chalk.yellow(labelID)}`);
    
    try {
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
    }
}

// Fallback метод для регистрации предметов (обновленная версия)
async function registerItemFallback(pool, ownerAccountID, goodsID, itemID, quantity, senderDescription, senderMessage, itemNumber) {
    try {
        // Вставляем запись в WarehouseGoods (добавлен RegistrationTime)
        const insertGoodsQuery = `
            INSERT INTO WarehouseGoods (GoodsID, OwnerAccountID, GoodsNumber, SenderDescription, SenderMessage, PurchaseTime, RegistrationTime, RegistrationState)
            OUTPUT INSERTED.LabelID
            VALUES (@GoodsID, @OwnerAccountID, 233, @SenderDescription, @SenderMessage, @PurchaseTime, GETDATE(), 2)
        `;
        
        log.dbQuery(insertGoodsQuery);
        
        const goodsResult = await pool.request()
            .input('GoodsID', sql.BigInt, goodsID)
            .input('OwnerAccountID', sql.UniqueIdentifier, ownerAccountID)
            .input('SenderDescription', sql.NVarChar, senderDescription || null)
            .input('SenderMessage', sql.NVarChar, senderMessage || null)
            .input('PurchaseTime', sql.DateTime, new Date())
            .query(insertGoodsQuery);
        
        const labelID = goodsResult.recordset[0].LabelID;
        
        // Вставляем запись в WarehouseItem
        const insertItemQuery = `
            INSERT INTO WarehouseItem (LabelID, GoodsItemNumber, ItemDataID, ItemAmount, UsableDuration, ItemState)
            VALUES (@LabelID, @GoodsItemNumber, @ItemDataID, @ItemAmount, NULL, 1)
        `;
        
        log.dbQuery(insertItemQuery);
        
        await pool.request()
            .input('LabelID', sql.BigInt, labelID)
            .input('GoodsItemNumber', sql.Int, itemNumber)
            .input('ItemDataID', sql.Int, itemID)
            .input('ItemAmount', sql.Int, quantity)
            .query(insertItemQuery);
        
        // Обновляем состояние
        await updateItemStates(pool, labelID);
        
        log.debug(`Fallback item registration successful. LabelID: ${chalk.green(labelID)}`);
        return labelID;
        
    } catch (error) {
        log.error(`Fallback item registration failed: ${error.message}`);
        throw error;
    }
}

// Функция для отправки наград пользователю
async function sendRewardsToUser(userId, rewards) {
    let results = [];
    
    for (const reward of rewards) {
        try {
            const goodsID = await getNextGoodsID();
            const labelID = await registerItem(
                userId,
                goodsID,
                reward.ItemID,
                reward.Quantity,
                'Coupon Reward',
                `Coupon reward: ${reward.RewardName || 'Item'}`
            );
            
            results.push({
                success: true,
                rewardId: reward.RewardId,
                itemId: reward.ItemID,
                quantity: reward.Quantity,
                labelID: labelID
            });
            
            log.success(`Reward sent successfully: Item ${reward.ItemID} x${reward.Quantity} to user ${userId}`);
            
        } catch (error) {
            log.error(`Failed to send reward ${reward.ItemID}: ${error.message}`);
            results.push({
                success: false,
                rewardId: reward.RewardId,
                itemId: reward.ItemID,
                quantity: reward.Quantity,
                error: error.message
            });
        }
    }
    
    return results;
}

// Роут для отображения формы активации купона
router.get('/coupon/redeem', (req, res) => {
    res.render('coupons/redeem-form', {
        pathname: req.originalUrl
    });
});

// Активация купона пользователем
router.post('/api/coupon/redeem', async (req, res) => {
    let couponPool = null;
    
    try {
        const { couponCode, userId } = req.body;
        
        log.action(`Coupon redemption attempt: ${couponCode} by user: ${userId}`);
        
        if (!couponCode || !userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Coupon code and user ID are required' 
            });
        }
        
        // Подключаемся к базе купонов
        couponPool = await sql.connect(configCouponSystemDB);
        log.db('Connected to coupon database');
        
        // Проверяем купон
        const couponQuery = `
            SELECT 
                pc.*, 
                pi.RedeemFrom, 
                pi.RedeemTo,
                pi.IssueName
            FROM PromoCoupons pc
            INNER JOIN PromoIssues pi ON pc.IssueId = pi.IssueId
            WHERE pc.CouponCode = @couponCode
        `;
        
        log.dbQuery(couponQuery);
        
        const couponResult = await couponPool.request()
            .input('couponCode', sql.NVarChar, couponCode)
            .query(couponQuery);
        
        if (couponResult.recordset.length === 0) {
            log.warning(`Coupon not found: ${couponCode}`);
            return res.status(404).json({ 
                success: false, 
                error: 'Coupon not found' 
            });
        }
        
        const coupon = couponResult.recordset[0];
        
        // Проверяем срок действия
        const now = new Date();
        if (coupon.RedeemFrom && new Date(coupon.RedeemFrom) > now) {
            log.warning(`Coupon not yet available: ${couponCode}`);
            return res.status(400).json({ 
                success: false, 
                error: 'This coupon is not yet available for redemption' 
            });
        }
        
        if (coupon.RedeemTo && new Date(coupon.RedeemTo) < now) {
            log.warning(`Coupon expired: ${couponCode}`);
            return res.status(400).json({ 
                success: false, 
                error: 'This coupon has expired' 
            });
        }
        
        // Проверяем лимиты использования
        if (coupon.UsedCount >= coupon.MaxUses) {
            log.warning(`Coupon usage limit reached: ${couponCode}`);
            return res.status(400).json({ 
                success: false, 
                error: 'This coupon has reached its usage limit' 
            });
        }
        
        // Проверяем, не активировал ли пользователь уже этот купон
        const activationCheckQuery = `
            SELECT * FROM PromoActivations 
            WHERE CouponId = @couponId AND UserId = @userId
        `;
        
        log.dbQuery(activationCheckQuery);
        
        const activationCheck = await couponPool.request()
            .input('couponId', sql.Int, coupon.CouponId)
            .input('userId', sql.UniqueIdentifier, userId)
            .query(activationCheckQuery);
        
        if (activationCheck.recordset.length > 0) {
            log.warning(`User already redeemed this coupon: ${userId} for ${couponCode}`);
            return res.status(400).json({ 
                success: false, 
                error: 'You have already redeemed this coupon' 
            });
        }
        
        // Получаем награды для этого выпуска
        const rewardsQuery = `
            SELECT * FROM PromoRewards 
            WHERE IssueId = @issueId
        `;
        
        log.dbQuery(rewardsQuery);
        
        const rewardsResult = await couponPool.request()
            .input('issueId', sql.Int, coupon.IssueId)
            .query(rewardsQuery);
        
        if (rewardsResult.recordset.length === 0) {
            log.error(`No rewards configured for issue: ${coupon.IssueId}`);
            return res.status(400).json({ 
                success: false, 
                error: 'No rewards configured for this coupon' 
            });
        }
        
        const rewards = rewardsResult.recordset;
        log.info(`Found ${rewards.length} rewards for coupon ${couponCode}`);
        
        // Закрываем соединение с coupon базой перед отправкой наград
        await couponPool.close();
        couponPool = null;
        
        // Отправляем награды пользователю
        log.action(`Sending rewards to user ${userId} for coupon ${couponCode}`);
        const sendResults = await sendRewardsToUser(userId, rewards);
        
        // Проверяем, все ли награды были отправлены успешно
        const failedRewards = sendResults.filter(result => !result.success);
        
        if (failedRewards.length > 0) {
            log.error(`Failed to send ${failedRewards.length} rewards: ${JSON.stringify(failedRewards)}`);
            
            // Если хотя бы одна награда не отправлена, отменяем всю операцию
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to send some rewards. Please contact support.',
                failedRewards: failedRewards
            });
        }
        
        // Подключаемся снова для записи активации
        couponPool = await sql.connect(configCouponSystemDB);
        
        // Записываем активацию
        const activationQuery = `
            INSERT INTO PromoActivations (CouponId, UserId) 
            VALUES (@couponId, @userId)
        `;
        
        log.dbQuery(activationQuery);
        
        await couponPool.request()
            .input('couponId', sql.Int, coupon.CouponId)
            .input('userId', sql.UniqueIdentifier, userId)
            .query(activationQuery);
        
        // Обновляем счетчик использований купона
        const updateCouponQuery = `
            UPDATE PromoCoupons 
            SET UsedCount = UsedCount + 1 
            WHERE CouponId = @couponId
        `;
        
        log.dbQuery(updateCouponQuery);
        
        await couponPool.request()
            .input('couponId', sql.Int, coupon.CouponId)
            .query(updateCouponQuery);
        
        await couponPool.close();
        couponPool = null;
        
        log.success(`Coupon redeemed successfully: ${couponCode} by user ${userId}`);
        
        res.json({ 
            success: true, 
            message: 'Coupon redeemed successfully! Check your warehouse for rewards.',
            rewards: rewards.map(r => ({ 
                itemId: r.ItemID, 
                quantity: r.Quantity,
                rewardName: r.RewardName 
            }))
        });
        
    } catch (error) {
        log.error(`Coupon redemption error: ${error.message}`);
        
        // Закрываем соединение если оно открыто
        if (couponPool) {
            try {
                await couponPool.close();
            } catch (closeError) {
                log.error(`Error closing connection: ${closeError.message}`);
            }
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'An unexpected error occurred. Please try again later.' 
        });
    }
});

export default router;