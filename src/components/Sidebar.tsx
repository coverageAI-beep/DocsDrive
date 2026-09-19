import React from 'react';
import {
  LayoutDashboard,
  ListChecks,
  CheckSquare,
  FileText,
  FolderArchive,
  Settings,
  Cloud,
  ChevronRight
} from 'lucide-react';
import { NavigationPage } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { userProfile, user } = useAuth();

  const navItems = [
    { id: 'dashboard' as NavigationPage, label: 'Dashboard', icon: LayoutDashboard, count: '8' },
    { id: 'requirements' as NavigationPage, label: 'Requirements', icon: ListChecks, count: '3' },
    { id: 'testcases' as NavigationPage, label: 'Test Cases', icon: CheckSquare, count: '3' },
    { id: 'prd' as NavigationPage, label: 'PRD', icon: FileText, count: '2' },
    { id: 'otherfiles' as NavigationPage, label: 'Other Files', icon: FolderArchive, count: '2' },
    { id: 'settings' as NavigationPage, label: 'Settings', icon: Settings },
  ];

  const displayName = userProfile?.fullName || user?.displayName || 'Workspace Member';
  const displayEmail = userProfile?.email || user?.email || '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'DD';

  return (
    <aside
      id="main-sidebar"
      className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col z-30 select-none shadow-[1px_0_3px_rgba(0,0,0,0.02)]"
    >
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
          <Cloud className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base text-slate-900 tracking-tight">DriveDocs</span>
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 tracking-wider">Cloud</span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Enterprise Workspace</span>
        </div>
      </div>

      {/* Navigation section */}
      <div className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Workspace Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-blue-600 stroke-[2.2]' : 'text-slate-400 group-hover:text-slate-700 stroke-[1.8]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.count && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-blue-200/60 text-blue-800 font-bold text-[11px]'
                      : 'bg-slate-100 text-slate-500 font-medium text-[11px]'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* OneDrive Sync Status Widget */}
      <div className="px-3 pb-3">
        {userProfile?.onedrive?.connected ? (
          <div
            onClick={() => onNavigate('settings')}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-bold text-slate-700 flex items-center gap-1.5 group-hover:text-blue-700">
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span>OneDrive Synced</span>
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>
            </div>
            <p className="text-[10px] text-slate-500 truncate font-mono">
              {userProfile.onedrive.projectFolder?.name || userProfile.onedrive.accountEmail || 'Connected'}
            </p>
          </div>
        ) : (
          <div
            onClick={() => onNavigate('settings')}
            className="p-2.5 rounded-xl bg-blue-50/60 hover:bg-blue-50 border border-blue-200/80 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Link OneDrive</span>
              </span>
              <ChevronRight className="w-3 h-3 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-[10px] text-blue-700/80 leading-tight">
              Store specs & test cases directly in your cloud drive.
            </p>
          </div>
        )}
      </div>

      {/* Mini Profile Card in Sidebar */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70">
        <button
          id="sidebar-profile-card"
          onClick={() => onNavigate('settings')}
          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all text-left group"
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-xs shadow-xs">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
              {displayName}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {displayEmail}
            </p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
        </button>
      </div>
    </aside>
  );
};
