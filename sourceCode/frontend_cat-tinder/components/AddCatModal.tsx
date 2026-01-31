import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import ThaiInput from '@/components/ThaiInput';
import PinkButton from '@/components/PinkButton';
import { catAPI } from '@/services/api';

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

interface AddCatModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCatModal({ visible, onClose, onSuccess }: AddCatModalProps) {
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

  const resetForm = () => {
    setCurrentStep(1);
    setName('');
    setGender('');
    setAgeYears('0');
    setAgeMonths('0');
    setBreed('');
    setCustomBreed('');
    setColor('');
    setTraits([]);
    setPhotos([]);
    setVaccinated(false);
    setNotes('');
    setErrors({ name: '', gender: '', breed: '', photos: '' });
  };

  const handleClose = () => {
    if (currentStep > 1 || photos.length > 0 || name.trim()) {
      Alert.alert(
        'ยืนยันการออก',
        'การเปลี่ยนแปลงจะไม่ถูกบันทึก คุณต้องการออกหรือไม่?',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ออก',
            style: 'destructive',
            onPress: () => {
              resetForm();
              onClose();
            }
          }
        ]
      );
    } else {
      resetForm();
      onClose();
    }
  };

  const pickImage = async () => {
    try {
      if (photos.length >= 5) {
        Alert.alert('ไม่สามารถเพิ่มรูปได้', 'สามารถเพิ่มรูปได้สูงสุด 5 รูป');
        return;
      }

      // Request permissions first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('สิทธิ์การเข้าถึง', 'กรุณาอนุญาตการเข้าถึงแกลเลอรี่เพื่อเพิ่มรูปภาพ');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhotos([...photos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
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
      if (photos.length === 0) {
        newErrors.photos = 'กรุณาเพิ่มรูปภาพอย่างน้อย 1 รูป';
        isValid = false;
      }
    }

    if (step === 2) {
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
      console.log('🔄 Submitting cat data...');
      console.log('📷 Photos count:', photos.length);

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('gender', gender);
      formData.append('ageYears', ageYears);
      formData.append('ageMonths', ageMonths);

      const finalBreed = breed === 'อื่นๆ' ? customBreed.trim() : breed;
      formData.append('breed', finalBreed);

      if (color) formData.append('color', color.trim());

      traits.forEach((trait) => {
        formData.append('traits', trait);
      });

      formData.append('vaccinated', String(vaccinated));
      if (notes) formData.append('notes', notes.trim());

      for (let i = 0; i < photos.length; i++) {
        const photoUri = photos[i];
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

      const response = await catAPI.createCat(formData);
      console.log('✅ Cat created successfully:', response);

      Alert.alert(
        'สำเร็จ!',
        'เพิ่มข้อมูลแมวเรียบร้อยแล้ว',
        [
          {
            text: 'ตกลง',
            onPress: () => {
              resetForm();
              onClose();
              onSuccess();
            }
          }
        ]
      );

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

  const ProgressIndicator = () => (
    <View className="flex-row justify-between items-center mb-6">
      {[1, 2, 3, 4].map((step, index) => (
        <React.Fragment key={step}>
          <View className="items-center flex-1">
            <View
              className="rounded-full items-center justify-center"
              style={{
                width: 32,
                height: 32,
                backgroundColor: step <= currentStep ? colors.primary : colors.border,
              }}
            >
              {step < currentStep ? (
                <Ionicons name="checkmark" size={20} color="white" />
              ) : (
                <Text
                  className="font-bold text-sm"
                  style={{
                    color: step <= currentStep ? 'white' : colors.textSecondary,
                  }}
                >
                  {step}
                </Text>
              )}
            </View>
            <Text
              className="text-xs mt-1 text-center"
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
                marginTop: -16,
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
                      style={{ width: 100, height: 100 }}
                      className="rounded-xl"
                    />
                    <TouchableOpacity
                      onPress={() => removePhoto(index)}
                      className="absolute rounded-full"
                      style={{
                        top: -8,
                        right: -8,
                        backgroundColor: '#ef4444',
                        width: 24,
                        height: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3,
                        elevation: 5,
                      }}
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 5 && (
                  <TouchableOpacity
                    onPress={pickImage}
                    className="items-center justify-center rounded-xl border-2 border-dashed"
                    style={{
                      width: 100,
                      height: 100,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Ionicons name="camera" size={32} color={colors.primary} />
                    <Text style={{ color: colors.textSecondary }} className="text-xs mt-1">
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

            <View className="mb-4">
              <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
                เพศ *
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setGender('male')}
                  className="flex-1 py-3 rounded-xl border-2"
                  style={{
                    borderColor: gender === 'male' ? colors.primary : colors.border,
                    backgroundColor: gender === 'male' ? colors.primary + '10' : colors.surface,
                  }}
                >
                  <Text
                    className="text-center font-medium"
                    style={{ color: gender === 'male' ? colors.primary : colors.text }}
                  >
                    ♂️ เพศผู้
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setGender('female')}
                  className="flex-1 py-3 rounded-xl border-2"
                  style={{
                    borderColor: gender === 'female' ? colors.primary : colors.border,
                    backgroundColor: gender === 'female' ? colors.primary + '10' : colors.surface,
                  }}
                >
                  <Text
                    className="text-center font-medium"
                    style={{ color: gender === 'female' ? colors.primary : colors.text }}
                  >
                    ♀️ เพศเมีย
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.gender && (
                <Text style={{ color: colors.error }} className="text-xs mt-1">
                  {errors.gender}
                </Text>
              )}
            </View>

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

            <View className="mb-4">
              <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
                สุขภาพ
              </Text>
              <TouchableOpacity
                onPress={() => setVaccinated(!vaccinated)}
                className="flex-row items-center py-3 px-4 rounded-xl"
                style={{ backgroundColor: colors.surface }}
              >
                <View
                  className="w-5 h-5 rounded border-2 items-center justify-center mr-3"
                  style={{
                    borderColor: vaccinated ? colors.primary : colors.border,
                    backgroundColor: vaccinated ? colors.primary : 'transparent',
                  }}
                >
                  {vaccinated && <Ionicons name="checkmark" size={16} color="white" />}
                </View>
                <Text style={{ color: colors.text }} className="text-sm">
                  ฉีดวัคซีนแล้ว
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 4:
        return (
          <View>
            <View className="mb-4">
              <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
                นิสัย (เลือกได้หลายอย่าง)
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {TRAITS.map((trait) => (
                  <TouchableOpacity
                    key={trait.value}
                    onPress={() => toggleTrait(trait.value)}
                    className="px-3 py-2 rounded-full border-2"
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        style={{ backgroundColor: isDark ? '#1a1a1a' : '#FFFFFF' }}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-6 py-4 border-b"
          style={{ borderBottomColor: colors.border }}
        >
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text }} className="text-lg font-bold">
            เพิ่มข้อมูลแมว
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Main Content or Breed Selection */}
        {!showBreedModal ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View
              className="rounded-3xl p-6"
              style={{
                backgroundColor: isDark ? '#2a2a2a' : 'white',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 5,
              }}
            >
              <ProgressIndicator />

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
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.text }} className="text-lg font-bold">
                    {getStepTitle()}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm">
                    ขั้นตอนที่ {currentStep} จาก 4
                  </Text>
                </View>
              </View>

              {renderStepContent()}

              <View className="flex-row gap-3 mt-6">
                {currentStep > 1 && (
                  <View className="flex-1">
                    <PinkButton
                      title="ย้อนกลับ"
                      onPress={handleBack}
                      size="medium"
                      variant="outline"
                    />
                  </View>
                )}
                <View className={currentStep > 1 ? 'flex-1' : 'flex-1'}>
                  {currentStep < 4 ? (
                    <PinkButton
                      title="ถัดไป"
                      onPress={handleNext}
                      size="medium"
                      variant="gradient"
                    />
                  ) : (
                    <PinkButton
                      title="เพิ่มข้อมูลแมว"
                      onPress={handleSubmit}
                      loading={loading}
                      size="medium"
                      variant="gradient"
                    />
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        ) : (
          /* Breed Selection View */
          <View className="flex-1" style={{ backgroundColor: isDark ? '#1a1a1a' : '#FFFFFF' }}>
            {/* Breed Selection Header */}
            <View
              className="flex-row items-center justify-between px-6 py-4 border-b"
              style={{ borderBottomColor: colors.border }}
            >
              <TouchableOpacity onPress={() => setShowBreedModal(false)}>
                <Ionicons name="arrow-back" size={28} color={colors.text} />
              </TouchableOpacity>
              <Text style={{ color: colors.text }} className="text-lg font-bold">
                เลือกสายพันธุ์
              </Text>
              <View style={{ width: 28 }} />
            </View>

            {/* Breed Options */}
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {CAT_BREEDS.map((breedOption) => (
                <TouchableOpacity
                  key={breedOption}
                  onPress={() => selectBreed(breedOption)}
                  className="py-4 px-4 mb-3 rounded-xl flex-row items-center justify-between"
                  style={{
                    backgroundColor: breed === breedOption ? colors.primary + '20' : colors.surface,
                    borderWidth: breed === breedOption ? 2 : 1,
                    borderColor: breed === breedOption ? colors.primary : colors.border,
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
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}