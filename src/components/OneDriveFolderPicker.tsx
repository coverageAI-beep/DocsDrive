import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderPlus,
  ChevronRight,
  Home,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { OneDriveConnectionInfo } from '../types';
import {
  listOneDriveFolders,
  createOneDriveFolder,
  OneDriveFolderItem
} from '../services/onedriveService';

interface BreadcrumbItem {
  id: string; // 'root' or item ID
  name: string;
}

interface OneDriveFolderPickerProps {
  connection: OneDriveConnectionInfo;
  selectedFolder: OneDriveFolderItem | null;
  onSelectFolder: (folder: OneDriveFolderItem) => void;
  credentials?: { clientId?: string; clientSecret?: string };
}

export const OneDriveFolderPicker: React.FC<OneDriveFolderPickerProps> = ({
  connection,
  selectedFolder,
  onSelectFolder,
  credentials,
}) => {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: 'root', name: 'OneDrive Root' },
  ]);
  const [folders, setFolders] = useState<OneDriveFolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New folder creation state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  const loadFolders = async (folderId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listOneDriveFolders(connection, folderId, credentials);
      setFolders(data.folders || []);
    } catch (err: any) {
      console.error('Failed to load folders:', err);
      setError(err.message || 'Failed to load folders from OneDrive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolders(currentFolder.id);
  }, [currentFolder.id]);

  const handleNavigateInto = (folder: OneDriveFolderItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    setCreatingLoading(true);
    try {
      const { folder } = await createOneDriveFolder(
        connection,
        currentFolder.id,
        trimmed,
        credentials
      );
      setFolders((prev) => [folder, ...prev]);
      onSelectFolder(folder);
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (err: any) {
      console.error('Create folder error:', err);
      setError(err.message || 'Failed to create folder.');
    } finally {
      setCreatingLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-[80%] text-slate-600">
          <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id + idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(idx)}
                  className={`cursor-pointer truncate max-w-[140px] hover:text-blue-600 transition-colors ${
                    isLast ? 'font-bold text-slate-900' : 'text-slate-500'
                  }`}
                  title={crumb.name}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => loadFolders(currentFolder.id)}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            title="Refresh folder list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingFolder(!isCreatingFolder)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 text-slate-700 font-semibold rounded-lg text-xs shadow-2xs hover:text-blue-600 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
            <span>New Folder</span>
          </button>
        </div>
      </div>

      {/* Inline Create Folder Form */}
      {isCreatingFolder && (
        <form
          onSubmit={handleCreateFolder}
          className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-center gap-2 animate-in fade-in"
        >
          <FolderPlus className="w-4 h-4 text-blue-600 shrink-0" />
          <input
            type="text"
            required
            autoFocus
            placeholder="Folder name (e.g. DriveDocs Workspace)"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={creatingLoading || !newFolderName.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
          >
            {creatingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create & Select'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreatingFolder(false);
              setNewFolderName('');
            }}
            className="px-2.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </form>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Folder Grid/List Container */}
      <div className="border border-slate-200 rounded-2xl p-2 bg-white max-h-72 overflow-y-auto min-h-[160px]">
        {loading ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs">Fetching OneDrive folders via Microsoft Graph API...</span>
          </div>
        ) : folders.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <FolderOpen className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">No subfolders found in this directory</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click &quot;New Folder&quot; above to create a project folder here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {folders.map((folder) => {
              const isSelected = selectedFolder?.id === folder.id;
              return (
                <div
                  key={folder.id}
                  onClick={() => onSelectFolder(folder)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-amber-100/70 text-amber-700 group-hover:bg-amber-100'
                      }`}
                    >
                      <Folder className="w-4 h-4 fill-current" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-blue-900' : 'text-slate-800'
                        }`}
                        title={folder.name}
                      >
                        {folder.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {folder.childCount} {folder.childCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleNavigateInto(folder, e)}
                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-100/60 transition-colors"
                      title={`Open "${folder.name}" to view subfolders`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedFolder && (
        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Selected Project Folder: <strong className="font-bold text-emerald-950">{selectedFolder.name}</strong>
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
            ID: {selectedFolder.id.substring(0, 12)}...
          </span>
        </div>
      )}
    </div>
  );
};
