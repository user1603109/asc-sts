import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { EventPortion } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    const portions = await getSheetRows<EventPortion>('event_portions');
    let filtered = portions;
    if (eventId) {
      filtered = portions.filter((p) => Number(p.event_id) === Number(eventId));
    }
    filtered.sort((a, b) => (Number(a.order_number) || 0) - (Number(b.order_number) || 0));

    return NextResponse.json(filtered);
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
    const { event_id, portion_name, percentage, order_number, status } = body;

    if (!event_id || !portion_name) {
      return NextResponse.json({ error: 'event_id and portion_name are required' }, { status: 400 });
    }

    const newPortion = await appendSheetRow<EventPortion>('event_portions', {
      event_id: Number(event_id),
      portion_name: portion_name.trim(),
      percentage: Number(percentage) || 0,
      order_number: Number(order_number) || 1,
      status: status || 'Upcoming',
    });

    return NextResponse.json({ success: true, portion: newPortion });
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
    const { id, portion_name, percentage, order_number, status } = body;

    if (!id || !portion_name) {
      return NextResponse.json({ error: 'id and portion_name are required' }, { status: 400 });
    }

    const updated = await updateSheetRow<EventPortion>('event_portions', Number(id), {
      portion_name: portion_name.trim(),
      percentage: Number(percentage) || 0,
      order_number: Number(order_number) || 1,
      status: status || 'Upcoming',
    });

    return NextResponse.json({ success: true, portion: updated });
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

    await deleteSheetRow('event_portions', Number(id));
    return NextResponse.json({ success: true, message: 'Portion deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
