import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory store for pending OAuth states (15 min TTL)
interface PendingOAuthState {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  createdAt: number;
}
const pendingStates = new Map<string, PendingOAuthState>();

// Periodic cleanup of stale states
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingStates.entries()) {
    if (now - data.createdAt > 15 * 60 * 1000) {
      pendingStates.delete(state);
    }
  }
}, 60 * 1000);

// AES-256-GCM Encryption utilities
const ENCRYPTION_SECRET =
  process.env.ENCRYPTION_KEY || 'drivedocs-onedrive-secure-encryption-key-32b';
const encryptionKey = crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();

export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }
  const [ivHex, authTagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Helper to get effective Azure App Credentials
function getEffectiveCredentials(bodyClientId?: string, bodyClientSecret?: string) {
  const clientId =
    bodyClientId ||
    process.env.AZURE_CLIENT_ID ||
    process.env.MICROSOFT_CLIENT_ID ||
    '';
  const clientSecret =
    bodyClientSecret ||
    process.env.AZURE_CLIENT_SECRET ||
    process.env.MICROSOFT_CLIENT_SECRET ||
    '';
  return { clientId, clientSecret };
}

// Token renewal helper
async function getValidAccessToken(
  encryptedAccessToken: string,
  encryptedRefreshToken: string,
  expiresAt?: number,
  bodyClientId?: string,
  bodyClientSecret?: string
): Promise<{
  accessToken: string;
  updatedTokens?: {
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    expiresAt: number;
  };
}> {
  // Check if simulated demo token
  if (encryptedAccessToken.startsWith('demo_token:')) {
    return { accessToken: 'demo_token_valid' };
  }

  const now = Date.now();
  // If expiresAt is set and has more than 3 minutes remaining, try decrypting current access token
  if (expiresAt && now < expiresAt - 180000) {
    try {
      const token = decrypt(encryptedAccessToken);
      if (token) return { accessToken: token };
    } catch {
      // Continue to refresh below
    }
  }

  // Token expired or missing, execute refresh with refresh_token
  const { clientId, clientSecret } = getEffectiveCredentials(bodyClientId, bodyClientSecret);
  const rawRefreshToken = decrypt(encryptedRefreshToken);

  if (!rawRefreshToken) {
    throw new Error('No refresh token available to renew Microsoft session.');
  }

  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: rawRefreshToken,
    scope: 'Files.ReadWrite offline_access User.Read',
  });

  const response = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(
      errorBody.error_description ||
        `Microsoft OAuth token refresh failed (HTTP ${response.status})`
    );
  }

  const tokenData = await response.json();
  const newEncryptedAccess = encrypt(tokenData.access_token);
  const newEncryptedRefresh = tokenData.refresh_token
    ? encrypt(tokenData.refresh_token)
    : encryptedRefreshToken;
  const newExpiresAt = Date.now() + tokenData.expires_in * 1000;

  return {
    accessToken: tokenData.access_token,
    updatedTokens: {
      encryptedAccessToken: newEncryptedAccess,
      encryptedRefreshToken: newEncryptedRefresh,
      expiresAt: newExpiresAt,
    },
  };
}

// ---------------------------------------------------------------------------
// API ENDPOINTS
// ---------------------------------------------------------------------------

// 1. Get OneDrive OAuth Configuration
app.get('/api/onedrive/config', (req, res) => {
  const envClientId = process.env.AZURE_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID || '';
  const envHasSecret = !!(process.env.AZURE_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET);
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${appUrl}/auth/callback`;

  res.json({
    configuredInEnv: !!(envClientId && envHasSecret),
    envClientId: envClientId ? `${envClientId.substring(0, 8)}...` : '',
    hasSecretInEnv: envHasSecret,
    redirectUri,
    tenant: 'consumers',
    scopes: ['Files.ReadWrite', 'offline_access', 'User.Read'],
  });
});

// 2. Generate Microsoft OAuth 2.0 Authorization URL
app.post('/api/onedrive/auth-url', (req, res) => {
  try {
    const { clientId: reqClientId, clientSecret: reqClientSecret, redirectUri: reqRedirectUri } = req.body || {};
    const { clientId, clientSecret } = getEffectiveCredentials(reqClientId, reqClientSecret);

    if (!clientId) {
      return res.status(400).json({
        error: 'Missing Azure App Client ID. Please provide it in Settings or via AZURE_CLIENT_ID in .env.',
      });
    }

    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = reqRedirectUri || `${appUrl}/auth/callback`;

    // Generate random state identifier
    const state = crypto.randomBytes(16).toString('hex');

    // Store state with associated credentials so callback knows client secret
    pendingStates.set(state, {
      clientId,
      clientSecret,
      redirectUri,
      createdAt: Date.now(),
    });

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: 'Files.ReadWrite offline_access User.Read',
      state,
      prompt: 'select_account',
    });

    const authUrl = `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params.toString()}`;
    res.json({ url: authUrl, state });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate auth URL' });
  }
});

// 3. OAuth Callback Handler: exchanges code, encrypts tokens, notifies popup opener
app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code, state, error, error_description } = req.query as {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  };

  if (error) {
    const errMessage = error_description || error;
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>OneDrive Authorization Failed</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff1f2; color: #9f1239; padding: 24px; text-align: center; }
            .card { background: white; padding: 32px; border-radius: 16px; border: 1px solid #fecdd3; max-width: 440px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            h3 { margin-top: 0; font-size: 18px; }
            p { font-size: 13px; color: #475569; line-height: 1.5; }
            button { margin-top: 16px; padding: 8px 16px; background: #e11d48; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>OneDrive Authorization Error</h3>
            <p>${errMessage}</p>
            <button onclick="window.close()">Close Window</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'ONEDRIVE_AUTH_ERROR', error: ${JSON.stringify(errMessage)} }, '*');
              setTimeout(() => window.close(), 2000);
            }
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send('Missing authorization code from Microsoft.');
  }

  try {
    const stateData = state ? pendingStates.get(state) : undefined;
    const clientId = stateData?.clientId || process.env.AZURE_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID || '';
    const clientSecret = stateData?.clientSecret || process.env.AZURE_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET || '';
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = stateData?.redirectUri || `${appUrl}/auth/callback`;

    if (state) pendingStates.delete(state);

    if (!clientId || !clientSecret) {
      throw new Error('OAuth state expired or missing Azure Client ID / Secret.');
    }

    // Exchange code for tokens
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      scope: 'Files.ReadWrite offline_access User.Read',
    });

    const tokenRes = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const tokenErr = await tokenRes.json().catch(() => ({}));
      throw new Error(tokenErr.error_description || 'Failed to exchange authorization code for tokens.');
    }

    const tokenData = await tokenRes.json();

    // Fetch user profile from Microsoft Graph
    let accountEmail = '';
    let accountName = 'Microsoft User';

    try {
      const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        accountEmail = meData.mail || meData.userPrincipalName || '';
        accountName = meData.displayName || 'Microsoft User';
      }
    } catch (profileErr) {
      console.warn('Failed to fetch Microsoft Graph user profile:', profileErr);
    }

    // Encrypt access and refresh tokens securely
    const encryptedAccessToken = encrypt(tokenData.access_token);
    const encryptedRefreshToken = encrypt(tokenData.refresh_token);
    const expiresAt = Date.now() + tokenData.expires_in * 1000;

    const authPayload = {
      connected: true,
      accountEmail,
      accountName,
      connectedAt: new Date().toISOString(),
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
    };

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>OneDrive Connected</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f8fafc;
              color: #1e293b;
              text-align: center;
              padding: 24px;
            }
            .card {
              background: white;
              padding: 32px 28px;
              border-radius: 20px;
              border: 1px solid #e2e8f0;
              box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06);
              max-width: 380px;
              width: 100%;
            }
            .icon-circle {
              width: 56px;
              height: 56px;
              background: #ecfdf5;
              border: 1px solid #a7f3d0;
              color: #059669;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 16px;
              font-size: 26px;
            }
            h3 {
              margin: 0 0 8px;
              font-size: 18px;
              color: #0f172a;
              font-weight: 700;
            }
            p {
              margin: 0;
              font-size: 13px;
              color: #64748b;
              line-height: 1.5;
            }
            .email-badge {
              display: inline-block;
              margin-top: 12px;
              background: #f1f5f9;
              color: #334155;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon-circle">✓</div>
            <h3>OneDrive Connected</h3>
            <p>Your Microsoft account has been securely authenticated and linked.</p>
            ${accountEmail ? `<div class="email-badge">${accountEmail}</div>` : ''}
            <p style="margin-top: 16px; font-size: 11px; color: #94a3b8;">This window will close automatically...</p>
          </div>
          <script>
            const payload = ${JSON.stringify(authPayload)};
            if (window.opener) {
              window.opener.postMessage({ type: 'ONEDRIVE_AUTH_SUCCESS', payload }, '*');
              setTimeout(() => {
                window.close();
              }, 800);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: sans-serif; padding: 40px; text-align: center; color: #b91c1c; background: #fff5f5; }
          </style>
        </head>
        <body>
          <h2>Authentication Failed</h2>
          <p>${err.message || 'Unknown error occurred while connecting OneDrive.'}</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'ONEDRIVE_AUTH_ERROR', error: ${JSON.stringify(err.message)} }, '*');
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body>
      </html>
    `);
  }
});

// 4. Demo / Sandbox Connection (Allows instant testing if user hasn't registered in Azure Portal yet)
app.post('/api/onedrive/demo-connect', (req, res) => {
  const accountEmail = req.body.email || 'developer.onedrive@outlook.com';
  const accountName = req.body.name || 'OneDrive Developer';

  const encryptedAccessToken = `demo_token:${encrypt('mock-access-token-' + Date.now())}`;
  const encryptedRefreshToken = `demo_token:${encrypt('mock-refresh-token-' + Date.now())}`;

  res.json({
    connected: true,
    accountEmail,
    accountName,
    connectedAt: new Date().toISOString(),
    encryptedAccessToken,
    encryptedRefreshToken,
    expiresAt: Date.now() + 3600 * 1000,
    isDemo: true,
  });
});

// 5. Silent Token Refresh Endpoint
app.post('/api/onedrive/refresh', async (req, res) => {
  try {
    const { encryptedRefreshToken, clientId, clientSecret } = req.body;
    if (!encryptedRefreshToken) {
      return res.status(400).json({ error: 'Missing encryptedRefreshToken' });
    }

    if (encryptedRefreshToken.startsWith('demo_token:')) {
      return res.json({
        encryptedAccessToken: encryptedRefreshToken,
        encryptedRefreshToken,
        expiresAt: Date.now() + 3600 * 1000,
      });
    }

    const { updatedTokens } = await getValidAccessToken(
      '',
      encryptedRefreshToken,
      0,
      clientId,
      clientSecret
    );

    res.json(updatedTokens);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Token refresh failed' });
  }
});

// 6. List Folders (built with Microsoft Graph API: GET /me/drive/root/children or GET /me/drive/items/{id}/children)
app.post('/api/onedrive/folders', async (req, res) => {
  try {
    const {
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      folderId,
      clientId,
      clientSecret,
    } = req.body;

    if (!encryptedAccessToken || !encryptedRefreshToken) {
      return res.status(401).json({ error: 'Missing OneDrive credentials' });
    }

    // Handle Demo mode
    if (encryptedAccessToken.startsWith('demo_token:')) {
      const mockFoldersByParent: Record<string, any[]> = {
        root: [
          {
            id: 'mock-folder-documents',
            name: 'Documents',
            childCount: 14,
            lastModifiedDateTime: new Date().toISOString(),
            webUrl: 'https://onedrive.live.com',
          },
          {
            id: 'mock-folder-projects',
            name: 'Workspace Projects',
            childCount: 4,
            lastModifiedDateTime: new Date().toISOString(),
            webUrl: 'https://onedrive.live.com',
          },
          {
            id: 'mock-folder-specs',
            name: 'Product Specs & Engineering',
            childCount: 0,
            lastModifiedDateTime: new Date().toISOString(),
            webUrl: 'https://onedrive.live.com',
          },
        ],
        'mock-folder-projects': [
          {
            id: 'mock-folder-alpha',
            name: 'Project Phoenix',
            childCount: 2,
            lastModifiedDateTime: new Date().toISOString(),
            webUrl: 'https://onedrive.live.com',
          },
          {
            id: 'mock-folder-beta',
            name: 'Project DriveDocs',
            childCount: 0,
            lastModifiedDateTime: new Date().toISOString(),
            webUrl: 'https://onedrive.live.com',
          },
        ],
        'mock-folder-documents': [
          {
            id: 'mock-folder-personal',
            name: 'Personal Notes',
            childCount: 5,
            lastModifiedDateTime: new Date().toISOString(),
            webUrl: 'https://onedrive.live.com',
          },
        ],
      };

      const key = !folderId || folderId === 'root' ? 'root' : folderId;
      const folders = mockFoldersByParent[key] || [];

      return res.json({
        folders,
        parentFolderId: folderId || 'root',
      });
    }

    // Live Microsoft Graph API call
    const { accessToken, updatedTokens } = await getValidAccessToken(
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      clientId,
      clientSecret
    );

    const endpoint =
      !folderId || folderId === 'root'
        ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
        : `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`;

    const graphRes = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!graphRes.ok) {
      const err = await graphRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Microsoft Graph error ${graphRes.status}`);
    }

    const data = await graphRes.json();
    const items = data.value || [];

    // Filter strictly for folders
    const folders = items
      .filter((item: any) => item.folder !== undefined)
      .map((f: any) => ({
        id: f.id,
        name: f.name,
        childCount: f.folder?.childCount ?? 0,
        lastModifiedDateTime: f.lastModifiedDateTime,
        webUrl: f.webUrl,
      }));

    res.json({
      folders,
      parentFolderId: folderId || 'root',
      updatedTokens,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list OneDrive folders' });
  }
});

// 7. Create Folder in OneDrive using Graph API folder-creation endpoint
app.post('/api/onedrive/create-folder', async (req, res) => {
  try {
    const {
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      parentFolderId,
      name,
      clientId,
      clientSecret,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const folderName = name.trim();

    // Handle Demo mode
    if (encryptedAccessToken?.startsWith('demo_token:')) {
      const newFolder = {
        id: `mock-folder-${Date.now()}`,
        name: folderName,
        childCount: 0,
        lastModifiedDateTime: new Date().toISOString(),
        webUrl: 'https://onedrive.live.com',
      };
      return res.json({ folder: newFolder });
    }

    const { accessToken, updatedTokens } = await getValidAccessToken(
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      clientId,
      clientSecret
    );

    const endpoint =
      !parentFolderId || parentFolderId === 'root'
        ? 'https://graph.microsoft.com/v1.0/me/drive/root/children'
        : `https://graph.microsoft.com/v1.0/me/drive/items/${parentFolderId}/children`;

    const graphRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      }),
    });

    if (!graphRes.ok) {
      const err = await graphRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create folder (${graphRes.status})`);
    }

    const data = await graphRes.json();
    const folder = {
      id: data.id,
      name: data.name,
      childCount: data.folder?.childCount ?? 0,
      lastModifiedDateTime: data.lastModifiedDateTime,
      webUrl: data.webUrl,
    };

    res.json({ folder, updatedTokens });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create folder in OneDrive' });
  }
});

// 8. Step 3: Automatically check for and create the 4 required subfolders:
// "Requirements", "Test Cases", "PRD", "Others"
app.post('/api/onedrive/setup-project-folders', async (req, res) => {
  try {
    const {
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      folderId,
      folderName,
      clientId,
      clientSecret,
    } = req.body;

    if (!folderId) {
      return res.status(400).json({ error: 'Project folder ID is required' });
    }

    const REQUIRED_SUBFOLDERS = ['Requirements', 'Test Cases', 'PRD', 'Others'];

    // Handle Demo mode
    if (encryptedAccessToken?.startsWith('demo_token:')) {
      const subfolderResults = REQUIRED_SUBFOLDERS.map((name) => ({
        name,
        id: `mock-subfolder-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        status: 'created',
      }));

      return res.json({
        success: true,
        projectFolder: {
          id: folderId,
          name: folderName || 'Project Folder',
          subfolders: subfolderResults,
        },
      });
    }

    const { accessToken, updatedTokens } = await getValidAccessToken(
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      clientId,
      clientSecret
    );

    // 1. Check existing children in the selected folder
    const listRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!listRes.ok) {
      const err = await listRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to inspect project folder');
    }

    const listData = await listRes.json();
    const existingItems = listData.value || [];

    const subfolderResults: { name: string; id: string; status: 'existing' | 'created' }[] = [];

    // 2. Check and create each missing subfolder
    for (const subName of REQUIRED_SUBFOLDERS) {
      const existing = existingItems.find(
        (it: any) =>
          it.folder !== undefined &&
          it.name.trim().toLowerCase() === subName.trim().toLowerCase()
      );

      if (existing) {
        subfolderResults.push({
          name: subName,
          id: existing.id,
          status: 'existing',
        });
      } else {
        // Create folder via Graph API
        const createRes = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: subName,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'fail',
            }),
          }
        );

        if (!createRes.ok) {
          const createErr = await createRes.json().catch(() => ({}));
          throw new Error(
            createErr.error?.message || `Failed to create subfolder "${subName}"`
          );
        }

        const createdData = await createRes.json();
        subfolderResults.push({
          name: subName,
          id: createdData.id,
          status: 'created',
        });
      }
    }

    res.json({
      success: true,
      projectFolder: {
        id: folderId,
        name: folderName,
        subfolders: subfolderResults,
      },
      updatedTokens,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to setup project subfolders' });
  }
});

// ---------------------------------------------------------------------------
// 9. SUBFOLDER FILES & CONTENT ENDPOINTS (Requirements, Test Cases, PRD, Others)
// ---------------------------------------------------------------------------

// Demo in-memory file store to simulate live OneDrive subfolders
interface DemoFileItem {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  webUrl: string;
  downloadUrl?: string;
  mimeType?: string;
  content: string;
}

const demoStore: Record<string, DemoFileItem[]> = {
  Requirements: [
    {
      id: 'demo-file-req-1',
      name: 'requirements.md',
      size: 1420,
      lastModifiedDateTime: new Date().toISOString(),
      webUrl: 'https://onedrive.live.com',
      mimeType: 'text/markdown',
      content: `| ID | Title | Description | Priority | Status | Owner | Last Updated |
|---|---|---|---|---|---|---|
| REQ-101 | User Email Authentication | Support email and password authentication with secure tokens and re-authentication for sensitive actions. | High | Approved | Alex Smith | 2026-09-18 |
| REQ-102 | Profile Document Governance | Automatically synchronize and govern user profile fields in Cloud Firestore with role-based rules. | Medium | Approved | Chen Zhang | 2026-09-17 |
| REQ-103 | Microsoft OneDrive OAuth 2.0 | Delegated personal account authentication with Files.ReadWrite, offline_access, and User.Read scopes. | Critical | Approved | Alex Smith | 2026-09-19 |
| REQ-104 | Token Encryption & Silent Renewal | Encrypt access and refresh tokens using AES-256-GCM and renew tokens silently before expiry. | High | Approved | Elena Rostova | 2026-09-19 |
| REQ-105 | Single-File Requirements Parser | Parse Markdown table and CSV files into sortable, filterable tables with full detail views. | Medium | In Review | Jordan Lee | 2026-09-19 |
| REQ-106 | PRD & Asset File Browser | Multi-file document repository with file size, metadata, and direct OneDrive links. | Low | Draft | Alex Smith | 2026-09-16 |`,
    },
  ],
  'Test Cases': [
    {
      id: 'demo-file-tc-1',
      name: 'test_cases.csv',
      size: 1680,
      lastModifiedDateTime: new Date().toISOString(),
      webUrl: 'https://onedrive.live.com',
      mimeType: 'text/csv',
      content: `ID,Title,Steps,Expected Result,Status,Priority,Last Updated
TC-201,User Sign Up Validation,"1. Navigate to Sign Up screen. 2. Enter full name, valid email, matching passwords. 3. Click Create Account.",User is authenticated and redirected to Dashboard with Firestore profile initialized.,Passed,Critical,2026-09-19
TC-202,Password Reset Flow,"1. Click Forgot Password on login page. 2. Enter account email. 3. Verify reset email dispatch.",Password reset email sent and user notified to check inbox.,Passed,High,2026-09-18
TC-203,OneDrive Delegated OAuth,"1. Click Connect OneDrive in Settings. 2. Authorize in Microsoft popup. 3. Verify callback.",Encrypted tokens stored in Firestore; connected email displayed in UI.,Passed,Critical,2026-09-19
TC-204,Automatic Project Subfolder Creation,"1. Complete onboarding wizard folder selection. 2. Observe automated subfolder step.",Requirements, Test Cases, PRD, and Others folders are verified or created.,Passed,High,2026-09-19
TC-205,Single-File Enforcement Warning,"1. Place 2 files in Requirements folder. 2. Navigate to Requirements tab.",Warning banner shown prompting user to fix folder to exactly 1 file.,In Review,Medium,2026-09-19
TC-206,Token Silent Renewal Handling,"1. Simulate token expiration. 2. Make Graph API call.",Background refresh executes using refresh_token without user prompt.,Draft,High,2026-09-17`,
    },
  ],
  PRD: [
    {
      id: 'demo-file-prd-1',
      name: 'DriveDocs_PRD_v1.2.docx',
      size: 148200,
      lastModifiedDateTime: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
      webUrl: 'https://onedrive.live.com',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content: 'Binary Word Document',
    },
    {
      id: 'demo-file-prd-2',
      name: 'Authentication_Architecture_Spec.pdf',
      size: 524000,
      lastModifiedDateTime: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
      webUrl: 'https://onedrive.live.com',
      mimeType: 'application/pdf',
      content: 'Binary PDF Document',
    },
    {
      id: 'demo-file-prd-3',
      name: 'OneDrive_Sync_Data_Flow.png',
      size: 832000,
      lastModifiedDateTime: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      webUrl: 'https://onedrive.live.com',
      mimeType: 'image/png',
      content: 'Binary Image',
    },
  ],
  Others: [
    {
      id: 'demo-file-oth-1',
      name: 'firestore_security_rules.json',
      size: 4200,
      lastModifiedDateTime: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
      webUrl: 'https://onedrive.live.com',
      mimeType: 'application/json',
      content: '{\n  "rules": "rules_version = 2;"\n}',
    },
    {
      id: 'demo-file-oth-2',
      name: 'azure_app_registration_guide.md',
      size: 12800,
      lastModifiedDateTime: new Date(Date.now() - 3600 * 1000 * 72).toISOString(),
      webUrl: 'https://onedrive.live.com',
      mimeType: 'text/markdown',
      content: '# Azure Setup Guide\n\nConfigure tenant to consumers...',
    },
    {
      id: 'demo-file-oth-3',
      name: 'workspace_seed_data.csv',
      size: 24100,
      lastModifiedDateTime: new Date(Date.now() - 3600 * 1000 * 96).toISOString(),
      webUrl: 'https://onedrive.live.com',
      mimeType: 'text/csv',
      content: 'id,category,author\n1,Requirements,Alex',
    },
  ],
};

// Fetch all files inside a given subfolder ('Requirements' | 'Test Cases' | 'PRD' | 'Others')
app.post('/api/onedrive/subfolder-files', async (req, res) => {
  try {
    const {
      subfolderName,
      projectFolderId,
      subfolderId: reqSubfolderId,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      clientId,
      clientSecret,
    } = req.body;

    if (!subfolderName) {
      return res.status(400).json({ error: 'subfolderName is required' });
    }

    // Demo Mode handling
    if (encryptedAccessToken?.startsWith('demo_token:')) {
      const files = demoStore[subfolderName] || [];
      return res.json({
        subfolder: {
          id: reqSubfolderId || `mock-subfolder-${subfolderName}`,
          name: subfolderName,
          webUrl: 'https://onedrive.live.com',
        },
        files,
      });
    }

    if (!encryptedAccessToken || !encryptedRefreshToken) {
      return res.status(401).json({ error: 'OneDrive authentication required' });
    }

    const { accessToken, updatedTokens } = await getValidAccessToken(
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      clientId,
      clientSecret
    );

    let targetSubfolderId = reqSubfolderId;
    let targetSubfolderWebUrl = 'https://onedrive.live.com';

    // If subfolderId wasn't passed directly, find it inside the project folder
    if (!targetSubfolderId && projectFolderId) {
      const listSubfoldersRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${projectFolderId}/children`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }
      );

      if (listSubfoldersRes.ok) {
        const subData = await listSubfoldersRes.json();
        const found = (subData.value || []).find(
          (item: any) =>
            item.folder !== undefined &&
            item.name.trim().toLowerCase() === subfolderName.trim().toLowerCase()
        );
        if (found) {
          targetSubfolderId = found.id;
          targetSubfolderWebUrl = found.webUrl || targetSubfolderWebUrl;
        }
      }
    }

    if (!targetSubfolderId) {
      return res.json({
        subfolder: {
          id: '',
          name: subfolderName,
          webUrl: 'https://onedrive.live.com',
        },
        files: [],
        warning: `Subfolder "${subfolderName}" not found in project folder.`,
        updatedTokens,
      });
    }

    // Fetch children of the subfolder
    const filesRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${targetSubfolderId}/children`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!filesRes.ok) {
      const err = await filesRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to list files in "${subfolderName}"`);
    }

    const filesData = await filesRes.json();
    const items = filesData.value || [];

    // Filter strictly for files (items that are NOT folders)
    const files = items
      .filter((it: any) => it.file !== undefined || it.folder === undefined)
      .map((it: any) => ({
        id: it.id,
        name: it.name,
        size: it.size || 0,
        lastModifiedDateTime: it.lastModifiedDateTime,
        webUrl: it.webUrl,
        downloadUrl: it['@microsoft.graph.downloadUrl'] || '',
        mimeType: it.file?.mimeType || '',
      }));

    res.json({
      subfolder: {
        id: targetSubfolderId,
        name: subfolderName,
        webUrl: targetSubfolderWebUrl,
      },
      files,
      updatedTokens,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch subfolder files' });
  }
});

// Fetch raw file content (for Markdown or CSV parsing)
app.post('/api/onedrive/file-content', async (req, res) => {
  try {
    const {
      fileId,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      clientId,
      clientSecret,
    } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId is required' });
    }

    // Demo Mode handling
    if (encryptedAccessToken?.startsWith('demo_token:')) {
      for (const list of Object.values(demoStore)) {
        const found = list.find((f) => f.id === fileId);
        if (found) {
          return res.json({
            file: {
              id: found.id,
              name: found.name,
              webUrl: found.webUrl,
              lastModifiedDateTime: found.lastModifiedDateTime,
              size: found.size,
            },
            content: found.content,
          });
        }
      }
      return res.status(404).json({ error: 'Demo file not found' });
    }

    const { accessToken, updatedTokens } = await getValidAccessToken(
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      clientId,
      clientSecret
    );

    // Fetch file metadata
    const metaRes = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!metaRes.ok) {
      const err = await metaRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to fetch file metadata');
    }

    const meta = await metaRes.json();

    // Fetch file text content
    const contentRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!contentRes.ok) {
      throw new Error(`Failed to download file content (HTTP ${contentRes.status})`);
    }

    const content = await contentRes.text();

    res.json({
      file: {
        id: meta.id,
        name: meta.name,
        webUrl: meta.webUrl,
        lastModifiedDateTime: meta.lastModifiedDateTime,
        size: meta.size,
      },
      content,
      updatedTokens,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to download file content' });
  }
});

// Create or overwrite a sample file in a subfolder (e.g. to quickly fix 0 files condition)
app.post('/api/onedrive/create-file', async (req, res) => {
  try {
    const {
      subfolderId,
      subfolderName,
      fileName,
      content,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      clientId,
      clientSecret,
    } = req.body;

    if (!fileName || content === undefined) {
      return res.status(400).json({ error: 'fileName and content are required' });
    }

    // Demo Mode handling
    if (encryptedAccessToken?.startsWith('demo_token:')) {
      const cat = subfolderName || 'Requirements';
      const newFile: DemoFileItem = {
        id: `demo-file-${Date.now()}`,
        name: fileName,
        size: Buffer.byteLength(content, 'utf8'),
        lastModifiedDateTime: new Date().toISOString(),
        webUrl: 'https://onedrive.live.com',
        content,
      };

      if (!demoStore[cat]) demoStore[cat] = [];
      demoStore[cat].push(newFile);

      return res.json({ success: true, file: newFile });
    }

    const { accessToken, updatedTokens } = await getValidAccessToken(
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt,
      clientId,
      clientSecret
    );

    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${subfolderId}:/${encodeURIComponent(
      fileName
    )}:/content`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: content,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.error?.message || `Upload failed with status ${uploadRes.status}`);
    }

    const file = await uploadRes.json();
    res.json({ success: true, file, updatedTokens });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create file' });
  }
});

// Helper for testing demo files state (0 files, 1 file, or multiple files)
app.post('/api/onedrive/demo-adjust-files', (req, res) => {
  const { subfolderName, mode } = req.body;
  if (!subfolderName || !mode) {
    return res.status(400).json({ error: 'subfolderName and mode required' });
  }

  if (mode === 'zero') {
    demoStore[subfolderName] = [];
  } else if (mode === 'multiple') {
    demoStore[subfolderName] = [
      {
        id: 'demo-f-1',
        name: subfolderName === 'Requirements' ? 'requirements_v1.md' : 'test_cases_core.csv',
        size: 1540,
        lastModifiedDateTime: new Date().toISOString(),
        webUrl: 'https://onedrive.live.com',
        content: '# File 1 Content',
      },
      {
        id: 'demo-f-2',
        name: subfolderName === 'Requirements' ? 'requirements_v2_draft.md' : 'test_cases_regression.csv',
        size: 2100,
        lastModifiedDateTime: new Date(Date.now() - 3600000).toISOString(),
        webUrl: 'https://onedrive.live.com',
        content: '# File 2 Content',
      },
    ];
  } else if (mode === 'single') {
    if (subfolderName === 'Requirements') {
      demoStore.Requirements = [
        {
          id: 'demo-file-req-1',
          name: 'requirements.md',
          size: 1420,
          lastModifiedDateTime: new Date().toISOString(),
          webUrl: 'https://onedrive.live.com',
          mimeType: 'text/markdown',
          content: `| ID | Title | Description | Priority | Status | Owner | Last Updated |
|---|---|---|---|---|---|---|
| REQ-101 | User Email Authentication | Support email and password authentication with secure tokens and re-authentication for sensitive actions. | High | Approved | Alex Smith | 2026-09-18 |
| REQ-102 | Profile Document Governance | Automatically synchronize and govern user profile fields in Cloud Firestore with role-based rules. | Medium | Approved | Chen Zhang | 2026-09-17 |
| REQ-103 | Microsoft OneDrive OAuth 2.0 | Delegated personal account authentication with Files.ReadWrite, offline_access, and User.Read scopes. | Critical | Approved | Alex Smith | 2026-09-19 |
| REQ-104 | Token Encryption & Silent Renewal | Encrypt access and refresh tokens using AES-256-GCM and renew tokens silently before expiry. | High | Approved | Elena Rostova | 2026-09-19 |
| REQ-105 | Single-File Requirements Parser | Parse Markdown table and CSV files into sortable, filterable tables with full detail views. | Medium | In Review | Jordan Lee | 2026-09-19 |
| REQ-106 | PRD & Asset File Browser | Multi-file document repository with file size, metadata, and direct OneDrive links. | Low | Draft | Alex Smith | 2026-09-16 |`,
        },
      ];
    } else if (subfolderName === 'Test Cases') {
      demoStore['Test Cases'] = [
        {
          id: 'demo-file-tc-1',
          name: 'test_cases.csv',
          size: 1680,
          lastModifiedDateTime: new Date().toISOString(),
          webUrl: 'https://onedrive.live.com',
          mimeType: 'text/csv',
          content: `ID,Title,Steps,Expected Result,Status,Priority,Last Updated
TC-201,User Sign Up Validation,"1. Navigate to Sign Up screen. 2. Enter full name, valid email, matching passwords. 3. Click Create Account.",User is authenticated and redirected to Dashboard with Firestore profile initialized.,Passed,Critical,2026-09-19
TC-202,Password Reset Flow,"1. Click Forgot Password on login page. 2. Enter account email. 3. Verify reset email dispatch.",Password reset email sent and user notified to check inbox.,Passed,High,2026-09-18
TC-203,OneDrive Delegated OAuth,"1. Click Connect OneDrive in Settings. 2. Authorize in Microsoft popup. 3. Verify callback.",Encrypted tokens stored in Firestore; connected email displayed in UI.,Passed,Critical,2026-09-19
TC-204,Automatic Project Subfolder Creation,"1. Complete onboarding wizard folder selection. 2. Observe automated subfolder step.",Requirements, Test Cases, PRD, and Others folders are verified or created.,Passed,High,2026-09-19
TC-205,Single-File Enforcement Warning,"1. Place 2 files in Requirements folder. 2. Navigate to Requirements tab.",Warning banner shown prompting user to fix folder to exactly 1 file.,In Review,Medium,2026-09-19
TC-206,Token Silent Renewal Handling,"1. Simulate token expiration. 2. Make Graph API call.",Background refresh executes using refresh_token without user prompt.,Draft,High,2026-09-17`,
        },
      ];
    }
  }

  res.json({ success: true, files: demoStore[subfolderName] || [] });
});

// ---------------------------------------------------------------------------
// 10. AI CONNECTIONS & AI ACTION WORKSPACE (OpenAI, Claude, Gemini, Azure, Custom)
// ---------------------------------------------------------------------------

function formatMaskedApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }
  if (trimmed.startsWith('sk-ant-')) {
    return `sk-ant-…${trimmed.slice(-4)}`;
  }
  if (trimmed.startsWith('sk-')) {
    return `sk-…${trimmed.slice(-4)}`;
  }
  if (trimmed.startsWith('AIza')) {
    return `AIza…${trimmed.slice(-4)}`;
  }
  const prefix = trimmed.slice(0, 3);
  const suffix = trimmed.slice(-4);
  return `${prefix}…${suffix}`;
}

// Encrypt and mask API key before saving to Firestore at rest
app.post('/api/ai/encrypt-key', (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const trimmed = apiKey.trim();
    const encryptedApiKey = encrypt(trimmed);
    const maskedApiKey = formatMaskedApiKey(trimmed);

    res.json({
      encryptedApiKey,
      maskedApiKey,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to encrypt API key' });
  }
});

// Test Connection with minimal test call
app.post('/api/ai/test-connection', async (req, res) => {
  try {
    const {
      provider,
      apiKey,
      encryptedApiKey,
      model,
      customEndpoint,
      azureDeploymentName,
      azureApiVersion,
    } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'AI provider is required' });
    }

    // Resolve key
    let key = '';
    if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
      key = apiKey.trim();
    } else if (encryptedApiKey) {
      try {
        key = decrypt(encryptedApiKey).trim();
      } catch (e: any) {
        return res.status(400).json({ error: 'Failed to decrypt existing stored API key.' });
      }
    }

    if (!key && provider !== 'custom') {
      return res.status(400).json({ error: 'API key is required to test the connection.' });
    }

    // Sandbox / Demo key bypass for testing without active billing accounts
    if (key.toLowerCase().includes('demo') || key.toLowerCase().startsWith('mock-')) {
      return res.json({
        success: true,
        provider,
        message: `Demo connection verified for ${provider.toUpperCase()}! Sandbox mode is active.`,
        maskedApiKey: formatMaskedApiKey(key),
      });
    }

    // Real Provider Tests
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error?.message ||
            `OpenAI test call rejected with HTTP ${response.status} (${response.statusText})`
        );
      }

      return res.json({
        success: true,
        provider: 'openai',
        message: 'OpenAI connection verified! Models list accessible.',
        maskedApiKey: formatMaskedApiKey(key),
      });
    }

    if (provider === 'anthropic') {
      const targetModel = model || 'claude-3-5-haiku-20241022';
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: targetModel,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error?.message ||
            `Anthropic test call rejected with HTTP ${response.status} (${response.statusText})`
        );
      }

      return res.json({
        success: true,
        provider: 'anthropic',
        message: 'Anthropic Claude connection verified successfully!',
        maskedApiKey: formatMaskedApiKey(key),
      });
    }

    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error?.message ||
            `Google Gemini test call rejected with HTTP ${response.status} (${response.statusText})`
        );
      }

      return res.json({
        success: true,
        provider: 'gemini',
        message: 'Google Gemini connection verified! Models list accessible.',
        maskedApiKey: formatMaskedApiKey(key),
      });
    }

    if (provider === 'azure') {
      if (!customEndpoint || !customEndpoint.trim()) {
        return res.status(400).json({ error: 'Azure OpenAI endpoint URL is required.' });
      }

      const cleanEndpoint = customEndpoint.trim().replace(/\/+$/, '');
      const depName = (azureDeploymentName || 'gpt-4o').trim();
      const apiVer = (azureApiVersion || '2024-02-15-preview').trim();
      const url = `${cleanEndpoint}/openai/deployments/${depName}/chat/completions?api-version=${apiVer}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error?.message ||
            `Azure OpenAI test call failed with HTTP ${response.status} (${response.statusText})`
        );
      }

      return res.json({
        success: true,
        provider: 'azure',
        message: 'Azure OpenAI connection verified successfully!',
        maskedApiKey: formatMaskedApiKey(key),
      });
    }

    if (provider === 'custom') {
      if (!customEndpoint || !customEndpoint.trim()) {
        return res.status(400).json({ error: 'Custom Base URL endpoint is required.' });
      }

      const cleanBase = customEndpoint.trim().replace(/\/+$/, '');
      const targetUrl = cleanBase.endsWith('/chat/completions')
        ? cleanBase
        : `${cleanBase}/chat/completions`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (key) {
        headers['Authorization'] = `Bearer ${key}`;
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || 'default',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error?.message ||
            `Custom endpoint test failed with HTTP ${response.status} (${response.statusText})`
        );
      }

      return res.json({
        success: true,
        provider: 'custom',
        message: 'Custom AI Endpoint connection verified successfully!',
        maskedApiKey: key ? formatMaskedApiKey(key) : 'No key required',
      });
    }

    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Connection test failed.' });
  }
});

// AI Actions: "Summarize this requirement" and "Generate test cases from this requirement"
app.post('/api/ai/action', async (req, res) => {
  try {
    const {
      action,
      provider,
      encryptedApiKey,
      model,
      customEndpoint,
      azureDeploymentName,
      azureApiVersion,
      requirement,
    } = req.body;

    if (!action || (action !== 'summarize' && action !== 'generate-test-cases')) {
      return res.status(400).json({
        error: 'Invalid action. Must be "summarize" or "generate-test-cases".',
      });
    }

    if (!requirement || !requirement.title) {
      return res.status(400).json({ error: 'Requirement payload is required.' });
    }

    if (!encryptedApiKey && provider !== 'custom') {
      return res.status(400).json({
        error: 'No AI key configured. Please configure your API key in Settings -> AI Connections.',
      });
    }

    let apiKey = '';
    if (encryptedApiKey) {
      try {
        apiKey = decrypt(encryptedApiKey).trim();
      } catch (e) {
        return res.status(400).json({ error: 'Failed to decrypt API key stored in Firestore.' });
      }
    }

    const isDemo = apiKey.toLowerCase().includes('demo') || apiKey.toLowerCase().startsWith('mock-');

    // Prompts
    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'summarize') {
      systemPrompt =
        'You are an expert systems architect and technical product leader. Provide a clear, structured, and insightful summary of the specified requirement. Highlight the core executive overview, functional scope boundaries, critical acceptance criteria, and governance notes. Use clean Markdown formatting.';
      userPrompt = `Please summarize this requirement:
- Requirement ID: ${requirement.id || 'N/A'}
- Title: ${requirement.title}
- Priority: ${requirement.priority || 'Normal'}
- Status: ${requirement.status || 'Draft'}
- Owner: ${requirement.owner || 'Unassigned'}
- Last Updated: ${requirement.lastUpdated || 'N/A'}
- Detailed Specification:
${requirement.description || 'No extended description provided.'}`;
    } else {
      systemPrompt =
        'You are a principal QA automation and test engineering lead. Generate high-quality, production-ready test cases for the specified requirement. Include: 1) Positive Happy Path, 2) Negative & Input Validation Scenarios, 3) Edge Cases & Network/Security Resilience. Format each test case with Test ID, Title, Type, Preconditions, Step-by-Step Actions, Expected Results, and Severity.';
      userPrompt = `Please generate comprehensive QA test cases for this requirement:
- Requirement ID: ${requirement.id || 'N/A'}
- Title: ${requirement.title}
- Priority: ${requirement.priority || 'Normal'}
- Status: ${requirement.status || 'Draft'}
- Owner: ${requirement.owner || 'Unassigned'}
- Detailed Specification:
${requirement.description || 'No extended description provided.'}`;
    }

    // Demo / Sandbox response generator
    if (isDemo) {
      if (action === 'summarize') {
        const demoSummary = `### Executive Summary: ${requirement.title} (${requirement.id || 'REQ'})

**Overview**
This specification governs the implementation and reliability of **${requirement.title}**. It guarantees consistent state lifecycle, deterministic error handling, and robust integration within the enterprise workspace.

---

### Key Scope Boundaries
- **In-Scope:**
  - Automated validation of all input payloads against predefined schemas.
  - State persistence in Cloud Firestore with role-based access control.
  - Structured error reporting with actionable status codes.
- **Out-of-Scope:**
  - Retrofitting deprecated legacy APIs.
  - Manual database interventions without audited credentials.

---

### Core Acceptance Criteria
1. **Verification of Inputs:** All payloads must be sanitized and validated before committing transactions.
2. **Deterministic Response:** P95 response latency must remain under 180ms under typical concurrency.
3. **Audit Trail:** Every status mutation from *${requirement.status || 'Draft'}* must register a timestamp and operator ID.

---

### Governance & Ownership
- **Lead Owner:** ${requirement.owner || 'Product Architecture Team'}
- **Current Priority:** ${requirement.priority || 'High'}
- **Lifecycle Status:** ${requirement.status || 'Approved'}`;

        return res.json({
          success: true,
          action,
          provider: 'demo',
          modelUsed: 'DriveDocs-AI-Sandbox',
          result: demoSummary,
        });
      } else {
        const reqNum = (requirement.id || '101').replace(/\D/g, '') || '101';
        const demoTestCases = `### Production QA Test Suite for ${requirement.id || 'REQ'}: ${requirement.title}

#### 1. TC-${reqNum}-01: Positive Happy Path Validation
- **Title:** Verify standard execution and successful commit for ${requirement.title}
- **Category:** Functional / Positive Path
- **Priority:** Critical
- **Preconditions:** Active authenticated session with read/write workspace privileges.
- **Step-by-Step Procedure:**
  1. Open the module for **${requirement.title}**.
  2. Input valid, compliant test data matching the specification.
  3. Submit the form/action and observe the network response.
- **Expected Outcome:** System returns HTTP 200/Success, commits document to persistent storage, and renders immediate UI confirmation.

---

#### 2. TC-${reqNum}-02: Negative & Malformed Payload Handling
- **Title:** Reject missing required fields and malicious input strings
- **Category:** Validation / Security
- **Priority:** High
- **Preconditions:** Form is reset to clean baseline.
- **Step-by-Step Procedure:**
  1. Submit empty payload or omit mandatory fields for ${requirement.id}.
  2. Inject boundary characters (e.g. \`<script>\`, SQL/NoSQL injection tokens).
  3. Attempt action dispatch.
- **Expected Outcome:** Client-side and server-side validation immediately reject the request. Clear inline warnings are shown; no orphaned records created.

---

#### 3. TC-${reqNum}-03: Boundary & Network Interruption Resilience
- **Title:** Graceful degradation during network timeout and session loss
- **Category:** Reliability / Edge Case
- **Priority:** Medium
- **Preconditions:** Network simulation throttle configured to offline or high-latency.
- **Step-by-Step Procedure:**
  1. Initiate transaction for **${requirement.title}**.
  2. Sever connectivity midway through processing.
  3. Re-establish connection and click "Retry".
- **Expected Outcome:** System catches network disconnect without unhandled runtime exceptions. User is presented with a non-blocking retry prompt.`;

        return res.json({
          success: true,
          action,
          provider: 'demo',
          modelUsed: 'DriveDocs-AI-Sandbox',
          result: demoTestCases,
        });
      }
    }

    // 1. OpenAI
    if (provider === 'openai') {
      const targetModel = model || 'gpt-4o-mini';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error?.message || `OpenAI chat completion failed with status ${response.status}`
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || 'No output received from OpenAI.';

      return res.json({
        success: true,
        action,
        provider: 'openai',
        modelUsed: targetModel,
        result: text,
      });
    }

    // 2. Anthropic Claude
    if (provider === 'anthropic') {
      const targetModel = model || 'claude-3-5-sonnet-20241022';
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: targetModel,
          max_tokens: 2500,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error?.message ||
            `Anthropic Claude request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      const text =
        data.content
          ?.filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n\n') || 'No output received from Claude.';

      return res.json({
        success: true,
        action,
        provider: 'anthropic',
        modelUsed: targetModel,
        result: text,
      });
    }

    // 3. Google Gemini
    if (provider === 'gemini') {
      const targetModel = model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2500,
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error?.message || `Google Gemini request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      const text =
        data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ||
        'No output received from Gemini.';

      return res.json({
        success: true,
        action,
        provider: 'gemini',
        modelUsed: targetModel,
        result: text,
      });
    }

    // 4. Azure OpenAI
    if (provider === 'azure') {
      const cleanEndpoint = (customEndpoint || '').trim().replace(/\/+$/, '');
      const depName = (azureDeploymentName || 'gpt-4o').trim();
      const apiVer = (azureApiVersion || '2024-02-15-preview').trim();
      const url = `${cleanEndpoint}/openai/deployments/${depName}/chat/completions?api-version=${apiVer}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 2500,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error?.message || `Azure OpenAI request failed with status ${response.status}`
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || 'No output received from Azure OpenAI.';

      return res.json({
        success: true,
        action,
        provider: 'azure',
        modelUsed: depName,
        result: text,
      });
    }

    // 5. Custom Endpoint
    if (provider === 'custom') {
      const cleanBase = (customEndpoint || '').trim().replace(/\/+$/, '');
      const targetUrl = cleanBase.endsWith('/chat/completions')
        ? cleanBase
        : `${cleanBase}/chat/completions`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || 'default',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 2500,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error?.message || `Custom AI endpoint failed with status ${response.status}`
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || 'No output received from Custom Endpoint.';

      return res.json({
        success: true,
        action,
        provider: 'custom',
        modelUsed: model || 'custom',
        result: text,
      });
    }

    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI action execution failed.' });
  }
});

// ---------------------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DriveDocs Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
