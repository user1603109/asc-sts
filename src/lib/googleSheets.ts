import { google } from 'googleapis';

// Environment variables
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
// Handle escaped newlines in Vercel environment variables
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Define default schema columns matching database/asts.sql
export const SHEET_SCHEMAS: Record<string, string[]> = {
  system_settings: ['id', 'setting_key', 'setting_value'],
  users: ['id', 'username', 'password', 'full_name', 'role', 'approval_status'],
  event_types: ['id', 'type_name'],
  courses: ['id', 'course_name'],
  departments: ['id', 'department_name', 'department_code'],
  organizers: ['id', 'organizer_name'],
  events: [
    'id',
    'name',
    'description',
    'type',
    'participation_mode',
    'department',
    'organizer',
    'academic_year',
    'start_date',
    'end_date',
    'status',
  ],
  event_judges: ['id', 'event_id', 'user_id'],
  candidates: [
    'id',
    'event_id',
    'name',
    'image_path',
    'course_id',
    'year_level',
    'order_number',
    'registry_id',
  ],
  event_portions: [
    'id',
    'event_id',
    'portion_name',
    'percentage',
    'order_number',
    'status',
  ],
  criteria: [
    'id',
    'event_id',
    'portion_id',
    'name',
    'max_score',
    'percentage',
  ],
  scores: [
    'id',
    'event_id',
    'judge_id',
    'candidate_id',
    'criteria_id',
    'score',
  ],
  participants_registry: [
    'id',
    'name',
    'course_id',
    'year_level',
    'image_path',
  ],
};

// Initial Seed Data matching database/asts.sql
export const SEED_DATA: Record<string, Record<string, any>[]> = {
  system_settings: [
    { id: 1, setting_key: 'system_name', setting_value: 'Automated Scoring & Tabulation System' },
    { id: 2, setting_key: 'organization', setting_value: 'Apayao State College' },
    { id: 3, setting_key: 'academic_year', setting_value: '2025-2026' },
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

// In-memory demo store fallback when environment variables are not yet configured
let memoryStore: Record<string, any[]> | null = null;

function getMemoryStore(): Record<string, any[]> {
  if (!memoryStore) {
    memoryStore = {};
    for (const [tab, seeds] of Object.entries(SEED_DATA)) {
      memoryStore[tab] = [...seeds];
    }
    // Initialize other empty tables
    for (const tab of Object.keys(SHEET_SCHEMAS)) {
      if (!memoryStore[tab]) {
        memoryStore[tab] = [];
      }
    }
  }
  return memoryStore;
}

export function isGoogleConfigured(): boolean {
  return Boolean(SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY && SPREADSHEET_ID);
}

function getSheetsClient() {
  if (!isGoogleConfigured()) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Read all rows from a given sheet tab as typed objects
 */
export async function getSheetRows<T = Record<string, any>>(sheetName: string): Promise<T[]> {
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    const store = getMemoryStore();
    return (store[sheetName] || []).map((r) => ({ ...r })) as T[];
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z`,
  });

  const rows = res.data.values;
  if (!rows || rows.length <= 1) {
    return [];
  }

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1);

  return dataRows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      let val = row[index] !== undefined ? row[index] : '';
      if (['id', 'event_id', 'user_id', 'judge_id', 'candidate_id', 'criteria_id', 'portion_id', 'course_id', 'registry_id', 'order_number'].includes(header)) {
        val = val === '' || val === null ? null : Number(val);
      } else if (['score', 'max_score', 'percentage'].includes(header)) {
        val = val === '' || val === null ? 0 : Number(val);
      }
      obj[header] = val;
    });
    return obj as T;
  });
}

/**
 * Fetch a single row by ID
 */
export async function getRowById<T = Record<string, any>>(sheetName: string, id: number): Promise<T | null> {
  const rows = await getSheetRows<T>(sheetName);
  return rows.find((r: any) => Number(r.id) === Number(id)) || null;
}

/**
 * Append a row to a sheet tab, auto-incrementing ID if not supplied
 */
export async function appendSheetRow<T extends Record<string, any>>(sheetName: string, data: Partial<T>): Promise<T> {
  const existingRows = await getSheetRows(sheetName);
  
  // Calculate next ID
  let nextId = 1;
  if (existingRows.length > 0) {
    const maxId = Math.max(...existingRows.map((r: any) => Number(r.id) || 0));
    nextId = maxId + 1;
  }

  const finalData: Record<string, any> = {
    ...data,
    id: data.id !== undefined && data.id !== null ? Number(data.id) : nextId,
  };

  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    const store = getMemoryStore();
    if (!store[sheetName]) store[sheetName] = [];
    store[sheetName].push(finalData);
    return finalData as T;
  }

  const schema = SHEET_SCHEMAS[sheetName] || Object.keys(finalData);
  const rowValues = schema.map((col) => {
    const val = finalData[col];
    return val === undefined || val === null ? '' : String(val);
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [rowValues],
    },
  });

  return finalData as T;
}

/**
 * Update an existing row by ID
 */
export async function updateSheetRow<T extends Record<string, any>>(
  sheetName: string,
  id: number,
  data: Partial<T>
): Promise<boolean> {
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    const store = getMemoryStore();
    const rows = store[sheetName] || [];
    const idx = rows.findIndex((r) => Number(r.id) === Number(id));
    if (idx === -1) return false;
    rows[idx] = { ...rows[idx], ...data };
    return true;
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z`,
  });

  const rows = res.data.values;
  if (!rows || rows.length <= 1) return false;

  const headers = rows[0] as string[];
  const idColIndex = headers.indexOf('id');
  if (idColIndex === -1) return false;

  const rowIndex = rows.findIndex((row, idx) => idx > 0 && Number(row[idColIndex]) === Number(id));
  if (rowIndex === -1) return false;

  const currentRow = rows[rowIndex];
  const updatedRow = headers.map((header, colIdx) => {
    if (header in data) {
      const val = data[header];
      return val === undefined || val === null ? '' : String(val);
    }
    return currentRow[colIdx] !== undefined ? currentRow[colIdx] : '';
  });

  const sheetRowNumber = rowIndex + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${sheetRowNumber}:Z${sheetRowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [updatedRow],
    },
  });

  return true;
}

/**
 * Delete a row by ID from a sheet tab
 */
export async function deleteSheetRow(sheetName: string, id: number): Promise<boolean> {
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    const store = getMemoryStore();
    const rows = store[sheetName] || [];
    const idx = rows.findIndex((r) => Number(r.id) === Number(id));
    if (idx === -1) return false;
    rows.splice(idx, 1);
    return true;
  }
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetObj = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  if (!sheetObj || sheetObj.properties?.sheetId === undefined) return false;
  const sheetId = sheetObj.properties.sheetId;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z`,
  });

  const rows = res.data.values;
  if (!rows || rows.length <= 1) return false;

  const headers = rows[0] as string[];
  const idColIndex = headers.indexOf('id');
  if (idColIndex === -1) return false;

  const rowIndex = rows.findIndex((row, idx) => idx > 0 && Number(row[idColIndex]) === Number(id));
  if (rowIndex === -1) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });

  return true;
}

/**
 * Auto-initialize Google Sheets: creates any missing worksheet tabs,
 * adds schema headers, and inserts default seed data.
 */
export async function ensureAllSheets(): Promise<{
  createdTabs: string[];
  existingTabs: string[];
}> {
  const sheets = getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const existingSheetTitles = (spreadsheet.data.sheets || [])
    .map((s) => s.properties?.title)
    .filter(Boolean) as string[];

  const requiredTabs = Object.keys(SHEET_SCHEMAS);
  const createdTabs: string[] = [];

  for (const tabName of requiredTabs) {
    if (!existingSheetTitles.includes(tabName)) {
      // 1. Add the worksheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabName,
                },
              },
            },
          ],
        },
      });

      // 2. Add header row
      const headers = SHEET_SCHEMAS[tabName];
      const initialValues: any[][] = [headers];

      // Add seeds if available
      if (SEED_DATA[tabName]) {
        for (const seed of SEED_DATA[tabName]) {
          const row = headers.map((col) => (seed[col] !== undefined ? String(seed[col]) : ''));
          initialValues.push(row);
        }
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tabName}!A1:Z`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: initialValues,
        },
      });

      createdTabs.push(tabName);
    }
  }

  return {
    createdTabs,
    existingTabs: existingSheetTitles,
  };
}
