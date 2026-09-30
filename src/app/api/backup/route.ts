import { NextResponse } from 'next/server';
import { getSheetRows } from '@/lib/googleSheets';
import { SHEET_SCHEMAS } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const backup: Record<string, any[]> = {};
    const tableNames = Object.keys(SHEET_SCHEMAS);

    await Promise.all(
      tableNames.map(async (table) => {
        try {
          const rows = await getSheetRows(table);
          backup[table] = rows;
        } catch (e) {
          backup[table] = [];
        }
      })
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `asc-sts-backup-${timestamp}.json`;

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
