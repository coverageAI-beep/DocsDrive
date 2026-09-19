import { AIConnectionInfo, AIProvider, RequirementRow } from '../types';

export interface TestConnectionParams {
  provider: AIProvider;
  apiKey?: string;
  encryptedApiKey?: string;
  model?: string;
  customEndpoint?: string;
  azureDeploymentName?: string;
  azureApiVersion?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  maskedApiKey?: string;
}

export interface EncryptKeyResult {
  encryptedApiKey: string;
  maskedApiKey: string;
}

export interface ExecuteAIActionParams {
  action: 'summarize' | 'generate-test-cases';
  provider: AIProvider;
  encryptedApiKey: string;
  model?: string;
  customEndpoint?: string;
  azureDeploymentName?: string;
  azureApiVersion?: string;
  requirement: RequirementRow;
}

export interface ExecuteAIActionResult {
  success: boolean;
  action: 'summarize' | 'generate-test-cases';
  provider: string;
  modelUsed?: string;
  result: string;
}

/**
 * Encrypts the raw API key at rest via server AES-256-GCM and generates a masked preview.
 */
export async function encryptApiKey(apiKey: string): Promise<EncryptKeyResult> {
  const res = await fetch('/api/ai/encrypt-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to encrypt API key (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Performs a minimal test call to validate the API key with the provider before saving.
 */
export async function testAIConnection(params: TestConnectionParams): Promise<TestConnectionResult> {
  const res = await fetch('/api/ai/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Connection test failed with HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Calls the selected AI provider's chat completion API for Summarize or Test Case generation.
 */
export async function executeAIAction(params: ExecuteAIActionParams): Promise<ExecuteAIActionResult> {
  const res = await fetch('/api/ai/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `AI action failed with HTTP ${res.status}`);
  }

  return res.json();
}
