import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Settings,
  LogOut,
  UserCheck,
  ChevronDown,
  Bell
} from 'lucide-react';
import { NavigationPage } from '../types';
import { useAuth } from '../context/AuthContext';

interface TopBarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenNewDocModal?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPage,
  onNavigate,
  searchQuery,
  setSearchQuery,
  onOpenNewDocModal,
}) => {
  const { userProfile, user, logOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = userProfile?.fullName || user?.displayName || 'Workspace Member';
  const displayEmail = userProfile?.email || user?.email || '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'DD';

  const getPageTitle = (page: NavigationPage) => {
    switch (page) {
      case 'dashboard':
        return 'Workspace Dashboard';
      case 'requirements':
        return 'System Requirements';
      case 'testcases':
        return 'Test Cases & Validation';
      case 'prd':
        return 'Product Requirements Documents (PRD)';
      case 'otherfiles':
        return 'Other Files & Assets';
      case 'settings':
        return 'Account & Profile Settings';
      default:
        return 'DriveDocs';
    }
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    try {
      await logOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header
      id="main-topbar"
      className="fixed top-0 right-0 left-64 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 flex items-center justify-between z-20 shadow-xs"
    >
      {/* Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            {getPageTitle(currentPage)}
          </h1>
          <p className="text-xs text-slate-400 font-medium">DriveDocs Cloud Workspace / {currentPage}</p>
        </div>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="workspace-search-input"
            type="text"
            placeholder="Search specifications, test cases, or documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Right Controls: Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Quick New Doc CTA */}
        {onOpenNewDocModal && (
          <button
            id="topbar-new-doc-btn"
            onClick={onOpenNewDocModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Item</span>
          </button>
        )}

        <button
          id="topbar-notifications-btn"
          title="Notifications"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Profile Avatar with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="profile-dropdown-trigger"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 pl-1.5 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div
              id="topbar-avatar"
              className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-2 ring-white"
            >
              {initials}
            </div>
            <span className="text-xs font-semibold text-slate-700 hidden md:inline-block max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div
              id="profile-dropdown-menu"
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
            >
              {/* Header Info */}
              <div className="px-4 py-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Authenticated Account</span>
                </div>
                <p className="text-xs font-bold text-slate-800 mt-1 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-400 truncate">{displayEmail}</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  id="dropdown-menu-settings"
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigate('settings');
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Settings</span>
                </button>
              </div>

              <div className="border-t border-slate-100 my-1"></div>

              <div className="py-1">
                <button
                  id="dropdown-menu-logout"
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
