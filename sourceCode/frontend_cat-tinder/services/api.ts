// services/api.ts - แก้ไขการ import และ response interceptor
import axios, { AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, STORAGE_KEYS } from '../constants/config';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - เพิ่ม JWT token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// Response interceptor - ✅ แก้ไขให้ชัดเจน
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    console.log('📨 Response data:', response.data);

    // ✅ return เฉพาะ response.data เพื่อให้ได้โครงสร้างจาก backend API
    return response.data;
  },
  async (error) => {
    if (error.response?.status === 401) {
      console.log('🔐 Unauthorized - clearing tokens');
      await AsyncStorage.multiRemove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER_ID]);
    }
    
    console.error(`❌ ${error.response?.status || 'Network Error'} ${error.config?.url}`, 
      error.response?.data || error.message);
    
    return Promise.reject(error);
  }
);

// ========================================
// Authentication API with proper typing
// ========================================

export const authAPI = {
  register: async (data: {
    email: string;
    password: string;
    username: string;
    phone?: string;
    avatar: string; // File URI for React Native
    location: {
      province: string;
      lat: number;
      lng: number;
    };
  }) => {
    // Create FormData for avatar upload
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('username', data.username);
    if (data.phone) formData.append('phone', data.phone);
    formData.append('location[province]', data.location.province);
    formData.append('location[lat]', data.location.lat.toString());
    formData.append('location[lng]', data.location.lng.toString());

    // Add avatar file
    if (data.avatar) {
      const timestamp = Date.now();
      const filename = `avatar_${timestamp}.jpg`;

      const avatarFile: any = {
        uri: data.avatar,
        name: filename,
        type: 'image/jpeg',
      };

      formData.append('avatar', avatarFile);
    }

    return api.post('/auth/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60 seconds for file upload
    }) as Promise<any>;
  },

  login: async (data: { email: string; password: string }) => {
    return api.post('/auth/login', data) as Promise<any>;
  },

  getCurrentUser: async () => {
    return api.get('/auth/me') as Promise<any>;
  },

  logout: async () => {
    return api.post('/auth/logout') as Promise<any>;
  },
};

// ========================================
// Other APIs...
// ========================================

export const ownerAPI = {
  getProfile: () => api.get('/owners/profile') as Promise<any>,

  updateProfile: (data: {
    username?: string;
    phone?: string;
    avatar?: string; // File URI for React Native
    location?: {
      province: string;
      district?: string;
      lat: number;
      lng: number;
    };
  }) => {
    // Check if avatar update is included
    if (data.avatar) {
      // Create FormData for avatar upload
      const formData = new FormData();
      if (data.username) formData.append('username', data.username);
      if (data.phone) formData.append('phone', data.phone);
      if (data.location) {
        formData.append('location[province]', data.location.province);
        if (data.location.district) formData.append('location[district]', data.location.district);
        formData.append('location[lat]', data.location.lat.toString());
        formData.append('location[lng]', data.location.lng.toString());
      }

      // Add avatar file
      const timestamp = Date.now();
      const filename = `avatar_${timestamp}.jpg`;

      const avatarFile: any = {
        uri: data.avatar,
        name: filename,
        type: 'image/jpeg',
      };

      formData.append('avatar', avatarFile);

      return api.put('/owners/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 45000, // 45 seconds for file upload
      }) as Promise<any>;
    } else {
      // Regular JSON update without avatar
      const { avatar, ...updateData } = data;
      return api.put('/owners/profile', updateData) as Promise<any>;
    }
  },

  uploadAvatar: (avatar: string) => {
    const formData = new FormData();
    const timestamp = Date.now();
    const filename = `avatar_${timestamp}.jpg`;

    const avatarFile: any = {
      uri: avatar,
      name: filename,
      type: 'image/jpeg',
    };

    formData.append('avatar', avatarFile);

    return api.post('/owners/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 45000, // 45 seconds for file upload
    }) as Promise<any>;
  },

  completeOnboarding: (data: any) => api.post('/owners/onboarding', data) as Promise<any>,
};

export const catAPI = {
  getFeed: (params?: { catId?: string; limit?: number }) => {
    console.log('📤 Getting cat feed with params:', params);
    return api.get('/cats/feed', { params }) as Promise<any>;
  },

  getMyCats: () => api.get('/cats/my-cats') as Promise<any>,

  getCat: (id: string) => api.get(`/cats/${id}`) as Promise<any>,

  createCat: (data: FormData) => {
    console.log('📤 Creating cat with FormData');
    return api.post('/cats', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000, // 90 seconds for multiple photos
    }) as Promise<any>;
  },

  updateCat: (id: string, data: FormData) => {
    console.log('📤 Updating cat with ID:', id);

    return api.put(`/cats/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000, // 90 seconds for multiple photos
    }) as Promise<any>;
  },

  deleteCat: (id: string) => api.delete(`/cats/${id}`) as Promise<any>,
};

export const swipeAPI = {
  createSwipe: (data: {
    swiperCatId: string;
    targetCatId: string;
    action: 'like' | 'interested' | 'pass';
  }) => {
    return api.post('/swipes', data) as Promise<any>;
  },

  getLikesSent: (catId: string) => api.get(`/swipes/likes-sent/${catId}`) as Promise<any>,

  getLikesReceived: (catId: string) => api.get(`/swipes/likes-received/${catId}`) as Promise<any>,

  getInterestStatus: (catId: string) => api.get(`/swipes/interest-status/${catId}`) as Promise<any>,

  resetInterestUsage: (catId: string) => api.delete(`/swipes/interest-status/${catId}`) as Promise<any>,

  resetAllInterestUsage: () => api.delete('/swipes/interest-status-all') as Promise<any>,
};

export const matchAPI = {
  getMatches: (params?: { limit?: number; skip?: number }) =>
    api.get('/matches', { params }) as Promise<any>,

  getMatch: (id: string) => api.get(`/matches/${id}`) as Promise<any>,

  deleteMatch: (id: string) => api.delete(`/matches/${id}`) as Promise<any>,
};

export const messageAPI = {
  getMessages: (matchId: string, params?: { limit?: number; before?: string }) =>
    api.get(`/messages/${matchId}`, { params }) as Promise<any>,

  sendMessage: (data: { matchId: string; text: string }) =>
    api.post('/messages', data) as Promise<any>,

  markAsRead: (matchId: string) => api.put(`/messages/${matchId}/read`) as Promise<any>,
};

export default api;