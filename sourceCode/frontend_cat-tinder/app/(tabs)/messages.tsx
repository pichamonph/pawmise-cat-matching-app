// app/(tabs)/messages.tsx - Matches and Messages screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { globalEvents } from '@/utils/eventEmitter';
import { matchAPI } from '@/services/api';
import type { Match } from '@/types';

export default function MessagesScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMatches();
  }, []);

  // Listen for new messages to update last message in list
  useEffect(() => {
    const handleMessageReceived = (message: any, matchId: string) => {
      console.log('📨 New message received for match:', matchId);

      // Update the match with new last message
      setMatches(prev => prev.map(match => {
        if (match._id === matchId) {
          return {
            ...match,
            lastMessage: message.text,
            lastMessageAt: message.sentAt || message.createdAt,
            // Don't update unreadCount here as it should be handled by backend
          };
        }
        return match;
      }));
    };

    globalEvents.on('message:received', handleMessageReceived);

    return () => {
      globalEvents.off('message:received', handleMessageReceived);
    };
  }, []);


  const loadMatches = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading matches...');

      const response = await matchAPI.getMatches({ limit: 50 });
      console.log('📨 Matches response:', response);

      // Backend ส่ง data.matches แทน data โดยตรง
      if (response?.status === 'ok' && response?.data?.matches && Array.isArray(response.data.matches)) {
        console.log(`✅ Found ${response.data.matches.length} matches`);
        setMatches(response.data.matches);
      } else {
        console.log('❌ No matches found or invalid response');
        console.log('📨 Response structure:', response);
        setMatches([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading matches:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูล matches ได้');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMatches();
  };

  const handleMatchPress = (match: Match) => {
    // Navigate to individual chat
    router.push({
      pathname: '/chat/[matchId]',
      params: { matchId: match._id }
    });
  };

  const getOtherCat = (match: Match) => {
    if (!user) return match.catBId; // fallback

    // ตรวจสอบว่า cat ไหนเป็นของ current user โดยใช้ ownerAId/ownerBId
    const isCatAMine = match.ownerAId._id === user._id;

    // return cat ของอีกฝ่าย
    return isCatAMine ? match.catBId : match.catAId;
  };

  const formatLastMessageTime = (date: string) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return messageDate.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short'
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
            กำลังโหลด matches...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
        <Text style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: colors.text,
        }}>
          Messages 
        </Text>
        <Text style={{
          fontSize: 16,
          color: colors.textSecondary,
          marginTop: 4,
        }}>
          แชทกับ matches ของคุณ
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {matches.length === 0 ? (
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 100,
            paddingHorizontal: 20,
          }}>
            <Ionicons name="heart-outline" size={64} color={colors.textSecondary} />
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: colors.text,
              textAlign: 'center',
              marginTop: 16,
              marginBottom: 8,
            }}>
              ยังไม่มี Matches
            </Text>
            <Text style={{
              fontSize: 16,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            }}>
              เมื่อคุณได้ match กับใครแล้ว{'\n'}
              จะมาแสดงที่นี่เพื่อเริ่มแชท
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {matches.map((match, index) => {
              const otherCat = getOtherCat(match);

              return (
                <TouchableOpacity
                  key={match._id}
                  onPress={() => handleMatchPress(match)}
                  style={{
                    backgroundColor: isDark ? '#2a2a2a' : 'white',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  {/* Cat Photo */}
                  <View style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    overflow: 'hidden',
                    marginRight: 16,
                    backgroundColor: colors.primary + '20',
                  }}>
                    {otherCat.photos && otherCat.photos[0] ? (
                      <Image
                        source={{ uri: otherCat.photos[0].url }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{
                        width: '100%',
                        height: '100%',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="heart" size={24} color={colors.primary} />
                      </View>
                    )}
                  </View>

                  {/* Match Info */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{
                        fontSize: 18,
                        fontWeight: 'bold',
                        color: colors.text,
                        flex: 1,
                      }}>
                        {otherCat.name}
                      </Text>
                      {match.lastMessageAt && (
                        <Text style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                        }}>
                          {formatLastMessageTime(match.lastMessageAt)}
                        </Text>
                      )}
                    </View>

                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {match.lastMessage || 'เริ่มการสนทนา...'}
                    </Text>
                  </View>

                  {/* New message indicator */}
                  {match.unreadCount && match.unreadCount > 0 && (
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: colors.primary,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginLeft: 12,
                    }}>
                      <Text style={{
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 'bold',
                      }}>
                        {match.unreadCount > 9 ? '9+' : match.unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}