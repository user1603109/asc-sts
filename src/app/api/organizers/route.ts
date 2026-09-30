import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { Organizer } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const organizers = await getSheetRows<Organizer>('organizers');
    return NextResponse.json(organizers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { organizer_name } = await req.json();
    if (!organizer_name || !organizer_name.trim()) {
      return NextResponse.json({ error: 'organizer_name is required' }, { status: 400 });
    }

    const newOrg = await appendSheetRow<Organizer>('organizers', {
      organizer_name: organizer_name.trim(),
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

    const { id, organizer_name } = await req.json();
    const updated = await updateSheetRow<Organizer>('organizers', Number(id), {
      organizer_name: organizer_name.trim(),
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
    await deleteSheetRow('organizers', Number(id));
    return NextResponse.json({ success: true, message: 'Organizer deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
