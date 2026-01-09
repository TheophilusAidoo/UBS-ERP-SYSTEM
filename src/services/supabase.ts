import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a dummy client if env vars are missing (prevents app crash)
let supabase: ReturnType<typeof createClient>;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Missing Supabase environment variables. Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  // Create a dummy client to prevent crashes
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
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
