// utils/characterUtils.js

import sql from 'mssql';
import { configBlGame } from '../config/dbConfig.js';
import chalk from 'chalk';

// Функция для получения ID аккаунта владельца по имени персонажа
export async function getOwnerAccId(charname) {
  console.log(chalk.blue(`getOwnerAccId: Start execution with charname = ${charname}`));
  let pool; // Определяем переменную для пула
  try {
    pool = await sql.connect(configBlGame);
    const result = await pool.request()
      .input('charname', sql.NVarChar, charname)
      .query('SELECT game_account_id FROM CreatureProperty WHERE name = @charname');
    
    console.log(chalk.green(`getOwnerAccId: Query result: ${JSON.stringify(result.recordset)}`));
    return result.recordset[0] ? result.recordset[0].game_account_id : null;
  } catch (err) {
    console.error(chalk.red('getOwnerAccId: Error executing query:', err));
    throw err;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (err) {
        console.error(chalk.red('getOwnerAccId: Error closing database connection:', err.message));
      }
    }
  }
}
