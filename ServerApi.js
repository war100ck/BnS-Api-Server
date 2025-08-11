// Базовые модули Node.js
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

// Сторонние зависимости
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import sql from 'mssql';
import cors from 'cors';
import chalk from 'chalk';
import helmet from 'helmet';
import compression from 'compression';

// Конфигурации
import { config } from './config/config.js';
import { 
  configPlatformAcctDb, 
  configGradeMembersDb, 
  configBlGame, 
  configVirtualCurrencyDb, 
  configLobbyDb, 
  WH_config 
} from './config/dbConfig.js';

// Утилиты и хелперы
import { 
  convertFaction, 
  convertSex, 
  convertRace, 
  convertMoney, 
  convertJob, 
  cutStr 
} from './utils/dataTransformations.js';
import { getOwnerAccId } from './utils/characterUtils.js';
import { logRegistrationData } from './utils/logUtils.js';
import './utils/logger.js';
import { displayServerInfo, getLocalIp } from './utils/serverInfo.js';

// Роуты
import adminRoutes from './routes/adminRoutes.js';
import editCharacterRoutes from './routes/editCharacterRoutes.js';
import updateRoutes from './routes/updateRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import signupRoutes from './routes/signupRoutes.js';
import addDepositRoutes from './routes/addDepositRoutes.js';
import gameWorldRoutes from './routes/gameWorldRoutes.js';
import systemStatsRoutes from './routes/systemStatsRoutes.js';
import checkAvailabilityRoutes from './routes/checkAvailability.js';
import signinRoutes from './routes/signinRoutes.js';
import pageRoutes from './routes/pageRoutes.js';
import addBanRoutes from './routes/addBanRoutes.js';
import GradeMembersRoutes from "./routes/GradeMembersRoutes.js";
import kickUserRouter from './routes/kickUserRouter.js';
import WarehouseItemRoutes from './routes/WarehouseItemRoutes.js';
import monitoringRoutes from './routes/monitoringRoutes.js';
import gameStatsRoute from './routes/gameStatsRoute.js';
import donateRoutes from './routes/donateRoutes.js';
import { router as updateCheckerRouter } from './routes/updateCheckerRoutes.js';
import promotionsRouterStamp from './routes/routePromotionStamp.js';
import adminApiConfigRoutes from './routes/adminApiConfigRoutes.js';
import serverRestartRoute from './routes/serverRestartRoute.js';
import adminNewsRoutes from './routes/adminNewsRoutes.js';
import processManagerRoutes from './routes/processManagerRoutes.js';
import fileExplorerRoutes from './routes/fileExplorerRoutes.js';
import roleManagementRoutes from './routes/roleManagementRoute.js';
import blockRoutes from './routes/blockRoutes.js';

// Специальные модули
import discordBot from './utils/discordBot.js';

// Инициализация приложения
dotenv.config();
const app = express();
const port = config.port;
const host = config.host;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройки middleware
app.use(compression());
app.use(helmet.noSniff());

// Заголовки безопасности
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|webp|svg|woff2?)$/)) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

// CORS настройки
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Парсинг тела запроса
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройки сессии
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.SESSION_COOKIE_SECURE === 'true' }
}));

// Настройка статических файлов
const staticCacheOptions = {
  maxAge: '30d',
  immutable: true,
  setHeaders: (res, path) => {
    if (path.match(/\.(html|ejs)$/)) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/node_modules', express.static(path.join(__dirname, 'node_modules'), staticCacheOptions));
app.use(express.static(path.join(__dirname, 'public'), staticCacheOptions));
app.use('/images', express.static(path.join(__dirname, 'images'), staticCacheOptions));
app.use('/fonts', express.static(path.join(__dirname, 'public', 'fonts'), {
  maxAge: '365d',
  immutable: true
}));

// Обновление клиента
app.use('/bns-patch', express.static(path.join(__dirname, 'bns-patch')));

// Удаление завершающего слэша
app.use((req, res, next) => {
  if (req.path.length > 1 && req.path.endsWith('/')) {
    const newPath = req.path.slice(0, -1) + req.url.slice(req.path.length);
    return res.redirect(301, newPath);
  }
  next();
});

// Подключение маршрутов
const rootRoutes = [
  adminRoutes,
  editCharacterRoutes,
  updateRoutes,
  profileRoutes,
  signupRoutes,
  addDepositRoutes,
  gameWorldRoutes,
  systemStatsRoutes,
  pageRoutes,
  addBanRoutes,
  GradeMembersRoutes,
  WarehouseItemRoutes,
  monitoringRoutes,
  gameStatsRoute,
  donateRoutes,
  updateCheckerRouter,
  promotionsRouterStamp,
  adminApiConfigRoutes,
  adminNewsRoutes,
  processManagerRoutes,
  fileExplorerRoutes,
  roleManagementRoutes,
  blockRoutes
];

// Другие маршруты с определенными префиксами
const prefixedRoutes = [
  { path: '/check-availability', router: checkAvailabilityRoutes },
  { path: '/signin', router: signinRoutes }
];

// Статические файлы
const staticRoutes = [
  { path: '/in-game-web', dir: path.join(__dirname, './views/in-game-web') }
];

// Маршруты без префикса (используют путь из самого маршрута)
const noPrefixRoutes = [
  kickUserRouter,
  serverRestartRoute
];

// Подключение всех маршрутов
rootRoutes.forEach(route => app.use('/', route));
prefixedRoutes.forEach(route => app.use(route.path, route.router));
staticRoutes.forEach(route => app.use(route.path, express.static(route.dir)));
noPrefixRoutes.forEach(route => app.use(route));

// Middleware для добавления UserName
app.use((req, res, next) => {
  const UserName = req.query.userName || req.session.UserName;
  res.locals.UserName = UserName;
  next();
});

// Основные маршруты
app.get('/api/current-time', (req, res) => {
  res.json({ currentTime: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.render('index', { user: req.session.user || null });
});

app.get('/admin/add-vip', (req, res) => {
  res.render('addVip', {
    pathname: req.originalUrl,
    userId: req.query.userId
  });
});

// Обработчик 404
app.use((req, res) => {
  res.status(404).render('404');
});

// Глобальный обработчик ошибок (500 и любые другие)
app.use((err, req, res, next) => {
  console.error('[Express error handler]', err);
  res.status(err.status || 500);
  res.render('error', { error: err });
});


// Запуск сервера
app.listen(port, host, () => {
  displayServerInfo(port, host); // Теперь функция принимает параметры
  console.log(chalk.bgGreen(`B&S Api Server is running on ${host}:${port} (Local IP: ${chalk.blue(`${getLocalIp()}:${port}`)}`));
});