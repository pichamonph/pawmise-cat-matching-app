import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import PinkButton from '@/components/PinkButton';
import { catAPI } from '@/services/api';
import type { Cat } from '@/types';

const { width: screenWidth } = Dimensions.get('window');

interface CatDetailModalProps {
  visible: boolean;
  cat: Cat | null;
  onClose: () => void;
  onUpdate: () => void;
  selectedForMatching?: string | null;
  onSelectForMatching?: (catId: string) => void;
}

const TRAIT_LABELS: { [key: string]: string } = {
  playful: 'ขี้เล่น',
  calm: 'สงบ',
  friendly: 'เป็นมิตร',
  shy: 'ขี้อาย',
  affectionate: 'ชอบกอด',
  independent: 'เป็นอิสระ',
  vocal: 'ชอบร้อง',
  quiet: 'เงียบ',
};

export default function CatDetailModal({
  visible,
  cat,
  onClose,
  onUpdate,
  selectedForMatching,
  onSelectForMatching
}: CatDetailModalProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!cat) return null;

  const formatAge = () => {
    const years = cat.ageYears || 0;
    const months = cat.ageMonths || 0;

    if (years === 0 && months === 0) {
      return 'น้อยกว่า 1 เดือน';
    }

    let ageStr = '';
    if (years > 0) {
      ageStr += `${years} ปี`;
    }
    if (months > 0) {
      if (ageStr) ageStr += ' ';
      ageStr += `${months} เดือน`;
    }

    return ageStr;
  };

  const handleDeleteCat = () => {
    Alert.alert(
      'ลบข้อมูลแมว',
      `คุณต้องการลบข้อมูลแมว "${cat.name}" หรือไม่?\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(true);
            try {
              await catAPI.deleteCat(cat._id);
              Alert.alert(
                'สำเร็จ!',
                'ลบข้อมูลแมวเรียบร้อยแล้ว',
                [
                  {
                    text: 'ตกลง',
                    onPress: () => {
                      onClose();
                      onUpdate();
                    }
                  }
                ]
              );
            } catch (error: any) {
              console.error('❌ Delete cat error:', error);
              Alert.alert(
                'เกิดข้อผิดพลาด',
                'ไม่สามารถลบข้อมูลแมวได้ กรุณาลองใหม่อีกครั้ง'
              );
            } finally {
              setDeleteLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderPhotoCarousel = () => {
    if (!cat.photos || cat.photos.length === 0) {
      return (
        <View
          className="items-center justify-center rounded-2xl"
          style={{
            height: 300,
            backgroundColor: colors.surface,
          }}
        >
          <Ionicons name="image-outline" size={64} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary }} className="text-base mt-4">
            ไม่มีรูปภาพ
          </Text>
        </View>
      );
    }

    return (
      <View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / (screenWidth - 48));
            setCurrentPhotoIndex(newIndex);
          }}
        >
          {cat.photos.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo.url }}
              style={{
                width: screenWidth - 48,
                height: 300,
              }}
              className="rounded-2xl"
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {cat.photos.length > 1 && (
          <View className="flex-row justify-center mt-4">
            {cat.photos.map((_, index) => (
              <View
                key={index}
                className="w-2 h-2 rounded-full mx-1"
                style={{
                  backgroundColor: index === currentPhotoIndex ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        className="flex-1"
        style={{ backgroundColor: isDark ? '#1a1a1a' : '#FFFFFF' }}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-6 py-4 border-b"
          style={{ borderBottomColor: colors.border }}
        >
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text }} className="text-lg font-bold">
            {cat.name}
          </Text>
          <TouchableOpacity onPress={handleDeleteCat} disabled={deleteLoading}>
            <Ionicons
              name="trash-outline"
              size={24}
              color={deleteLoading ? colors.textSecondary : '#ef4444'}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Photo Carousel */}
          <View className="mb-6">
            {renderPhotoCarousel()}
          </View>

          {/* Basic Info Card */}
          <View
            className="rounded-3xl p-6 mb-6"
            style={{
              backgroundColor: isDark ? '#2a2a2a' : 'white',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View
                className="mr-3 p-2 rounded-xl"
                style={{ backgroundColor: colors.primary + '20' }}
              >
                <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text }} className="text-xl font-bold">
                ข้อมูลพื้นฐาน
              </Text>
            </View>

            <View className="space-y-4">
              <View className="flex-row items-center">
                <Text style={{ color: colors.textSecondary }} className="text-sm w-20">
                  ชื่อ:
                </Text>
                <Text style={{ color: colors.text }} className="text-base font-medium flex-1">
                  {cat.name}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Text style={{ color: colors.textSecondary }} className="text-sm w-20">
                  เพศ:
                </Text>
                <Text style={{ color: colors.text }} className="text-base">
                  {cat.gender === 'male' ? 'เพศชาย' : 'เพศหญิง'}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Text style={{ color: colors.textSecondary }} className="text-sm w-20">
                  อายุ:
                </Text>
                <Text style={{ color: colors.text }} className="text-base">
                  {formatAge()}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Text style={{ color: colors.textSecondary }} className="text-sm w-20">
                  สายพันธุ์:
                </Text>
                <Text style={{ color: colors.text }} className="text-base">
                  {cat.breed}
                </Text>
              </View>

              {cat.color && (
                <View className="flex-row items-center">
                  <Text style={{ color: colors.textSecondary }} className="text-sm w-20">
                    สี:
                  </Text>
                  <Text style={{ color: colors.text }} className="text-base">
                    {cat.color}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Health & Status Card */}
          <View
            className="rounded-3xl p-6 mb-6"
            style={{
              backgroundColor: isDark ? '#2a2a2a' : 'white',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View
                className="mr-3 p-2 rounded-xl"
                style={{ backgroundColor: colors.primary + '20' }}
              >
                <Ionicons name="medical-outline" size={24} color={colors.primary} />
              </View>
              <Text style={{ color: colors.text }} className="text-xl font-bold">
                สุขภาพ
              </Text>
            </View>

            <View className="flex-row justify-center">
              <View className="items-center">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: cat.vaccinated ? '#10b981' : colors.border + '40' }}
                >
                  <Ionicons
                    name={cat.vaccinated ? 'checkmark' : 'close'}
                    size={32}
                    color={cat.vaccinated ? 'white' : colors.textSecondary}
                  />
                </View>
                <Text style={{ color: colors.text }} className="text-sm font-medium">
                  วัคซีน
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-xs">
                  {cat.vaccinated ? 'ฉีดแล้ว' : 'ยังไม่ฉีด'}
                </Text>
              </View>
            </View>
          </View>

          {/* Traits Card */}
          {cat.traits && cat.traits.length > 0 && (
            <View
              className="rounded-3xl p-6 mb-6"
              style={{
                backgroundColor: isDark ? '#2a2a2a' : 'white',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View
                  className="mr-3 p-2 rounded-xl"
                  style={{ backgroundColor: colors.primary + '20' }}
                >
                  <Ionicons name="heart-outline" size={24} color={colors.primary} />
                </View>
                <Text style={{ color: colors.text }} className="text-xl font-bold">
                  นิสัย
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-2">
                {cat.traits.map((trait) => (
                  <View
                    key={trait}
                    className="px-4 py-2 rounded-full"
                    style={{ backgroundColor: colors.primary + '20' }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: colors.primary }}
                    >
                      {TRAIT_LABELS[trait] || trait}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Notes Card */}
          {cat.notes && (
            <View
              className="rounded-3xl p-6 mb-6"
              style={{
                backgroundColor: isDark ? '#2a2a2a' : 'white',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View
                  className="mr-3 p-2 rounded-xl"
                  style={{ backgroundColor: colors.primary + '20' }}
                >
                  <Ionicons name="document-text-outline" size={24} color={colors.primary} />
                </View>
                <Text style={{ color: colors.text }} className="text-xl font-bold">
                  หมายเหตุ
                </Text>
              </View>

              <Text style={{ color: colors.text }} className="text-base leading-6">
                {cat.notes}
              </Text>
            </View>
          )}

          {/* Matching Selection Card */}
          {onSelectForMatching && (
            <View
              className="rounded-3xl p-6 mb-6"
              style={{
                backgroundColor: isDark ? '#2a2a2a' : 'white',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <View className="flex-row items-center mb-4">
                <View
                  className="mr-3 p-2 rounded-xl"
                  style={{ backgroundColor: colors.primary + '20' }}
                >
                  <Ionicons name="heart" size={24} color={colors.primary} />
                </View>
                <Text style={{ color: colors.text }} className="text-xl font-bold">
                  การหาคู่
                </Text>
              </View>

              <View className="items-center">
                {selectedForMatching === cat._id ? (
                  <View className="items-center">
                    <View
                      className="w-16 h-16 rounded-full items-center justify-center mb-3"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Ionicons name="heart" size={32} color="white" />
                    </View>
                    <Text
                      className="text-base font-medium mb-2"
                      style={{ color: colors.primary }}
                    >
                      เลือกสำหรับหาคู่แล้ว
                    </Text>
                    <Text
                      className="text-sm text-center"
                      style={{ color: colors.textSecondary }}
                    >
                      {cat.name} จะปรากฏในหน้าหาคู่
                    </Text>
                  </View>
                ) : (
                  <View className="items-center">
                    <TouchableOpacity
                      onPress={() => onSelectForMatching(cat._id)}
                      className="w-16 h-16 rounded-full items-center justify-center mb-3 border-2 border-dashed"
                      style={{ borderColor: colors.primary, backgroundColor: colors.primary + '10' }}
                    >
                      <Ionicons name="heart-outline" size={32} color={colors.primary} />
                    </TouchableOpacity>
                    <Text
                      className="text-base font-medium mb-2"
                      style={{ color: colors.text }}
                    >
                      เลือก {cat.name} สำหรับหาคู่
                    </Text>
                    <Text
                      className="text-sm text-center mb-4"
                      style={{ color: colors.textSecondary }}
                    >
                      แมวที่เลือกจะปรากฏในหน้าหาคู่
                    </Text>
                    <PinkButton
                      title="เลือกสำหรับหาคู่"
                      onPress={() => onSelectForMatching(cat._id)}
                      size="medium"
                      variant="gradient"
                    />
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-4">
            <View className="flex-1">
              <PinkButton
                title="แก้ไขข้อมูล"
                onPress={() => {
                  onClose(); // Close modal first
                  router.push(`/(auth)/edit-cat?catId=${cat._id}`);
                }}
                size="medium"
                variant="outline"
              />
            </View>
            <View className="flex-1">
              <PinkButton
                title="ลบแมว"
                onPress={handleDeleteCat}
                loading={deleteLoading}
                size="medium"
                variant="outline"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}