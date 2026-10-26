import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows, setSheetRows, updateSheetRow } from '@/lib/googleSheets';
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
    const { itemType } = body;

    // 1. APPLY PRESET (APPEND OR OVERWRITE)
    if (itemType === 'preset') {
      const { event_id, segments, overwrite } = body;
      if (!event_id || !Array.isArray(segments)) {
        return NextResponse.json({ error: 'event_id and segments are required' }, { status: 400 });
      }

      const [existingPortions, existingCriteria] = await Promise.all([
        getSheetRows<EventPortion>('event_portions'),
        getSheetRows<Criteria>('criteria'),
      ]);

      let newPortions = existingPortions;
      let newCriteria = existingCriteria;

      if (overwrite) {
        newPortions = newPortions.filter((p) => Number(p.event_id) !== Number(event_id));
        newCriteria = newCriteria.filter((c) => Number(c.event_id) !== Number(event_id));
      }

      let nextPortionId = newPortions.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) + 1;
      let nextCriteriaId = newCriteria.reduce((m, c) => Math.max(m, Number(c.id) || 0), 0) + 1;

      for (const seg of segments) {
        const portionId = nextPortionId++;
        newPortions.push({
          id: portionId,
          event_id: Number(event_id),
          portion_name: (seg.portion_name || '').trim(),
          percentage: Number(seg.percentage) || 0,
          order_number: Number(seg.order_number) || 1,
          status: seg.status || 'Upcoming',
          description: seg.description || '',
        });

        if (Array.isArray(seg.criteria)) {
          for (const crit of seg.criteria) {
            newCriteria.push({
              id: nextCriteriaId++,
              event_id: Number(event_id),
              portion_id: portionId,
              name: (crit.name || '').trim(),
              max_score: Number(crit.max_score) || 100,
              percentage: Number(crit.percentage) || 100,
              description: crit.description || '',
            });
          }
        }
      }

      await Promise.all([
        setSheetRows('event_portions', newPortions),
        setSheetRows('criteria', newCriteria),
      ]);

      return NextResponse.json({ success: true, countPortions: segments.length });
    }

    // 2. DUPLICATE ENTIRE PORTION + ITS CRITERIA
    if (itemType === 'duplicate_portion') {
      const { portion_id } = body;
      if (!portion_id) return NextResponse.json({ error: 'portion_id is required' }, { status: 400 });

      const [portions, criteriaList] = await Promise.all([
        getSheetRows<EventPortion>('event_portions'),
        getSheetRows<Criteria>('criteria'),
      ]);

      const sourcePortion = portions.find((p) => Number(p.id) === Number(portion_id));
      if (!sourcePortion) return NextResponse.json({ error: 'Segment not found' }, { status: 404 });

      const maxOrder = portions
        .filter((p) => Number(p.event_id) === Number(sourcePortion.event_id))
        .reduce((max, p) => Math.max(max, Number(p.order_number) || 0), 0);

      const newPortion = await appendSheetRow<EventPortion>('event_portions', {
        event_id: Number(sourcePortion.event_id),
        portion_name: `${sourcePortion.portion_name} (Copy)`,
        percentage: Number(sourcePortion.percentage) || 0,
        order_number: maxOrder + 1,
        status: 'Upcoming',
        description: sourcePortion.description || '',
      });

      const relatedCriteria = criteriaList.filter((c) => Number(c.portion_id) === Number(sourcePortion.id));
      for (const crit of relatedCriteria) {
        await appendSheetRow<Criteria>('criteria', {
          event_id: Number(sourcePortion.event_id),
          portion_id: Number(newPortion.id),
          name: crit.name,
          max_score: Number(crit.max_score) || 100,
          percentage: Number(crit.percentage) || 100,
          description: crit.description || '',
        });
      }

      return NextResponse.json({ success: true, item: newPortion });
    }

    // 3. DUPLICATE A SINGLE CRITERIA ITEM
    if (itemType === 'duplicate_criteria') {
      const { criteria_id } = body;
      if (!criteria_id) return NextResponse.json({ error: 'criteria_id is required' }, { status: 400 });

      const criteriaList = await getSheetRows<Criteria>('criteria');
      const source = criteriaList.find((c) => Number(c.id) === Number(criteria_id));
      if (!source) return NextResponse.json({ error: 'Criteria item not found' }, { status: 404 });

      const newCriteria = await appendSheetRow<Criteria>('criteria', {
        event_id: Number(source.event_id),
        portion_id: source.portion_id ? Number(source.portion_id) : null,
        name: `${source.name} (Copy)`,
        max_score: Number(source.max_score) || 100,
        percentage: Number(source.percentage) || 0,
        description: source.description || '',
      });

      return NextResponse.json({ success: true, item: newCriteria });
    }

    // 4. AUTO-BALANCE PORTIONS (SUM TO 100%)
    if (itemType === 'balance_portions') {
      const { event_id } = body;
      if (!event_id) return NextResponse.json({ error: 'event_id is required' }, { status: 400 });

      const portions = await getSheetRows<EventPortion>('event_portions');
      const eventPortions = portions.filter((p) => Number(p.event_id) === Number(event_id));

      if (eventPortions.length === 0) return NextResponse.json({ success: true });

      const count = eventPortions.length;
      const baseWeight = Math.floor(100 / count);
      const remainder = 100 - (baseWeight * count);

      for (let i = 0; i < count; i++) {
        const p = eventPortions[i];
        const newWeight = i === 0 ? baseWeight + remainder : baseWeight;
        await updateSheetRow<EventPortion>('event_portions', Number(p.id), {
          percentage: newWeight,
        });
      }

      return NextResponse.json({ success: true, count });
    }

    // 5. AUTO-BALANCE CRITERIA INSIDE A PORTION (OR EVENT)
    if (itemType === 'balance_criteria') {
      const { portion_id, event_id } = body;
      const criteriaList = await getSheetRows<Criteria>('criteria');

      let targetList: Criteria[] = [];
      if (portion_id !== undefined && portion_id !== null) {
        targetList = criteriaList.filter((c) => Number(c.portion_id) === Number(portion_id));
      } else if (event_id) {
        targetList = criteriaList.filter(
          (c) => Number(c.event_id) === Number(event_id) && (!c.portion_id || Number(c.portion_id) === 0)
        );
      }

      if (targetList.length === 0) return NextResponse.json({ success: true });

      const count = targetList.length;
      const baseWeight = Math.floor(100 / count);
      const remainder = 100 - (baseWeight * count);

      for (let i = 0; i < count; i++) {
        const c = targetList[i];
        const newWeight = i === 0 ? baseWeight + remainder : baseWeight;
        await updateSheetRow<Criteria>('criteria', Number(c.id), {
          percentage: newWeight,
        });
      }

      return NextResponse.json({ success: true, count });
    }

    // 6. CREATE STANDARD PORTION
    if (itemType === 'portion') {
      const { event_id, portion_name, percentage, order_number, status, description } = body;
      const newPortion = await appendSheetRow<EventPortion>('event_portions', {
        event_id: Number(event_id),
        portion_name: (portion_name || '').trim(),
        percentage: Number(percentage) || 0,
        order_number: Number(order_number) || 1,
        status: status || 'Upcoming',
        description: (description || '').trim(),
      });
      return NextResponse.json({ success: true, item: newPortion });
    }

    // 7. CREATE STANDARD CRITERIA
    const { event_id, portion_id, name, max_score, percentage, description } = body;
    const newCriteria = await appendSheetRow<Criteria>('criteria', {
      event_id: Number(event_id),
      portion_id: portion_id ? Number(portion_id) : null,
      name: (name || '').trim(),
      max_score: Number(max_score) || 100,
      percentage: Number(percentage) || 100,
      description: (description || '').trim(),
    });
    return NextResponse.json({ success: true, item: newCriteria });
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
      const { portion_name, percentage, order_number, status, description } = body;
      const updated = await updateSheetRow<EventPortion>('event_portions', Number(id), {
        ...(portion_name ? { portion_name: portion_name.trim() } : {}),
        ...(percentage !== undefined ? { percentage: Number(percentage) } : {}),
        ...(order_number !== undefined ? { order_number: Number(order_number) } : {}),
        ...(status ? { status } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
      });
      return NextResponse.json({ success: true, item: updated });
    } else {
      const { name, max_score, percentage, portion_id, description } = body;
      const updated = await updateSheetRow<Criteria>('criteria', Number(id), {
        ...(name ? { name: name.trim() } : {}),
        ...(max_score !== undefined ? { max_score: Number(max_score) } : {}),
        ...(percentage !== undefined ? { percentage: Number(percentage) } : {}),
        ...(portion_id !== undefined ? { portion_id: portion_id ? Number(portion_id) : null } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
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
    const eventId = searchParams.get('eventId');
    const itemType = searchParams.get('itemType') || 'criteria';

    // WIPE / CLEAR ALL FOR AN EVENT
    if (itemType === 'clear_all') {
      if (!eventId) {
        return NextResponse.json({ error: 'eventId is required to clear all' }, { status: 400 });
      }

      const [portions, criteriaList] = await Promise.all([
        getSheetRows<EventPortion>('event_portions'),
        getSheetRows<Criteria>('criteria'),
      ]);

      const remainingPortions = portions.filter((p) => Number(p.event_id) !== Number(eventId));
      const remainingCriteria = criteriaList.filter((c) => Number(c.event_id) !== Number(eventId));

      await Promise.all([
        setSheetRows('event_portions', remainingPortions),
        setSheetRows('criteria', remainingCriteria),
      ]);

      return NextResponse.json({ success: true, message: 'All segments and criteria cleared for event' });
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (itemType === 'portion') {
      // Delete portion and also delete or unassign criteria belonging to it
      const criteriaList = await getSheetRows<Criteria>('criteria');
      const associated = criteriaList.filter((c) => Number(c.portion_id) === Number(id));
      for (const crit of associated) {
        await deleteSheetRow('criteria', Number(crit.id));
      }
      await deleteSheetRow('event_portions', Number(id));
      return NextResponse.json({ success: true, message: 'Segment and associated criteria deleted successfully' });
    }

    await deleteSheetRow('criteria', Number(id));
    return NextResponse.json({ success: true, message: 'Criteria deleted successfully' });
  } catch (error: any) {
    console.error('Delete criteria error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete item' }, { status: 500 });
  }
}
