// discordBot.js
import { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, version } from 'discord.js';
import axios from 'axios';
import xml2js from 'xml2js';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../config/discordSettings.json');

class DiscordBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        this.botEnabled = false;
        this.updateInterval = null;
        this.loggingEnabled = process.env.LOG_TO_CONSOLE === 'true';
        this.debugLogsEnabled = process.env.DEBUG_LOGS === 'true';
        this.statusChannelId = null;
        this.autoUpdates = false;
        this.updateIntervalMinutes = 5;
        this.logoPath = path.join(__dirname, '../public/images/logo/logo.webp');

        this.loadConfig();

        setTimeout(() => {
            if (this.shouldBotStart()) {
                this.init();
            } else {
                this.log('Bot is disabled in config or .env, skipping initialization');
            }
        }, 100);
    }

    shouldBotStart() {
        if (process.env.BOT_ENABLED === 'false') {
            return false;
        }
        
        const envEnabled = process.env.BOT_ENABLED !== 'false';
        const configEnabled = this.botEnabled;
        
        return envEnabled && configEnabled;
    }

    log(message) {
        if (this.loggingEnabled) {
            const prefix = chalk.cyan('[DISCORD BOT]');
            console.log(`${prefix} ${message}`);
        }
    }

    debug(message) {
        if (this.debugLogsEnabled) {
            const prefix = chalk.magenta('[DISCORD BOT DEBUG]');
            console.log(`${prefix} ${message}`);
        }
    }

    error(message) {
        if (this.loggingEnabled) {
            const prefix = chalk.red('[DISCORD BOT ERROR]');
            console.error(`${prefix} ${message}`);
        }
    }

    loadConfig() {
        try {
            if (!fs.existsSync(configPath)) {
                this.saveConfig({
                    botToken: '',
                    statusChannelId: '',
                    autoUpdates: false,
                    updateInterval: 5,
                    botEnabled: false
                });
                return;
            }

            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            this.statusChannelId = config.statusChannelId || null;
            this.autoUpdates = config.autoUpdates || false;
            this.updateIntervalMinutes = config.updateInterval || 5;
            this.botEnabled = config.botEnabled || false;

            if (config.botToken) {
                process.env.DISCORD_BOT_TOKEN = config.botToken;
            }
        } catch (err) {
            this.error(`Error loading config: ${err.message}`);
            this.statusChannelId = null;
            this.autoUpdates = false;
            this.botEnabled = false;
            this.updateIntervalMinutes = 5;
        }
    }

    saveConfig(config) {
        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            return true;
        } catch (err) {
            this.error(`Error saving config: ${err.message}`);
            return false;
        }
    }

    async loginBot() {
        try {
            if (!process.env.DISCORD_BOT_TOKEN) {
                throw new Error('Bot token not set');
            }
            
            await this.client.login(process.env.DISCORD_BOT_TOKEN);
            this.botEnabled = true;
            this.log(chalk.green('Bot logged in successfully'));
            return true;
        } catch (err) {
            this.error(`Login error: ${err.message}`);
            this.botEnabled = false;
            return false;
        }
    }

    async logoutBot() {
        try {
            this.clearUpdateInterval();
            if (this.client.isReady()) {
                await this.client.destroy();
            }
            this.botEnabled = false;
            this.log('Bot logged out successfully');
            return true;
        } catch (err) {
            this.error(`Logout error: ${err.message}`);
            return false;
        }
    }

    clearUpdateInterval() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
            this.debug('Auto-update interval cleared');
        }
    }

    startAutoUpdates() {
        this.clearUpdateInterval();
        
        if (this.autoUpdates && this.botEnabled && this.client.isReady()) {
            const intervalMs = this.updateIntervalMinutes * 60 * 1000;
            
            this.updateInterval = setInterval(() => {
                this.debug(`Running scheduled auto-update (interval: ${this.updateIntervalMinutes} minutes)`);
                this.sendAutoUpdate().catch(err => {
                    this.error(`Error during auto-update: ${err.message}`);
                });
            }, intervalMs);
            
            this.debug(`Auto-update started with ${this.updateIntervalMinutes} minutes interval`);
        }
    }

    cleanUsername(username) {
        if (!username) return 'N/A';
        return username.replace(/\s*\(.*?\)\s*/g, '').trim() || 'N/A';
    }

    async initialize() {
        try {
            if (!this.client.isReady()) return;

            const commands = [{
                name: 'online',
                description: 'Show online players count'
            }];

            await this.client.application.commands.set(commands);
            this.debug('Slash commands registered');
        } catch (err) {
            this.error(`Error registering commands: ${err.message}`);
        }
    }

    async getPresenceSrvVersion() {
        try {
            const targetUrl = 'http://127.0.0.1:6605/spawned/PresenceSrv.1.$/users';
            const response = await axios.get(targetUrl, { timeout: 5000 });
            return response.status === 200 ? '$' : null;
        } catch (error) {
            this.error(`Error fetching PresenceSrv version: ${error.message}`);
            return null;
        }
    }

    async getOnlinePlayers() {
        try {
            const currentVersion = await this.getPresenceSrvVersion();
            if (!currentVersion) return { error: 'PresenceSrv not running', onlineCount: 0, players: [] };

            const targetUrl = `http://127.0.0.1:6605/spawned/PresenceSrv.1.${currentVersion}/users`;
            const response = await axios.get(targetUrl, { timeout: 5000 });

            if (response.data === '{}') {
                return { onlineCount: 0, players: [], error: null };
            }

            if (response.headers['content-type'].includes('xml')) {
                const parser = new xml2js.Parser({ explicitArray: false });
                const jsonData = await parser.parseStringPromise(response.data);

                if (!jsonData?.Info?.Object) {
                    return { onlineCount: 0, players: [], error: null };
                }

                const objectData = jsonData?.Info?.Object || [];
                const normalizedObjectData = Array.isArray(objectData) ? objectData : [objectData];
                const playersMap = new Map();

                normalizedObjectData.forEach(({ Data: user }) => {
                    if (!user || !user.UserId) return;

                    if (playersMap.has(user.UserId)) return;

                    const logins = user?.Logins?.Login || [];
                    const pcnameData = user?.AppDataSet?.AppData?.find(appData => appData.Data?.pcname)?.Data?.pcname;
                    const pcname = typeof pcnameData === 'object' ? pcnameData._ : pcnameData || 'N/A';

                    if (logins.length > 0) {
                        playersMap.set(user.UserId, {
                            UserName: user.UserName || 'N/A',
                            GameCode: logins[0]?.GameCode || 'N/A',
                            PcName: pcname,
                            LoginTime: logins[0]?.LoginTime || 'N/A',
                            Status: user.Status || 'offline'
                        });
                    }
                });

                const players = Array.from(playersMap.values())
                    .filter(player => player.Status === 'online');

                return {
                    onlineCount: players.length,
                    players: players,
                    error: null
                };
            }
            return { error: 'Invalid data format', onlineCount: 0, players: [] };
        } catch (error) {
            this.error(`Error getting online players: ${error.message}`);
            return { error: error.message, onlineCount: 0, players: [] };
        }
    }

    async sendAutoUpdate() {
        if (!this.statusChannelId || !this.botEnabled || !this.client.isReady()) return;
        
        try {
            const channel = await this.client.channels.fetch(this.statusChannelId);
            if (!channel) {
                this.error('Status channel not found');
                return;
            }

            const { onlineCount, players, error } = await this.getOnlinePlayers();
            if (error) {
                await channel.send(`❌ Error getting data: ${error}`);
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle('🎮 Blade & Soul Online Status')
                .setThumbnail('attachment://logo.webp')
                .setTimestamp()
                .setFooter({ 
                    text: `Automatic update (every ${this.updateIntervalMinutes} min)`, 
                    iconURL: 'attachment://logo.webp' 
                });

            if (onlineCount > 0) {
                embed.setDescription(`🟢 Total online: ${onlineCount} players`);
            } else {
                embed.setDescription('🌙 The server is currently empty');
            }

            const logoAttachment = new AttachmentBuilder(this.logoPath);
            await channel.send({ embeds: [embed], files: [logoAttachment] });
            this.debug('Auto-update sent successfully');
        } catch (err) {
            this.error(`Error sending auto-update: ${err.message}`);
        }
    }

    init() {
        if (!this.shouldBotStart()) {
            this.log('Bot initialization skipped - disabled in config');
            return;
        }

        const discordJsVersion = version;
        this.log(`Using discord.js version: ${discordJsVersion}`);
        
        if (discordJsVersion.startsWith('14.')) {
            this.client.on('clientReady', () => {
                this.log(`Logged in as ${this.client.user.tag}`);
                this.initialize();
                this.startAutoUpdates();
            });
        } else {
            this.client.on('ready', () => {
                this.log(`Logged in as ${this.client.user.tag}`);
                this.initialize();
                this.startAutoUpdates();
            });
        }

        this.client.on('interactionCreate', async interaction => {
            if (!interaction.isCommand()) return;

            try {
                if (interaction.commandName === 'online') {
                    this.debug(`Received /online command from ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);
                    
                    await interaction.deferReply();
                    
                    const { onlineCount, players, error } = await this.getOnlinePlayers();
                    if (error) {
                        this.error(`Error getting online players: ${error}`);
                        await interaction.editReply({ content: `❌ Error: ${error}` });
                        return;
                    }

                    this.debug(`Successfully fetched ${onlineCount} online players for ${interaction.user.tag}`);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x3498DB)
                        .setTitle('🎮 Blade & Soul Online Status')
                        .setThumbnail('attachment://logo.webp')
                        .setTimestamp();

                    if (onlineCount > 0) {
                        embed.setDescription(`🟢 Total online: ${onlineCount} players`);
                    } else {
                        embed.setDescription('🌙 The server is currently empty');
                    }

                    const logoAttachment = new AttachmentBuilder(this.logoPath);
                    await interaction.editReply({ embeds: [embed], files: [logoAttachment] });
                    
                    this.debug(`Successfully replied to /online command for ${interaction.user.tag}`);
                }
            } catch (error) {
                if (error.code === 10062) {
                    this.debug(`Interaction expired (took too long to respond) for command /online from ${interaction.user.tag}`);
                } else {
                    this.error(`Error handling interaction: ${error.message}`);
                    if (interaction.isRepliable()) {
                        await interaction.reply({ 
                            content: '❌ An error occurred while processing the command', 
                            ephemeral: true 
                        }).catch(e => this.error(`Failed to send error reply: ${e.message}`));
                    }
                }
            }
        });

        this.loginBot().catch(err => {
            this.error(`Failed to login: ${err.message}`);
        });
    }

    updateSettings({ token, channelId, autoUpdates, updateInterval, enabled }) {
        const newConfig = {
            botToken: token || process.env.DISCORD_BOT_TOKEN,
            statusChannelId: channelId,
            autoUpdates: autoUpdates,
            updateInterval: updateInterval || 5,
            botEnabled: enabled
        };
        
        if (!this.saveConfig(newConfig)) {
            return false;
        }
        
        if (token && token !== process.env.DISCORD_BOT_TOKEN) {
            process.env.DISCORD_BOT_TOKEN = token;
        }
        
        this.statusChannelId = channelId;
        this.autoUpdates = autoUpdates;
        this.updateIntervalMinutes = updateInterval || 5;
        
        if (enabled !== this.botEnabled) {
            this.botEnabled = enabled;
            if (enabled) {
                this.init();
            } else {
                this.logoutBot();
            }
        } else if (enabled && this.botEnabled) {
            this.startAutoUpdates();
        }
        
        return true;
    }
}

const discordBot = new DiscordBot();
export default discordBot;