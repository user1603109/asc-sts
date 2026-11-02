import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Read .env.local or .env if present
const envFiles = ['.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.resolve(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value.replace(/\\n/g, '\n');
        }
      }
    });
  }
}

const host = process.env.MYSQL_HOST || 'localhost';
const port = Number(process.env.MYSQL_PORT) || 3306;
const user = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '';
const database = process.env.MYSQL_DATABASE || 'asts_db';

console.log('🧹 [ASC-STS] Starting MySQL Database Wipe Routine...');

async function main() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
    });

    console.log(`🚀 Connected to MySQL database "${database}". Wiping data...`);

    const wipeSql = `
      SET FOREIGN_KEY_CHECKS = 0;
      TRUNCATE TABLE scores;
      TRUNCATE TABLE criteria;
      TRUNCATE TABLE event_portions;
      TRUNCATE TABLE candidates;
      TRUNCATE TABLE event_judges;
      TRUNCATE TABLE events;
      TRUNCATE TABLE participants_registry;
      TRUNCATE TABLE audit_logs;
      DELETE FROM users WHERE username != 'admin';
      SET FOREIGN_KEY_CHECKS = 1;
    `;

    await connection.query(wipeSql);
    console.log('✅ Competition events, contenders, scores, and judge assignments successfully wiped!');
  } catch (error) {
    console.error('❌ Wipe Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

main();
