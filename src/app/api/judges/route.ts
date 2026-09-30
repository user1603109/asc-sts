import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { EventJudge, User } from '@/lib/types';
import { getCurrentUser, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    const [users, eventJudges] = await Promise.all([
      getSheetRows<User>('users'),
      getSheetRows<EventJudge>('event_judges'),
    ]);

    const judges = users.filter((u) => u.role === 'judge').map((j) => {
      const assigned = eventJudges.filter((ej) => Number(ej.user_id) === Number(j.id));
      return {
        id: j.id,
        username: j.username,
        full_name: j.full_name,
        approval_status: j.approval_status,
        assignedEventIds: assigned.map((a) => Number(a.event_id)),
      };
    });

    if (eventId) {
      const eventJudgeIds = eventJudges
        .filter((ej) => Number(ej.event_id) === Number(eventId))
        .map((ej) => Number(ej.user_id));
      
      const assignedToEvent = judges.filter((j) => eventJudgeIds.includes(Number(j.id)));
      return NextResponse.json(assignedToEvent);
    }

    return NextResponse.json(judges);
  } catch (error: any) {
    console.error('Fetch judges error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch judges' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. Update status (approve / reject / suspend)
    if (action === 'update_status') {
      const { judgeId, status } = body;
      await updateSheetRow<User>('users', Number(judgeId), {
        approval_status: status,
      });
      return NextResponse.json({ success: true, message: `Judge status updated to ${status}` });
    }

    // 2. Assign judge to event
    if (action === 'assign_event') {
      const { judgeId, eventId } = body;
      const eventJudges = await getSheetRows<EventJudge>('event_judges');
      const alreadyAssigned = eventJudges.some(
        (ej) => Number(ej.user_id) === Number(judgeId) && Number(ej.event_id) === Number(eventId)
      );

      if (!alreadyAssigned) {
        await appendSheetRow<EventJudge>('event_judges', {
          event_id: Number(eventId),
          user_id: Number(judgeId),
        });
      }
      return NextResponse.json({ success: true, message: 'Judge assigned to event' });
    }

    // 3. Unassign judge from event
    if (action === 'unassign_event') {
      const { judgeId, eventId } = body;
      const eventJudges = await getSheetRows<EventJudge>('event_judges');
      const assignment = eventJudges.find(
        (ej) => Number(ej.user_id) === Number(judgeId) && Number(ej.event_id) === Number(eventId)
      );

      if (assignment) {
        await deleteSheetRow('event_judges', Number(assignment.id));
      }
      return NextResponse.json({ success: true, message: 'Judge unassigned from event' });
    }

    // 4. Reset judge password matching ASTS/admin/judges.php
    if (action === 'reset_password') {
      const { judgeId, newPassword } = body;
      const hashedPassword = await hashPassword(newPassword || '12345678');
      await updateSheetRow<User>('users', Number(judgeId), {
        password: hashedPassword,
      });
      return NextResponse.json({ success: true, message: 'Judge password reset successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Judge action error:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
