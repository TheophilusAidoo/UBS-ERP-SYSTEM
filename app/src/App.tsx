import React, { useEffect, Suspense, lazy, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { useLanguageStore } from './store/language.store';
import { useGlobalSettingsStore } from './store/global-settings.store';
import LoadingScreen from './screens/common/LoadingScreen';
import AdminLayout from './components/layout/AdminLayout';
import StaffLayout from './components/layout/StaffLayout';
import EnvWarning from './components/common/EnvWarning';

// Lazy load all screens for code splitting and faster initial load
const LoginScreen = lazy(() => import('./screens/auth/LoginScreen'));
const RegisterScreen = lazy(() => import('./screens/auth/RegisterScreen'));
const ResetPasswordScreen = lazy(() => import('./screens/auth/ResetPasswordScreen'));
const AdminDashboard = lazy(() => import('./screens/admin/AdminDashboard'));
const StaffDashboard = lazy(() => import('./screens/staff/StaffDashboard'));
const CompaniesScreen = lazy(() => import('./screens/admin/CompaniesScreen'));
const StaffManagementScreen = lazy(() => import('./screens/admin/StaffManagementScreen'));
const AttendanceScreen = lazy(() => import('./screens/attendance/AttendanceScreen'));
const LeavesScreen = lazy(() => import('./screens/leaves/LeavesScreen'));
const FinancialScreen = lazy(() => import('./screens/financial/FinancialScreen'));
const InvoicesScreen = lazy(() => import('./screens/invoices/InvoicesScreen'));
const ProposalsScreen = lazy(() => import('./screens/proposals/ProposalsScreen'));
const ProjectsScreen = lazy(() => import('./screens/projects/ProjectsScreen'));
const MessagesScreen = lazy(() => import('./screens/messages/MessagesScreen'));
const PerformanceScreen = lazy(() => import('./screens/performance/PerformanceScreen'));
const AIScreen = lazy(() => import('./screens/ai/AIScreen'));
const AuditLogsScreen = lazy(() => import('./screens/admin/AuditLogsScreen'));
const SettingsScreen = lazy(() => import('./screens/settings/SettingsScreen'));
const ProductsScreen = lazy(() => import('./screens/products/ProductsScreen'));
const AdminProductsScreen = lazy(() => import('./screens/admin/AdminProductsScreen'));
const ClientsScreen = lazy(() => import('./screens/staff/ClientsScreen'));
const AdminClientsScreen = lazy(() => import('./screens/admin/ClientsScreen'));
const ClientDashboard = lazy(() => import('./screens/clients/ClientDashboard'));
const ClientMessagesScreen = lazy(() => import('./screens/clients/ClientMessagesScreen'));
const DailyReportsScreen = lazy(() => import('./screens/staff/DailyReportsScreen'));
const StaffReportsScreen = lazy(() => import('./screens/admin/StaffReportsScreen'));
const DeliveryScreen = lazy(() => import('./screens/delivery/DeliveryScreen'));
const AdminDeliveriesScreen = lazy(() => import('./screens/admin/AdminDeliveriesScreen'));


function App() {
  const { isAuthenticated, user, isLoading, checkAuth } = useAuthStore();
  const { initializeLanguage, currentLanguage } = useLanguageStore();
  const { initializeSettings, favicon } = useGlobalSettingsStore();

  useEffect(() => {
    // Global error handler for AbortErrors
    const handleError = (event: ErrorEvent) => {
      if (event.error?.name === 'AbortError' || event.message?.includes('aborted')) {
        // Silently handle abort errors - they're expected for timeouts
        event.preventDefault();
        return false;
      }
    };
    
    // Handle unhandled promise rejections (AbortErrors)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.name === 'AbortError' || 
          event.reason?.message?.includes('aborted') ||
          event.reason?.message?.includes('signal is aborted')) {
        // Silently handle abort errors from promises
        event.preventDefault();
        return false;
      }
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    try {
      checkAuth();
      initializeSettings(); // Initialize settings including favicon
    } catch (error: any) {
      // Don't log abort errors
      if (error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
        console.error('Error initializing app:', error);
      }
    }
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Initialize language when user changes (after login/logout)
  useEffect(() => {
    if (user?.id) {
      // User is logged in - load their language preference
      initializeLanguage(user.id);
    } else {
      // User not logged in - use default/global language
      initializeLanguage();
    }
  }, [user?.id]);

  // Update favicon when it changes
  useEffect(() => {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll('link[rel*="icon"]');
    existingLinks.forEach(link => link.remove());
    
    if (favicon) {
      // Add custom favicon
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = favicon.includes('svg') ? 'image/svg+xml' : 'image/png';
      link.href = favicon;
      document.head.appendChild(link);
      
      // Also add apple-touch-icon
      const appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.href = favicon;
      document.head.appendChild(appleLink);
    } else {
      // Reset to default favicon
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.href = '/favicon.svg';
      document.head.appendChild(link);
      
      const appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.href = '/favicon.svg';
      document.head.appendChild(appleLink);
    }
  }, [favicon]);

  // Memoize SuspenseWrapper to prevent unnecessary re-renders
  const SuspenseWrapper = useMemo(() => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <Suspense fallback={<LoadingScreen />}>
        {children}
      </Suspense>
    );
    return Wrapper;
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }


  return (
    <div key={currentLanguage}>
      <EnvWarning />
      <Routes>
        {/* Public routes - always accessible */}
        <Route path="/login" element={<SuspenseWrapper><LoginScreen /></SuspenseWrapper>} />
        <Route path="/register" element={<SuspenseWrapper><RegisterScreen /></SuspenseWrapper>} />
        <Route path="/reset-password" element={<SuspenseWrapper><ResetPasswordScreen /></SuspenseWrapper>} />
        
        {/* Client routes - publicly accessible (for invoice links, etc.) */}
        <Route path="/client/:clientId" element={<SuspenseWrapper><ClientDashboard /></SuspenseWrapper>} />
        <Route path="/client/:clientId/messages" element={<SuspenseWrapper><ClientMessagesScreen /></SuspenseWrapper>} />
        
        {/* Protected Admin Routes - only accessible to admins */}
        {isAuthenticated && user?.role === 'admin' && (
          <Route
            path="/"
            element={<AdminLayout />}
          >
            <Route path="dashboard" element={<SuspenseWrapper><AdminDashboard /></SuspenseWrapper>} />
            <Route path="companies" element={<SuspenseWrapper><CompaniesScreen /></SuspenseWrapper>} />
            <Route path="staff" element={<SuspenseWrapper><StaffManagementScreen /></SuspenseWrapper>} />
            <Route path="attendance" element={<SuspenseWrapper><AttendanceScreen /></SuspenseWrapper>} />
            <Route path="leaves" element={<SuspenseWrapper><LeavesScreen /></SuspenseWrapper>} />
            <Route path="financial" element={<SuspenseWrapper><FinancialScreen /></SuspenseWrapper>} />
            <Route path="invoices" element={<SuspenseWrapper><InvoicesScreen /></SuspenseWrapper>} />
            <Route path="proposals" element={<SuspenseWrapper><ProposalsScreen /></SuspenseWrapper>} />
            <Route path="projects" element={<SuspenseWrapper><ProjectsScreen /></SuspenseWrapper>} />
            <Route path="messages" element={<SuspenseWrapper><MessagesScreen /></SuspenseWrapper>} />
            <Route path="performance" element={<SuspenseWrapper><PerformanceScreen /></SuspenseWrapper>} />
            <Route path="products" element={<SuspenseWrapper><AdminProductsScreen /></SuspenseWrapper>} />
            <Route path="clients" element={<SuspenseWrapper><AdminClientsScreen /></SuspenseWrapper>} />
            <Route path="staff-reports" element={<SuspenseWrapper><StaffReportsScreen /></SuspenseWrapper>} />
            <Route path="deliveries" element={<SuspenseWrapper><AdminDeliveriesScreen /></SuspenseWrapper>} />
            <Route path="ai" element={<SuspenseWrapper><AIScreen /></SuspenseWrapper>} />
            <Route path="audit-logs" element={<SuspenseWrapper><AuditLogsScreen /></SuspenseWrapper>} />
            <Route path="settings" element={<SuspenseWrapper><SettingsScreen /></SuspenseWrapper>} />
            <Route index element={<Navigate to="/dashboard" replace />} />
          </Route>
        )}
        
        {/* Protected Staff Routes - accessible to authenticated users (not admin, not client) */}
        {isAuthenticated && user?.role !== 'admin' && user?.role !== 'client' && (
          <Route
            path="/"
            element={<StaffLayout />}
          >
            <Route path="dashboard" element={<SuspenseWrapper><StaffDashboard /></SuspenseWrapper>} />
            <Route path="attendance" element={<SuspenseWrapper><AttendanceScreen /></SuspenseWrapper>} />
            <Route path="leaves" element={<SuspenseWrapper><LeavesScreen /></SuspenseWrapper>} />
            <Route path="financial" element={<SuspenseWrapper><FinancialScreen /></SuspenseWrapper>} />
            <Route path="projects" element={<SuspenseWrapper><ProjectsScreen /></SuspenseWrapper>} />
            <Route path="invoices" element={<SuspenseWrapper><InvoicesScreen /></SuspenseWrapper>} />
            <Route path="proposals" element={<SuspenseWrapper><ProposalsScreen /></SuspenseWrapper>} />
            <Route path="products" element={<SuspenseWrapper><ProductsScreen /></SuspenseWrapper>} />
            <Route path="clients" element={<SuspenseWrapper><ClientsScreen /></SuspenseWrapper>} />
            <Route path="daily-reports" element={<SuspenseWrapper><DailyReportsScreen /></SuspenseWrapper>} />
            <Route path="delivery" element={<SuspenseWrapper><DeliveryScreen /></SuspenseWrapper>} />
            <Route path="messages" element={<SuspenseWrapper><MessagesScreen /></SuspenseWrapper>} />
            <Route path="performance" element={<SuspenseWrapper><PerformanceScreen /></SuspenseWrapper>} />
            <Route path="ai" element={<SuspenseWrapper><AIScreen /></SuspenseWrapper>} />
            <Route path="settings" element={<SuspenseWrapper><SettingsScreen /></SuspenseWrapper>} />
            <Route index element={<Navigate to="/dashboard" replace />} />
          </Route>
        )}
        
        {/* Protected routes wrapper - handles authentication redirects for admin/staff routes */}
        {!isAuthenticated && (
          <>
            <Route path="/dashboard" element={<Navigate to="/login" replace />} />
            <Route path="/companies" element={<Navigate to="/login" replace />} />
            <Route path="/staff" element={<Navigate to="/login" replace />} />
            <Route path="/attendance" element={<Navigate to="/login" replace />} />
            <Route path="/leaves" element={<Navigate to="/login" replace />} />
            <Route path="/financial" element={<Navigate to="/login" replace />} />
            <Route path="/invoices" element={<Navigate to="/login" replace />} />
            <Route path="/proposals" element={<Navigate to="/login" replace />} />
            <Route path="/projects" element={<Navigate to="/login" replace />} />
            <Route path="/messages" element={<Navigate to="/login" replace />} />
            <Route path="/performance" element={<Navigate to="/login" replace />} />
            <Route path="/products" element={<Navigate to="/login" replace />} />
            <Route path="/clients" element={<Navigate to="/login" replace />} />
            <Route path="/staff-reports" element={<Navigate to="/login" replace />} />
            <Route path="/deliveries" element={<Navigate to="/login" replace />} />
            <Route path="/ai" element={<Navigate to="/login" replace />} />
            <Route path="/audit-logs" element={<Navigate to="/login" replace />} />
            <Route path="/settings" element={<Navigate to="/login" replace />} />
            <Route path="/daily-reports" element={<Navigate to="/login" replace />} />
            <Route path="/delivery" element={<Navigate to="/login" replace />} />
          </>
        )}
        
        {/* Root path - show login if not authenticated, let nested routes handle if authenticated */}
        {!isAuthenticated && (
          <Route 
            path="/" 
            element={<SuspenseWrapper><LoginScreen /></SuspenseWrapper>} 
          />
        )}
        
        {/* Catch-all - redirect based on auth and role */}
        <Route
          path="*"
          element={
            !isAuthenticated
              ? <Navigate to="/login" replace />
              : user?.role === 'client'
              ? <Navigate to={`/client/${user.id}`} replace />
              : user?.role === 'admin'
              ? <Navigate to="/dashboard" replace />
              : <Navigate to="/dashboard" replace />
          }
        />
      </Routes>
    </div>
  );
}

export default App;
