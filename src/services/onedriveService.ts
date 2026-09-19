/**
 * OneDrive integration service for OAuth 2.0 and Microsoft Graph API
 */

import {
  OneDriveConnectionInfo,
  OneDriveProjectFolder,
  SubfolderFilesResponse,
  RequirementRow,
  TestCaseRow,
} from '../types';

export interface OneDriveFolderItem {
  id: string;
  name: string;
  childCount: number;
  lastModifiedDateTime?: string;
  webUrl?: string;
}

export interface SetupFoldersResult {
  success: boolean;
  projectFolder: {
    id: string;
    name: string;
    subfolders: {
      name: string;
      id: string;
      status: 'existing' | 'created';
    }[];
  };
  updatedTokens?: {
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    expiresAt: number;
  };
}

export async function getOneDriveConfig() {
  const res = await fetch('/api/onedrive/config');
  if (!res.ok) throw new Error('Failed to fetch OneDrive config');
  return res.json();
}

/**
 * Initiates Microsoft OAuth 2.0 popup flow
 */
export async function connectOneDriveWithPopup(
  customClientId?: string,
  customClientSecret?: string
): Promise<OneDriveConnectionInfo> {
  // 1. Request Auth URL from server
  const res = await fetch('/api/onedrive/auth-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: customClientId,
      clientSecret: customClientSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to initialize Microsoft OAuth authorization');
  }

  const { url } = await res.json();

  // 2. Open popup directly to Microsoft OAuth authorization endpoint
  const width = 600;
  const height = 720;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const authPopup = window.open(
    url,
    'microsoft_oauth_popup',
    `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
  );

  if (!authPopup) {
    throw new Error('Popup blocked. Please allow popups for this site to complete Microsoft authentication.');
  }

  // 3. Await postMessage from popup callback
  return new Promise<OneDriveConnectionInfo>((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | number;

    const messageHandler = (event: MessageEvent) => {
      // Security check: only accept valid AI Studio preview or localhost origins
      const origin = event.origin;
      if (
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        origin !== window.location.origin
      ) {
        return;
      }

      if (event.data?.type === 'ONEDRIVE_AUTH_SUCCESS') {
        window.removeEventListener('message', messageHandler);
        clearTimeout(timeoutId);
        resolve(event.data.payload);
      } else if (event.data?.type === 'ONEDRIVE_AUTH_ERROR') {
        window.removeEventListener('message', messageHandler);
        clearTimeout(timeoutId);
        reject(new Error(event.data.error || 'Microsoft OAuth authentication was denied or failed'));
      }
    };

    window.addEventListener('message', messageHandler);

    // Timeout after 4 minutes if user abandoned popup
    timeoutId = setTimeout(() => {
      window.removeEventListener('message', messageHandler);
      reject(new Error('Microsoft OAuth connection timed out. Please try again.'));
    }, 4 * 60 * 1000);
  });
}

/**
 * Simulated connection for instant sandbox testing
 */
export async function connectOneDriveDemo(email?: string, name?: string): Promise<OneDriveConnectionInfo> {
  const res = await fetch('/api/onedrive/demo-connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  if (!res.ok) throw new Error('Demo connection failed');
  return res.json();
}

/**
 * List folders in OneDrive root or inside a specific subfolder
 */
export async function listOneDriveFolders(
  connection: OneDriveConnectionInfo,
  folderId?: string,
  credentials?: { clientId?: string; clientSecret?: string }
): Promise<{ folders: OneDriveFolderItem[]; parentFolderId: string; updatedTokens?: any }> {
  const res = await fetch('/api/onedrive/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      encryptedAccessToken: connection.encryptedAccessToken,
      encryptedRefreshToken: connection.encryptedRefreshToken,
      expiresAt: connection.expiresAt,
      folderId: folderId || 'root',
      clientId: credentials?.clientId,
      clientSecret: credentials?.clientSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to list folders from Microsoft OneDrive');
  }

  return res.json();
}

/**
 * Create a new folder in OneDrive
 */
export async function createOneDriveFolder(
  connection: OneDriveConnectionInfo,
  parentFolderId: string,
  folderName: string,
  credentials?: { clientId?: string; clientSecret?: string }
): Promise<{ folder: OneDriveFolderItem; updatedTokens?: any }> {
  const res = await fetch('/api/onedrive/create-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      encryptedAccessToken: connection.encryptedAccessToken,
      encryptedRefreshToken: connection.encryptedRefreshToken,
      expiresAt: connection.expiresAt,
      parentFolderId: parentFolderId || 'root',
      name: folderName,
      clientId: credentials?.clientId,
      clientSecret: credentials?.clientSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create folder in Microsoft OneDrive');
  }

  return res.json();
}

/**
 * Step 3: Setup project subfolders ("Requirements", "Test Cases", "PRD", "Others")
 */
export async function setupProjectSubfolders(
  connection: OneDriveConnectionInfo,
  folderId: string,
  folderName: string,
  credentials?: { clientId?: string; clientSecret?: string }
): Promise<SetupFoldersResult> {
  const res = await fetch('/api/onedrive/setup-project-folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      encryptedAccessToken: connection.encryptedAccessToken,
      encryptedRefreshToken: connection.encryptedRefreshToken,
      expiresAt: connection.expiresAt,
      folderId,
      folderName,
      clientId: credentials?.clientId,
      clientSecret: credentials?.clientSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to setup project subfolders in OneDrive');
  }

  return res.json();
}

/**
 * Fetch all files in a specific subfolder (e.g. 'Requirements', 'Test Cases', 'PRD', 'Others')
 */
export async function fetchSubfolderFiles(
  connection: OneDriveConnectionInfo,
  subfolderName: 'Requirements' | 'Test Cases' | 'PRD' | 'Others',
  projectFolderId?: string,
  subfolderId?: string,
  credentials?: { clientId?: string; clientSecret?: string }
): Promise<SubfolderFilesResponse> {
  const res = await fetch('/api/onedrive/subfolder-files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subfolderName,
      projectFolderId: projectFolderId || connection.projectFolder?.id,
      subfolderId:
        subfolderId ||
        connection.projectFolder?.subfolders?.find(
          (s) => s.name.toLowerCase() === subfolderName.toLowerCase()
        )?.id,
      encryptedAccessToken: connection.encryptedAccessToken,
      encryptedRefreshToken: connection.encryptedRefreshToken,
      expiresAt: connection.expiresAt,
      clientId: credentials?.clientId,
      clientSecret: credentials?.clientSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch files in "${subfolderName}"`);
  }

  return res.json();
}

/**
 * Download raw file content for parsing
 */
export async function fetchFileContent(
  connection: OneDriveConnectionInfo,
  fileId: string,
  credentials?: { clientId?: string; clientSecret?: string }
): Promise<{
  file: {
    id: string;
    name: string;
    webUrl: string;
    lastModifiedDateTime: string;
    size: number;
  };
  content: string;
  updatedTokens?: any;
}> {
  const res = await fetch('/api/onedrive/file-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId,
      encryptedAccessToken: connection.encryptedAccessToken,
      encryptedRefreshToken: connection.encryptedRefreshToken,
      expiresAt: connection.expiresAt,
      clientId: credentials?.clientId,
      clientSecret: credentials?.clientSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to download file content');
  }

  return res.json();
}

/**
 * Create or overwrite a template file in a subfolder
 */
export async function createFileInSubfolder(
  connection: OneDriveConnectionInfo,
  subfolderId: string,
  subfolderName: string,
  fileName: string,
  content: string,
  credentials?: { clientId?: string; clientSecret?: string }
): Promise<{ success: boolean; file: any }> {
  const res = await fetch('/api/onedrive/create-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subfolderId,
      subfolderName,
      fileName,
      content,
      encryptedAccessToken: connection.encryptedAccessToken,
      encryptedRefreshToken: connection.encryptedRefreshToken,
      expiresAt: connection.expiresAt,
      clientId: credentials?.clientId,
      clientSecret: credentials?.clientSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create file in OneDrive');
  }

  return res.json();
}

/**
 * Adjust demo store state for testing warning states
 */
export async function adjustDemoFiles(
  subfolderName: 'Requirements' | 'Test Cases' | 'PRD' | 'Others',
  mode: 'zero' | 'single' | 'multiple'
) {
  const res = await fetch('/api/onedrive/demo-adjust-files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subfolderName, mode }),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// PARSERS FOR MARKDOWN TABLES & CSV
// ---------------------------------------------------------------------------

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function splitMarkdownLine(line: string): string[] {
  let clean = line.trim();
  if (clean.startsWith('|')) clean = clean.substring(1);
  if (clean.endsWith('|')) clean = clean.substring(0, clean.length - 1);
  return clean.split('|').map((c) => c.trim());
}

export function parseGenericTable(content: string): Record<string, string>[] {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const isMarkdown = lines[0].includes('|');

  if (isMarkdown) {
    const headerCols = splitMarkdownLine(lines[0]);
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Skip delimiter line e.g. |---|---|
      if (/^\|?(\s*:?-+:?\s*\|?)+$/.test(line)) continue;
      const cols = splitMarkdownLine(line);
      const rowObj: Record<string, string> = {};
      headerCols.forEach((header, idx) => {
        rowObj[header] = cols[idx] !== undefined ? cols[idx] : '';
      });
      rows.push(rowObj);
    }
    return rows;
  } else {
    // CSV
    const headerCols = splitCsvLine(lines[0]);
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]);
      if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;
      const rowObj: Record<string, string> = {};
      headerCols.forEach((header, idx) => {
        rowObj[header] = cols[idx] !== undefined ? cols[idx] : '';
      });
      rows.push(rowObj);
    }
    return rows;
  }
}

function findNormalizedVal(row: Record<string, string>, possibleKeys: string[]): string {
  const rowKeys = Object.keys(row);
  for (const p of possibleKeys) {
    const normP = p.toLowerCase().replace(/[\s_\-]/g, '');
    for (const k of rowKeys) {
      const normK = k.toLowerCase().replace(/[\s_\-]/g, '');
      if (normK === normP) return row[k];
    }
  }
  return '';
}

/**
 * Parses Requirements file contents into RequirementRow[]
 * Expected columns: ID, Title, Description, Priority, Status, Owner, Last Updated
 */
export function parseRequirementsFile(content: string): RequirementRow[] {
  const rows = parseGenericTable(content);
  return rows.map((r, idx) => {
    return {
      id: findNormalizedVal(r, ['id', 'req_id', 'req id', 'item id', 'key']) || `REQ-${100 + idx + 1}`,
      title: findNormalizedVal(r, ['title', 'name', 'summary', 'requirement']) || `Requirement ${idx + 1}`,
      description: findNormalizedVal(r, ['description', 'desc', 'details', 'detail', 'specification', 'body']) || '',
      priority: findNormalizedVal(r, ['priority', 'severity', 'urgency']) || 'Medium',
      status: findNormalizedVal(r, ['status', 'state']) || 'Draft',
      owner: findNormalizedVal(r, ['owner', 'assignee', 'author', 'lead']) || 'Unassigned',
      lastUpdated: findNormalizedVal(r, ['last updated', 'last_updated', 'lastupdated', 'updated', 'date']) || '2026-09-19',
      raw: r,
    };
  });
}

/**
 * Parses Test Cases file contents into TestCaseRow[]
 * Expected columns: ID, Title, Steps, Expected Result, Status, Priority, Last Updated
 */
export function parseTestCasesFile(content: string): TestCaseRow[] {
  const rows = parseGenericTable(content);
  return rows.map((r, idx) => {
    return {
      id: findNormalizedVal(r, ['id', 'tc_id', 'case id', 'test id', 'key']) || `TC-${200 + idx + 1}`,
      title: findNormalizedVal(r, ['title', 'name', 'test case', 'summary']) || `Test Case ${idx + 1}`,
      steps: findNormalizedVal(r, ['steps', 'test steps', 'procedure', 'action', 'instructions']) || '',
      expectedResult: findNormalizedVal(r, ['expected result', 'expected_result', 'expected', 'criteria']) || '',
      status: findNormalizedVal(r, ['status', 'result', 'state']) || 'Passed',
      priority: findNormalizedVal(r, ['priority', 'severity']) || 'Medium',
      lastUpdated: findNormalizedVal(r, ['last updated', 'last_updated', 'lastupdated', 'updated', 'date']) || '2026-09-19',
      raw: r,
    };
  });
}

