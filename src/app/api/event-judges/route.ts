import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows } from '@/lib/googleSheets';
import { EventJudge, User } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    const [eventJudges, users] = await Promise.all([
      getSheetRows<EventJudge>('event_judges'),
      getSheetRows<User>('users'),
    ]);

    let filtered = eventJudges;
    if (eventId) {
      filtered = eventJudges.filter((ej) => Number(ej.event_id) === Number(eventId));
    }

    const userMap = new Map(users.map((u) => [Number(u.id), u]));

    const enriched = filtered.map((ej) => {
      const u = userMap.get(Number(ej.user_id));
      return {
        ...ej,
        full_name: u?.full_name || '',
        username: u?.username || '',
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { event_id, judge_ids } = body;

    if (!event_id || !Array.isArray(judge_ids)) {
      return NextResponse.json({ error: 'event_id and judge_ids array are required' }, { status: 400 });
    }

    const currentJudges = await getSheetRows<EventJudge>('event_judges');
    const thisEventJudges = currentJudges.filter((ej) => Number(ej.event_id) === Number(event_id));
    const targetJudgeIds = new Set(judge_ids.filter(Boolean).map(Number));

    // Remove unselected judges
    for (const ej of thisEventJudges) {
      if (!targetJudgeIds.has(Number(ej.user_id))) {
        await deleteSheetRow('event_judges', Number(ej.id));
      }
    }

    // Add newly selected judges
    const existingUserIds = new Set(thisEventJudges.map((ej) => Number(ej.user_id)));
    for (const jid of targetJudgeIds) {
      if (!existingUserIds.has(jid)) {
        await appendSheetRow<EventJudge>('event_judges', {
          event_id: Number(event_id),
          user_id: Number(jid),
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Judges assigned successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
