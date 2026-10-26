import { NextRequest, NextResponse } from 'next/server';
import { isTursoConfigured, initTursoTables, executeTurso } from '@/lib/turso';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configured = isTursoConfigured();
    if (!configured) {
      return NextResponse.json({
        configured: false,
        message: 'Turso environment variables (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN) are not set yet.',
      });
    }

    // Test querying sqlite_master
    const res = await executeTurso("SELECT count(*) as count FROM sqlite_master WHERE type='table'");
    const tableCount = Number(res.rows[0]?.count || 0);

    return NextResponse.json({
      configured: true,
      message: 'Turso LibSQL Cloud Database is connected and active!',
      tablesCount: tableCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        configured: true,
        error: error.message || 'Failed to connect to Turso',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    if (!isTursoConfigured()) {
      return NextResponse.json(
        { error: 'Turso environment variables (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN) are not configured.' },
        { status: 400 }
      );
    }

    await initTursoTables();

    return NextResponse.json({
      success: true,
      message: 'All 13 tables created and baseline seeds initialized in Turso cloud database!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to initialize Turso database' },
      { status: 500 }
    );
  }
}
