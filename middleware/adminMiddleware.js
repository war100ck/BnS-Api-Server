// middleware/adminMiddleware.js
import chalk from 'chalk';

// Настройки логирования из .env
const LOG_TO_CONSOLE = process.env.LOG_TO_CONSOLE === 'true';
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';

const log = {
  error: (message) => LOG_TO_CONSOLE && console.log(chalk.red(`[ERROR] ${message}`)),
  warning: (message) => LOG_TO_CONSOLE && console.log(chalk.yellow(`[WARNING] ${message}`)),
  debug: (message) => DEBUG_LOGS && console.log(chalk.gray(`[DEBUG] ${message}`)),
};

export const isAdmin = (req, res, next) => {
  try {
    // Проверка наличия сессии и пользователя
    if (!req.session || !req.session.user) {
      log.warning(`No session or user data found, redirecting to /admin/login`);
      return res.redirect('/admin/login');
    }

    // Проверка флага admin
    if (req.session.user.admin === true) {
      log.debug(`Admin access granted for user: ${req.session.user.id || 'unknown'}`);
      return next();
    }

    // Если пользователь не администратор
    log.warning(`Non-admin user attempted access: ${req.session.user.id || 'unknown'}`);
    return res.redirect('/admin/login');
  } catch (error) {
    log.error(`Middleware error: ${chalk.red(error.message)}`);
    return res.status(500).send('Server error');
  }
};