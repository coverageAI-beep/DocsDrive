import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Download,
  RotateCw,
  AlertCircle,
  Loader2,
  FileText,
  ListChecks,
  Cpu,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { RequirementRow } from '../types';

interface AIResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: 'summarize' | 'generate-test-cases';
  requirement: RequirementRow;
  providerName: string;
  modelName?: string;
  loading: boolean;
  result: string | null;
  error: string | null;
  onRegenerate: () => void;
}

export const AIResponseModal: React.FC<AIResponseModalProps> = ({
  isOpen,
  onClose,
  action,
  requirement,
  providerName,
  modelName,
  loading,
  result,
  error,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isSummarize = action === 'summarize';
  const modalTitle = isSummarize
    ? 'Requirement Executive Summary'
    : 'AI Generated QA Test Cases';

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanId = requirement.id.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    link.download = `${cleanId}_${action === 'summarize' ? 'summary' : 'test_cases'}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="ai-response-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="ai-response-modal-dialog"
        className="bg-white w-full max-w-3xl max-h-[88vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
              {isSummarize ? (
                <FileText className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <ListChecks className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {modalTitle}
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 uppercase">
                  <Cpu className="w-3 h-3" />
                  <span>{providerName}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">{requirement.id}:</span>
                <span className="truncate max-w-md">{requirement.title}</span>
              </p>
            </div>
          </div>

          <button
            id="ai-modal-close-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-800">
          {/* Loading State */}
          {loading && (
            <div className="py-16 text-center space-y-4">
              <div className="relative inline-block">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                  <Sparkles className="w-7 h-7 animate-spin text-indigo-600" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  {isSummarize
                    ? 'Synthesizing Requirement Scope...'
                    : 'Architecting Comprehensive QA Test Cases...'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Consulting {providerName}{modelName ? ` (${modelName})` : ''} via securely encrypted API tokens.
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900">AI Request Error</h4>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed">{error}</p>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={onRegenerate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Retry Request</span>
                </button>
              </div>
            </div>
          )}

          {/* Content Rendered */}
          {!loading && !error && result && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-slate-50/90 border border-slate-200/80 text-sm leading-relaxed font-sans text-slate-800 whitespace-pre-wrap selection:bg-indigo-100 selection:text-indigo-900">
                {result}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>AES-256 Encrypted Session</span>
          </div>

          <div className="flex items-center gap-2">
            {!loading && result && (
              <>
                <button
                  id="ai-modal-copy-btn"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Output</span>
                    </>
                  )}
                </button>

                <button
                  id="ai-modal-download-btn"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download .md</span>
                </button>

                <button
                  id="ai-modal-regenerate-btn"
                  onClick={onRegenerate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Regenerate</span>
                </button>
              </>
            )}

            <button
              id="ai-modal-done-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
