// utils/configManager.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../config/discordSettings.json');

// Создаем конфиг файл, если его нет
const ensureConfigExists = () => {
    if (!fs.existsSync(configPath)) {
        const defaultConfig = {
            botToken: '',
            statusChannelId: '',
            autoUpdates: false
        };
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    }
};

// Чтение конфига
export const readConfig = () => {
    ensureConfigExists();
    try {
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading config file:', err);
        return null;
    }
};

// Сохранение конфига
export const saveConfig = (config) => {
    ensureConfigExists();
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (err) {
        console.error('Error saving config file:', err);
        return false;
    }
};