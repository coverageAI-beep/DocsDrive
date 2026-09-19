import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  FolderOpen,
  ExternalLink,
  Download,
  RefreshCw,
  Search,
  Plus,
  Upload,
  Clock,
  HardDrive,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  FileArchive,
  Cloud,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { OneDriveSubfolderFile } from '../types';
import { fetchSubfolderFiles, createFileInSubfolder } from '../services/onedriveService';

interface PRDPageProps {
  onNavigateSettings?: (tab?: string) => void;
  onOpenNewDocModal?: () => void;
}

type SortField = 'name' | 'type' | 'size' | 'lastModified';
type SortOrder = 'asc' | 'desc';

export const PRDPage: React.FC<PRDPageProps> = ({ onNavigateSettings, onOpenNewDocModal }) => {
  const { userProfile, updateOneDriveConnection } = useAuth();
  const onedrive = userProfile?.onedrive;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subfolderData, setSubfolderData] = useState<{ id: string; name: string; webUrl: string } | null>(null);
  const [files, setFiles] = useState<OneDriveSubfolderFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('lastModified');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [isUploading, setIsUploading] = useState(false);

  const isTokenExpired = Boolean(
    onedrive?.connected &&
    onedrive?.expiresAt &&
    Date.now() > onedrive.expiresAt
  );

  const loadPRDFiles = async () => {
    if (!onedrive?.connected) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchSubfolderFiles(
        onedrive,
        'PRD',
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
    } catch (err: any) {
      setError(err.message || 'Failed to load PRD files from OneDrive');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPRDFiles();
  }, [onedrive?.connected, onedrive?.projectFolder?.id]);

  const getFileExtension = (name: string) => {
    const parts = name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  const getFileTypeLabel = (name: string, mime?: string) => {
    const ext = getFileExtension(name);
    if (ext === 'docx' || ext === 'doc') return 'Word Document';
    if (ext === 'pdf') return 'PDF Document';
    if (ext === 'xlsx' || ext === 'xls') return 'Excel Spreadsheet';
    if (ext === 'csv') return 'CSV Document';
    if (ext === 'md' || ext === 'markdown') return 'Markdown Document';
    if (ext === 'txt') return 'Plain Text';
    if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) return 'Image Asset';
    if (['zip', 'tar', 'gz', 'rar'].includes(ext)) return 'Compressed Archive';
    if (mime) return mime.split('/')[1]?.toUpperCase() || 'File';
    return ext ? `${ext.toUpperCase()} File` : 'Document';
  };

  const getFileIcon = (name: string) => {
    const ext = getFileExtension(name);
    if (['docx', 'doc'].includes(ext)) return <FileText className="w-5 h-5 text-blue-600" />;
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-red-600" />;
    if (['xlsx', 'xls', 'csv'].includes(ext)) return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    if (['md', 'txt', 'json', 'ts', 'js'].includes(ext)) return <FileCode className="w-5 h-5 text-indigo-600" />;
    if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) return <ImageIcon className="w-5 h-5 text-violet-600" />;
    if (['zip', 'tar', 'rar'].includes(ext)) return <FileArchive className="w-5 h-5 text-amber-600" />;
    return <FileText className="w-5 h-5 text-slate-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          getFileTypeLabel(f.name, f.mimeType).toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA: any = a.name;
      let valB: any = b.name;

      if (sortField === 'type') {
        valA = getFileTypeLabel(a.name, a.mimeType);
        valB = getFileTypeLabel(b.name, b.mimeType);
      } else if (sortField === 'size') {
        valA = a.size || 0;
        valB = b.size || 0;
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else if (sortField === 'lastModified') {
        valA = new Date(a.lastModifiedDateTime).getTime();
        valB = new Date(b.lastModifiedDateTime).getTime();
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [files, searchQuery, sortField, sortOrder]);

  const handleCreateSamplePRD = async () => {
    if (!onedrive) return;
    setIsUploading(true);
    try {
      const targetSubId = subfolderData?.id || onedrive.projectFolder?.subfolders?.find(s => s.name === 'PRD')?.id || 'mock-prd-id';
      const samplePRD = `# Product Requirements Document: DriveDocs Cloud v1.0\n\n## 1. Problem Statement\nSoftware teams struggle with fragmented requirements across local spreadsheets and untracked documents.\n\n## 2. Core Features\n- Firebase Authentication\n- Microsoft OneDrive delegated sync\n- Single file requirement and test case parser\n- Multi-format PRD file repository`;
      await createFileInSubfolder(
        onedrive,
        targetSubId,
        'PRD',
        'DriveDocs_Product_Requirements_v1.0.md',
        samplePRD,
        onedrive.azureCredentials
      );
      await loadPRDFiles();
    } catch (err: any) {
      setError(err.message || 'Failed to create sample PRD file');
    } finally {
      setIsUploading(false);
    }
  };

  // Not connected state
  if (!onedrive?.connected) {
    return (
      <div id="prd-unconnected" className="max-w-4xl mx-auto space-y-6 pt-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
            <FileText className="w-8 h-8 stroke-[1.8]" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold text-slate-900">OneDrive Connection Required</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              The PRD tab browses multi-format project documents (Word, PDF, Markdown, mockups) stored in your Microsoft OneDrive <strong className="text-slate-800">PRD</strong> subfolder.
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

  return (
    <div id="prd-container" className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Product Requirements Documents (PRD)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-file repository in OneDrive subfolder: <span className="font-mono text-indigo-700 font-semibold">{subfolderData?.name || 'PRD'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {subfolderData?.webUrl && (
            <a
              id="open-prd-folder-btn"
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
            id="refresh-prd-btn"
            onClick={loadPRDFiles}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleCreateSamplePRD}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add PRD Spec</span>
          </button>
        </div>
      </div>

      {/* ERROR STATE: Token expired banner */}
      {isTokenExpired && (
        <div
          id="prd-token-expired-banner"
          className="rounded-2xl border border-rose-300 bg-rose-50/95 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-rose-950">OneDrive token expired — reconnect</h3>
              <p className="text-xs text-rose-800/85 mt-0.5">
                Your Microsoft OneDrive session has expired. Reconnect in Settings to synchronize your PRD folder.
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

      {/* Error alert */}
      {error && !isTokenExpired && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="prd-search-input"
            type="text"
            placeholder="Search PRD files by name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>{filteredAndSortedFiles.length} files found</span>
        </div>
      </div>

      {/* LOADING STATE: Animated Table Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="h-4 bg-slate-200 rounded-lg w-1/3 animate-pulse"></div>
            <div className="h-4 bg-slate-200 rounded-lg w-24 animate-pulse"></div>
          </div>
          <div className="space-y-3 pt-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0">
                <div className="h-4 bg-slate-100 rounded w-24 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded flex-1 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded w-20 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Browser Table */}
      {!loading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table id="prd-file-browser-table" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Filename</span>
                      {sortField === 'name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('type')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none w-48"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>File Type</span>
                      {sortField === 'type' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('lastModified')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none w-44"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Last Modified</span>
                      {sortField === 'lastModified' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('size')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors select-none w-28 text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Size</span>
                      {sortField === 'size' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  <th className="py-3 px-4 w-44 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAndSortedFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center text-slate-400">
                      <div className="max-w-sm mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                          <FileText className="w-6 h-6" />
                        </div>
                        <p className="font-semibold text-slate-700 text-xs">No PRD documents found — check your PRD folder in OneDrive</p>
                        <p className="text-[11px] text-slate-400">
                          Upload Word specifications, PDFs, design wireframes, or Markdown files to your OneDrive PRD folder.
                        </p>
                        <button
                          onClick={handleCreateSamplePRD}
                          disabled={isUploading}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Create Sample PRD Markdown
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                filteredAndSortedFiles.map((f) => (
                  <tr key={f.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                          {getFileIcon(f.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                            {f.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            .{getFileExtension(f.name)}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                        {getFileTypeLabel(f.name, f.mimeType)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {f.lastModifiedDateTime ? new Date(f.lastModifiedDateTime).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] text-right">
                      {formatFileSize(f.size)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {f.webUrl && (
                          <a
                            id={`open-prd-file-${f.id}`}
                            href={f.webUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {f.downloadUrl && (
                          <a
                            id={`download-prd-file-${f.id}`}
                            href={f.downloadUrl}
                            download={f.name}
                            className="inline-flex items-center gap-1 p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="py-3 px-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>{filteredAndSortedFiles.length} PRD documents tracked</span>
          <span className="font-medium text-slate-500">Files can be opened directly in Microsoft Office Online</span>
        </div>
      </div>
    )}
  </div>
);
};
