import { createClient } from '@supabase/supabase-js';

// Get environment variables - check both import.meta.env and window for compatibility
const getEnvVar = (key: string): string => {
  // Try Vite's import.meta.env first
  if (import.meta.env[key]) {
    return import.meta.env[key];
  }
  // Fallback to window (for runtime injection if needed)
  if (typeof window !== 'undefined' && (window as any).__ENV__?.[key]) {
    return (window as any).__ENV__[key];
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://shejpknspmrlgbjhhptx.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZWpwa25zcG1ybGdiamhocHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzA1NDksImV4cCI6MjA4MjUwNjU0OX0.NbZdrQrZjhVd4CKk1T25TgVEDYWIslw-yWjMKveOvCo';

// Performance-optimized Supabase client configuration
const createOptimizedClient = (url: string, key: string, isDummy: boolean = false) => {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: !isDummy,
      persistSession: !isDummy,
      detectSessionInUrl: !isDummy,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // Reduce auth state change polling interval for faster response
      flowType: 'pkce',
    },
    global: {
      // Use native fetch without aggressive timeout - let browser handle it
      // Only add timeout for very long operations if needed
      fetch: (url, options = {}) => {
        // Respect existing signals
        const existingSignal = (options as RequestInit).signal;
        
        // For most requests, use native fetch without timeout
        // Only add timeout for very specific long-running operations
        const isLongRunningOperation = url.toString().includes('/rpc/') || 
                                       url.toString().includes('/rest/v1/') && options.method === 'POST';
        
        if (!isLongRunningOperation) {
          // Standard requests - no timeout, let browser handle it
          return fetch(url, options);
        }
        
        // Only for long-running operations, add a generous timeout (60 seconds)
        if (existingSignal) {
          return fetch(url, options);
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        }, 60000); // 60 seconds for long operations only
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        })
        .finally(() => {
          clearTimeout(timeoutId);
        });
      },
      // Headers for better performance
      headers: {
        'x-client-info': 'ubs-erp@1.0.0',
      },
    },
    db: {
      schema: 'public',
    },
    // Enable realtime only if needed (disabled by default for better performance)
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
};

// Create Supabase client - use fallback values if env vars are missing
let supabase: ReturnType<typeof createClient>;

// Check if we have valid credentials (not placeholder)
const hasValidCredentials = supabaseUrl && 
                            supabaseAnonKey && 
                            supabaseUrl !== 'https://placeholder.supabase.co' &&
                            supabaseAnonKey !== 'placeholder-key' &&
                            supabaseUrl.includes('supabase.co');

if (!hasValidCredentials) {
  console.warn('⚠️ Using fallback Supabase credentials. For production, create a .env file with:');
  console.warn('   VITE_SUPABASE_URL=https://shejpknspmrlgbjhhptx.supabase.co');
  console.warn('   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
}

// Always create client with provided credentials (fallback or from env)
supabase = createOptimizedClient(supabaseUrl, supabaseAnonKey, !hasValidCredentials);

// Test connection on initialization - simplified to avoid blocking
if (hasValidCredentials && typeof window !== 'undefined') {
  // Quick connection test - just log, don't block
  setTimeout(() => {
    supabase.auth.getSession()
      .then(() => {
        console.log('✅ Supabase connection successful');
      })
      .catch((error) => {
        console.warn('⚠️ Supabase connection check:', error.message);
      });
  }, 100);
}

export { supabase };

// Type helper for Supabase queries to avoid 'never' type issues
export type SupabaseQueryResult<T> = T extends Promise<infer U> ? U : T;

// Database Tables
export const TABLES = {
  users: 'users',
  companies: 'companies',
  clients: 'clients',
  attendance: 'attendance',
  leave_requests: 'leave_requests',
  transactions: 'transactions',
  invoices: 'invoices',
  invoice_items: 'invoice_items',
  proposals: 'proposals',
  proposal_items: 'proposal_items',
  projects: 'projects',
  project_assignments: 'project_assignments',
  work_reports: 'work_reports',
  daily_reports: 'daily_reports',
  messages: 'messages',
  notifications: 'notifications',
  kpis: 'kpis',
  goals: 'goals',
  performance_reviews: 'performance_reviews',
  ai_insights: 'ai_insights',
  audit_logs: 'audit_logs',
  global_settings: 'global_settings',
  products: 'products',
  product_sales: 'product_sales',
} as const;
