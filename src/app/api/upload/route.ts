import { NextRequest, NextResponse } from 'next/server';
import { isGoogleDriveConfigured, uploadImageToDrive } from '@/lib/googleDrive';
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

    // 1. Try Google Drive (ASTS/Profiles)
    if (isGoogleDriveConfigured()) {
      try {
        const driveUrl = await uploadImageToDrive(fileName, mimeType, buffer);
        return NextResponse.json({
          success: true,
          url: driveUrl,
          source: 'gdrive',
          message: 'Uploaded to Google Drive (ASTS/Profiles)',
        });
      } catch (driveErr: any) {
        console.warn('Google Drive upload failed, falling back to local storage:', driveErr);
      }
    }

    // 2. Local fallback storage in /public/uploads/
    const safeName = `profile_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, buffer);

    const localUrl = `/uploads/${safeName}`;
    return NextResponse.json({
      success: true,
      url: localUrl,
      source: 'local',
      message: 'Uploaded to local storage (Google Drive not configured or fallback)',
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error.message || 'File upload failed' },
      { status: 500 }
    );
  }
}
