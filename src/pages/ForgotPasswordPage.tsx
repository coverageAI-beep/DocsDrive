import React, { useState } from 'react';
import {
  Cloud,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { AuthScreen } from '../types';
import { useAuth } from '../context/AuthContext';

interface ForgotPasswordPageProps {
  onNavigateAuth: (screen: AuthScreen) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigateAuth }) => {
  const { sendResetEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await sendResetEmail(trimmedEmail);
      setSentSuccess(true);
    } catch (err: any) {
      console.error('Password reset email error:', err);
      let message = 'Failed to send password reset email. Please try again.';
      if (err.code === 'auth/user-not-found') {
        // For security and privacy, notify that if an account exists, a reset link was sent
        setSentSuccess(true);
        setLoading(false);
        return;
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please provide a valid email address.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
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
          Reset your password
        </h2>
        <p className="mt-2 text-center text-xs text-slate-500">
          Enter your registered email address and we'll send you an official reset link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-8 border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50">
          {sentSuccess ? (
            <div className="text-center py-2 space-y-4 animate-in fade-in">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Link Dispatched</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  We've sent a password reset email to:
                  <br />
                  <span className="font-semibold text-slate-900 text-sm mt-0.5 inline-block bg-slate-100 px-2.5 py-1 rounded-md">{email}</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Please click the link in the email to set your new password. Don't forget to check your spam/junk folder.
                </p>
              </div>

              <div className="pt-4 space-y-2.5 border-t border-slate-100">
                <button
                  id="forgot-goto-reset-screen-btn"
                  onClick={() => onNavigateAuth('reset-password')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Go to Reset Password Screen</span>
                </button>

                <button
                  id="forgot-back-to-login-btn"
                  onClick={() => onNavigateAuth('login')}
                  className="w-full py-2 px-4 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Return to Log In
                </button>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div
                  id="forgot-error-alert"
                  className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 text-rose-700 text-xs leading-relaxed animate-in fade-in"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Account Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    id="forgot-submit-btn"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending reset email...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Password Reset Email</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <button
                  id="forgot-return-login-link"
                  onClick={() => onNavigateAuth('login')}
                  className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer font-medium transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Log In</span>
                </button>
                <button
                  onClick={() => onNavigateAuth('reset-password')}
                  className="text-blue-600 hover:text-blue-700 cursor-pointer font-semibold"
                >
                  Enter reset code
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
