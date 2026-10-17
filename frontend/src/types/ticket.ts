import type { User } from './auth';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  createdById: string;
  createdBy: User;
  assignedToId: string | null;
  assignedTo: User | null;
  dueAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketFilters {
  status?: TicketStatus | '';
  priority?: TicketPriority | '';
  category?: string;
  search?: string;
}
