import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = file.name || 'profile.jpg';
    const mimeType = file.type || 'image/jpeg';

    // 1. Hostinger / Node.js Local Disk Storage
    // Saves directly to public/uploads/ so files are immediately served via HTTP
    try {
      const ext = path.extname(fileName) || '.jpg';
      const cleanBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeName = `cand_${Date.now()}_${cleanBase}${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, safeName);
      await writeFile(filePath, buffer);

      const localUrl = `/uploads/${safeName}`;
      return NextResponse.json({
        success: true,
        url: localUrl,
        source: 'local',
        message: 'Photo stored safely on Hostinger public storage',
      });
    } catch (fsErr) {
      console.warn('Local disk write failed, switching to resilient Data URI fallback:', fsErr);
    }

    // 2. Resilient Base64 Data URI Fallback
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      source: 'data-uri',
      message: 'Photo stored safely via inline Data URI',
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error.message || 'File upload failed' },
      { status: 500 }
    );
  }
}
