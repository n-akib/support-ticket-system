import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient, getApiErrorMessage } from '../api/client';
import type { Ticket, TicketStatus, Comment } from '../types/ticket';
import { Navbar } from '../components/Navbar';
import { StatusBadge, PriorityBadge, SlaOverdueBadge } from '../components/Badges';
import { formatDateTime } from '../utils/date';
import {
  ArrowLeft,
  Clock,
  User,
  UserCheck,
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRightCircle,
  RotateCcw,
  UserPlus,
  UserMinus,
  Edit3,
  Check,
  X,
} from 'lucide-react';

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Status transition states
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Assignment states
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Comment submission states
  const [commentBody, setCommentBody] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Edit ticket state (for open tickets)
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const fetchTicketData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const [ticketRes, commentsRes] = await Promise.all([
        apiClient.get<Ticket>(`/tickets/${id}`),
        apiClient.get<Comment[]>(`/tickets/${id}/comments`),
      ]);

      setTicket(ticketRes.data);
      setComments(commentsRes.data);
      setEditTitle(ticketRes.data.title);
      setEditDescription(ticketRes.data.description);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicketData();
  }, [fetchTicketData]);

  // Handle status transition
  const handleStatusChange = async (targetStatus: TicketStatus) => {
    if (!ticket) return;
    setIsUpdatingStatus(true);
    setStatusMessage(null);

    try {
      const response = await apiClient.patch<Ticket>(`/tickets/${ticket.id}/status`, {
        status: targetStatus,
      });
      setTicket(response.data);
      setStatusMessage({
        type: 'success',
        text: `Ticket status successfully updated to "${targetStatus.replace('_', ' ')}".`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: getApiErrorMessage(err),
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle agent assignment
  const handleAssign = async (agentId: string | null) => {
    if (!ticket) return;
    setIsAssigning(true);

    try {
      const response = await apiClient.patch<Ticket>(`/tickets/${ticket.id}/assign`, {
        assignedToId: agentId,
      });
      setTicket(response.data);
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: getApiErrorMessage(err),
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle comment submit
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !commentBody.trim()) return;

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      const response = await apiClient.post<Comment>(`/tickets/${ticket.id}/comments`, {
        body: commentBody.trim(),
      });
      setComments((prev) => [...prev, response.data]);
      setCommentBody('');
    } catch (err: unknown) {
      setCommentError(getApiErrorMessage(err));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle save edit (Title and Description)
  const handleSaveEdit = async () => {
    if (!ticket || !editTitle.trim() || !editDescription.trim()) return;

    setIsSavingEdit(true);
    try {
      const response = await apiClient.patch<Ticket>(`/tickets/${ticket.id}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      setTicket(response.data);
      setIsEditing(false);
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: getApiErrorMessage(err),
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const isStaff = user?.role === 'agent' || user?.role === 'admin';
  const isCreator = ticket?.createdById === user?.id;
  const canEditTicket = (isStaff || (isCreator && ticket?.status === 'open')) && ticket?.status !== 'closed';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Ticket Not Found or Access Denied</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              {error || 'This ticket does not exist or you do not have permission to view it.'}
            </p>
            <button
              onClick={() => navigate('/tickets')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Ticket Queue
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/tickets"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Ticket Queue
          </Link>

          <span className="text-xs text-slate-400 font-mono">
            ID: {ticket.id}
          </span>
        </div>

        {/* Status Message Alert */}
        {statusMessage && (
          <div
            className={`p-4 mb-6 rounded-xl border flex items-center justify-between text-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs font-semibold hover:opacity-75"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Column: Ticket Info & Discussion */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 uppercase tracking-wider">
                    {ticket.category}
                  </span>
                  <SlaOverdueBadge dueAt={ticket.dueAt} status={ticket.status} />
                </div>

                {canEditTicket && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Ticket
                  </button>
                )}
              </div>

              {/* Title & Description or Edit Mode */}
              {isEditing ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={4}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isSavingEdit}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSavingEdit || !editTitle.trim() || !editDescription.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                    >
                      {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-4">
                    {ticket.title}
                  </h1>
                  <div className="prose prose-slate text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    {ticket.description}
                  </div>
                </div>
              )}
            </div>

            {/* Discussion / Comments Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Discussion Thread ({comments.length})
                </h2>
              </div>

              {/* Comments Feed */}
              <div className="space-y-4 mb-6">
                {comments.length === 0 ? (
                  <p className="text-center py-6 text-sm text-slate-500">
                    No comments yet. Start the conversation below.
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                            {comment.author?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="font-semibold text-slate-800">
                            {comment.author?.name}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-medium capitalize ${
                              comment.author?.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : comment.author?.role === 'agent'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {comment.author?.role}
                          </span>
                        </div>
                        <span className="text-slate-400">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap pl-8">
                        {comment.body}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form or Closed Notice */}
              {ticket.status === 'closed' ? (
                <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-center text-xs font-medium text-slate-600 flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  This ticket has been closed. The discussion is locked.
                </div>
              ) : (
                <form onSubmit={handleCommentSubmit} className="space-y-3 pt-4 border-t border-slate-100">
                  {commentError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                      {commentError}
                    </div>
                  )}
                  <div>
                    <label htmlFor="comment" className="block text-xs font-semibold text-slate-700 mb-1">
                      Leave a response
                    </label>
                    <textarea
                      id="comment"
                      rows={3}
                      required
                      value={commentBody}
                      onChange={(e) => setCommentBody(e.target.value)}
                      placeholder="Add an update, ask a question, or reply to customer..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !commentBody.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmittingComment ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          Post Comment
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Sidebar Column: Lifecycle Status Actions & Ticket Metadata */}
          <div className="space-y-6">
            {/* Status Transition Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ArrowRightCircle className="w-4 h-4 text-blue-600" />
                Ticket Status Workflow
              </h3>

              <div className="space-y-2">
                {/* Staff Actions */}
                {isStaff && (
                  <>
                    {ticket.status === 'open' && (
                      <button
                        onClick={() => handleStatusChange('in_progress')}
                        disabled={isUpdatingStatus}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-colors cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Move to In Progress
                      </button>
                    )}

                    {ticket.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => handleStatusChange('resolved')}
                          disabled={isUpdatingStatus}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Mark as Resolved
                        </button>
                        <button
                          onClick={() => handleStatusChange('open')}
                          disabled={isUpdatingStatus}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Revert to Open
                        </button>
                      </>
                    )}

                    {ticket.status === 'resolved' && (
                      <>
                        <button
                          onClick={() => handleStatusChange('closed')}
                          disabled={isUpdatingStatus}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Close Ticket
                        </button>
                        <button
                          onClick={() => handleStatusChange('open')}
                          disabled={isUpdatingStatus}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-medium border border-sky-200 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reopen Ticket
                        </button>
                      </>
                    )}

                    {ticket.status === 'closed' && (
                      <p className="text-xs text-slate-500 italic text-center py-2">
                        Ticket is permanently closed.
                      </p>
                    )}
                  </>
                )}

                {/* Customer Actions */}
                {!isStaff && (
                  <>
                    {ticket.status === 'resolved' ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                          The support agent marked your ticket as resolved. If satisfied, please close the ticket.
                        </p>
                        <button
                          onClick={() => handleStatusChange('closed')}
                          disabled={isUpdatingStatus}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Accept Resolution & Close Ticket
                        </button>
                      </div>
                    ) : ticket.status === 'closed' ? (
                      <p className="text-xs text-slate-500 italic text-center py-2">
                        This ticket is closed.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        Status updates are handled by assigned support agents. You will see progress reflected here.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Ticket Assignment Card (Staff Only) */}
            {isStaff && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Agent Assignment
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500">Currently Assigned:</span>
                    <span className="font-semibold text-slate-800">
                      {ticket.assignedTo?.name || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    {ticket.assignedToId !== user?.id && (
                      <button
                        onClick={() => handleAssign(user!.id)}
                        disabled={isAssigning}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold border border-blue-200 transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Assign to Me
                      </button>
                    )}

                    {ticket.assignedToId && (
                      <button
                        onClick={() => handleAssign(null)}
                        disabled={isAssigning}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium border border-slate-200 transition-colors cursor-pointer"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        Unassign Ticket
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SLA & Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                SLA & Timestamps
              </h3>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">SLA Target Deadline</span>
                  <span className="font-semibold text-slate-800 block">
                    {formatDateTime(ticket.dueAt)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Created Date</span>
                  <span className="text-slate-700 block">
                    {formatDateTime(ticket.createdAt)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block mb-0.5">Last Updated</span>
                  <span className="text-slate-700 block">
                    {formatDateTime(ticket.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* People Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-500" />
                People Involved
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Raised by</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                      {ticket.createdBy?.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{ticket.createdBy?.name}</div>
                      <div className="text-[11px] text-slate-400">{ticket.createdBy?.email}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block mb-1">Assigned Agent</span>
                  {ticket.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                        {ticket.assignedTo.name?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{ticket.assignedTo.name}</div>
                        <div className="text-[11px] text-slate-400">{ticket.assignedTo.email}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">No agent assigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
