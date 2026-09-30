import { google } from 'googleapis';
import { Readable } from 'stream';

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID; // Optional dedicated folder

function getDriveClient() {
  if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
    throw new Error('Google Drive configuration missing.');
  }

  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

export async function uploadImageToDrive(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const drive = getDriveClient();

  const fileMetadata: any = {
    name: `asc_contestant_${Date.now()}_${fileName}`,
  };

  if (DRIVE_FOLDER_ID) {
    fileMetadata.parents = [DRIVE_FOLDER_ID];
  }

  const media = {
    mimeType,
    body: Readable.from(buffer),
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink, webContentLink',
  });

  const fileId = file.data.id;
  if (!fileId) throw new Error('Failed to get uploaded file ID from Google Drive');

  // Make public read so it displays in candidate cards
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (permError) {
    console.warn('Could not set public permission on Drive file:', permError);
  }

  // Direct thumbnail / viewing URL
  return `https://drive.google.com/uc?id=${fileId}&export=view`;
}
