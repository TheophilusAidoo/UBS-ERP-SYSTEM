import { useAuthStore } from '../store/auth.store';
import { useGlobalSettingsStore } from '../store/global-settings.store';
import { useUserCurrencyStore } from '../store/user-currency.store';
import { useEffect } from 'react';

/**
 * Hook to get the correct currency based on user role
 * - Admin: Uses global currency settings
 * - Staff: Uses global currency settings (admin changes apply to all staff)
 */
export const useCurrency = () => {
  const { user } = useAuthStore();
  
  const { currency: globalCurrency, currencySymbol: globalCurrencySymbol } = useGlobalSettingsStore();

  // Both admin and staff use global currency settings
  // When admin changes currency, it applies to all staff
  return {
    currency: globalCurrency,
    currencySymbol: globalCurrencySymbol,
  };
};

