import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  Save,
  KeyRound,
  ShieldCheck,
  Calendar,
  Fingerprint,
  Cloud,
  FolderSync,
  ExternalLink,
  Copy,
  Check,
  Unlink,
  RefreshCw,
  FolderCheck,
  SlidersHorizontal,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  connectOneDriveWithPopup,
  connectOneDriveDemo,
  getOneDriveConfig
} from '../services/onedriveService';
import { OneDriveOnboardingWizard } from '../components/OneDriveOnboardingWizard';
import { AIConnectionsTab } from '../components/AIConnectionsTab';

interface SettingsProfilePageProps {
  initialTab?: 'profile' | 'onedrive' | 'aiconnections';
}

export const SettingsProfilePage: React.FC<SettingsProfilePageProps> = ({ initialTab = 'profile' }) => {
  const { userProfile, user, updateFullName, changePassword, updateOneDriveConnection } = useAuth();

  // Active Settings Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'onedrive' | 'aiconnections'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Full Name state
  const [fullName, setFullName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  // OneDrive Connection state
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);
  const [credsSuccess, setCredsSuccess] = useState<string | null>(null);
  const [credsError, setCredsError] = useState<string | null>(null);
  const [serverConfig, setServerConfig] = useState<any>(null);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [oneDriveConnecting, setOneDriveConnecting] = useState(false);
  const [oneDriveDisconnecting, setOneDriveDisconnecting] = useState(false);
  const [oneDriveError, setOneDriveError] = useState<string | null>(null);
  const [oneDriveSuccess, setOneDriveSuccess] = useState<string | null>(null);

  // Onboarding wizard modal trigger
  const [showWizardModal, setShowWizardModal] = useState(false);

  useEffect(() => {
    if (userProfile?.fullName) {
      setFullName(userProfile.fullName);
    } else if (user?.displayName) {
      setFullName(user?.displayName);
    }

    if (userProfile?.onedrive?.azureCredentials) {
      setAzureClientId(userProfile.onedrive.azureCredentials.clientId || '');
      setAzureClientSecret(userProfile.onedrive.azureCredentials.clientSecret || '');
    }

    // Load server-side OneDrive config
    getOneDriveConfig()
      .then((cfg) => setServerConfig(cfg))
      .catch((err) => console.warn('Failed to load server OneDrive config:', err));
  }, [userProfile, user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSuccess(null);

    const trimmed = fullName.trim();
    if (!trimmed) {
      setNameError('Full Name cannot be empty.');
      return;
    }

    setNameSaving(true);
    try {
      await updateFullName(trimmed);
      setNameSuccess('Profile name successfully updated in Cloud Firestore.');
      setTimeout(() => setNameSuccess(null), 4000);
    } catch (err: any) {
      console.error('Update name error:', err);
      setNameError(err.message || 'Failed to update profile name. Please try again.');
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (!currentPassword) {
      setPwdError('Current password is required to authorize this change.');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match. Please verify.');
      return;
    }

    setPwdSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwdSuccess('Password changed successfully! Next time you sign in, use your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccess(null), 5000);
    } catch (err: any) {
      console.error('Change password error:', err);
      let msg = 'Failed to change password. Please check your current password.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Current password entered is incorrect.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'New password is too weak. Please use at least 6 characters.';
      } else if (err.message) {
        msg = err.message;
      }
      setPwdError(msg);
    } finally {
      setPwdSaving(false);
    }
  };

  // Save Azure credentials
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredsError(null);
    setCredsSuccess(null);

    setSavingCreds(true);
    try {
      await updateOneDriveConnection({
        azureCredentials: {
          clientId: azureClientId.trim(),
          clientSecret: azureClientSecret.trim(),
        },
      });
      setCredsSuccess('Azure App Registration credentials saved.');
      setTimeout(() => setCredsSuccess(null), 4000);
    } catch (err: any) {
      setCredsError(err.message || 'Failed to save credentials.');
    } finally {
      setSavingCreds(false);
    }
  };

  // Connect OneDrive via OAuth 2.0 popup
  const handleConnectOneDrive = async () => {
    setOneDriveConnecting(true);
    setOneDriveError(null);
    setOneDriveSuccess(null);

    try {
      const authResult = await connectOneDriveWithPopup(
        azureClientId.trim() || undefined,
        azureClientSecret.trim() || undefined
      );
      await updateOneDriveConnection(authResult);
      setOneDriveSuccess('Successfully connected to Microsoft OneDrive!');
      setTimeout(() => setOneDriveSuccess(null), 4000);

      // Open Onboarding wizard to complete folder selection if needed
      if (!authResult.projectFolder) {
        setShowWizardModal(true);
      }
    } catch (err: any) {
      console.error('OneDrive Connect Error:', err);
      setOneDriveError(err.message || 'Failed to authorize with Microsoft OneDrive.');
    } finally {
      setOneDriveConnecting(false);
    }
  };

  // Disconnect OneDrive
  const handleDisconnectOneDrive = async () => {
    if (!window.confirm('Are you sure you want to disconnect Microsoft OneDrive from your DriveDocs account?')) {
      return;
    }

    setOneDriveDisconnecting(true);
    setOneDriveError(null);
    try {
      await updateOneDriveConnection(null);
      setOneDriveSuccess('Microsoft OneDrive disconnected successfully.');
      setTimeout(() => setOneDriveSuccess(null), 4000);
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setOneDriveError(err.message || 'Failed to disconnect OneDrive.');
    } finally {
      setOneDriveDisconnecting(false);
    }
  };

  const copyRedirectUri = () => {
    const uri = serverConfig?.redirectUri || `${window.location.origin}/auth/callback`;
    navigator.clipboard.writeText(uri);
    setCopiedRedirectUri(true);
    setTimeout(() => setCopiedRedirectUri(false), 2500);
  };

  const displayName = userProfile?.fullName || user?.displayName || 'Workspace Member';
  const displayEmail = userProfile?.email || user?.email || 'N/A';
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'DD';

  const isOneDriveConnected = !!userProfile?.onedrive?.connected;
  const projectFolder = userProfile?.onedrive?.projectFolder;

  return (
    <div id="settings-container" className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h2>
        <p className="text-xs text-slate-500 mt-1">
          Manage your account credentials, security preferences, and cloud storage integrations.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Account</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('onedrive')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer relative ${
            activeTab === 'onedrive'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Cloud className="w-4 h-4 text-blue-600" />
          <span>OneDrive Connection</span>
          {isOneDriveConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          )}
        </button>

        <button
          id="settings-tab-aiconnections"
          type="button"
          onClick={() => setActiveTab('aiconnections')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer relative ${
            activeTab === 'aiconnections'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>AI Connections</span>
          {userProfile?.aiConnection?.isValid && (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PROFILE & ACCOUNT */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Profile Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                  {initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{displayName}</h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <ShieldCheck className="w-3 h-3" />
                      Firebase Authenticated
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{displayEmail}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Fingerprint className="w-3 h-3 text-slate-400" />
                      UID: {user?.uid.substring(0, 10)}...
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Created: {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'Active Member'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form 1: Edit Full Name & Profile */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Personal Information
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your display name stored across Firestore and Firebase Authentication.
                </p>
              </div>
            </div>

            {nameSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{nameSuccess}</span>
              </div>
            )}

            {nameError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{nameError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateName} className="mt-5 space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name (Editable)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Email Address (Read-only)
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Primary login identity
                  </span>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    value={displayEmail}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed select-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={nameSaving || fullName.trim() === (userProfile?.fullName || '')}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {nameSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Change Password Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" />
                  Security & Password
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your account password. Requires your current active password for verification.
                </p>
              </div>
            </div>

            {pwdSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            {pwdError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{pwdError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="mt-5 space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a strong new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pwdSaving || !currentPassword || !newPassword}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {pwdSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Reauthenticating & Updating...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ONEDRIVE CONNECTION */}
      {/* ========================================================================= */}
      {activeTab === 'onedrive' && (
        <div className="space-y-6 animate-in fade-in">
          {oneDriveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{oneDriveSuccess}</span>
            </div>
          )}

          {oneDriveError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{oneDriveError}</span>
            </div>
          )}

          {/* 1. Connection Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm ${
                    isOneDriveConnected ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-blue-600 shadow-blue-500/20'
                  }`}
                >
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Microsoft OneDrive Integration</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isOneDriveConnected
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {isOneDriveConnected ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Personal Microsoft accounts (OAuth 2.0 delegated authentication via Microsoft Graph API)
                  </p>
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex items-center gap-2.5">
                {isOneDriveConnected ? (
                  <button
                    type="button"
                    onClick={handleDisconnectOneDrive}
                    disabled={oneDriveDisconnecting}
                    className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {oneDriveDisconnecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Unlink className="w-3.5 h-3.5" />
                    )}
                    <span>Disconnect</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectOneDrive}
                    disabled={oneDriveConnecting}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {oneDriveConnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Cloud className="w-4 h-4" />
                    )}
                    <span>Connect OneDrive</span>
                  </button>
                )}
              </div>
            </div>

            {/* Connection Details */}
            {isOneDriveConnected ? (
              <div className="pt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Connected Account</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                      {userProfile?.onedrive?.accountEmail || 'Personal Account'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {userProfile?.onedrive?.accountName || 'Microsoft Account'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Token Security</p>
                    <p className="text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      AES-256-GCM Encrypted
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Silent refresh token renewal active</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tenant Scope</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono">consumers</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Files.ReadWrite, offline_access, User.Read</p>
                  </div>
                </div>

                {/* Project Folder Status */}
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <FolderCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {projectFolder?.name ? (
                          <>Configured Project Folder: <span className="text-blue-700">{projectFolder.name}</span></>
                        ) : (
                          'No Project Folder Selected'
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {projectFolder?.subfolders?.length
                          ? `All 4 subfolders configured: Requirements, Test Cases, PRD, Others`
                          : 'Run the onboarding wizard to pick a folder and generate required subfolders'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowWizardModal(true)}
                    className="px-3 py-1.5 bg-white border border-blue-200 hover:border-blue-400 text-blue-700 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>{projectFolder ? 'Reconfigure Folders' : 'Run Folder Setup'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 text-xs text-slate-500">
                <p>
                  Connect your personal Microsoft OneDrive to synchronize documents across Requirements, Test Cases, PRDs, and Other Files.
                  You can provide your Azure App credentials below or connect directly.
                </p>
              </div>
            )}
          </div>

          {/* 2. Azure App Registration Credentials Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="pb-4 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-600" />
                Bring Your Own Azure App Credentials
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your custom Azure App Registration details from the Azure Portal (set with tenant = &quot;consumers&quot;).
              </p>
            </div>

            {credsSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{credsSuccess}</span>
              </div>
            )}

            {credsError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{credsError}</span>
              </div>
            )}

            {/* Azure Portal Configuration Instructions & Redirect URI */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">OAuth 2.0 Web Redirect URI</p>
                  <p className="text-[11px] text-slate-500">
                    Add this exact URI in your Azure Portal &gt; App registration &gt; Authentication &gt; Web:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyRedirectUri}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  {copiedRedirectUri ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy URI</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-blue-700 break-all select-all">
                {serverConfig?.redirectUri || `${window.location.origin}/auth/callback`}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                <div className="flex items-start gap-1.5">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Tenant:</strong> Set supported account types to &quot;Personal Microsoft accounts only&quot; (consumers)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Delegated Scopes:</strong> Files.ReadWrite, offline_access, User.Read</span>
                </div>
              </div>
            </div>

            {/* Credentials Input Form */}
            <form onSubmit={handleSaveCredentials} className="mt-5 space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Azure Client ID (Application ID)
                </label>
                <input
                  type="text"
                  value={azureClientId}
                  onChange={(e) => setAzureClientId(e.target.value)}
                  placeholder="e.g. 11111111-2222-3333-4444-555555555555"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Azure Client Secret
                </label>
                <input
                  type="password"
                  value={azureClientSecret}
                  onChange={(e) => setAzureClientSecret(e.target.value)}
                  placeholder="Paste Azure client secret value"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={savingCreds}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {savingCreds ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Credentials...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Azure Credentials</span>
                    </>
                  )}
                </button>

                {!isOneDriveConnected && (
                  <button
                    type="button"
                    onClick={async () => {
                      const demo = await connectOneDriveDemo(
                        userProfile?.email || 'developer@outlook.com',
                        userProfile?.fullName || 'DriveDocs Member'
                      );
                      await updateOneDriveConnection(demo);
                      setShowWizardModal(true);
                    }}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Connect Demo Account
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AI CONNECTIONS */}
      {/* ========================================================================= */}
      {activeTab === 'aiconnections' && <AIConnectionsTab />}

      {/* Onboarding Wizard Modal */}
      <OneDriveOnboardingWizard
        isOpen={showWizardModal}
        onClose={() => setShowWizardModal(false)}
        onComplete={() => {
          setShowWizardModal(false);
          setOneDriveSuccess('OneDrive workspace folder setup complete!');
        }}
      />
    </div>
  );
};
