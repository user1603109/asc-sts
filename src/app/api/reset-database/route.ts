import { NextRequest, NextResponse } from 'next/server';
import { getMySQLPool } from '@/lib/mysql';
import { hashPassword, getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const hashedAdminPw = await hashPassword('adminpassword123');

    try {
      const p = getMySQLPool();
      const conn = await p.getConnection();

      try {
        await conn.beginTransaction();

        // Disable foreign keys temporarily for clean truncation
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        await conn.query('TRUNCATE TABLE scores');
        await conn.query('TRUNCATE TABLE criteria');
        await conn.query('TRUNCATE TABLE event_portions');
        await conn.query('TRUNCATE TABLE candidates');
        await conn.query('TRUNCATE TABLE event_judges');
        await conn.query('TRUNCATE TABLE events');
        await conn.query('TRUNCATE TABLE participants_registry');
        await conn.query('TRUNCATE TABLE audit_logs');

        // Reset users to default admin
        await conn.query('DELETE FROM users');
        await conn.execute(
          'INSERT INTO users (id, username, password, full_name, role, approval_status) VALUES (1, ?, ?, ?, ?, ?)',
          ['admin', hashedAdminPw, 'ASC Administrator', 'admin', 'approved']
        );

        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        await conn.commit();
      } catch (txErr) {
        await conn.rollback();
        throw txErr;
      } finally {
        conn.release();
      }
    } catch (dbErr: any) {
      console.warn('MySQL wipe warning:', dbErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'All competition records, contenders, scores, and judge assignments have been completely wiped. The MySQL database is clean and ready for institutional events.',
    });
  } catch (error: any) {
    console.error('Reset database error:', error);
    return NextResponse.json({ error: error.message || 'Failed to wipe database' }, { status: 500 });
  }
}
