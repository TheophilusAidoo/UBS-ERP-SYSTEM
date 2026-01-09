import { create } from 'zustand';
import { User } from '../types';
import { authService, LoginCredentials, RegisterData } from '../services/auth.service';
import { supabase } from '../services/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const STORAGE_KEY = 'ubs_erp_user';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (credentials: LoginCredentials) => {
    try {
      set({ isLoading: true });
      
      // Clear any stale storage before login
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.clear();
      
      console.log('🔐 Starting login process...');
      const { user, session } = await authService.login(credentials);
      
      if (user && session) {
        console.log('✅ Login successful, setting user in store:', user.email);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        set({ user, isAuthenticated: true, isLoading: false });
        console.log('✅ Auth store updated, user authenticated');
      } else {
        console.error('❌ Login returned no user or session');
        set({ isLoading: false });
        throw new Error('❌ Login failed: No user or session returned. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Login error in store:', error);
      // Clear storage on error to prevent stale data
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.clear();
      set({ isLoading: false, isAuthenticated: false, user: null });
      // Re-throw with better error message if needed
      if (error.message) {
        throw error;
      }
      throw new Error(error.message || '❌ Login failed. Please check your credentials and try again.');
    }
  },

  register: async (data: RegisterData) => {
    try {
      set({ isLoading: true });
      const { user } = await authService.register(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
      localStorage.removeItem(STORAGE_KEY);
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      throw error;
    }
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      
      // First, try to get current user from Supabase auth
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          // User is authenticated and profile exists
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
          set({ user: currentUser, isAuthenticated: true, isLoading: false });
          return;
        }
      } catch (serverError) {
        console.warn('Could not check auth with server:', serverError);
      }

      // If no current user from server, check localStorage
      const storedUser = localStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          // Verify the stored user still exists in auth
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser && authUser.id === user.id) {
            // Stored user matches auth user, use it
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            // Stored user doesn't match, clear it
            console.log('Stored user does not match auth user, clearing storage');
            localStorage.removeItem(STORAGE_KEY);
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (parseError) {
          console.error('Error parsing stored user:', parseError);
          localStorage.removeItem(STORAGE_KEY);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        // No stored user and no server user
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('Error in checkAuth:', error);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: async (updates: Partial<User>) => {
    const { user } = get();
    if (!user) return;

    try {
      const updatedUser = await authService.updateProfile(user.id, updates);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
      set({ user: updatedUser });
    } catch (error) {
      throw error;
    }
  },
}));
