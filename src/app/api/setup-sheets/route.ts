import { NextResponse } from 'next/server';
import { testMySQLConnection, initMySQLTables } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET() {
  const conn = await testMySQLConnection();
  return NextResponse.json({
    googleConfigured: false,
    mysqlConfigured: true,
    connected: conn.success,
    message: conn.message,
  });
}

export async function POST() {
  try {
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
