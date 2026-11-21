// frontend/services/DocumentsService.ts
import { api } from './api';

export interface PublishedDocument {
  id: string;
  title: string;
  description?: string | null;
  category: 'circular' | 'timetable' | 'form' | 'policy' | 'fee_structure' | 'report' | 'newsletter' | 'other';
  storage_path: string;
  file_name: string;
  file_size?: number | null;
  mime_type: string;
  is_pinned: boolean;
  published_at: string;
  version_label: string;
  signed_url?: string | null;
  delivery_id?: string;
  delivered_at?: string;
  viewed_at?: string | null;
  downloaded_at?: string | null;
  is_read?: boolean;
  student_id?: string | null;
  student_name?: string | null;
  student_admission?: string | null;
}

export interface DocumentTrackingStats {
  total_delivered: number;
  total_viewed: number;
  total_downloaded: number;
  total_unread: number;
  view_rate_percent: number;
}

export interface DocumentRecipient {
  delivery_id: string;
  recipient_name: string;
  recipient_email?: string;
  role?: string;
  student_name?: string | null;
  admission_number?: string | null;
  viewed_at?: string | null;
  downloaded_at?: string | null;
  is_unread: boolean;
}

export const DocumentsService = {
  /**
   * Get documents delivered to the authenticated user (Parent, Student, Staff)
   */
  async getDeliveredDocuments(params?: {
    category?: string;
    search?: string;
    student_id?: string;
    unread_only?: boolean;
  }): Promise<PublishedDocument[]> {
    const res = await api.get('/documents/delivered', {
      params: {
        category: params?.category,
        search: params?.search,
        student_id: params?.student_id,
        unread_only: params?.unread_only ? 'true' : undefined
      }
    });
    return res.data || [];
  },

  /**
   * Mark a document as viewed or downloaded
   */
  async recordInteraction(documentId: string, action: 'view' | 'download' = 'view'): Promise<void> {
    try {
      await api.post(`/documents/${encodeURIComponent(documentId)}/interaction`, { action });
    } catch (e) {
      console.warn('recordInteraction warning:', e);
    }
  },

  /**
   * Admin: Publish a new document to targeted audiences
   */
  async publishDocument(payload: {
    title: string;
    description?: string;
    category?: string;
    storage_path: string;
    file_name: string;
    file_size?: number;
    mime_type?: string;
    is_pinned?: boolean;
    expires_at?: string | null;
    auto_deliver_new_students?: boolean;
    audiences: Array<{ audience_type: 'institution' | 'level' | 'class' | 'student' | 'staff' | 'parent'; audience_id?: string | null }>;
  }): Promise<any> {
    const res = await api.post('/documents/publish', payload);
    return res.data;
  },

  /**
   * Admin: Track document delivery statistics and recipient view log
   */
  async getDocumentTracking(documentId: string): Promise<{
    document: PublishedDocument;
    stats: DocumentTrackingStats;
    recipients: DocumentRecipient[];
  }> {
    const res = await api.get(`/documents/${encodeURIComponent(documentId)}/tracking`);
    return res.data;
  },

  /**
   * Admin: Withdraw or archive a published document
   */
  async withdrawDocument(documentId: string): Promise<any> {
    const res = await api.post(`/documents/${encodeURIComponent(documentId)}/withdraw`);
    return res.data;
  },

  /**
   * Admin: Send reminder notifications to all unviewed recipients
   */
  async remindUnopened(documentId: string): Promise<{ success: boolean; reminded_count: number }> {
    const res = await api.post(`/documents/${encodeURIComponent(documentId)}/remind`);
    return res.data;
  },

  async sendReminders(documentId: string): Promise<{ success: boolean; reminded_count: number }> {
    return this.remindUnopened(documentId);
  }
};
