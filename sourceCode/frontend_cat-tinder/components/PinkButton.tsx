import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'gradient' | 'solid' | 'outline';
}

export default function PinkButton({
  title,
  onPress,
  loading,
  disabled,
  size = 'medium',
  variant = 'gradient'
}: Props) {
  const { colors, isDark } = useTheme();

  const sizeStyles = {
    small: { height: 44, paddingHorizontal: 20 },
    medium: { height: 48, paddingHorizontal: 24 },
    large: { height: 56, paddingHorizontal: 28 },
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  // Gradient colors - Soft Pink Theme
  const gradientColors: readonly [string, string, string] = isDark
    ? ['#E89292', '#D17C7C', '#C06666']
    : ['#FADEE1', '#E89292', '#D17C7C'];

  if (variant === 'gradient') {
    return (
      <View style={{ marginVertical: 8 }}>
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled || loading}
          activeOpacity={0.85}
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            opacity: disabled || loading ? 0.5 : 1,
            shadowColor: '#E89292',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              ...sizeStyles[size],
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'row',
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text 
                className={`text-white font-bold ${textSizeClasses[size]}`}
                style={{ 
                  textAlign: 'center',
                  letterSpacing: 0.5,
                  textShadowColor: 'rgba(0,0,0,0.2)', 
                  textShadowOffset: { width: 0, height: 1 }, 
                  textShadowRadius: 2 
                }}
              >
                {title}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  if (variant === 'outline') {
    return (
      <View style={{ marginVertical: 8 }}>
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled || loading}
          activeOpacity={0.85}
          style={{ 
            ...sizeStyles[size],
            borderRadius: 16,
            borderWidth: 2.5, 
            borderColor: colors.primary,
            backgroundColor: isDark ? 'rgba(255, 105, 180, 0.1)' : 'rgba(255, 105, 180, 0.05)',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            opacity: disabled || loading ? 0.5 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text 
              style={{ 
                color: colors.primary,
                textAlign: 'center',
                letterSpacing: 0.5,
              }} 
              className={`font-bold ${textSizeClasses[size]}`}
            >
              {title}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Solid variant
  return (
    <View style={{ marginVertical: 8 }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={{ 
          ...sizeStyles[size],
          borderRadius: 16,
          backgroundColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          opacity: disabled || loading ? 0.5 : 1,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text 
            className={`text-white font-bold ${textSizeClasses[size]}`}
            style={{ 
              textAlign: 'center',
              letterSpacing: 0.5,
              textShadowColor: 'rgba(0,0,0,0.2)', 
              textShadowOffset: { width: 0, height: 1 }, 
              textShadowRadius: 2 
            }}
          >
            {title}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}