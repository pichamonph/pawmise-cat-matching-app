// app/(tabs)/home.tsx - แก้ไข default export
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { catAPI, swipeAPI } from '@/services/api';
import { STORAGE_KEYS } from '@/constants/config';
import { Cat, Match, CatFeedResponse, SwipeResponse } from '@/types';
import SwipeableCard from '@/components/SwipeableCard';
import MatchModal from '@/components/MatchModal';
import CatViewModal from '@/components/CatViewModal';

function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Cat[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [myCatId, setMyCatId] = useState<string | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  const [matchingMode, setMatchingMode] = useState<string>('');
  const [matchingStats, setMatchingStats] = useState<any>(null);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [showCatDetailModal, setShowCatDetailModal] = useState(false);

  useEffect(() => {
    loadCatFeed();
  }, []);

  const loadCatFeed = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading cat feed...');

      // First check user's cats to determine the selection strategy
      const myCatsResponse = await catAPI.getMyCats();
      console.log('🐱 My cats response:', myCatsResponse);

      if (!myCatsResponse || myCatsResponse.status !== 'ok' || !myCatsResponse.data) {
        throw new Error('Failed to get user cats');
      }

      const myCats = myCatsResponse.data;
      console.log(`🐱 Found ${myCats.length} cats`);

      // Handle the 3 cases
      let selectedCatId = null;

      if (myCats.length === 0) {
        // Case 1: No cats - show alert and redirect to add cat
        console.log('❌ No cats found');
        Alert.alert(
          'ไม่มีแมว',
          'คุณต้องเพิ่มแมวก่อนเริ่มหาคู่',
          [
            {
              text: 'เพิ่มแมว',
              onPress: () => router.push('/(auth)/add-cat'),
            },
            { text: 'ภายหลัง', style: 'cancel' },
          ]
        );
        return;

      } else if (myCats.length === 1) {
        // Case 2: Only 1 cat - auto select
        selectedCatId = myCats[0]._id;
        console.log('🎯 Auto-selected single cat:', selectedCatId);
        await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CAT_FOR_MATCHING, selectedCatId);

      } else {
        // Case 3: Multiple cats - check if user has previously selected one
        const storedCatId = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CAT_FOR_MATCHING);
        console.log('🎯 Stored cat for matching:', storedCatId);

        // Verify the stored cat still exists and is active
        if (storedCatId) {
          const storedCat = myCats.find((cat: Cat) => cat._id === storedCatId && cat.active);
          if (storedCat) {
            selectedCatId = storedCatId;
            console.log('✅ Using stored cat:', selectedCatId);
          } else {
            console.log('❌ Stored cat not found or inactive, clearing selection');
            await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_CAT_FOR_MATCHING);
          }
        }

        // If no valid selection, prompt user to select
        if (!selectedCatId) {
          console.log('🤔 No cat selected, redirecting to profile for selection');
          Alert.alert(
            'เลือกแมวสำหรับหาคู่',
            'คุณมีแมวหลายตัว กรุณาเลือกแมวที่ต้องการนำไปหาคู่',
            [
              {
                text: 'ไปเลือกแมว',
                onPress: () => router.push('/(tabs)/profile'),
              },
              { text: 'ภายหลัง', style: 'cancel' },
            ]
          );
          return;
        }
      }

      // Now load cat feed with selected cat
      const params: any = { limit: 20 };
      if (selectedCatId) {
        params.catId = selectedCatId;
      }

      console.log('🔄 Loading feed with params:', params);
      const response = await catAPI.getFeed(params);
      console.log('📨 Cat feed response:', response);

      // Extract cats data
      if (response && response.status === 'ok' && response.data) {
        const { cats = [], myCatId, matchingMode, matchingStats } = response.data;
        console.log(`✅ Loaded ${cats.length} cats, myCatId:`, myCatId);
        console.log(`🎯 Matching mode: ${matchingMode}`);

        if (matchingStats) {
          console.log(`📊 Matching stats:`, matchingStats);
        }

        // ✅ Debug: Show more details about the response
        if (cats.length === 0) {
          console.log('⚠️ No cats found in feed');
          console.log('🔍 Feed response data:', JSON.stringify(response.data, null, 2));
        } else {
          console.log('📋 Sample cat data:', JSON.stringify(cats[0], null, 2));
          // Show distance info if available
          const catsWithDistance = cats.filter((cat: Cat) => cat.distance);
          if (catsWithDistance.length > 0) {
            console.log(`📏 Distance info: ${catsWithDistance.length} cats with GPS distance`);
          }
        }

        // Remove duplicates and set cats
        const uniqueCats = cats.filter((cat: Cat, index: number, self: Cat[]) =>
          index === self.findIndex((c: Cat) => c._id === cat._id)
        );
        console.log(`🔍 Filtered ${cats.length} cats to ${uniqueCats.length} unique cats`);
        setCats(uniqueCats);
        setMyCatId(myCatId);
        setMatchingMode(matchingMode || 'flexible');
        setMatchingStats(matchingStats);

        // ✅ Enhanced message based on matching stats
        if (cats.length === 0) {
          let message = 'ไม่มีแมวในระบบที่เหมาะสมสำหรับการหาคู่ในขณะนี้';

          if (matchingStats && matchingStats.rejected > 0) {
            message = `มีแมว ${matchingStats.rejected} ตัว แต่อยู่ไกลเกินกว่าจะหาคู่ได้`;
          }

          Alert.alert(
            'ไม่มีแมวให้ดู',
            message,
            [
              {
                text: 'ตรวจสอบแมวของฉัน',
                onPress: () => router.push('/(tabs)/profile')
              },
              { text: 'ตกลง', style: 'cancel' }
            ]
          );
        }
      } else if (response && response.status === 'error') {
        console.log('❌ API Error:', response.message);

        // If error is about selected cat, ask user to select a cat in profile
        if (response.message?.includes('Cat not found') || response.message?.includes('แมวไม่พบ')) {
          Alert.alert(
            'กรุณาเลือกแมวสำหรับหาคู่',
            'แมวที่เลือกไว้ไม่พบ กรุณาไปเลือกแมวใหม่ในหน้าโปรไฟล์',
            [
              {
                text: 'ไปหน้าโปรไฟล์',
                onPress: () => router.push('/(tabs)/profile'),
              },
              { text: 'ภายหลัง', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert(
            'เพิ่มแมวของคุณ',
            response.message || 'คุณต้องเพิ่มโปรไฟล์แมวก่อนเริ่มหาคู่',
            [
              {
                text: 'เพิ่มแมว',
                onPress: () => router.push('/(auth)/add-cat'),
              },
              { text: 'ภายหลัง', style: 'cancel' },
            ]
          );
        }
      }
    } catch (error: any) {
      console.error('❌ Load cat feed error:', error);

      if (error.response && error.response.status === 404) {
        const errorMessage = error.response?.data?.message || 'คุณต้องเพิ่มโปรไฟล์แมวก่อนเริ่มหาคู่';

        if (errorMessage.includes('Cat not found') || errorMessage.includes('แมวไม่พบ')) {
          Alert.alert(
            'กรุณาเลือกแมวสำหรับหาคู่',
            'แมวที่เลือกไว้ไม่พบ กรุณาไปเลือกแมวใหม่ในหน้าโปรไฟล์',
            [
              {
                text: 'ไปหน้าโปรไฟล์',
                onPress: () => router.push('/(tabs)/profile'),
              },
              { text: 'ภายหลัง', style: 'cancel' },
            ]
          );
        } else {
          Alert.alert(
            'เพิ่มแมวของคุณ',
            errorMessage,
            [
              {
                text: 'เพิ่มแมว',
                onPress: () => router.push('/(auth)/add-cat'),
              },
              { text: 'ภายหลัง', style: 'cancel' },
            ]
          );
        }
      } else {
        Alert.alert(
          'ข้อผิดพลาด',
          'ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ',
          [
            {
              text: 'ลองใหม่',
              onPress: () => loadCatFeed(),
            },
            { text: 'ภายหลัง', style: 'cancel' },
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (targetCatId: string, action: 'like' | 'interested' | 'pass') => {
    if (!myCatId) {
      Alert.alert('ข้อผิดพลาด', 'ไม่พบข้อมูลแมวของคุณ');
      return;
    }

    try {
      console.log(`🔄 Swiping ${action} on cat:`, targetCatId);
      console.log(`🔄 My cat ID:`, myCatId);

      const response = await swipeAPI.createSwipe({
        swiperCatId: myCatId,
        targetCatId,
        action,
      });

      console.log(`📨 Swipe response received:`, JSON.stringify(response, null, 2));

      if (response && response.status === 'ok' && response.data) {
        console.log(`✅ Swipe response data:`, {
          matched: response.data.matched,
          hasMatch: !!response.data.match,
          matchId: response.data.match?._id
        });

        // 🔍 TEMPORARY DEBUG for match issue
        console.log('🔍 MATCH DEBUG - Full response:', JSON.stringify(response, null, 2));
        console.log('🔍 MATCH DEBUG - Keys in response.data:', response.data ? Object.keys(response.data) : 'no data');
        console.log('🔍 MATCH DEBUG - matched:', response.data.matched);
        console.log('🔍 MATCH DEBUG - match object:', response.data.match);
        console.log('🔍 MATCH DEBUG - match exists:', !!response.data.match);

        // Check if it's a match
        const isMatch = response.data.matched && response.data.match;
        console.log('🔍 MATCH DEBUG - isMatch result:', isMatch);

        if (isMatch) {
          console.log('🔍 MATCH DEBUG - Setting modal to show');
          setCurrentMatch(response.data.match);
          setShowMatchModal(true);
          // 🔍 IMPORTANT: Don't move currentIndex yet - wait until modal is closed
        } else {
          console.log('🔍 MATCH DEBUG - No match will be shown because:');
          console.log('  - matched:', response.data.matched);
          console.log('  - match exists:', !!response.data.match);

          // Move to next card only if no match
          setCurrentIndex((prev) => prev + 1);

          // If this was an interest swipe and NOT a match, reload the feed to ensure swiped cat is removed
          if (action === 'interested') {
            console.log('🔄 Interest swipe completed (no match) - refreshing feed to remove swiped cat');
            setTimeout(() => {
              loadCatFeed();
            }, 1000); // Small delay for better UX
          }

          // Load more cats if running low (only when no match)
          if (currentIndex >= cats.length - 3) {
            loadMoreCats();
          }
        }
      } else {
        console.log('❌ Invalid response format:', response);
      }
    } catch (error: any) {
      console.error('❌ Swipe error:', error);
      console.error('❌ Error details:', error.response?.data);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกการ swipe ได้');
    }
  };

  const handleSwipeLeft = () => {
    const currentCat = cats[currentIndex];
    if (currentCat) {
      handleSwipe(currentCat._id, 'pass');
    }
  };

  const handleSwipeRight = () => {
    const currentCat = cats[currentIndex];
    if (currentCat) {
      handleSwipe(currentCat._id, 'like');
    }
  };

  const handleSwipeUp = async () => {
    const currentCat = cats[currentIndex];
    if (!currentCat || !myCatId) return;

    try {
      // Check daily interest limit first (per cat)
      const interestStatus = await swipeAPI.getInterestStatus(myCatId);

      if (interestStatus?.status === 'ok' && interestStatus?.data?.hasUsedToday) {
        const catName = interestStatus.data.catName || 'แมวของคุณ';
        Alert.alert(
          'หมดสิทธิ์ Interest วันนี้ ⭐',
          `${catName} ใช้ Interest ไปแล้ว 1 ครั้งวันนี้\nกลับมาใช้ใหม่พรุ่งนี้นะ`,
          [{ text: 'เข้าใจแล้ว', style: 'default' }]
        );
        return;
      }

      // If still has uses left, proceed with interest
      handleSwipe(currentCat._id, 'interested');
    } catch (error) {
      console.error('❌ Error checking interest status:', error);
      // If error checking status, still allow the swipe (backend will handle the limit)
      handleSwipe(currentCat._id, 'interested');
    }
  };

  const loadMoreCats = async () => {
    try {
      console.log('🔄 Loading more cats...');

      // Check if we still have a valid selected cat
      const myCatsResponse = await catAPI.getMyCats();
      if (!myCatsResponse || myCatsResponse.status !== 'ok' || !myCatsResponse.data) {
        console.log('❌ Cannot load more cats - failed to get user cats');
        return;
      }

      const myCats = myCatsResponse.data;
      const activeCats = myCats.filter((cat: Cat) => cat.active);

      if (activeCats.length === 0) {
        console.log('❌ No active cats for loading more');
        return;
      }

      let selectedCatId = null;
      if (activeCats.length === 1) {
        selectedCatId = activeCats[0]._id;
      } else {
        const savedCatId = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CAT_FOR_MATCHING);
        if (savedCatId && activeCats.find((cat: Cat) => cat._id === savedCatId)) {
          selectedCatId = savedCatId;
        }
      }

      if (!selectedCatId) {
        console.log('❌ No valid cat selected for loading more');
        return;
      }

      const params = { limit: 10, catId: selectedCatId };
      const response = await catAPI.getFeed(params);
      if (response && response.status === 'ok' && response.data) {
        const { cats = [], matchingMode, matchingStats } = response.data;

        // Merge with existing cats and remove duplicates
        setCats((prev) => {
          const merged = [...prev, ...cats];
          const uniqueCats = merged.filter((cat: Cat, index: number, self: Cat[]) =>
            index === self.findIndex((c: Cat) => c._id === cat._id)
          );
          console.log(`🔍 Load more: merged ${merged.length} cats to ${uniqueCats.length} unique cats`);
          return uniqueCats;
        });

        if (matchingMode) setMatchingMode(matchingMode);
        if (matchingStats) setMatchingStats(matchingStats);
      }
    } catch (error) {
      console.error('❌ Load more cats error:', error);
    }
  };

  const handleCloseMatchModal = () => {
    setShowMatchModal(false);
    setCurrentMatch(null);

    // ✅ Move to next card after closing match modal
    setCurrentIndex((prev) => prev + 1);
    console.log('🔄 Match modal closed - moving to next cat');
  };

  const handleSendMessage = () => {
    setShowMatchModal(false);
    if (currentMatch?._id) {
      router.push({
        pathname: '/chat/[matchId]',
        params: { matchId: currentMatch._id },
      });
    }
    setCurrentMatch(null);

    // ✅ Move to next card after going to chat
    setCurrentIndex((prev) => prev + 1);
    console.log('🔄 Navigating to chat - moving to next cat');
  };

  const handleCatTap = () => {
    const currentCat = cats[currentIndex];
    if (currentCat) {
      setSelectedCat(currentCat);
      setShowCatDetailModal(true);
    }
  };


  const handleRefresh = () => {
    setCurrentIndex(0);
    loadCatFeed();
  };

  if (loading) {
    return (
      <View
        className="flex-1 justify-center items-center px-8"
        style={{ backgroundColor: colors.background }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          className="mt-4 text-base"
          style={{ color: colors.textSecondary }}
        >
          กำลังโหลดแมวน่ารัก...
        </Text>
      </View>
    );
  }

  // No more cats available
  if (currentIndex >= cats.length) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: colors.background }}
      >
        <View className="flex-1 justify-center items-center px-8">
          <Text
            className="text-3xl font-bold mb-4 text-center"
            style={{ color: colors.text }}
          >
            ไม่มีแมวให้ดูแล้ว
          </Text>
          <Text
            className="text-base text-center leading-6 mb-8"
            style={{ color: colors.textSecondary }}
          >
            คุณได้ดูโปรไฟล์แมวทั้งหมดในพื้นที่ของคุณแล้ว{'\n'}
            ลองกลับมาดูใหม่ภายหลัง
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            className="px-8 py-4 rounded-full mt-4"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white text-lg font-semibold">รีเฟรช</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      {/* Header */}
      <View className="px-6 py-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text
            className="text-3xl font-bold"
            style={{ color: colors.primary }}
          >
            Pawmise
          </Text>
          <View className="flex-row items-center gap-4">
            <Text
              className="text-base font-medium"
              style={{ color: colors.textSecondary }}
            >
              {currentIndex + 1} / {cats.length}
            </Text>

          </View>
        </View>

        {/* Matching Info */}
        {matchingMode && (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="px-3 py-1 rounded-full" style={{ backgroundColor: colors.primary + '20' }}>
                <Text className="text-xs font-medium" style={{ color: colors.primary }}>
                  {matchingMode === 'flexible' && '🎯 ยืดหยุ่น'}
                  {matchingMode === 'strict' && '📍 GPS เท่านั้น'}
                  {matchingMode === 'province' && '🗺️ จังหวัดเดียวกัน'}
                  {matchingMode === 'unlimited' && '🌍 ไม่จำกัดระยะ'}
                </Text>
              </View>
            </View>

            {matchingStats && (
              <View className="flex-row items-center gap-2">
                {matchingStats.gpsMatch > 0 && (
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    📍 {matchingStats.gpsMatch}
                  </Text>
                )}
                {matchingStats.provinceMatch > 0 && (
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    🗺️ {matchingStats.provinceMatch}
                  </Text>
                )}
                {matchingStats.unlimitedMatch > 0 && (
                  <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    🌍 {matchingStats.unlimitedMatch}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Cards Container */}
      <View className="flex-1 justify-center items-center pb-24">
        {cats
          .slice(currentIndex, currentIndex + 3)
          .reverse()
          .map((cat, index, array) => {
            const reverseIndex = array.length - 1 - index;
            const absoluteIndex = currentIndex + index;
            return (
              <SwipeableCard
                key={`${cat._id}-${absoluteIndex}-${reverseIndex}`}
                cat={cat}
                onSwipeLeft={handleSwipeLeft}
                onSwipeUp={handleSwipeUp}
                onSwipeRight={handleSwipeRight}
                onTap={handleCatTap}
                isFirst={reverseIndex === 0}
              />
            );
          })}
      </View>

      {/* Match Modal */}
      <MatchModal
        visible={showMatchModal}
        match={currentMatch}
        onClose={handleCloseMatchModal}
        onSendMessage={handleSendMessage}
      />

      {/* Cat Detail Modal */}
      <CatViewModal
        visible={showCatDetailModal}
        cat={selectedCat}
        onClose={() => {
          setShowCatDetailModal(false);
          setSelectedCat(null);
        }}
        onLike={() => {
          const currentCat = cats[currentIndex];
          if (currentCat) {
            handleSwipe(currentCat._id, 'like');
          }
        }}
        onInterested={() => {
          const currentCat = cats[currentIndex];
          if (currentCat) {
            handleSwipe(currentCat._id, 'interested');
          }
        }}
        onPass={() => {
          const currentCat = cats[currentIndex];
          if (currentCat) {
            handleSwipe(currentCat._id, 'pass');
          }
        }}
      />
    </SafeAreaView>
  );
}

// ✅ ต้องมี default export
export default HomeScreen;