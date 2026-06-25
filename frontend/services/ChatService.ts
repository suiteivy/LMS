import { api } from "./api";

export type ConversationSummary = {
  id: string;
  type: "DIRECT" | "GROUP";
  institution_id: string;
  created_at: string;
  last_message_at?: string | null;
  expires_at?: string | null;
  last_read_at?: string | null;
  last_delivered_at?: string | null;
  unread_count: number;
  partner_last_read_at?: string | null;
  partner_last_delivered_at?: string | null;
  partner?: {
    id: string;
    full_name?: string;
    avatar_url?: string | null;
    role?: string;
  } | null;
  last_message?: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    edited_at?: string | null;
    deleted_for_everyone_at?: string | null;
    hidden_for_user_ids?: string[];
    is_deleted_for_everyone?: boolean;
  } | null;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at?: string | null;
  deleted_for_everyone_at?: string | null;
  hidden_for_user_ids?: string[];
  is_deleted_for_everyone?: boolean;
  client_request_id?: string | null;
  local_status?: "pending" | "failed";
};

export class ChatService {
  static async startConversation(otherUserId: string) {
    const response = await api.post("/messages/conversations/start", { otherUserId });
    return response.data;
  }

  static async listConversations() {
    const response = await api.get<ConversationSummary[]>("/messages/conversations");
    return response.data;
  }

  static async listMessages(conversationId: string, cursor?: string, limit = 30) {
    const response = await api.get<{ messages: ChatMessage[]; hasMore: boolean; nextCursor: string | null }>(
      `/messages/conversations/${conversationId}/messages`,
      {
        params: {
          ...(cursor ? { cursor } : {}),
          limit,
        },
      }
    );
    return response.data;
  }

  static async sendMessage(conversationId: string, content: string, clientRequestId?: string) {
    const response = await api.post<ChatMessage>(`/messages/conversations/${conversationId}/messages`, {
      content,
      ...(clientRequestId ? { clientRequestId } : {}),
    });
    return response.data;
  }

  static async editMessage(messageId: string, content: string) {
    const response = await api.put<ChatMessage>(`/messages/message/${messageId}`, { content });
    return response.data;
  }

  static async deleteMessageForMe(messageId: string) {
    const response = await api.post(`/messages/message/${messageId}/delete-for-me`);
    return response.data;
  }

  static async deleteMessageForEveryone(messageId: string) {
    const response = await api.post(`/messages/message/${messageId}/delete-for-everyone`);
    return response.data;
  }

  static async deleteConversation(conversationId: string) {
    const response = await api.delete(`/messages/conversations/${conversationId}`);
    return response.data;
  }

  static async clearConversationForMe(conversationId: string) {
    const response = await api.post(`/messages/conversations/${conversationId}/clear-for-me`);
    return response.data;
  }

  static async markConversationRead(conversationId: string) {
    const response = await api.put(`/messages/conversations/${conversationId}/read`);
    return response.data;
  }

  static async acknowledgeDelivery(conversationId: string) {
    const response = await api.put(`/messages/conversations/${conversationId}/delivered`);
    return response.data;
  }
}
