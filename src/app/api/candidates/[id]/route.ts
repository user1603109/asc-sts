import { NextRequest, NextResponse } from 'next/server';
import { deleteSheetRow, updateSheetRow } from '@/lib/googleSheets';
import { Candidate } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const candidateId = Number(params.id);
    const updates = await req.json();

    const success = await updateSheetRow<Candidate>('candidates', candidateId, updates);
    if (!success) {
      return NextResponse.json({ error: 'Candidate not found or failed to update' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Candidate updated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update candidate' }, { status: 500 });
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

    const candidateId = Number(params.id);
    const success = await deleteSheetRow('candidates', candidateId);
    if (!success) {
      return NextResponse.json({ error: 'Candidate not found or failed to delete' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Candidate deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete candidate' }, { status: 500 });
  }
}
