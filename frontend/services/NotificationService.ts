import { api } from "./api"; // Assuming a configured axios instance exists
import { Notification } from "../types/types";

export class NotificationAPI {
    static async getUserNotifications(): Promise<Notification[]> {
        const response = await api.get<Notification[]>("/notifications");
        return response.data;
    }

    static async markAsRead(id: string): Promise<void> {
        await api.put(`/notifications/${id}/read`);
    }

    static async markAllAsRead(): Promise<void> {
        await api.put("/notifications/read-all");
    }
}
