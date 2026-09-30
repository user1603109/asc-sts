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

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY || !SPREADSHEET_ID) {
  console.error('\n❌ Missing credentials in .env.local:');
  console.error('- GOOGLE_SERVICE_ACCOUNT_EMAIL');
  console.error('- GOOGLE_PRIVATE_KEY');
  console.error('- GOOGLE_SHEET_ID\n');
  process.exit(1);
}

const SHEET_SCHEMAS = {
  system_settings: ['id', 'setting_key', 'setting_value'],
  users: ['id', 'username', 'password', 'full_name', 'role', 'approval_status'],
  event_types: ['id', 'type_name'],
  courses: ['id', 'course_name'],
  departments: ['id', 'department_name', 'department_code'],
  organizers: ['id', 'organizer_name'],
  events: ['id', 'name', 'description', 'type', 'participation_mode', 'department', 'organizer', 'academic_year', 'start_date', 'end_date', 'status'],
  event_judges: ['id', 'event_id', 'user_id'],
  candidates: ['id', 'event_id', 'name', 'image_path', 'course_id', 'year_level', 'order_number', 'registry_id'],
  event_portions: ['id', 'event_id', 'portion_name', 'percentage', 'order_number', 'status'],
  criteria: ['id', 'event_id', 'portion_id', 'name', 'max_score', 'percentage'],
  scores: ['id', 'event_id', 'judge_id', 'candidate_id', 'criteria_id', 'score'],
  participants_registry: ['id', 'name', 'course_id', 'year_level', 'image_path'],
};

const SEED_DATA = {
  system_settings: [
    { id: 1, setting_key: 'system_name', setting_value: 'Automated Scoring & Tabulation System' },
    { id: 2, setting_key: 'organization', setting_value: 'Apayao State College' },
    { id: 3, setting_key: 'academic_year', setting_value: '2025-2026' },
  ],
  users: [
    { id: 1, username: 'admin', password: 'adminpassword123', full_name: 'ASC Administrator', role: 'admin', approval_status: 'approved' },
  ],
  event_types: [
    { id: 1, type_name: 'Pageant' },
    { id: 2, type_name: 'Cultural' },
    { id: 3, type_name: 'Academic' },
    { id: 4, type_name: 'Sports' },
    { id: 5, type_name: 'Literary' },
  ],
  courses: [
    { id: 1, course_name: 'Bachelor of Secondary Education' },
    { id: 2, course_name: 'Bachelor of Elementary Education' },
    { id: 3, course_name: 'Bachelor in Information Technology' },
    { id: 4, course_name: 'Bachelor in Industrial Technology' },
    { id: 5, course_name: 'Bachelor of Technical Teacher Education' },
    { id: 6, course_name: 'Bachelor of Science in Civil Engineering' },
    { id: 7, course_name: 'Bachelor of Science in Hotel & Restaurant Mgmt.' },
    { id: 8, course_name: 'Bachelor of Science in Agriculture' },
    { id: 9, course_name: 'Bachelor of Science in Business Administration' },
    { id: 10, course_name: 'Bachelor of Science in Tourism' },
    { id: 11, course_name: 'Bachelor of Science in Criminology' },
  ],
  departments: [
    { id: 1, department_name: 'Bachelor of Secondary Education', department_code: 'BSED' },
    { id: 2, department_name: 'Bachelor of Elementary Education', department_code: 'BEED' },
    { id: 3, department_name: 'Bachelor in Information Technology', department_code: 'BSIT' },
    { id: 4, department_name: 'Bachelor in Industrial Technology', department_code: 'BINDT' },
    { id: 5, department_name: 'Bachelor of Technical Teacher Education', department_code: 'BTTE' },
    { id: 6, department_name: 'Bachelor of Science in Civil Engineering', department_code: 'BSCE' },
    { id: 7, department_name: 'Bachelor of Science in Hotel & Restaurant Mgmt.', department_code: 'BSHRM' },
    { id: 8, department_name: 'Bachelor of Science in Agriculture', department_code: 'BSA' },
    { id: 9, department_name: 'Bachelor of Science in Business Administration', department_code: 'BSBA' },
    { id: 10, department_name: 'Bachelor of Science in Tourism', department_code: 'BST' },
    { id: 11, department_name: 'Bachelor of Science in Criminology', department_code: 'BSCrim' },
  ],
  organizers: [
    { id: 1, organizer_name: 'ASC Supreme Student Council' },
    { id: 2, organizer_name: 'ASC Sports & Cultural Affairs' },
  ],
};

async function init() {
  console.log('🔄 Connecting to Google Sheets API...');
  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });

  const existingTitles = (spreadsheet.data.sheets || []).map((s) => s.properties?.title);
  console.log('📑 Existing sheets in document:', existingTitles);

  for (const [tabName, columns] of Object.entries(SHEET_SCHEMAS)) {
    if (!existingTitles.includes(tabName)) {
      console.log(`➕ Creating sheet tab: "${tabName}"...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: tabName } } }],
        },
      });

      const rows = [columns];
      if (SEED_DATA[tabName]) {
        for (const item of SEED_DATA[tabName]) {
          rows.push(columns.map((col) => (item[col] !== undefined ? String(item[col]) : '')));
        }
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tabName}!A1:Z`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
      console.log(`✅ Tab "${tabName}" created and seeded.`);
    } else {
      console.log(`ℹ️ Tab "${tabName}" already exists.`);
    }
  }

  console.log('\n🎉 All Google Sheet tables initialized successfully!');
}

init().catch((err) => {
  console.error('❌ Error initializing sheets:', err);
  process.exit(1);
});
