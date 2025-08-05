import express from 'express';
import fs from 'fs';
import chalk from 'chalk';
import path from 'path';
import axios from 'axios';
import sql from 'mssql';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { isAdmin } from '../middleware/adminMiddleware.js';
import { configPlatformAcctDb, configVirtualCurrencyDb, WH_config, configDonationsDb } from '../config/dbConfig.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, '..', 'public', 'images', 'donations');

// Функция для логирования с префиксами и цветами
const log = {
    shop: (message) => {
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(chalk.bgBlue.white('[SHOP]') + ' ' + message);
        }
    },
    admin: (message) => {
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(chalk.bgMagenta.white('[ADMIN SHOP]') + ' ' + message);
        }
    },
    error: (message) => {
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(chalk.bgRed.white('[ERROR]') + ' ' + chalk.red(message));
        }
    },
    success: (message) => {
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(chalk.bgGreen.white('[SUCCESS]') + ' ' + chalk.green(message));
        }
    },
    debug: (message) => {
        if (process.env.LOG_TO_CONSOLE === 'true' && process.env.DEBUG === 'true') {
            console.log(chalk.bgGray.white('[DEBUG]') + ' ' + chalk.gray(message));
        }
    }
};

if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, {
        recursive: true
    });
    log.admin(`Created images directory: ${imagesDir}`);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
});

// Маршрут для отображения страницы добавления товара
router.get('/admin/donate', isAdmin, async(req, res) => {
    try {
        const pool = await sql.connect(configDonationsDb);
        const result = await pool.request().query('SELECT * FROM dbo.Products');
        res.render('adminDonate', {
            products: result.recordset,
            pathname: req.originalUrl
        });
        await pool.close();
        log.debug('Successfully fetched products for admin panel');
    } catch (err) {
        log.error(`Error while receiving goods: ${err.message}`);
        res.status(500).send('Error while receiving goods.');
    }
});

// Маршрут для обработки добавления товара
router.post('/admin/donate/add', isAdmin, upload.single('image'), async(req, res) => {
    const { name, price, bonus, sale, quantity } = req.body;
    const image = req.file ? `/images/donations/${req.file.filename}` : null;

    try {
        const pool = await sql.connect(configDonationsDb);
        await pool.request()
            .input('Name', sql.NVarChar, name)
            .input('Price', sql.Decimal(18, 2), price)
            .input('Image', sql.NVarChar, image)
            .input('Bonus', sql.Int, bonus)
            .input('Sale', sql.Bit, sale === 'true')
            .input('Quantity', sql.Int, quantity)
            .input('BonusAmount', sql.Int, bonus ? parseInt(bonus, 10) : 0)
            .query(`
                INSERT INTO dbo.Products (Name, Price, Image, Bonus, Sale, Quantity, BonusAmount, AddedAt)
                VALUES (@Name, @Price, @Image, @Bonus, @Sale, @Quantity, @BonusAmount, GETDATE())
            `);

        await pool.close();
        log.admin(`Added product: ${chalk.yellow(name)}, price: ${chalk.yellow(price)}, bonus: ${chalk.yellow(bonus || 'none')}`);
        res.redirect('/admin/donate');
    } catch (err) {
        log.error(`Error adding product: ${err.message}`);
        res.status(500).send('Error adding product.');
    }
});

// Маршрут для обработки удаления товара
router.post('/admin/donate/delete/:id', isAdmin, async(req, res) => {
    const { id } = req.params;

    try {
        const pool = await sql.connect(configDonationsDb);

        // 1. Сначала получаем информацию о товаре, включая путь к изображению
        const productResult = await pool.request()
            .input('Id', sql.Int, id)
            .query('SELECT Image FROM dbo.Products WHERE Id = @Id');

        if (productResult.recordset.length === 0) {
            log.error(`Product with ID ${id} not found for deletion`);
            return res.status(404).send('Product not found');
        }

        const product = productResult.recordset[0];
        const imagePath = product.Image;

        // 2. Удаляем товар из базы данных
        const deleteResult = await pool.request()
            .input('Id', sql.Int, id)
            .query('DELETE FROM dbo.Products WHERE Id = @Id');

        await pool.close();

        if (deleteResult.rowsAffected[0] === 0) {
            log.error(`No rows affected when deleting product ID ${id}`);
            return res.status(404).send('Product not found');
        }

        // 3. Если у товара было изображение, удаляем файл
        if (imagePath) {
            try {
                // Извлекаем имя файла из пути
                const filename = path.basename(imagePath);
                const fullPath = path.join(__dirname, '..', 'public', 'images', 'donations', filename);

                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    log.admin(`Deleted image file: ${chalk.yellow(fullPath)}`);
                }
            } catch (fileErr) {
                log.error(`Error deleting product image: ${fileErr.message}`);
                // Не прерываем выполнение, если не удалось удалить файл
            }
        }

        log.admin(`Product with ID: ${chalk.yellow(id)} has been deleted`);
        res.redirect('/admin/donate');
    } catch (err) {
        log.error(`Error deleting product: ${err.message}`);
        res.status(500).send('Error deleting product.');
    }
});

// Маршрут для обработки обновления товара
router.post('/admin/donate/update/:id', isAdmin, upload.single('image'), async(req, res) => {
    const { id } = req.params;
    const { name, price, bonus, sale, quantity } = req.body;
    let oldImagePath = null;

    try {
        const pool = await sql.connect(configDonationsDb);

        // 1. Сначала получаем текущее изображение
        const currentProduct = await pool.request()
            .input('Id', sql.Int, id)
            .query('SELECT Image FROM dbo.Products WHERE Id = @Id');

        let imagePath = currentProduct.recordset[0].Image;
        oldImagePath = imagePath; // Сохраняем путь к старому изображению

        // 2. Если загружено новое изображение
        if (req.file) {
            imagePath = `/images/donations/${req.file.filename}`;
        }

        // 3. Обновляем товар в базе данных
        await pool.request()
            .input('Id', sql.Int, id)
            .input('Name', sql.NVarChar, name)
            .input('Price', sql.Decimal(18, 2), price)
            .input('Bonus', sql.Int, bonus)
            .input('Sale', sql.Bit, sale === 'true')
            .input('Quantity', sql.Int, quantity)
            .input('Image', sql.NVarChar, imagePath)
            .query(`
                UPDATE dbo.Products
                SET Name = @Name, 
                    Price = @Price, 
                    Bonus = @Bonus, 
                    Sale = @Sale,
                    Quantity = @Quantity, 
                    Image = @Image
                WHERE Id = @Id
            `);

        await pool.close();

        // 4. Если было загружено новое изображение и было старое изображение - удаляем старое
        if (req.file && oldImagePath) {
            try {
                const filename = path.basename(oldImagePath);
                const fullPath = path.join(__dirname, '..', 'public', 'images', 'donations', filename);

                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    log.admin(`Deleted old image file: ${chalk.yellow(fullPath)}`);
                }
            } catch (fileErr) {
                log.error(`Error deleting old product image: ${fileErr.message}`);
            }
        }

        log.admin(`Product with ID ${chalk.yellow(id)} has been updated`);
        res.redirect('/admin/donate');
    } catch (err) {
        log.error(`Error updating product: ${err.message}`);
        res.status(500).send('Error updating product.');
    }
});

// Промежуточная проверка для запрета доступа к /donate без параметра userName
router.get('/donate', async(req, res, next) => {
    if (!req.query.userName) {
        log.error('Donate page accessed without userName parameter');
        return res.status(404).render('404', {
            message: 'The userName parameter is not specified.'
        });
    }

    try {
        // Чтение данных о продуктах из базы данных
        const pool = await sql.connect(configDonationsDb);
        const result = await pool.request().query('SELECT * FROM dbo.Products');
        await pool.close();

        log.shop(`Donate page accessed by user: ${chalk.yellow(req.query.userName)}`);
        
        // Рендеринг страницы доната
        res.render('donateShop', {
            UserName: req.query.userName,
            products: result.recordset,
            pathname: req.originalUrl
        });
    } catch (err) {
        log.error(`Error while receiving goods: ${err.message}`);
        res.status(500).send('Error while receiving goods.');
    }
});

// Функция для получения UserId по Username из базы данных PlatformAcctDb
async function getUserIdByUsername(username) {
    let pool;
    try {
        pool = await sql.connect(configPlatformAcctDb);
        const result = await pool.request()
            .input('username', sql.VarChar, username)
            .query('SELECT UserId FROM Users WHERE UserName = @username');

        return result.recordset[0] ? result.recordset[0].UserId : null;
    } catch (err) {
        log.error(`Error connecting to PlatformAcctDb database: ${err.message}`);
        throw err;
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

// Функция для извлечения строки между двумя маркерами
function cut_str(startTag, endTag, inputString) {
    const startIndex = inputString.indexOf(startTag);
    if (startIndex === -1)
        return '';

    const endIndex = inputString.indexOf(endTag, startIndex + startTag.length);
    if (endIndex === -1)
        return '';

    return inputString.substring(startIndex + startTag.length, endIndex);
}

// Функция для добавления записи о донате в таблицу userDonationsDB
async function addDonationRecord(username, userId, amount, productName, quantity, productId, price, bonus) {
    let pool;
    try {
        pool = await sql.connect(configDonationsDb);
        await pool.request()
            .input('Username', sql.NVarChar, username)
            .input('UserId', sql.UniqueIdentifier, userId)
            .input('Amount', sql.Int, amount)
            .input('ProductName', sql.NVarChar, productName)
            .input('Quantity', sql.Int, quantity)
            .input('ProductId', sql.BigInt, productId)
            .input('Price', sql.Decimal(18, 2), price)
            .input('Bonus', sql.Int, bonus || null)
            .input('Date', sql.DateTime2, new Date())
            .query(`
                INSERT INTO DonationsDb.dbo.userDonationsDB (username, userId, amount, productName, quantity, productId, price, bonus, date)
                VALUES (@Username, @UserId, @Amount, @ProductName, @Quantity, @ProductId, @Price, @Bonus, @Date)
            `);
    } catch (err) {
        log.error(`Error adding record to userDonationsDB table: ${err.message}`);
        throw err;
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

router.post('/donate', async(req, res) => {
    const { username, amount, productName, price, productId, bonus } = req.body;

    // Проверка входных данных
    if (!username || !amount || isNaN(amount) || amount <= 0 || !price || isNaN(price) || !productId) {
        log.error(`Invalid input data for donation: username=${username}, amount=${amount}, price=${price}, productId=${productId}`);
        return res.status(400).send({
            status: 'error',
            message: 'Invalid input data. Price or Product ID is missing or incorrect.'
        });
    }

    try {
        // Получаем UserId
        const userId = await getUserIdByUsername(username);
        if (!userId) {
            log.error(`User not found in PlatformAcctDb: ${username}`);
            return res.status(404).send({
                status: 'error',
                message: 'User not found in PlatformAcctDb.'
            });
        }

        // Добавляем запись о донате
        await addDonationRecord(username, userId, amount, productName, 1, productId, price, bonus);

        // Выполняем запрос к VirtualCurrencySrv
        const response = await axios.get('http://127.0.0.1:6605/apps-state');
        const appResult = response.data;
        let resultapp = cut_str('<AppName>VirtualCurrencySrv</AppName>', '</App>', appResult);
        resultapp = cut_str('<Epoch>', '</Epoch>', resultapp);

        const request_code = Math.floor(Math.random() * 10000) + 1;

        const postResponse = await axios.post(
            `http://127.0.0.1:6605/spawned/VirtualCurrencySrv.1.${resultapp}/test/command_console`,
            null, {
                params: {
                    protocol: 'VirtualCurrency',
                    command: 'Deposit',
                    from: '',
                    to: userId,
                    message: `<Request>
                        <CurrencyId>13</CurrencyId>
                        <Amount>${amount}</Amount>
                        <EffectiveTo>2099-05-05T03:30:30+09:00</EffectiveTo>
                        <IsRefundable>0</IsRefundable>
                        <DepositReasonCode>1</DepositReasonCode>
                        <DepositReason>Donation for ${productName}</DepositReason>
                        <RequestCode>${request_code}</RequestCode>
                        <RequestId>G</RequestId>
                    </Request>`
                },
                headers: {
                    Accept: '*/*',
                    Connection: 'keep-alive',
                    Host: '127.0.0.1:6605',
                    Origin: 'http://127.0.0.1:6605',
                    Referer: 'http://127.0.0.1:6605/spawned/VirtualCurrencySrv.1',
                    'User-Agent': 'Mozilla/5.0',
                },
            });

        // Красивый вывод в консоль
        const depositId = cut_str('<DepositId>', '</DepositId>', postResponse.data);
        const balance = cut_str('<Balance>', '</Balance>', postResponse.data);
        const formattedAmount = new Intl.NumberFormat('en-US').format(amount);
        const formattedBalance = new Intl.NumberFormat('en-US').format(balance);

        log.success(`=== DONATION SUCCESSFULLY PROCESSED ===`);
        log.success(`Product: ${chalk.yellow(productName)}`);
        log.success(`Username: ${chalk.yellow(username)}`);
        log.success(`Amount: ${chalk.yellow(formattedAmount)} Velirs` + 
            (bonus ? ` (+${new Intl.NumberFormat('en-US').format(bonus)} bonus)` : ''));
        log.success(`Price: $${chalk.yellow(price)}`);
        log.success(`Deposit ID: ${chalk.yellow(depositId)}`);
        log.success(`New Balance: ${chalk.yellow(formattedBalance)} Velirs`);
        log.success(`======================================`);

        res.status(200).send({
            status: 'success',
            message: 'Donation successfully processed',
            depositedAmount: amount,
            bonus: bonus || 0,
            newBalance: balance,
            depositId: depositId
        });

    } catch (error) {
        log.error(`=== DONATION PROCESSING ERROR ===`);
        log.error(`Error: ${error.message}`);
        log.error(`===============================`);

        res.status(500).send({
            status: 'error',
            message: 'An error occurred during the donation process.',
            details: error.message
        });
    }
});

export default router;