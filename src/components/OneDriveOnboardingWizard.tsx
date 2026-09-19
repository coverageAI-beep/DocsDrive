import React, { useState } from 'react';
import {
  Cloud,
  FolderSync,
  FolderCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  connectOneDriveWithPopup,
  connectOneDriveDemo,
  setupProjectSubfolders,
  OneDriveFolderItem
} from '../services/onedriveService';
import { OneDriveFolderPicker } from './OneDriveFolderPicker';
import { OneDriveConnectionInfo, OneDriveSubfolder } from '../types';

interface OneDriveOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const OneDriveOnboardingWizard: React.FC<OneDriveOnboardingWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { userProfile, updateOneDriveConnection, setOnboardingDismissed } = useAuth();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(
    userProfile?.onedrive?.connected ? 2 : 1
  );

  // Local connection state
  const [connection, setConnection] = useState<OneDriveConnectionInfo | null>(
    userProfile?.onedrive || null
  );
  const [selectedFolder, setSelectedFolder] = useState<OneDriveFolderItem | null>(
    userProfile?.onedrive?.projectFolder
      ? {
          id: userProfile.onedrive.projectFolder.id,
          name: userProfile.onedrive.projectFolder.name,
          childCount: 0,
        }
      : null
  );

  const [subfolderResults, setSubfolderResults] = useState<OneDriveSubfolder[]>(
    userProfile?.onedrive?.projectFolder?.subfolders || []
  );

  // Loading and error states
  const [connecting, setConnecting] = useState(false);
  const [settingUpFolders, setSettingUpFolders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Step 1: Connect OneDrive via Microsoft OAuth 2.0
  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const authResult = await connectOneDriveWithPopup(
        userProfile?.onedrive?.azureCredentials?.clientId,
        userProfile?.onedrive?.azureCredentials?.clientSecret
      );
      setConnection(authResult);
      await updateOneDriveConnection(authResult);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('OneDrive OAuth Error:', err);
      setError(
        err.message ||
          'Failed to connect to Microsoft OneDrive. Make sure popups are allowed and Azure credentials are valid.'
      );
    } finally {
      setConnecting(false);
    }
  };

  // Demo fallback connection for instant evaluation
  const handleDemoConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const demoResult = await connectOneDriveDemo(
        userProfile?.email || 'developer@outlook.com',
        userProfile?.fullName || 'DriveDocs Member'
      );
      setConnection(demoResult);
      await updateOneDriveConnection(demoResult);
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || 'Demo connection failed');
    } finally {
      setConnecting(false);
    }
  };

  // Step 3: Automatically check for and create the 4 required subfolders
  const handleSetupProjectSubfolders = async () => {
    if (!connection || !selectedFolder) return;

    setSettingUpFolders(true);
    setError(null);
    setCurrentStep(3);

    try {
      const res = await setupProjectSubfolders(
        connection,
        selectedFolder.id,
        selectedFolder.name,
        userProfile?.onedrive?.azureCredentials
      );

      const subfolders = res.projectFolder.subfolders;
      setSubfolderResults(subfolders);

      // Persist to user profile
      const updatedInfo: Partial<OneDriveConnectionInfo> = {
        ...connection,
        projectFolder: {
          id: selectedFolder.id,
          name: selectedFolder.name,
          subfolders,
        },
      };

      if (res.updatedTokens) {
        updatedInfo.encryptedAccessToken = res.updatedTokens.encryptedAccessToken;
        updatedInfo.encryptedRefreshToken = res.updatedTokens.encryptedRefreshToken;
        updatedInfo.expiresAt = res.updatedTokens.expiresAt;
      }

      await updateOneDriveConnection(updatedInfo);
      setConnection((prev) => (prev ? { ...prev, ...updatedInfo } : null));

      // Small delay so the user can enjoy seeing all green checkmarks
      setTimeout(() => {
        setCurrentStep(4);
      }, 1000);
    } catch (err: any) {
      console.error('Folder setup error:', err);
      setError(err.message || 'Failed to setup required subfolders in OneDrive.');
    } finally {
      setSettingUpFolders(false);
    }
  };

  const handleSkipOrDismiss = async () => {
    await setOnboardingDismissed(true);
    onClose();
  };

  const handleCompleteAll = async () => {
    await setOnboardingDismissed(true);
    if (onComplete) onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-6 border-b border-slate-100 bg-linear-to-r from-blue-50/70 via-indigo-50/40 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">OneDrive Workspace Onboarding</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                  Step {currentStep} of 3
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Link your Microsoft OneDrive account to store Requirements, PRDs, and Test Cases.
              </p>
            </div>
          </div>

          <button
            onClick={handleSkipOrDismiss}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Dismiss for now"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Stepper Progress Bar */}
        <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50/50 text-xs font-semibold">
          <div
            className={`py-3 px-4 flex items-center gap-2 border-r border-slate-100 transition-colors ${
              currentStep === 1
                ? 'text-blue-600 bg-blue-50/40 border-b-2 border-b-blue-600'
                : currentStep > 1
                ? 'text-emerald-700'
                : 'text-slate-400'
            }`}
          >
            {currentStep > 1 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[11px] flex items-center justify-center font-bold">
                1
              </span>
            )}
            <span className="truncate">1. Connect Account</span>
          </div>

          <div
            className={`py-3 px-4 flex items-center gap-2 border-r border-slate-100 transition-colors ${
              currentStep === 2
                ? 'text-blue-600 bg-blue-50/40 border-b-2 border-b-blue-600'
                : currentStep > 2
                ? 'text-emerald-700'
                : 'text-slate-400'
            }`}
          >
            {currentStep > 2 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[11px] flex items-center justify-center font-bold">
                2
              </span>
            )}
            <span className="truncate">2. Select Project Folder</span>
          </div>

          <div
            className={`py-3 px-4 flex items-center gap-2 transition-colors ${
              currentStep >= 3
                ? 'text-blue-600 bg-blue-50/40 border-b-2 border-b-blue-600'
                : 'text-slate-400'
            }`}
          >
            {currentStep === 4 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[11px] flex items-center justify-center font-bold">
                3
              </span>
            )}
            <span className="truncate">3. Setup Subfolders</span>
          </div>
        </div>

        {/* Wizard Step Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Connection Issue</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* STEP 1: Connect OneDrive */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in">
              <div className="text-center max-w-md mx-auto pt-2">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Cloud className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Authorize Microsoft OneDrive</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  DriveDocs syncs and organizes your team specifications directly inside your Microsoft personal account.
                </p>
              </div>

              {/* Scopes & Permissions Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Delegated Microsoft Graph API Scopes
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                    <p className="font-semibold text-slate-800 font-mono text-[11px]">Files.ReadWrite</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Read, create, and organize project folders & docs.</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                    <p className="font-semibold text-slate-800 font-mono text-[11px]">offline_access</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Secure refresh token for background silent renewals.</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                    <p className="font-semibold text-slate-800 font-mono text-[11px]">User.Read</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Verify your authenticated Microsoft profile email.</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Waiting for Microsoft OAuth Authorization...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      <span>Connect OneDrive via Microsoft OAuth 2.0</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleDemoConnect}
                    disabled={connecting}
                    className="text-xs text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Or evaluate instantly with Sandbox Demo Account</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Select or Create Project Folder */}
          {currentStep === 2 && connection && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Step 2: Choose Project Folder</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select an existing folder or click &quot;New Folder&quot; to create your project directory.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold">{connection.accountEmail || 'Connected'}</span>
                </div>
              </div>

              {/* Microsoft Graph Interactive Folder Picker */}
              <OneDriveFolderPicker
                connection={connection}
                selectedFolder={selectedFolder}
                onSelectFolder={(folder) => setSelectedFolder(folder)}
                credentials={userProfile?.onedrive?.azureCredentials}
              />

              <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSetupProjectSubfolders}
                  disabled={!selectedFolder}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Subfolder Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Automated Subfolder Creation Progress */}
          {currentStep === 3 && (
            <div className="py-6 space-y-6 text-center animate-in fade-in max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <FolderSync className="w-7 h-7 animate-spin" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Setting Up Project Subfolders</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Inspecting &quot;{selectedFolder?.name}&quot; and creating required workspaces via Microsoft Graph API...
                </p>
              </div>

              <div className="space-y-2 text-left bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                {['Requirements', 'Test Cases', 'PRD', 'Others'].map((name) => {
                  return (
                    <div
                      key={name}
                      className="p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <FolderCheck className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-slate-800">{name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying / Creating...</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Completed & Summary */}
          {currentStep === 4 && selectedFolder && (
            <div className="py-4 space-y-6 text-center animate-in fade-in max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">OneDrive Workspace Ready!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your project folder and all four required subfolders are configured and synchronized.
                </p>
              </div>

              {/* Configured Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3">
                <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200">
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Project Folder</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedFolder.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Account</p>
                    <p className="font-semibold text-slate-700 text-xs mt-0.5">{connection?.accountEmail}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-700 mb-2">Synchronized Subfolders:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {subfolderResults.map((sub) => (
                      <div
                        key={sub.name}
                        className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-800">{sub.name}</span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                          {sub.status === 'created' ? 'Created' : 'Ready'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCompleteAll}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Go to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer (Step 1 & 2 Skip Link) */}
        {currentStep <= 2 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>You can modify your OneDrive settings at any time in Settings.</span>
            </div>
            <button
              type="button"
              onClick={handleSkipOrDismiss}
              className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer underline underline-offset-2"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
