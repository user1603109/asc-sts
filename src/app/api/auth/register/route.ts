import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, getSheetRows } from '@/lib/googleSheets';
import { User } from '@/lib/types';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password, full_name } = await req.json();

    if (!username || !password || !full_name) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters and contain only letters, numbers, hyphens, and underscores' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    if (full_name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Full name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    const users = await getSheetRows<User>('users');
    const existing = users.find(
      (u) => u.username?.toLowerCase() === cleanUsername
    );

    if (existing) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await appendSheetRow<User>('users', {
      username: cleanUsername,
      password: hashedPassword,
      full_name: full_name.trim(),
      role: 'judge',
      approval_status: 'pending',
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Your account is pending administrator approval.',
      userId: newUser.id,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register' },
      { status: 500 }
    );
  }
}
