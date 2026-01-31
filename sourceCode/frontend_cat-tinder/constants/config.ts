import { Platform } from 'react-native';

// API Configuration
// Backend รันที่ localhost:5000
// ⚠️ สำคัญ: ใช้ localhost สำหรับ web, IP Address สำหรับ mobile
const getBaseUrl = () => {
  if (__DEV__) {
    // Development - ใช้ Platform-specific URLs
    if (Platform.OS === 'android') {
      return 'http://192.168.110.207:5000'; // Android Emulator
    }
    return 'http://192.168.110.207:5000'; // iOS Simulator / Physical Device
  }
  return 'https://your-production-api.com'; // Production
};

const BASE_URL = getBaseUrl();

export const API_URL = `${BASE_URL}/api`;
export const SOCKET_URL = BASE_URL; // Socket.IO connects to the base URL, not /api

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: '@pawmise_token',
  USER_ID: '@pawmise_user_id',
  THEME: '@pawmise_theme',
  SELECTED_CAT_FOR_MATCHING: '@pawmise_selected_cat_for_matching',
} as const;

// Pagination
export const DEFAULT_LIMIT = 20;
export const MESSAGES_LIMIT = 50;

// Image Upload
export const MAX_PHOTOS = 5;
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB


