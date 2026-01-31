import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { STORAGE_KEYS, API_URL } from '@/constants/config';
import ThaiInput from '@/components/ThaiInput';
import PinkButton from '@/components/PinkButton';
import { catAPI } from '@/services/api';
import Foundation from '@expo/vector-icons/Foundation';



const TRAITS = [
  { value: 'playful', label: 'ขี้เล่น' },
  { value: 'calm', label: 'สงบ' },
  { value: 'friendly', label: 'เป็นมิตร' },
  { value: 'shy', label: 'ขี้อาย' },
  { value: 'affectionate', label: 'ชอบกอด' },
  { value: 'independent', label: 'เป็นอิสระ' },
  { value: 'vocal', label: 'ชอบร้อง' },
  { value: 'quiet', label: 'เงียบ' },
];

const CAT_BREEDS = [
  'ไทย',
  'ขาวมณี',
  'วิเชียรมาศ',
  'ศุภลักษณ์',
  'เปอร์เซีย',
  'เมนคูน',
  'อเมริกัน ช็อตแฮร์',
  'บริติช ช็อตแฮร์',
  'สก็อตติช โฟลด์',
  'เบงกอล',
  'สฟิงซ์',
  'อื่นๆ',
];

export default function AddCat() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { colors, isDark } = useTheme();

  // Progress step (1-4)
  const [currentStep, setCurrentStep] = useState(1);

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [ageYears, setAgeYears] = useState('0');
  const [ageMonths, setAgeMonths] = useState('0');
  const [breed, setBreed] = useState('');
  const [customBreed, setCustomBreed] = useState('');
  const [color, setColor] = useState('');
  const [traits, setTraits] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [vaccinated, setVaccinated] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBreedModal, setShowBreedModal] = useState(false);

  const [errors, setErrors] = useState({
    name: '',
    gender: '',
    breed: '',
    photos: '',
  });

  const pickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('ไม่สามารถเพิ่มรูปได้', 'สามารถเพิ่มรูปได้สูงสุด 5 รูป');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const toggleTrait = (trait: string) => {
    if (traits.includes(trait)) {
      setTraits(traits.filter((t) => t !== trait));
    } else {
      setTraits([...traits, trait]);
    }
  };

  const selectBreed = (selectedBreed: string) => {
    setBreed(selectedBreed);
    setShowBreedModal(false);
    if (selectedBreed !== 'อื่นๆ') {
      setCustomBreed('');
    }
  };

  const validateStep = (step: number) => {
    const newErrors = { name: '', gender: '', breed: '', photos: '' };
    let isValid = true;

    if (step === 1) {
      // Step 1: Photos
      if (photos.length === 0) {
        newErrors.photos = 'กรุณาเพิ่มรูปภาพอย่างน้อย 1 รูป';
        isValid = false;
      }
    }

    if (step === 2) {
      // Step 2: Basic info
      if (!name.trim()) {
        newErrors.name = 'กรุณากรอกชื่อแมว';
        isValid = false;
      }

      if (!gender) {
        newErrors.gender = 'กรุณาเลือกเพศ';
        isValid = false;
      }
    }

    if (step === 3) {
      // Step 3: Breed
      if (!breed) {
        newErrors.breed = 'กรุณาเลือกสายพันธุ์';
        isValid = false;
      } else if (breed === 'อื่นๆ' && !customBreed.trim()) {
        newErrors.breed = 'กรุณาระบุสายพันธุ์';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      // ✅ แก้ไข: ไม่ต้องเช็ค token ใน component - API service จัดการแล้ว
      console.log('🔄 Submitting cat data...');
      console.log('📷 Photos count:', photos.length);

      // ✅ แก้ไข: สร้าง FormData ที่ถูกต้อง
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('gender', gender);
      formData.append('ageYears', ageYears);
      formData.append('ageMonths', ageMonths);

      const finalBreed = breed === 'อื่นๆ' ? customBreed.trim() : breed;
      formData.append('breed', finalBreed);

      if (color) formData.append('color', color.trim());

      // Send traits as individual fields
      traits.forEach((trait) => {
        formData.append('traits', trait);
      });

      formData.append('vaccinated', String(vaccinated));
      if (notes) formData.append('notes', notes.trim());

      // ✅ แก้ไข: Photo handling for React Native
      for (let i = 0; i < photos.length; i++) {
        const photoUri = photos[i];

        // สร้าง filename
        const timestamp = Date.now();
        const filename = `cat_${timestamp}_${i}.jpg`;

        const photo: any = {
          uri: photoUri,
          name: filename,
          type: 'image/jpeg',
        };

        formData.append('photos', photo);
        console.log(`📷 Added photo ${i + 1}:`, filename);
      }

      // ✅ เรียก API
      const response = await catAPI.createCat(formData);
      console.log('✅ Cat created successfully:', response);

      // ✅ Navigate ไปหน้า home
      console.log('🏠 Navigating to home...');
      router.replace('/(tabs)/home');

    } catch (error: any) {
      console.error('❌ Add cat error:', error);

      let errorMessage = 'เพิ่มข้อมูลแมวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('เพิ่มข้อมูลไม่สำเร็จ', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Progress Indicator Component
  const ProgressIndicator = () => (
    <View className="flex-row justify-between items-center mb-8">
      {[1, 2, 3, 4].map((step, index) => (
        <React.Fragment key={step}>
          <View className="items-center flex-1">
            <View
              className="rounded-full items-center justify-center"
              style={{
                width: 40,
                height: 40,
                backgroundColor: step <= currentStep ? colors.primary : colors.border,
              }}
            >
              {step < currentStep ? (
                <Ionicons name="checkmark" size={24} color="white" />
              ) : (
                <Text
                  className="font-bold text-base"
                  style={{
                    color: step <= currentStep ? 'white' : colors.textSecondary,
                  }}
                >
                  {step}
                </Text>
              )}
            </View>
            <Text
              className="text-xs mt-2 text-center "
              style={{
                color: step <= currentStep ? colors.primary : colors.textSecondary,
                fontWeight: step === currentStep ? 'bold' : 'normal',
              }}
            >
              {step === 1 ? 'รูปภาพ' : step === 2 ? 'พื้นฐาน' : step === 3 ? 'สายพันธุ์' : 'เพิ่มเติม'}
            </Text>
          </View>
          {index < 3 && (
            <View
              className="h-0.5 flex-1 mx-2"
              style={{
                backgroundColor: step < currentStep ? colors.primary : colors.border,
                marginTop: -20,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'เพิ่มรูปภาพแมว';
      case 2:
        return 'ข้อมูลพื้นฐาน';
      case 3:
        return 'สายพันธุ์และรายละเอียด';
      case 4:
        return 'นิสัยและข้อมูลเพิ่มเติม';
      default:
        return '';
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View>
            <Text style={{ color: colors.text }} className="text-sm font-medium mb-3">
              เพิ่มรูปภาพแมวของคุณ (1-5 รูป) *
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-3">
                {photos.map((photo, index) => (
                  <View key={index} className="relative" style={{ overflow: 'visible' }}>
                    <Image
                      source={{ uri: photo }}
                      style={{ width: 120, height: 120 }}
                      className="rounded-xl"
                    />
                    <TouchableOpacity
                      onPress={() => removePhoto(index)}
                      className="absolute rounded-full"
                      style={{
                        top: -8,
                        right: -8,
                        backgroundColor: '#ef4444',
                        width: 28,
                        height: 28,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3,
                        elevation: 5,
                      }}
                    >
                      <Ionicons name="close" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 5 && (
                  <TouchableOpacity
                    onPress={pickImage}
                    className="items-center justify-center rounded-xl border-2 border-dashed"
                    style={{
                      width: 120,
                      height: 120,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Ionicons name="camera" size={36} color={colors.primary} />
                    <Text style={{ color: colors.textSecondary }} className="text-xs mt-2">
                      เพิ่มรูป
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
            {errors.photos && (
              <Text style={{ color: colors.error }} className="text-xs mt-2">
                {errors.photos}
              </Text>
            )}
            <Text style={{ color: colors.textSecondary }} className="text-xs mt-3">
              💡 เคล็ดลับ: เลือกรูปที่ชัดเจน แสดงหน้าตาและลักษณะของแมวได้ดี
            </Text>
          </View>
        );

      case 2:
        return (
          <View>
            <ThaiInput
              label="ชื่อแมว *"
              value={name}
              onChangeText={setName}
              placeholder="ชื่อแมวของคุณ"
              error={errors.name}
            />

            {/* Gender Selection */}
            <View className="mb-4">
              <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
                เพศ *
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setGender('male')}
                  className="flex-1 py-4 rounded-xl border-2"
                  style={{
                    borderColor: gender === 'male' ? colors.primary : colors.border,
                    backgroundColor: gender === 'male' ? colors.primary + '10' : colors.surface,
                  }}
                >
                  <Text
                    className="text-center font-medium text-lg"
                    style={{ color: gender === 'male' ? colors.primary : colors.text }}
                  >
                    <Foundation name="male-symbol" size={18} color="" /> เพศผู้
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setGender('female')}
                  className="flex-1 py-4 rounded-xl border-2"
                  style={{
                    borderColor: gender === 'female' ? colors.primary : colors.border,
                    backgroundColor: gender === 'female' ? colors.primary + '10' : colors.surface,
                  }}
                >
                  <Text
                    className="text-center font-medium text-lg"
                    style={{ color: gender === 'female' ? colors.primary : colors.text }}
                  >
                    <Foundation name="female-symbol" size={18} color="" /> เพศเมีย
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.gender && (
                <Text style={{ color: colors.error }} className="text-xs mt-1">
                  {errors.gender}
                </Text>
              )}
            </View>

            {/* Age */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <ThaiInput
                  label="อายุ (ปี)"
                  value={ageYears}
                  onChangeText={setAgeYears}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <ThaiInput
                  label="อายุ (เดือน)"
                  value={ageMonths}
                  onChangeText={setAgeMonths}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            {/* Breed Dropdown */}
            <View className="mb-4">
              <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
                สายพันธุ์ *
              </Text>
              <TouchableOpacity
                onPress={() => setShowBreedModal(true)}
                className="border-2 rounded-2xl px-4 flex-row items-center justify-between"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: errors.breed ? colors.error : colors.border,
                  height: 48,
                }}
              >
                <Text
                  style={{
                    color: breed ? colors.text : colors.textSecondary,
                  }}
                >
                  {breed || 'เลือกสายพันธุ์'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {errors.breed && (
                <Text style={{ color: colors.error }} className="text-xs mt-1">
                  {errors.breed}
                </Text>
              )}
            </View>

            {breed === 'อื่นๆ' && (
              <ThaiInput
                label="ระบุสายพันธุ์"
                value={customBreed}
                onChangeText={setCustomBreed}
                placeholder="กรุณาระบุสายพันธุ์"
              />
            )}

            <ThaiInput
              label="สี"
              value={color}
              onChangeText={setColor}
              placeholder="เช่น ขาว, ส้ม, ดำ"
            />

            {/* Vaccinated */}
            <View className="mb-4">
              <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
                สุขภาพ
              </Text>
              <TouchableOpacity
                onPress={() => setVaccinated(!vaccinated)}
                className="flex-row items-center py-4 px-4 rounded-xl"
                style={{ backgroundColor: colors.surface }}
              >
                <View
                  className="w-6 h-6 rounded border-2 items-center justify-center mr-3"
                  style={{
                    borderColor: vaccinated ? colors.primary : colors.border,
                    backgroundColor: vaccinated ? colors.primary : 'transparent',
                  }}
                >
                  {vaccinated && <Ionicons name="checkmark" size={18} color="white" />}
                </View>
                <Text style={{ color: colors.text }} className="text-base">
                  ฉีดวัคซีนแล้ว
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 4:
        return (
          <View>
            {/* Traits */}
            <View className="mb-4">
              <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
                นิสัย (เลือกได้หลายอย่าง)
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {TRAITS.map((trait) => (
                  <TouchableOpacity
                    key={trait.value}
                    onPress={() => toggleTrait(trait.value)}
                    className="px-4 py-2 rounded-full border-2"
                    style={{
                      borderColor: traits.includes(trait.value) ? colors.primary : colors.border,
                      backgroundColor: traits.includes(trait.value)
                        ? colors.primary + '20'
                        : colors.surface,
                    }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: traits.includes(trait.value) ? colors.primary : colors.textSecondary,
                      }}
                    >
                      {trait.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <ThaiInput
              label="หมายเหตุ"
              value={notes}
              onChangeText={setNotes}
              placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับแมว"
              multiline
              numberOfLines={3}
            />
          </View>
        );

      default:
        return null;
    }
  };

  // แสดง loading ถ้า auth ยังไม่เสร็จ
  if (authLoading) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: isDark ? '#1a1a1a' : '#FFFFFF' }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>กำลังโหลด...</Text>
      </View>
    );
  }

  // ถ้ายังไม่ได้ login ให้ไป login
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ backgroundColor: isDark ? '#1a1a1a' : '#FFFFFF' }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6">
          {/* Header */}
          <View className="items-center mb-8">
            <View
              className="mb-4 p-4 rounded-full"
              style={{
                backgroundColor: colors.primary + '20',
              }}
            >
              <Ionicons name="paw" size={48} color={colors.primary} />
            </View>
            <Text
              style={{ color: colors.text }}
              className="text-3xl font-bold mb-2"
            >
              เพิ่มข้อมูลแมวของคุณ
            </Text>
            <Text
              style={{ color: colors.textSecondary }}
              className="text-sm text-center"
            >
              กรอกข้อมูลแมวเพื่อเริ่มหาคู่
            </Text>
          </View>

          {/* Form Card */}
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
            {/* Progress Indicator */}
            <ProgressIndicator />

            {/* Step Title */}
            <View className="flex-row items-center mb-6">
              <View
                className="mr-3 p-2 rounded-xl"
                style={{ backgroundColor: colors.primary + '20' }}
              >
                <Ionicons
                  name={
                    currentStep === 1
                      ? 'images-outline'
                      : currentStep === 2
                        ? 'information-circle-outline'
                        : currentStep === 3
                          ? 'paw-outline'
                          : 'heart-outline'
                  }
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.text }} className="text-xl font-bold">
                  {getStepTitle()}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm ">
                  ขั้นตอนที่ {currentStep} จาก 4
                </Text>
              </View>
            </View>

            {/* Form Fields */}
            {renderStepContent()}

            {/* Buttons */}
            <View className="flex-row gap-3 mt-6">
              {currentStep > 1 && (
                <View className="flex-1">
                  <PinkButton
                    title="ย้อนกลับ"
                    onPress={handleBack}
                    size="large"
                    variant="outline"
                  />
                </View>
              )}
              <View className={currentStep > 1 ? 'flex-1' : 'flex-1'}>
                {currentStep < 4 ? (
                  <PinkButton
                    title="ถัดไป"
                    onPress={handleNext}
                    size="large"
                    variant="gradient"
                  />
                ) : (
                  <PinkButton
                    title="เพิ่มข้อมูลแมว"
                    onPress={handleSubmit}
                    loading={loading}
                    size="large"
                    variant="gradient"
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Breed Selection Modal */}
      <Modal
        visible={showBreedModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBreedModal(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View
            className="rounded-t-3xl p-6"
            style={{
              backgroundColor: isDark ? '#2a2a2a' : 'white',
              maxHeight: '70%',
            }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ color: colors.text }} className="text-xl font-bold">
                เลือกสายพันธุ์
              </Text>
              <TouchableOpacity onPress={() => setShowBreedModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {CAT_BREEDS.map((breedOption) => (
                <TouchableOpacity
                  key={breedOption}
                  onPress={() => selectBreed(breedOption)}
                  className="py-4 px-4 mb-2 rounded-xl flex-row items-center justify-between"
                  style={{
                    backgroundColor: breed === breedOption ? colors.primary + '20' : colors.surface,
                  }}
                >
                  <Text
                    className="text-base"
                    style={{
                      color: breed === breedOption ? colors.primary : colors.text,
                      fontWeight: breed === breedOption ? 'bold' : 'normal',
                    }}
                  >
                    {breedOption}
                  </Text>
                  {breed === breedOption && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
