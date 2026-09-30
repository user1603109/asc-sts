import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, getSheetRows } from '@/lib/googleSheets';
import { Candidate, Event, EventJudge, EventPortion } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const judgeId = searchParams.get('judgeId');

    const [events, candidates, eventJudges, portions] = await Promise.all([
      getSheetRows<Event>('events'),
      getSheetRows<Candidate>('candidates'),
      getSheetRows<EventJudge>('event_judges'),
      getSheetRows<EventPortion>('event_portions'),
    ]);

    let filteredEvents = events;
    if (judgeId) {
      const assignedEventIds = eventJudges
        .filter((ej) => Number(ej.user_id) === Number(judgeId))
        .map((ej) => Number(ej.event_id));
      filteredEvents = events.filter((e) => assignedEventIds.includes(Number(e.id)));
    }

    const enhancedEvents = filteredEvents.map((evt) => {
      const eventCandidates = candidates.filter((c) => Number(c.event_id) === Number(evt.id));
      const judgesAssigned = eventJudges.filter((ej) => Number(ej.event_id) === Number(evt.id));
      const eventPortions = portions.filter((p) => Number(p.event_id) === Number(evt.id));

      return {
        ...evt,
        candidatesCount: eventCandidates.length,
        judgesCount: judgesAssigned.length,
        portionsCount: eventPortions.length,
      };
    });

    return NextResponse.json(enhancedEvents);
  } catch (error: any) {
    console.error('Fetch events error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, type, participation_mode, department, organizer, academic_year, start_date, end_date, status } = body;

    if (!name || !type || !start_date || !end_date) {
      return NextResponse.json({ error: 'Required fields missing: name, type, start_date, end_date' }, { status: 400 });
    }

    const newEvent = await appendSheetRow<Event>('events', {
      name,
      description: description || '',
      type,
      participation_mode: participation_mode || 'Individual',
      department: department || '',
      organizer: organizer || '',
      academic_year: academic_year || '2025-2026',
      start_date,
      end_date,
      status: status || 'Upcoming',
    });

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error: any) {
    console.error('Create event error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create event' }, { status: 500 });
  }
}
