import { google } from 'googleapis';
import { SHEET_SCHEMAS, SEED_DATA } from './schemas';

export { SHEET_SCHEMAS, SEED_DATA };

// Environment variables
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
// Handle escaped newlines in Vercel environment variables
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

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
 * Fast bulk upsert for judge scores. Executes in a single batch read & write to avoid timeouts.
 */
export async function upsertScoresBatch(scoreItems: {
  event_id: number;
  judge_id: number;
  candidate_id: number;
  criteria_id: number;
  score: number;
}[]): Promise<boolean> {
  if (!scoreItems || scoreItems.length === 0) return true;

  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
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

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'scores!A1:Z',
    });

    let rows = res.data.values || [];
    if (rows.length === 0) {
      const defaultHeaders = SHEET_SCHEMAS['scores'] || ['id', 'event_id', 'judge_id', 'candidate_id', 'criteria_id', 'score'];
      rows = [defaultHeaders];
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'scores!A1:Z1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [defaultHeaders] },
      });
    }

    const headers = rows[0] as string[];
    const idCol = headers.indexOf('id');
    const evtCol = headers.indexOf('event_id');
    const jdgCol = headers.indexOf('judge_id');
    const candCol = headers.indexOf('candidate_id');
    const critCol = headers.indexOf('criteria_id');
    const scoreCol = headers.indexOf('score');

    let maxId = 0;
    for (let i = 1; i < rows.length; i++) {
      const rId = Number(rows[i][idCol]) || 0;
      if (rId > maxId) maxId = rId;
    }

    const updateRequests: { range: string; values: any[][] }[] = [];
    const appendRows: any[][] = [];

    for (const item of scoreItems) {
      let foundRowIdx = -1;
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (
          Number(r[evtCol]) === Number(item.event_id) &&
          Number(r[jdgCol]) === Number(item.judge_id) &&
          Number(r[candCol]) === Number(item.candidate_id) &&
          Number(r[critCol]) === Number(item.criteria_id)
        ) {
          foundRowIdx = i;
          break;
        }
      }

      if (foundRowIdx !== -1) {
        const sheetRowNumber = foundRowIdx + 1;
        const row = [...rows[foundRowIdx]];
        while (row.length < headers.length) row.push('');
        row[scoreCol] = String(item.score);
        rows[foundRowIdx] = row;

        updateRequests.push({
          range: `scores!A${sheetRowNumber}:Z${sheetRowNumber}`,
          values: [row],
        });
      } else {
        maxId++;
        const newRow = headers.map((h) => {
          if (h === 'id') return String(maxId);
          if (h === 'event_id') return String(item.event_id);
          if (h === 'judge_id') return String(item.judge_id);
          if (h === 'candidate_id') return String(item.candidate_id);
          if (h === 'criteria_id') return String(item.criteria_id);
          if (h === 'score') return String(item.score);
          return '';
        });
        rows.push(newRow);
        appendRows.push(newRow);
      }
    }

    if (updateRequests.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: updateRequests,
        },
      });
    }

    if (appendRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'scores!A:Z',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: appendRows,
        },
      });
    }

    return true;
  } catch (error) {
    console.error('Fast upsertScoresBatch error:', error);
    throw error;
  }
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
 * Overwrite all data rows in a sheet tab (keeping headers intact)
 */
export async function setSheetRows<T extends Record<string, any>>(
  sheetName: string,
  rows: T[]
): Promise<boolean> {
  const schema = SHEET_SCHEMAS[sheetName] || (rows.length > 0 ? Object.keys(rows[0]) : []);
  const sheets = getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    const store = getMemoryStore();
    store[sheetName] = rows.map((r, i) => ({
      ...r,
      id: r.id !== undefined && r.id !== null ? Number(r.id) : i + 1,
    }));
    return true;
  }

  try {
    // 1. Clear old data from row 2 downwards
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2:Z`,
    });

    // 2. Format values according to schema
    const formattedRows = rows.map((row, index) => {
      const rowId = row.id !== undefined && row.id !== null ? Number(row.id) : index + 1;
      return schema.map((col) => {
        if (col === 'id') return String(rowId);
        const val = row[col];
        return val === undefined || val === null ? '' : String(val);
      });
    });

    if (formattedRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A2:Z`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: formattedRows,
        },
      });
    }
    return true;
  } catch (e) {
    console.error(`Error setting sheet rows for ${sheetName}:`, e);
    // Fallback to memory
    const store = getMemoryStore();
    store[sheetName] = rows.map((r) => ({ ...r }));
    return false;
  }
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
  if (!sheets || !SPREADSHEET_ID) {
    throw new Error('Google Sheets credentials are not configured.');
  }
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
