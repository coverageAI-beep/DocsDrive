import React from 'react';
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ListOrdered,
  Target,
  FileCode,
  Calendar,
  Layers,
  HelpCircle
} from 'lucide-react';
import { TestCaseRow, OneDriveSubfolderFile } from '../types';

interface TestCaseDetailPageProps {
  testCase: TestCaseRow;
  file?: OneDriveSubfolderFile | null;
  onBack: () => void;
}

export const TestCaseDetailPage: React.FC<TestCaseDetailPageProps> = ({
  testCase,
  file,
  onBack,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'passed':
      case 'pass':
        return {
          style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
        };
      case 'failed':
      case 'fail':
        return {
          style: 'bg-red-50 text-red-800 border-red-200',
          icon: XCircle,
        };
      case 'blocked':
        return {
          style: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: AlertCircle,
        };
      case 'in review':
        return {
          style: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: Clock,
        };
      case 'draft':
      default:
        return {
          style: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: HelpCircle,
        };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleOpenOneDrive = () => {
    if (file?.webUrl) {
      window.open(file.webUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.open('https://onedrive.live.com', '_blank', 'noopener,noreferrer');
    }
  };

  const statusConfig = getStatusBadge(testCase.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div id="testcase-detail-container" className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          id="back-to-testcases-btn"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Test Cases Table</span>
        </button>

        <button
          id="open-testcase-onedrive-btn"
          onClick={handleOpenOneDrive}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <span>Open in OneDrive</span>
          <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>
      </div>

      {/* Main Test Case Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
        {/* Header Badges & Title */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-900 text-white shadow-2xs">
                {testCase.id}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${statusConfig.style}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{testCase.status}</span>
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getPriorityBadge(testCase.priority)}`}>
                {testCase.priority} Priority
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight pt-2">
              {testCase.title}
            </h1>
          </div>

          <div className="text-right text-xs text-slate-400">
            <div className="flex items-center gap-1.5 justify-end">
              <Calendar className="w-3.5 h-3.5" />
              <span>Last Tested / Updated</span>
            </div>
            <p className="font-semibold text-slate-700 mt-0.5">{testCase.lastUpdated}</p>
          </div>
        </div>

        {/* Test Steps Procedure */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ListOrdered className="w-4 h-4 text-blue-600" />
            <span>Execution Steps & Instructions</span>
          </h3>
          <div className="p-6 rounded-xl bg-slate-50/80 border border-slate-200/80 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
            {testCase.steps || 'No execution steps recorded in the source file.'}
          </div>
        </div>

        {/* Expected Result */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-600" />
            <span>Expected Validation Result</span>
          </h3>
          <div className="p-6 rounded-xl bg-emerald-50/40 border border-emerald-200/80 text-sm text-emerald-950 leading-relaxed whitespace-pre-wrap font-sans">
            {testCase.expectedResult || 'No expected outcome defined.'}
          </div>
        </div>

        {/* Key Verification Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Status Metric */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Validation Status</p>
              <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{testCase.status}</p>
            </div>
          </div>

          {/* Priority Metric */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Severity Level</p>
              <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{testCase.priority}</p>
            </div>
          </div>

          {/* Source Sync File */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Source Test Suite</p>
              <p className="text-xs font-bold text-slate-900 truncate mt-0.5 font-mono">{file?.name || 'test_cases.csv'}</p>
            </div>
          </div>
        </div>

        {/* Source File Location Footnote */}
        {file && (
          <div className="mt-6 p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-blue-900">
              <FileCode className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Parsed directly from OneDrive file: <strong className="font-semibold">{file.name}</strong> ({Math.round(file.size / 1024)} KB)
              </span>
            </div>
            <button
              onClick={handleOpenOneDrive}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 underline underline-offset-2 cursor-pointer"
            >
              <span>View Source in OneDrive</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
