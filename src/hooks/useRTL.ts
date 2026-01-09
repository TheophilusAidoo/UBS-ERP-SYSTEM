import { useEffect } from 'react';
import { useLanguageStore } from '../store/language.store';

export const useRTL = () => {
  const { isRTL } = useLanguageStore();

  useEffect(() => {
    // RTL is handled in language.store.ts by setting document.documentElement.dir
    // This hook is kept for compatibility but the actual RTL handling is in the store
  }, [isRTL]);

  return { isRTL };
};
