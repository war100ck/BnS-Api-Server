// config/config.js

export const config = {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    logToConsole: process.env.LOG_TO_CONSOLE === 'true'
};