import { NextResponse } from 'next/server';

// Courses are removed and consolidated into Academic Departments.
export async function GET() {
  return NextResponse.json([]);
}

export async function POST() {
  return NextResponse.json({ success: true, message: 'Courses are deprecated; use /api/departments' });
}

export async function PUT() {
  return NextResponse.json({ success: true, message: 'Courses are deprecated; use /api/departments' });
}

export async function DELETE() {
  return NextResponse.json({ success: true, message: 'Courses are deprecated; use /api/departments' });
}
