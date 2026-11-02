import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Read .env.local or .env
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

const targetUsername = process.argv[2] || 'admin';
const targetPassword = process.argv[3] || 'adminpassword123';
const targetFullName = process.argv[4] || 'ASC Administrator';

async function setAdmin() {
  const isCloud = host !== 'localhost' && host !== '127.0.0.1';
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    ...(isCloud ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {}),
  });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(targetPassword, salt);

  const [existing] = await conn.query('SELECT id, username FROM users WHERE username = ?', [targetUsername]);

  if (existing.length > 0) {
    await conn.execute(
      'UPDATE users SET password = ?, full_name = ?, role = "admin", approval_status = "approved" WHERE username = ?',
      [hashedPassword, targetFullName, targetUsername]
    );
    console.log(`✅ Updated existing admin user: "${targetUsername}" with new password.`);
  } else {
    await conn.execute(
      'INSERT INTO users (username, password, full_name, role, approval_status) VALUES (?, ?, ?, "admin", "approved")',
      [targetUsername, hashedPassword, targetFullName]
    );
    console.log(`✅ Created new admin user: "${targetUsername}".`);
  }

  // Verify hash
  const [verifyRows] = await conn.query('SELECT id, username, password FROM users WHERE username = ?', [targetUsername]);
  const isMatch = await bcrypt.compare(targetPassword, verifyRows[0].password);
  console.log(`🔐 Verification test for "${targetUsername}":`, isMatch ? 'SUCCESS (Password verified)' : 'FAILED');

  await conn.end();
}

setAdmin().catch((err) => {
  console.error('❌ Error setting admin credential:', err.message);
  process.exit(1);
});
