import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, deleteSheetRow, getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { Department } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const depts = await getSheetRows<Department>('departments');
    return NextResponse.json(depts);
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

    const { department_name, department_code } = await req.json();
    if (!department_name || !department_name.trim()) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
    }

    const newDept = await appendSheetRow<Department>('departments', {
      department_name: department_name.trim(),
      department_code: (department_code || '').trim().toUpperCase(),
    });

    return NextResponse.json({ success: true, department: newDept });
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

    const { id, department_name, department_code } = await req.json();
    if (!id || !department_name) {
      return NextResponse.json({ error: 'id and department_name are required' }, { status: 400 });
    }

    const updated = await updateSheetRow<Department>('departments', Number(id), {
      department_name: department_name.trim(),
      department_code: (department_code || '').trim().toUpperCase(),
    });

    return NextResponse.json({ success: true, department: updated });
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
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await deleteSheetRow('departments', Number(id));
    return NextResponse.json({ success: true, message: 'Department deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
