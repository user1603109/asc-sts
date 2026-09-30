import { NextRequest, NextResponse } from 'next/server';
import { getRowById, getSheetRows } from '@/lib/googleSheets';
import { Candidate, Course, Criteria, Event, EventJudge, EventPortion, Score, User } from '@/lib/types';
import { computeTabulation } from '@/lib/tabulation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventIdStr = searchParams.get('eventId');

    if (!eventIdStr) {
      return NextResponse.json({ error: 'eventId query parameter is required' }, { status: 400 });
    }

    const eventId = Number(eventIdStr);

    const [event, candidates, portions, criteriaList, scores, eventJudges, users, courses] = await Promise.all([
      getRowById<Event>('events', eventId),
      getSheetRows<Candidate>('candidates'),
      getSheetRows<EventPortion>('event_portions'),
      getSheetRows<Criteria>('criteria'),
      getSheetRows<Score>('scores'),
      getSheetRows<EventJudge>('event_judges'),
      getSheetRows<User>('users'),
      getSheetRows<Course>('courses'),
    ]);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventCandidates = candidates
      .filter((c) => Number(c.event_id) === eventId)
      .map((c) => {
        const course = courses.find((co) => Number(co.id) === Number(c.course_id));
        return {
          ...c,
          course_name: course ? course.course_name : '',
        };
      });

    const eventPortions = portions.filter((p) => Number(p.event_id) === eventId);
    const eventCriteria = criteriaList.filter((c) => Number(c.event_id) === eventId);
    const eventScores = scores.filter((s) => Number(s.event_id) === eventId);

    const assignedJudgeIds = eventJudges
      .filter((ej) => Number(ej.event_id) === eventId)
      .map((ej) => Number(ej.user_id));

    const assignedJudges = users.filter((u) => assignedJudgeIds.includes(Number(u.id)));

    const tabulations = computeTabulation(
      eventCandidates,
      eventPortions,
      eventCriteria,
      eventScores,
      assignedJudges
    );

    return NextResponse.json({
      event,
      portions: eventPortions,
      criteria: eventCriteria,
      judges: assignedJudges.map((j) => ({ id: j.id, full_name: j.full_name, username: j.username })),
      tabulations,
    });
  } catch (error: any) {
    console.error('Tabulation calculation error:', error);
    return NextResponse.json({ error: error.message || 'Tabulation calculation failed' }, { status: 500 });
  }
}
