import { google } from 'googleapis';
import { Readable } from 'stream';

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export function isGoogleDriveConfigured(): boolean {
  return Boolean(SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY);
}

function getDriveClient() {
  if (!isGoogleDriveConfigured()) {
    throw new Error('Google Drive configuration missing.');
  }

  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

async function getOrCreateFolder(drive: any, folderName: string, parentId?: string): Promise<string> {
  const query = parentId
    ? `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`
    : `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`;

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const folderMetadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    folderMetadata.parents = [parentId];
  }

  const created = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id',
  });

  return created.data.id;
}

let cachedProfilesFolderId: string | null = null;

export async function getASTSProfilesFolderId(): Promise<string | undefined> {
  if (cachedProfilesFolderId) return cachedProfilesFolderId;
  try {
    const drive = getDriveClient();
    // Look inside DRIVE_FOLDER_ID if set, otherwise in root
    const astsFolderId = await getOrCreateFolder(drive, 'ASTS', DRIVE_FOLDER_ID);
    const profilesFolderId = await getOrCreateFolder(drive, 'Profiles', astsFolderId);
    cachedProfilesFolderId = profilesFolderId;
    return profilesFolderId;
  } catch (e) {
    console.warn('Failed to ensure ASTS/Profiles folder:', e);
    return DRIVE_FOLDER_ID;
  }
}

export async function uploadImageToDrive(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<string> {
  const drive = getDriveClient();
  const folderId = await getASTSProfilesFolderId();

  const fileMetadata: any = {
    name: `asts_profile_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
  };

  if (folderId) {
    fileMetadata.parents = [folderId];
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

  // Make public read so it displays in candidate and participant cards
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
