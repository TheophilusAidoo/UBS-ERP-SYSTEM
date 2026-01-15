import { supabase } from './supabase';

export interface UserPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  leaveRequestAlerts: boolean;
  invoiceUpdates: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPreferencesData {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  leaveRequestAlerts?: boolean;
  invoiceUpdates?: boolean;
}

class UserPreferencesService {
  /**
   * Get user preferences for the current user
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no preferences exist, create default ones
        if (error.code === 'PGRST116') {
          return await this.createDefaultPreferences(userId);
        }
        console.error('Error fetching user preferences:', error);
        return null;
      }

      if (!data) {
        return await this.createDefaultPreferences(userId);
      }

      return {
        id: data.id,
        userId: data.user_id,
        emailNotifications: data.email_notifications ?? true,
        pushNotifications: data.push_notifications ?? true,
        leaveRequestAlerts: data.leave_request_alerts ?? true,
        invoiceUpdates: data.invoice_updates ?? true,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }
  }

  /**
   * Create default preferences for a user
   */
  async createDefaultPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          email_notifications: true,
          push_notifications: true,
          leave_request_alerts: true,
          invoice_updates: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating default preferences:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        emailNotifications: data.email_notifications ?? true,
        pushNotifications: data.push_notifications ?? true,
        leaveRequestAlerts: data.leave_request_alerts ?? true,
        invoiceUpdates: data.invoice_updates ?? true,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error creating default preferences:', error);
      return null;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: UpdateUserPreferencesData): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (preferences.emailNotifications !== undefined) {
        updateData.email_notifications = preferences.emailNotifications;
      }
      if (preferences.pushNotifications !== undefined) {
        updateData.push_notifications = preferences.pushNotifications;
      }
      if (preferences.leaveRequestAlerts !== undefined) {
        updateData.leave_request_alerts = preferences.leaveRequestAlerts;
      }
      if (preferences.invoiceUpdates !== undefined) {
        updateData.invoice_updates = preferences.invoiceUpdates;
      }

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...updateData,
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error updating user preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }
  }

  /**
   * Check if a specific notification type is enabled for a user
   */
  async isNotificationEnabled(userId: string, type: 'email' | 'push' | 'leave' | 'invoice'): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) return true; // Default to enabled if preferences don't exist

      switch (type) {
        case 'email':
          return preferences.emailNotifications;
        case 'push':
          return preferences.pushNotifications;
        case 'leave':
          return preferences.leaveRequestAlerts;
        case 'invoice':
          return preferences.invoiceUpdates;
        default:
          return true;
      }
    } catch (error) {
      console.error('Error checking notification preference:', error);
      return true; // Default to enabled on error
    }
  }
}

export const userPreferencesService = new UserPreferencesService();
