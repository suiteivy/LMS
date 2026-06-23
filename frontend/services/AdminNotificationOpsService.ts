import { api } from './api';

export type DeliveryStatus = 'retry_scheduled' | 'delivered' | 'failed';

export interface NotificationDeliveryAttempt {
  id: string;
  notification_id: string | null;
  recipient_user_id: string | null;
  title: string;
  message: string;
  status: DeliveryStatus;
  attempt_number: number;
  max_retries: number;
  error_message: string | null;
  next_retry_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export const AdminNotificationOpsAPI = {
  getDeliveryAttempts: async (status?: DeliveryStatus, limit = 100): Promise<NotificationDeliveryAttempt[]> => {
    const res = await api.get('/notifications/delivery-attempts', {
      params: {
        ...(status ? { status } : {}),
        limit,
      },
    });
    return res.data?.data || [];
  },

  runRetryNow: async (limit = 50): Promise<{ processed: number; delivered: number; failed: number }> => {
    const res = await api.post('/notifications/retry-now', { limit });
    return res.data?.data || { processed: 0, delivered: 0, failed: 0 };
  },
};
