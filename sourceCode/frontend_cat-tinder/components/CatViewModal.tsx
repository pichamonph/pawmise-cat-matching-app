// components/CatViewModal.tsx - Modal สำหรับดูรายละเอียดแมวและเจ้าของ
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { swipeAPI } from '@/services/api';
import { Cat } from '@/types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CatViewModalProps {
  visible: boolean;
  cat: Cat | null;
  onClose: () => void;
  onLike: () => void;
  onInterested: () => void;
  onPass: () => void;
  hideActions?: boolean; // Hide action buttons (for sent interests)
}

export default function CatViewModal({
  visible,
  cat,
  onClose,
  onLike,
  onInterested,
  onPass,
  hideActions = false,
}: CatViewModalProps) {
  const { colors, isDark } = useTheme();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  if (!cat) return null;

  const getAge = () => {
    if (cat.ageYears > 0) {
      return cat.ageMonths > 0
        ? `${cat.ageYears} ปี ${cat.ageMonths} เดือน`
        : `${cat.ageYears} ปี`;
    }
    return `${cat.ageMonths} เดือน`;
  };

  const handleLike = () => {
    onLike();
    onClose();
  };

  const handleInterested = async () => {
    try {
      // Check daily interest limit first
      const interestStatus = await swipeAPI.getInterestStatus(cat._id);

      if (interestStatus?.status === 'ok' && interestStatus?.data?.hasUsedToday) {
        Alert.alert(
          'หมดสิทธิ์ Interest วันนี้ ⭐',
          'คุณใช้ Interest ไปแล้ว 1 ครั้งวันนี้\nกลับมาใช้ใหม่พรุ่งนี้นะ',
          [{ text: 'เข้าใจแล้ว', style: 'default' }]
        );
        return;
      }

      // If still has uses left, proceed with interest
      onInterested();
      onClose();
    } catch (error) {
      console.error('❌ Error checking interest status:', error);
      // If error checking status, still allow the swipe (backend will handle the limit)
      onInterested();
      onClose();
    }
  };

  const handlePass = () => {
    onPass();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="chevron-down" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: 'bold',
            }}
          >
            {cat.name}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Photo Gallery */}
          <View style={{ height: screenHeight * 0.5 }}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                setCurrentPhotoIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {cat.photos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo.url }}
                  style={{
                    width: screenWidth,
                    height: screenHeight * 0.5,
                  }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>

            {/* Photo Indicators */}
            {cat.photos.length > 1 && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 0,
                  right: 0,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {cat.photos.map((_, index) => (
                  <View
                    key={index}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: index === currentPhotoIndex ? 'white' : 'rgba(255,255,255,0.5)',
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Cat Information */}
          <View style={{ padding: 20 }}>
            {/* Basic Info */}
            <View
              style={{
                backgroundColor: isDark ? '#2a2a2a' : 'white',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {/* Name and Gender */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 28,
                    fontWeight: 'bold',
                    flex: 1,
                  }}
                >
                  {cat.name}
                </Text>
                <View style={{
                  backgroundColor: cat.gender === 'male' ? '#41C8F2' : colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 100,
                }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                    {cat.gender === 'male' ? 'ชาย' : 'หญิง'}
                  </Text>
                </View>
              </View>

              {/* Age */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text
                  style={{
                    color: colors.text,
                    marginLeft: 12,
                    fontSize: 16,
                    fontWeight: '500',
                  }}
                >
                  อายุ {getAge()}
                </Text>
              </View>

              {/* Breed */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="paw-outline" size={20} color={colors.textSecondary} />
                <Text
                  style={{
                    color: colors.text,
                    marginLeft: 12,
                    fontSize: 16,
                    fontWeight: '500',
                  }}
                >
                  สายพันธุ์ {cat.breed}
                </Text>
              </View>

              {/* Color */}
              {cat.color && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="color-palette-outline" size={20} color={colors.textSecondary} />
                  <Text
                    style={{
                      color: colors.text,
                      marginLeft: 12,
                      fontSize: 16,
                      fontWeight: '500',
                    }}
                  >
                    สี {cat.color}
                  </Text>
                </View>
              )}

              {/* Distance */}
              {cat.distance !== undefined && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                  <Text
                    style={{
                      color: colors.text,
                      marginLeft: 12,
                      fontSize: 16,
                      fontWeight: '500',
                    }}
                  >
                    ห่างจากคุณ {cat.distance} กิโลเมตร
                  </Text>
                  {cat.matchReason && (
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        marginLeft: 8,
                      }}
                    >
                      ({cat.matchReason})
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Health & Status */}
            <View
              style={{
                backgroundColor: isDark ? '#2a2a2a' : 'white',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: 'bold',
                  marginBottom: 12,
                }}
              >
                สุขภาพและสถานะ
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {cat.vaccinated && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#10b981' + '20',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text
                      style={{
                        color: '#10b981',
                        marginLeft: 6,
                        fontSize: 14,
                        fontWeight: '500',
                      }}
                    >
                      ฉีดวัคซีนแล้ว
                    </Text>
                  </View>
                )}

                {cat.neutered && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#8b5cf6' + '20',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <Ionicons name="medical" size={16} color="#8b5cf6" />
                    <Text
                      style={{
                        color: '#8b5cf6',
                        marginLeft: 6,
                        fontSize: 14,
                        fontWeight: '500',
                      }}
                    >
                      ทำหมันแล้ว
                    </Text>
                  </View>
                )}

                {cat.readyForBreeding && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.primary + '20',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                    }}
                  >
                    <Ionicons name="heart" size={16} color={colors.primary} />
                    <Text
                      style={{
                        color: colors.primary,
                        marginLeft: 6,
                        fontSize: 14,
                        fontWeight: '500',
                      }}
                    >
                      พร้อมหาคู่
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Traits */}
            {cat.traits && cat.traits.length > 0 && (
              <View
                style={{
                  backgroundColor: isDark ? '#2a2a2a' : 'white',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: 'bold',
                    marginBottom: 12,
                  }}
                >
                  นิสัยและลักษณะ
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {cat.traits.map((trait, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: colors.primary + '20',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: 14,
                          fontWeight: '500',
                        }}
                      >
                        {trait}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Notes */}
            {cat.notes && (
              <View
                style={{
                  backgroundColor: isDark ? '#2a2a2a' : 'white',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: 'bold',
                    marginBottom: 12,
                  }}
                >
                  หมายเหตุเพิ่มเติม
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 16,
                    lineHeight: 24,
                  }}
                >
                  {cat.notes}
                </Text>
              </View>
            )}

            {/* Owner Information */}
            {cat.ownerId && (
              <View
                style={{
                  backgroundColor: isDark ? '#2a2a2a' : 'white',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: hideActions ? 20 : 80,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: 'bold',
                    marginBottom: 12,
                  }}
                >
                  ข้อมูลเจ้าของ
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  {cat.ownerId.avatar?.url && (
                    <Image
                      source={{ uri: cat.ownerId.avatar.url }}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        marginRight: 12,
                      }}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: 'bold',
                      }}
                    >
                      @{cat.ownerId.username}
                    </Text>
                    {cat.ownerId.location?.province && (
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 14,
                        }}
                      >
                        📍 {cat.ownerId.location.province}
                      </Text>
                    )}
                  </View>
                </View>

                {cat.ownerId.phone && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="call-outline" size={16} color={colors.textSecondary} />
                    <Text
                      style={{
                        color: colors.textSecondary,
                        marginLeft: 8,
                        fontSize: 14,
                      }}
                    >
                      {cat.ownerId.phone}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        {!hideActions && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: colors.background,
              paddingHorizontal: 16,
              paddingVertical: 16,
              flexDirection: 'row',
              gap: 10,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            {/* Pass Button - ไม่สนใจ */}
            <TouchableOpacity
              onPress={handlePass}
              style={{
                flex: 1,
                backgroundColor: '#D95B5B',
                paddingVertical: 14,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={18} color="white" />
              <Text
                style={{
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 'bold',
                  marginLeft: 6,
                }}
              >
                ไม่สนใจ
              </Text>
            </TouchableOpacity>

            {/* Interest Button - สนใจ */}
            <TouchableOpacity
              onPress={handleInterested}
              style={{
                flex: 1,
                backgroundColor: '#F0CF67',
                paddingVertical: 14,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="star" size={18} color="white" />
              <Text
                style={{
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 'bold',
                  marginLeft: 6,
                }}
              >
                สนใจ
              </Text>
            </TouchableOpacity>

            {/* Like Button - ชอบ */}
            <TouchableOpacity
              onPress={handleLike}
              style={{
                flex: 1,
                backgroundColor: '#E89292',
                paddingVertical: 14,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="heart" size={18} color="white" />
              <Text
                style={{
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 'bold',
                  marginLeft: 6,
                }}
              >
                ชอบ
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}