import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows, setSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { ParticipantRegistry, Department } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [participants, departments] = await Promise.all([
      getSheetRows<ParticipantRegistry>('participants_registry'),
      getSheetRows<Department>('departments'),
    ]);

    const deptMap = new Map(departments.map((d) => [Number(d.id), d.department_name]));

    const enriched = participants.map((p) => {
      const deptName =
        p.department ||
        (p.department_id ? deptMap.get(Number(p.department_id)) : '') ||
        (p.course_id ? deptMap.get(Number(p.course_id)) : '') ||
        p.course_name ||
        '';
      return {
        ...p,
        department: deptName,
        course_name: deptName, // backward compat
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

    // Check if bulk insert (e.g. from CSV import)
    if (Array.isArray(body)) {
      const existing = await getSheetRows<ParticipantRegistry>('participants_registry');
      let maxId = existing.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
      const toAppend: any[] = [];
      for (const item of body) {
        if (item.name && item.name.trim()) {
          toAppend.push({
            id: ++maxId,
            name: item.name.trim(),
            department: (item.department || item.course_name || '').trim(),
            year_level: item.year_level || '',
            image_path: item.image_path || '',
          });
        }
      }
      await setSheetRows('participants_registry', [...existing, ...toAppend]);
      return NextResponse.json({ success: true, count: toAppend.length, participants: toAppend });
    }

    const { name, department, course_name, year_level, image_path } = body;
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Participant name is required' }, { status: 400 });
    }

    const newParticipant = await appendSheetRow<ParticipantRegistry>('participants_registry', {
      name: name.trim(),
      department: (department || course_name || '').trim(),
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
    const { id, name, department, course_name, year_level, image_path } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
    }

    const updated = await updateSheetRow<ParticipantRegistry>('participants_registry', Number(id), {
      name: name.trim(),
      department: (department || course_name || '').trim(),
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
