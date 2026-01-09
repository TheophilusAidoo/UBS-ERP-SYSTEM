import { Language, LeaveType, ProjectStatus, InvoiceStatus } from '../types';

export const APP_NAME = 'UBS ERP';

export const LANGUAGES: { code: Language; name: string; nativeName: string; rtl: boolean }[] = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
];

export const DEFAULT_LANGUAGE: Language = 'en';

export const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
];

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'planning', label: 'Planning', color: '#FFA726' },
  { value: 'in-progress', label: 'In Progress', color: '#42A5F5' },
  { value: 'on-hold', label: 'On Hold', color: '#EF5350' },
  { value: 'completed', label: 'Completed', color: '#66BB6A' },
  { value: 'cancelled', label: 'Cancelled', color: '#78909C' },
];

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: '#78909C' },
  { value: 'pending', label: 'Pending Approval', color: '#FFA726' },
  { value: 'approved', label: 'Approved', color: '#42A5F5' },
  { value: 'sent', label: 'Sent', color: '#66BB6A' },
  { value: 'paid', label: 'Paid', color: '#66BB6A' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF5350' },
];

export const JOB_TITLES = [
  'HR Manager',
  'Finance Manager',
  'Developer',
  'Sales Manager',
  'Project Manager',
  'Accountant',
  'Designer',
  'Marketing Manager',
  'Operations Manager',
  'Other',
];

export const CURRENCY_SYMBOL = '$';
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm';

export const COLORS = {
  primary: '#1976D2',
  secondary: '#424242',
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  info: '#42A5F5',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    register: '/auth/register',
  },
  companies: '/companies',
  users: '/users',
  attendance: '/attendance',
  leaves: '/leaves',
  transactions: '/transactions',
  invoices: '/invoices',
  proposals: '/proposals',
  projects: '/projects',
  reports: '/reports',
  messages: '/messages',
  notifications: '/notifications',
  goals: '/goals',
  reviews: '/reviews',
  ai: {
    insights: '/ai/insights',
    chat: '/ai/chat',
  },
};


