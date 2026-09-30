import { NextResponse } from 'next/server';
import { ensureAllSheets, isGoogleConfigured } from '@/lib/googleSheets';

export async function GET() {
  const configured = isGoogleConfigured();
  return NextResponse.json({
    googleConfigured: configured,
    message: configured
      ? 'Google Sheets credentials detected.'
      : 'Google Sheets credentials missing in environment variables. Currently running in local demo memory mode.',
  });
}

export async function POST() {
  try {
    if (!isGoogleConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Google Sheets credentials not found. Please provide GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID in your .env.local file or Vercel Environment Variables.',
        },
        { status: 400 }
      );
    }

    const result = await ensureAllSheets();
    return NextResponse.json({
      success: true,
      message: 'All 13 relational sheets and default schemas verified successfully.',
      ...result,
    });
  } catch (error: any) {
    console.error('Setup sheets error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to setup sheets' },
      { status: 500 }
    );
  }
}
