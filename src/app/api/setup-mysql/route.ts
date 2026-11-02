import { NextRequest, NextResponse } from 'next/server';
import { testMySQLConnection, initMySQLTables, isMySQLConfigured } from '@/lib/mysql';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configured = isMySQLConfigured();
    const connTest = await testMySQLConnection();

    return NextResponse.json({
      configured,
      connected: connTest.success,
      message: connTest.message,
      version: connTest.version || null,
      host: process.env.MYSQL_HOST || 'localhost',
      database: process.env.MYSQL_DATABASE || 'asts_db',
    });
  } catch (error: any) {
    return NextResponse.json({
      configured: false,
      connected: false,
      error: error.message || 'Error checking MySQL database connection',
    }, { status: 500 });
  }
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
      message: 'All 13 MySQL tables verified and baseline seeds initialized successfully for Hostinger!',
    });
  } catch (error: any) {
    console.error('Setup MySQL error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initialize MySQL database' },
      { status: 500 }
    );
  }
}

