import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient, getApiErrorMessage } from '../api/client';
import type { Ticket } from '../types/ticket';
import { Navbar } from '../components/Navbar';
import { StatusBadge, PriorityBadge, SlaOverdueBadge } from '../components/Badges';
import { formatDateTime, isTicketOverdue } from '../utils/date';
import {
  Search,
  RefreshCw,
  Plus,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
} from 'lucide-react';

export const TicketListPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyOverdue, setOnlyOverdue] = useState<boolean>(false);

  const fetchTickets = useCallback(async (background = false) => {
    if (background) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const response = await apiClient.get<Ticket[]>('/tickets', { params });
      setTickets(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Compute metrics from full ticket set or current view
  const metrics = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === 'open').length;
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
    const resolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
    const overdue = tickets.filter((t) => isTicketOverdue(t.dueAt, t.status)).length;

    return { total, open, inProgress, resolved, overdue };
  }, [tickets]);

  // Client-side text search & overdue filtering
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Overdue quick filter
      if (onlyOverdue && !isTicketOverdue(ticket.dueAt, ticket.status)) {
        return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = ticket.title.toLowerCase().includes(query);
        const matchesDesc = ticket.description.toLowerCase().includes(query);
        const matchesCategory = ticket.category?.toLowerCase().includes(query);
        const matchesAuthor = ticket.createdBy?.name.toLowerCase().includes(query);
        const matchesAssignee = ticket.assignedTo?.name?.toLowerCase().includes(query);

        return (
          matchesTitle || matchesDesc || matchesCategory || matchesAuthor || matchesAssignee
        );
      }

      return true;
    });
  }, [tickets, searchQuery, onlyOverdue]);

  const hasActiveFilters = statusFilter !== '' || priorityFilter !== '' || searchQuery !== '' || onlyOverdue;

  const resetFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setSearchQuery('');
    setOnlyOverdue(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {user?.role === 'customer' ? 'My Support Requests' : 'Support Ticket Queue'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {user?.role === 'customer'
                ? 'Submit tickets, check resolution progress, and coordinate with support agents.'
                : 'Manage customer requests, enforce SLA compliance, and resolve active tickets.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTickets(true)}
              disabled={isRefreshing}
              title="Refresh queue"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              to="/tickets/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Ticket</span>
            </Link>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Total</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{metrics.total}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-sky-600 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Open</span>
              <Clock className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-bold text-sky-700">{metrics.open}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-700">{metrics.inProgress}</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Resolved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">{metrics.resolved}</div>
          </div>

          {/* Overdue click-to-filter badge card */}
          <button
            onClick={() => setOnlyOverdue(!onlyOverdue)}
            className={`text-left p-4 rounded-xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
              onlyOverdue
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400 shadow-xs'
                : 'bg-white border-slate-200 hover:border-rose-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-rose-600 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-rose-700">{metrics.overdue}</span>
              <span className="text-[11px] font-medium text-rose-600 underline">
                {onlyOverdue ? 'Clear filter' : 'Filter overdue'}
              </span>
            </div>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Search */}
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, description, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Status Filter */}
            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2 px-3 text-sm rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="sm:col-span-3">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full py-2 px-3 text-sm rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Reset */}
            <div className="sm:col-span-1 flex justify-end">
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  title="Clear all filters"
                  className="w-full sm:w-auto p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-xs"
                >
                  <X className="w-4 h-4 mr-1 sm:mr-0" />
                  <span className="sm:hidden">Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 mb-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchTickets()}
              className="text-xs font-semibold px-3 py-1.5 bg-rose-100 hover:bg-rose-200 rounded-lg text-rose-800 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
                <div className="h-6 bg-slate-100 rounded-full w-24" />
              </div>
            ))}
          </div>
        )}

        {/* Empty States */}
        {!isLoading && filteredTickets.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              {hasActiveFilters ? 'No matching tickets found' : 'No tickets in this queue'}
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
              {hasActiveFilters
                ? 'Try broadening your search query or resetting your status/priority filters.'
                : user?.role === 'customer'
                  ? 'You have not submitted any support tickets yet. Click below to create one.'
                  : 'There are no customer tickets currently raised in the system.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            ) : (
              <Link
                to="/tickets/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create First Ticket
              </Link>
            )}
          </div>
        )}

        {/* Ticket List Cards */}
        {!isLoading && filteredTickets.length > 0 && (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="group block bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left Column: Badges & Title */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                      {ticket.category && (
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 uppercase tracking-wider">
                          {ticket.category}
                        </span>
                      )}
                      <SlaOverdueBadge dueAt={ticket.dueAt} status={ticket.status} />
                    </div>

                    <h2 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {ticket.title}
                    </h2>

                    <p className="text-sm text-slate-600 line-clamp-1 mt-1">
                      {ticket.description}
                    </p>

                    {/* Metadata Row */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Raised by: <strong className="text-slate-700">{ticket.createdBy?.name || 'Customer'}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Assignee:{' '}
                        <strong className="text-slate-700">
                          {ticket.assignedTo?.name || 'Unassigned'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>Created: {formatDateTime(ticket.createdAt)}</span>
                    </div>
                  </div>

                  {/* Right Column: Link Arrow */}
                  <div className="flex items-center justify-end sm:pl-4">
                    <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
