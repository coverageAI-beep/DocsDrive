import React from 'react';
import {
  Cloud,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  Layers,
  ChevronRight,
  Database
} from 'lucide-react';
import { AuthScreen } from '../types';

interface LandingPageProps {
  onNavigateAuth: (screen: AuthScreen) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateAuth }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Cloud className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">DriveDocs</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                Cloud Edition
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="landing-login-nav-btn"
              onClick={() => onNavigateAuth('login')}
              className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Log In
            </button>
            <button
              id="landing-signup-nav-btn"
              onClick={() => onNavigateAuth('signup')}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Sign Up</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="pt-16 pb-20 px-6 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-6">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Secure Firebase Authentication & Firestore Database</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Unified Project Specs, Requirements & Test Cases in One Drive
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            DriveDocs gives engineering and product teams a dedicated, desktop-grade workspace for managing PRDs, software requirements, test case suites, and user identity profiles.
          </p>

          {/* Call to action buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              id="landing-hero-signup-btn"
              onClick={() => onNavigateAuth('signup')}
              className="px-7 py-3.5 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2.5"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              id="landing-hero-login-btn"
              onClick={() => onNavigateAuth('login')}
              className="px-7 py-3.5 text-base font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Sign In to Workspace
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Free Firestore Cloud sync
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Email/Password Auth
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Instant Reset Link
            </span>
          </div>

          {/* Workspace Preview Card */}
          <div className="mt-14 max-w-5xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden text-left">
            <div className="h-10 bg-slate-100/80 border-b border-slate-200 px-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <span className="ml-2 text-xs font-mono text-slate-500">https://drivedocs.workspace/dashboard</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 bg-slate-50/50">
              {/* Fake Mini Sidebar */}
              <div className="p-4 border-r border-slate-200/80 space-y-2 hidden md:block">
                <div className="text-[11px] font-bold uppercase text-slate-400 px-2">Navigation</div>
                <div className="bg-blue-50 text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  Dashboard
                </div>
                <div className="text-slate-600 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:bg-slate-100">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  Requirements
                </div>
                <div className="text-slate-600 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:bg-slate-100">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  Test Cases
                </div>
                <div className="text-slate-600 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:bg-slate-100">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  PRD
                </div>
                <div className="text-slate-600 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:bg-slate-100">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  Settings & Profile
                </div>
              </div>

              {/* Fake Workspace Area */}
              <div className="p-6 md:col-span-3 bg-white space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Active Workspace Overview</h3>
                    <p className="text-xs text-slate-500">Live project specification metrics</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                    System Operational
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                    <span className="text-[11px] font-medium text-slate-500">Requirements</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">14 Specs</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                    <span className="text-[11px] font-medium text-slate-500">Test Cases</span>
                    <p className="text-lg font-bold text-emerald-600 mt-1">98.4% Pass</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                    <span className="text-[11px] font-medium text-slate-500">Firestore Sync</span>
                    <p className="text-lg font-bold text-blue-600 mt-1">Connected</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Architected for Modern Engineering Docs
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600">
                A purpose-built hub combining requirements hierarchy with seamless Firebase identity security.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                  <FileCheck2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Requirements & PRDs</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Track technical requirements, dependencies, acceptance criteria, and full product requirement documentation.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Firestore User Profiles</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Every user's profile details are stored directly in Cloud Firestore with role tracking and real-time synchronization.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">End-to-End Auth & Reset</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Comprehensive authentication with email/password registration, password change re-authentication, and recovery links.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-800">DriveDocs</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigateAuth('login')} className="hover:text-slate-800 cursor-pointer">
              Log In
            </button>
            <button onClick={() => onNavigateAuth('signup')} className="hover:text-slate-800 cursor-pointer">
              Create Account
            </button>
            <button onClick={() => onNavigateAuth('forgot-password')} className="hover:text-slate-800 cursor-pointer">
              Forgot Password
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
