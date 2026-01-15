import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useThemeStore } from './store/theme.store';
import { useAuthStore } from './store/auth.store';
import { useGlobalSettingsStore } from './store/global-settings.store';
import { useLanguageStore } from './store/language.store';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import './i18n';

const ThemedApp = () => {
  const { getTheme, initializeTheme } = useThemeStore();
  const { user } = useAuthStore();
  const { initializeSettings } = useGlobalSettingsStore();
  const { initializeLanguage } = useLanguageStore();
  const theme = getTheme();

  // Initialize language when user is available
  useEffect(() => {
    if (user?.id) {
      initializeLanguage(user.id);
    } else {
      initializeLanguage(); // Use default/global for login page
    }
  }, [user?.id, initializeLanguage]);

  // Initialize global settings on app start (from Supabase) - with caching for instant load
  useEffect(() => {
    initializeSettings();
  }, [initializeSettings]);
  
  // Reload global settings periodically to catch admin changes
  // Increased to 5 minutes since we now use caching (settings load instantly from cache)
  useEffect(() => {
    const interval = setInterval(() => {
      initializeSettings();
    }, 5 * 60 * 1000); // Check every 5 minutes (settings are cached for instant load)
    
    return () => clearInterval(interval);
  }, [initializeSettings]);

  // Initialize theme when user logs in
  // Each user (admin/staff) has their own theme preference
  useEffect(() => {
    if (user?.id) {
      initializeTheme(user.id, user.role === 'admin');
    } else {
      // If no user, reset to default theme
      initializeTheme();
    }
  }, [user?.id, user?.role, initializeTheme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemedApp />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
