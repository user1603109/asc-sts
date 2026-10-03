import { NextRequest, NextResponse } from 'next/server';
import { getSheetRows } from '@/lib/googleSheets';
import { User } from '@/lib/types';
import { createSessionToken, verifyPassword } from '@/lib/auth';

// In-memory failed attempts tracker: key -> { count: number, lockedUntil: number }
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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
    const now = Date.now();

    // Check if account is currently locked out
    const attemptRecord = loginAttempts.get(normalizedUser);
    if (attemptRecord && attemptRecord.lockedUntil > now) {
      const remainingSeconds = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      return NextResponse.json(
        {
          error: `Account is temporarily locked due to 3 consecutive failed login attempts. Please wait ${remainingMinutes} minute(s) (${remainingSeconds}s) before trying again.`,
          locked: true,
          remainingSeconds,
        },
        { status: 429 }
      );
    }

    const users = await getSheetRows<User>('users');
    const user = users.find(
      (u) => u.username?.toLowerCase() === normalizedUser
    );

    if (!user) {
      // Record failed attempt
      const current = attemptRecord && attemptRecord.lockedUntil <= now
        ? { count: 0, lockedUntil: 0 }
        : (attemptRecord || { count: 0, lockedUntil: 0 });

      current.count += 1;
      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = now + LOCKOUT_DURATION_MS;
        loginAttempts.set(normalizedUser, current);
        return NextResponse.json(
          {
            error: 'Too many failed login attempts (3 failed attempts). Account is locked for 5 minutes.',
            locked: true,
            remainingSeconds: 300,
          },
          { status: 429 }
        );
      }
      loginAttempts.set(normalizedUser, current);

      return NextResponse.json(
        {
          error: `Invalid username or password. (${MAX_ATTEMPTS - current.count} attempt(s) remaining before 5-minute lockout)`,
        },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password || '');
    if (!isValid) {
      // Record failed attempt
      const current = attemptRecord && attemptRecord.lockedUntil <= now
        ? { count: 0, lockedUntil: 0 }
        : (attemptRecord || { count: 0, lockedUntil: 0 });

      current.count += 1;
      if (current.count >= MAX_ATTEMPTS) {
        current.lockedUntil = now + LOCKOUT_DURATION_MS;
        loginAttempts.set(normalizedUser, current);
        return NextResponse.json(
          {
            error: 'Too many failed login attempts (3 failed attempts). Account is locked for 5 minutes.',
            locked: true,
            remainingSeconds: 300,
          },
          { status: 429 }
        );
      }
      loginAttempts.set(normalizedUser, current);

      return NextResponse.json(
        {
          error: `Invalid username or password. (${MAX_ATTEMPTS - current.count} attempt(s) remaining before 5-minute lockout)`,
        },
        { status: 401 }
      );
    }

    // Success: clear failed attempts
    loginAttempts.delete(normalizedUser);

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
