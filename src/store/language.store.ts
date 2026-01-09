import { create } from 'zustand';
import { Language } from '../types';
import { DEFAULT_LANGUAGE, LANGUAGES } from '../constants';
import i18n from '../i18n';

interface LanguageState {
  currentLanguage: Language;
  isRTL: boolean;
  setLanguage: (language: Language, userId?: string) => Promise<void>;
  initializeLanguage: (userId?: string) => Promise<void>;
  getLanguageKey: (userId?: string) => string;
}

// Helper function to get user-specific language key
const getLanguageKey = (userId?: string): string => {
  if (userId) {
    return `ubs_erp_language_${userId}`;
  }
  // Fallback to global key if no user ID (e.g., login page)
  return 'ubs_erp_language';
};

export const useLanguageStore = create<LanguageState>((set, get) => ({
  currentLanguage: DEFAULT_LANGUAGE,
  isRTL: false,

  getLanguageKey: (userId?: string) => getLanguageKey(userId),

  setLanguage: async (language: Language, userId?: string) => {
    // Change i18n language first
    await i18n.changeLanguage(language);
    
    const languageConfig = LANGUAGES.find((l) => l.code === language);
    
    // Store language preference per user
    if (userId) {
      localStorage.setItem(getLanguageKey(userId), language);
      // Also update global key as fallback
      localStorage.setItem('ubs_erp_language', language);
    } else {
      // For login page or when user is not logged in
      localStorage.setItem('ubs_erp_language', language);
    }
    
    // Update document direction for RTL
    if (languageConfig?.rtl) {
      document.documentElement.dir = 'rtl';
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.setAttribute('lang', language);
    }
    
    // Update state to trigger re-renders
    set({
      currentLanguage: language,
      isRTL: languageConfig?.rtl || false,
    });
    
    // Force a small delay to ensure all components re-render
    await new Promise(resolve => setTimeout(resolve, 50));
  },

  initializeLanguage: async (userId?: string) => {
    try {
      // Try to get user-specific language first
      let storedLanguage: Language = DEFAULT_LANGUAGE;
      
      if (userId) {
        const userLanguage = localStorage.getItem(getLanguageKey(userId)) as Language;
        if (userLanguage && LANGUAGES.some(l => l.code === userLanguage)) {
          storedLanguage = userLanguage;
        } else {
          // Fallback to global language if user-specific not found
          const globalLanguage = localStorage.getItem('ubs_erp_language') as Language;
          if (globalLanguage && LANGUAGES.some(l => l.code === globalLanguage)) {
            storedLanguage = globalLanguage;
            // Save it as user-specific preference
            localStorage.setItem(getLanguageKey(userId), storedLanguage);
          }
        }
      } else {
        // No user ID (e.g., on login page)
        const globalLanguage = localStorage.getItem('ubs_erp_language') as Language;
        if (globalLanguage && LANGUAGES.some(l => l.code === globalLanguage)) {
          storedLanguage = globalLanguage;
        }
      }
      
      await i18n.changeLanguage(storedLanguage);
      const languageConfig = LANGUAGES.find((l) => l.code === storedLanguage);
      set({
        currentLanguage: storedLanguage,
        isRTL: languageConfig?.rtl || false,
      });
      // Update document direction for RTL
      if (languageConfig?.rtl) {
        document.documentElement.dir = 'rtl';
        document.documentElement.setAttribute('lang', 'ar');
      } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.setAttribute('lang', storedLanguage);
      }
    } catch (error) {
      console.error('Error initializing language:', error);
      set({
        currentLanguage: DEFAULT_LANGUAGE,
        isRTL: false,
      });
    }
  },
}));
