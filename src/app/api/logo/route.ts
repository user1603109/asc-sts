import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedName = searchParams.get('name');
    const targetFile = requestedName === 'asclogo' ? 'asclogo.png' : 'astslogo.png';

    let filePath = path.join(process.cwd(), 'assets', 'img', targetFile);
    if (!fs.existsSync(filePath)) {
      // Fallback to astslogo if asclogo is not found
      filePath = path.join(process.cwd(), 'assets', 'img', 'astslogo.png');
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Logo not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    return new NextResponse('Internal error', { status: 500 });
  }
}
