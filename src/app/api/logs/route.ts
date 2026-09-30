import { NextResponse } from 'next/server';
import { getSheetRows } from '@/lib/googleSheets';
import { Score, Event, Candidate, Criteria, User } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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

    const logs = scores
      .slice(-100)
      .reverse()
      .map((s) => ({
        id: s.id,
        judgeName: userMap.get(Number(s.judge_id)) || `Judge #${s.judge_id}`,
        candidateName: candMap.get(Number(s.candidate_id)) || `Candidate #${s.candidate_id}`,
        criteriaName: critMap.get(Number(s.criteria_id)) || `Criteria #${s.criteria_id}`,
        eventName: eventMap.get(Number(s.event_id)) || `Event #${s.event_id}`,
        score: s.score,
      }));

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('Fetch logs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
