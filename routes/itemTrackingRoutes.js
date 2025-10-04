// routes/itemTrackingRoutes.js
import express from 'express';
import sql from 'mssql';
import chalk from 'chalk';
import { 
  configGoodsDb, 
  configBlGame, 
  configGameWarehouseDB,
  configPlatformAcctDb 
} from '../config/dbConfig.js';
import { isAdmin } from '../middleware/adminMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Настройки логирования из .env
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE === 'true';
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';

// Простое логирование
const log = {
    error: (message) => LOG_TO_CONSOLE && console.log(chalk.red(`[ITEM-TRACKING-ERROR] ${message}`)),
    warning: (message) => LOG_TO_CONSOLE && console.log(chalk.yellow(`[ITEM-TRACKING-WARNING] ${message}`)),
    info: (message) => DEBUG_LOGS && console.log(chalk.blue(`[ITEM-TRACKING-INFO] ${message}`)),
    success: (message) => DEBUG_LOGS && console.log(chalk.green(`[ITEM-TRACKING-SUCCESS] ${message}`)),
    search: (message) => LOG_TO_CONSOLE && console.log(chalk.cyan(`[ITEM-TRACKING-SEARCH] ${message}`)),
    delete: (message) => LOG_TO_CONSOLE && console.log(chalk.red(`[ITEM-TRACKING-DELETE] ${message}`))
};

// Global items cache
let itemsCache = new Map();
let itemsCacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Пулы подключений для item tracking
const itemTrackingConnectionPools = new Map();

// Функция для получения пула подключения
async function getItemTrackingConnectionPool(dbConfig) {
  const configKey = JSON.stringify(dbConfig);
  
  if (itemTrackingConnectionPools.has(configKey)) {
    return itemTrackingConnectionPools.get(configKey);
  }
  
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    itemTrackingConnectionPools.set(configKey, pool);
    log.info(`Connected to ${dbConfig.database} database`);
    return pool;
  } catch (err) {
    log.error(`Database connection failed for ${dbConfig.database}: ${err.message}`);
    throw err;
  }
}

// Функция выполнения запросов для item tracking
async function executeItemTrackingQuery(dbConfig, query, params = []) {
  const pool = await getItemTrackingConnectionPool(dbConfig);
  
  try {
    const request = pool.request();
    
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (err) {
    log.error(`Query execution failed: ${err.message}`);
    throw err;
  }
}

// Функция выполнения запросов без возврата данных для item tracking
async function executeItemTrackingNonQuery(dbConfig, query, params = []) {
  const pool = await getItemTrackingConnectionPool(dbConfig);
  
  try {
    const request = pool.request();
    
    params.forEach(param => {
      request.input(param.name, param.type, param.value);
    });
    
    const result = await request.query(query);
    return result.rowsAffected[0];
  } catch (err) {
    log.error(`Non-query execution failed: ${err.message}`);
    throw err;
  }
}

// Load items from GoodsDb
async function loadItemsFromDB() {
    const now = Date.now();
    
    if (itemsCache.size > 0 && (now - itemsCacheTimestamp) < CACHE_DURATION) {
        return itemsCache;
    }
    
    try {
        const itemsQuery = `
            SELECT [ItemId], [ItemName] 
            FROM [GoodsDb].dbo.[Items] 
            WHERE [ItemName] IS NOT NULL AND [ItemName] != ''
        `;
        
        const items = await executeItemTrackingQuery(configGoodsDb, itemsQuery);
        
        itemsCache.clear();
        items.forEach(item => {
            itemsCache.set(item.ItemId, item.ItemName);
        });
        
        itemsCacheTimestamp = now;
        log.info(`Loaded ${itemsCache.size} items from GoodsDb`);
        
        return itemsCache;
    } catch (error) {
        log.error(`Error loading items from GoodsDb: ${error.message}`);
        return new Map();
    }
}

// Item Tracking main page - защищенный маршрут
router.get('/admin/item-tracking', isAdmin, async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).send('User ID is required');
    }

    await loadItemsFromDB();
    
    res.render('itemTracking', {
        title: 'Item Tracking - BNS Tools',
        activeTab: 'mail',
        userId: userId,
        pathname: req.originalUrl
    });
});

// Get mail data - защищенный маршрут
router.get('/admin/item-tracking/mail', isAdmin, async (req, res) => {
    const { account, character, itemIds, userId } = req.query;
    const currentUser = req.session.user;
    
    log.search(`Mail search by ${currentUser.username} for user ${userId}`);
    
    try {
        const items = await loadItemsFromDB();
        
        let query = `
            SELECT 
                a.[PostID],
                d.[DataID] as dataID,
                d.[Amount],
                a.[SenderName],
                a.[RecipientName],
                a.[ReceiptTime],
                e.[UserName] as SendAcction,
                f.[UserName] as RecipientAcction
            FROM [BlGame].dbo.[UserPost] as a 
            INNER JOIN [BlGame].dbo.[CreatureProperty] as b ON a.[SenderPCID] = b.[PCID]
            INNER JOIN [BlGame].dbo.[CreatureProperty] as c ON a.[RecipientPCID] = c.[PCID]
            LEFT JOIN [BlGame].dbo.[UserPostAttachment] as d ON d.[PostID] = a.[PostID]
            INNER JOIN [PlatformAcctDb].dbo.[Users] as e ON e.[UserID] = b.[game_account_id]
            INNER JOIN [PlatformAcctDb].dbo.[Users] as f ON f.[UserID] = c.[game_account_id]
            WHERE 1=1
        `;
        
        const params = [];
        
        if (account) {
            query += ` AND (e.[UserName] = @account OR f.[UserName] = @account)`;
            params.push({ name: 'account', type: sql.NVarChar, value: account });
        }
        
        if (character) {
            query += ` AND (a.[SenderName] LIKE @character OR a.[RecipientName] LIKE @character)`;
            params.push({ name: 'character', type: sql.NVarChar, value: `%${character}%` });
        }
        
        if (itemIds) {
            query += ` AND d.[DataID] IN (${itemIds})`;
        }
        
        if (!account && !character && userId) {
            query += ` AND (e.[UserID] = @userId OR f.[UserID] = @userId)`;
            params.push({ name: 'userId', type: sql.UniqueIdentifier, value: userId });
        }
        
        query += ` ORDER BY a.[ReceiptTime] DESC`;
        
        const mailData = await executeItemTrackingQuery(configBlGame, query, params);
        const processedData = processMailData(mailData, items);
        
        log.success(`Mail search found ${processedData.length} records`);
        res.json({ success: true, data: processedData });
    } catch (error) {
        log.error(`Error fetching mail data: ${error.message}`);
        res.json({ success: false, error: error.message });
    }
});

// Get giftbox data - защищенный маршрут
router.get('/admin/item-tracking/giftbox/data', isAdmin, async (req, res) => {
    const { account, itemIds, userId } = req.query;
    const currentUser = req.session.user;
    
    log.search(`Giftbox search by ${currentUser.username} for user ${userId}`);
    
    try {
        const items = await loadItemsFromDB();
        
        let query = `
            SELECT 
                b.[UserName] as 'Account',
                b.[UserId] as 'UserID',
                a.[ItemDataID] as 'ItemID',
                a.[ItemAmount] as 'Quantity',
                a.[RegistrationTime] as 'Time',
                CAST(a.[ItemInstanceID] as varchar(50)) as 'ItemInstanceID',
                a.[SourceTable] as 'SourceTable',
                a.[ItemState] as 'ItemState',
                a.[UserServiceType] as 'UserServiceType',
                c.[name] as 'CharacterName',
                a.[OwnerPCID] as 'OwnerPCID',
                CASE 
                    WHEN a.[SourceTable] = 'WarehouseItemArchive' THEN 'Received'
                    WHEN a.[ItemState] = 1 THEN 'In Mail'
                    WHEN a.[ItemState] = 2 THEN 'Received'
                    WHEN a.[ItemState] = 4 THEN 'Used'
                    ELSE 'Unknown'
                END as 'Status',
                CASE 
                    WHEN a.[UserServiceType] = 2 THEN 'Service'
                    ELSE 'Regular'
                END as 'ItemType'
            FROM (
                SELECT 
                    [OwnerAccountID] as 'UserID', 
                    [ItemDataID], 
                    [ItemAmount], 
                    [RegistrationTime],
                    [ItemInstanceID],
                    [OwnerPCID],
                    [ItemState],
                    [UserServiceType],
                    'WarehouseItemArchive' as 'SourceTable'
                FROM [GamewarehouseDB].dbo.[WarehouseItemArchive] 
                WHERE 1=1
                UNION 
                SELECT 
                    [OwnerAccountID] as 'UserID', 
                    [ItemDataID], 
                    [ItemAmount], 
                    [RegistrationTime],
                    [ItemInstanceID],
                    [OwnerPCID],
                    [ItemState],
                    [UserServiceType],
                    'WarehouseItem' as 'SourceTable'
                FROM [GamewarehouseDB].dbo.[WarehouseItem]
                WHERE 1=1
            ) as a 
            LEFT JOIN [PlatformAcctDb].dbo.[Users] as b ON a.[UserID] = b.[UserId] 
            LEFT JOIN [BlGame].dbo.[CreatureProperty] as c ON a.[OwnerPCID] = c.[pcid] AND c.[deletion] = 0
            WHERE 1 = 1
        `;
        
        const params = [];
        
        if (account) {
            query += ` AND b.[UserName] = @account`;
            params.push({ name: 'account', type: sql.NVarChar, value: account });
        }
        
        if (itemIds) {
            query += ` AND a.[ItemDataID] IN (${itemIds})`;
        }
        
        if (!account && userId) {
            query += ` AND a.[UserID] = @userId`;
            params.push({ name: 'userId', type: sql.UniqueIdentifier, value: userId });
        }
        
        query += ` ORDER BY a.[RegistrationTime] DESC`;
        
        const giftboxData = await executeItemTrackingQuery(configGameWarehouseDB, query, params);
        
        const processedData = giftboxData.map(item => {
            const itemId = parseInt(item['ItemID']);
            const itemName = items.get(itemId) || `Unknown Item (${itemId})`;
            
            let characterName = 'Account';
            if (item['OwnerPCID'] && item['CharacterName']) {
                characterName = item['CharacterName'];
            }
            
            return {
                ...item,
                'ItemName': itemName,
                'Account': item['Account'] || '',
                'UserID': item['UserID'] || '',
                'ItemInstanceID': item['ItemInstanceID'] || '',
                'SourceTable': item['SourceTable'] || '',
                'CharacterName': characterName,
                'OwnerPCID': item['OwnerPCID'] || '',
                'Status': item['Status'] || 'Unknown',
                'ItemType': item['ItemType'] || 'Regular',
                'ItemState': item['ItemState'] || 0,
                'UserServiceType': item['UserServiceType'] || 0
            };
        });
        
        log.success(`Giftbox search found ${processedData.length} records`);
        res.json({ success: true, data: processedData });
    } catch (error) {
        log.error(`Error fetching giftbox data: ${error.message}`);
        res.json({ success: false, error: error.message });
    }
});

// Delete item from giftbox - защищенный маршрут
router.delete('/admin/item-tracking/giftbox/delete', isAdmin, async (req, res) => {
    const { itemInstanceID, sourceTable, userID, itemDataID, itemName } = req.body;
    const currentUser = req.session.user;
    
    log.delete(`Delete item by ${currentUser.username}: ${itemName} (${itemDataID}) from ${sourceTable}`);
    
    if (!itemInstanceID || !sourceTable || !userID) {
        return res.json({ 
            success: false, 
            message: 'Insufficient data to delete item' 
        });
    }
    
    try {
        let deleteQuery;
        let params = [];
        
        if (sourceTable === 'WarehouseItem') {
            deleteQuery = `
                DELETE FROM [GamewarehouseDB].dbo.[WarehouseItem] 
                WHERE [ItemInstanceID] = @itemInstanceID 
                AND [OwnerAccountID] = @userID
            `;
        } else if (sourceTable === 'WarehouseItemArchive') {
            deleteQuery = `
                DELETE FROM [GamewarehouseDB].dbo.[WarehouseItemArchive] 
                WHERE [ItemInstanceID] = @itemInstanceID 
                AND [OwnerAccountID] = @userID
            `;
        } else {
            return res.json({ 
                success: false, 
                message: 'Unknown data source' 
            });
        }
        
        params = [
            { name: 'itemInstanceID', type: sql.VarChar, value: itemInstanceID.toString() },
            { name: 'userID', type: sql.UniqueIdentifier, value: userID }
        ];
        
        const result = await executeItemTrackingNonQuery(configGameWarehouseDB, deleteQuery, params);
        
        if (result > 0) {
            log.success(`Item deleted successfully: ${itemName} (${itemDataID})`);
            res.json({ 
                success: true, 
                message: `Item "${itemName}" (ID: ${itemDataID}) successfully deleted from gift box` 
            });
        } else {
            res.json({ 
                success: false, 
                message: 'Item not found or already deleted' 
            });
        }
    } catch (error) {
        log.error(`Error deleting item from giftbox: ${error.message}`);
        res.json({ 
            success: false, 
            message: `Error deleting item: ${error.message}` 
        });
    }
});

// Helper function to process mail data with DB items
function processMailData(mailData, items) {
    const postMap = new Map();
    
    mailData.forEach(item => {
        if (!postMap.has(item.PostID)) {
            postMap.set(item.PostID, {
                PostID: item.PostID,
                SendName: item.SenderName,
                SendAcction: item.SendAcction || '',
                RecipientName: item.RecipientName,
                RecipientAcction: item.RecipientAcction || '',
                Timer: item.ReceiptTime,
                jb: '0',
                Data: ''
            });
        }
        
        const post = postMap.get(item.PostID);
        
        if (item.dataID) {
            const itemId = parseInt(item.dataID);
            const itemName = items.get(itemId) || `Unknown Item (${itemId})`;
            
            post.Data += `[${itemName}]x${item.Amount};`;
        } else if (item.Amount) {
            post.jb = `${parseFloat(item.Amount) / 10000}`;
        }
    });
    
    return Array.from(postMap.values());
}

// API endpoint to reload items cache - защищенный маршрут
router.post('/admin/item-tracking/reload-items', isAdmin, async (req, res) => {
    const currentUser = req.session.user;
    
    log.info(`Items cache reload requested by ${currentUser.username}`);
    
    try {
        await loadItemsFromDB();
        log.success(`Items cache reloaded: ${itemsCache.size} items`);
        res.json({ 
            success: true, 
            message: `Items cache updated. Loaded ${itemsCache.size} items` 
        });
    } catch (error) {
        log.error(`Cache update error: ${error.message}`);
        res.json({ 
            success: false, 
            error: `Cache update error: ${error.message}` 
        });
    }
});

// API endpoint to get items count - защищенный маршрут
router.get('/admin/item-tracking/items-count', isAdmin, async (req, res) => {
    try {
        await loadItemsFromDB();
        res.json({ 
            success: true, 
            count: itemsCache.size 
        });
    } catch (error) {
        log.error(`Error getting items count: ${error.message}`);
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Graceful shutdown for connection pools
process.on('SIGINT', async () => {
    log.info('Shutting down item tracking connection pools...');
    for (const [configKey, pool] of itemTrackingConnectionPools) {
        try {
            await pool.close();
        } catch (err) {
            log.error(`Error closing connection pool: ${err.message}`);
        }
    }
    process.exit(0);
});

export default router;