import { create } from 'zustand';
import type { ThemeMode, PrimaryColor } from './theme.store';
import { globalSettingsService } from '../services/global-settings.service';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'SAR' | 'AED' | 'EGP' | 'JPY' | 'CNY' | 'XAF' | 'GHS';

interface GlobalSettings {
  // Currency Settings
  currency: Currency;
  currencySymbol: string;
  exchangeRates: Record<string, number> | null;
  
  // Leave Settings
  defaultAnnualLeave: number;
  defaultSickLeave: number;
  defaultEmergencyLeave: number;
  
  // Login Page Customization
  loginBackgroundColor: string;
  loginBackgroundImage: string | null;
  loginLogo: string | null;
  
  // Sidebar Customization
  sidebarColor: string;
  sidebarLogo: string | null;
  
  // Favicon Customization
  favicon: string | null;
  
  // Theme Settings (admin changes apply to all)
  themeMode: ThemeMode;
  primaryColor: PrimaryColor;
  
  // Loading state
  isLoading: boolean;
  
  // Actions
  setCurrency: (currency: Currency) => Promise<void>;
  setCurrencySymbol: (symbol: string) => Promise<void>;
  setExchangeRates: (rates: Record<string, number>) => void;
  getCurrencyName: (currency: Currency) => string;
  getCurrencySymbol: (currency: Currency) => string;
  setLeaveSettings: (annual: number, sick: number, emergency: number) => Promise<void>;
  setLoginBackground: (color: string, image: string | null) => Promise<void>;
  setLoginLogo: (logo: string | null) => Promise<void>;
  setSidebarColor: (color: string) => Promise<void>;
  setSidebarLogo: (logo: string | null) => Promise<void>;
  setFavicon: (favicon: string | null) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setPrimaryColor: (color: PrimaryColor) => Promise<void>;
  initializeSettings: () => Promise<void>;
}

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  SAR: '﷼',
  AED: 'د.إ',
  EGP: 'E£',
  JPY: '¥',
  CNY: '¥',
  XAF: 'FCFA',
  GHS: '₵',
};

const currencyNames: Record<Currency, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  SAR: 'Saudi Riyal',
  AED: 'UAE Dirham',
  EGP: 'Egyptian Pound',
  JPY: 'Japanese Yen',
  CNY: 'Chinese Yuan',
  XAF: 'Central African CFA Franc',
  GHS: 'Ghana Cedi',
};

// Helper to parse setting value
const parseSetting = (key: string, value: string | null, defaultValue: any): any => {
  if (value === null || value === undefined) return defaultValue;
  
  // Parse based on expected type
  if (key.includes('Leave') || key === 'defaultAnnualLeave' || key === 'defaultSickLeave' || key === 'defaultEmergencyLeave') {
    return parseInt(value, 10) || defaultValue;
  }
  
  if (value === 'null' || value === '') return null;
  
  return value;
};

// Helper to safely store in localStorage with quota checking
const safeSetItem = (key: string, value: string): boolean => {
  try {
    // Check if value is too large (localStorage limit is typically 5-10MB)
    // If value is larger than 1MB, skip caching to prevent quota issues
    const sizeInBytes = new Blob([value]).size;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    if (sizeInMB > 1) {
      console.warn(`⚠️ Skipping cache for ${key}: value too large (${sizeInMB.toFixed(2)}MB)`);
      return false;
    }
    
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      console.warn(`⚠️ Storage quota exceeded for ${key}. Attempting to clear old cache...`);
      
      // Try to clear old cache entries
      try {
        const keysToRemove = [
          'ubs_erp_global_settings_cache',
          'ubs_erp_global_settings_cache_timestamp',
        ];
        
        keysToRemove.forEach(k => {
          if (k !== key) {
            localStorage.removeItem(k);
          }
        });
        
        // Retry storing
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error(`❌ Failed to store ${key} after clearing cache:`, retryError);
        return false;
      }
    }
    console.error(`❌ Error storing ${key}:`, error);
    return false;
  }
};

// Helper to create a cache-safe version of settings (exclude large image data)
const createCacheSafeSettings = (settings: Record<string, string | null>): Record<string, string | null> => {
  const cacheSafe: Record<string, string | null> = {};
  const imageKeys = ['login_background_image', 'login_logo', 'sidebar_logo', 'favicon'];
  
  Object.entries(settings).forEach(([key, value]) => {
    // Skip large image data from cache
    if (imageKeys.includes(key) && value && value.length > 10000) {
      // Only skip if it's a large base64 string
      if (value.startsWith('data:image') || value.length > 50000) {
        return; // Skip this key
      }
    }
    cacheSafe[key] = value;
  });
  
  return cacheSafe;
};

const initialState = {
  currency: 'USD' as Currency,
  currencySymbol: '$',
  exchangeRates: null as Record<string, number> | null,
  defaultAnnualLeave: 20,
  defaultSickLeave: 10,
  defaultEmergencyLeave: 5,
  loginBackgroundColor: '#2563eb',
  loginBackgroundImage: null as string | null,
  loginLogo: null as string | null,
  sidebarColor: '#ffffff',
  sidebarLogo: null as string | null,
  favicon: null as string | null,
  themeMode: 'light' as ThemeMode,
  primaryColor: 'blue' as PrimaryColor,
  isLoading: false,
};

export const useGlobalSettingsStore = create<GlobalSettings>((set) => ({
  ...initialState,
  
  initializeSettings: async () => {
    try {
      // Check cache first (5 minute cache for faster loading)
      const cacheKey = 'ubs_erp_global_settings_cache';
      const cacheTimestampKey = 'ubs_erp_global_settings_cache_timestamp';
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
      
      let cachedTimestamp: string | null = null;
      let cachedSettings: string | null = null;
      
      try {
        cachedTimestamp = localStorage.getItem(cacheTimestampKey);
        cachedSettings = localStorage.getItem(cacheKey);
      } catch (e) {
        // Storage read error, continue to fetch fresh
        console.warn('⚠️ Could not read cache, fetching fresh settings');
      }
      
      if (cachedSettings && cachedTimestamp) {
        const age = Date.now() - parseInt(cachedTimestamp, 10);
        if (age < CACHE_DURATION) {
          // Use cached settings for instant load
          try {
            const settings = JSON.parse(cachedSettings);
            set({
              currency: (parseSetting('currency', settings.currency, 'USD') as Currency),
              currencySymbol: parseSetting('currency_symbol', settings.currency_symbol, '$'),
              defaultAnnualLeave: parseSetting('default_annual_leave', settings.default_annual_leave, 20),
              defaultSickLeave: parseSetting('default_sick_leave', settings.default_sick_leave, 10),
              defaultEmergencyLeave: parseSetting('default_emergency_leave', settings.default_emergency_leave, 5),
              loginBackgroundColor: parseSetting('login_background_color', settings.login_background_color, '#2563eb'),
              loginBackgroundImage: parseSetting('login_background_image', settings.login_background_image, null),
              loginLogo: parseSetting('login_logo', settings.login_logo, null),
              sidebarColor: parseSetting('sidebar_color', settings.sidebar_color, '#ffffff'),
              sidebarLogo: parseSetting('sidebar_logo', settings.sidebar_logo, null),
              favicon: parseSetting('favicon', settings.favicon, null),
              themeMode: (parseSetting('theme_mode', settings.theme_mode, 'light') as ThemeMode),
              primaryColor: (parseSetting('primary_color', settings.primary_color, 'blue') as PrimaryColor),
              isLoading: false,
            });
            // Refresh in background without blocking UI
            globalSettingsService.getAllSettings().then(settings => {
              if (Object.keys(settings).length > 0) {
                // Use cache-safe version and safe storage
                const cacheSafe = createCacheSafeSettings(settings);
                const cacheData = JSON.stringify(cacheSafe);
                safeSetItem(cacheKey, cacheData);
                safeSetItem(cacheTimestampKey, Date.now().toString());
                
                set({
                  currency: (parseSetting('currency', settings.currency, 'USD') as Currency),
                  currencySymbol: parseSetting('currency_symbol', settings.currency_symbol, '$'),
                  defaultAnnualLeave: parseSetting('default_annual_leave', settings.default_annual_leave, 20),
                  defaultSickLeave: parseSetting('default_sick_leave', settings.default_sick_leave, 10),
                  defaultEmergencyLeave: parseSetting('default_emergency_leave', settings.default_emergency_leave, 5),
                  loginBackgroundColor: parseSetting('login_background_color', settings.login_background_color, '#2563eb'),
                  loginBackgroundImage: parseSetting('login_background_image', settings.login_background_image, null),
                  loginLogo: parseSetting('login_logo', settings.login_logo, null),
                  sidebarColor: parseSetting('sidebar_color', settings.sidebar_color, '#ffffff'),
                  sidebarLogo: parseSetting('sidebar_logo', settings.sidebar_logo, null),
                  favicon: parseSetting('favicon', settings.favicon, null),
                  themeMode: (parseSetting('theme_mode', settings.theme_mode, 'light') as ThemeMode),
                  primaryColor: (parseSetting('primary_color', settings.primary_color, 'blue') as PrimaryColor),
                });
              }
            }).catch(() => {
              // Silently fail background refresh
            });
            return;
          } catch (e) {
            // Cache parse error, continue to fetch fresh
            console.warn('⚠️ Cache parse error, fetching fresh settings');
          }
        }
      }
      
      set({ isLoading: true });
      const settings = await globalSettingsService.getAllSettings();
      
      if (Object.keys(settings).length > 0) {
        // Use cache-safe version and safe storage
        const cacheSafe = createCacheSafeSettings(settings);
        const cacheData = JSON.stringify(cacheSafe);
        safeSetItem(cacheKey, cacheData);
        safeSetItem(cacheTimestampKey, Date.now().toString());
        
        set({
          currency: (parseSetting('currency', settings.currency, 'USD') as Currency),
          currencySymbol: parseSetting('currency_symbol', settings.currency_symbol, '$'),
          defaultAnnualLeave: parseSetting('default_annual_leave', settings.default_annual_leave, 20),
          defaultSickLeave: parseSetting('default_sick_leave', settings.default_sick_leave, 10),
          defaultEmergencyLeave: parseSetting('default_emergency_leave', settings.default_emergency_leave, 5),
          loginBackgroundColor: parseSetting('login_background_color', settings.login_background_color, '#2563eb'),
          loginBackgroundImage: parseSetting('login_background_image', settings.login_background_image, null),
          loginLogo: parseSetting('login_logo', settings.login_logo, null),
          sidebarColor: parseSetting('sidebar_color', settings.sidebar_color, '#ffffff'),
          sidebarLogo: parseSetting('sidebar_logo', settings.sidebar_logo, null),
          favicon: parseSetting('favicon', settings.favicon, null),
          themeMode: (parseSetting('theme_mode', settings.theme_mode, 'light') as ThemeMode),
          primaryColor: (parseSetting('primary_color', settings.primary_color, 'blue') as PrimaryColor),
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error initializing global settings:', error);
      set({ isLoading: false });
    }
  },
  
  setCurrency: async (currency: Currency) => {
    const symbol = currencySymbols[currency];
    set({ currency, currencySymbol: symbol });
    await globalSettingsService.setSettings({
      currency,
      currency_symbol: symbol,
    });
  },
  
  setCurrencySymbol: async (currencySymbol: string) => {
    set({ currencySymbol });
    await globalSettingsService.setSetting('currency_symbol', currencySymbol);
  },
  
  setLeaveSettings: async (defaultAnnualLeave: number, defaultSickLeave: number, defaultEmergencyLeave: number) => {
    set({ defaultAnnualLeave, defaultSickLeave, defaultEmergencyLeave });
    await globalSettingsService.setSettings({
      default_annual_leave: defaultAnnualLeave.toString(),
      default_sick_leave: defaultSickLeave.toString(),
      default_emergency_leave: defaultEmergencyLeave.toString(),
    });
  },
  
  setLoginBackground: async (loginBackgroundColor: string, loginBackgroundImage: string | null) => {
    set({ loginBackgroundColor, loginBackgroundImage });
    await globalSettingsService.setSettings({
      login_background_color: loginBackgroundColor,
      login_background_image: loginBackgroundImage,
    });
  },
  
  setLoginLogo: async (loginLogo: string | null) => {
    set({ loginLogo });
    await globalSettingsService.setSetting('login_logo', loginLogo);
  },
  
  setSidebarColor: async (sidebarColor: string) => {
    set({ sidebarColor });
    await globalSettingsService.setSetting('sidebar_color', sidebarColor);
  },
  
  setSidebarLogo: async (sidebarLogo: string | null) => {
    set({ sidebarLogo });
    await globalSettingsService.setSetting('sidebar_logo', sidebarLogo);
  },
  
  setFavicon: async (favicon: string | null) => {
    set({ favicon });
    await globalSettingsService.setSetting('favicon', favicon);
    // The favicon will be updated automatically by the useEffect in App.tsx
  },
  
  setThemeMode: async (themeMode: ThemeMode) => {
    set({ themeMode });
    await globalSettingsService.setSetting('theme_mode', themeMode);
  },
  
  setPrimaryColor: async (primaryColor: PrimaryColor) => {
    set({ primaryColor });
    await globalSettingsService.setSetting('primary_color', primaryColor);
  },
  
  setExchangeRates: (exchangeRates: Record<string, number>) => {
    set({ exchangeRates });
  },
  
  getCurrencyName: (currency: Currency) => {
    return currencyNames[currency] || currency;
  },
  
  getCurrencySymbol: (currency: Currency) => {
    return currencySymbols[currency] || currency;
  },
}));

