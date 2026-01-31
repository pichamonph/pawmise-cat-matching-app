// app/index.tsx - แก้ไข
import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { View, ActivityIndicator, Text } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

export default function Index() {
  const { isAuthenticated, loading, user } = useAuth();
  const { colors } = useTheme();

  console.log('📱 Index rendered - loading:', loading, 'isAuthenticated:', isAuthenticated, 'user:', !!user);
  console.log('📱 Index user details:', { userId: user?._id, email: user?.email });

  // แสดง loading ขณะเช็ค auth
  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ 
          color: colors.textSecondary, 
          marginTop: 16,
          fontSize: 16,
        }}>
          กำลังโหลด...
        </Text>
      </View>
    );
  }

  // ✅ เช็คว่า user authenticated แล้วให้ไปหน้า home เลย
  if (isAuthenticated && user) {
    console.log('🏠 User authenticated, redirecting to home');
    return <Redirect href="/(tabs)/home" />;
  }

  console.log('🔐 User not authenticated, redirecting to login');
  return <Redirect href="/(auth)/login" />;
}