import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Read .env.local if present
const envPath = path.resolve(process.cwd(), '.env.local');
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
      process.env[key] = value.replace(/\\n/g, '\n');
    }
  });
}

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

console.log('🧹 [ASC-STS] Starting Database Wipe Routine...');

async function wipeTurso() {
  if (!TURSO_URL || !TURSO_TOKEN) {
    console.log('ℹ️ Turso credentials not set in .env.local (skipping Turso wipe).');
    return;
  }

  console.log('🚀 Connecting to Turso LibSQL Cloud Database...');
  let url = TURSO_URL.trim();
  if (url.startsWith('libsql://')) url = url.replace('libsql://', 'https://');
  else if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;
  url = url.replace(/\/+$/, '');
  const endpoint = `${url}/v2/pipeline`;

  const stmts = [
    { sql: 'DELETE FROM events' },
    { sql: 'DELETE FROM candidates' },
    { sql: 'DELETE FROM event_portions' },
    { sql: 'DELETE FROM criteria' },
    { sql: 'DELETE FROM scores' },
    { sql: 'DELETE FROM event_judges' },
    { sql: 'DELETE FROM participants_registry' },
    { sql: 'DELETE FROM courses' },
    { sql: 'DELETE FROM departments' },
    { sql: 'DELETE FROM organizers' },
    { sql: 'DELETE FROM event_types' },
    { sql: 'DELETE FROM users WHERE username != "admin"' },
  ];

  const body = {
    requests: stmts.map((s) => ({ type: 'execute', stmt: s })),
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    console.log('✅ Successfully wiped all tables in Turso Cloud Database!');
  } else {
    console.error('❌ Failed to wipe Turso:', await res.text());
  }
}

async function wipeGoogleSheets() {
  if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY || !SPREADSHEET_ID) {
    console.log('ℹ️ Google Sheets credentials not configured in .env.local (skipping Sheets wipe).');
    return;
  }

  console.log('📊 Connecting to Google Sheets API...');
  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const tabsToClear = [
    'events',
    'candidates',
    'event_portions',
    'criteria',
    'scores',
    'event_judges',
    'participants_registry',
    'courses',
    'departments',
    'organizers',
    'event_types',
  ];

  for (const tab of tabsToClear) {
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tab}!A2:Z`,
      });
      console.log(`  - Cleared tab: ${tab}`);
    } catch (err) {
      console.warn(`  - Note on ${tab}:`, err.message);
    }
  }

  // Reset users to admin only
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'users!A2:Z',
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'users!A2:F2',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          ['1', 'admin', 'adminpassword123', 'ASC Administrator', 'admin', 'approved'],
        ],
      },
    });
    console.log('  - Reset users tab (preserved admin account).');
  } catch (err) {
    console.warn('  - Note on users tab:', err.message);
  }

  console.log('✅ Successfully wiped all competition data in Google Sheets!');
}

async function main() {
  await wipeTurso();
  await wipeGoogleSheets();
  console.log('\n🎉 ALL DATABASE RECORDS WIPED SUCCESSFULLY!');
  console.log('The system is completely clean. Only the master admin account (admin / adminpassword123) is preserved.');
}

main().catch(console.error);
