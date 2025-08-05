import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupDir = path.join(__dirname, '..', 'bk_env');

const parseEnv = (content) => {
    const result = {
        sections: [],
        raw: content
    };

    const lines = content.split('\n');
    let currentSection = null;
    let currentSubsection = null;
    let lastComment = null;
    let inSubsection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('# =====')) {
            const titleLine = lines[i + 1]?.trim();
            if (titleLine?.startsWith('#')) {
                currentSection = {
                    title: titleLine.replace(/#/g, '').trim(),
                    subsections: []
                };
                result.sections.push(currentSection);
                currentSubsection = null;
                inSubsection = false;
                i++;
            }
        } else if (line.startsWith('# ----') && currentSection) {
            inSubsection = true;
            const titleLine = lines[i + 1]?.trim();

            if (titleLine?.startsWith('#')) {
                currentSubsection = {
                    title: titleLine.replace(/#/g, '').trim(),
                    variables: [],
                    description: lastComment
                };
                currentSection.subsections.push(currentSubsection);
                lastComment = null;
                i++;
            }
        } else if (line.startsWith('#') && !line.startsWith('# =') && !line.startsWith('# -')) {
            if (inSubsection && !currentSubsection) {
                currentSubsection = {
                    title: '',
                    variables: [],
                    description: lastComment
                };
                currentSection.subsections.push(currentSubsection);
                lastComment = null;
            }

            lastComment = (lastComment ? lastComment + '\n' : '') + line.replace(/#/g, '').trim();
        } else if (line.includes('=') && (currentSubsection || (currentSection && !inSubsection))) {
            if (!currentSubsection && currentSection) {
                currentSubsection = {
                    title: 'General Settings',
                    variables: [],
                    description: null
                };
                currentSection.subsections.push(currentSubsection);
            }

            const [name, ...valueParts] = line.split('=');
            const value = valueParts.join('=').trim();

            currentSubsection.variables.push({
                name: name.trim(),
                value,
                description: lastComment,
                isBoolean: ['true', 'false'].includes(value.toLowerCase())
            });
            lastComment = null;
        }
    }

    return result;
};

const buildEnv = (data) => {
    let content = '';

    data.sections.forEach(section => {
        content += `# =============================================\n`;
        content += `# ${section.title}\n`;
        content += `# =============================================\n\n`;

        section.subsections.forEach(subsection => {
            content += `# ----------------------------\n`;
            content += `# ${subsection.title}\n`;
            content += `# ----------------------------\n\n`;

            if (subsection.description) {
                content += `# ${subsection.description.replace(/\n/g, '\n# ')}\n\n`;
            }

            subsection.variables.forEach(variable => {
                if (variable.description) {
                    content += `# ${variable.description.replace(/\n/g, '\n# ')}\n`;
                }
                content += `${variable.name}=${variable.value}\n\n`;
            });
        });
    });

    return content;
};

router.get('/admin/apiconfig', isAdmin, (req, res) => {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        const logPath = path.join(__dirname, '..', 'Logs', 'registration_log.txt');

        const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const parsedEnv = parseEnv(envContent);

        let logContent = '';
        if (fs.existsSync(logPath)) {
            logContent = fs.readFileSync(logPath, 'utf-8');
        }

        // Получаем сообщения из сессии и сразу удаляем их
        const success = req.session.success;
        const error = req.session.error;
        delete req.session.success;
        delete req.session.error;

        res.render('configApi', {
            title: 'API Configuration',
            pathname: req.originalUrl,
            envData: parsedEnv,
            logContent,
            success,
            error,
            rawMode: req.query.raw === 'true'
        });
    } catch (err) {
        console.error('Error reading config files:', err);
        res.status(500).send('Error reading configuration files');
    }
});

router.post('/admin/apiconfig/update', isAdmin, (req, res) => {
    try {
        const envPath = path.join(__dirname, '..', '.env');
        const rawContent = req.body.raw_content;

        if (rawContent) {
            // Режим raw-редактирования
            const backupPath = path.join(backupDir, `.env.backup.${Date.now()}`);
            // Проверяем и создаем папку bk_env, если её нет
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            fs.writeFileSync(backupPath, fs.readFileSync(envPath, 'utf-8'));
            fs.writeFileSync(envPath, rawContent);
        } else {
            // Обычный режим редактирования
            const envContent = fs.readFileSync(envPath, 'utf-8');
            const parsedEnv = parseEnv(envContent);

            parsedEnv.sections.forEach(section => {
                section.subsections.forEach(subsection => {
                    subsection.variables.forEach(variable => {
                        if (req.body[`env_${variable.name}`] !== undefined) {
                            variable.value = req.body[`env_${variable.name}`];
                        }
                    });
                });
            });

            const backupPath = path.join(backupDir, `.env.backup.${Date.now()}`);
            // Проверяем и создаем папку bk_env, если её нет
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            fs.writeFileSync(backupPath, envContent);
            fs.writeFileSync(envPath, buildEnv(parsedEnv));
        }

        // Сохраняем сообщение в сессии и делаем чистый редирект
        req.session.success = 'Configuration updated. Server Api restart required. Original .env backup saved in "bk_env" directory.';
        res.redirect('/admin/apiconfig');
    } catch (err) {
        console.error('Error updating config:', err);
        req.session.error = 'Failed to update configuration';
        res.redirect('/admin/apiconfig');
    }
});

router.post('/admin/apiconfig/clearlogs', isAdmin, (req, res) => {
    try {
        const logPath = path.join(__dirname, '..', 'Logs', 'registration_log.txt');

        if (fs.existsSync(logPath)) {
            fs.writeFileSync(logPath, '');
        }

        req.session.success = 'Logs cleared successfully';
        res.redirect('/admin/apiconfig');
    } catch (err) {
        console.error('Error clearing logs:', err);
        req.session.error = 'Failed to clear logs';
        res.redirect('/admin/apiconfig');
    }
});

router.get('/admin/apiconfig/refreshlogs', isAdmin, (req, res) => {
    try {
        const logPath = path.join(__dirname, '..', 'Logs', 'registration_log.txt');
        let logContent = '';

        if (fs.existsSync(logPath)) {
            logContent = fs.readFileSync(logPath, 'utf-8');
        }

        res.send(logContent || 'No log entries');
    } catch (err) {
        console.error('Error reading logs:', err);
        res.status(500).send('Error reading log file');
    }
});

export default router;