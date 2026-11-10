import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roleHint = searchParams.get('role') as 'admin' | 'judge' | null;
  const referer = req.headers.get('referer') || '';
  const detectedRole = roleHint || (referer.includes('/admin') ? 'admin' : referer.includes('/judge') ? 'judge' : undefined);

  const user = await getCurrentUser(detectedRole);
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user });
}
