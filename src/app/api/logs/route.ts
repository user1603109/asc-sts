import { NextRequest, NextResponse } from 'next/server';
import { getSheetRows, setSheetRows } from '@/lib/googleSheets';
import { Score, Event, Candidate, Criteria, User } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit') || '50';
    const eventIdParam = searchParams.get('eventId');
    const pageParam = parseInt(searchParams.get('page') || '1', 10);

    const [scores, events, candidates, criteriaList, users] = await Promise.all([
      getSheetRows<Score>('scores'),
      getSheetRows<Event>('events'),
      getSheetRows<Candidate>('candidates'),
      getSheetRows<Criteria>('criteria'),
      getSheetRows<User>('users'),
    ]);

    const eventMap = new Map(events.map((e) => [Number(e.id), e.name]));
    const candMap = new Map(candidates.map((c) => [Number(c.id), c.name]));
    const critMap = new Map(criteriaList.map((cr) => [Number(cr.id), cr.name]));
    const userMap = new Map(users.map((u) => [Number(u.id), u.full_name || u.username]));

    let filtered = scores;
    if (eventIdParam && eventIdParam !== 'all') {
      filtered = filtered.filter((s) => Number(s.event_id) === Number(eventIdParam));
    }

    const totalCount = filtered.length;

    // Sort descending by id (latest scores first)
    const sorted = [...filtered].sort((a, b) => Number(b.id) - Number(a.id));

    let paginated = sorted;
    if (limitParam !== 'all') {
      const limit = parseInt(limitParam, 10) || 50;
      const start = (pageParam - 1) * limit;
      paginated = sorted.slice(start, start + limit);
    }

    const logs = paginated.map((s) => ({
      id: s.id,
      judgeName: userMap.get(Number(s.judge_id)) || `Judge #${s.judge_id}`,
      candidateName: candMap.get(Number(s.candidate_id)) || `Candidate #${s.candidate_id}`,
      criteriaName: critMap.get(Number(s.criteria_id)) || `Criteria #${s.criteria_id}`,
      eventName: eventMap.get(Number(s.event_id)) || `Event #${s.event_id}`,
      score: s.score,
    }));

    return NextResponse.json({
      logs,
      totalCount,
      limit: limitParam,
      page: pageParam,
    });
  } catch (error: any) {
    console.error('Fetch logs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Reset scores table
    await setSheetRows('scores', []);

    return NextResponse.json({
      success: true,
      message: 'All scores and audit log transactions have been successfully cleared and reset.',
    });
  } catch (error: any) {
    console.error('Clear logs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
