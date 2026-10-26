import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient, SPREADSHEET_ID, getMemoryStore, setSheetRows } from '@/lib/googleSheets';
import { isTursoConfigured, executeTursoBatch } from '@/lib/turso';
import { hashPassword, getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const hashedAdminPw = await hashPassword('adminpassword123');
    const adminUser = [
      {
        id: 1,
        username: 'admin',
        password: hashedAdminPw,
        full_name: 'ASC Administrator',
        role: 'admin',
        approval_status: 'approved',
      },
    ];

    const defaultSettings = [
      { id: 1, setting_key: 'system_name', setting_value: 'ASC Tabulation & Scoring System' },
      { id: 2, setting_key: 'organization', setting_value: 'Apayao State College' },
      { id: 3, setting_key: 'academic_year', setting_value: '2025-2026' },
    ];

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

    // 1. If Turso is configured, wipe all tables in Turso via SQL
    if (isTursoConfigured()) {
      try {
        await executeTursoBatch([
          { sql: 'DELETE FROM events' },
          { sql: 'DELETE FROM candidates' },
          { sql: 'DELETE FROM event_portions' },
          { sql: 'DELETE FROM criteria' },
          { sql: 'DELETE FROM scores' },
          { sql: 'DELETE FROM event_judges' },
          { sql: 'DELETE FROM participants_registry' },
          { sql: 'DROP TABLE IF EXISTS courses' },
          { sql: 'DELETE FROM departments' },
          { sql: 'DELETE FROM organizers' },
          { sql: 'DELETE FROM event_types' },
          { sql: 'DELETE FROM users WHERE username != "admin"' },
          { sql: 'DELETE FROM users' },
          {
            sql: 'INSERT INTO users (id, username, password, full_name, role, approval_status) VALUES (1, "admin", ?, "ASC Administrator", "admin", "approved")',
            args: [hashedAdminPw],
          },
        ]);
      } catch (tursoErr) {
        console.error('Error wiping Turso:', tursoErr);
      }
    }

    // 2. If Google Sheets is configured, use batchClear for 100% reliable atomic wipe
    const sheets = getSheetsClient();
    if (sheets && SPREADSHEET_ID) {
      try {
        await sheets.spreadsheets.values.batchClear({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            ranges: tabsToClear.map((t) => `${t}!A2:Z`),
          },
        });

        // Clear and reset users tab to admin only
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
      } catch (sheetsErr) {
        console.error('Error batchClearing Google Sheets:', sheetsErr);
      }
    }

    // 3. Clear In-Memory Store
    const mem = getMemoryStore();
    for (const tab of tabsToClear) {
      mem[tab] = [];
    }
    mem['users'] = adminUser;
    mem['system_settings'] = defaultSettings;

    return NextResponse.json({
      success: true,
      message: 'All competition records, contenders, scores, and judge assignments have been completely wiped. The system is clean and ready for manual population.',
    });
  } catch (error: any) {
    console.error('Reset database error:', error);
    return NextResponse.json({ error: error.message || 'Failed to wipe database' }, { status: 500 });
  }
}
