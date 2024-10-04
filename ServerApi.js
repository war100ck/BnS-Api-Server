import dotenv from 'dotenv';
import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { config } from './config/config.js';
import { convertFaction, convertSex, convertRace, convertMoney, convertJob, cutStr } from './utils/dataTransformations.js';
import { getOwnerAccId } from './utils/characterUtils.js';
import { logRegistrationData } from './utils/logUtils.js';
import { configPlatformAcctDb, configBlGame, configVirtualCurrencyDb, configLobbyDb, WH_config } from './config/dbConfig.js';
import adminRoutes from './routes/adminRoutes.js';
import editCharacterRoutes from './routes/editCharacterRoutes.js';
import updateRoutes from './routes/updateRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import signupRoutes from './routes/signupRoutes.js';
import addDepositRoutes from './routes/addDepositRoutes.js';
import gameWorldRoutes from './routes/gameWorldRoutes.js';
import systemStatsRoutes from './routes/systemStatsRoutes.js';
import checkAvailabilityRoutes from './routes/checkAvailability.js';
import signinRoutes from './routes/signin.js';

dotenv.config();

const app = express();
const port = config.port;
const host = config.host;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Подключение маршрутов
app.use('/', adminRoutes);
app.use('/', editCharacterRoutes);
app.use('/', updateRoutes);
app.use('/', profileRoutes);
app.use('/', signupRoutes);
app.use('/', addDepositRoutes);
app.use('/', gameWorldRoutes);
app.use('/', systemStatsRoutes);
app.use('/check-availability', checkAvailabilityRoutes);
app.use('/signin', signinRoutes);

// Проверка переменной окружения для логирования в консоль
const logToConsole = process.env.LOG_TO_CONSOLE === 'true';

// Инициализация пула соединений для каждой базы данных
let poolPlatformAcctDb;
let poolBlGame;
let poolVirtualCurrencyDb;
let poolWH;
let poolLobbyDb; // Переменная для LobbyDB

async function initializePools() {
    try {
        poolPlatformAcctDb = await sql.connect(configPlatformAcctDb);
        console.log(chalk.green('Connection to PlatformAcctDb established successfully.'));

        poolBlGame = await sql.connect(configBlGame);
        console.log(chalk.green('Connection to BlGame established successfully.'));

        poolVirtualCurrencyDb = await sql.connect(configVirtualCurrencyDb);
        console.log(chalk.green('Connection to VirtualCurrencyDb established successfully.'));

        poolWH = await sql.connect(WH_config);
        console.log(chalk.green('Connection to WH established successfully.'));

        poolLobbyDb = await sql.connect(configLobbyDb); // Инициализация пула для LobbyDB
        console.log(chalk.green('Connection to LobbyDb established successfully.'));

        poolGame = await sql.connect(Game_config); // Инициализация пула для базы данных Game
        console.log(chalk.green('Connection to Game established successfully.'));
    } catch (err) {
        console.error(chalk.red('Error during connection pool initialization:', err));
        throw err; // Пробрасываем ошибку для обработки на более высоком уровне
    }
}

// Вызов функции инициализации
// initializePools()
//     .then(() => {
//         console.log('All connection pools have been successfully initialized');
//         // Здесь можно добавить дополнительную логику, например, проверку доступности баз данных
//     })
//     .catch(err => {
//         console.error('Error during connection pool initialization:', err);
//         process.exit(1); // Прекращаем работу приложения, если инициализация пула не удалась
//     });

// Маршрут для главной страницы
app.get('/', (req, res) => {
    res.render('index'); // Рендерим файл 'index.ejs' из папки 'views'
});

// Запуск сервера
app.listen(port, host, () => {
    console.log(chalk.bgGreen(`Server is running on ${host}:${port}`));
});
