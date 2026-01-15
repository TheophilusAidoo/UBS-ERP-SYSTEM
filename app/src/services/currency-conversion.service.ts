/**
 * Currency Conversion Service
 * Handles real-time currency conversion using exchange rate APIs
 */

export interface ExchangeRates {
  [key: string]: number; // e.g., { "EUR": 0.85, "GBP": 0.73, ... }
}

export type PopularCurrency = 'USD' | 'EUR' | 'GBP' | 'AED' | 'SAR' | 'GHS' | 'XAF' | 'EGP' | 'JPY' | 'CNY';

class CurrencyConversionService {
  private cache: { rates: ExchangeRates | null; timestamp: number } = {
    rates: null,
    timestamp: 0,
  };
  private cacheDuration = 60 * 60 * 1000; // 1 hour cache

  /**
   * Fetch exchange rates from a free API
   * Using exchangerate-api.com (free tier allows 1500 requests/month)
   * Note: API always returns rates relative to USD, so we convert if baseCurrency is not USD
   */
  async getExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRates> {
    // Check cache first (cache is always in USD)
    const now = Date.now();
    let cachedRates = null;
    if (this.cache.rates && (now - this.cache.timestamp) < this.cacheDuration) {
      cachedRates = this.cache.rates;
    }

    try {
      // Always fetch USD rates (API limitation)
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }

      const data = await response.json();
      const usdRates: ExchangeRates = data.rates || {};

      // Cache USD rates
      this.cache = {
        rates: usdRates,
        timestamp: now,
      };

      // If base currency is USD, return as is
      if (baseCurrency === 'USD') {
        return usdRates;
      }

      // Convert to base currency
      const baseRate = usdRates[baseCurrency] || 1;
      if (baseRate === 0) {
        return this.getFallbackRates(baseCurrency);
      }

      const convertedRates: ExchangeRates = {};
      Object.keys(usdRates).forEach((currency) => {
        if (currency === baseCurrency) {
          convertedRates[currency] = 1;
        } else {
          convertedRates[currency] = usdRates[currency] / baseRate;
        }
      });

      return convertedRates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      
      // Return fallback rates if API fails (approximate rates)
      return this.getFallbackRates(baseCurrency);
    }
  }

  /**
   * Get fallback exchange rates (approximate, for offline use)
   */
  private getFallbackRates(baseCurrency: string): ExchangeRates {
    // Base rates relative to USD
    const usdRates: ExchangeRates = {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      AED: 3.67,
      SAR: 3.75,
      GHS: 12.5,
      XAF: 600,
      EGP: 30.9,
      JPY: 149.5,
      CNY: 7.24,
    };

    if (baseCurrency === 'USD') {
      return usdRates;
    }

    // Convert to base currency
    const baseRate = usdRates[baseCurrency as keyof typeof usdRates] || 1;
    const convertedRates: ExchangeRates = {};
    
    Object.keys(usdRates).forEach((currency) => {
      if (currency === baseCurrency) {
        convertedRates[currency] = 1;
      } else {
        convertedRates[currency] = usdRates[currency as keyof typeof usdRates] / baseRate;
      }
    });

    return convertedRates;
  }

  /**
   * Convert amount from one currency to another
   * rates should be relative to toCurrency (or base currency)
   * 
   * Example: If rates are relative to USD and we have:
   * rates[EUR] = 0.92 means 1 USD = 0.92 EUR
   * rates[AED] = 3.67 means 1 USD = 3.67 AED
   * 
   * To convert 100 EUR to AED:
   * 1. Convert EUR to USD: 100 / 0.92 = 108.70 USD
   * 2. Convert USD to AED: 108.70 * 3.67 = 398.91 AED
   * 
   * If rates are relative to another base currency, the logic is the same:
   * rates represent: 1 baseCurrency = X targetCurrency
   */
  convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    rates: ExchangeRates
  ): number {
    if (fromCurrency === toCurrency) return amount;
    
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    
    // If rates are not available, return original amount with warning
    if (!fromRate || !toRate) {
      console.warn(`Exchange rates not available for ${fromCurrency} or ${toCurrency}`);
      return amount;
    }
    
    // Convert via base currency (which the rates are relative to)
    // Step 1: Convert from source currency to base currency
    // If fromRate = X, it means 1 baseCurrency = X fromCurrency
    // So amount_in_base = amount / fromRate
    const amountInBase = amount / fromRate;
    
    // Step 2: Convert from base currency to target currency
    // If toRate = Y, it means 1 baseCurrency = Y toCurrency
    // So amount_in_target = amountInBase * toRate
    const amountInTarget = amountInBase * toRate;
    
    return amountInTarget;
  }

  /**
   * Get popular currencies for display
   */
  getPopularCurrencies(): PopularCurrency[] {
    return ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'GHS', 'XAF', 'EGP', 'JPY', 'CNY'] as PopularCurrency[];
  }

  /**
   * Get the 5 most popular currencies (excluding current)
   */
  getTop5Currencies(currentCurrency: string): PopularCurrency[] {
    const popular = this.getPopularCurrencies();
    return popular.filter(c => c !== currentCurrency).slice(0, 5) as PopularCurrency[];
  }
}

export const currencyConversionService = new CurrencyConversionService();

