import { create } from 'zustand';
import { createTheme, Theme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';
export type PrimaryColor = 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'teal' | 'pink' | 'indigo' | 'cyan' | 'amber' | 'lime' | 'emerald' | 'violet' | 'fuchsia' | 'rose' | 'sky' | 'slate';

interface ThemeState {
  mode: ThemeMode;
  primaryColor: PrimaryColor;
  sidebarColor?: string; // Custom sidebar color
  setMode: (mode: ThemeMode, userId?: string, isAdmin?: boolean) => Promise<void>;
  setPrimaryColor: (color: PrimaryColor, userId?: string, isAdmin?: boolean) => Promise<void>;
  setSidebarColor: (color: string, userId?: string, isAdmin?: boolean) => Promise<void>;
  getTheme: () => Theme;
  initializeTheme: (userId?: string, isAdmin?: boolean) => Promise<void>;
}

const STORAGE_KEY = 'ubs-theme-storage';

const colorPalettes: Record<PrimaryColor, { main: string; light: string; dark: string }> = {
  blue: { main: '#2563eb', light: '#3b82f6', dark: '#1d4ed8' },
  purple: { main: '#7c3aed', light: '#8b5cf6', dark: '#6d28d9' },
  green: { main: '#16a34a', light: '#22c55e', dark: '#15803d' },
  red: { main: '#dc2626', light: '#ef4444', dark: '#b91c1c' },
  orange: { main: '#ea580c', light: '#fb923c', dark: '#c2410c' },
  teal: { main: '#0891b2', light: '#06b6d4', dark: '#0e7490' },
  pink: { main: '#db2777', light: '#ec4899', dark: '#be185d' },
  indigo: { main: '#4f46e5', light: '#6366f1', dark: '#4338ca' },
  cyan: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2' },
  amber: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
  lime: { main: '#84cc16', light: '#a3e635', dark: '#65a30d' },
  emerald: { main: '#10b981', light: '#34d399', dark: '#059669' },
  violet: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed' },
  fuchsia: { main: '#d946ef', light: '#e879f9', dark: '#c026d3' },
  rose: { main: '#f43f5e', light: '#fb7185', dark: '#e11d48' },
  sky: { main: '#0ea5e9', light: '#38bdf8', dark: '#0284c7' },
  slate: { main: '#64748b', light: '#94a3b8', dark: '#475569' },
};

// Load from localStorage - per-user theme preferences (each user has their own theme)
const loadTheme = (userId?: string, isAdmin?: boolean): { mode: ThemeMode; primaryColor: PrimaryColor; sidebarColor?: string } => {
  try {
    if (userId) {
      // Load per-user theme preference
      const userThemeKey = `${STORAGE_KEY}_user_${userId}`;
      const stored = localStorage.getItem(userThemeKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          mode: parsed.mode || 'light',
          primaryColor: parsed.primaryColor || 'blue',
          sidebarColor: parsed.sidebarColor,
        };
      }
    }
    
    // Fallback to global theme (for backward compatibility)
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        mode: parsed.mode || 'light',
        primaryColor: parsed.primaryColor || 'blue',
        sidebarColor: parsed.sidebarColor,
      };
    }
  } catch (e) {
    console.error('Error loading theme:', e);
  }
  return { mode: 'light', primaryColor: 'blue' };
};

// Save to localStorage - per-user theme preferences (each user has their own theme)
const saveTheme = (mode: ThemeMode, primaryColor: PrimaryColor, sidebarColor: string | undefined, userId?: string, isAdmin?: boolean) => {
  try {
    if (userId) {
      // Save per-user theme preference
      const userThemeKey = `${STORAGE_KEY}_user_${userId}`;
      localStorage.setItem(userThemeKey, JSON.stringify({ mode, primaryColor, sidebarColor }));
    } else {
      // Fallback to global storage (for backward compatibility)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, primaryColor, sidebarColor }));
    }
  } catch (e) {
    console.error('Error saving theme:', e);
  }
};

export const useThemeStore = create<ThemeState>((set, get) => {
  // Initialize with default theme
  const initialState = loadTheme();
  
  return {
    mode: initialState.mode,
    primaryColor: initialState.primaryColor,
    sidebarColor: initialState.sidebarColor,
    
    initializeTheme: async (userId?: string, isAdmin?: boolean) => {
      // This will be called when user logs in
      // Load per-user theme preference (each user has their own theme)
      const userTheme = loadTheme(userId, isAdmin);
      
      // Per-user theme: each user (admin/staff) has their own theme preference
      // No need to sync with global settings - each user's theme is independent
      set({ mode: userTheme.mode, primaryColor: userTheme.primaryColor, sidebarColor: userTheme.sidebarColor });
    },
    
    setMode: async (mode: ThemeMode, userId?: string, isAdmin?: boolean) => {
      const { primaryColor, sidebarColor } = get();
      set({ mode });
      // Save per-user theme preference (each user has their own theme)
      saveTheme(mode, primaryColor, sidebarColor, userId, isAdmin);
    },
    
    setPrimaryColor: async (primaryColor: PrimaryColor, userId?: string, isAdmin?: boolean) => {
      const { mode, sidebarColor } = get();
      set({ primaryColor });
      // Save per-user theme preference (each user has their own theme)
      saveTheme(mode, primaryColor, sidebarColor, userId, isAdmin);
    },
    
    setSidebarColor: async (sidebarColor: string, userId?: string, isAdmin?: boolean) => {
      const { mode, primaryColor } = get();
      set({ sidebarColor });
      // Save per-user theme preference (each user has their own theme)
      saveTheme(mode, primaryColor, sidebarColor, userId, isAdmin);
    },
    
    getTheme: () => {
      const { mode, primaryColor } = get();
      const colors = colorPalettes[primaryColor];
      
      return createTheme({
        palette: {
          mode,
          primary: {
            main: colors.main,
            light: colors.light,
            dark: colors.dark,
            contrastText: '#ffffff',
          },
          secondary: {
            main: mode === 'light' ? '#7c3aed' : '#a78bfa',
            light: mode === 'light' ? '#8b5cf6' : '#c4b5fd',
            dark: mode === 'light' ? '#6d28d9' : '#8b5cf6',
          },
          success: {
            main: '#16a34a',
            light: '#22c55e',
            dark: '#15803d',
          },
          warning: {
            main: '#ca8a04',
            light: '#eab308',
            dark: '#a16207',
          },
          error: {
            main: '#dc2626',
            light: '#ef4444',
            dark: '#b91c1c',
          },
          info: {
            main: '#0891b2',
            light: '#06b6d4',
            dark: '#0e7490',
          },
          background: {
            default: mode === 'light' ? '#f8fafc' : '#0f172a',
            paper: mode === 'light' ? '#ffffff' : '#1e293b',
          },
          text: {
            primary: mode === 'light' ? '#0f172a' : '#f1f5f9',
            secondary: mode === 'light' ? '#64748b' : '#94a3b8',
          },
        },
        typography: {
          fontFamily: [
            'Inter',
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
          ].join(','),
          h1: { fontWeight: 700, fontSize: '2.5rem' },
          h2: { fontWeight: 700, fontSize: '2rem' },
          h3: { fontWeight: 600, fontSize: '1.75rem' },
          h4: { fontWeight: 600, fontSize: '1.5rem' },
          h5: { fontWeight: 600, fontSize: '1.25rem' },
          h6: { fontWeight: 600, fontSize: '1rem' },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                borderRadius: 10,
                padding: '10px 24px',
                fontWeight: 600,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                },
              },
              contained: {
                '&:hover': {
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 16,
                boxShadow: mode === 'light' 
                  ? '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                  : '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
                border: mode === 'light' 
                  ? '1px solid rgba(0, 0, 0, 0.05)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: mode === 'light'
                    ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                    : '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                  transform: 'translateY(-2px)',
                },
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'light'
                  ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                  : '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
                backgroundColor: mode === 'light' ? '#ffffff' : '#1e293b',
                color: mode === 'light' ? '#0f172a' : '#f1f5f9',
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                borderRight: 'none',
                boxShadow: mode === 'light'
                  ? '2px 0 8px rgba(0,0,0,0.1)'
                  : '2px 0 8px rgba(0,0,0,0.3)',
                backgroundColor: mode === 'light' ? '#ffffff' : '#1e293b',
              },
            },
          },
          MuiListItemButton: {
            styleOverrides: {
              root: {
                borderRadius: 10,
                margin: '4px 8px',
                '&.Mui-selected': {
                  backgroundColor: colors.main,
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: colors.dark,
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#ffffff',
                  },
                },
                '&:hover': {
                  backgroundColor: mode === 'light' 
                    ? 'rgba(37, 99, 235, 0.1)'
                    : 'rgba(255, 255, 255, 0.1)',
                },
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiOutlinedInput-root': {
                  backgroundColor: mode === 'light' ? '#ffffff' : '#1e293b',
                },
              },
            },
          },
          MuiSelect: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'light' ? '#ffffff' : '#1e293b',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'light' ? '#ffffff' : '#1e293b',
              },
            },
          },
        },
      });
    },
  };
});
