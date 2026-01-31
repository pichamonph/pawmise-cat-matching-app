// app/chat/[matchId].tsx - Individual chat screen with real-time messaging
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { globalEvents } from '@/utils/eventEmitter';
import { matchAPI, messageAPI } from '@/services/api';
import type { Match, Message } from '@/types';

export default function ChatScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { socket, isConnected, joinMatch, leaveMatch, sendMessage: socketSendMessage, markAsRead, startTyping, stopTyping } = useSocket();
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<number>();

  // Global event handlers
  const handleMessageReceived = useCallback((message: Message, receivedMatchId: string) => {
    if (receivedMatchId === matchId) {
      console.log('📨 Real-time message received in chat:', message);
      setMessages(prev => {
        // Avoid duplicates
        const exists = prev.some(m => m._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });

      // Auto-scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [matchId]);

  const handleTypingUpdate = useCallback((userId: string, typingMatchId: string, isTyping: boolean) => {
    if (typingMatchId === matchId && userId !== user?._id) {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    }
  }, [matchId, user?._id]);


  // Set up global event listeners
  useEffect(() => {
    globalEvents.on('message:received', handleMessageReceived);
    globalEvents.on('typing:update', handleTypingUpdate);

    return () => {
      globalEvents.off('message:received', handleMessageReceived);
      globalEvents.off('typing:update', handleTypingUpdate);
    };
  }, [handleMessageReceived, handleTypingUpdate]);

  // Update connection status
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('Connected');
    } else {
      setConnectionStatus('Disconnected');
    }
  }, [isConnected]);

  // Load initial data and join match room
  useEffect(() => {
    if (matchId) {
      loadMatchAndMessages();
    }
  }, [matchId]);

  // Join/leave match room when socket connects
  useEffect(() => {
    if (matchId && isConnected) {
      console.log('🔌 Joining match room:', matchId);
      joinMatch(matchId);

      return () => {
        console.log('🔌 Leaving match room:', matchId);
        leaveMatch(matchId);
      };
    }
  }, [matchId, isConnected, joinMatch, leaveMatch]);

  const loadMatchAndMessages = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading match and messages for:', matchId);

      // Load match details
      const matchResponse = await matchAPI.getMatch(matchId!);
      console.log('📨 Match response:', matchResponse);

      if (matchResponse?.status === 'ok' && matchResponse?.data) {
        setMatch(matchResponse.data);
      }

      // Load messages
      const messagesResponse = await messageAPI.getMessages(matchId!, { limit: 100 });
      console.log('📨 Messages response:', messagesResponse);

      if (messagesResponse?.status === 'ok' && messagesResponse?.data && Array.isArray(messagesResponse.data)) {
        console.log(`✅ Loaded ${messagesResponse.data.length} messages`);
        setMessages(messagesResponse.data);
        // Mark messages as read
        await messageAPI.markAsRead(matchId!);
      } else {
        console.log('❌ Invalid messages response format');
        setMessages([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading chat:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลแชทได้');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !matchId || !isConnected) return;

    try {
      setSending(true);
      console.log('📤 Sending message via WebSocket:', newMessage);

      // Send message through WebSocket
      socketSendMessage(matchId, newMessage.trim());

      // Clear input and stop typing indicator
      setNewMessage('');
      stopTyping(matchId);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งข้อความได้');
    } finally {
      setSending(false);
    }
  };

  const handleTextChange = (text: string) => {
    setNewMessage(text);

    // Handle typing indicators
    if (text.trim() && matchId && isConnected) {
      startTyping(matchId);

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 1 second of no input
      typingTimeoutRef.current = setTimeout(() => {
        if (matchId) stopTyping(matchId);
      }, 1000);
    } else if (matchId && isConnected) {
      stopTyping(matchId);
    }
  };

  // Mark messages as read when entering the chat
  useEffect(() => {
    if (matchId && isConnected) {
      markAsRead(matchId);
    }
  }, [matchId, isConnected, markAsRead]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const getOtherCat = () => {
    if (!match || !user) return null;

    // ตรวจสอบว่า cat ไหนเป็นของ current user โดยใช้ ownerAId/ownerBId
    const isCatAMine = match.ownerAId._id === user._id;

    // return cat ของอีกฝ่าย
    return isCatAMine ? match.catBId : match.catAId;
  };

  const formatMessageTime = (date: string) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isMyMessage = (message: Message) => {
    if (!user) return false;

    // senderOwnerId อาจเป็น string (ID) หรือ object (populated Owner)
    const senderId = typeof message.senderOwnerId === 'string'
      ? message.senderOwnerId
      : message.senderOwnerId?._id;

    console.log('🔍 Checking message ownership:', {
      senderOwnerId: message.senderOwnerId,
      extractedSenderId: senderId,
      currentUserId: user._id,
      isMatch: senderId === user._id
    });

    return senderId === user._id;
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
            กำลังโหลดแชท...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const otherCat = getOtherCat();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: colors.text,
            }}>
              {otherCat?.name || 'Chat'}
            </Text>
            <Text style={{
              fontSize: 14,
              color: typingUsers.size > 0 ? colors.primary : colors.textSecondary,
            }}>
              {typingUsers.size > 0 ? 'กำลังพิมพ์...' : 'แชทส่วนตัว'}
            </Text>
          </View>

          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isConnected ? '#10b981' : '#ef4444',
            }} />
            <Text style={{
              fontSize: 10,
              color: colors.textSecondary,
              marginTop: 2,
            }}>
              {isConnected ? 'เชื่อมต่อ' : 'ขาดการเชื่อมต่อ'}
            </Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 60,
            }}>
              <Ionicons name="heart" size={48} color={colors.primary} />
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: colors.text,
                marginTop: 16,
                marginBottom: 8,
              }}>
                เริ่มการสนทนา! 💕
              </Text>
              <Text style={{
                fontSize: 16,
                color: colors.textSecondary,
                textAlign: 'center',
                lineHeight: 22,
              }}>
                คุณได้ match กับ {otherCat?.name} แล้ว{'\n'}
                ส่งข้อความทักทายกันเลย!
              </Text>
            </View>
          ) : (
            messages.map((message, index) => {
              const isMe = isMyMessage(message);
              const showTime = index === 0 ||
                (new Date(message.sentAt || message.createdAt).getTime() - new Date(messages[index - 1].sentAt || messages[index - 1].createdAt).getTime()) > 300000; // 5 minutes

              return (
                <View key={message._id}>
                  {showTime && (
                    <View style={{
                      alignItems: 'center',
                      marginVertical: 16,
                    }}>
                      <Text style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        backgroundColor: colors.border,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}>
                        {formatMessageTime(message.sentAt || message.createdAt)}
                      </Text>
                    </View>
                  )}

                  <View style={{
                    flexDirection: 'row',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    marginBottom: 8,
                  }}>
                    <View style={{
                      maxWidth: '80%',
                      backgroundColor: isMe ? colors.primary : (isDark ? '#3a3a3a' : '#f0f0f0'),
                      borderRadius: 18,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderBottomRightRadius: isMe ? 4 : 18,
                      borderBottomLeftRadius: isMe ? 18 : 4,
                    }}>
                      <Text style={{
                        fontSize: 16,
                        color: isMe ? 'white' : colors.text,
                        lineHeight: 20,
                      }}>
                        {message.text}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Message Input */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}>
          <View style={{
            flex: 1,
            backgroundColor: isDark ? '#3a3a3a' : '#f0f0f0',
            borderRadius: 24,
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginRight: 12,
            minHeight: 48,
          }}>
            <TextInput
              value={newMessage}
              onChangeText={handleTextChange}
              placeholder={isConnected ? "พิมพ์ข้อความ..." : "รอการเชื่อมต่อ..."}
              placeholderTextColor={colors.textSecondary}
              style={{
                color: colors.text,
                fontSize: 16,
                maxHeight: 100,
              }}
              multiline
              textAlignVertical="center"
              editable={isConnected}
            />
          </View>

          <TouchableOpacity
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending || !isConnected}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: (newMessage.trim() && isConnected) ? colors.primary : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={(newMessage.trim() && isConnected) ? 'white' : colors.textSecondary}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}