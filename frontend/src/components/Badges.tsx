import React from 'react';
import type { TicketStatus, TicketPriority } from '../types/ticket';
import { getSlaInfo } from '../utils/date';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  PlayCircle,
  Check,
} from 'lucide-react';

export const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  switch (status) {
    case 'open':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Clock className="w-3.5 h-3.5 text-sky-500" />
          Open
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <PlayCircle className="w-3.5 h-3.5 text-amber-500" />
          In Progress
        </span>
      );
    case 'resolved':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Resolved
        </span>
      );
    case 'closed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <Check className="w-3.5 h-3.5 text-slate-500" />
          Closed
        </span>
      );
    default:
      return null;
  }
};

export const PriorityBadge: React.FC<{ priority: TicketPriority }> = ({ priority }) => {
  switch (priority) {
    case 'urgent':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          Urgent
        </span>
      );
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
          High
        </span>
      );
    case 'medium':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          Medium
        </span>
      );
    case 'low':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          Low
        </span>
      );
    default:
      return null;
  }
};

export const SlaOverdueBadge: React.FC<{ dueAt: string; status: TicketStatus }> = ({
  dueAt,
  status,
}) => {
  const sla = getSlaInfo(dueAt, status);

  if (status === 'resolved' || status === 'closed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        SLA Met
      </span>
    );
  }

  if (sla.isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
        {sla.label}
      </span>
    );
  }

  if (sla.isUrgent) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-500" />
        {sla.label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
      <Clock className="w-3 h-3 text-slate-400" />
      {sla.label}
    </span>
  );
};
