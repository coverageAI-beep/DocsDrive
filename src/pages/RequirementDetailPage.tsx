import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  User,
  FileCode,
  Folder,
  CheckCircle2,
  FileText,
  Calendar,
  Sparkles,
  ChevronDown,
  ListChecks,
  AlertCircle,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { RequirementRow, OneDriveSubfolderFile, NavigationPage } from '../types';
import { useAuth } from '../context/AuthContext';
import { AIResponseModal } from '../components/AIResponseModal';
import { executeAIAction } from '../services/aiService';

interface RequirementDetailPageProps {
  requirement: RequirementRow;
  file?: OneDriveSubfolderFile | null;
  onBack: () => void;
  onNavigateSettings?: (tab?: string) => void;
}

export const RequirementDetailPage: React.FC<RequirementDetailPageProps> = ({
  requirement,
  file,
  onBack,
  onNavigateSettings,
}) => {
  const { userProfile } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // AI Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<'summarize' | 'generate-test-cases'>('summarize');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const aiConnection = userProfile?.aiConnection;
  const hasValidAIKey = Boolean(aiConnection?.isValid && aiConnection?.encryptedApiKey);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
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

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in review':
      case 'review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'rejected':
      case 'deprecated':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const handleOpenOneDrive = () => {
    if (file?.webUrl) {
      window.open(file.webUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.open('https://onedrive.live.com', '_blank', 'noopener,noreferrer');
    }
  };

  const triggerAIAction = async (action: 'summarize' | 'generate-test-cases') => {
    if (!hasValidAIKey || !aiConnection) {
      setDropdownOpen(true);
      return;
    }

    setDropdownOpen(false);
    setActiveAction(action);
    setModalOpen(true);
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const response = await executeAIAction({
        action,
        provider: aiConnection.provider,
        encryptedApiKey: aiConnection.encryptedApiKey,
        model: aiConnection.model,
        customEndpoint: aiConnection.customEndpoint,
        azureDeploymentName: aiConnection.azureDeploymentName,
        azureApiVersion: aiConnection.azureApiVersion,
        requirement,
      });

      setAiResult(response.result);
    } catch (err: any) {
      setAiError(err.message || 'Failed to execute AI action.');
    } finally {
      setAiLoading(false);
    }
  };

  const getProviderDisplayName = () => {
    if (!aiConnection) return 'AI Assistant';
    switch (aiConnection.provider) {
      case 'openai':
        return 'OpenAI';
      case 'anthropic':
        return 'Anthropic Claude';
      case 'gemini':
        return 'Google Gemini';
      case 'azure':
        return 'Azure OpenAI';
      case 'custom':
        return 'Custom Endpoint';
      default:
        return 'AI Assistant';
    }
  };

  return (
    <div id="requirement-detail-container" className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Navigation Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <button
          id="back-to-requirements-btn"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs cursor-pointer w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Back to Requirements Table</span>
        </button>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* AI Actions Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="ai-actions-menu-btn"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                hasValidAIKey
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-100'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-2xs'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${hasValidAIKey ? 'text-indigo-200 animate-pulse' : 'text-slate-400'}`} />
              <span>AI Actions</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div
                id="ai-actions-dropdown-menu"
                className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Header indicator */}
                <div className="px-3 py-2 border-b border-slate-100 mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    AI Workspace
                  </span>
                  {hasValidAIKey ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {getProviderDisplayName()}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      No Key Set
                    </span>
                  )}
                </div>

                {hasValidAIKey ? (
                  <div className="space-y-1">
                    {/* Option 1: Summarize */}
                    <button
                      id="ai-action-summarize-btn"
                      onClick={() => triggerAIAction('summarize')}
                      className="w-full text-left p-3 rounded-xl hover:bg-indigo-50/70 text-slate-800 transition-colors flex items-start gap-3 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-950">
                          Summarize this requirement
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          Executive scope, core objectives, and acceptance criteria.
                        </p>
                      </div>
                    </button>

                    {/* Option 2: Generate Test Cases */}
                    <button
                      id="ai-action-generate-testcases-btn"
                      onClick={() => triggerAIAction('generate-test-cases')}
                      className="w-full text-left p-3 rounded-xl hover:bg-purple-50/70 text-slate-800 transition-colors flex items-start gap-3 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <ListChecks className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-purple-950">
                          Generate test cases from this requirement
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                          Comprehensive positive, negative, and edge validation tests.
                        </p>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 space-y-3">
                    {/* Disabled options styling */}
                    <div className="space-y-1 opacity-50 pointer-events-none">
                      <div className="p-2.5 rounded-lg bg-slate-50 flex items-center gap-2.5 text-xs text-slate-600">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span>Summarize this requirement</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 flex items-center gap-2.5 text-xs text-slate-600">
                        <ListChecks className="w-4 h-4 text-slate-400" />
                        <span>Generate test cases</span>
                      </div>
                    </div>

                    {/* Prompt to add key in Settings */}
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed text-amber-800">
                          To enable AI actions, configure your API key in Settings &gt; AI Connections.
                        </p>
                      </div>

                      <button
                        id="ai-go-to-settings-btn"
                        onClick={() => {
                          setDropdownOpen(false);
                          if (onNavigateSettings) {
                            onNavigateSettings('aiconnections');
                          }
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Add Key in Settings</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            id="open-requirement-onedrive-btn"
            onClick={handleOpenOneDrive}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <span>Open in OneDrive</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Main Spec Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
        {/* Header Badges & ID */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-900 text-white shadow-2xs">
                {requirement.id}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getPriorityBadge(requirement.priority)}`}>
                {requirement.priority} Priority
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getStatusBadge(requirement.status)}`}>
                {requirement.status}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight pt-2">
              {requirement.title}
            </h1>
          </div>

          <div className="text-right text-xs text-slate-400">
            <div className="flex items-center gap-1.5 justify-end">
              <Calendar className="w-3.5 h-3.5" />
              <span>Last Updated</span>
            </div>
            <p className="font-semibold text-slate-700 mt-0.5">{requirement.lastUpdated}</p>
          </div>
        </div>

        {/* Detailed Description Section */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Specification & Scope Description</span>
          </h3>
          <div className="p-6 rounded-xl bg-slate-50/80 border border-slate-200/80 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
            {requirement.description || 'No extended description provided in the source file.'}
          </div>
        </div>

        {/* Key Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Owner Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Requirement Owner</p>
              <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{requirement.owner || 'Unassigned'}</p>
            </div>
          </div>

          {/* Status Verification Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Approval State</p>
              <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{requirement.status}</p>
            </div>
          </div>

          {/* Source Sync File */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Folder className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">OneDrive Source</p>
              <p className="text-xs font-bold text-slate-900 truncate mt-0.5 font-mono">{file?.name || 'requirements.md'}</p>
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

      {/* AI Response Modal */}
      <AIResponseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        action={activeAction}
        requirement={requirement}
        providerName={getProviderDisplayName()}
        modelName={aiConnection?.model}
        loading={aiLoading}
        result={aiResult}
        error={aiError}
        onRegenerate={() => triggerAIAction(activeAction)}
      />
    </div>
  );
};
