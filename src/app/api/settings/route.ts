import { NextRequest, NextResponse } from 'next/server';
import { getSheetRows, updateSheetRow, appendSheetRow } from '@/lib/googleSheets';
import { SystemSetting } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getSheetRows<SystemSetting>('system_settings');
    const settingsObj: Record<string, string> = {
      system_name: 'Automated Scoring & Tabulation System',
      organization: 'Apayao State College',
      academic_year: '2025-2026',
    };
    for (const s of settings) {
      if (s.setting_key) {
        settingsObj[s.setting_key] = s.setting_value || '';
      }
    }
    return NextResponse.json(settingsObj);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body = await req.json();
    const existing = await getSheetRows<SystemSetting>('system_settings');

    for (const [key, val] of Object.entries(body)) {
      const match = existing.find((s) => s.setting_key === key);
      if (match) {
        await updateSheetRow<SystemSetting>('system_settings', match.id, {
          setting_value: String(val),
        });
      } else {
        await appendSheetRow<SystemSetting>('system_settings', {
          setting_key: key,
          setting_value: String(val),
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Settings saved successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
