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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { swipeAPI, catAPI } from '@/services/api';
import PinkButton from '@/components/PinkButton';
import CatViewModal from '@/components/CatViewModal';
import MatchModal from '@/components/MatchModal';
import type { Cat, Match } from '@/types';

export default function LikeScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [myCats, setMyCats] = useState<Cat[]>([]);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [interestsReceived, setInterestsReceived] = useState<any[]>([]);
  const [interestsSent, setInterestsSent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInterestCat, setSelectedInterestCat] = useState<Cat | null>(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCat) {
      loadInterests();
    }
  }, [selectedCat, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading cats data...');
      const catsResponse = await catAPI.getMyCats();
      console.log('📨 getMyCats response:', catsResponse);

      if (catsResponse?.status === 'ok' && catsResponse?.data?.length > 0) {
        console.log(`✅ Found ${catsResponse.data.length} cats`);
        setMyCats(catsResponse.data);
        setSelectedCat(catsResponse.data[0]); // Select first cat by default
        console.log('🎯 Selected cat:', catsResponse.data[0]);
      } else {
        console.log('❌ No cats found or invalid response');
      }
    } catch (error: any) {
      console.error('❌ Error loading cats:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลแมวได้');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadInterests = async () => {
    if (!selectedCat) {
      console.log('❌ No selected cat for loading interests');
      return;
    }

    console.log(`🔄 Loading interests for tab: ${activeTab}, catId: ${selectedCat._id}`);

    try {
      if (activeTab === 'received') {
        console.log('📞 Calling getLikesReceived...');
        const response = await swipeAPI.getLikesReceived(selectedCat._id);
        console.log('📨 getLikesReceived response:', response);
        if (response?.status === 'ok') {
          console.log(`✅ Found ${response.data?.length || 0} received interests`);
          setInterestsReceived(response.data || []);
        } else {
          console.log('❌ Invalid response status:', response?.status);
        }
      } else {
        console.log('📞 Calling getLikesSent...');
        const response = await swipeAPI.getLikesSent(selectedCat._id);
        console.log('📨 getLikesSent response:', response);
        if (response?.status === 'ok') {
          console.log(`✅ Found ${response.data?.length || 0} sent interests`);
          setInterestsSent(response.data || []);
        } else {
          console.log('❌ Invalid response status:', response?.status);
        }
      }
    } catch (error: any) {
      console.error('❌ Error loading interests:', error);
      console.error('❌ Error details:', error.response?.data);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleInterestTap = (interest: any) => {
    // Get the cat data based on whether it's received or sent interest
    const catData = activeTab === 'received' ? interest.swiperCatId : interest.targetCatId;

    if (catData) {
      setSelectedInterestCat(catData);
      setShowInterestModal(true);
    }
  };

  const handleCloseInterestModal = () => {
    setShowInterestModal(false);
    setSelectedInterestCat(null);
  };

  const handleCloseMatchModal = () => {
    setShowMatchModal(false);
    setCurrentMatch(null);

    // Refresh interests to remove matched items
    console.log('🔄 Match modal closed - refreshing interests');
    setTimeout(() => {
      loadInterests();
    }, 500);
  };

  const handleSendMessage = () => {
    setShowMatchModal(false);
    if (currentMatch?._id) {
      // Navigate to chat (you may need to add navigation here)
      console.log('💬 Navigate to chat with match:', currentMatch._id);
    }
    setCurrentMatch(null);
  };

  const handleViewLater = () => {
    setShowMatchModal(false);
    setCurrentMatch(null);
    // Navigate to messages tab (you may need to add navigation here)
    console.log('📱 Navigate to messages tab');
  };

  const handleLikeBack = async (targetCatId: string) => {
    if (!selectedCat) return;

    try {
      console.log('🔄 Attempting to interest back:', {
        swiperCatId: selectedCat._id,
        targetCatId: targetCatId,
        action: 'interested'
      });

      const response = await swipeAPI.createSwipe({
        swiperCatId: selectedCat._id,
        targetCatId: targetCatId,
        action: 'interested'
      });

      console.log('📨 Interest back response:', JSON.stringify(response, null, 2));

      // Check if it's a match
      if (response?.status === 'ok' && response?.data?.matched && response?.data?.match) {
        console.log('💕 MATCH FOUND! Showing MatchModal...');
        setCurrentMatch(response.data.match);
        setShowMatchModal(true);

        // Close interest modal if open
        setShowInterestModal(false);
        setSelectedInterestCat(null);
      } else {
        console.log('✅ Interest sent successfully (no match)');
        // Just show success message if no match
        Alert.alert('สำเร็จ!', 'สนใจกลับแล้ว ⭐');
      }

      // Refresh interests after liking back
      await loadInterests();
    } catch (error: any) {
      console.error('❌ Error liking back:', error);
      console.error('❌ Error response:', error.response?.data);

      // Handle specific error cases
      if (error.response?.data?.message?.includes('already swiped')) {
        Alert.alert('แจ้งเตือน', 'คุณได้แสดงความสนใจแมวนี้แล้ว');
      } else {
        Alert.alert('เกิดข้อผิดพลาด', error.response?.data?.message || 'ไม่สามารถแสดงความสนใจกลับได้');
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: colors.background }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
          กำลังโหลด...
        </Text>
      </SafeAreaView>
    );
  }

  if (myCats.length === 0) {
    return (
      <SafeAreaView
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: colors.background }}
      >
        <Ionicons name="heart-outline" size={64} color={colors.textSecondary} />
        <Text
          className="text-xl font-bold mt-4 mb-2 text-center"
          style={{ color: colors.text }}
        >
          ยังไม่มีแมว
        </Text>
        <Text
          className="text-base text-center mb-6"
          style={{ color: colors.textSecondary }}
        >
          เพิ่มแมวก่อนเพื่อดู likes ที่ได้รับ
        </Text>
        <PinkButton
          title="เพิ่มแมวแรก"
          onPress={() => {
            Alert.alert('Coming Soon', 'ฟีเจอร์เพิ่มแมวกำลังพัฒนา');
          }}
          size="large"
          variant="gradient"
        />
      </SafeAreaView>
    );
  }

  const currentInterests = activeTab === 'received' ? interestsReceived : interestsSent;

  // Debug logging for rendering
  console.log(`🎨 Rendering interests - Tab: ${activeTab}, Count: ${currentInterests.length}`);

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text
            className="text-2xl font-bold"
            style={{ color: colors.text }}
          >
            Interests 
          </Text>
          <Text
            className="text-sm mt-1"
            style={{ color: colors.textSecondary }}
          >
            ความสนใจพิเศษที่ได้รับและส่งไป
          </Text>
        </View>

        {/* Cat Selector */}
        {myCats.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="px-6 mb-4"
          >
            {myCats.map((cat) => (
              <TouchableOpacity
                key={cat._id}
                onPress={() => setSelectedCat(cat)}
                className="mr-4 items-center"
              >
                <View
                  className="w-16 h-16 rounded-full mb-2 justify-center items-center"
                  style={{
                    backgroundColor: selectedCat?._id === cat._id
                      ? colors.primary
                      : colors.primary + '20'
                  }}
                >
                  {cat.photos && cat.photos[0] ? (
                    <Image
                      source={{ uri: cat.photos[0].url }}
                      className="w-16 h-16 rounded-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons
                      name="heart"
                      size={24}
                      color={selectedCat?._id === cat._id ? 'white' : colors.primary}
                    />
                  )}
                </View>
                <Text
                  className="text-xs font-medium text-center"
                  style={{
                    color: selectedCat?._id === cat._id
                      ? colors.primary
                      : colors.textSecondary
                  }}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Tab Selector */}
        <View className="px-6 mb-6">
          <View
            className="flex-row rounded-2xl p-1"
            style={{ backgroundColor: colors.primary + '20' }}
          >
            <TouchableOpacity
              onPress={() => setActiveTab('received')}
              className="flex-1 py-3 px-4 rounded-xl"
              style={{
                backgroundColor: activeTab === 'received' ? colors.primary : 'transparent'
              }}
            >
              <Text
                className="text-center font-semibold"
                style={{
                  color: activeTab === 'received' ? 'white' : colors.primary
                }}
              >
                ได้รับ ({interestsReceived.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('sent')}
              className="flex-1 py-3 px-4 rounded-xl"
              style={{
                backgroundColor: activeTab === 'sent' ? colors.primary : 'transparent'
              }}
            >
              <Text
                className="text-center font-semibold"
                style={{
                  color: activeTab === 'sent' ? 'white' : colors.primary
                }}
              >
                ส่งไป ({interestsSent.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Interests List */}
        <View className="px-6">
          {currentInterests.length === 0 ? (
            <View className="items-center py-12">
              <Ionicons
                name={activeTab === 'received' ? 'star-outline' : 'star'}
                size={48}
                color={colors.textSecondary}
              />
              <Text
                className="text-lg font-medium mt-4 mb-2"
                style={{ color: colors.text }}
              >
                {activeTab === 'received' ? 'ยังไม่มีใครสนใจพิเศษ' : 'ยังไม่ได้ส่ง Interest'}
              </Text>
              <Text
                className="text-base text-center"
                style={{ color: colors.textSecondary }}
              >
                {activeTab === 'received'
                  ? 'เมื่อมีคนส่ง Interest ให้แมวของคุณ จะแสดงที่นี่'
                  : 'Interest พิเศษที่คุณส่งให้แมวอื่น ๆ จะแสดงที่นี่'
                }
              </Text>
            </View>
          ) : (
            <View>
              {currentInterests.map((interest, index) => (
                <TouchableOpacity
                  key={interest._id || index}
                  onPress={() => handleInterestTap(interest)}
                  className="rounded-3xl p-4 mb-4"
                  style={{
                    backgroundColor: isDark ? '#2a2a2a' : 'white',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <View className="flex-row items-center">
                    {/* Cat Photo */}
                    <View
                      className="w-16 h-16 rounded-full mr-4 justify-center items-center"
                      style={{ backgroundColor: '#f59e0b' + '20' }}
                    >
                      {interest.targetCatId?.photos?.[0] || interest.swiperCatId?.photos?.[0] ? (
                        <Image
                          source={{
                            uri: activeTab === 'received'
                              ? interest.swiperCatId?.photos?.[0]?.url
                              : interest.targetCatId?.photos?.[0]?.url
                          }}
                          className="w-16 h-16 rounded-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="star" size={24} color="#f59e0b" />
                      )}
                    </View>

                    {/* Cat Info */}
                    <View className="flex-1">
                      <Text
                        className="text-base font-bold"
                        style={{ color: colors.text }}
                      >
                        {activeTab === 'received'
                          ? interest.swiperCatId?.name
                          : interest.targetCatId?.name
                        } ⭐
                      </Text>
                      <Text
                        className="text-sm"
                        style={{ color: colors.textSecondary }}
                      >
                        {activeTab === 'received'
                          ? `สนใจพิเศษ ${selectedCat?.name}`
                          : `คุณส่ง Interest แล้ว`
                        }
                      </Text>
                      <Text
                        className="text-xs mt-1"
                        style={{ color: colors.textSecondary }}
                      >
                        {new Date(interest.createdAt).toLocaleDateString('th-TH')}
                      </Text>
                      <Text
                        className="text-xs mt-1"
                        style={{ color: colors.primary, fontStyle: 'italic' }}
                      >
                        👆 แตะเพื่อดูรายละเอียด
                      </Text>
                    </View>

                    {/* Action Button - only for received interests */}
                    {activeTab === 'received' && (
                      <TouchableOpacity
                        onPress={(event) => {
                          event.stopPropagation();
                          const targetId = interest.swiperCatId?._id || interest.swiperCatId;
                          console.log('🎯 Interest back target:', { targetId, interestData: interest });
                          handleLikeBack(targetId);
                        }}
                        className="px-4 py-2 rounded-full"
                        style={{ backgroundColor: '#f59e0b' }}
                      >
                        <Text className="text-white text-sm font-medium">
                          ⭐ สนใจกลับ
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Interest Detail Modal */}
      <CatViewModal
        visible={showInterestModal}
        cat={selectedInterestCat}
        onClose={handleCloseInterestModal}
        hideActions={activeTab === 'sent'} // Hide action buttons for sent interests
        onLike={() => {
          // Handle like from modal (only for received interests)
          if (selectedInterestCat) {
            handleLikeBack(selectedInterestCat._id);
            handleCloseInterestModal();
          }
        }}
        onInterested={() => {
          // Handle interest from modal (only for received interests)
          if (selectedInterestCat) {
            handleLikeBack(selectedInterestCat._id);
            handleCloseInterestModal();
          }
        }}
        onPass={() => {
          // Just close modal for pass
          handleCloseInterestModal();
        }}
      />

      {/* Match Modal */}
      <MatchModal
        visible={showMatchModal}
        match={currentMatch}
        onClose={handleCloseMatchModal}
        onSendMessage={handleSendMessage}
      />
    </SafeAreaView>
  );
}