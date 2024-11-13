// routes/addDepositRoutes.js

import express from 'express';
import sql from 'mssql';
import axios from 'axios';
import { configPlatformAcctDb, configVirtualCurrencyDb, WH_config } from '../config/dbConfig.js';
import { isAdmin } from '../middleware/adminMiddleware.js';
import path from 'path';

const router = express.Router();

// Настройки подключения к базе данных Warehouse
const WH_connectionInfo = WH_config; // Используем WH_config из dbConfig.js

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
        pool = await sql.connect(configPlatformAcctDb); // Используем конфиг для базы PlatformAcctDb
        const result = await pool.request()
            .input('userId', sql.VarChar, userId)
            .query('SELECT UserId FROM Users WHERE UserId = @userId');
        return result.recordset.length > 0;
    } catch (err) {
        console.error('Ошибка подключения к базе данных PlatformAcctDb:', err);
        throw err;
    } finally {
        if (pool) {
            await pool.close(); // Закрываем соединение
        }
    }
}

// Функция для получения никнейма по UserId из базы данных PlatformAcctDb
async function getUsernameByUserId(userId) {
    let pool;
    try {
        pool = await sql.connect(configPlatformAcctDb);
        const result = await pool.request()
            .input('userId', sql.VarChar, userId)
            .query('SELECT UserName FROM Users WHERE UserId = @userId');

        return result.recordset[0] ? result.recordset[0].UserName : null; // Вернуть никнейм или null
    } catch (err) {
        console.error('Ошибка подключения к базе данных PlatformAcctDb:', err);
        throw err;
    } finally {
        if (pool) {
            await pool.close(); // Закрываем соединение
        }
    }
}

router.get('/admin/add-deposit', isAdmin, async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).send('Отсутствует значение userId');
    }

    let pool;
    let deposits = [];
    let totalBalance = 0;
    let totalAmount = 0;
    let username = '';

    try {
        // Проверка существования userId в базе PlatformAcctDb
        const userExists = await check_user_id(userId);
        if (!userExists) {
            return res.send('User ID not found in PlatformAcctDb.');
        }

        // Получение никнейма по UserId
        username = await getUsernameByUserId(userId);
        if (!username) {
            return res.send('Nick not found for User ID.');
        }

        // Подключение к базе данных VirtualCurrencyDb для получения данных о депозитах
        pool = await sql.connect(configVirtualCurrencyDb);

        // Получение общего баланса
        const balanceResult = await pool.request()
            .input('UserId', sql.UniqueIdentifier, userId)
            .query('SELECT SUM(Balance) AS totalBalance FROM [dbo].[Deposits] WHERE UserId = @UserId');

        totalBalance = balanceResult.recordset[0].totalBalance || 0;

        // Получение всех депозитов для подсчета общей суммы
        const depositsResult = await pool.request()
            .input('UserId', sql.UniqueIdentifier, userId)
            .query('SELECT DepositId, Amount FROM Deposits WHERE UserId = @UserId');

        deposits = depositsResult.recordset || [];

        // Вычисление общей суммы Amount
        totalAmount = deposits.reduce((acc, deposit) => acc + Number(deposit.Amount), 0);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Произошла ошибка при получении данных о депозитах.');
    } finally {
        if (pool) {
            await pool.close(); // Закрываем соединение
        }
    }

    // Отправляем страницу с формой добавления депозита
    res.render('addDeposit', {
        userId,
        username, // Передаем никнейм в шаблон
        totalAmount,
        totalBalance,
		pathname: req.originalUrl
    });
});




// Главный маршрут для обработки депозита
router.post('/add-deposit/process', async (req, res) => {
    let { amount, game_account_id } = req.body;

    // Проверка входных данных
    if (!amount || isNaN(amount) || !game_account_id || game_account_id.trim() === '') {
        return res.status(400).send('Amount or Game Account ID cannot be empty.');
    }

    amount = parseFloat(amount);
    if (amount <= 0) {
        return res.status(400).send('Amount must be greater than zero.');
    }

    let pool;
    try {
        // Проверка существования userId в базе PlatformAcctDb
        const userExists = await check_user_id(game_account_id);
        if (!userExists) {
            return res.status(404).send('User ID not found in PlatformAcctDb.');
        }

        // Подключение к базе данных VirtualCurrencyDb для получения данных о депозитах
        pool = await sql.connect(configVirtualCurrencyDb);

        // Выполнение логики добавления депозита
        const depositsResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, game_account_id)
            .query('SELECT DepositId, Amount, Balance FROM Deposits WHERE UserId = @userId');

        let deposits = depositsResult.recordset || [];

        // Вычисление общей суммы Amount
        let totalAmount = deposits.reduce((acc, deposit) => acc + Number(deposit.Amount), 0);

        // Получение общего баланса из таблицы Deposits
        const totalBalanceResult = await pool.request()
            .input('UserId', sql.UniqueIdentifier, game_account_id)
            .query('SELECT SUM(Balance) AS totalBalance FROM [dbo].[Deposits] WHERE UserId = @UserId');

        const totalBalanceFromDb = totalBalanceResult.recordset[0].totalBalance || 0;

        // Получение данных из внешнего сервиса (добавление логики депозита и т.д.)
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
                <DepositReasonCode>5</DepositReasonCode>
                <DepositReason>입금사유</DepositReason>
                <RequestCode>${request_code}</RequestCode>
                <RequestId>efb8205d-0261-aa9f-8709-aff33e052091</RequestId>
            </Request>`,
        };

        // Отправка POST-запроса на внешний сервис
        const postResponse = await axios.post(
            `http://${ip}:6605/spawned/${service}.1.${resultapp}/test/command_console`,
            null,
            {
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
            }
        );

        // После успешного добавления депозита, повторно извлекаем данные о текущем балансе и депозитах
        const updatedBalanceResult = await pool.request()
            .input('UserId', sql.UniqueIdentifier, game_account_id)
            .query('SELECT SUM(Balance) AS totalBalance FROM [dbo].[Deposits] WHERE UserId = @UserId');

        const updatedTotalBalance = updatedBalanceResult.recordset[0].totalBalance || 0;

        // Получение обновленных данных о депозитах
        const updatedDepositsResult = await pool.request()
            .input('userId', sql.UniqueIdentifier, game_account_id)
            .query('SELECT DepositId, Amount, Balance FROM Deposits WHERE UserId = @userId');

        let updatedDeposits = updatedDepositsResult.recordset || [];

        // Генерация HTML для обновленных депозитов
const resultPageContent = `
    <h3>Deposits</h3>
    <table class="table table-bordered">
        <thead>
            <tr>
                <th>Deposit ID</th>
                <th>Amount</th>
                <th>Balance</th>
            </tr>
        </thead>
        <tbody>
            ${updatedDeposits.map(deposit => `
                <tr>
                    <td>${deposit.DepositId}</td>
                    <td>${deposit.Amount}</td>
                    <td>${deposit.Balance}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    <h4>Total Amount before Contributions: ${totalAmount} <img src="/images/money/NCoin.webp" alt="B&SCoin" style="width: 24px; height: 24px;"> Hangmoon Coins</h4>
    <h4>Total Balance after Contributions: ${updatedTotalBalance} <img src="/images/money/NCoin.webp" alt="B&SCoin" style="width: 24px; height: 24px;"> Hangmoon Coins</h4>
`;


        res.json({
            totalAmount,
            totalBalance: updatedTotalBalance,
            resultPageContent
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Произошла ошибка.');
    } finally {
        if (pool) {
            await pool.close(); // Закрываем соединение
        }
    }
});

export default router;
