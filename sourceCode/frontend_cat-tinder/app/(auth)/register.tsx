import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThaiInput from '@/components/ThaiInput';
import PinkButton from '@/components/PinkButton';
import AntDesign from '@expo/vector-icons/AntDesign';

const Register = () => {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
  const { colors, isDark } = useTheme();

  // Current step (1, 2, 3, or 4)
  const [currentStep, setCurrentStep] = useState(1);

  // Form data
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Location data
  const [location, setLocation] = useState({
    province: '',
    lat: 0,
    lng: 0,
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  const [errors, setErrors] = useState({
    username: '',
    avatar: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // Validate each step
  const validateStep = (step: number) => {
    const newErrors = { ...errors };
    let isValid = true;

    if (step === 1) {
      // Step 1: Username validation
      if (!username.trim()) {
        newErrors.username = 'กรุณากรอก username';
        isValid = false;
      } else if (username.trim().length < 3) {
        newErrors.username = 'Username ต้องมีอย่างน้อย 3 ตัวอักษร';
        isValid = false;
      } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        newErrors.username = 'Username ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _';
        isValid = false;
      } else {
        newErrors.username = '';
      }
    }

    if (step === 2) {
      // Step 2: Avatar validation
      if (!avatar) {
        newErrors.avatar = 'กรุณาเลือกรูปโปรไฟล์';
        isValid = false;
      } else {
        newErrors.avatar = '';
      }
    }

    if (step === 3) {
      // Step 3: Email and Phone validation
      if (!email.trim()) {
        newErrors.email = 'กรุณากรอกอีเมล';
        isValid = false;
      } else if (!/^[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
        isValid = false;
      } else {
        newErrors.email = '';
      }

      if (phone && !/^0[0-9]{9}$/.test(phone)) {
        newErrors.phone = 'เบอร์โทรต้องขึ้นต้นด้วย 0 และมี 10 หลัก';
        isValid = false;
      } else {
        newErrors.phone = '';
      }
    }

    if (step === 4) {
      // Step 4: Password validation
      if (!password) {
        newErrors.password = 'กรุณากรอกรหัสผ่าน';
        isValid = false;
      } else if (password.length < 8) {
        newErrors.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
        isValid = false;
      } else {
        newErrors.password = '';
      }

      if (!confirmPassword) {
        newErrors.confirmPassword = 'กรุณายืนยันรหัสผ่าน';
        isValid = false;
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'รหัสผ่านไม่ตรงกัน';
        isValid = false;
      } else {
        newErrors.confirmPassword = '';
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  // Location functions
  const requestLocationPermission = async () => {
    try {
      setLocationLoading(true);
      console.log('🔄 Requesting location permission...');

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.log('❌ Location permission denied');
        Alert.alert(
          'การเข้าถึงตำแหน่ง',
          'เราต้องการทราบตำแหน่งของคุณเพื่อหาแมวคู่ที่ใกล้เคียง\nคุณสามารถข้ามขั้นตอนนี้และเพิ่มข้อมูลภายหลังได้',
          [
            { text: 'ข้าม', style: 'cancel' },
            { text: 'ไปตั้งค่า', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        setLocationPermissionGranted(false);
        return false;
      }

      console.log('✅ Location permission granted');
      setLocationPermissionGranted(true);
      await getCurrentLocation();
      return true;
    } catch (error) {
      console.error('❌ Location permission error:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถขออนุญาตการเข้าถึงตำแหน่งได้');
      return false;
    } finally {
      setLocationLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      console.log('🔄 Getting current location...');

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentLocation.coords;
      console.log('📍 Current location:', { latitude, longitude });

      // Reverse geocode to get province
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      const province = address[0]?.region || address[0]?.subregion || '';

      console.log('🗺️ Address info:', address[0]);
      console.log('🏢 Province:', province);

      setLocation({
        lat: latitude,
        lng: longitude,
        province: province,
      });

      Alert.alert(
        'ตำแหน่งของคุณ',
        `เราพบตำแหน่งของคุณที่: ${province || 'ไม่สามารถระบุจังหวัดได้'}\nLat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
        [{ text: 'ตกลง' }]
      );

    } catch (error) {
      console.error('❌ Get location error:', error);
      Alert.alert(
        'ไม่สามารถหาตำแหน่งได้',
        'กรุณาเปิด GPS และอนุญาตการเข้าถึงตำแหน่ง\nหรือข้ามขั้นตอนนี้และเพิ่มข้อมูลภายหลัง'
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const skipLocation = () => {
    Alert.alert(
      'ข้ามการตั้งค่าตำแหน่ง',
      'คุณสามารถเพิ่มข้อมูลตำแหน่งในภายหลังได้ที่หน้าโปรไฟล์\nการไม่มีข้อมูลตำแหน่งอาจทำให้การหาคู่แมวมีประสิทธิภาพน้อยลง',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ข้าม', onPress: () => console.log('User skipped location setup') }
      ]
    );
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const pickImage = async () => {
    try {
      // Request permissions first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('สิทธิ์การเข้าถึง', 'กรุณาอนุญาตการเข้าถึงแกลเลอรี่เพื่อเลือกรูปโปรไฟล์');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square for avatar
        quality: 0.5, // Reduced quality for faster upload
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setAvatar(result.assets[0].uri);
        setErrors({ ...errors, avatar: '' }); // Clear error when image is selected
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเลือกรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    try {
      console.log('🔄 Submitting registration with location:', location);

      await register({
        email: email.trim(),
        password,
        username: username.trim(),
        phone: phone.trim() || undefined,
        avatar: avatar,
        location: {
          province: location.province || '',
          lat: location.lat || 0,
          lng: location.lng || 0,
        },
      });

      // Register สำเร็จ → ไปเพิ่มข้อมูลแมว
      router.replace('/(auth)/add-cat');
    } catch (error: any) {
      console.error('Register error:', error);

      let errorMessage = 'กรุณาลองใหม่อีกครั้ง';
      let errorTitle = 'สมัครสมาชิกไม่สำเร็จ';

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorTitle = 'การอัปโหลดใช้เวลานาน';
        errorMessage = 'การอัปโหลดรูปภาพใช้เวลานานกว่าที่กำหนด กรุณาลองใช้รูปขนาดเล็กกว่า หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง';
      } else if (error.response?.status === 409) {
        errorMessage = 'อีเมลหรือ username นี้ถูกใช้งานแล้ว';
      } else if (error.response?.status >= 500) {
        errorMessage = 'เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่ในภายหลัง';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert(errorTitle, errorMessage);
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
              {step === 1 ? 'บัญชี' : step === 2 ? 'รูปภาพ' : step === 3 ? 'ติดต่อ' : 'รหัสผ่าน'}
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

  // Get step title
  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'ข้อมูลบัญชี';
      case 2:
        return 'รูปโปรไฟล์';
      case 3:
        return 'ข้อมูลการติดต่อ';
      case 4:
        return 'ตั้งรหัสผ่าน';
      default:
        return '';
    }
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View>
            <ThaiInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="username ของคุณ"
              autoCapitalize="none"
              error={errors.username}
            />
          </View>
        );

      case 2:
        return (
          <View className="items-center">
            

            <TouchableOpacity
              onPress={pickImage}
              className="items-center justify-center rounded-full border-4 mb-4"
              style={{
                width: 150,
                height: 150,
                borderColor: errors.avatar ? colors.error : colors.border,
                backgroundColor: colors.surface,
              }}
            >
              {avatar ? (
                <Image
                  source={{ uri: avatar }}
                  style={{ width: 142, height: 142 }}
                  className="rounded-full"
                />
              ) : (
                <View className="items-center">
                  <Ionicons name="camera" size={48} color={colors.primary} />
                  <Text style={{ color: colors.textSecondary }} className="text-sm mt-2 text-center">
                    แตะเพื่อเลือกรูป
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {errors.avatar ? (
              <Text style={{ color: colors.error }} className="text-xs text-center">
                {errors.avatar}
              </Text>
            ) : null}

            <Text style={{ color: colors.textSecondary }} className="text-xs text-center mt-2">
               เลือกรูปที่ชัดเจนและแสดงหน้าตาของคุณ{'\n'}
               ขนาดไฟล์เล็กจะอัปโหลดเร็วกว่า
            </Text>
          </View>
        );

      case 3:
        return (
          <View>
            <ThaiInput
              label="อีเมล"
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />
            <ThaiInput
              label="เบอร์โทร (ไม่บังคับ)"
              value={phone}
              onChangeText={setPhone}
              placeholder="0812345678"
              keyboardType="phone-pad"
              error={errors.phone}
            />

            {/* Location Section */}
            <View className="">
              <Text style={{ color: colors.text }} className="text-sm font-medium mb-4">
                 ตำแหน่งของคุณ (ไม่บังคับ)
              </Text>

              {location.lat !== 0 && location.lng !== 0 ? (
                // Location detected
                <View
                  className="p-4 rounded-2xl border"
                  style={{
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + '10',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' , marginBottom: 14}}>

                  <View className="flex-row items-center ">
                    <Ionicons name="location" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary }} className="text-sm font-medium ml-2">
                      ตำแหน่งปัจจุบัน
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={requestLocationPermission}
                    className=""
                    >
                    <Text style={{ color: colors.primary }} className="text-sm font-medium">
                      <AntDesign name="reload" size={16} color="" /> อัปเดตตำแหน่ง
                    </Text>
                  </TouchableOpacity>
                  </View>


                  <Text style={{ color: colors.text }} className="text-sm mb-1">
                     {location.province || 'ไม่สามารถระบุจังหวัดได้'}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-xs">
                    Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)}
                  </Text>
                  
                </View>
              ) : (
                // No location detected
                <View
                  className="p-4 rounded-2xl border"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Text style={{ color: colors.textSecondary }} className="text-sm mb-4 text-center">
                    ข้อมูลตำแหน่งช่วยให้เราหาแมวคู่ที่ใกล้เคียงกับคุณได้
                  </Text>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <PinkButton
                        title={locationLoading ? "กำลังหาตำแหน่ง..." : " เปิดตำแหน่ง"}
                        onPress={requestLocationPermission}
                        loading={locationLoading}
                        size="medium"
                        variant="gradient"
                      />
                    </View>
                    <View className="flex-1">
                      <PinkButton
                        title="ข้าม"
                        onPress={skipLocation}
                        size="medium"
                        variant='outline'
                      />
                    </View>
                  </View>
                </View>
              )}

            </View>
          </View>
        );

      case 4:
        return (
          <View>
            <ThaiInput
              label="รหัสผ่าน"
              value={password}
              onChangeText={setPassword}
              placeholder="อย่างน้อย 8 ตัวอักษร"
              secureTextEntry
              error={errors.password}
            />
            <ThaiInput
              label="ยืนยันรหัสผ่าน"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              secureTextEntry
              error={errors.confirmPassword}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ backgroundColor: isDark ? '#1a1a1a' : '#FFFFFF' }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center px-6 py-12">
          {/* Logo & Brand */}
          <View className="items-center">
            <Image
              source={require('@/assets/images/logo.png')}
              style={{ width: 300, height: 300 }}
              resizeMode="contain"
            />
          </View>

          {/* Register Card with Progress */}
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
            {/* Progress Indicator - ย้ายมาอยู่ใน Card */}
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
                      ? 'person-outline'
                      : currentStep === 2
                        ? 'camera-outline'
                        : currentStep === 3
                          ? 'mail-outline'
                          : 'lock-closed-outline'
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
            <View className="flex-row gap-3 mt-4">
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
                    title={loading ? "กำลังอัปโหลดรูปภาพ..." : "สร้างบัญชี"}
                    onPress={handleSubmit}
                    loading={loading}
                    size="large"
                    variant="gradient"
                  />
                )}
              </View>
            </View>

            {currentStep === 4 && (
              <Text
                style={{ color: colors.textSecondary }}
                className="text-xs text-center mt-4 leading-5"
              >
                เมื่อกดสร้างบัญชี แสดงว่าคุณยอมรับ{'\n'}
                ข้อกำหนดและนโยบายของเรา
              </Text>
            )}
          </View>

          {/* Login Link */}
          <View className="flex-row justify-center items-center mt-8">
            <Text
              style={{ color: colors.textSecondary }}
              className="text-base"
            >
              มีบัญชีอยู่แล้ว?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text
                style={{ color: '#E89292' }}
                className="text-base font-bold"
              >
                เข้าสู่ระบบ
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Register;