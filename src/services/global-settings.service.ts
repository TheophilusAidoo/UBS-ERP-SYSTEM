import { supabase } from './supabase';

export interface GlobalSetting {
  key: string;
  value: string | null;
}

class GlobalSettingsService {
  /**
   * Get a single setting value by key
   */
  async getSetting(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        console.error(`Error fetching setting ${key}:`, error);
        return null;
      }

      return data?.value || null;
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Get all global settings as a key-value map
   */
  async getAllSettings(): Promise<Record<string, string | null>> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('key, value');

      if (error) {
        console.error('Error fetching all settings:', error);
        return {};
      }

      const settings: Record<string, string | null> = {};
      (data || []).forEach((item) => {
        settings[item.key] = item.value;
      });

      return settings;
    } catch (error) {
      console.error('Error fetching all settings:', error);
      return {};
    }
  }

  /**
   * Set a single setting value (admin only)
   */
  async setSetting(key: string, value: string | null): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .upsert(
          { key, value },
          { onConflict: 'key' }
        )
        .select()
        .single();

      if (error) {
        console.error(`Error setting ${key}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Set multiple settings at once (admin only)
   */
  async setSettings(settings: Record<string, string | null>): Promise<boolean> {
    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
      }));

      const { error } = await supabase
        .from('global_settings')
        .upsert(settingsArray, { onConflict: 'key' });

      if (error) {
        console.error('Error setting multiple settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error setting multiple settings:', error);
      return false;
    }
  }
}

export const globalSettingsService = new GlobalSettingsService();


