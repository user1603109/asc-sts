import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { ParticipantRegistry, Course } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const [participants, courses] = await Promise.all([
      getSheetRows<ParticipantRegistry>('participants_registry'),
      getSheetRows<Course>('courses'),
    ]);

    const courseMap = new Map(courses.map((c) => [Number(c.id), c.course_name]));

    const enriched = participants.map((p) => ({
      ...p,
      course_name: courseMap.get(Number(p.course_id)) || '',
    }));

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

    // Check if bulk insert (e.g. from CSV import)
    if (Array.isArray(body)) {
      const added: any[] = [];
      for (const item of body) {
        if (item.name && item.name.trim()) {
          const row = await appendSheetRow<ParticipantRegistry>('participants_registry', {
            name: item.name.trim(),
            course_id: item.course_id ? Number(item.course_id) : null,
            year_level: item.year_level || '',
            image_path: item.image_path || '',
          });
          added.push(row);
        }
      }
      return NextResponse.json({ success: true, count: added.length, participants: added });
    }

    const { name, course_id, year_level, image_path } = body;
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Participant name is required' }, { status: 400 });
    }

    const newParticipant = await appendSheetRow<ParticipantRegistry>('participants_registry', {
      name: name.trim(),
      course_id: course_id ? Number(course_id) : null,
      year_level: year_level || '',
      image_path: image_path || '',
    });

    return NextResponse.json({ success: true, participant: newParticipant });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, course_id, year_level, image_path } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
    }

    const updated = await updateSheetRow<ParticipantRegistry>('participants_registry', Number(id), {
      name: name.trim(),
      course_id: course_id ? Number(course_id) : null,
      year_level: year_level || '',
      image_path: image_path || '',
    });

    return NextResponse.json({ success: true, participant: updated });
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
    const ids = searchParams.get('ids');

    if (ids) {
      // Bulk delete
      const idList = ids.split(',').map((x) => Number(x.trim())).filter((x) => !isNaN(x));
      for (const singleId of idList) {
        await deleteSheetRow('participants_registry', singleId);
      }
      return NextResponse.json({ success: true, deletedCount: idList.length });
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteSheetRow('participants_registry', Number(id));
    return NextResponse.json({ success: true, message: 'Participant deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
