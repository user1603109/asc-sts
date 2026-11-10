import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { Candidate, Event, EventJudge, EventPortion } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
    const user = await getCurrentUser('admin');
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, type, participation_mode, department, organizer, academic_year, start_date, end_date, status } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Competition name is required' }, { status: 400 });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const cleanStartDate = start_date && String(start_date).trim() ? String(start_date).trim() : todayStr;
    const cleanEndDate = end_date && String(end_date).trim() ? String(end_date).trim() : cleanStartDate;

    // Normalize participation mode to DB enum ('Individual' | 'Team')
    const modeStr = String(participation_mode || '').toLowerCase();
    const cleanMode = modeStr.includes('team') || modeStr.includes('group') ? 'Team' : 'Individual';

    // Normalize status to DB enum ('Upcoming' | 'Ongoing' | 'Tabulating' | 'Completed')
    const allowedStatuses = ['Upcoming', 'Ongoing', 'Tabulating', 'Completed'];
    const cleanStatus = allowedStatuses.includes(status) ? status : 'Upcoming';

    const newEvent = await appendSheetRow<Event>('events', {
      name: name.trim(),
      description: (description || '').trim(),
      type: (type || 'Pageant').trim(),
      participation_mode: cleanMode as any,
      department: (department || '').trim(),
      organizer: (organizer || '').trim(),
      academic_year: (academic_year || '2025-2026').trim(),
      start_date: cleanStartDate,
      end_date: cleanEndDate,
      status: cleanStatus as any,
    });

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error: any) {
    console.error('Create event error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create event' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser('admin');
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { id, participation_mode, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const cleanUpdates: any = { ...updates };
    if (participation_mode !== undefined) {
      const modeStr = String(participation_mode || '').toLowerCase();
      cleanUpdates.participation_mode = modeStr.includes('team') || modeStr.includes('group') ? 'Team' : 'Individual';
    }

    const updated = await updateSheetRow<Event>('events', Number(id), cleanUpdates);
    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    console.error('Update event error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser('admin');
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteSheetRow('events', Number(id));
    return NextResponse.json({ success: true, message: 'Event deleted' });
  } catch (error: any) {
    console.error('Delete event error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete event' }, { status: 500 });
  }
}

