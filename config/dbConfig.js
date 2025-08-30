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
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

// Настройки подключения к базе данных GradeMembersDb
const configGradeMembersDb = {
  user: process.env.GRADE_MEMBERS_DB_USER,
  password: process.env.GRADE_MEMBERS_DB_PASSWORD,
  server: process.env.GRADE_MEMBERS_DB_SERVER,
  database: process.env.GRADE_MEMBERS_DB_DATABASE,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

const configBanDb = {
  user: process.env.BAN_DB_USER,
  password: process.env.BAN_DB_PASSWORD,
  server: process.env.BAN_DB_SERVER,
  database: process.env.BAN_DB_DATABASE,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

// Настройки подключения к базе данных BlGame
const configBlGame = {
  user: process.env.BLGAME_DB_USER,
  password: process.env.BLGAME_DB_PASSWORD,
  server: process.env.BLGAME_DB_SERVER,
  database: process.env.BLGAME_DB_DATABASE,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

// Настройки подключения к базе данных VirtualCurrencyDb
const configVirtualCurrencyDb = {
  user: process.env.VIRTUAL_CURRENCY_DB_USER,
  password: process.env.VIRTUAL_CURRENCY_DB_PASSWORD,
  server: process.env.VIRTUAL_CURRENCY_DB_SERVER,
  database: process.env.VIRTUAL_CURRENCY_DB_DATABASE,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

// Настройки подключения к базе данных LobbyDB
const configLobbyDb = {
  user: process.env.LOBBY_DB_USER,
  password: process.env.LOBBY_DB_PASSWORD,
  server: process.env.LOBBY_DB_SERVER,
  database: process.env.LOBBY_DB_DATABASE,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

// Настройки подключения к WH базе данных
const WH_config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

// Настройки подключения к базе данных GameWarehouseDB
const configGameWarehouseDB = {
  user: process.env.GAME_WAREHOUSE_DB_USER,
  password: process.env.GAME_WAREHOUSE_DB_PASSWORD,
  server: process.env.GAME_WAREHOUSE_DB_SERVER,
  database: process.env.GAME_WAREHOUSE_DB_DATABASE,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

// Настройки подключения к базе данных LevelDb
const configLevelDb = {
  user: process.env.LEVEL_DB_USER,
  password: process.env.LEVEL_DB_PASSWORD,
  server: process.env.LEVEL_DB_SERVER,
  database: process.env.LEVEL_DB_DATABASE,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

// Настройки подключения к базе данных GameItemsDB
const configGameItemsDB = {
  user: process.env.GAME_ITEMS_DB_USER,
  password: process.env.GAME_ITEMS_DB_PASSWORD,
  server: process.env.GAME_ITEMS_DB_SERVER,
  database: process.env.GAME_ITEMS_DB_DATABASE,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

// Настройки подключения к базе данных DonationsDb
const configDonationsDb = {
  user: process.env.DONATIONS_DB_USER,
  password: process.env.DONATIONS_DB_PASSWORD,
  server: process.env.DONATIONS_DB_SERVER,
  database: process.env.DONATIONS_DB_DATABASE,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

// Настройки подключения к базе данных PromotionStampDb
const configPromotionStampDb = {
  user: process.env.PROMOTION_STAMP_DB_USER,
  password: process.env.PROMOTION_STAMP_DB_PASSWORD,
  server: process.env.PROMOTION_STAMP_DB_SERVER,
  database: process.env.PROMOTION_STAMP_DB_DATABASE,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

// Настройки подключения к базе данных RoleDb
const configRoleDb = {
  user: process.env.ROLE_DB_USER,
  password: process.env.ROLE_DB_PASSWORD,
  server: process.env.ROLE_DB_SERVER,
  database: process.env.ROLE_DB_DATABASE,
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

// Настройки подключения к базе данных CouponSystemDB
const configCouponSystemDB = {
  user: process.env.COUPON_SYSTEM_DB_USER,
  password: process.env.COUPON_SYSTEM_DB_PASSWORD,
  server: process.env.COUPON_SYSTEM_DB_SERVER,
  database: process.env.COUPON_SYSTEM_DB_DATABASE || 'CouponSystemDB',
  pool: {
    max: 20,
    min: 1,
    idleTimeoutMillis: 30000
  },
  options: {
    secure: true,
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};


export {
  configPlatformAcctDb,
  configGradeMembersDb,
  configBlGame,
  configVirtualCurrencyDb,
  configLobbyDb,
  WH_config,
  configBanDb,
  configGameWarehouseDB,
  configLevelDb,
  configGameItemsDB,
  configDonationsDb,
  configPromotionStampDb,
  configRoleDb,
  configCouponSystemDB
};