import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedName = searchParams.get('name') || '';
    const isAsc = requestedName.toLowerCase().includes('asc');
    const targetFile = isAsc ? 'asclogo.png' : 'astslogo.png';

    let filePath = path.join(process.cwd(), 'assets', 'img', targetFile);
    if (!fs.existsSync(filePath)) {
      // Fallback to public if available
      filePath = path.join(process.cwd(), 'public', 'assets', 'img', targetFile);
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'assets', 'img', 'astslogo.png');
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Logo not found', { status: 404 });
    }

    // Auto-sync to public folder so static links work
    try {
      const publicImgDir = path.join(process.cwd(), 'public', 'assets', 'img');
      if (!fs.existsSync(publicImgDir)) fs.mkdirSync(publicImgDir, { recursive: true });
      const destFile = path.join(publicImgDir, targetFile);
      if (!fs.existsSync(destFile)) fs.copyFileSync(filePath, destFile);
    } catch (_) {}

    const fileBuffer = fs.readFileSync(filePath);
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    return new NextResponse('Internal error', { status: 500 });
  }
}
