import { NextRequest, NextResponse } from 'next/server';
import { deleteSheetRow, getRowById, updateSheetRow } from '@/lib/googleSheets';
import { Event } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = Number(params.id);
    const event = await getRowById<Event>('events', eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch event' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const eventId = Number(params.id);
    const updates = await req.json();

    const success = await updateSheetRow<Event>('events', eventId, updates);
    if (!success) {
      return NextResponse.json({ error: 'Event not found or failed to update' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Event updated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const eventId = Number(params.id);
    const success = await deleteSheetRow('events', eventId);
    if (!success) {
      return NextResponse.json({ error: 'Event not found or failed to delete' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Event deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete event' }, { status: 500 });
  }
}
