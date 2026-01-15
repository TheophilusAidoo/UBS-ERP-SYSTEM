import { supabase } from './supabase';
import { userPreferencesService } from './user-preferences.service';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: string;
}

export interface CreateNotificationData {
  userId: string;
  type: 'leave' | 'invoice' | 'message' | 'system' | 'other';
  title: string;
  message: string;
  relatedId?: string;
}

class NotificationService {
  /**
   * Create a notification in the database and show it if preferences allow
   */
  async createNotification(data: CreateNotificationData): Promise<Notification | null> {
    try {
      // Check user preferences before creating notification
      const pushEnabled = await userPreferencesService.isNotificationEnabled(data.userId, 'push');
      const emailEnabled = await userPreferencesService.isNotificationEnabled(data.userId, 'email');
      
      // Determine if we should create the notification based on type
      let shouldCreate = true;
      if (data.type === 'leave') {
        const leaveEnabled = await userPreferencesService.isNotificationEnabled(data.userId, 'leave');
        shouldCreate = leaveEnabled;
      } else if (data.type === 'invoice') {
        const invoiceEnabled = await userPreferencesService.isNotificationEnabled(data.userId, 'invoice');
        shouldCreate = invoiceEnabled;
      }

      if (!shouldCreate) {
        console.log(`Notification skipped for user ${data.userId} - preferences disabled for type ${data.type}`);
        return null;
      }

      // Create notification in database
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          related_id: data.relatedId || null,
          is_read: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      // Show browser notification if push notifications are enabled
      if (pushEnabled && typeof window !== 'undefined') {
        try {
          // Dynamically import to avoid circular dependency
          const { useNotificationStore } = await import('../store/notification.store');
          const notificationStore = useNotificationStore.getState();
          notificationStore.showNotification(data.title, data.message, undefined, 'push');
        } catch (err) {
          console.warn('Failed to show browser notification:', err);
        }
      }

      // Send email notification if email notifications are enabled
      if (emailEnabled && data.type !== 'message') {
        // Email notifications would be handled by email service
        // This is a placeholder for future email notification implementation
        console.log(`Email notification would be sent for: ${data.title}`);
      }

      return {
        id: notification.id,
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.is_read,
        relatedId: notification.related_id,
        createdAt: notification.created_at,
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return (data || []).map((n) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.is_read,
        relatedId: n.related_id,
        createdAt: n.created_at,
      }));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

export const notificationService = new NotificationService();
