import { api } from "./api";

export class MessageService {
    static async getMessages(type: 'inbox' | 'sent' = 'inbox') {
        const response = await api.get('/messages', { params: { type } });
        return response.data;
    }

    static async sendMessage(receiver_id: string, content: string, subject?: string) {
        const response = await api.post('/messages/send', { receiver_id, content, subject });
        return response.data;
    }

    static async markAsRead(id: string) {
        const response = await api.put(`/messages/${id}/read`);
        return response.data;
    }

    static async searchUsers(query: string, role?: string) {
        const response = await api.get('/auth/search-users', { params: { q: query, role } });
        return response.data;
    }
}
