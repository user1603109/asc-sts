import { NextRequest, NextResponse } from 'next/server';
import { testMySQLConnection, initMySQLTables } from '@/lib/mysql';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const conn = await testMySQLConnection();
  return NextResponse.json({
    databaseConfigured: true,
    mysqlConfigured: true,
    connected: conn.success,
    message: conn.message,
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    await initMySQLTables();
    return NextResponse.json({
      success: true,
      message: 'MySQL tables verified and initialized successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initialize database' },
      { status: 500 }
    );
  }
}
