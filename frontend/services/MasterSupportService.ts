import { api } from './api';
import type { SupportTicket } from './SupportService';

export class MasterSupportService {
  static async getSupportRequests(): Promise<SupportTicket[]> {
    const response = await api.get('/master-admin/support-requests');
    return response.data?.requests || [];
  }

  static async getTicketMessages(ticketId: string): Promise<{ ticket: any; messages: any[] }> {
    const response = await api.get(`/master-admin/support-requests/${encodeURIComponent(ticketId)}/messages`);
    return {
      ticket: response.data?.ticket,
      messages: response.data?.messages || [],
    };
  }

  static async updateSupportRequest(ticketId: string, payload: {
    status?: 'pending' | 'acknowledged' | 'in_progress' | 'resolved';
    priority?: string;
    assigned_to_id?: string | null;
    escalation_level?: number;
    resolution_note?: string;
  }): Promise<SupportTicket> {
    const response = await api.put(`/master-admin/support-requests/${encodeURIComponent(ticketId)}`, payload);
    return response.data?.request;
  }

  static async deleteSupportRequest(ticketId: string): Promise<void> {
    await api.delete(`/master-admin/support-requests/${encodeURIComponent(ticketId)}`);
  }
}
