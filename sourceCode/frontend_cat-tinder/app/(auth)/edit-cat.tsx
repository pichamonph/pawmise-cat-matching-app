import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams, Redirect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThaiInput from '@/components/ThaiInput';
import PinkButton from '@/components/PinkButton';
import { catAPI } from '@/services/api';
import { API_URL, STORAGE_KEYS } from '@/constants/config';
import type { Cat } from '@/types';

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

export default function EditCat() {
  const router = useRouter();
  const { catId } = useLocalSearchParams<{ catId: string }>();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { colors, isDark } = useTheme();

  // Progress step (1-4)
  const [currentStep, setCurrentStep] = useState(1);
  const [catData, setCatData] = useState<Cat | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [ageYears, setAgeYears] = useState('0');
  const [ageMonths, setAgeMonths] = useState('0');
  const [breed, setBreed] = useState('');
  const [customBreed, setCustomBreed] = useState('');
  const [color, setColor] = useState('');
  const [traits, setTraits] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<Array<{url: string, publicId: string}>>([]);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [vaccinated, setVaccinated] = useState(false);
  const [notes, setNotes] = useState('');
  const [showBreedModal, setShowBreedModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [errors, setErrors] = useState({
    name: '',
    gender: '',
    breed: '',
    photos: '',
  });

  // Load cat data
  useEffect(() => {
    if (catId && isAuthenticated) {
      loadCatData();
    }
  }, [catId, isAuthenticated]);

  const loadCatData = async () => {
    try {
      setLoading(true);
      console.log('📥 Loading cat data for ID:', catId);

      const response = await catAPI.getCat(catId);

      if (response?.status === 'ok' && response?.data) {
        const cat = response.data;
        setCatData(cat);

        // Populate form
        setName(cat.name || '');
        setGender(cat.gender || '');
        setAgeYears(cat.ageYears?.toString() || '0');
        setAgeMonths(cat.ageMonths?.toString() || '0');
        setBreed(cat.breed || '');
        setColor(cat.color || '');
        setTraits(cat.traits || []);
        setExistingPhotos(cat.photos || []);
        setVaccinated(cat.vaccinated || false);
        setNotes(cat.notes || '');

        // Handle custom breed
        if (cat.breed && !CAT_BREEDS.includes(cat.breed)) {
          setBreed('อื่นๆ');
          setCustomBreed(cat.breed);
        }

        console.log('✅ Cat data loaded successfully');
      }
    } catch (error: any) {
      console.error('❌ Error loading cat data:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลแมวได้');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickNewImage = async () => {
    const totalPhotos = existingPhotos.length + newPhotos.length;
    if (totalPhotos >= 5) {
      Alert.alert('ไม่สามารถเพิ่มรูปได้', 'สามารถมีรูปได้สูงสุด 5 รูป');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setNewPhotos([...newPhotos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้');
    }
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(existingPhotos.filter((_, i) => i !== index));
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos(newPhotos.filter((_, i) => i !== index));
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
      // Step 1: Photos - must have at least 1 (existing or new)
      const totalPhotos = existingPhotos.length + newPhotos.length;
      if (totalPhotos === 0) {
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

  const handleSave = async () => {
    if (!validateStep(3)) return;

    setSaving(true);
    try {
      console.log('💾 Saving cat changes...');
      console.log('📷 Existing photos count:', existingPhotos.length);
      console.log('📷 New photos count:', newPhotos.length);

      // Create FormData
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

      // Add existing photos info (to keep them)
      console.log('📤 Sending existing photos:', existingPhotos);
      existingPhotos.forEach((photo, index) => {
        formData.append(`existingPhotos[${index}][url]`, photo.url);
        formData.append(`existingPhotos[${index}][publicId]`, photo.publicId);
        console.log(`📋 Existing photo ${index}:`, photo.url.substring(0, 50) + '...');
      });

      // Add new photos
      console.log('📤 Sending new photos:', newPhotos.length);
      for (let i = 0; i < newPhotos.length; i++) {
        const photoUri = newPhotos[i];
        const timestamp = Date.now();
        const filename = `cat_${timestamp}_${i}.jpg`;

        const photo: any = {
          uri: photoUri,
          name: filename,
          type: 'image/jpeg',
        };

        formData.append('photos', photo);
        console.log(`📷 Added new photo ${i + 1}:`, filename, photoUri.substring(0, 50) + '...');
      }

      const response = await catAPI.updateCat(catId, formData);
      console.log('✅ Cat updated successfully:', response);
      console.log('📷 Response photos:', response?.data?.photos?.length || 0);

      Alert.alert(
        'สำเร็จ!',
        'บันทึกข้อมูลแมวแล้ว',
        [{
          text: 'ตกลง',
          onPress: () => {
            // Navigate back to profile to see changes
            router.replace('/(tabs)/profile');
          }
        }]
      );

    } catch (error: any) {
      console.error('❌ Update cat error:', error);

      let errorMessage = 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('บันทึกไม่สำเร็จ', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'ลบข้อมูลแมว',
      'คุณต้องการลบข้อมูลแมวนี้หรือไม่? การดำเนินการนี้ไม่สามารถยกเลิกได้',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: confirmDelete
        }
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setSaving(true);
      console.log('🗑️ Deleting cat...');

      await catAPI.deleteCat(catId);
      console.log('✅ Cat deleted successfully');

      Alert.alert(
        'ลบสำเร็จ',
        'ลบข้อมูลแมวแล้ว',
        [{
          text: 'ตกลง',
          onPress: () => {
            // Navigate back to profile
            router.replace('/(tabs)/profile');
          }
        }]
      );

    } catch (error: any) {
      console.error('❌ Delete cat error:', error);
      Alert.alert('ลบไม่สำเร็จ', 'ไม่สามารถลบข้อมูลแมวได้');
      setSaving(false);
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
              className="text-xs mt-2 text-center"
              style={{
                color: step <= currentStep ? colors.primary : colors.textSecondary,
                fontWeight: step === currentStep ? 'bold' : 'normal',
              }}
            >
              {step === 1 ? 'รูปภาพ' : step === 2 ? 'ข้อมูลพื้นฐาน' : step === 3 ? 'สายพันธุ์' : 'เพิ่มเติม'}
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
        return 'จัดการรูปภาพแมว';
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
              รูปภาพแมวของคุณ (1-5 รูป) *
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-3">
                {/* Existing Photos */}
                {existingPhotos.map((photo, index) => (
                  <View key={`existing-${index}`} className="relative" style={{ overflow: 'visible' }}>
                    <Image
                      source={{ uri: photo.url }}
                      style={{ width: 120, height: 120 }}
                      className="rounded-xl"
                    />
                    <TouchableOpacity
                      onPress={() => removeExistingPhoto(index)}
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

                {/* New Photos */}
                {newPhotos.map((photo, index) => (
                  <View key={`new-${index}`} className="relative" style={{ overflow: 'visible' }}>
                    <Image
                      source={{ uri: photo }}
                      style={{ width: 120, height: 120 }}
                      className="rounded-xl"
                    />
                    <View
                      className="absolute rounded-full"
                      style={{
                        top: -8,
                        left: -8,
                        backgroundColor: '#10b981',
                        width: 24,
                        height: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                        NEW
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeNewPhoto(index)}
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

                {/* Add Photo Button */}
                {(existingPhotos.length + newPhotos.length) < 5 && (
                  <TouchableOpacity
                    onPress={pickNewImage}
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
              💡 รูปเดิมจะถูกเก็บไว้ รูปใหม่จะมีเครื่องหมาย "NEW"
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
                    เพศผู้
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
                    เพศเมีย
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

  // Loading state
  if (authLoading || loading) {
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

  // Auth check
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Cat not found
  if (!catData) {
    return (
      <View
        className="flex-1 justify-center items-center px-6"
        style={{ backgroundColor: isDark ? '#1a1a1a' : '#FFFFFF' }}
      >
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={{ color: colors.text }} className="text-lg font-medium mt-4 mb-2">
          ไม่พบข้อมูลแมว
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-sm text-center mb-6">
          ไม่สามารถโหลดข้อมูลแมวได้
        </Text>
        <PinkButton
          title="กลับไป"
          onPress={() => router.back()}
          size="medium"
          variant="outline"
        />
      </View>
    );
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
            <View className="flex-row items-center justify-between w-full mb-4">
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>

              <View
                className="p-4 rounded-full"
                style={{
                  backgroundColor: colors.primary + '20',
                }}
              >
                <Ionicons name="create" size={32} color={colors.primary} />
              </View>

              <TouchableOpacity onPress={handleDelete}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <Text
              style={{ color: colors.text }}
              className="text-3xl font-bold mb-2"
            >
              แก้ไขข้อมูล{catData.name}
            </Text>
            <Text
              style={{ color: colors.textSecondary }}
              className="text-sm text-center"
            >
              ปรับปรุงข้อมูลแมวของคุณ
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
                <Text style={{ color: colors.textSecondary }} className="text-sm">
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
                    title="บันทึกการเปลี่ยนแปลง"
                    onPress={handleSave}
                    loading={saving}
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