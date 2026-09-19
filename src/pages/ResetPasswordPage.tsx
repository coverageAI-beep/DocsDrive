import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { AuthScreen } from '../types';
import { useAuth } from '../context/AuthContext';
import { verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase';

interface ResetPasswordPageProps {
  onNavigateAuth: (screen: AuthScreen) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigateAuth }) => {
  const { confirmReset } = useAuth();

  const [oobCode, setOobCode] = useState('');
  const [associatedEmail, setAssociatedEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [verifyingCode, setVerifyingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Parse URL query parameter for Firebase oobCode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('oobCode');
    if (codeFromUrl) {
      setOobCode(codeFromUrl);
      verifyCode(codeFromUrl);
    }
  }, []);

  const verifyCode = async (code: string) => {
    if (!code) return;
    setVerifyingCode(true);
    setError(null);
    try {
      const email = await verifyPasswordResetCode(auth, code);
      setAssociatedEmail(email);
    } catch (err: any) {
      console.error('Verify reset code error:', err);
      if (err.code === 'auth/expired-action-code') {
        setError('This password reset code has expired. Please request a new link.');
      } else if (err.code === 'auth/invalid-action-code') {
        setError('This password reset code is invalid or has already been used.');
      } else {
        setError('Unable to verify reset code. You may still try entering your new password.');
      }
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = oobCode.trim();
    if (!cleanCode) {
      setError('A password reset code is required. Please check the link from your email.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmReset(cleanCode, newPassword);
      setSuccess(true);
    } catch (err: any) {
      console.error('Confirm reset password error:', err);
      let message = 'Failed to reset password.';
      if (err.code === 'auth/expired-action-code') {
        message = 'The reset code has expired. Please request a new password reset email.';
      } else if (err.code === 'auth/invalid-action-code') {
        message = 'Invalid or expired action code. Please request a fresh reset link.';
      } else if (err.code === 'auth/weak-password') {
        message = 'New password is too weak. Please use at least 6 characters.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-blue-100 selection:text-blue-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={() => onNavigateAuth('landing')}
          className="mx-auto flex items-center justify-center gap-3 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <Cloud className="w-6 h-6 stroke-[2.2]" />
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">DriveDocs</span>
        </button>

        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">
          Set your new password
        </h2>
        <p className="mt-2 text-center text-xs text-slate-500">
          Enter your new credentials below to update your account password.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50">
          {success ? (
            <div className="text-center py-2 space-y-4 animate-in fade-in">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Password Changed Successfully</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  Your DriveDocs password has been updated securely. You can now log in to your workspace using your new password.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  id="reset-success-login-btn"
                  onClick={() => onNavigateAuth('login')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Log In</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div
                  id="reset-error-alert"
                  className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-rose-700 text-xs leading-relaxed animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {error}
                    {error.includes('expired') || error.includes('invalid') ? (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => onNavigateAuth('forgot-password')}
                          className="font-bold underline cursor-pointer hover:text-rose-900"
                        >
                          Request a new reset link &rarr;
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {associatedEmail && (
                <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200/70 text-xs text-blue-800 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Resetting password for: <strong className="font-semibold">{associatedEmail}</strong>
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Reset Code Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="reset-code" className="block text-xs font-semibold text-slate-700">
                      Reset Code / Token <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">From email reset link</span>
                  </div>
                  <div className="relative">
                    <input
                      id="reset-code"
                      type="text"
                      required
                      placeholder="Paste oobCode or full reset token"
                      value={oobCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOobCode(val);
                      }}
                      onBlur={() => {
                        if (oobCode.trim()) verifyCode(oobCode.trim());
                      }}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    {verifyingCode && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      </div>
                    )}
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="reset-new-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      id="reset-toggle-new-pwd"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label htmlFor="reset-confirm-new-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-confirm-new-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Re-enter new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      id="reset-toggle-confirm-pwd"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    id="reset-submit-btn"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating password...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm & Set New Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <button
                  onClick={() => onNavigateAuth('login')}
                  className="hover:text-slate-800 cursor-pointer font-medium"
                >
                  &larr; Return to Log In
                </button>
                <button
                  onClick={() => onNavigateAuth('forgot-password')}
                  className="text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Request new code
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
