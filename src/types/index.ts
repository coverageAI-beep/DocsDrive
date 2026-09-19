export interface OneDriveSubfolder {
  name: string;
  id: string;
  status: 'existing' | 'created';
}

export interface OneDriveProjectFolder {
  id: string;
  name: string;
  path?: string;
  webUrl?: string;
  subfolders?: OneDriveSubfolder[];
}

export interface OneDriveConnectionInfo {
  connected: boolean;
  accountEmail?: string;
  accountName?: string;
  connectedAt?: string;
  encryptedAccessToken?: string;
  encryptedRefreshToken?: string;
  expiresAt?: number;
  projectFolder?: OneDriveProjectFolder;
  azureCredentials?: {
    clientId?: string;
    clientSecret?: string;
  };
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  avatarColor?: string;
  bio?: string;
  title?: string;
  department?: string;
  createdAt?: string;
  updatedAt?: string;
  onedrive?: OneDriveConnectionInfo;
  aiConnection?: AIConnectionInfo;
  onboardingDismissed?: boolean;
}

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'azure' | 'custom';

export interface AIConnectionInfo {
  provider: AIProvider;
  model?: string;
  customEndpoint?: string;
  azureDeploymentName?: string;
  azureApiVersion?: string;
  encryptedApiKey: string;
  maskedApiKey: string;
  lastTestedAt?: string;
  isValid: boolean;
}

export type NavigationPage = 
  | 'dashboard'
  | 'requirements'
  | 'testcases'
  | 'prd'
  | 'otherfiles'
  | 'settings';

export type AuthScreen =
  | 'landing'
  | 'signup'
  | 'login'
  | 'forgot-password'
  | 'reset-password';

export interface DocumentItem {
  id: string;
  title: string;
  category: 'Requirements' | 'Test Cases' | 'PRD' | 'Other Files';
  status: 'Draft' | 'In Review' | 'Approved' | 'Deprecated';
  updatedAt: string;
  author: string;
  version: string;
  summary: string;
  tags: string[];
}

export interface RequirementRow {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  owner: string;
  lastUpdated: string;
  raw?: Record<string, string>;
}

export interface TestCaseRow {
  id: string;
  title: string;
  steps: string;
  expectedResult: string;
  status: string;
  priority: string;
  lastUpdated: string;
  raw?: Record<string, string>;
}

export interface OneDriveSubfolderFile {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  webUrl: string;
  downloadUrl?: string;
  mimeType?: string;
}

export interface SubfolderFilesResponse {
  subfolder: {
    id: string;
    name: string;
    webUrl: string;
  };
  files: OneDriveSubfolderFile[];
  warning?: string;
  updatedTokens?: any;
}

export interface SyncActivityItem {
  id: string;
  type: 'requirement' | 'testcase' | 'prd' | 'onedrive' | 'ai' | 'file';
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
  author?: string;
  statusBadge?: {
    label: string;
    variant: 'success' | 'warning' | 'info' | 'neutral' | 'danger';
  };
  targetPage?: NavigationPage;
  targetTab?: string;
}

