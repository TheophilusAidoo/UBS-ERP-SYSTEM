import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuthStore } from '../store/auth.store';
import { useLanguageStore } from '../store/language.store';
import { useRTL } from '../hooks/useRTL';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AdminDashboard from '../screens/admin/AdminDashboard';
import StaffDashboard from '../screens/staff/StaffDashboard';
import CompaniesScreen from '../screens/admin/CompaniesScreen';
import StaffManagementScreen from '../screens/admin/StaffManagementScreen';
import AttendanceScreen from '../screens/attendance/AttendanceScreen';
import LeavesScreen from '../screens/leaves/LeavesScreen';
import FinancialScreen from '../screens/financial/FinancialScreen';
import InvoicesScreen from '../screens/invoices/InvoicesScreen';
import ProjectsScreen from '../screens/projects/ProjectsScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import PerformanceScreen from '../screens/performance/PerformanceScreen';
import AIScreen from '../screens/ai/AIScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

import LoadingScreen from '../screens/common/LoadingScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const AdminDrawerNavigator = () => (
  <Drawer.Navigator>
    <Drawer.Screen name="Dashboard" component={AdminDashboard} />
    <Drawer.Screen name="Companies" component={CompaniesScreen} />
    <Drawer.Screen name="Staff" component={StaffManagementScreen} />
    <Drawer.Screen name="Attendance" component={AttendanceScreen} />
    <Drawer.Screen name="Leaves" component={LeavesScreen} />
    <Drawer.Screen name="Financial" component={FinancialScreen} />
    <Drawer.Screen name="Invoices" component={InvoicesScreen} />
    <Drawer.Screen name="Projects" component={ProjectsScreen} />
    <Drawer.Screen name="Messages" component={MessagesScreen} />
    <Drawer.Screen name="Performance" component={PerformanceScreen} />
    <Drawer.Screen name="AI Assistant" component={AIScreen} />
    <Drawer.Screen name="Settings" component={SettingsScreen} />
  </Drawer.Navigator>
);

const StaffDrawerNavigator = () => (
  <Drawer.Navigator>
    <Drawer.Screen name="Dashboard" component={StaffDashboard} />
    <Drawer.Screen name="Attendance" component={AttendanceScreen} />
    <Drawer.Screen name="Leaves" component={LeavesScreen} />
    <Drawer.Screen name="Projects" component={ProjectsScreen} />
    <Drawer.Screen name="Invoices" component={InvoicesScreen} />
    <Drawer.Screen name="Messages" component={MessagesScreen} />
    <Drawer.Screen name="Performance" component={PerformanceScreen} />
    <Drawer.Screen name="Settings" component={SettingsScreen} />
  </Drawer.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated, user, isLoading, checkAuth } = useAuthStore();
  const { initializeLanguage } = useLanguageStore();
  useRTL(); // Handle RTL layout

  useEffect(() => {
    checkAuth();
  }, []);

  // Initialize language when user changes
  useEffect(() => {
    if (user?.id) {
      initializeLanguage(user.id);
    } else {
      initializeLanguage(); // Use default/global for login page
    }
  }, [user?.id, initializeLanguage]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : user?.role === 'admin' ? (
            <Stack.Screen name="AdminApp" component={AdminDrawerNavigator} />
          ) : (
            <Stack.Screen name="StaffApp" component={StaffDrawerNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
  );
};

export default AppNavigator;

