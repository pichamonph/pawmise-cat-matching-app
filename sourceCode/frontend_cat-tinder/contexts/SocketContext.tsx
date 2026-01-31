// contexts/SocketContext.tsx - Real-time Socket.IO context
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { SOCKET_URL, STORAGE_KEYS } from '../constants/config';
import { globalEvents } from '@/utils/eventEmitter';
import type { Message, Match } from '@/types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinMatch: (matchId: string) => void;
  leaveMatch: (matchId: string) => void;
  sendMessage: (matchId: string, text: string) => void;
  markAsRead: (matchId: string) => void;
  startTyping: (matchId: string) => void;
  stopTyping: (matchId: string) => void;
}

interface SocketProviderProps {
  children: React.ReactNode;
  onMessageReceived?: (message: Message, matchId: string) => void;
  onNewMatch?: (match: Match) => void;
  onTypingUpdate?: (userId: string, matchId: string, isTyping: boolean) => void;
  onUserOnline?: (userId: string) => void;
  onUserOffline?: (userId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinMatch: () => {},
  leaveMatch: () => {},
  sendMessage: () => {},
  markAsRead: () => {},
  startTyping: () => {},
  stopTyping: () => {},
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  onMessageReceived,
  onNewMatch,
  onTypingUpdate,
  onUserOnline,
  onUserOffline
}) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const typingTimeoutRef = useRef<{ [matchId: string]: number }>({});
  const currentSocketRef = useRef<Socket | null>(null);

  const connectSocket = async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Prevent multiple connections
    if (currentSocketRef.current?.connected) {
      console.log('🔌 Socket already connected, skipping...');
      return;
    }

    // Cleanup any existing socket first
    if (currentSocketRef.current) {
      console.log('🧹 Cleaning up existing socket before reconnecting...');
      currentSocketRef.current.removeAllListeners();
      currentSocketRef.current.disconnect();
      currentSocketRef.current = null;
    }

    try {
      console.log('🔌 Connecting to socket server...');

      // Get JWT token for authentication
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      if (!token) {
        console.log('❌ No token found, cannot connect to socket');
        return;
      }

      // Create socket connection
      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        setIsConnected(true);
        globalEvents.emit('socket:connected');

        // Clear any pending reconnect timeout
        if (reconnectTimeoutRef.current !== null) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);
        globalEvents.emit('socket:disconnected');

        // Auto-reconnect if disconnected unexpectedly
        if (reason === 'io server disconnect' || reason === 'transport close') {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            newSocket.connect();
          }, 3000);
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        setIsConnected(false);
        globalEvents.emit('socket:disconnected');
      });

      // Message events
      newSocket.on('message:received', (data) => {
        console.log('📨 Message received from socket:', data);
        if (data.message && data.matchId) {
          // Emit global event for all listeners
          globalEvents.emit('message:received', data.message, data.matchId);
          // Also call callback if provided (for backward compatibility)
          if (onMessageReceived) {
            onMessageReceived(data.message, data.matchId);
          }
        }
      });

      // Match events
      newSocket.on('match:new', (data) => {
        console.log('💕 New match:', data);
        globalEvents.emit('match:new', data);
        if (onNewMatch && data.matchId) {
          onNewMatch(data);
        }
      });

      newSocket.on('match:joined', (data) => {
        console.log('✅ Joined match room:', data.matchId);
      });

      // Typing events
      newSocket.on('typing:user', (data) => {
        console.log('⌨️ Typing update from socket:', data);
        if (data.userId && data.matchId) {
          globalEvents.emit('typing:update', data.userId, data.matchId, data.isTyping);
          if (onTypingUpdate) {
            onTypingUpdate(data.userId, data.matchId, data.isTyping);
          }
        }
      });


      // Notification events
      newSocket.on('notification:new_message', (data) => {
        console.log('🔔 New message notification:', data);
        // Handle push notification if needed
      });

      // Error handling
      newSocket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      setSocket(newSocket);
      currentSocketRef.current = newSocket;

    } catch (error) {
      console.error('❌ Error connecting to socket:', error);
      setIsConnected(false);
    }
  };

  const disconnectSocket = () => {
    const socketToDisconnect = currentSocketRef.current || socket;

    if (socketToDisconnect) {
      console.log('🔌 Disconnecting socket...');

      // Clear typing timeouts
      Object.values(typingTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
      typingTimeoutRef.current = {};

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current !== null) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Remove all listeners and disconnect
      socketToDisconnect.removeAllListeners();
      socketToDisconnect.disconnect();

      // Clear both state and ref
      setSocket(null);
      currentSocketRef.current = null;
      setIsConnected(false);
    }
  };

  // Connect when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user]);

  // Listen for logout events
  useEffect(() => {
    const handleLogout = () => {
      console.log('🚪 User logout detected, disconnecting socket...');
      disconnectSocket();
    };

    globalEvents.on('user:logout', handleLogout);

    return () => {
      globalEvents.off('user:logout', handleLogout);
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated && user) {
        // Reconnect when app becomes active if disconnected
        console.log('📱 App became active');
        if (!currentSocketRef.current?.connected) {
          console.log('🔄 Reconnecting socket...');
          connectSocket();
        }
      } else if (nextAppState === 'background') {
        // Keep socket connected in background for real-time messages
        console.log('📱 App went to background (keeping socket connected)');
      } else if (nextAppState === 'inactive') {
        // App is transitioning, don't disconnect yet
        console.log('📱 App is inactive (transitioning)');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isAuthenticated, user]);

  // Socket methods
  const joinMatch = (matchId: string) => {
    const activeSocket = currentSocketRef.current;
    if (activeSocket && isConnected) {
      console.log('📥 Joining match:', matchId);
      activeSocket.emit('match:join', matchId);
    }
  };

  const leaveMatch = (matchId: string) => {
    const activeSocket = currentSocketRef.current;
    if (activeSocket && isConnected) {
      console.log('📤 Leaving match:', matchId);
      activeSocket.emit('match:leave', matchId);
    }
  };

  const sendMessage = (matchId: string, text: string) => {
    const activeSocket = currentSocketRef.current;
    if (activeSocket && isConnected && text.trim()) {
      console.log('📤 Sending message via socket:', { matchId, text });
      activeSocket.emit('message:send', { matchId, text: text.trim() });
    }
  };

  const markAsRead = (matchId: string) => {
    const activeSocket = currentSocketRef.current;
    if (activeSocket && isConnected) {
      console.log('👁️ Marking messages as read:', matchId);
      activeSocket.emit('message:read', { matchId });
    }
  };

  const startTyping = (matchId: string) => {
    const activeSocket = currentSocketRef.current;
    if (activeSocket && isConnected) {
      activeSocket.emit('typing:start', { matchId });

      // Auto-stop typing after 3 seconds
      if (typingTimeoutRef.current[matchId]) {
        clearTimeout(typingTimeoutRef.current[matchId]);
      }

      typingTimeoutRef.current[matchId] = setTimeout(() => {
        stopTyping(matchId);
      }, 3000);
    }
  };

  const stopTyping = (matchId: string) => {
    const activeSocket = currentSocketRef.current;
    if (activeSocket && isConnected) {
      activeSocket.emit('typing:stop', { matchId });

      if (typingTimeoutRef.current[matchId]) {
        clearTimeout(typingTimeoutRef.current[matchId]);
        delete typingTimeoutRef.current[matchId];
      }
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinMatch,
    leaveMatch,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};