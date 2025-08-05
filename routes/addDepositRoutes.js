import express from 'express';
import sql from 'mssql';
import axios from 'axios';
import { configPlatformAcctDb, configVirtualCurrencyDb, WH_config } from '../config/dbConfig.js';
import { isAdmin } from '../middleware/adminMiddleware.js';
import path from 'path';
import chalk from 'chalk';

const router = express.Router();

// Настройки подключения к базе данных Warehouse
const WH_connectionInfo = WH_config;

// Настройки для обращения к внешнему сервису
const ip = '127.0.0.1';
const service = 'VirtualCurrencySrv';

// Функция для поиска строки
function cut_str(begin, end, str) {
    const b = str.indexOf(begin) + begin.length;
    const e = str.indexOf(end, b);
    return str.substr(b, e - b);
}

// Функция для проверки наличия userId в базе данных PlatformAcctDb
async function check_user_id(userId) {
    let pool;
    try {
        pool = await sql.connect(configPlatformAcctDb);
        const result = await pool.request()
            .input('userId', sql.VarChar, userId)
            .query('SELECT UserId FROM Users WHERE UserId = @userId');
        return result.recordset.length > 0;
    } catch (err) {
        console.error('Database connection error (PlatformAcctDb):', err);
        throw err;
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

// Функция для получения никнейма по UserId
async function getUsernameByUserId(userId) {
    let pool;
    try {
        pool = await sql.connect(configPlatformAcctDb);
        const result = await pool.request()
            .input('userId', sql.VarChar, userId)
            .query('SELECT UserName FROM Users WHERE UserId = @userId');

        return result.recordset[0] ? result.recordset[0].UserName : null;
    } catch (err) {
        console.error('Database connection error (PlatformAcctDb):', err);
        throw err;
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

router.get('/admin/add-deposit', isAdmin, async(req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).send('User ID is required');
    }

    let pool;
    let deposits = [];
    let totalBalance = 0;
    let totalAmount = 0;
    let username = '';

    try {
        // Проверка существования пользователя
        const userExists = await check_user_id(userId);
        if (!userExists) {
            return res.send('User ID not found in PlatformAcctDb.');
        }

        // Получение никнейма
        username = await getUsernameByUserId(userId);
        if (!username) {
            return res.send('Nickname not found for User ID.');
        }

        // Подключение к базе данных VirtualCurrencyDb
        pool = await sql.connect(configVirtualCurrencyDb);

        // Получение общего баланса
        const balanceResult = await pool.request()
            .input('UserId', sql.UniqueIdentifier, userId)
            .query('SELECT SUM(Balance) AS totalBalance FROM [dbo].[Deposits] WHERE UserId = @UserId');

        totalBalance = balanceResult.recordset[0].totalBalance || 0;

        // Получение всех депозитов
        const depositsResult = await pool.request()
            .input('UserId', sql.UniqueIdentifier, userId)
            .query('SELECT DepositId, Amount FROM Deposits WHERE UserId = @UserId');

        deposits = depositsResult.recordset || [];

        // Вычисление общей суммы
        totalAmount = deposits.reduce((acc, deposit) => acc + Number(deposit.Amount), 0);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Error while fetching deposit data.');
    } finally {
        if (pool) {
            await pool.close();
        }
    }

    // Отправка страницы с формой
    res.render('addDeposit', {
        userId,
        username,
        totalAmount,
        totalBalance,
        pathname: req.originalUrl
    });
});

// Обработка депозита
router.post('/add-deposit/process', async(req, res) => {
    let { amount, game_account_id } = req.body;

    // Валидация входных данных
    if (!amount || isNaN(amount) || !game_account_id || game_account_id.trim() === '') {
        return res.status(400).send('Amount or Game Account ID cannot be empty.');
    }

    amount = parseFloat(amount);
    if (amount <= 0) {
        return res.status(400).send('Amount must be greater than zero.');
    }

    let pool;
    let username = '';
    try {
        // Проверка существования пользователя
        const userExists = await check_user_id(game_account_id);
        if (!userExists) {
            return res.status(404).send('User ID not found in PlatformAcctDb.');
        }

        // Получение никнейма для логирования
        username = await getUsernameByUserId(game_account_id);

        // Подключение к базе данных
        pool = await sql.connect(configVirtualCurrencyDb);

        // Получение текущих депозитов
        const depositsResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, game_account_id)
            .query('SELECT DepositId, Amount, Balance FROM Deposits WHERE UserId = @userId');

        let deposits = depositsResult.recordset || [];

        // Вычисление общей суммы
        let totalAmount = deposits.reduce((acc, deposit) => acc + Number(deposit.Amount), 0);

        // Получение текущего баланса
        const totalBalanceResult = await pool.request()
            .input('UserId', sql.UniqueIdentifier, game_account_id)
            .query('SELECT SUM(Balance) AS totalBalance FROM [dbo].[Deposits] WHERE UserId = @UserId');

        const totalBalanceFromDb = totalBalanceResult.recordset[0].totalBalance || 0;

        // Логирование перед пополнением
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(chalk.blue.bold(`[DEPOSIT INITIATED]`) + 
                chalk.cyan(` User: ${username || 'unknown'} (${game_account_id})`) + 
                chalk.yellow(` Amount: ${amount}`) + 
                chalk.gray(` Current balance: ${totalBalanceFromDb}`));
        }

        // Получение данных от сервиса виртуальной валюты
        const response = await axios.get(`http://${ip}:6605/apps-state`);
        const appResult = response.data;

        let resultapp = cut_str(`<AppName>${service}</AppName>`, `</App>`, appResult);
        resultapp = cut_str('<Epoch>', '</Epoch>', resultapp);

        const request_code = Math.floor(Math.random() * 10000) + 1;
        const postRequest = {
            protocol: 'VirtualCurrency',
            command: 'Deposit',
            from: '',
            to: game_account_id,
            message: `<Request>
                <CurrencyId>13</CurrencyId>
                <Amount>${amount}</Amount>
                <EffectiveTo>2099-05-05T03:30:30+09:00</EffectiveTo>
                <IsRefundable>0</IsRefundable>
                <DepositReasonCode>1</DepositReasonCode>
                <DepositReason>입금사유</DepositReason>
                <RequestCode>${request_code}</RequestCode>
                <RequestId>G</RequestId>
            </Request>`,
        };

        // Отправка запроса на пополнение
        const postResponse = await axios.post(
            `http://${ip}:6605/spawned/${service}.1.${resultapp}/test/command_console`,
            null, {
                params: {
                    protocol: postRequest.protocol,
                    command: postRequest.command,
                    from: postRequest.from,
                    to: postRequest.to,
                    message: postRequest.message,
                },
                headers: {
                    Accept: '*/*',
                    Connection: 'keep-alive',
                    Host: `${ip}:6605`,
                    Origin: `http://${ip}:6605`,
                    Referer: `http://${ip}:6605/spawned/${service}.1.${resultapp}/test/`,
                    'User-Agent': 'Mozilla/5.0',
                },
            });

        // Получение обновленного баланса
        const updatedBalanceResult = await pool.request()
            .input('UserId', sql.UniqueIdentifier, game_account_id)
            .query('SELECT SUM(Balance) AS totalBalance FROM [dbo].[Deposits] WHERE UserId = @UserId');

        const updatedTotalBalance = updatedBalanceResult.recordset[0].totalBalance || 0;

        // Логирование успешного пополнения
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(chalk.green.bold(`[DEPOSIT SUCCESS]`) + 
                chalk.cyan(` User: ${username || 'unknown'} (${game_account_id})`) + 
                chalk.yellow(` Amount: +${amount}`) + 
                chalk.green(` New balance: ${updatedTotalBalance}`) + 
                chalk.gray(` (was ${totalBalanceFromDb})`));
        }

        // Получение обновленных данных о депозитах
        const updatedDepositsResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, game_account_id)
            .query('SELECT DepositId, Amount, Balance FROM Deposits WHERE UserId = @userId');

        let updatedDeposits = updatedDepositsResult.recordset || [];

        // Генерация HTML ответа
        const resultPageContent = `
<div class="deposit-table">
    <h5 class="mb-3"><i class="fas fa-table me-2"></i>Deposit History</h5>
    <div class="table-responsive">
        <table class="table table-hover">
            <thead class="table-light">
                <tr>
                    <th><i class="fas fa-id-card me-1"></i>Deposit ID</th>
                    <th><i class="fas fa-coins me-1"></i>Amount</th>
                    <th><i class="fas fa-piggy-bank me-1"></i>Balance</th>
                </tr>
            </thead>
            <tbody>
                ${updatedDeposits.map(deposit => `
                    <tr>
                        <td>${deposit.DepositId}</td>
                        <td>${deposit.Amount.toLocaleString()} <span class="badge badge-currency">HMC</span></td>
                        <td>${deposit.Balance.toLocaleString()} <span class="badge badge-currency">HMC</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</div>

<div class="deposit-summary mt-4">
    <div class="row">
        <div class="col-md-6 mb-3">
            <div class="d-flex align-items-center">
                <i class="fas fa-coins text-warning fs-4 me-3"></i>
                <div>
                    <h5>Total Before</h5>
                    <p class="mb-0 fs-5">
                        ${totalAmount.toLocaleString()} 
                        <img src="/images/money/NCoin.webp" alt="Hangmoon Coins" class="money-icon">
                    </p>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="d-flex align-items-center">
                <i class="fas fa-piggy-bank text-success fs-4 me-3"></i>
                <div>
                    <h5>Total After</h5>
                    <p class="mb-0 fs-5">
                        ${updatedTotalBalance.toLocaleString()} 
                        <img src="/images/money/NCoin.webp" alt="Hangmoon Coins" class="money-icon">
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>
`;

        res.json({
            totalAmount,
            totalBalance: updatedTotalBalance,
            resultPageContent
        });
    } catch (error) {
        // Логирование ошибки
        if (process.env.LOG_TO_CONSOLE === 'true') {
            console.log(chalk.red.bold(`[DEPOSIT FAILED]`) + 
                chalk.cyan(` User: ${username || 'unknown'} (${game_account_id})`) + 
                chalk.yellow(` Amount: ${amount}`) + 
                chalk.red(` Error: ${error.message}`));
        }
        console.error(error);
        res.status(500).send('An error occurred during deposit processing.');
    } finally {
        if (pool) {
            await pool.close();
        }
    }
});

export default router;