import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, getSheetRows } from '@/lib/googleSheets';
import { Candidate, Course } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

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
    const { event_id, name, image_path, course_id, year_level, order_number } = body;

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
    });

    return NextResponse.json({ success: true, candidate: newCandidate });
  } catch (error: any) {
    console.error('Create candidate error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add candidate' }, { status: 500 });
  }
}
