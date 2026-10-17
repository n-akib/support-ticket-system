import type { TicketStatus } from '../types/ticket';

/**
 * Checks whether a ticket has breached its SLA deadline
 */
export function isTicketOverdue(dueAt: string, status: TicketStatus): boolean {
  if (status === 'resolved' || status === 'closed') {
    return false;
  }
  return new Date() > new Date(dueAt);
}

/**
 * Returns formatted SLA timing label and status
 */
export function getSlaInfo(dueAt: string, status: TicketStatus): {
  isOverdue: boolean;
  label: string;
  isUrgent: boolean;
} {
  if (status === 'resolved' || status === 'closed') {
    return {
      isOverdue: false,
      label: 'SLA Met',
      isUrgent: false,
    };
  }

  const now = new Date().getTime();
  const target = new Date(dueAt).getTime();
  const diffMs = target - now;

  if (diffMs <= 0) {
    const overdueHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    const overdueMinutes = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60));
    const label =
      overdueHours > 0
        ? `Overdue by ${overdueHours}h ${overdueMinutes}m`
        : `Overdue by ${overdueMinutes}m`;
    return {
      isOverdue: true,
      label,
      isUrgent: true,
    };
  }

  const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const label =
    remainingHours > 24
      ? `Due in ${Math.round(remainingHours / 24)}d`
      : remainingHours > 0
        ? `Due in ${remainingHours}h ${remainingMinutes}m`
        : `Due in ${remainingMinutes}m`;

  return {
    isOverdue: false,
    label,
    isUrgent: remainingHours < 4,
  };
}

/**
 * Formats ISO date string to human-readable date and time
 */
export function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  } catch {
    return dateStr;
  }
}
