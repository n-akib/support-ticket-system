import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../api/client';
import type { Ticket, TicketPriority, AiSuggestResponse } from '../types/ticket';
import { Navbar } from '../components/Navbar';
import { PriorityBadge } from '../components/Badges';
import {
  ArrowLeft,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Bot,
  Zap,
} from 'lucide-react';

const PRIORITY_OPTIONS: { value: TicketPriority; label: string; sla: string; desc: string }[] = [
  { value: 'low', label: 'Low', sla: '72h SLA', desc: 'Minor inconvenience, non-critical issue' },
  { value: 'medium', label: 'Medium', sla: '48h SLA', desc: 'Normal business priority, default' },
  { value: 'high', label: 'High', sla: '24h SLA', desc: 'Significant disruption to workflow' },
  { value: 'urgent', label: 'Urgent', sla: '4h SLA', desc: 'Critical blocker, immediate attention needed' },
];

const CATEGORY_OPTIONS = [
  { value: 'technical', label: 'Technical Issue' },
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'account', label: 'Account & Security' },
  { value: 'general', label: 'General Inquiry' },
];

export const CreateTicketPage: React.FC = () => {
  const navigate = useNavigate();

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState<TicketPriority>('medium');

  // Validation & Submission states
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Suggestion states
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  const validate = (): boolean => {
    const errs: { title?: string; description?: string } = {};
    if (!title.trim()) {
      errs.title = 'Title is required';
    } else if (title.trim().length > 200) {
      errs.title = 'Title must be 200 characters or fewer';
    }

    if (!description.trim()) {
      errs.description = 'Description is required';
    } else if (description.trim().length < 5) {
      errs.description = 'Description must be at least 5 characters long';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAiSuggest = async () => {
    if (!title.trim() && !description.trim()) {
      setAiError('Please enter a title or description first so AI can analyze the issue.');
      return;
    }

    setIsAnalyzingAi(true);
    setAiError(null);

    try {
      const response = await apiClient.post<AiSuggestResponse>('/ai/suggest', {
        title: title.trim() || 'Untitled Support Request',
        description: description.trim() || title.trim(),
      });
      setAiSuggestion(response.data);
      setAiApplied(false);
    } catch (err: unknown) {
      setAiError(getApiErrorMessage(err));
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    if (aiSuggestion.suggestedCategory) {
      setCategory(aiSuggestion.suggestedCategory);
    }
    if (aiSuggestion.suggestedPriority) {
      setPriority(aiSuggestion.suggestedPriority);
    }
    setAiApplied(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post<Ticket>('/tickets', {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        priority,
      });

      // Navigate to ticket detail view or list
      navigate(`/tickets/${response.data.id}`);
    } catch (err: unknown) {
      setServerError(getApiErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/tickets"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tickets
          </Link>
        </div>

        {/* Card Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Create New Support Ticket
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Provide details about your problem or inquiry. Our AI assistant can automatically suggest categorization and SLA priority.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Server Error Alert */}
            {serverError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
                <div className="text-sm font-medium">{serverError}</div>
              </div>
            )}

            {/* Title Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="title" className="block text-sm font-semibold text-slate-800">
                  Ticket Title <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">{title.length}/200</span>
              </div>
              <input
                id="title"
                type="text"
                maxLength={200}
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                placeholder="e.g. Cannot access billing receipts from last month"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.title
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
              />
              {errors.title && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.title}</p>
              )}
            </div>

            {/* Description Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="description" className="block text-sm font-semibold text-slate-800">
                  Detailed Description <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">Min. 5 characters</span>
              </div>
              <textarea
                id="description"
                rows={5}
                required
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                }}
                placeholder="Explain what happened, steps to reproduce, or any error messages you received..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.description
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
              />
              {errors.description && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.description}</p>
              )}
            </div>

            {/* AI Assistant Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-slate-50 border border-indigo-100/80">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      AI Triage Assistant
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        Feature
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600">
                      Auto-detect category, urgency, and generate a concise summary.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={isAnalyzingAi || (!title.trim() && !description.trim())}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isAnalyzingAi ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing Issue...
                    </>
                  ) : (
                    <>
                      <Bot className="w-3.5 h-3.5" />
                      Suggest Triage
                    </>
                  )}
                </button>
              </div>

              {/* AI Error */}
              {aiError && (
                <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {aiError}
                </div>
              )}

              {/* AI Recommendation Result Card */}
              {aiSuggestion && (
                <div className="mt-4 p-4 rounded-xl bg-white border border-indigo-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-slate-800">AI Recommendation</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 uppercase">
                        {aiSuggestion.source === 'ai' ? 'Live LLM Model' : 'Heuristic Rules'}
                      </span>
                    </div>

                    {!aiApplied ? (
                      <button
                        type="button"
                        onClick={applyAiSuggestion}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        Apply Suggestions
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Applied
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Suggested Category:</span>
                      <span className="font-semibold text-slate-800 uppercase tracking-wide">
                        {aiSuggestion.suggestedCategory}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-0.5">Suggested Priority:</span>
                      <PriorityBadge priority={aiSuggestion.suggestedPriority} />
                    </div>
                  </div>

                  {aiSuggestion.summary && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 block mb-0.5">AI Summary:</span>
                      <p className="text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        "{aiSuggestion.summary}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category & Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Categorization helps route tickets to specialized agents.
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  Priority & SLA Deadline
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all capitalize"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.sla})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {PRIORITY_OPTIONS.find((p) => p.value === priority)?.desc}
                </p>
              </div>
            </div>

            {/* Priority SLA explainer pill */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
              <HelpCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-700">SLA Resolution Deadlines:</span>{' '}
                Urgent: 4 hours • High: 24 hours • Medium: 48 hours • Low: 72 hours. An overdue badge will trigger automatically if the ticket is not resolved within the SLA window.
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Link
                to="/tickets"
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Ticket
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
