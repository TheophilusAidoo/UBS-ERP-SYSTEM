import { create } from 'zustand';
import { messageService } from '../services/message.service';
import { useAuthStore } from './auth.store';

interface NotificationState {
  unreadCount: number;
  isRinging: boolean;
  notificationPermission: NotificationPermission;
  setUnreadCount: (count: number) => void;
  checkUnreadMessages: (userId: string) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  showNotification: (title: string, body: string, onClick?: () => void) => void;
  startRinging: () => void;
  stopRinging: () => void;
  initializeNotifications: (userId: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  isRinging: false,
  notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'default' as NotificationPermission,

  setUnreadCount: (count: number) => {
    const prevCount = get().unreadCount;
    set({ unreadCount: count });
    
    // Start ringing if count increased
    if (count > prevCount && count > 0) {
      get().startRinging();
    }
    
    // Stop ringing if no unread messages
    if (count === 0) {
      get().stopRinging();
    }
  },

  checkUnreadMessages: async (userId: string) => {
    try {
      const conversations = await messageService.getConversations(userId);
      const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
      get().setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error checking unread messages:', error);
    }
  },

  requestNotificationPermission: async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') {
      console.warn('Notifications are not supported in this browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      set({ notificationPermission: 'granted' });
      return true;
    }

    if (Notification.permission === 'denied') {
      set({ notificationPermission: 'denied' });
      return false;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    set({ notificationPermission: permission });
    return permission === 'granted';
  },

  showNotification: (title: string, body: string, onClick?: () => void) => {
    if (typeof Notification === 'undefined') return;
    
    if (get().notificationPermission !== 'granted') {
      get().requestNotificationPermission().then((granted) => {
        if (granted) {
          get().showNotification(title, body, onClick);
        }
      });
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'ubs-message', // Same tag to replace previous notifications
      requireInteraction: true, // Keep notification until user interacts
    });

    if (onClick) {
      notification.onclick = () => {
        onClick();
        window.focus();
        notification.close();
      };
    }

    // Auto-close after 10 seconds if not clicked
    setTimeout(() => {
      notification.close();
    }, 10000);
  },

  startRinging: () => {
    set({ isRinging: true });
  },

  stopRinging: () => {
    set({ isRinging: false });
  },

  initializeNotifications: async (userId: string) => {
    // Request permission on initialization
    await get().requestNotificationPermission();
    
    // Check unread messages
    await get().checkUnreadMessages(userId);
  },
}));

