import express from 'express';
import { Router } from 'express';
import axios from 'axios';
import chalk from 'chalk';
import { parseStringPromise } from 'xml2js';
import sql from 'mssql';
import { configRoleDb, configPlatformAcctDb } from '../config/dbConfig.js';
import { isAdmin } from '../middleware/adminMiddleware.js';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

// Базовый URL без версии
const ROLE_SRV_BASE = 'http://127.0.0.1:6605/spawned/RoleSrv';

// Logging settings from .env
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE === 'true';

// Logging configuration
const log = {
    error: (message) => LOG_TO_CONSOLE && console.log(chalk.red(`[ERROR] ${message}`)),
    adminAction: (action, user, target) => {
        if (!LOG_TO_CONSOLE) return;
        const userInfo = `${chalk.magenta(user.username)} (${chalk.cyan(`ID:${user.id}`)})`;
        const targetInfo = target 
            ? ` -> ${chalk.yellow(target.type)} ${chalk.cyan(target.id)}` + 
              (target.name ? ` (${chalk.green(target.name)})` : '')
            : '';
        console.log(
            chalk.bgGreen.white.bold('[ADMIN]') + 
            ' ' + 
            chalk.magenta(`${userInfo} ${action}${targetInfo}`)
        );
    },
    roleStatusChange: (action, userId, roleId, roleName, details = '') => {
        if (!LOG_TO_CONSOLE) return;
        const roleInfo = `${chalk.cyan(`UserID:${userId}`)} Role ${chalk.cyan(roleId)} (${chalk.yellow(roleName)})`;
        console.log(
            chalk.green(`[ROLE] `) +
            `${action} ` +
            roleInfo +
            (details ? ` | ${chalk.blue(details)}` : '')
        );
    }
};

// Функция для получения текущей версии RoleSrv
async function getRoleSrvVersion() {
    try {
        const response = await axios.get('http://127.0.0.1:6605/apps-state', { timeout: 3000 });
        const xmlData = response.data;
        const parsedData = await parseStringPromise(xmlData);

        const apps = parsedData?.Info?.Apps?.[0]?.App;
        let version = null;

        for (const app of apps) {
            if (app?.AppName?.[0] === "RoleSrv") {
                const instances = app?.Instances?.[0]?.Instance;
                if (instances && instances.length > 0) {
                    version = instances[0]?.Epoch?.[0];
                    break;
                }
            }
        }

        if (version) return version;

        const fallbackResponse = await axios.get(`${ROLE_SRV_BASE}.1.$/`, { timeout: 5000 });
        const finalUrl = fallbackResponse.request.res.responseUrl || fallbackResponse.config.url;
        const versionMatch = finalUrl.match(/RoleSrv\.1\.(\d+)/);
        
        if (versionMatch) return versionMatch[1];

        throw new Error('Version not found in both methods');
    } catch (error) {
        if (error.code === 'ECONNREFUSED') return 'Service Stopped';
        return 'Unknown';
    }
}

// Получение ролей пользователей и их имен
async function getUserRolesWithNames() {
    let rolePool, acctPool;
    try {
        rolePool = await sql.connect(configRoleDb);
        acctPool = await sql.connect(configPlatformAcctDb);

        const roleResult = await rolePool.request()
            .query(`
                SELECT ur.UserId, ur.AppGroupId, ur.RoleId, ur.Registered, r.RoleName
                FROM [RoleDb].[dbo].[UserRoles] ur
                JOIN [RoleDb].[dbo].[Roles] r ON ur.RoleId = r.RoleId
            `);

        const userIds = [...new Set(roleResult.recordset.map(row => `'${row.UserId}'`))].join(',');

        let userNames = {};
        if (userIds) {
            const acctResult = await acctPool.request()
                .query(`
                    SELECT UserId, UserName
                    FROM [PlatformAcctDb].[dbo].[Users]
                    WHERE UserId IN (${userIds})
                `);
            userNames = Object.fromEntries(
                acctResult.recordset.map(row => [row.UserId, row.UserName || 'Unknown'])
            );
        }

        const userRoles = roleResult.recordset.reduce((acc, row) => {
            const userId = row.UserId;
            if (!acc[userId]) {
                acc[userId] = {
                    UserId: userId,
                    UserName: userNames[userId] || 'Unknown',
                    AppGroupId: row.AppGroupId,
                    Roles: []
                };
            }
            acc[userId].Roles.push({
                RoleId: row.RoleId,
                RoleName: row.RoleName,
                Registered: row.Registered
            });
            return acc;
        }, {});

        return Object.values(userRoles);
    } catch (error) {
        log.error(`Database connection error: ${error.message}`);
        return [];
    } finally {
        if (rolePool) await rolePool.close();
        if (acctPool) await acctPool.close();
    }
}

// Маршруты с префиксом /admin/role-management
router.get('/admin/role-management/add_user_role', isAdmin, async (req, res) => {
    const { userId, userCenter, appGroupId, roleId } = req.query;
    const currentUser = req.session?.user || { username: 'Unknown', id: 'N/A' };

    if (!userId || !userCenter || !appGroupId || !roleId) {
        return res.status(400).json({
            error: 'Missing required parameters',
            required: ['userId', 'userCenter', 'appGroupId', 'roleId']
        });
    }

    try {
        const currentVersion = await getRoleSrvVersion();
        if (currentVersion === 'Service Stopped' || currentVersion === 'Unknown') {
            throw new Error('Could not determine RoleSrv version - service may be stopped');
        }

        const ROLE_SRV_URL = `${ROLE_SRV_BASE}.1.${currentVersion}/role`;
        
        const response = await axios.get(`${ROLE_SRV_URL}/add_user_role`, {
            params: { userId, userCenter, appGroupId, roleId },
            headers: { 'Accept': 'text/xml', 'Content-Type': 'text/xml' }
        });

        log.roleStatusChange(
            'Added role',
            userId,
            roleId,
            (await getUserRolesWithNames()).find(u => u.UserId === userId)?.Roles.find(r => r.RoleId === parseInt(roleId))?.RoleName || 'Unknown',
            `AppGroupID: ${appGroupId}`
        );
        log.adminAction(
            'added role',
            currentUser,
            {
                type: 'role',
                id: roleId,
                name: `for UserID: ${userId}`
            }
        );

        res.status(200).json({
            status: 'success',
            message: 'Role added successfully',
            data: response.data,
            serviceVersion: currentVersion
        });
    } catch (error) {
        log.error(`Failed to add role for UserID:${userId}, RoleID:${roleId}: ${error.message}`);
        res.status(500).json({
            error: 'Failed to add role',
            details: error.message,
            suggestion: error.message.includes('stopped') ? 
                'RoleSrv service might be stopped. Please check service status.' : 
                'Please try again later.'
        });
    }
});

router.get('/admin/role-management/remove_user_role', isAdmin, async (req, res) => {
    const { userId, userCenter, appGroupId, roleId } = req.query;
    const currentUser = req.session?.user || { username: 'Unknown', id: 'N/A' };

    if (!userId || !userCenter || !appGroupId || !roleId) {
        return res.status(400).json({
            error: 'Missing required parameters',
            required: ['userId', 'userCenter', 'appGroupId', 'roleId']
        });
    }

    try {
        const currentVersion = await getRoleSrvVersion();
        if (currentVersion === 'Service Stopped' || currentVersion === 'Unknown') {
            throw new Error('Could not determine RoleSrv version - service may be stopped');
        }

        const ROLE_SRV_URL = `${ROLE_SRV_BASE}.1.${currentVersion}/role`;
        
        const response = await axios.get(`${ROLE_SRV_URL}/remove_user_role`, {
            params: { userId, userCenter, appGroupId, roleId },
            headers: { 'Accept': 'text/xml', 'Content-Type': 'text/xml' }
        });

        log.roleStatusChange(
            'Removed role',
            userId,
            roleId,
            (await getUserRolesWithNames()).find(u => u.UserId === userId)?.Roles.find(r => r.RoleId === parseInt(roleId))?.RoleName || 'Unknown',
            `AppGroupID: ${appGroupId}`
        );
        log.adminAction(
            'removed role',
            currentUser,
            {
                type: 'role',
                id: roleId,
                name: `for UserID: ${userId}`
            }
        );

        res.status(200).json({
            status: 'success',
            message: 'Role removed successfully',
            data: response.data,
            serviceVersion: currentVersion
        });
    } catch (error) {
        log.error(`Failed to remove role for UserID:${userId}, RoleID:${roleId}: ${error.message}`);
        res.status(500).json({
            error: 'Failed to remove role',
            details: error.message,
            suggestion: error.message.includes('stopped') ? 
                'RoleSrv service might be stopped. Please check service status.' : 
                'Please try again later.'
        });
    }
});

router.get('/admin/role-management/manage', isAdmin, async (req, res) => {
    const currentUser = req.session?.user || { username: 'Unknown', id: 'N/A' };

    try {
        const currentVersion = await getRoleSrvVersion();
        const ROLE_SRV_URL = currentVersion && currentVersion !== 'Service Stopped' && currentVersion !== 'Unknown' 
            ? `${ROLE_SRV_BASE}.1.${currentVersion}/role` 
            : ROLE_SRV_BASE;
        const userRoles = await getUserRolesWithNames();

        res.render('roleManagement', {
            title: 'Role Management',
            roleSrvUrl: ROLE_SRV_URL,
            pathname: req.originalUrl,
            serviceStatus: currentVersion === 'Service Stopped' || currentVersion === 'Unknown' ? 'Stopped' : 'Running',
            currentVersion: currentVersion || 'N/A',
            userRoles: userRoles
        });
    } catch (error) {
        log.error(`Error loading role management page: ${error.message}`);
        res.status(500).render('error', {
            message: 'Error detecting service version or loading roles',
            error
        });
    }
});

export default router;