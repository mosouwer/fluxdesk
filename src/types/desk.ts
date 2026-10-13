export type UserRole = 'customer' | 'agent' | 'admin' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  isActive?: boolean;
  workspaceId?: string;
  workspaceName?: string;
  company?: string;
  timezone?: string;
  phone?: string;
  lifetimeTickets?: number;
  openTickets?: number;
  tier?: 'Standard' | 'Pro' | 'Enterprise VIP';
  createdAt?: string;
}

export type TicketStatus = 'open' | 'pending' | 'on_hold' | 'solved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketChannel = 'web' | 'email' | 'chat' | 'api';
export type MessageType = 'public_reply' | 'internal_note';

export interface MessageAttachment {
  filename: string;
  sizeBytes: number;
  url: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  sender: User;
  type: MessageType;
  body: string;
  attachments?: MessageAttachment[];
  createdAt: string;
}

export interface Ticket {
  id: string;
  number: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: TicketChannel;
  customer: User;
  assignedAgent?: User;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  slaDueMinutes: number; // Positive = time left in minutes, negative = SLA breached
  messages: TicketMessage[];
  workspaceId?: string;
  csatRating?: number; // 1-5
  csatFeedback?: string;
  ratedAt?: string;
}

export type DeskView = 'unassigned' | 'my_tickets' | 'sla_breached' | 'open' | 'solved';

export interface MacroAction {
  action: 'add_comment' | 'set_status' | 'set_priority' | 'add_tags' | 'set_assignee';
  type?: MessageType;
  body?: string;
  value?: any;
}

export interface Macro {
  id: string;
  title: string;
  description: string;
  category: 'General' | 'Troubleshooting' | 'Billing' | 'Escalation';
  actions: MacroAction[];
}
