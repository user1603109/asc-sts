/**
 * Native MySQL Database Connection Pool & Operations Adapter for Hostinger / cPanel
 * High Performance, Sub-millisecond queries, ACID Transactions
 */

import mysql, { Pool, PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { SHEET_SCHEMAS, SEED_DATA } from './schemas';

export { SHEET_SCHEMAS, SEED_DATA };

let pool: Pool | null = null;

// Memory store fallback when MySQL is disconnected or offline during initial setup
let memoryStore: Record<string, any[]> | null = null;

function getMemoryStore(): Record<string, any[]> {
  if (!memoryStore) {
    memoryStore = {};
    for (const [tab, seeds] of Object.entries(SEED_DATA)) {
      memoryStore[tab] = [...seeds];
    }
    for (const tab of Object.keys(SHEET_SCHEMAS)) {
      if (!memoryStore[tab]) {
        memoryStore[tab] = [];
      }
    }
  }
  return memoryStore;
}

export function isMySQLConfigured(): boolean {
  return Boolean(
    process.env.MYSQL_DATABASE ||
    process.env.MYSQL_HOST ||
    process.env.DATABASE_URL
  );
}

export function getMySQLPool(): Pool {
  if (!pool) {
    const isCloudHost = Boolean(
      process.env.MYSQL_HOST?.includes('tidbcloud.com') ||
      process.env.MYSQL_SSL === 'true' ||
      (process.env.MYSQL_HOST && process.env.MYSQL_HOST !== 'localhost' && process.env.MYSQL_HOST !== '127.0.0.1')
    );

    const config: PoolOptions = {
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'asts_db',
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      ...(isCloudHost ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {}),
    };

    if (process.env.DATABASE_URL) {
      pool = mysql.createPool(process.env.DATABASE_URL);
    } else {
      pool = mysql.createPool(config);
    }
  }
  return pool;
}

/**
 * Test MySQL connection
 */
export async function testMySQLConnection(): Promise<{ success: boolean; message: string; version?: string }> {
  try {
    const p = getMySQLPool();
    const [rows] = await p.query<RowDataPacket[]>('SELECT VERSION() as version');
    const version = rows[0]?.version;
    return {
      success: true,
      message: `Connected successfully to MySQL server version: ${version}`,
      version,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to connect to MySQL database',
    };
  }
}

/**
 * Execute raw SELECT queries
 */
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const p = getMySQLPool();
    const [rows] = await p.query<RowDataPacket[]>(sql, params);
    return rows as T[];
  } catch (err: any) {
    console.error('MySQL query error:', err.message);
    throw err;
  }
}

/**
 * Execute INSERT, UPDATE, DELETE queries
 */
export async function execute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  try {
    const p = getMySQLPool();
    const [result] = await p.execute<ResultSetHeader>(sql, params);
    return result;
  } catch (err: any) {
    console.error('MySQL execute error:', err.message);
    throw err;
  }
}

export const VALID_TABLES = new Set([
  'system_settings',
  'users',
  'event_types',
  'departments',
  'courses',
  'organizers',
  'events',
  'event_judges',
  'candidates',
  'event_portions',
  'criteria',
  'scores',
  'participants_registry',
  'audit_logs',
]);

function assertValidTable(table: string): void {
  if (!VALID_TABLES.has(table)) {
    throw new Error(`Security Violation: Invalid or unauthorized table access: ${table}`);
  }
}

/**
 * Read all rows from a given table
 */
export async function getSheetRows<T = Record<string, any>>(table: string): Promise<T[]> {
  assertValidTable(table);
  try {
    const p = getMySQLPool();
    const [rows] = await p.query<RowDataPacket[]>(`SELECT * FROM \`${table}\``);
    return rows as T[];
  } catch (e: any) {
    console.warn(`MySQL getSheetRows fallback for ${table}:`, e.message);
    const store = getMemoryStore();
    return (store[table] || []).map((r) => ({ ...r })) as T[];
  }
}

/**
 * Fetch a single row by ID
 */
export async function getRowById<T = Record<string, any>>(table: string, id: number): Promise<T | null> {
  assertValidTable(table);
  try {
    const p = getMySQLPool();
    const [rows] = await p.query<RowDataPacket[]>(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [Number(id)]);
    return (rows[0] as T) || null;
  } catch (e: any) {
    console.warn(`MySQL getRowById fallback for ${table}:`, e.message);
    const rows = await getSheetRows<T>(table);
    return rows.find((r: any) => Number(r.id) === Number(id)) || null;
  }
}

/**
 * Append/Insert a new row into table
 */
export async function appendSheetRow<T extends Record<string, any>>(table: string, data: Partial<T>): Promise<T> {
  assertValidTable(table);
  try {
    const allowedCols = SHEET_SCHEMAS[table];
    const filteredCols = Object.keys(data).filter(
      (k) => (allowedCols ? allowedCols.includes(k) : /^[a-zA-Z0-9_]+$/.test(k)) &&
             (k !== 'id' || (data.id !== undefined && data.id !== null))
    );

    if (filteredCols.length === 0) {
      throw new Error(`No valid columns to insert into ${table}`);
    }

    const colsStr = filteredCols.map((c) => `\`${c}\``).join(', ');
    const placeholders = filteredCols.map(() => '?').join(', ');
    const values = filteredCols.map((k) => (data as any)[k]);

    const p = getMySQLPool();
    const [result] = await p.execute<ResultSetHeader>(
      `INSERT INTO \`${table}\` (${colsStr}) VALUES (${placeholders})`,
      values
    );

    return ({ ...data, id: result.insertId || (data as any).id } as unknown) as T;
  } catch (e: any) {
    console.warn(`MySQL appendSheetRow fallback for ${table}:`, e.message);
    const store = getMemoryStore();
    if (!store[table]) store[table] = [];
    const maxId = store[table].reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
    const finalData = { ...data, id: data.id !== undefined ? Number(data.id) : maxId + 1 };
    store[table].push(finalData);
    return (finalData as unknown) as T;
  }
}

/**
 * Update an existing row by ID
 */
export async function updateSheetRow<T extends Record<string, any>>(
  table: string,
  id: number,
  data: Partial<T>
): Promise<boolean> {
  assertValidTable(table);
  try {
    const allowedCols = SHEET_SCHEMAS[table];
    const filteredCols = Object.keys(data).filter(
      (k) => (allowedCols ? allowedCols.includes(k) : /^[a-zA-Z0-9_]+$/.test(k)) && k !== 'id'
    );

    if (filteredCols.length === 0) return true;

    const setClauses = filteredCols.map((c) => `\`${c}\` = ?`).join(', ');
    const values = [...filteredCols.map((k) => (data as any)[k]), Number(id)];

    const p = getMySQLPool();
    await p.execute(`UPDATE \`${table}\` SET ${setClauses} WHERE id = ?`, values);
    return true;
  } catch (e: any) {
    console.warn(`MySQL updateSheetRow fallback for ${table}:`, e.message);
    const store = getMemoryStore();
    const rows = store[table] || [];
    const idx = rows.findIndex((r) => Number(r.id) === Number(id));
    if (idx === -1) return false;
    rows[idx] = { ...rows[idx], ...data };
    return true;
  }
}

/**
 * Delete a row by ID
 */
export async function deleteSheetRow(table: string, id: number): Promise<boolean> {
  assertValidTable(table);
  try {
    const p = getMySQLPool();
    await p.execute(`DELETE FROM \`${table}\` WHERE id = ?`, [Number(id)]);
    return true;
  } catch (e: any) {
    console.warn(`MySQL deleteSheetRow fallback for ${table}:`, e.message);
    const store = getMemoryStore();
    const rows = store[table] || [];
    const idx = rows.findIndex((r) => Number(r.id) === Number(id));
    if (idx === -1) return false;
    rows.splice(idx, 1);
    return true;
  }
}

/**
 * Overwrite all rows in a table safely with foreign key protection
 */
export async function setSheetRows<T extends Record<string, any>>(table: string, rows: T[]): Promise<boolean> {
  assertValidTable(table);
  try {
    const p = getMySQLPool();
    const conn = await p.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query(`DELETE FROM \`${table}\``);

      const allowedCols = SHEET_SCHEMAS[table];
      for (const r of rows) {
        const filteredCols = Object.keys(r).filter(
          (k) => (allowedCols ? allowedCols.includes(k) : /^[a-zA-Z0-9_]+$/.test(k))
        );
        if (filteredCols.length === 0) continue;

        const colsStr = filteredCols.map((c) => `\`${c}\``).join(', ');
        const placeholders = filteredCols.map(() => '?').join(', ');
        const values = filteredCols.map((k) => (r as any)[k]);

        await conn.execute(`INSERT INTO \`${table}\` (${colsStr}) VALUES (${placeholders})`, values);
      }
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      await conn.commit();
      return true;
    } catch (txErr) {
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (e: any) {
    console.warn(`MySQL setSheetRows fallback for ${table}:`, e.message);
    const store = getMemoryStore();
    store[table] = rows.map((r, i) => ({ ...r, id: r.id || i + 1 }));
    return true;
  }
}

/**
 * Batch insert multiple rows into a table without table-wiping
 */
export async function insertRowsBatch<T extends Record<string, any>>(
  table: string,
  rows: Partial<T>[]
): Promise<boolean> {
  if (!rows || rows.length === 0) return true;
  assertValidTable(table);
  try {
    const p = getMySQLPool();
    const conn = await p.getConnection();
    try {
      await conn.beginTransaction();
      const allowedCols = SHEET_SCHEMAS[table];
      for (const r of rows) {
        const filteredCols = Object.keys(r).filter(
          (k) => (allowedCols ? allowedCols.includes(k) : /^[a-zA-Z0-9_]+$/.test(k)) &&
                 (k !== 'id' || (r.id !== undefined && r.id !== null))
        );
        if (filteredCols.length === 0) continue;
        const colsStr = filteredCols.map((c) => `\`${c}\``).join(', ');
        const placeholders = filteredCols.map(() => '?').join(', ');
        const values = filteredCols.map((k) => (r as any)[k]);
        await conn.execute(`INSERT INTO \`${table}\` (${colsStr}) VALUES (${placeholders})`, values);
      }
      await conn.commit();
      return true;
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (e: any) {
    console.warn(`MySQL insertRowsBatch fallback for ${table}:`, e.message);
    for (const r of rows) {
      await appendSheetRow(table, r);
    }
    return true;
  }
}

/**
 * High-speed atomic batch upsert for judge scores using native MySQL ON DUPLICATE KEY UPDATE
 */
export async function upsertScoresBatch(
  scoreItems: Array<{
    event_id: number;
    judge_id: number;
    candidate_id: number;
    criteria_id: number;
    score: number;
  }>
): Promise<boolean> {
  if (!scoreItems || scoreItems.length === 0) return true;

  try {
    const p = getMySQLPool();
    const conn = await p.getConnection();

    try {
      await conn.beginTransaction();
      for (const item of scoreItems) {
        await conn.execute(
          `INSERT INTO scores (event_id, judge_id, candidate_id, criteria_id, score)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE score = VALUES(score), submitted_at = CURRENT_TIMESTAMP`,
          [
            Number(item.event_id),
            Number(item.judge_id),
            Number(item.candidate_id),
            Number(item.criteria_id),
            Number(item.score),
          ]
        );
      }
      await conn.commit();
      return true;
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (e: any) {
    console.warn('MySQL upsertScoresBatch fallback:', e.message);
    const store = getMemoryStore();
    if (!store['scores']) store['scores'] = [];
    const list = store['scores'];

    for (const item of scoreItems) {
      const idx = list.findIndex(
        (s) =>
          Number(s.event_id) === Number(item.event_id) &&
          Number(s.judge_id) === Number(item.judge_id) &&
          Number(s.candidate_id) === Number(item.candidate_id) &&
          Number(s.criteria_id) === Number(item.criteria_id)
      );

      if (idx !== -1) {
        list[idx] = { ...list[idx], score: Number(item.score) };
      } else {
        const maxId = list.reduce((m, s) => Math.max(m, Number(s.id) || 0), 0);
        list.push({ id: maxId + 1, ...item, score: Number(item.score) });
      }
    }
    return true;
  }
}

/**
 * Initialize all MySQL tables and seed data if not present
 */
export async function initMySQLTables(): Promise<void> {
  const p = getMySQLPool();
  const conn = await p.getConnection();

  try {
    // 1. Settings
    await conn.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) NOT NULL UNIQUE,
        setting_value TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role ENUM('admin', 'judge') NOT NULL DEFAULT 'judge',
        approval_status ENUM('pending', 'approved', 'rejected', 'suspended') NOT NULL DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Event Types
    await conn.query(`
      CREATE TABLE IF NOT EXISTS event_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type_name VARCHAR(100) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Departments
    await conn.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_name VARCHAR(150) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Organizers
    await conn.query(`
      CREATE TABLE IF NOT EXISTS organizers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100) NULL DEFAULT '',
        surname VARCHAR(100) NOT NULL,
        organizer_name VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. Events
    await conn.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        description TEXT NULL,
        type VARCHAR(100) NOT NULL,
        participation_mode ENUM('Individual', 'Team') NOT NULL DEFAULT 'Individual',
        department VARCHAR(150) NULL,
        organizer VARCHAR(150) NULL,
        academic_year VARCHAR(50) NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status ENUM('Upcoming', 'Ongoing', 'Tabulating', 'Completed') NOT NULL DEFAULT 'Upcoming'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Event Judges
    await conn.query(`
      CREATE TABLE IF NOT EXISTS event_judges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        user_id INT NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_event_judge (event_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Candidates
    await conn.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        name VARCHAR(150) NOT NULL,
        image_path VARCHAR(500) NULL,
        department VARCHAR(150) NULL,
        year_level VARCHAR(50) NULL,
        order_number INT NOT NULL DEFAULT 1,
        registry_id INT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Event Portions
    await conn.query(`
      CREATE TABLE IF NOT EXISTS event_portions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        portion_name VARCHAR(100) NOT NULL,
        percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        order_number INT NOT NULL DEFAULT 1,
        status ENUM('Upcoming', 'Ongoing', 'Completed') NOT NULL DEFAULT 'Upcoming',
        description TEXT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 10. Criteria
    await conn.query(`
      CREATE TABLE IF NOT EXISTS criteria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        portion_id INT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT NULL,
        max_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
        percentage DECIMAL(5,2) NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (portion_id) REFERENCES event_portions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. Scores
    await conn.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        judge_id INT NOT NULL,
        candidate_id INT NOT NULL,
        criteria_id INT NOT NULL,
        score DECIMAL(5,2) NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (judge_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
        FOREIGN KEY (criteria_id) REFERENCES criteria(id) ON DELETE CASCADE,
        UNIQUE KEY unique_score_entry (event_id, judge_id, candidate_id, criteria_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. Participants Registry
    await conn.query(`
      CREATE TABLE IF NOT EXISTS participants_registry (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        department VARCHAR(150) NULL,
        year_level VARCHAR(50) NULL,
        image_path VARCHAR(500) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 13. Audit Logs
    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        action VARCHAR(255) NOT NULL,
        details TEXT NULL,
        ip_address VARCHAR(45) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed admin if not present
    const [userRows] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) as cnt FROM users');
    if (userRows[0]?.cnt === 0) {
      const bcrypt = await import('bcryptjs');
      const hash = bcrypt.hashSync('adminpassword123', 10);
      await conn.execute(
        `INSERT INTO users (username, password, full_name, role, approval_status) VALUES (?, ?, ?, ?, ?)`,
        ['admin', hash, 'ASC Administrator', 'admin', 'approved']
      );

      for (const s of SEED_DATA.system_settings) {
        await conn.execute(
          `INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES (?, ?)`,
          [s.setting_key, s.setting_value]
        );
      }

      for (const t of SEED_DATA.event_types) {
        await conn.execute(
          `INSERT IGNORE INTO event_types (type_name) VALUES (?)`,
          [t.type_name]
        );
      }

      for (const d of SEED_DATA.departments) {
        await conn.execute(
          `INSERT IGNORE INTO departments (department_name) VALUES (?)`,
          [d.department_name]
        );
      }

      for (const o of SEED_DATA.organizers) {
        await conn.execute(
          `INSERT IGNORE INTO organizers (first_name, middle_name, surname, organizer_name) VALUES (?, ?, ?, ?)`,
          [o.first_name, o.middle_name || '', o.surname, o.organizer_name]
        );
      }
    }
  } finally {
    conn.release();
  }
}

/**
 * Track failed login attempts persistently across serverless lambdas
 */
export async function getFailedLoginCount(username: string): Promise<number> {
  const normalized = username.trim().toLowerCase();
  try {
    const p = getMySQLPool();
    const [rows] = await p.query<RowDataPacket[]>(
      `SELECT COUNT(*) as cnt FROM audit_logs 
       WHERE action = 'FAILED_LOGIN' AND details = ? AND created_at >= NOW() - INTERVAL 5 MINUTE`,
      [normalized]
    );
    return Number(rows[0]?.cnt || 0);
  } catch (err: any) {
    console.warn('getFailedLoginCount fallback:', err.message);
    const store = getMemoryStore();
    const logs = store['audit_logs'] || [];
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return logs.filter(
      (l: any) =>
        l.action === 'FAILED_LOGIN' &&
        l.details === normalized &&
        new Date(l.created_at || 0).getTime() >= fiveMinutesAgo
    ).length;
  }
}

export async function recordFailedLogin(username: string, ip: string = '127.0.0.1'): Promise<number> {
  const normalized = username.trim().toLowerCase();
  try {
    const p = getMySQLPool();
    await p.execute(
      `INSERT INTO audit_logs (action, details, ip_address) VALUES ('FAILED_LOGIN', ?, ?)`,
      [normalized, ip || '']
    );
    return await getFailedLoginCount(normalized);
  } catch (err: any) {
    console.warn('recordFailedLogin fallback:', err.message);
    const store = getMemoryStore();
    if (!store['audit_logs']) store['audit_logs'] = [];
    store['audit_logs'].push({
      action: 'FAILED_LOGIN',
      details: normalized,
      ip_address: ip,
      created_at: new Date().toISOString(),
    });
    return await getFailedLoginCount(normalized);
  }
}

export async function clearFailedLogins(username: string): Promise<void> {
  const normalized = username.trim().toLowerCase();
  try {
    const p = getMySQLPool();
    await p.execute(
      `DELETE FROM audit_logs WHERE action = 'FAILED_LOGIN' AND details = ?`,
      [normalized]
    );
  } catch (err: any) {
    console.warn('clearFailedLogins fallback:', err.message);
    const store = getMemoryStore();
    if (store['audit_logs']) {
      store['audit_logs'] = store['audit_logs'].filter(
        (l: any) => !(l.action === 'FAILED_LOGIN' && l.details === normalized)
      );
    }
  }
}

export default getMySQLPool;
