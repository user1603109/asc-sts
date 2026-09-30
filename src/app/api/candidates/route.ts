import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { Candidate, Course, ParticipantRegistry } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    const [candidates, courses] = await Promise.all([
      getSheetRows<Candidate>('candidates'),
      getSheetRows<Course>('courses'),
    ]);

    let filtered = candidates;
    if (eventId) {
      filtered = candidates.filter((c) => Number(c.event_id) === Number(eventId));
    }

    filtered.sort((a, b) => (Number(a.order_number) || 0) - (Number(b.order_number) || 0));

    const enriched = filtered.map((c) => {
      const course = courses.find((co) => Number(co.id) === Number(c.course_id));
      return {
        ...c,
        course_name: course ? course.course_name : '',
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    console.error('Fetch candidates error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch candidates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();

    // Support sync_roster action matching ASTS/admin/enlistment.php
    if (body.action === 'sync_roster') {
      const { event_id, registry_ids } = body;
      if (!event_id || !Array.isArray(registry_ids)) {
        return NextResponse.json({ error: 'event_id and registry_ids array are required' }, { status: 400 });
      }

      const [existingCandidates, registry] = await Promise.all([
        getSheetRows<Candidate>('candidates'),
        getSheetRows<ParticipantRegistry>('participants_registry'),
      ]);

      const currentEventCandidates = existingCandidates.filter((c) => Number(c.event_id) === Number(event_id));
      const currentRegistryIds = currentEventCandidates.map((c) => Number(c.registry_id)).filter(Boolean);

      // Remove candidates no longer selected
      const toRemove = currentEventCandidates.filter(
        (c) => c.registry_id && !registry_ids.map(Number).includes(Number(c.registry_id))
      );
      for (const cand of toRemove) {
        await deleteSheetRow('candidates', cand.id);
      }

      // Add newly selected participants
      const toAddIds = registry_ids.map(Number).filter((id) => !currentRegistryIds.includes(id));
      let nextOrder = currentEventCandidates.length > 0 
        ? Math.max(...currentEventCandidates.map((c) => Number(c.order_number) || 0)) + 1 
        : 1;

      for (const regId of toAddIds) {
        const participant = registry.find((p) => Number(p.id) === regId);
        if (participant) {
          await appendSheetRow<Candidate>('candidates', {
            event_id: Number(event_id),
            registry_id: participant.id,
            name: participant.name,
            course_id: participant.course_id ? Number(participant.course_id) : null,
            year_level: participant.year_level || '',
            image_path: participant.image_path || '',
            order_number: nextOrder++,
          });
        }
      }

      return NextResponse.json({ success: true, message: 'Roster synced successfully' });
    }

    const { event_id, name, image_path, course_id, year_level, order_number, registry_id } = body;

    if (!event_id || !name) {
      return NextResponse.json({ error: 'event_id and name are required' }, { status: 400 });
    }

    const newCandidate = await appendSheetRow<Candidate>('candidates', {
      event_id: Number(event_id),
      name: name.trim(),
      image_path: image_path || '',
      course_id: course_id ? Number(course_id) : null,
      year_level: year_level || '',
      order_number: Number(order_number) || 1,
      registry_id: registry_id ? Number(registry_id) : null,
    });

    return NextResponse.json({ success: true, candidate: newCandidate });
  } catch (error: any) {
    console.error('Create candidate error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add candidate' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, image_path, course_id, year_level, order_number } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }

    const updated = await updateSheetRow<Candidate>('candidates', Number(id), {
      name: name.trim(),
      image_path: image_path || '',
      course_id: course_id ? Number(course_id) : null,
      year_level: year_level || '',
      order_number: Number(order_number) || 1,
    });

    return NextResponse.json({ success: true, candidate: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteSheetRow('candidates', Number(id));
    return NextResponse.json({ success: true, message: 'Candidate deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
