// config/dbConfig.js
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// Настройки подключения к базе данных PlatformAcctDb
const configPlatformAcctDb = {
  user: process.env.PLATFORM_ACCT_DB_USER,
  password: process.env.PLATFORM_ACCT_DB_PASSWORD,
  server: process.env.PLATFORM_ACCT_DB_SERVER,
  database: process.env.PLATFORM_ACCT_DB_DATABASE,
  options: {
    encrypt: false, // Отключаем шифрование
    trustServerCertificate: true, // Доверять самоподписанным сертификатам
    enableArithAbort: true // Явно устанавливаем значение для предотвращения предупреждения
  },
};

// Настройки подключения к базе данных BlGame
const configBlGame = {
  user: process.env.BLGAME_DB_USER,
  password: process.env.BLGAME_DB_PASSWORD,
  server: process.env.BLGAME_DB_SERVER,
  database: process.env.BLGAME_DB_DATABASE,
  options: {
    encrypt: false, // Отключаем шифрование
    trustServerCertificate: true, // Доверять самоподписанным сертификатам
    enableArithAbort: true // Явно устанавливаем значение для предотвращения предупреждения
  },
};

// Настройки подключения к базе данных VirtualCurrencyDb
const configVirtualCurrencyDb = {
  user: process.env.VIRTUAL_CURRENCY_DB_USER,
  password: process.env.VIRTUAL_CURRENCY_DB_PASSWORD,
  server: process.env.VIRTUAL_CURRENCY_DB_SERVER,
  database: process.env.VIRTUAL_CURRENCY_DB_DATABASE,
  options: {
    encrypt: false, // Отключаем шифрование
    trustServerCertificate: true, // Доверять самоподписанным сертификатам
    enableArithAbort: true // Явно устанавливаем значение для предотвращения предупреждения
  },
};

// Настройки подключения к базе данных LobbyDB
const configLobbyDb = {
  user: process.env.LOBBY_DB_USER,
  password: process.env.LOBBY_DB_PASSWORD,
  server: process.env.LOBBY_DB_SERVER,
  database: process.env.LOBBY_DB_DATABASE, // Проверьте, что здесь указана правильная база данных
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
};

// Настройки подключения к WH базе данных
const WH_config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

export {
  configPlatformAcctDb,
  configBlGame,
  configVirtualCurrencyDb,
  configLobbyDb,
  WH_config,
};
