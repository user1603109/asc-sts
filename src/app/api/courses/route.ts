import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { Course } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const courses = await getSheetRows<Course>('courses');
    return NextResponse.json(courses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { course_name } = await req.json();
    if (!course_name || !course_name.trim()) {
      return NextResponse.json({ error: 'course_name is required' }, { status: 400 });
    }

    const newCourse = await appendSheetRow<Course>('courses', {
      course_name: course_name.trim(),
    });
    return NextResponse.json({ success: true, course: newCourse });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id, course_name } = await req.json();
    const updated = await updateSheetRow<Course>('courses', Number(id), {
      course_name: course_name.trim(),
    });
    return NextResponse.json({ success: true, course: updated });
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
    await deleteSheetRow('courses', Number(id));
    return NextResponse.json({ success: true, message: 'Course deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
