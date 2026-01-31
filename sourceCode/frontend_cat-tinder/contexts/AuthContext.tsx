import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '@/services/api';
import { STORAGE_KEYS } from '@/constants/config';
import { globalEvents } from '@/utils/eventEmitter';
import type { Owner } from '@/types';

interface AuthContextType {
  user: Owner | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Owner | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // Monitor authentication state changes
  useEffect(() => {
    console.log('🔄 Auth state changed:', {
      hasToken: !!token,
      hasUser: !!user,
      isAuthenticated: !!token && !!user,
      loading
    });
  }, [token, user, loading]);

  const checkAuth = async () => {
    try {
      console.log('🔍 Starting auth check...');
      
      const savedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const savedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      
      console.log('💾 Saved token exists:', !!savedToken);
      console.log('💾 Saved userId:', savedUserId);
      
      if (savedToken) {
        setToken(savedToken);
        try {
          console.log('🔍 Validating existing token...');
          const response = await authAPI.getCurrentUser();
          console.log('📨 getCurrentUser response:', response);
          
          const userData = extractUserData(response);
          console.log('🔍 Extracted user data:', userData);
          if (userData) {
            setUser(userData);
            console.log('✅ User authenticated and state set:', userData._id);
          } else {
            console.log('❌ Invalid user data, clearing storage...');
            await clearStorageAndLogout();
          }
        } catch (error: any) {
          console.log('❌ Token validation failed:', error.message);
          
          // ✅ Auto-handle deleted user case
          if (error.response?.status === 404) {
            console.log('🗑️ User not found (404) - likely deleted from database');
            console.log('🧹 Auto-clearing storage to allow fresh registration');
            await clearStorageAndLogout();
          } else if (error.response?.status === 401) {
            console.log('🔒 Token expired (401) - clearing storage');
            await clearStorageAndLogout();
          } else {
            console.log('❌ Other auth error:', error.response?.data || error.message);
            await clearStorageAndLogout();
          }
        }
      } else {
        console.log('💾 No saved token found - user needs to login');
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
      await clearStorageAndLogout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔄 Attempting login for:', email);
      
      const response = await authAPI.login({ email, password });
      console.log('📨 Login response:', response);

      const loginData = extractLoginData(response);
      if (!loginData || !loginData.token || !loginData.userId) {
        throw new Error('Invalid login response format');
      }

      const { token: newToken, userId } = loginData;

      // Save tokens
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
      setToken(newToken);

      console.log('✅ Token saved, fetching user data...');
      
      // Get user data
      const userResponse = await authAPI.getCurrentUser();
      const userData = extractUserData(userResponse);

      if (userData) {
        setUser(userData);
        console.log('✅ Login successful for user:', userData._id);
      } else {
        throw new Error('Failed to fetch user data');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      await clearStorageAndLogout();
      throw error;
    }
  };

  const register = async (data: any) => {
    try {
      console.log('🔄 Attempting register for:', data.email);
      
      const response = await authAPI.register(data);
      console.log('📨 Register response:', response);

      const registerData = extractLoginData(response);
      if (!registerData || !registerData.token || !registerData.userId) {
        throw new Error('Invalid registration response format');
      }

      const { token: newToken, userId } = registerData;

      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
      setToken(newToken);

      // Get user data after register
      const userResponse = await authAPI.getCurrentUser();
      const userData = extractUserData(userResponse);

      if (userData) {
        setUser(userData);
        console.log('✅ Registration successful for user:', userData._id);
      } else {
        throw new Error('Failed to fetch user data after registration');
      }
    } catch (error: any) {
      console.error('❌ Register error:', error);
      await clearStorageAndLogout();
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🔄 Logging out...');

      // Emit logout event to disconnect socket before API call
      globalEvents.emit('user:logout');

      // เรียก backend logout API (ไม่บังคับ แต่ดีสำหรับ security)
      try {
        await authAPI.logout();
        console.log('✅ Backend logout successful');
      } catch (apiError) {
        console.log('⚠️ Backend logout failed (continuing with local logout):', apiError);
        // ยังคงทำ local logout ต่อไป แม้ backend จะล้มเหลว
      }

      // ล้าง local storage และ state
      await clearStorageAndLogout();
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // ถ้าเกิดข้อผิดพลาด ยังคงพยายามล้าง local storage
      await clearStorageAndLogout();
    }
  };

  // ✅ Helper function สำหรับ clear storage อย่างสะอาด
  const clearStorageAndLogout = async () => {
    try {
      console.log('🧹 Clearing all auth storage...');
      await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER_ID]);
      setToken(null);
      setUser(null);
      console.log('✅ Storage cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
      // Force clear state even if AsyncStorage fails
      setToken(null);
      setUser(null);
    }
  };

  const isAuthenticated = !!token && !!user;

  // Debug log for authentication state
  console.log('🔍 AuthContext state:', {
    hasToken: !!token,
    hasUser: !!user,
    isAuthenticated,
    loading,
    userId: user?._id
  });

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAuthenticated,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ Helper functions for safe data extraction
function extractLoginData(response: any): { token: string; userId: string } | null {
  try {
    // Case 1: { status: 'ok', data: { token, userId } }
    if (response?.status === 'ok' && response?.data?.token && response?.data?.userId) {
      return {
        token: response.data.token,
        userId: response.data.userId
      };
    }
    
    // Case 2: { token, userId } directly
    if (response?.token && response?.userId) {
      return {
        token: response.token,
        userId: response.userId
      };
    }
    
    console.error('❌ Unexpected login response format:', response);
    return null;
  } catch (error) {
    console.error('❌ Error extracting login data:', error);
    return null;
  }
}

function extractUserData(response: any): Owner | null {
  try {
    // Case 1: { status: 'ok', data: user }
    if (response?.status === 'ok' && response?.data?._id) {
      return response.data as Owner;
    }
    
    // Case 2: user object directly
    if (response?._id && response?.email) {
      return response as Owner;
    }
    
    console.error('❌ Unexpected user response format:', response);
    return null;
  } catch (error) {
    console.error('❌ Error extracting user data:', error);
    return null;
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};