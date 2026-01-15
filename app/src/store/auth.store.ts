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
const AUTH_CHECK_CACHE_KEY = 'ubs_erp_auth_check_cache';
const AUTH_CHECK_CACHE_DURATION = 5000; // 5 seconds cache

// Helper to check if cached auth is still valid
const getCachedAuthCheck = (): { timestamp: number; userId: string } | null => {
  try {
    const cached = localStorage.getItem(AUTH_CHECK_CACHE_KEY);
    if (!cached) return null;
    const { timestamp, userId } = JSON.parse(cached);
    const now = Date.now();
    if (now - timestamp < AUTH_CHECK_CACHE_DURATION) {
      return { timestamp, userId };
    }
    localStorage.removeItem(AUTH_CHECK_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
};

// Helper to cache auth check result
const setCachedAuthCheck = (userId: string) => {
  try {
    localStorage.setItem(AUTH_CHECK_CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      userId,
    }));
  } catch {
    // Ignore storage errors
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (credentials: LoginCredentials) => {
    try {
      // Set loading state immediately
      set({ isLoading: true, isAuthenticated: false, user: null });
      
      // Clear any stale storage before login
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(AUTH_CHECK_CACHE_KEY);
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('⚠️ Storage clear warning:', storageError);
      }
      
      console.log('🔐 Starting login process...');
      
      // Call auth service login
      const result = await authService.login(credentials);
      
      // Validate result
      if (!result) {
        console.error('❌ Login returned null/undefined');
        set({ isLoading: false, isAuthenticated: false, user: null });
        throw new Error('❌ Login failed: No response from server. Please try again.');
      }
      
      if (!result.user) {
        console.error('❌ Login returned no user');
        set({ isLoading: false, isAuthenticated: false, user: null });
        throw new Error('❌ Login failed: No user returned. Please check your credentials.');
      }
      
      if (!result.session) {
        console.error('❌ Login returned no session');
        set({ isLoading: false, isAuthenticated: false, user: null });
        throw new Error('❌ Login failed: No session created. Please try again.');
      }
      
      console.log('✅ Login successful, setting user in store:', result.user.email, result.user.role);
      
      // Store user in localStorage first (before state update)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
        setCachedAuthCheck(result.user.id);
      } catch (storageError) {
        console.warn('⚠️ Storage write warning:', storageError);
        // Continue even if storage fails
      }
      
      // Update state synchronously - this is critical for immediate redirect
      set({ 
        user: result.user, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      console.log('✅ Auth store updated successfully');
      
      // Verify state was set correctly
      const verifyState = get();
      if (!verifyState.isAuthenticated || !verifyState.user) {
        console.error('❌ State verification failed after login');
        throw new Error('Login succeeded but state was not set correctly. Please refresh the page.');
      }
      
      return;
    } catch (error: any) {
      console.error('❌ Login error in store:', error);
      
      // Clear storage on error to prevent stale data
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(AUTH_CHECK_CACHE_KEY);
        sessionStorage.clear();
      } catch (storageError) {
        console.warn('⚠️ Storage clear error:', storageError);
      }
      
      set({ isLoading: false, isAuthenticated: false, user: null });
      
      // Re-throw the error with message
      throw error;
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
      
      // Step 1: Check localStorage first (instant, no network call)
      const storedUser = localStorage.getItem(STORAGE_KEY);
      let parsedUser: User | null = null;
      
      if (storedUser) {
        try {
          parsedUser = JSON.parse(storedUser);
          
          // Check if we have a recent cached auth check for this user
          const cachedCheck = getCachedAuthCheck();
          if (cachedCheck && cachedCheck.userId === parsedUser.id) {
            // Use cached result - user is still authenticated
            set({ user: parsedUser, isAuthenticated: true, isLoading: false });
            return;
          }
        } catch (parseError) {
          console.error('Error parsing stored user:', parseError);
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // Step 2: Single Supabase auth check (replaces multiple calls)
      // This is the only network call we make
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        // No authenticated user
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(AUTH_CHECK_CACHE_KEY);
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // Step 3: If we have a stored user matching auth, use it immediately
      if (parsedUser && parsedUser.id === authUser.id) {
        // Verify user profile still exists with a single optimized query
        try {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
            setCachedAuthCheck(currentUser.id);
            set({ user: currentUser, isAuthenticated: true, isLoading: false });
            return;
          }
        } catch (profileError) {
          console.warn('Profile fetch failed, but auth is valid:', profileError);
          // Auth is valid, use stored user (will refresh on next check)
          setCachedAuthCheck(parsedUser.id);
          set({ user: parsedUser, isAuthenticated: true, isLoading: false });
          return;
        }
      }

      // Step 4: Fetch fresh user profile (only if stored user doesn't match)
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
          setCachedAuthCheck(currentUser.id);
          set({ user: currentUser, isAuthenticated: true, isLoading: false });
        } else {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(AUTH_CHECK_CACHE_KEY);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(AUTH_CHECK_CACHE_KEY);
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error('Error in checkAuth:', error);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(AUTH_CHECK_CACHE_KEY);
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
