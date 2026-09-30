import { NextRequest, NextResponse } from 'next/server';
import { getSheetRows } from '@/lib/googleSheets';
import { User } from '@/lib/types';
import { createSessionToken, verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const users = await getSheetRows<User>('users');
    const user = users.find(
      (u) => u.username?.toLowerCase() === username.trim().toLowerCase()
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password || '');
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    if (user.role === 'judge') {
      if (user.approval_status === 'pending') {
        return NextResponse.json(
          { error: 'Your judge account is pending approval by the administrator.' },
          { status: 403 }
        );
      }
      if (user.approval_status === 'rejected' || user.approval_status === 'suspended') {
        return NextResponse.json(
          { error: `Your account is ${user.approval_status}. Please contact the administrator.` },
          { status: 403 }
        );
      }
    }

    const token = await createSessionToken(user);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    });

    response.cookies.set('asc_session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
