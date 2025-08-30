// routes/couponRoutes.js
import express from 'express';
import sql from 'mssql';
import chalk from 'chalk';
import { isAdmin } from '../middleware/adminMiddleware.js';
import { configCouponSystemDB } from '../config/dbConfig.js';
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

// Дашборд - список выпусков
router.get('/admin/coupons', isAdmin, async (req, res) => {
    try {
        const pool = await sql.connect(configCouponSystemDB);
        
        // Получаем выпуски с статистикой
        const issuesQuery = `
            SELECT 
                pi.IssueId,
                pi.IssueName,
                pi.CreatedAt,
                pi.RedeemFrom,
                pi.RedeemTo,
                COUNT(pc.CouponId) as TotalCoupons,
                SUM(pc.UsedCount) as TotalActivations,
                COUNT(pa.ActivationId) as UniqueActivations
            FROM PromoIssues pi
            LEFT JOIN PromoCoupons pc ON pi.IssueId = pc.IssueId
            LEFT JOIN PromoActivations pa ON pc.CouponId = pa.CouponId
            GROUP BY pi.IssueId, pi.IssueName, pi.CreatedAt, pi.RedeemFrom, pi.RedeemTo
            ORDER BY pi.CreatedAt DESC
        `;
        
        const issues = await pool.request().query(issuesQuery);
        
        // Последние активации
        const activationsQuery = `
            SELECT TOP 100 
                pa.ActivationId,
                pa.UserId,
                pa.ActivatedAt,
                pc.CouponCode,
                pi.IssueName
            FROM PromoActivations pa
            INNER JOIN PromoCoupons pc ON pa.CouponId = pc.CouponId
            INNER JOIN PromoIssues pi ON pc.IssueId = pi.IssueId
            ORDER BY pa.ActivatedAt DESC
        `;
        
        const activations = await pool.request().query(activationsQuery);
        
        await pool.close();
        
        res.render('coupons/dashboard', {
            issues: issues.recordset,
            activations: activations.recordset,
            pathname: req.originalUrl
        });
        
    } catch (error) {
        log.error(`Dashboard error: ${error.message}`);
        res.status(500).send('Error loading dashboard');
    }
});

// Просмотр выпуска
router.get('/admin/coupons/issue/:issueId', isAdmin, async (req, res) => {
    try {
        const { issueId } = req.params;
        const pool = await sql.connect(configCouponSystemDB);
        
        // Информация о выпуске
        const issueQuery = `
            SELECT * FROM PromoIssues WHERE IssueId = @issueId
        `;
        
        const issueResult = await pool.request()
            .input('issueId', sql.Int, issueId)
            .query(issueQuery);
        
        if (issueResult.recordset.length === 0) {
            return res.status(404).send('Issue not found');
        }
        
        // Награды выпуска
        const rewardsQuery = `
            SELECT * FROM PromoRewards WHERE IssueId = @issueId
        `;
        
        const rewards = await pool.request()
            .input('issueId', sql.Int, issueId)
            .query(rewardsQuery);
        
        // Купоны выпуска
        const couponsQuery = `
            SELECT 
                pc.*,
                COUNT(pa.ActivationId) as ActivationCount
            FROM PromoCoupons pc
            LEFT JOIN PromoActivations pa ON pc.CouponId = pa.CouponId
            WHERE pc.IssueId = @issueId
            GROUP BY pc.CouponId, pc.IssueId, pc.CouponCode, pc.MaxUses, pc.UsedCount, pc.CreatedAt
        `;
        
        const coupons = await pool.request()
            .input('issueId', sql.Int, issueId)
            .query(couponsQuery);
        
        await pool.close();
        
        res.render('coupons/issue', {
            issue: issueResult.recordset[0],
            rewards: rewards.recordset,
            coupons: coupons.recordset,
            pathname: req.originalUrl
        });
        
    } catch (error) {
        log.error(`Issue view error: ${error.message}`);
        res.status(500).send('Error loading issue');
    }
});

// Создание выпуска
router.post('/admin/coupons/issue/create', isAdmin, async (req, res) => {
    try {
        const { issueName, redeemFrom, redeemTo, effectiveFrom, effectiveTo, expirationDuration } = req.body;
        
        const pool = await sql.connect(configCouponSystemDB);
        
        const query = `
            INSERT INTO PromoIssues (IssueName, RedeemFrom, RedeemTo, EffectiveFrom, EffectiveTo, ExpirationDuration)
            VALUES (@issueName, @redeemFrom, @redeemTo, @effectiveFrom, @effectiveTo, @expirationDuration);
            SELECT SCOPE_IDENTITY() as IssueId;
        `;
        
        const result = await pool.request()
            .input('issueName', sql.NVarChar, issueName)
            .input('redeemFrom', sql.DateTimeOffset, redeemFrom || null)
            .input('redeemTo', sql.DateTimeOffset, redeemTo || null)
            .input('effectiveFrom', sql.DateTimeOffset, effectiveFrom || null)
            .input('effectiveTo', sql.DateTimeOffset, effectiveTo || null)
            .input('expirationDuration', sql.Int, expirationDuration || null)
            .query(query);
        
        await pool.close();
        
        res.json({ success: true, issueId: result.recordset[0].IssueId });
        
    } catch (error) {
        log.error(`Issue creation error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Добавление награды к выпуску
router.post('/admin/coupons/issue/:issueId/reward', isAdmin, async (req, res) => {
    try {
        const { issueId } = req.params;
        const { itemId, quantity, rewardName } = req.body;
        
        const pool = await sql.connect(configCouponSystemDB);
        
        const query = `
            INSERT INTO PromoRewards (IssueId, ItemID, Quantity, RewardName)
            VALUES (@issueId, @itemId, @quantity, @rewardName)
        `;
        
        await pool.request()
            .input('issueId', sql.Int, issueId)
            .input('itemId', sql.Int, itemId)
            .input('quantity', sql.Int, quantity)
            .input('rewardName', sql.NVarChar, rewardName || null)
            .query(query);
        
        await pool.close();
        
        res.json({ success: true });
        
    } catch (error) {
        log.error(`Reward addition error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Роут для отображения формы создания выпуска
router.get('/admin/coupons/create', isAdmin, async (req, res) => {
    try {
        res.render('coupons/create', {
            pathname: req.originalUrl
        });
    } catch (error) {
        log.error(`Create form error: ${error.message}`);
        res.status(500).send('Error loading create form');
    }
});

// Генерация купонов
router.post('/admin/coupons/generate', isAdmin, async (req, res) => {
    try {
        const { issueId, count, maxUses, couponCode } = req.body;
        
        const pool = await sql.connect(configCouponSystemDB);
        
        if (couponCode) {
            // Одиночный купон
            const query = `
                INSERT INTO PromoCoupons (IssueId, CouponCode, MaxUses)
                VALUES (@issueId, @couponCode, @maxUses)
            `;
            
            await pool.request()
                .input('issueId', sql.Int, issueId)
                .input('couponCode', sql.NVarChar, couponCode)
                .input('maxUses', sql.Int, maxUses || 1)
                .query(query);
        } else {
            // Массовая генерация
            for (let i = 0; i < count; i++) {
                const code = `BNS-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
                
                await pool.request()
                    .input('issueId', sql.Int, issueId)
                    .input('couponCode', sql.NVarChar, code)
                    .input('maxUses', sql.Int, maxUses || 1)
                    .query(`
                        INSERT INTO PromoCoupons (IssueId, CouponCode, MaxUses)
                        VALUES (@issueId, @couponCode, @maxUses)
                    `);
            }
        }
        
        await pool.close();
        
        res.json({ success: true });
        
    } catch (error) {
        log.error(`Coupon generation error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Роут для обработки генерации купонов (GET для формы)
router.get('/admin/coupons/generate-form', isAdmin, async (req, res) => {
    try {
        const pool = await sql.connect(configCouponSystemDB);
        
        const issuesQuery = 'SELECT IssueId, IssueName FROM PromoIssues ORDER BY CreatedAt DESC';
        const issues = await pool.request().query(issuesQuery);
        
        await pool.close();
        
        res.render('coupons/generate', {
            issues: issues.recordset,
            pathname: req.originalUrl
        });
    } catch (error) {
        log.error(`Generate form error: ${error.message}`);
        res.status(500).send('Error loading generate form');
    }
});

// Сброс активации купона
router.post('/admin/coupons/reset', isAdmin, async (req, res) => {
    try {
        const { activationId } = req.body;
        
        const pool = await sql.connect(configCouponSystemDB);
        
        // Получаем информацию об активации
        const activationQuery = `
            SELECT pa.*, pc.CouponId 
            FROM PromoActivations pa
            INNER JOIN PromoCoupons pc ON pa.CouponId = pc.CouponId
            WHERE pa.ActivationId = @activationId
        `;
        
        const activation = await pool.request()
            .input('activationId', sql.Int, parseInt(activationId)) // Добавлено parseInt
            .query(activationQuery);
        
        if (activation.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Activation not found' });
        }
        
        const couponId = parseInt(activation.recordset[0].CouponId); // Преобразуем в число
        
        // Удаляем активацию
        await pool.request()
            .input('activationId', sql.Int, parseInt(activationId)) // Добавлено parseInt
            .query('DELETE FROM PromoActivations WHERE ActivationId = @activationId');
        
        // Уменьшаем счетчик использований
        await pool.request()
            .input('couponId', sql.Int, couponId) // Используем преобразованный couponId
            .query('UPDATE PromoCoupons SET UsedCount = UsedCount - 1 WHERE CouponId = @couponId AND UsedCount > 0');
        
        await pool.close();
        
        res.json({ success: true, message: 'Activation reset successfully' });
        
    } catch (error) {
        log.error(`Activation reset error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Поиск купонов
router.get('/admin/coupons/search', isAdmin, async (req, res) => {
    try {
        const { search, issueId, expired } = req.query;
        
        const pool = await sql.connect(configCouponSystemDB);
        
        let query = `
            SELECT 
                pc.*,
                pi.IssueName,
                COUNT(pa.ActivationId) as ActivationCount,
                CASE 
                    WHEN (pi.RedeemTo IS NOT NULL AND pi.RedeemTo < SYSDATETIMEOFFSET()) THEN 1
                    ELSE 0
                END as IsExpired
            FROM PromoCoupons pc
            INNER JOIN PromoIssues pi ON pc.IssueId = pi.IssueId
            LEFT JOIN PromoActivations pa ON pc.CouponId = pa.CouponId
            WHERE 1=1
        `;
        
        if (search) {
            query += ` AND pc.CouponCode LIKE '%' + @search + '%'`;
        }
        
        if (issueId) {
            query += ` AND pc.IssueId = @issueId`;
        }
        
        if (expired === 'true') {
            query += ` AND pi.RedeemTo IS NOT NULL AND pi.RedeemTo < SYSDATETIMEOFFSET()`;
        }
        
        query += ` GROUP BY pc.CouponId, pc.IssueId, pc.CouponCode, pc.MaxUses, pc.UsedCount, pc.CreatedAt, pi.IssueName, pi.RedeemTo
                   ORDER BY pc.CreatedAt DESC`;
        
        const request = pool.request();
        if (search) request.input('search', sql.NVarChar, search);
        if (issueId) request.input('issueId', sql.Int, issueId);
        
        const coupons = await request.query(query);
        await pool.close();
        
        res.json({ success: true, coupons: coupons.recordset });
        
    } catch (error) {
        log.error(`Coupon search error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Роут для отображения формы генерации купонов (GET)
router.get('/admin/coupons/generate', isAdmin, async (req, res) => {
    try {
        const { issueId } = req.query;
        const pool = await sql.connect(configCouponSystemDB);
        
        // Получаем список выпусков для выпадающего списка
        const issuesQuery = 'SELECT IssueId, IssueName FROM PromoIssues ORDER BY CreatedAt DESC';
        const issues = await pool.request().query(issuesQuery);
        
        await pool.close();
        
        res.render('coupons/generate', {
            issues: issues.recordset,
            selectedIssueId: issueId,
            pathname: req.originalUrl
        });
    } catch (error) {
        log.error(`Generate form error: ${error.message}`);
        res.status(500).send('Error loading generate form');
    }
});

// Роут для отображения формы управления наградами (GET)
router.get('/admin/coupons/issue/:issueId/rewards', isAdmin, async (req, res) => {
    try {
        const { issueId } = req.params;
        const pool = await sql.connect(configCouponSystemDB);
        
        // Получаем информацию о выпуске
        const issueQuery = 'SELECT * FROM PromoIssues WHERE IssueId = @issueId';
        const issueResult = await pool.request()
            .input('issueId', sql.Int, issueId)
            .query(issueQuery);
        
        if (issueResult.recordset.length === 0) {
            return res.status(404).send('Issue not found');
        }
        
        // Получаем награды выпуска
        const rewardsQuery = 'SELECT * FROM PromoRewards WHERE IssueId = @issueId';
        const rewards = await pool.request()
            .input('issueId', sql.Int, issueId)
            .query(rewardsQuery);
        
        await pool.close();
        
        res.render('coupons/rewards', {
            issue: issueResult.recordset[0],
            rewards: rewards.recordset,
            pathname: req.originalUrl
        });
    } catch (error) {
        log.error(`Rewards management error: ${error.message}`);
        res.status(500).send('Error loading rewards management');
    }
});

// Роут для отображения формы поиска купонов (GET)
router.get('/admin/coupons/search-form', isAdmin, async (req, res) => {
    try {
        const pool = await sql.connect(configCouponSystemDB);
        
        const issuesQuery = 'SELECT IssueId, IssueName FROM PromoIssues ORDER BY CreatedAt DESC';
        const issues = await pool.request().query(issuesQuery);
        
        await pool.close();
        
        res.render('coupons/search', {
            issues: issues.recordset,
            pathname: req.originalUrl
        });
    } catch (error) {
        log.error(`Search form error: ${error.message}`);
        res.status(500).send('Error loading search form');
    }
});

// Удаление купона
router.post('/admin/coupons/delete', isAdmin, async (req, res) => {
    try {
        const { couponId } = req.body;
        
        const pool = await sql.connect(configCouponSystemDB);
        
        // Проверяем существование купона
        const couponQuery = 'SELECT * FROM PromoCoupons WHERE CouponId = @couponId';
        const couponResult = await pool.request()
            .input('couponId', sql.Int, couponId)
            .query(couponQuery);
        
        if (couponResult.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Coupon not found' });
        }
        
        // Проверяем, использовался ли купон
        const activationsQuery = 'SELECT COUNT(*) as count FROM PromoActivations WHERE CouponId = @couponId';
        const activationsResult = await pool.request()
            .input('couponId', sql.Int, couponId)
            .query(activationsQuery);
        
        if (activationsResult.recordset[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete coupon that has been activated' 
            });
        }
        
        // Удаляем купон
        await pool.request()
            .input('couponId', sql.Int, couponId)
            .query('DELETE FROM PromoCoupons WHERE CouponId = @couponId');
        
        await pool.close();
        
        res.json({ success: true, message: 'Coupon deleted successfully' });
        
    } catch (error) {
        log.error(`Coupon deletion error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Редактирование выпуска
router.get('/admin/coupons/issue/:issueId/edit', isAdmin, async (req, res) => {
    try {
        const { issueId } = req.params;
        const pool = await sql.connect(configCouponSystemDB);
        
        const issueQuery = 'SELECT * FROM PromoIssues WHERE IssueId = @issueId';
        const issueResult = await pool.request()
            .input('issueId', sql.Int, issueId)
            .query(issueQuery);
        
        if (issueResult.recordset.length === 0) {
            return res.status(404).send('Issue not found');
        }
        
        await pool.close();
        
        res.render('coupons/edit-issue', {
            issue: issueResult.recordset[0],
            pathname: req.originalUrl
        });
        
    } catch (error) {
        log.error(`Edit issue form error: ${error.message}`);
        res.status(500).send('Error loading edit form');
    }
});

// Редактирование купона
router.get('/admin/coupons/edit/:couponId', isAdmin, async (req, res) => {
    try {
        const { couponId } = req.params;
        const pool = await sql.connect(configCouponSystemDB);
        
        const couponQuery = `
            SELECT 
                pc.*,
                pi.IssueName,
                pi.IssueId
            FROM PromoCoupons pc
            INNER JOIN PromoIssues pi ON pc.IssueId = pi.IssueId
            WHERE pc.CouponId = @couponId
        `;
        
        const couponResult = await pool.request()
            .input('couponId', sql.Int, couponId)
            .query(couponQuery);
        
        if (couponResult.recordset.length === 0) {
            return res.status(404).send('Coupon not found');
        }
        
        // Получаем список выпусков для выпадающего списка
        const issuesQuery = 'SELECT IssueId, IssueName FROM PromoIssues ORDER BY CreatedAt DESC';
        const issues = await pool.request().query(issuesQuery);
        
        await pool.close();
        
        res.render('coupons/edit-coupon', {
            coupon: couponResult.recordset[0],
            issues: issues.recordset,
            pathname: req.originalUrl
        });
        
    } catch (error) {
        log.error(`Edit coupon form error: ${error.message}`);
        res.status(500).send('Error loading edit form');
    }
});

// Обновление купона
router.post('/admin/coupons/update/:couponId', isAdmin, async (req, res) => {
    try {
        const { couponId } = req.params;
        const { couponCode, maxUses, issueId } = req.body;
        
        const pool = await sql.connect(configCouponSystemDB);
        
        // Проверяем, существует ли купон
        const checkQuery = 'SELECT * FROM PromoCoupons WHERE CouponId = @couponId';
        const checkResult = await pool.request()
            .input('couponId', sql.Int, couponId)
            .query(checkQuery);
        
        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ success: false, error: 'Coupon not found' });
        }
        
        // Проверяем, используется ли уже этот код другим купоном
        if (couponCode) {
            const codeCheckQuery = `
                SELECT * FROM PromoCoupons 
                WHERE CouponCode = @couponCode AND CouponId != @couponId
            `;
            
            const codeCheckResult = await pool.request()
                .input('couponCode', sql.NVarChar, couponCode)
                .input('couponId', sql.Int, couponId)
                .query(codeCheckQuery);
            
            if (codeCheckResult.recordset.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Coupon code already exists' 
                });
            }
        }
        
        // Обновляем купон
        const updateQuery = `
            UPDATE PromoCoupons 
            SET CouponCode = @couponCode,
                MaxUses = @maxUses,
                IssueId = @issueId
            WHERE CouponId = @couponId
        `;
        
        await pool.request()
            .input('couponId', sql.Int, couponId)
            .input('couponCode', sql.NVarChar, couponCode)
            .input('maxUses', sql.Int, maxUses)
            .input('issueId', sql.Int, issueId)
            .query(updateQuery);
        
        await pool.close();
        
        res.json({ success: true, message: 'Coupon updated successfully' });
        
    } catch (error) {
        log.error(`Coupon update error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Обновление выпуска
router.post('/admin/coupons/issue/:issueId/update', isAdmin, async (req, res) => {
    try {
        const { issueId } = req.params;
        const { issueName, redeemFrom, redeemTo, effectiveFrom, effectiveTo, expirationDuration } = req.body;
        
        const pool = await sql.connect(configCouponSystemDB);
        
        const query = `
            UPDATE PromoIssues 
            SET IssueName = @issueName,
                RedeemFrom = @redeemFrom,
                RedeemTo = @redeemTo,
                EffectiveFrom = @effectiveFrom,
                EffectiveTo = @effectiveTo,
                ExpirationDuration = @expirationDuration
            WHERE IssueId = @issueId
        `;
        
        await pool.request()
            .input('issueId', sql.Int, issueId)
            .input('issueName', sql.NVarChar, issueName)
            .input('redeemFrom', sql.DateTimeOffset, redeemFrom || null)
            .input('redeemTo', sql.DateTimeOffset, redeemTo || null)
            .input('effectiveFrom', sql.DateTimeOffset, effectiveFrom || null)
            .input('effectiveTo', sql.DateTimeOffset, effectiveTo || null)
            .input('expirationDuration', sql.Int, expirationDuration || null)
            .query(query);
        
        await pool.close();
        
        res.json({ success: true, message: 'Issue updated successfully' });
        
    } catch (error) {
        log.error(`Issue update error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Страница всех активаций
router.get('/admin/coupons/activations', isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        
        const pool = await sql.connect(configCouponSystemDB);
        
        // Общее количество активаций
        const countQuery = 'SELECT COUNT(*) as total FROM PromoActivations';
        const countResult = await pool.request().query(countQuery);
        const total = countResult.recordset[0].total;
        
        // Активации с пагинацией
        const activationsQuery = `
            SELECT 
                pa.ActivationId,
                pa.UserId,
                pa.ActivatedAt,
                pc.CouponCode,
                pi.IssueName,
                ROW_NUMBER() OVER (ORDER BY pa.ActivatedAt DESC) as RowNum
            FROM PromoActivations pa
            INNER JOIN PromoCoupons pc ON pa.CouponId = pc.CouponId
            INNER JOIN PromoIssues pi ON pc.IssueId = pi.IssueId
            ORDER BY pa.ActivatedAt DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `;
        
        const activations = await pool.request()
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, parseInt(limit))
            .query(activationsQuery);
        
        await pool.close();
        
        res.render('coupons/activations', {
            activations: activations.recordset,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            total,
            limit: parseInt(limit),
            pathname: req.originalUrl
        });
        
    } catch (error) {
        log.error(`Activations page error: ${error.message}`);
        res.status(500).send('Error loading activations');
    }
});

// Удаление награды
router.post('/admin/coupons/reward/delete', isAdmin, async (req, res) => {
    try {
        const { rewardId } = req.body;
        
        const pool = await sql.connect(configCouponSystemDB);
        
        await pool.request()
            .input('rewardId', sql.Int, rewardId)
            .query('DELETE FROM PromoRewards WHERE RewardId = @rewardId');
        
        await pool.close();
        
        res.json({ success: true, message: 'Reward deleted successfully' });
        
    } catch (error) {
        log.error(`Reward deletion error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;