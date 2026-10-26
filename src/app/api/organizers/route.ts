import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { Organizer } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

function formatOrganizerName(first_name?: string, middle_name?: string, surname?: string, legacyName?: string): string {
  if (first_name && surname) {
    const mid = middle_name?.trim() ? ` ${middle_name.trim()} ` : ' ';
    return `${first_name.trim()}${mid}${surname.trim()}`.replace(/\s+/g, ' ');
  }
  return legacyName?.trim() || '';
}

export async function GET() {
  try {
    const rawOrganizers = await getSheetRows<Organizer>('organizers');
    const organizers = rawOrganizers.map((o) => {
      const computedName = formatOrganizerName(o.first_name, o.middle_name, o.surname, o.organizer_name);
      return {
        ...o,
        first_name: o.first_name || '',
        middle_name: o.middle_name || '',
        surname: o.surname || '',
        organizer_name: computedName || o.organizer_name || 'Organizer',
      };
    });
    return NextResponse.json(organizers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await req.json();
    const first_name = (body.first_name || '').trim();
    const middle_name = (body.middle_name || '').trim();
    const surname = (body.surname || '').trim();

    // Support legacy payload if organizer_name passed
    let fullName = formatOrganizerName(first_name, middle_name, surname, body.organizer_name);
    if (!first_name && !surname && body.organizer_name) {
      const parts = body.organizer_name.trim().split(/\s+/);
      const fName = parts[0] || '';
      const sName = parts.slice(1).join(' ') || parts[0];
      fullName = body.organizer_name.trim();
      const newOrg = await appendSheetRow<Organizer>('organizers', {
        first_name: fName,
        middle_name: '',
        surname: sName,
        organizer_name: fullName,
      });
      return NextResponse.json({ success: true, organizer: newOrg });
    }

    if (!first_name || !surname) {
      return NextResponse.json({ error: 'First Name and Surname are required' }, { status: 400 });
    }

    const newOrg = await appendSheetRow<Organizer>('organizers', {
      first_name,
      middle_name,
      surname,
      organizer_name: fullName,
    });
    return NextResponse.json({ success: true, organizer: newOrg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Organizer ID is required' }, { status: 400 });

    const first_name = (body.first_name || '').trim();
    const middle_name = (body.middle_name || '').trim();
    const surname = (body.surname || '').trim();

    if (!first_name || !surname) {
      return NextResponse.json({ error: 'First Name and Surname are required' }, { status: 400 });
    }

    const fullName = formatOrganizerName(first_name, middle_name, surname);

    const updated = await updateSheetRow<Organizer>('organizers', Number(id), {
      first_name,
      middle_name,
      surname,
      organizer_name: fullName,
    });
    return NextResponse.json({ success: true, organizer: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await deleteSheetRow('organizers', Number(id));
    return NextResponse.json({ success: true, message: 'Organizer deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
