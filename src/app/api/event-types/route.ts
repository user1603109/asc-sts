import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { EventType } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const types = await getSheetRows<EventType>('event_types');
    return NextResponse.json(types);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { type_name } = await req.json();
    if (!type_name || !type_name.trim()) {
      return NextResponse.json({ error: 'type_name is required' }, { status: 400 });
    }

    const newType = await appendSheetRow<EventType>('event_types', {
      type_name: type_name.trim(),
    });
    return NextResponse.json({ success: true, eventType: newType });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id, type_name } = await req.json();
    const updated = await updateSheetRow<EventType>('event_types', Number(id), {
      type_name: type_name.trim(),
    });
    return NextResponse.json({ success: true, eventType: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await deleteSheetRow('event_types', Number(id));
    return NextResponse.json({ success: true, message: 'Type deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
