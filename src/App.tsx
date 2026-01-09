import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { useLanguageStore } from './store/language.store';
import { useGlobalSettingsStore } from './store/global-settings.store';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import ResetPasswordScreen from './screens/auth/ResetPasswordScreen';
import AdminDashboard from './screens/admin/AdminDashboard';
import StaffDashboard from './screens/staff/StaffDashboard';
import CompaniesScreen from './screens/admin/CompaniesScreen';
import StaffManagementScreen from './screens/admin/StaffManagementScreen';
import AttendanceScreen from './screens/attendance/AttendanceScreen';
import LeavesScreen from './screens/leaves/LeavesScreen';
import FinancialScreen from './screens/financial/FinancialScreen';
import InvoicesScreen from './screens/invoices/InvoicesScreen';
import ProposalsScreen from './screens/proposals/ProposalsScreen';
import ProjectsScreen from './screens/projects/ProjectsScreen';
import MessagesScreen from './screens/messages/MessagesScreen';
import PerformanceScreen from './screens/performance/PerformanceScreen';
import AIScreen from './screens/ai/AIScreen';
import AuditLogsScreen from './screens/admin/AuditLogsScreen';
import SettingsScreen from './screens/settings/SettingsScreen';
import ProductsScreen from './screens/products/ProductsScreen';
import AdminProductsScreen from './screens/admin/AdminProductsScreen';
import ClientsScreen from './screens/staff/ClientsScreen';
import AdminClientsScreen from './screens/admin/ClientsScreen';
import ClientDashboard from './screens/clients/ClientDashboard';
import ClientMessagesScreen from './screens/clients/ClientMessagesScreen';
import DailyReportsScreen from './screens/staff/DailyReportsScreen';
import StaffReportsScreen from './screens/admin/StaffReportsScreen';
import DeliveryScreen from './screens/delivery/DeliveryScreen';
import AdminDeliveriesScreen from './screens/admin/AdminDeliveriesScreen';
import LoadingScreen from './screens/common/LoadingScreen';
import AdminLayout from './components/layout/AdminLayout';
import StaffLayout from './components/layout/StaffLayout';
import EnvWarning from './components/common/EnvWarning';

function App() {
  const { isAuthenticated, user, isLoading, checkAuth } = useAuthStore();
  const { initializeLanguage, currentLanguage } = useLanguageStore();
  const { initializeSettings, favicon } = useGlobalSettingsStore();

  useEffect(() => {
    try {
      checkAuth();
      initializeSettings(); // Initialize settings including favicon
    } catch (error) {
      console.error('Error initializing app:', error);
    }
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

  // Force re-render when language changes
  useEffect(() => {
    // This effect will trigger re-renders when language changes
  }, [currentLanguage]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div key={currentLanguage}>
      <EnvWarning />
      <Routes>
        {!isAuthenticated ? (
          <>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/register" element={<RegisterScreen />} />
            <Route path="/reset-password" element={<ResetPasswordScreen />} />
            {/* Allow direct access to dashboard for testing */}
            <Route path="/dashboard" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : user?.role === 'client' ? (
        <>
          <Route path="/client/:clientId" element={<ClientDashboard />} />
          <Route path="/client/:clientId/messages" element={<ClientMessagesScreen />} />
          <Route path="/login" element={<Navigate to={`/client/${user.id}`} replace />} />
          <Route path="*" element={<Navigate to={`/client/${user.id}`} replace />} />
        </>
      ) : user?.role === 'admin' ? (
        <>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="companies" element={<CompaniesScreen />} />
            <Route path="staff" element={<StaffManagementScreen />} />
            <Route path="attendance" element={<AttendanceScreen />} />
            <Route path="leaves" element={<LeavesScreen />} />
            <Route path="financial" element={<FinancialScreen />} />
            <Route path="invoices" element={<InvoicesScreen />} />
            <Route path="proposals" element={<ProposalsScreen />} />
            <Route path="projects" element={<ProjectsScreen />} />
            <Route path="messages" element={<MessagesScreen />} />
            <Route path="performance" element={<PerformanceScreen />} />
            <Route path="products" element={<AdminProductsScreen />} />
            <Route path="clients" element={<AdminClientsScreen />} />
            <Route path="staff-reports" element={<StaffReportsScreen />} />
            <Route path="deliveries" element={<AdminDeliveriesScreen />} />
            <Route path="ai" element={<AIScreen />} />
            <Route path="audit-logs" element={<AuditLogsScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
          </Route>
          <Route path="/client/:clientId" element={<ClientDashboard />} />
          <Route path="/client/:clientId/messages" element={<ClientMessagesScreen />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<StaffLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="attendance" element={<AttendanceScreen />} />
            <Route path="leaves" element={<LeavesScreen />} />
            <Route path="financial" element={<FinancialScreen />} />
            <Route path="projects" element={<ProjectsScreen />} />
            <Route path="invoices" element={<InvoicesScreen />} />
            <Route path="proposals" element={<ProposalsScreen />} />
            <Route path="products" element={<ProductsScreen />} />
            <Route path="clients" element={<ClientsScreen />} />
            <Route path="daily-reports" element={<DailyReportsScreen />} />
            <Route path="delivery" element={<DeliveryScreen />} />
            <Route path="messages" element={<MessagesScreen />} />
            <Route path="performance" element={<PerformanceScreen />} />
            <Route path="ai" element={<AIScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
          </Route>
          <Route path="/client/:clientId" element={<ClientDashboard />} />
          <Route path="/client/:clientId/messages" element={<ClientMessagesScreen />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </>
      )}
      </Routes>
    </div>
  );
}

export default App;

