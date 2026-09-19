import React, { useState, useEffect, useMemo } from 'react';
import {
  ListChecks,
  AlertTriangle,
  FileCode,
  ExternalLink,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Plus,
  Clock,
  FolderOpen,
  Filter,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Cloud,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RequirementRow, OneDriveSubfolderFile } from '../types';
import {
  fetchSubfolderFiles,
  fetchFileContent,
  parseRequirementsFile,
  createFileInSubfolder,
  adjustDemoFiles
} from '../services/onedriveService';
import { RequirementDetailPage } from './RequirementDetailPage';

interface RequirementsPageProps {
  onNavigateSettings?: (tab?: string) => void;
}

type SortField = 'id' | 'title' | 'priority' | 'status' | 'owner' | 'lastUpdated';
type SortOrder = 'asc' | 'desc';

const SAMPLE_REQ_MARKDOWN = `| ID | Title | Description | Priority | Status | Owner | Last Updated |
|---|---|---|---|---|---|---|
| REQ-101 | User Email Authentication | Support email and password authentication with secure tokens and re-authentication for sensitive actions. | High | Approved | Alex Smith | 2026-09-18 |
| REQ-102 | Profile Document Governance | Automatically synchronize and govern user profile fields in Cloud Firestore with role-based rules. | Medium | Approved | Chen Zhang | 2026-09-17 |
| REQ-103 | Microsoft OneDrive OAuth 2.0 | Delegated personal account authentication with Files.ReadWrite, offline_access, and User.Read scopes. | Critical | Approved | Alex Smith | 2026-09-19 |
| REQ-104 | Token Encryption & Silent Renewal | Encrypt access and refresh tokens using AES-256-GCM and renew tokens silently before expiry. | High | Approved | Elena Rostova | 2026-09-19 |
| REQ-105 | Single-File Requirements Parser | Parse Markdown table and CSV files into sortable, filterable tables with full detail views. | Medium | In Review | Jordan Lee | 2026-09-19 |
| REQ-106 | PRD & Asset File Browser | Multi-file document repository with file size, metadata, and direct OneDrive links. | Low | Draft | Alex Smith | 2026-09-16 |`;

export const RequirementsPage: React.FC<RequirementsPageProps> = ({ onNavigateSettings }) => {
  const { userProfile, updateOneDriveConnection } = useAuth();
  const onedrive = userProfile?.onedrive;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subfolderData, setSubfolderData] = useState<{ id: string; name: string; webUrl: string } | null>(null);
  const [files, setFiles] = useState<OneDriveSubfolderFile[]>([]);
  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [activeFile, setActiveFile] = useState<OneDriveSubfolderFile | null>(null);

  // Detail view state
  const [selectedReq, setSelectedReq] = useState<RequirementRow | null>(null);

  // Filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Creating sample file
  const [isCreatingSample, setIsCreatingSample] = useState(false);

  // Load files inside "Requirements" subfolder
  const loadRequirementsFolder = async () => {
    if (!onedrive?.connected) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetchSubfolderFiles(
        onedrive,
        'Requirements',
        onedrive.projectFolder?.id,
        undefined,
        onedrive.azureCredentials
      );

      setSubfolderData(response.subfolder);
      setFiles(response.files || []);

      if (response.updatedTokens) {
        updateOneDriveConnection({
          encryptedAccessToken: response.updatedTokens.encryptedAccessToken,
          encryptedRefreshToken: response.updatedTokens.encryptedRefreshToken,
          expiresAt: response.updatedTokens.expiresAt,
        });
      }

      // Exact single-file requirement
      if (response.files && response.files.length === 1) {
        const file = response.files[0];
        setActiveFile(file);
        const contentRes = await fetchFileContent(onedrive, file.id, onedrive.azureCredentials);
        const parsed = parseRequirementsFile(contentRes.content);
        setRequirements(parsed);
      } else {
        setActiveFile(null);
        setRequirements([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load Requirements folder from OneDrive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequirementsFolder();
  }, [onedrive?.connected, onedrive?.projectFolder?.id]);

  // Handle creating a sample requirements file if 0 files exist
  const handleCreateSampleFile = async () => {
    if (!onedrive) return;
    setIsCreatingSample(true);
    setError(null);
    try {
      const targetSubId = subfolderData?.id || onedrive.projectFolder?.subfolders?.find(s => s.name === 'Requirements')?.id || 'mock-req-id';
      await createFileInSubfolder(
        onedrive,
        targetSubId,
        'Requirements',
        'requirements.md',
        SAMPLE_REQ_MARKDOWN,
        onedrive.azureCredentials
      );
      await loadRequirementsFolder();
    } catch (err: any) {
      setError(err.message || 'Failed to create sample requirements file in OneDrive');
    } finally {
      setIsCreatingSample(false);
    }
  };

  // Demo simulation mode controls (to demonstrate 0, 1, or >1 files warning banner)
  const handleSimulateFiles = async (mode: 'zero' | 'single' | 'multiple') => {
    setLoading(true);
    try {
      await adjustDemoFiles('Requirements', mode);
      await loadRequirementsFolder();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Sorting helper
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered and sorted requirements
  const displayedRequirements = useMemo(() => {
    let result = [...requirements];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.owner.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Priority filter
    if (priorityFilter !== 'All') {
      result = result.filter((r) => r.priority.toLowerCase() === priorityFilter.toLowerCase());
    }

    // Sort
    result.sort((a, b) => {
      let valA = (a[sortField] || '').toString().toLowerCase();
      let valB = (b[sortField] || '').toString().toLowerCase();

      // Priority custom weight sorting
      if (sortField === 'priority') {
        const weights: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        const wA = weights[valA] || 0;
        const wB = weights[valB] || 0;
        return sortOrder === 'asc' ? wA - wB : wB - wA;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [requirements, searchQuery, statusFilter, priorityFilter, sortField, sortOrder]);

  // Priority badge styling
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Status badge styling
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in review':
      case 'review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Detail View Active
  if (selectedReq) {
    return (
      <RequirementDetailPage
        requirement={selectedReq}
        file={activeFile}
        onBack={() => setSelectedReq(null)}
        onNavigateSettings={onNavigateSettings}
      />
    );
  }

  // Not connected state
  if (!onedrive?.connected) {
    return (
      <div id="requirements-unconnected" className="max-w-4xl mx-auto space-y-6 pt-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
            <Cloud className="w-8 h-8 stroke-[1.8]" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold text-slate-900">OneDrive Connection Required</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              The Requirements tab fetches specifications directly from the single file in your Microsoft OneDrive <strong className="text-slate-800">Requirements</strong> subfolder.
            </p>
          </div>
          <button
            onClick={() => onNavigateSettings && onNavigateSettings()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Connect OneDrive in Settings
          </button>
        </div>
      </div>
    );
  }

  const fileCount = files.length;
  const isInvalidFileCount = fileCount !== 1;
  const isTokenExpired = Boolean(
    onedrive?.connected &&
    onedrive?.expiresAt &&
    Date.now() > onedrive.expiresAt
  );

  return (
    <div id="requirements-container" className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <ListChecks className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Requirements Specification
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Single-file synchronized from OneDrive subfolder: <span className="font-mono text-blue-700 font-semibold">{subfolderData?.name || 'Requirements'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {subfolderData?.webUrl && (
            <a
              id="open-requirements-folder-btn"
              href={subfolderData.webUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Open Folder in OneDrive</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          )}

          <button
            id="refresh-requirements-btn"
            onClick={loadRequirementsFolder}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ERROR STATE: Token expired banner */}
      {isTokenExpired && (
        <div
          id="requirements-token-expired-banner"
          className="rounded-2xl border border-rose-300 bg-rose-50/95 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-rose-950">OneDrive token expired — reconnect</h3>
              <p className="text-xs text-rose-800/85 mt-0.5">
                Your Microsoft OneDrive session has expired. Reconnect in Settings to synchronize your Requirements folder.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateSettings && onNavigateSettings('onedrive')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            Reconnect in Settings
          </button>
        </div>
      )}

      {/* General Error alert */}
      {error && !isTokenExpired && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* LOADING STATE: Animated Table Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="h-4 bg-slate-200 rounded-lg w-1/3 animate-pulse"></div>
            <div className="h-4 bg-slate-200 rounded-lg w-24 animate-pulse"></div>
          </div>
          <div className="space-y-3 pt-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
                <div className="h-4 bg-slate-100 rounded w-16 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded flex-1 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded w-20 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded w-24 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EMPTY & WARNING STATES: Zero files or More than 1 file in Requirements folder */}
      {!loading && isInvalidFileCount && (
        <div
          id="requirements-file-count-warning-banner"
          className="rounded-2xl border border-amber-300 bg-amber-50/90 p-6 shadow-sm space-y-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <span>
                  {fileCount === 0
                    ? 'No requirements found — check your Requirements folder'
                    : 'Action Required: Requirements Folder Must Contain Exactly One File'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900">
                  {fileCount} {fileCount === 1 ? 'file' : 'files'} detected
                </span>
              </h3>
              <p className="text-xs text-amber-900/85 leading-relaxed max-w-3xl">
                {fileCount === 0 ? (
                  <>
                    No requirements found — check your Requirements folder in OneDrive. Exactly one file (formatted as a Markdown table or CSV with columns: <em>ID, Title, Description, Priority, Status, Owner, Last Updated</em>) is required for DriveDocs to parse and display your specification dataset.
                  </>
                ) : (
                  <>
                    The <strong className="font-semibold">Requirements</strong> folder contains <strong>{fileCount} files</strong> ({files.map(f => f.name).join(', ')}). DriveDocs enforces a single authoritative specification file. Please consolidate or remove the extra files in OneDrive so that exactly one file remains.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons on the warning banner */}
          <div className="flex flex-wrap items-center gap-3 pt-2 pl-14">
            {fileCount === 0 && (
              <button
                id="create-sample-requirements-btn"
                onClick={handleCreateSampleFile}
                disabled={isCreatingSample}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isCreatingSample ? 'Creating File...' : 'Create Sample requirements.md'}</span>
              </button>
            )}

            {subfolderData?.webUrl && (
              <a
                href={subfolderData.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-2xs"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-700" />
                <span>Open Folder in OneDrive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* In demo mode, quick-toggle buttons to verify warning behavior */}
            {onedrive.encryptedAccessToken?.startsWith('demo_token:') && (
              <div className="flex items-center gap-1.5 ml-auto text-[11px] text-amber-800 bg-amber-100/70 px-3 py-1.5 rounded-lg border border-amber-200">
                <span className="font-semibold">Test Scenarios:</span>
                <button
                  onClick={() => handleSimulateFiles('zero')}
                  className="px-2 py-0.5 rounded bg-white font-medium hover:bg-amber-50 cursor-pointer"
                >
                  0 Files
                </button>
                <button
                  onClick={() => handleSimulateFiles('single')}
                  className="px-2 py-0.5 rounded bg-white font-medium hover:bg-amber-50 cursor-pointer"
                >
                  1 File
                </button>
                <button
                  onClick={() => handleSimulateFiles('multiple')}
                  className="px-2 py-0.5 rounded bg-white font-medium hover:bg-amber-50 cursor-pointer"
                >
                  2+ Files
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SINGLE FILE VALID: Show Active File Info Bar + Filter Controls + Data Table */}
      {!loading && !isInvalidFileCount && activeFile && (
        <div className="space-y-4">
          {/* Source File Information Strip */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{activeFile.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {Math.max(1, Math.round(activeFile.size / 1024))} KB
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Specification Source
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Last updated: {new Date(activeFile.lastModifiedDateTime).toLocaleString()} • {requirements.length} rows parsed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                id="open-source-file-onedrive-btn"
                href={activeFile.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>Open in OneDrive</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {/* Demo test buttons */}
              {onedrive.encryptedAccessToken?.startsWith('demo_token:') && (
                <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-400 pl-2 border-l border-slate-200">
                  <span>Simulate:</span>
                  <button
                    onClick={() => handleSimulateFiles('zero')}
                    className="hover:text-blue-600 underline cursor-pointer"
                  >
                    0 files
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => handleSimulateFiles('multiple')}
                    className="hover:text-blue-600 underline cursor-pointer"
                  >
                    multiple
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="requirements-search-input"
                type="text"
                placeholder="Search requirements by ID, title, description, or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Filter className="w-3.5 h-3.5" />
                <span>Status:</span>
                <select
                  id="requirements-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="All">All Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="In Review">In Review</option>
                  <option value="Draft">Draft</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Priority:</span>
                <select
                  id="requirements-priority-filter"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="All">All Priorities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sortable Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table id="requirements-data-table" className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th
                      onClick={() => handleSort('id')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none w-28"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>ID</span>
                        {sortField === 'id' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('title')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Title & Description</span>
                        {sortField === 'title' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('priority')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none w-28"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Priority</span>
                        {sortField === 'priority' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('status')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none w-28"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Status</span>
                        {sortField === 'status' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('owner')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none w-36"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Owner</span>
                        {sortField === 'owner' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th
                      onClick={() => handleSort('lastUpdated')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none w-32 text-right"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Last Updated</span>
                        {sortField === 'lastUpdated' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        )}
                      </div>
                    </th>

                    <th className="py-3 px-3 w-10"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  {displayedRequirements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No requirements found matching the current search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    displayedRequirements.map((req) => (
                      <tr
                        key={req.id}
                        id={`req-row-${req.id}`}
                        onClick={() => setSelectedReq(req)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 group-hover:text-blue-600">
                          {req.id}
                        </td>

                        <td className="py-3.5 px-4 max-w-md">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {req.title}
                          </div>
                          {req.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {req.description}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getPriorityBadgeClass(req.priority)}`}>
                            {req.priority}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadgeClass(req.status)}`}>
                            {req.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-medium truncate">
                          {req.owner}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-right font-mono text-[11px]">
                          {req.lastUpdated}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="py-3 px-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Showing {displayedRequirements.length} of {requirements.length} requirements</span>
              <span className="font-medium text-slate-500">Click any row to open full requirement specification</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
