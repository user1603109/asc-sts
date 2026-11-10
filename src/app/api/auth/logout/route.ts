import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  const referer = req.headers.get('referer') || '';

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  if (role === 'admin' || referer.includes('/admin')) {
    response.cookies.delete('asc_admin_token');
  } else if (role === 'judge' || referer.includes('/judge')) {
    response.cookies.delete('asc_judge_token');
  } else {
    response.cookies.delete('asc_admin_token');
    response.cookies.delete('asc_judge_token');
  }

  // Also clean up general session token
  response.cookies.delete('asc_session_token');

  return response;
}
