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

console.log(`🔌 [ASC-STS] Connecting to MySQL at ${host}:${port} as ${user}...`);

async function main() {
  let connection;
  try {
    // Connect without database first to ensure DB exists
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true,
    });

    console.log(`🔨 Ensuring database "${database}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${database}\`;`);

    // Read and execute database/asts.sql
    const sqlPath = path.resolve(process.cwd(), 'database', 'asts.sql');
    if (fs.existsSync(sqlPath)) {
      console.log(`📜 Executing database schema from ${sqlPath}...`);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      await connection.query(sqlContent);
      console.log(`✅ MySQL database initialized with all 13 tables and baseline seeds!`);
    } else {
      console.error(`❌ Could not find ${sqlPath}`);
    }
  } catch (error) {
    console.error('❌ MySQL Initialization Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

main();

