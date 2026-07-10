import { api } from './api';

export type SupportWorkflowStatus = 'pending' | 'acknowledged' | 'in_progress' | 'resolved';

export interface SupportTicket {
  id: string;
  user_id: string;
  institution_id: string | null;
  subject: string;
  description: string;
  category?: string | null;
  priority: 'low' | 'normal' | 'high' | 'critical' | string;
  status: string;
  workflow_status?: SupportWorkflowStatus;
  can_edit?: boolean;
  can_delete?: boolean;
  assigned_to_id?: string | null;
  escalation_level?: number;
  metadata?: Record<string, any> | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export class SupportService {
  static async getMyTickets(): Promise<SupportTicket[]> {
    const response = await api.get('/support/tickets');
    return response.data?.tickets || [];
  }

  static async createTicket(payload: {
    subject: string;
    description: string;
    category?: string;
    priority?: string;
  }): Promise<SupportTicket> {
    const response = await api.post('/support/tickets', payload);
    return response.data?.ticket;
  }

  static async updateMyTicket(ticketId: string, payload: {
    subject?: string;
    description?: string;
    category?: string;
    priority?: string;
  }): Promise<SupportTicket> {
    const response = await api.put(`/support/tickets/${encodeURIComponent(ticketId)}`, payload);
    return response.data?.ticket;
  }

  static async deleteMyTicket(ticketId: string): Promise<void> {
    await api.delete(`/support/tickets/${encodeURIComponent(ticketId)}`);
  }
}
