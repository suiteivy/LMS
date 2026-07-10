import { api } from "./api";
import { Notification } from "../types/types";

export class NotificationAPI {
    static async getUserNotifications(): Promise<Notification[]> {
        const response = await api.get('/notifications', { skipErrorToast: true, skipErrorLog: true });
        return response.data;
    }

    static async markAsRead(id: string): Promise<void> {
        await api.put(`/notifications/${id}/read`, undefined, { skipErrorToast: true, skipErrorLog: true });
    }

    static async markAllAsRead(): Promise<void> {
        await api.put('/notifications/read-all', undefined, { skipErrorToast: true, skipErrorLog: true });
    }

    static async deleteNotification(id: string): Promise<void> {
        await api.delete(`/notifications/${id}`, { skipErrorToast: true, skipErrorLog: true });
    }

    static async clearAll(): Promise<void> {
        await api.delete('/notifications', { skipErrorToast: true, skipErrorLog: true });
    }
}
