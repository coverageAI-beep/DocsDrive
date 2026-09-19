import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Save,
  Trash2,
  RotateCw,
  Cpu,
  Layers,
  Check,
  Copy,
  ExternalLink,
  Info,
  Server,
  Code
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AIProvider, AIConnectionInfo } from '../types';
import { encryptApiKey, testAIConnection } from '../services/aiService';

export const AIConnectionsTab: React.FC = () => {
  const { userProfile, updateAIConnection } = useAuth();
  const savedConnection = userProfile?.aiConnection;

  // Selected provider
  const [provider, setProvider] = useState<AIProvider>('openai');

  // Input states
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelInput, setModelInput] = useState('gpt-4o-mini');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [azureDeploymentName, setAzureDeploymentName] = useState('gpt-4o');
  const [azureApiVersion, setAzureApiVersion] = useState('2024-02-15-preview');

  // Mode: if saved connection exists, whether user is editing/replacing
  const [isReplacing, setIsReplacing] = useState(false);

  // Testing status
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Saving status
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Removing status
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Masked key copy feedback
  const [copiedMaskedKey, setCopiedMaskedKey] = useState(false);

  // Initialize or update fields based on saved connection
  useEffect(() => {
    if (savedConnection) {
      setProvider(savedConnection.provider);
      if (savedConnection.model) setModelInput(savedConnection.model);
      if (savedConnection.customEndpoint) setCustomEndpoint(savedConnection.customEndpoint);
      if (savedConnection.azureDeploymentName) setAzureDeploymentName(savedConnection.azureDeploymentName);
      if (savedConnection.azureApiVersion) setAzureApiVersion(savedConnection.azureApiVersion);
    }
  }, [savedConnection]);

  // Update default model placeholder when provider changes
  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    setTestResult(null);
    setSaveError(null);
    setSaveSuccess(null);

    switch (newProvider) {
      case 'openai':
        setModelInput('gpt-4o-mini');
        break;
      case 'anthropic':
        setModelInput('claude-3-5-haiku-20241022');
        break;
      case 'gemini':
        setModelInput('gemini-1.5-flash');
        break;
      case 'azure':
        setModelInput('gpt-4o');
        break;
      case 'custom':
        setModelInput('default');
        break;
    }
  };

  // Test Connection for new or current input
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setSaveError(null);

    try {
      // If user is testing existing key without entering a new key
      const keyToTest = apiKeyInput.trim();
      const encryptedKeyToTest = !keyToTest && savedConnection ? savedConnection.encryptedApiKey : undefined;

      if (!keyToTest && !encryptedKeyToTest && provider !== 'custom') {
        throw new Error('Please enter an API key to test the connection.');
      }

      const res = await testAIConnection({
        provider,
        apiKey: keyToTest || undefined,
        encryptedApiKey: encryptedKeyToTest,
        model: modelInput.trim() || undefined,
        customEndpoint: customEndpoint.trim() || undefined,
        azureDeploymentName: azureDeploymentName.trim() || undefined,
        azureApiVersion: azureApiVersion.trim() || undefined,
      });

      setTestResult({
        success: true,
        message: res.message || 'Connection test succeeded! Credentials are valid.',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed. Please verify credentials and permissions.',
      });
    } finally {
      setTesting(false);
    }
  };

  // Save AI Connection
  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const rawKey = apiKeyInput.trim();
      if (!rawKey && !savedConnection?.encryptedApiKey && provider !== 'custom') {
        throw new Error('Please provide a valid API key.');
      }

      // Step 1: Encrypt API Key at rest via server AES-256-GCM
      let encryptedApiKey = savedConnection?.encryptedApiKey || '';
      let maskedApiKey = savedConnection?.maskedApiKey || '';

      if (rawKey) {
        const encRes = await encryptApiKey(rawKey);
        encryptedApiKey = encRes.encryptedApiKey;
        maskedApiKey = encRes.maskedApiKey;
      }

      // Step 2: Validate with a test call before committing if not tested yet
      if (!testResult?.success) {
        const testRes = await testAIConnection({
          provider,
          apiKey: rawKey || undefined,
          encryptedApiKey: rawKey ? undefined : encryptedApiKey,
          model: modelInput.trim() || undefined,
          customEndpoint: customEndpoint.trim() || undefined,
          azureDeploymentName: azureDeploymentName.trim() || undefined,
          azureApiVersion: azureApiVersion.trim() || undefined,
        });

        if (!testRes.success) {
          throw new Error(testRes.message || 'Validation failed. Please verify your API key.');
        }
      }

      // Step 3: Store in Firestore via AuthContext
      const aiData: AIConnectionInfo = {
        provider,
        model: modelInput.trim() || undefined,
        customEndpoint: customEndpoint.trim() || undefined,
        azureDeploymentName: provider === 'azure' ? azureDeploymentName.trim() : undefined,
        azureApiVersion: provider === 'azure' ? azureApiVersion.trim() : undefined,
        encryptedApiKey,
        maskedApiKey,
        lastTestedAt: new Date().toISOString().split('T')[0],
        isValid: true,
      };

      await updateAIConnection(aiData);

      // Reset state
      setApiKeyInput('');
      setIsReplacing(false);
      setSaveSuccess(`AI Connection to ${provider.toUpperCase()} saved and encrypted successfully!`);
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save AI connection.');
    } finally {
      setSaving(false);
    }
  };

  // Remove AI Connection
  const handleRemoveConnection = async () => {
    setRemoving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await updateAIConnection(null);
      setIsReplacing(false);
      setApiKeyInput('');
      setConfirmDelete(false);
      setTestResult(null);
      setSaveSuccess('AI connection and encrypted credentials removed.');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to remove AI connection.');
    } finally {
      setRemoving(false);
    }
  };

  const activeConnection = (savedConnection && savedConnection.isValid && savedConnection.encryptedApiKey)
    ? savedConnection
    : null;

  const getProviderNameLabel = (p: AIProvider) => {
    switch (p) {
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
        return p;
    }
  };

  return (
    <div id="ai-connections-tab-panel" className="space-y-6 animate-in fade-in">
      {/* Overview Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">AI Model Connections</h3>
              {activeConnection ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Connected: {getProviderNameLabel(activeConnection.provider)}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Not Connected
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
              Connect your own AI API key (OpenAI, Anthropic Claude, Google Gemini, Azure OpenAI, or Custom) to enable requirement summarization and automated test case generation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-indigo-50/80 text-indigo-700 border border-indigo-100">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>AES-256-GCM Encrypted at Rest</span>
        </div>
      </div>

      {/* Global Alert Banners */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* CASE 1: Active Saved Connection (Read-only view with Replace/Remove options) */}
      {activeConnection && !isReplacing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Provider Configuration
              </span>
              <h4 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
                <span>{getProviderNameLabel(activeConnection.provider)}</span>
                {activeConnection.model && (
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {activeConnection.model}
                  </span>
                )}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="test-saved-connection-btn"
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>

              <button
                id="replace-ai-key-btn"
                type="button"
                onClick={() => {
                  setIsReplacing(true);
                  setTestResult(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Replace Key</span>
              </button>

              <button
                id="remove-ai-key-btn"
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Test connection output if triggered on saved key */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">
                <span className="font-bold">
                  {testResult.success ? 'Verification Successful: ' : 'Verification Failed: '}
                </span>
                {testResult.message}
              </div>
            </div>
          )}

          {/* Masked Key Display & Security Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Masked Key Block */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>Masked API Key (Never Shown in Full)</span>
              </span>
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800">
                <span className="truncate">{activeConnection.maskedApiKey || '••••••••'}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (activeConnection.maskedApiKey) {
                      navigator.clipboard.writeText(activeConnection.maskedApiKey);
                      setCopiedMaskedKey(true);
                      setTimeout(() => setCopiedMaskedKey(false), 2000);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                  title="Copy Masked Key String"
                >
                  {copiedMaskedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Stored securely encrypted in Firestore using AES-256-GCM.
              </p>
            </div>

            {/* Provider Details Block */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                <span>Model & Endpoint Configuration</span>
              </span>
              <div className="space-y-1 text-xs text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-400">Provider:</span>
                  <span className="font-semibold text-slate-900">{getProviderNameLabel(activeConnection.provider)}</span>
                </div>
                {activeConnection.model && (
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-400">Model:</span>
                    <span className="font-mono text-slate-900">{activeConnection.model}</span>
                  </div>
                )}
                {activeConnection.customEndpoint && (
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-400">Custom Endpoint:</span>
                    <span className="font-mono text-slate-900 truncate max-w-xs">{activeConnection.customEndpoint}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Last Verified:</span>
                  <span className="font-semibold text-emerald-700">{activeConnection.lastTestedAt || 'Active'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Delete Inline Dialog */}
          {confirmDelete && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-rose-900">Remove AI Connection?</h5>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                    This will permanently remove your stored encrypted API key from Firestore. AI actions (Summarize and Generate Test Cases) on requirements will be disabled until a new key is added.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="confirm-delete-ai-key-btn"
                  type="button"
                  onClick={handleRemoveConnection}
                  disabled={removing}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{removing ? 'Removing...' : 'Confirm Disconnect'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CASE 2: No Connection OR Replace Mode (Interactive Form) */}
      {(!activeConnection || isReplacing) && (
        <form
          id="ai-connection-form"
          onSubmit={handleSaveConnection}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                {isReplacing ? 'Replace AI Provider Credentials' : 'Connect Your AI Provider'}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose a provider, enter your API key, test connection validity, and save.
              </p>
            </div>

            {isReplacing && (
              <button
                type="button"
                onClick={() => {
                  setIsReplacing(false);
                  setApiKeyInput('');
                  setTestResult(null);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
              >
                Cancel Replace
              </button>
            )}
          </div>

          {/* Provider Selection Dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              AI Provider
            </label>
            <div className="relative">
              <select
                id="ai-provider-select"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
              >
                <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
                <option value="anthropic">Anthropic Claude (Claude 3.5 Sonnet, Claude 3.5 Haiku)</option>
                <option value="gemini">Google Gemini (Gemini 1.5 Flash, Gemini 1.5 Pro)</option>
                <option value="azure">Azure OpenAI Service</option>
                <option value="custom">Custom Endpoint (Ollama, vLLM, OpenAI-compatible proxy)</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-400">
              Direct chat completion API will be invoked server-side with your encrypted key.
            </p>
          </div>

          {/* Provider-Specific Extra Fields */}
          {provider === 'azure' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-600" />
                <span>Azure Resource Configuration</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600">Azure Endpoint URL</label>
                  <input
                    type="text"
                    placeholder="https://your-resource.openai.azure.com"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600">Deployment Name</label>
                  <input
                    type="text"
                    placeholder="gpt-4o"
                    value={azureDeploymentName}
                    onChange={(e) => setAzureDeploymentName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600">API Version</label>
                <input
                  type="text"
                  placeholder="2024-02-15-preview"
                  value={azureApiVersion}
                  onChange={(e) => setAzureApiVersion(e.target.value)}
                  className="w-full sm:w-64 px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {provider === 'custom' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-indigo-600" />
                <span>Custom OpenAI-Compatible Endpoint</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600">Base URL Endpoint</label>
                  <input
                    type="text"
                    placeholder="http://localhost:11434/v1"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                  <p className="text-[10px] text-slate-400">URL to which /chat/completions is dispatched.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600">Model Name</label>
                  <input
                    type="text"
                    placeholder="llama3 or mistral-7b"
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Model Specification for Standard Providers */}
          {provider !== 'azure' && provider !== 'custom' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Model Identifier
              </label>
              <input
                id="ai-model-input"
                type="text"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder={
                  provider === 'openai'
                    ? 'gpt-4o-mini'
                    : provider === 'anthropic'
                    ? 'claude-3-5-haiku-20241022'
                    : 'gemini-1.5-flash'
                }
                className="w-full sm:w-80 px-4 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
              <p className="text-[11px] text-slate-400">
                Recommended defaults: OpenAI (<code>gpt-4o-mini</code>), Claude (<code>claude-3-5-haiku-20241022</code>), Gemini (<code>gemini-1.5-flash</code>).
              </p>
            </div>
          )}

          {/* Masked API Key Input with Reveal Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                API Key
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                Masked & encrypted at rest
              </span>
            </div>

            <div className="relative">
              <input
                id="ai-api-key-input"
                type={showApiKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setTestResult(null);
                }}
                placeholder={
                  provider === 'openai'
                    ? 'sk-...'
                    : provider === 'anthropic'
                    ? 'sk-ant-api03-...'
                    : provider === 'gemini'
                    ? 'AIzaSy...'
                    : 'Paste API Key...'
                }
                required={provider !== 'custom'}
                className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition-all"
              />

              <button
                type="button"
                id="toggle-api-key-reveal-btn"
                onClick={() => setShowApiKey((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                title={showApiKey ? 'Hide Key' : 'Reveal Key'}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Zero Plaintext Exposure Policy</span>
              </div>
              <p>
                Your API key is encrypted on the server using AES-256-GCM before writing to Cloud Firestore. After saving, it will never be displayed in full in any user interface or logs—only a masked preview like <code>sk-…abcd</code>.
              </p>
            </div>
          </div>

          {/* Test connection result banner */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-3 animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">
                <span className="font-bold">
                  {testResult.success ? 'Verification Passed: ' : 'Verification Failed: '}
                </span>
                {testResult.message}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Left: Test Connection Button */}
            <button
              id="test-ai-connection-btn"
              type="button"
              onClick={handleTestConnection}
              disabled={testing || (!apiKeyInput.trim() && provider !== 'custom')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Validating with Provider...</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-4 h-4 text-indigo-600" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            {/* Right: Save Connection Button */}
            <div className="flex items-center gap-2">
              {/* Demo test key helper button for testing without live account */}
              <button
                type="button"
                onClick={() => {
                  setApiKeyInput('sk-demo-openai-key-2026');
                  setTestResult(null);
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fill a simulated sandbox key for testing without live credit cards"
              >
                Use Demo Key
              </button>

              <button
                id="save-ai-connection-btn"
                type="submit"
                disabled={saving || (!apiKeyInput.trim() && provider !== 'custom')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Encrypting & Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save AI Connection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
