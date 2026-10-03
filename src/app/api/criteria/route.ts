import { appendSheetRow, deleteSheetRow, getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { Criteria, EventPortion } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');

    const [portions, criteriaList] = await Promise.all([
      getSheetRows<EventPortion>('event_portions'),
      getSheetRows<Criteria>('criteria'),
    ]);

    let filteredPortions = portions;
    let filteredCriteria = criteriaList;

    if (eventId) {
      filteredPortions = portions.filter((p) => Number(p.event_id) === Number(eventId));
      filteredCriteria = criteriaList.filter((c) => Number(c.event_id) === Number(eventId));
    }

    filteredPortions.sort((a, b) => (Number(a.order_number) || 0) - (Number(b.order_number) || 0));

    return NextResponse.json({
      portions: filteredPortions,
      criteria: filteredCriteria,
    });
  } catch (error: any) {
    console.error('Fetch criteria error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch criteria' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { itemType } = body; // 'portion' or 'criteria'

    if (itemType === 'portion') {
      const { event_id, portion_name, percentage, order_number, status } = body;
      const newPortion = await appendSheetRow<EventPortion>('event_portions', {
        event_id: Number(event_id),
        portion_name: (portion_name || '').trim(),
        percentage: Number(percentage) || 0,
        order_number: Number(order_number) || 1,
        status: status || 'Upcoming',
      });
      return NextResponse.json({ success: true, item: newPortion });
    } else {
      const { event_id, portion_id, name, max_score, percentage } = body;
      const newCriteria = await appendSheetRow<Criteria>('criteria', {
        event_id: Number(event_id),
        portion_id: portion_id ? Number(portion_id) : null,
        name: (name || '').trim(),
        max_score: Number(max_score) || 100,
        percentage: Number(percentage) || 100,
      });
      return NextResponse.json({ success: true, item: newCriteria });
    }
  } catch (error: any) {
    console.error('Create criteria error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create item' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { itemType, id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (itemType === 'portion') {
      const { portion_name, percentage, order_number, status } = body;
      const updated = await updateSheetRow<EventPortion>('event_portions', Number(id), {
        ...(portion_name ? { portion_name: portion_name.trim() } : {}),
        ...(percentage !== undefined ? { percentage: Number(percentage) } : {}),
        ...(order_number !== undefined ? { order_number: Number(order_number) } : {}),
        ...(status ? { status } : {}),
      });
      return NextResponse.json({ success: true, item: updated });
    } else {
      const { name, max_score, percentage, portion_id } = body;
      const updated = await updateSheetRow<Criteria>('criteria', Number(id), {
        ...(name ? { name: name.trim() } : {}),
        ...(max_score !== undefined ? { max_score: Number(max_score) } : {}),
        ...(percentage !== undefined ? { percentage: Number(percentage) } : {}),
        ...(portion_id !== undefined ? { portion_id: portion_id ? Number(portion_id) : null } : {}),
      });
      return NextResponse.json({ success: true, item: updated });
    }
  } catch (error: any) {
    console.error('Update criteria error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update item' }, { status: 500 });
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
    const itemType = searchParams.get('itemType') || 'criteria';

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const table = itemType === 'portion' ? 'event_portions' : 'criteria';
    await deleteSheetRow(table, Number(id));

    return NextResponse.json({ success: true, message: `${itemType} deleted successfully` });
  } catch (error: any) {
    console.error('Delete criteria error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete item' }, { status: 500 });
  }
}

