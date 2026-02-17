import { supabase } from "@/libs/supabase";
import { Notification } from "../types/types";

export class NotificationAPI {
    static async getUserNotifications(): Promise<Notification[]> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching notifications:", error);
            throw error;
        }

        return data as Notification[];
    }

    static async markAsRead(id: string): Promise<void> {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) {
            console.error("Error marking notification as read:", error);
            throw error;
        }
    }

    static async markAllAsRead(): Promise<void> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', session.user.id);

        if (error) {
            console.error("Error marking all notifications as read:", error);
            throw error;
        }
    }
}
