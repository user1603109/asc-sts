import { NextResponse } from 'next/server';
import { testMySQLConnection, initMySQLTables } from '@/lib/mysql';

export const dynamic = 'force-dynamic';

export async function GET() {
  const conn = await testMySQLConnection();
  return NextResponse.json({
    configured: true,
    connected: conn.success,
    message: conn.message,
    version: conn.version,
  });
}

export async function POST() {
  try {
    await initMySQLTables();
    return NextResponse.json({
      success: true,
      message: 'All 13 tables verified and initialized in MySQL cloud/Hostinger database!',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to initialize MySQL database' },
      { status: 500 }
    );
  }
}
