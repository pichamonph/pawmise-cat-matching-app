export interface Location {
  province: string;
  district?: string;
  lat: number;
  lng: number;
}

export interface Owner {
  _id: string;
  email: string;
  username: string;
  phone?: string;
  avatar: {
    url: string;
    publicId?: string;
  };
  location?: Location;
  onboardingCompleted: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  url: string;
  publicId: string;
}

export interface Cat {
  _id: string;
  ownerId: Owner;
  name: string;
  gender: 'male' | 'female';
  ageYears: number;
  ageMonths: number;
  breed: string;
  color?: string;
  traits: string[];
  photos: Photo[];
  readyForBreeding: boolean;
  vaccinated: boolean;
  neutered: boolean;
  notes?: string;
  location?: Location;
  active: boolean;
  distance?: number; // For nearby cats
  matchReason?: string; // Reason for match compatibility
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  _id: string;
  catAId: Cat;
  ownerAId: Owner;
  catBId: Cat;
  ownerBId: Owner;
  lastMessage?: string; // Last message text
  lastMessageAt?: string; // Last message timestamp
  unreadCount?: number; // Number of unread messages
  createdAt: string;
}

export interface Message {
  _id: string;
  matchId: string;
  senderId?: string; // For easier comparison with user ID (deprecated, use senderOwnerId)
  senderOwnerId: string | Owner; // Backend field - can be populated or just ID
  text: string;
  read: boolean;
  sentAt: string; // Backend uses sentAt as createdAt
  createdAt?: string; // Alternative timestamp field
}

export interface Swipe {
  _id: string;
  swiperOwnerId: string;
  swiperCatId: string;
  targetCatId: Cat;
  action: 'like' | 'interested' | 'pass';
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  status: 'ok' | 'error';
  message?: string;
  data?: T;
  errors?: any[];
}

export interface CatFeedResponse extends ApiResponse {
  data?: {
    cats: Cat[];
    myCatId: string;
  };
}

export interface SwipeResponse extends ApiResponse {
  data?: {
    swipe: Swipe;
    matched: boolean;
    match?: Match;
  };
}

// Form Types
export interface RegisterData {
  email: string;
  password: string;
  username: string;
  phone?: string;
  avatar: string; // URI string for React Native
  location: Location;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface CreateCatData {
  name: string;
  gender: 'male' | 'female';
  ageYears: number;
  ageMonths: number;
  breed: string;
  color?: string;
  traits: string[];
  photos: string[]; // URI strings for React Native
  vaccinated: boolean;
  notes?: string;
}