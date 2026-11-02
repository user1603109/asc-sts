import { NextResponse } from 'next/server';
import { getSheetRows } from '@/lib/googleSheets';
import { SHEET_SCHEMAS } from '@/lib/schemas';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Administrator access required to export backups' }, { status: 403 });
    }

    const backup: Record<string, any[]> = {};
    const tableNames = Object.keys(SHEET_SCHEMAS);

    await Promise.all(
      tableNames.map(async (table) => {
        try {
          const rows = await getSheetRows(table);
          if (table === 'users') {
            // Mask password hashes to prevent credential leakage
            backup[table] = rows.map((u: any) => ({
              ...u,
              password: '[PROTECTED_HASH]',
            }));
          } else {
            backup[table] = rows;
          }
        } catch (e) {
          backup[table] = [];
        }
      })
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `asc-asts-backup-${timestamp}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
