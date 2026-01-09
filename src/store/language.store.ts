import { create } from 'zustand';
import { Language } from '../types';
import { DEFAULT_LANGUAGE, LANGUAGES } from '../constants';
import i18n from '../i18n';

interface LanguageState {
  currentLanguage: Language;
  isRTL: boolean;
  setLanguage: (language: Language) => Promise<void>;
  initializeLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  currentLanguage: DEFAULT_LANGUAGE,
  isRTL: false,

  setLanguage: async (language: Language) => {
    // Change i18n language first
    await i18n.changeLanguage(language);
    
    const languageConfig = LANGUAGES.find((l) => l.code === language);
    localStorage.setItem('ubs_erp_language', language);
    
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

  initializeLanguage: async () => {
    try {
      const storedLanguage = (localStorage.getItem('ubs_erp_language') as Language) || DEFAULT_LANGUAGE;
      await i18n.changeLanguage(storedLanguage);
      const languageConfig = LANGUAGES.find((l) => l.code === storedLanguage);
      set({
        currentLanguage: storedLanguage,
        isRTL: languageConfig?.rtl || false,
      });
      // Update document direction for RTL
      if (languageConfig?.rtl) {
        document.documentElement.dir = 'rtl';
      } else {
        document.documentElement.dir = 'ltr';
      }
    } catch (error) {
      set({
        currentLanguage: DEFAULT_LANGUAGE,
        isRTL: false,
      });
    }
  },
}));
