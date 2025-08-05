//./routes/GradeMembersRoutes.js

import express from 'express';
import axios from 'axios';
import sql from 'mssql';
import chalk from 'chalk';
import {
	configPlatformAcctDb,
	configGradeMembersDb,
	configLevelDb
} from '../config/dbConfig.js';
import {
	isAdmin
} from '../middleware/adminMiddleware.js';
import path from 'path';

const orange = chalk.rgb(255, 165, 0);

// Регулярное выражение для проверки GUID
const isValidGuid = (guid) => {
	const guidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
	return guidRegex.test(guid);
};

// Функция для извлечения подстроки между двумя разделителями
const cut_str = (startStr, endStr, str) => {
	const startIndex = str.indexOf(startStr);
	const endIndex = str.indexOf(endStr, startIndex + startStr.length);

	if (startIndex === -1 || endIndex === -1) {
		return ''; // Возвращаем пустую строку, если разделители не найдены
	}

	return str.substring(startIndex + startStr.length, endIndex);
};

const router = express.Router();

// Функция для получения версии GradeSrv из состояния сервера
const getGradeServiceVersion = async () => {
	const ip = '127.0.0.1'; // IP адрес сервера
	const service = 'GradeSrv'; // Имя сервиса

	try {
		// Отправляем GET запрос для получения состояния приложения
		const response = await axios.get(`http://${ip}:6605/apps-state`);
		const appResult = response.data;

		// Извлекаем актуальную версию GradeSrv
		let resultapp = cut_str(`<AppName>${service}</AppName>`, `</App>`, appResult);
		resultapp = cut_str('<Epoch>', '</Epoch>', resultapp);

		return resultapp; // Возвращаем найденную версию
	} catch (error) {
		console.error('Error while fetching service version:', error.message);
		throw new Error('Failed to retrieve GradeSrv version');
	}
};

// Маршрут для создания подписки
router.post('/admin/add-vip', isAdmin, async (req, res) => {
	const {
		userId,
		duration,
		gradeScore
	} = req.body;

	if (!userId || !duration || !gradeScore) {
		return res.status(400).send('Please provide userId, duration, and gradeScore');
	}

	if (!isValidGuid(userId)) {
		return res.status(400).send('Invalid userId format');
	}

	let pool;
	let transaction;
	try {
		// Подключение к базе данных PlatformAcctDb
		pool = await sql.connect(configPlatformAcctDb);

		// Запрос для получения UserId и UserName
		let result = await pool.request()
			.input('userId', sql.UniqueIdentifier, userId) // Используем userId для поиска
			.query('SELECT UserId, UserName FROM Users WHERE UserId = @userId');

		let user = result.recordset[0];

		if (!user) {
			return res.status(404).send('User not found');
		}

		const userName = user.UserName;

		// Получаем новый RequestKey с использованием NEWID()
		const newRequestKey = await pool.request()
			.query('SELECT NEWID() AS NewRequestKey')
			.then(result => result.recordset[0].NewRequestKey);

		// Получаем актуальную версию GradeSrv
		const version = await getGradeServiceVersion(); // Динамическое получение версии

		const url = `http://127.0.0.1:6605/spawned/GradeSrv.1.${version}/Grade/command_console`;
		const message = `
<Request>
  <AppGroupCode>bns</AppGroupCode>
  <GameGradeKey>402</GameGradeKey>
  <RequestFromCode>5</RequestFromCode>
  <RequestKey>${newRequestKey}</RequestKey>
  <EffectiveDurationUnitType>2</EffectiveDurationUnitType>
  <EffectiveDuration>${duration}</EffectiveDuration>
  <DeductionStartType>1</DeductionStartType>
  <IsRefundable>1</IsRefundable>
  <IsGifted>0</IsGifted>
  <IsRepresented>1</IsRepresented>
  <GoodsId>80001</GoodsId>
  <ItemId>146</ItemId>
  <GradeScore>${gradeScore}</GradeScore>
</Request>
`;

		// Отправляем запрос на сервер
		const response = await axios.post(
			`${url}?protocol=Grade&command=CreateSubscription&to=${userId}&from=&message=${encodeURIComponent(message)}`,
			null // Тело запроса пустое
		);

		// Логируем информацию на сервере
		if (process.env.LOG_TO_CONSOLE === 'true') {
			console.log(
	chalk.green(`VIP for user `) +
	orange(`${userName}`) +
	chalk.green(` (UserId: `) +
	orange(`${userId}`) +
	chalk.green(`) has been extended for `) +
	orange(`${Math.floor(duration / 1440)}`) +
	chalk.green(` days`)
);
		}

		// Отправляем ответ клиенту с успешным сообщением
		res.json({
			success: true,
			message: `VIP for user ${userName} (UserId: ${userId}) has been extended for ${Math.floor(duration / 1440)} days`
		});
	} catch (error) {
		console.error('Error:', error.message);
		res.status(500).send('Error creating subscription');
	} finally {
		if (pool) {
			await pool.close();
		}
	}
});

// Функция для получения userName по userId из базы PlatformAcctDb
async function getUsernameByUserId(userId) {
	let pool;
	try {
		pool = await sql.connect(configPlatformAcctDb);
		const result = await pool.request()
			.input('userId', sql.UniqueIdentifier, userId)
			.query('SELECT UserName FROM Users WHERE UserId = @userId');

		return result.recordset[0] ? result.recordset[0].UserName : null;
	} catch (err) {
		console.error('Ошибка подключения к базе данных PlatformAcctDb:', err);
		throw err;
	} finally {
		if (pool) {
			await pool.close();
		}
	}
}

export async function getVipLevelByUserIdAndAppGroupCode(userId, appGroupCode) {
	let pool;
	try {
		pool = await sql.connect(configLevelDb);
		const result = await pool.request()
			.input('userId', sql.UniqueIdentifier, userId) // Добавляем userId
			.input('appGroupCode', sql.NVarChar, appGroupCode) // И AppGroupCode
			.query(`
                SELECT 
                    LevelId 
                FROM UserLevels
                WHERE UserId = @userId AND AppGroupCode = @appGroupCode
            `);

		return result.recordset[0] ? result.recordset[0].LevelId : null;
	} catch (err) {
		console.error('Ошибка подключения к базе данных LevelDb:', err);
		throw err;
	} finally {
		if (pool) {
			await pool.close();
		}
	}
}

router.get('/admin/add-vip', isAdmin, async (req, res) => {
	const {
		userId
	} = req.query;

	if (!userId) {
		return res.status(400).send('Missing userId');
	}

	if (!isValidGuid(userId)) {
		return res.status(400).send('Invalid userId format');
	}

	let pool;
	let statusMessage = null;
	let memberData = null;
	let userName = null;

	try {
		// Получение userName по userId
		userName = await getUsernameByUserId(userId);
		if (!userName) {
			return res.status(404).send('User not found');
		}


		// Получение уровня VIP на основе AppGroupCode
		const vipLevel = await getVipLevelByUserIdAndAppGroupCode(userId, 'bns'); // Используем значение AppGroupCode



		pool = await sql.connect(configGradeMembersDb);

		const result = await pool.request()
			.input('userId', sql.UniqueIdentifier, userId)
			.query(`
                SELECT TOP 1
    MemberId,
    AppGroupCode,
    UserId,
    GameGradeKey,
    MemberStatus,
    EffectiveDuration,
    RemainingEffectiveDurationPerSecond,
    RequestKey,
    FirstFrom,
    LastFrom,
    ExpiredTo,
    IsGifted,
    IsRefundable,
    IsRepresented
FROM Members
WHERE UserId = @userId
ORDER BY ExpiredTo DESC, RequestKey DESC

            `);

		// Расчет времени и даты окончания подписки
		const subscriptionCalculationResult = await pool.request()
			.input('userId', sql.UniqueIdentifier, userId)
			.query(`
WITH ActivationDetails AS (
    SELECT 
        UserId, 
        MAX(ExpiredTo) AS ActivationExpiration
    FROM Members
    WHERE MemberStatus = 2 AND UserId = @userId
    GROUP BY UserId
),
ExtensionDetails AS (
    SELECT 
        UserId, 
        SUM(EffectiveDuration) AS TotalExtensionDuration
    FROM Members
    WHERE MemberStatus = 1 AND UserId = @userId
    GROUP BY UserId
),
FinalCalculation AS (
    SELECT 
        a.UserId,
        a.ActivationExpiration,
        COALESCE(e.TotalExtensionDuration, 0) AS TotalExtensionDuration,
        CASE 
            WHEN e.TotalExtensionDuration IS NULL THEN a.ActivationExpiration
            ELSE DATEADD(MINUTE, e.TotalExtensionDuration, a.ActivationExpiration) -- Исправлено с DAY на MINUTE
        END AS FinalExpiration
    FROM ActivationDetails a
    LEFT JOIN ExtensionDetails e ON a.UserId = e.UserId
)
SELECT 
    fc.UserId, 
    CONCAT(
        FLOOR(DATEDIFF(MINUTE, SYSDATETIMEOFFSET(), fc.FinalExpiration) / 1440), ' days, ',
        FLOOR((DATEDIFF(MINUTE, SYSDATETIMEOFFSET(), fc.FinalExpiration) % 1440) / 60), ' hours, ',
        FLOOR(DATEDIFF(MINUTE, SYSDATETIMEOFFSET(), fc.FinalExpiration) % 60), ' minutes'
    ) AS TotalRemainingTimeFormatted,
    CASE 
        WHEN fc.FinalExpiration IS NOT NULL THEN fc.FinalExpiration
        ELSE NULL
    END AS ExpirationDateTime
FROM FinalCalculation fc;


    `);

		const subscriptionDetails = subscriptionCalculationResult.recordset[0];

		const allSubscriptionsResult = await pool.request()
			.input('userId', sql.UniqueIdentifier, userId)
			.query(`
        SELECT 
            EffectiveDuration,
            LastFrom,
            ExpiredTo,
            FirstFrom,
            Registered
        FROM Members
        WHERE UserId = @userId
    `);

		const subscriptions = allSubscriptionsResult.recordset;

		if (result.recordset.length === 0) {
			statusMessage = 'VIP subscription not found or not activated';
		} else {
			memberData = result.recordset[0];
			const memberStatus = memberData.MemberStatus;

			// Обновлённые условия для статуса подписки
			statusMessage = (() => {
				switch (memberStatus) {
					case 1:
						return 'VIP subscription is being extended'; // Продление подписки
					case 2:
						return 'VIP subscription is currently active'; // Активная подписка
					case 3:
						return 'VIP subscription has expired'; // Срок подписки истек
					default:
						return 'Unknown or inactive subscription status'; // Неизвестный или неактивный статус подписки
				}
			})();
		}
		statusMessage = statusMessage || 'Error fetching subscription status'; // Это гарантирует, что переменная всегда будет иметь значение
		res.render('addVip', {
			userId,
			userName,
			vipLevel,
			memberData: memberData || null, // Если данных нет, передаем null
			subscriptions,
			statusMessage,
			subscriptionDetails,
			pathname: req.originalUrl
		});

	} catch (error) {
		console.error('Error:', error.message);
		statusMessage = 'Error fetching subscription status';
		res.render('addVip', {
			userId,
			userName,
			statusMessage,
			pathname: req.originalUrl
		});
	} finally {
		if (pool) {
			await pool.close();
		}
	}
});

// Экспортируем дату окончания подписки в profileRoutes.js
export async function getSubscriptionDetails(userId) {
	let pool;
	try {
		pool = await sql.connect(configGradeMembersDb);

		let statusMessage; // Объявляем переменную заранее

		const subscriptionCalculationResult = await pool.request()
			.input('userId', sql.UniqueIdentifier, userId)
			.query(`
        WITH ActivationDetails AS (
    SELECT 
        UserId, 
        MAX(ExpiredTo) AS ActivationExpiration
    FROM Members
    WHERE MemberStatus = 2 AND UserId = @userId
    GROUP BY UserId
),
ExtensionDetails AS (
    SELECT 
        UserId, 
        SUM(EffectiveDuration) AS TotalExtensionDuration
    FROM Members
    WHERE MemberStatus = 1 AND UserId = @userId
    GROUP BY UserId
),
FinalCalculation AS (
    SELECT 
        a.UserId,
        a.ActivationExpiration,
        COALESCE(e.TotalExtensionDuration, 0) AS TotalExtensionDuration,
        CASE 
            WHEN e.TotalExtensionDuration IS NULL THEN a.ActivationExpiration
            ELSE DATEADD(MINUTE, e.TotalExtensionDuration, a.ActivationExpiration) -- Исправлено с DAY на MINUTE
        END AS FinalExpiration
    FROM ActivationDetails a
    LEFT JOIN ExtensionDetails e ON a.UserId = e.UserId
)
SELECT 
    fc.UserId, 
    CONCAT(
        FLOOR(DATEDIFF(MINUTE, SYSDATETIMEOFFSET(), fc.FinalExpiration) / 1440), ' days, ',
        FLOOR((DATEDIFF(MINUTE, SYSDATETIMEOFFSET(), fc.FinalExpiration) % 1440) / 60), ' hours, ',
        FLOOR(DATEDIFF(MINUTE, SYSDATETIMEOFFSET(), fc.FinalExpiration) % 60), ' minutes'
    ) AS TotalRemainingTimeFormatted,
    CASE 
        WHEN fc.FinalExpiration IS NOT NULL THEN fc.FinalExpiration
        ELSE NULL
    END AS ExpirationDateTime
FROM FinalCalculation fc;
    `);

		const subscriptionDetails = subscriptionCalculationResult.recordset[0];
		if (!subscriptionDetails) {
			statusMessage = 'No active or extended subscriptions found for this user.';
		} else {
			const expirationDate = subscriptionDetails.ExpirationDateTime;
			const remainingTime = subscriptionDetails.TotalRemainingTimeFormatted;
			statusMessage = `Subscription expires on ${expirationDate} (${remainingTime} remaining)`;
		}


		return subscriptionCalculationResult.recordset[0];
	} catch (err) {
		console.error('Error fetching subscription details:', err.message);
		throw err;
	} finally {
		if (pool) {
			await pool.close();
		}
	}
}

export default router;