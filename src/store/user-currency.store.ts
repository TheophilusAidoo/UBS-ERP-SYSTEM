import { create } from 'zustand';
import { Currency } from './global-settings.store';

interface UserCurrencyState {
  currency: Currency;
  currencySymbol: string;
  setCurrency: (currency: Currency, userId: string) => void;
  loadCurrency: (userId: string) => void;
  getCurrency: (userId: string | null, isAdmin: boolean) => { currency: Currency; currencySymbol: string };
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
  XAF: 'XAF',
};

// Load user currency from localStorage
const loadUserCurrency = (userId: string): { currency: Currency; currencySymbol: string } | null => {
  try {
    const stored = localStorage.getItem(`ubs-user-currency-${userId}`);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        currency: data.currency || 'USD',
        currencySymbol: data.currencySymbol || currencySymbols[data.currency || 'USD'],
      };
    }
  } catch (e) {
    console.error('Error loading user currency:', e);
  }
  return null;
};

// Save user currency to localStorage
const saveUserCurrency = (userId: string, currency: Currency, currencySymbol: string) => {
  try {
    localStorage.setItem(`ubs-user-currency-${userId}`, JSON.stringify({ currency, currencySymbol }));
  } catch (e) {
    console.error('Error saving user currency:', e);
  }
};

export const useUserCurrencyStore = create<UserCurrencyState>((set, get) => ({
  currency: 'USD',
  currencySymbol: '$',
  
  setCurrency: (currency: Currency, userId: string) => {
    const symbol = currencySymbols[currency];
    set({ currency, currencySymbol: symbol });
    saveUserCurrency(userId, currency, symbol);
  },
  
  loadCurrency: (userId: string) => {
    const stored = loadUserCurrency(userId);
    if (stored) {
      set(stored);
    } else {
      // Default to USD if no stored currency
      set({ currency: 'USD', currencySymbol: '$' });
    }
  },
  
  getCurrency: (userId: string | null, isAdmin: boolean) => {
    // If admin, return default (will use global settings)
    // If staff, return their personal currency
    if (isAdmin || !userId) {
      return { currency: 'USD' as Currency, currencySymbol: '$' };
    }
    
    const stored = loadUserCurrency(userId);
    if (stored) {
      return stored;
    }
    
    return { currency: 'USD' as Currency, currencySymbol: '$' };
  },
}));

