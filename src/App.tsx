/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NavigationPage, AuthScreen, DocumentItem } from './types';
import { INITIAL_DOCUMENTS } from './data/workspaceData';

// Layout & Components
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { NewDocumentModal } from './components/NewDocumentModal';

// Auth Pages
import { LandingPage } from './pages/LandingPage';
import { SignUpPage } from './pages/SignUpPage';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

// Workspace Pages
import { DashboardPage } from './pages/DashboardPage';
import { RequirementsPage } from './pages/RequirementsPage';
import { TestCasesPage } from './pages/TestCasesPage';
import { PRDPage } from './pages/PRDPage';
import { OtherFilesPage } from './pages/OtherFilesPage';
import { SettingsProfilePage } from './pages/SettingsProfilePage';
import { OneDriveOnboardingWizard } from './components/OneDriveOnboardingWizard';

import { Cloud, Loader2 } from 'lucide-react';

function DriveDocsWorkspace() {
  const { user, userProfile, loading } = useAuth();

  // Auth screen selection when not logged in
  const [authScreen, setAuthScreen] = useState<AuthScreen>('landing');

  // Navigation page when logged in
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');

  // Onboarding wizard visibility
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Shared workspace documents
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    const saved = localStorage.getItem('drivedocs_documents');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_DOCUMENTS;
      }
    }
    return INITIAL_DOCUMENTS;
  });

  // Save documents to localStorage for persistence
  useEffect(() => {
    localStorage.setItem('drivedocs_documents', JSON.stringify(documents));
  }, [documents]);

  // Selected document for modal
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  // New Document modal state
  const [isNewDocOpen, setIsNewDocOpen] = useState(false);

  // Workspace search query
  const [searchQuery, setSearchQuery] = useState('');

  // Settings initial tab navigation
  const [settingsTab, setSettingsTab] = useState<'profile' | 'onedrive' | 'aiconnections'>('profile');

  const handleNavigateSettings = (tab?: string) => {
    if (tab === 'aiconnections') {
      setSettingsTab('aiconnections');
    } else if (tab === 'onedrive') {
      setSettingsTab('onedrive');
    } else {
      setSettingsTab('profile');
    }
    setCurrentPage('settings');
  };

  // Handle URL parameters for password reset links directly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (mode === 'resetPassword' || oobCode) {
      setAuthScreen('reset-password');
    }
  }, []);

  // When user logs in, automatically ensure we are on Dashboard
  // and trigger Onboarding Wizard if OneDrive isn't connected yet
  useEffect(() => {
    if (user) {
      setCurrentPage('dashboard');
    }
  }, [user]);

  useEffect(() => {
    // Show onboarding wizard right after first login if OneDrive isn't connected yet
    if (user && userProfile && !userProfile.onedrive?.connected && !userProfile.onboardingDismissed) {
      setShowOnboarding(true);
    }
  }, [user, userProfile?.onedrive?.connected, userProfile?.onboardingDismissed]);

  const handleAddDocument = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const handleUpdateStatus = (docId: string, status: DocumentItem['status']) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status } : d))
    );
    if (selectedDoc && selectedDoc.id === docId) {
      setSelectedDoc((prev) => (prev ? { ...prev, status } : null));
    }
  };

  // Loading spinner during initial Firebase Auth state resolution
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 mb-4 animate-bounce">
          <Cloud className="w-7 h-7" />
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Connecting to DriveDocs Cloud...</span>
        </div>
      </div>
    );
  }

  // Not authenticated: render requested Auth screen
  if (!user) {
    switch (authScreen) {
      case 'signup':
        return <SignUpPage onNavigateAuth={setAuthScreen} />;
      case 'login':
        return <LoginPage onNavigateAuth={setAuthScreen} />;
      case 'forgot-password':
        return <ForgotPasswordPage onNavigateAuth={setAuthScreen} />;
      case 'reset-password':
        return <ResetPasswordPage onNavigateAuth={setAuthScreen} />;
      case 'landing':
      default:
        return <LandingPage onNavigateAuth={setAuthScreen} />;
    }
  }

  // Authenticated: Desktop-first workspace with Fixed Sidebar and Top Bar
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Fixed Left-Hand Navigation Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Top Bar with Search & Profile Dropdown (Settings + Logout) */}
      <TopBar
        currentPage={currentPage}
        onNavigate={(page) => {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenNewDocModal={() => setIsNewDocOpen(true)}
      />

      {/* Main Workspace View */}
      <main id="main-content-viewport" className="ml-64 pt-20 px-8 pb-12 flex-1">
        {currentPage === 'dashboard' && (
          <DashboardPage
            onNavigate={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            documents={documents}
            searchQuery={searchQuery}
            onSelectDoc={setSelectedDoc}
            onOpenNewDocModal={() => setIsNewDocOpen(true)}
            onNavigateSettings={handleNavigateSettings}
          />
        )}

        {currentPage === 'requirements' && (
          <RequirementsPage
            onNavigateSettings={handleNavigateSettings}
          />
        )}

        {currentPage === 'testcases' && (
          <TestCasesPage
            onNavigateSettings={handleNavigateSettings}
          />
        )}

        {currentPage === 'prd' && (
          <PRDPage
            onNavigateSettings={handleNavigateSettings}
            onOpenNewDocModal={() => setIsNewDocOpen(true)}
          />
        )}

        {currentPage === 'otherfiles' && (
          <OtherFilesPage
            onNavigateSettings={handleNavigateSettings}
          />
        )}

        {currentPage === 'settings' && <SettingsProfilePage initialTab={settingsTab} />}
      </main>

      {/* Document Detail Modal */}
      <DocumentDetailModal
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* New Document Modal */}
      <NewDocumentModal
        isOpen={isNewDocOpen}
        onClose={() => setIsNewDocOpen(false)}
        onAddDoc={handleAddDocument}
        defaultCategory={
          currentPage === 'requirements'
            ? 'Requirements'
            : currentPage === 'testcases'
            ? 'Test Cases'
            : currentPage === 'prd'
            ? 'PRD'
            : currentPage === 'otherfiles'
            ? 'Other Files'
            : 'Requirements'
        }
      />

      {/* OneDrive Onboarding Wizard */}
      <OneDriveOnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          setShowOnboarding(false);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DriveDocsWorkspace />
    </AuthProvider>
  );
}
