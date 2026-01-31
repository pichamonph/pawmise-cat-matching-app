import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
}

export default function ThaiInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  multiline = false,
  numberOfLines = 1,
}: Props) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const borderColor = error ? 'border-error' : isFocused ? 'border-primary' : 'border-border';

  return (
    <View className="mb-4">
      <Text style={{ color: colors.text }} className="text-sm font-medium mb-2">
        {label}
      </Text>
      <View className="relative">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`border ${borderColor} rounded-2xl px-4 text-base ${
            secureTextEntry ? 'pr-12' : ''
          } ${multiline ? 'min-h-[80px] py-3' : 'h-12'}`}
          style={{
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: error ? colors.error : isFocused ? colors.primary : colors.border,
            textAlignVertical: multiline ? 'top' : 'center',
            paddingTop: multiline ? 12 : 0,
            paddingBottom: multiline ? 12 : 0,
          }}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="absolute right-4"
            style={{ top: '50%', transform: [{ translateY: -10 }] }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text style={{ color: colors.error }} className="text-xs mt-1">
          {error}
        </Text>
      )}
    </View>
  );
}