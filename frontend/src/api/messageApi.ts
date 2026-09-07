import { apiClient } from './client';
import { ChatConversation, ChatMessage } from './chatWebSocket';
import { emitUnreadStateChange } from '../hooks/useUnreadCounts';

export const messageApi = {
  /**
   * Fetch all active recruiter and peer conversations
   */
  getConversations: async (): Promise<ChatConversation[]> => {
    const res = await apiClient.get<ChatConversation[]>('/messages/conversations');
    return res.data;
  },

  /**
   * Fetch conversation metadata by ID
   */
  getConversationById: async (conversationId: string): Promise<ChatConversation | null> => {
    const res = await apiClient.get<ChatConversation>(`/messages/conversations/${conversationId}`);
    return res.data;
  },

  /**
   * Fetch message history for a specific conversation thread
   */
  getMessages: async (conversationId: string): Promise<ChatMessage[]> => {
    const res = await apiClient.get<ChatMessage[]>(`/messages/conversations/${conversationId}/messages`);
    return res.data;
  },

  /**
   * Send a direct message with optional attachment
   */
  sendMessage: async (
    conversationId: string,
    content: string,
    attachment?: { name: string; size: string }
  ): Promise<ChatMessage> => {
    const res = await apiClient.post<ChatMessage>(`/messages/conversations/${conversationId}/send`, {
      content,
      attachment,
    });
    return res.data;
  },

  /**
   * Mark all unread messages in thread as read
   */
  markAsRead: async (conversationId: string): Promise<{ success: boolean }> => {
    const res = await apiClient.post<{ success: boolean }>(`/messages/conversations/${conversationId}/read`);
    emitUnreadStateChange();
    return res.data;
  },
};

export default messageApi;
