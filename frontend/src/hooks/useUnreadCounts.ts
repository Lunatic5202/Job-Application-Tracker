import { useEffect, useState } from 'react';
import { CareerNotification } from '../api/notificationApi';
import { ChatConversation } from '../api/chatWebSocket';

export const NOTIFICATIONS_STORAGE_KEY = 'careerx_notifications_v2';
export const MESSAGES_STORAGE_KEY = 'careerx_chat_conversations_v2';
export const UNREAD_STATE_EVENT = 'careerx-unread-state-changed';

function readStored<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export function emitUnreadStateChange() {
  window.dispatchEvent(new Event(UNREAD_STATE_EVENT));
}

function getUnreadCounts() {
  const notifications = readStored<CareerNotification[]>(NOTIFICATIONS_STORAGE_KEY, []);
  const conversations = readStored<ChatConversation[]>(MESSAGES_STORAGE_KEY, []);

  return {
    notifications: notifications.filter((notification) => !notification.isRead).length,
    messages: conversations.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0),
  };
}

export function useUnreadCounts() {
  const [counts, setCounts] = useState(getUnreadCounts);

  useEffect(() => {
    const refresh = () => setCounts(getUnreadCounts());
    window.addEventListener('storage', refresh);
    window.addEventListener(UNREAD_STATE_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(UNREAD_STATE_EVENT, refresh);
    };
  }, []);

  return counts;
}