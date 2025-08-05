import express from 'express';
import sql from 'mssql';
import { configPromotionStampDb } from '../config/dbConfig.js';
import { isAdmin } from '../middleware/adminMiddleware.js';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

dotenv.config();

const router = express.Router();

// Logging settings from .env
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE === 'true';
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';

// Logging configuration
const log = {
    // Error logs (always shown when LOG_TO_CONSOLE=true)
    error: (message) => LOG_TO_CONSOLE && console.log(chalk.red(`[ERROR] ${message}`)),
    
    // Important action logs (shown when LOG_TO_CONSOLE=true)
    adminAction: (action, user, target) => {
    if (!LOG_TO_CONSOLE) return;
    const userInfo = `${chalk.magenta(user.username)} (${chalk.cyan(`ID:${user.id}`)})`;
    const targetInfo = target 
        ? ` -> ${chalk.yellow(target.type)} ${chalk.cyan(target.id)}` + 
          (target.name ? ` (${chalk.green(target.name)})` : '')
        : '';
    console.log(
        chalk.bgGreen.white.bold('[ADMIN]') + 
        ' ' + 
        chalk.magenta(`${userInfo} ${action}${targetInfo}`)
    );
},

    promotionStatusChange: (action, promotionId, promotionName, details = '') => {
        if (!LOG_TO_CONSOLE) return;
        const nameToShow = promotionName && promotionName !== 'unnamed' ? promotionName : 'unnamed';
        const promoInfo = `${chalk.cyan(`PromoID:${promotionId}`)} (${chalk.yellow(nameToShow)})`;
        console.log(
            chalk.green(`[PROMO] `) +
            `${action} ` +
            promoInfo +
            (details ? ` | ${chalk.blue(details)}` : '')
        );
    },

    // Debug logs (shown when DEBUG_LOGS=true)
    db: (message) => DEBUG_LOGS && console.log(chalk.cyan(`[DB] ${message}`)),
    debug: (message) => DEBUG_LOGS && console.log(chalk.gray(`[DEBUG] ${message}`)),
    system: (message) => DEBUG_LOGS && console.log(chalk.blue(`[SYSTEM] ${message}`))
};

// Database connection helper
async function withPromotionDb(callback) {
    let pool = null;
    try {
        pool = await sql.connect(configPromotionStampDb);
        log.db('Connected to PromotionStampDb');
        return await callback(pool);
    } catch (err) {
        log.error(`Database connection error: ${err.message}`);
        throw err;
    } finally {
        if (pool) {
            try {
                await pool.close();
                log.debug('Database connection closed');
            } catch (err) {
                log.error(`Error closing connection: ${err.message}`);
            }
        }
    }
}

// Load settings from file
function loadSettings() {
    try {
        const configPath = path.join(process.cwd(), 'config', 'promotions.json');
        if (fs.existsSync(configPath)) {
            const rawData = fs.readFileSync(configPath);
            const settings = JSON.parse(rawData);
            log.debug('Loaded promotion settings from file');
            return {
                checkIntervalHours: settings.checkIntervalHours || 6,
                autoRenew: settings.autoRenew || {}
            };
        }
        log.debug('Using default promotion settings');
        return {
            checkIntervalHours: 6,
            autoRenew: {}
        };
    } catch (error) {
        log.error(`Error loading settings: ${error.message}`);
        return {
            checkIntervalHours: 6,
            autoRenew: {}
        };
    }
}

// Save settings to file
function saveSettings(settings) {
    try {
        const configPath = path.join(process.cwd(), 'config', 'promotions.json');
        const configDir = path.dirname(configPath);
        
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
            log.debug(`Created config directory: ${configDir}`);
        }
        
        fs.writeFileSync(configPath, JSON.stringify(settings, null, 2));
        log.debug('Promotion settings saved');
    } catch (error) {
        log.error(`Error saving settings: ${error.message}`);
    }
}

// Function to get current version of PromotionStampSrv service
async function getCurrentVersion() {
    try {
        const response = await axios.get('http://127.0.0.1:6605/apps-state', { timeout: 3000 });
        const xmlData = response.data;
        const parsedData = await parseStringPromise(xmlData);

        // Find the required application
        const apps = parsedData?.Info?.Apps?.[0]?.App;
        let version = null;

        for (const app of apps) {
            if (app?.AppName?.[0] === "PromotionStampSrv") {
                const instances = app?.Instances?.[0]?.Instance;
                if (instances && instances.length > 0) {
                    version = instances[0]?.Epoch?.[0];
                    break;
                }
            }
        }

        if (!version) {
            throw new Error('Version not found for PromotionStampSrv');
        }

        return version;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            log.system('PromotionStampSrv service is stopped');
            return 'Service Stopped';
        }
        log.error(`Error fetching current version: ${error.message}`);
        return 'Unknown';
    }
}

// Function to restart service
async function restartService(version) {
    try {
        const stopUrl = `http://127.0.0.1:6605/apps/1075.1.1.${version}/stop?_method=post`;
        await axios.post(stopUrl);
        log.system('PromotionStampSrv service has been restarted');
        return true;
    } catch (error) {
        log.error(`Error restarting service: ${error.message}`);
        return false;
    }
}

// Get all promotions
router.get('/admin/promotions', isAdmin, async(req, res) => {
    const currentUser = req.session.user;
    log.debug(`Admin ${currentUser.username} viewing promotions list`);

    try {
        const result = await withPromotionDb(async(pool) => {
            return await pool.request().query('SELECT * FROM Promotions');
        });

        if (!result || !result.recordset) {
            throw new Error('Invalid data format from database');
        }

        const promotions = result.recordset;
        const settings = loadSettings();
        
        promotions.forEach(promo => {
            if (promo && promo.PromotionId) {
                promo.AutoRenew = settings.autoRenew[promo.PromotionId] || false;
            }
        });

        const totalPromotions = promotions.length;
        const currentDate = new Date();
        
        const activePromotions = promotions.filter(promo => {
            if (!promo) return false;
            try {
                const effectiveFromDate = new Date(promo.EffectiveFrom);
                const effectiveToDate = new Date(promo.EffectiveTo);
                return currentDate >= effectiveFromDate && 
                       currentDate <= effectiveToDate && 
                       !promo.IsSuspended;
            } catch (e) {
                log.error(`Date processing error for promotion ${promo.PromotionId}: ${e.message}`);
                return false;
            }
        }).length;

        // Get current service version
        let currentVersion;
        try {
            currentVersion = await getCurrentVersion();
        } catch (error) {
            currentVersion = 'Service Stopped';
            log.error(`Error getting service version: ${error.message}`);
        }

        res.render('promotions', {
            promotions,
            totalPromotions,
            activePromotions,
            checkIntervalHours: settings.checkIntervalHours,
            pathname: req.originalUrl,
            currentVersion,
            serviceRestarting: false
        });
    } catch (error) {
        log.error(`Error loading promotions: ${error.message}`);
        res.status(500).send('Error loading promotions. Please try again later.');
    }
});

// Update system settings
router.post('/admin/promotions/update-settings', isAdmin, async(req, res) => {
    const { checkIntervalHours } = req.body;
    const currentUser = req.session.user;

    try {
        const settings = loadSettings();
        const oldInterval = settings.checkIntervalHours;
        settings.checkIntervalHours = parseInt(checkIntervalHours) || 6;
        saveSettings(settings);
        
        log.adminAction(
            'updated check interval',
            currentUser,
            {
                type: 'settings',
                id: 'system',
                name: `from ${oldInterval}h to ${settings.checkIntervalHours}h`
            }
        );
        
        res.redirect('/admin/promotions');
    } catch (error) {
        log.error(`Error updating settings: ${error.message}`);
        res.status(500).send('Server error');
    }
});

// Update promotion end date
router.post('/admin/promotions/update-effectivedate', isAdmin, async(req, res) => {
    const { PromotionId } = req.body;
    const currentUser = req.session.user;

    if (!PromotionId) {
        log.warning('Attempt to update promotion without ID');
        return res.status(400).send('Promotion ID required');
    }

    try {
        // Get promotion info first to ensure we have the name
        const promoInfo = await withPromotionDb(async(pool) => {
            const result = await pool.request()
                .input('PromotionId', sql.Int, PromotionId)
                .query('SELECT PromotionName FROM Promotions WHERE PromotionId = @PromotionId');
            return result.recordset[0];
        });

        const promotionName = promoInfo?.PromotionName || 'unnamed';

        // Perform the update
        await withPromotionDb(async(pool) => {
            await pool.request()
            .input('PromotionId', sql.Int, PromotionId)
            .query(`
                    UPDATE RewardPolicies
                    SET EffectiveTo = DATEADD(month, 1, GETDATE())
                    WHERE PromotionId = @PromotionId;

                    UPDATE Promotions
                    SET EffectiveTo = DATEADD(month, 1, GETDATE()),
                        DisplayEffectiveUntil = DATEADD(month, 1, GETDATE()),
                        IsSuspended = 0
                    WHERE PromotionId = @PromotionId;
                `);
        });

        log.promotionStatusChange(
            'Manually extended promotion',
            PromotionId,
            promotionName,
            'new duration: +1 month'
        );
        
        log.adminAction(
            'extended promotion',
            currentUser,
            {
                type: 'promotion',
                id: PromotionId,
                name: promotionName
            }
        );

        // Restart service after update
        const currentVersion = await getCurrentVersion();
        await restartService(currentVersion);
        
        res.redirect('/admin/promotions');
    } catch (error) {
        log.error(`Error extending promotion ${PromotionId}: ${error.message}`);
        res.status(500).send('Server error');
    }
});

// Update suspension status
router.post('/admin/promotions/update-suspend', isAdmin, async(req, res) => {
    const { PromotionId, IsSuspended } = req.body;
    const currentUser = req.session.user;

    if (!PromotionId) {
        log.warning('Attempt to update status without promotion ID');
        return res.status(400).send('Promotion ID required');
    }

    try {
        // Get promotion info first to ensure we have the name
        const promoInfo = await withPromotionDb(async(pool) => {
            const result = await pool.request()
                .input('PromotionId', sql.Int, PromotionId)
                .query('SELECT PromotionName FROM Promotions WHERE PromotionId = @PromotionId');
            return result.recordset[0];
        });

        const promotionName = promoInfo?.PromotionName || 'unnamed';

        // Perform the update
        await withPromotionDb(async(pool) => {
            await pool.request()
            .input('PromotionId', sql.Int, PromotionId)
            .input('IsSuspended', sql.Bit, IsSuspended)
            .query(`UPDATE Promotions SET
                    IsSuspended = @IsSuspended
                    WHERE PromotionId = @PromotionId`);
        });

        // If we're suspending the promotion, also disable auto-renew
        if (IsSuspended === 'true') {
            const settings = loadSettings();
            if (settings.autoRenew[PromotionId]) {
                settings.autoRenew[PromotionId] = false;
                saveSettings(settings);
                log.promotionStatusChange(
                    'Disabled auto-renew for suspended promotion',
                    PromotionId,
                    promotionName
                );
            }
        }

        const action = IsSuspended === 'true' ? 'suspended' : 'resumed';
        const status = IsSuspended === 'true' ? 'SUSPENDED' : 'ACTIVE';
        
        log.promotionStatusChange(
            `${action} promotion`,
            PromotionId,
            promotionName,
            `new status: ${status}`
        );
        
        log.adminAction(
            `${action} promotion`,
            currentUser,
            {
                type: 'promotion',
                id: PromotionId,
                name: promotionName
            }
        );

        // Restart service after update
        const currentVersion = await getCurrentVersion();
        await restartService(currentVersion);
        
        res.redirect('/admin/promotions');
    } catch (error) {
        log.error(`Error updating status for promotion ${PromotionId}: ${error.message}`);
        res.status(500).send('Server error');
    }
});

// Toggle auto-renewal
router.post('/admin/promotions/toggle-auto-renew', isAdmin, async(req, res) => {
    const { PromotionId, AutoRenew } = req.body;
    const currentUser = req.session.user;

    if (!PromotionId) {
        log.warning('Attempt to toggle auto-renew without promotion ID');
        return res.status(400).send('Promotion ID required');
    }

    try {
        // Get promotion info first to ensure we have the name
        const promoInfo = await withPromotionDb(async(pool) => {
            const result = await pool.request()
                .input('PromotionId', sql.Int, PromotionId)
                .query('SELECT PromotionName FROM Promotions WHERE PromotionId = @PromotionId');
            return result.recordset[0];
        });

        const promotionName = promoInfo?.PromotionName || 'unnamed';

        const settings = loadSettings();
        if (!settings.autoRenew) {
            settings.autoRenew = {};
        }
        
        const oldStatus = settings.autoRenew[PromotionId] ? 'ON' : 'OFF';
        settings.autoRenew[PromotionId] = AutoRenew === 'true';
        saveSettings(settings);
        
        const newStatus = settings.autoRenew[PromotionId] ? 'ON' : 'OFF';
        
        log.promotionStatusChange(
            'Changed auto-renewal status',
            PromotionId,
            promotionName,
            `${oldStatus} → ${newStatus}`
        );
        
        log.adminAction(
            'changed auto-renewal for promotion',
            currentUser,
            {
                type: 'promotion',
                id: PromotionId,
                name: promotionName
            }
        );

        // Restart service after update
        const currentVersion = await getCurrentVersion();
        await restartService(currentVersion);
        
        res.redirect('/admin/promotions');
    } catch (error) {
        log.error(`Error changing auto-renewal for promotion ${PromotionId}: ${error.message}`);
        res.status(500).send('Server error');
    }
});

// Check and auto-renew promotions
async function checkAndAutoRenewPromotions(isInitialCheck = false) {
    try {
        const settings = loadSettings();
        
        // Пропускаем логи при первом запуске
        if (!isInitialCheck) {
            log.system(`Starting auto-renew check (interval: ${settings.checkIntervalHours}h)`);
        }

        const result = await withPromotionDb(async(pool) => {
            return await pool.request().query('SELECT * FROM Promotions');
        });

        if (!result || !result.recordset) {
            log.error('Invalid data format from database');
            return;
        }

        const promotions = result.recordset;
        const currentDate = new Date();
        let renewedCount = 0;

        for (const promo of promotions) {
            if (!promo || !promo.PromotionId) continue;
            
            try {
                const effectiveToDate = new Date(promo.EffectiveTo);
                
                if (settings.autoRenew[promo.PromotionId] && currentDate > effectiveToDate && !promo.IsSuspended) {
                    await withPromotionDb(async(pool) => {
                        await pool.request()
                        .input('PromotionId', sql.Int, promo.PromotionId)
                        .query(`
                                UPDATE RewardPolicies
                                SET EffectiveTo = DATEADD(month, 1, GETDATE())
                                WHERE PromotionId = @PromotionId;

                                UPDATE Promotions
                                SET EffectiveTo = DATEADD(month, 1, GETDATE()),
                                    DisplayEffectiveUntil = DATEADD(month, 1, GETDATE()),
                                    IsSuspended = 0
                                WHERE PromotionId = @PromotionId;
                            `);
                    });
                    
                    log.promotionStatusChange(
                        'Auto-renewed promotion',
                        promo.PromotionId,
                        promo.PromotionName,
                        'extended by 1 month'
                    );
                    
                    renewedCount++;

                    // Restart service after auto-renew
                    const currentVersion = await getCurrentVersion();
                    await restartService(currentVersion);
                }
            } catch (e) {
                log.error(`Error processing promotion ${promo.PromotionId}: ${e.message}`);
            }
        }

        if (renewedCount > 0) {
            log.system(`Auto-renew completed. Renewed promotions: ${renewedCount}`);
        } else if (!isInitialCheck) {
            log.debug('No promotions required auto-renewal');
        }
    } catch (error) {
        log.error(`Auto-renew check failed: ${error.message}`);
    }
}

// Отложенная инициализация с задержкой 3 секунды
setTimeout(() => {
    // Первый запуск без логов
    checkAndAutoRenewPromotions(true);
    
    const settings = loadSettings();
    const checkIntervalMs = (settings.checkIntervalHours || 6) * 60 * 60 * 1000;
    
    // Последующие запуски с логами
    setInterval(() => checkAndAutoRenewPromotions(false), checkIntervalMs);
    
    log.system(`Auto-renew timer for Daily Dash event started (checks every ${settings.checkIntervalHours}h)`);
}, 3000);

export default router;