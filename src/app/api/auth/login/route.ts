import { NextRequest, NextResponse } from 'next/server';
import { getSheetRows, getFailedLoginCount, recordFailedLogin, clearFailedLogins } from '@/lib/googleSheets';
import { User } from '@/lib/types';
import { createSessionToken, verifyPassword } from '@/lib/auth';

const MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const normalizedUser = username.trim().toLowerCase();
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

    // Check if account is currently locked out in persistent database store
    const existingFailedCount = await getFailedLoginCount(normalizedUser);
    if (existingFailedCount >= MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          error: 'Account is temporarily locked due to 3 consecutive failed login attempts. Please wait 5 minute(s) before trying again.',
          locked: true,
          remainingSeconds: 300,
        },
        { status: 429 }
      );
    }

    const users = await getSheetRows<User>('users');
    const user = users.find(
      (u) => u.username?.toLowerCase() === normalizedUser
    );

    if (!user) {
      const newCount = await recordFailedLogin(normalizedUser, clientIp);
      if (newCount >= MAX_ATTEMPTS) {
        return NextResponse.json(
          {
            error: 'Too many failed login attempts (3 failed attempts). Account is locked for 5 minutes.',
            locked: true,
            remainingSeconds: 300,
          },
          { status: 429 }
        );
      }

      const remaining = Math.max(0, MAX_ATTEMPTS - newCount);
      return NextResponse.json(
        {
          error: `Invalid username or password. (${remaining} attempt(s) remaining before 5-minute lockout)`,
        },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password || '');
    if (!isValid) {
      const newCount = await recordFailedLogin(normalizedUser, clientIp);
      if (newCount >= MAX_ATTEMPTS) {
        return NextResponse.json(
          {
            error: 'Too many failed login attempts (3 failed attempts). Account is locked for 5 minutes.',
            locked: true,
            remainingSeconds: 300,
          },
          { status: 429 }
        );
      }

      const remaining = Math.max(0, MAX_ATTEMPTS - newCount);
      return NextResponse.json(
        {
          error: `Invalid username or password. (${remaining} attempt(s) remaining before 5-minute lockout)`,
        },
        { status: 401 }
      );
    }

    // Success: clear persistent failed attempts
    await clearFailedLogins(normalizedUser);

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

    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    };

    // Role-specific cookies prevent admin and judge tabs from colliding
    if (user.role === 'admin') {
      response.cookies.set('asc_admin_token', token, cookieOptions);
    } else if (user.role === 'judge') {
      response.cookies.set('asc_judge_token', token, cookieOptions);
    }

    // Keep asc_session_token for legacy compatibility
    response.cookies.set('asc_session_token', token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
