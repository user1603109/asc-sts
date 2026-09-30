import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, verifyPassword } from '@/lib/auth';
import { getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { User } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, fullName, currentPassword, newPassword } = await req.json();

    const users = await getSheetRows<User>('users');
    const user = users.find((u) => Number(u.id) === Number(session.userId));
    if (!user) {
      return NextResponse.json({ error: 'User record not found' }, { status: 404 });
    }

    if (action === 'update_profile') {
      if (!fullName || !fullName.trim()) {
        return NextResponse.json({ error: 'Full name cannot be empty' }, { status: 400 });
      }

      await updateSheetRow<User>('users', user.id, {
        full_name: fullName.trim(),
      });

      return NextResponse.json({
        success: true,
        message: 'Profile name updated successfully!',
      });
    }

    if (action === 'change_password') {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      if (currentPassword) {
        const isCurrentValid = await verifyPassword(currentPassword, user.password || '');
        if (!isCurrentValid) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          );
        }
      }

      const hashedPassword = await hashPassword(newPassword);
      await updateSheetRow<User>('users', user.id, {
        password: hashedPassword,
      });

      return NextResponse.json({
        success: true,
        message: 'Password changed successfully!',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
