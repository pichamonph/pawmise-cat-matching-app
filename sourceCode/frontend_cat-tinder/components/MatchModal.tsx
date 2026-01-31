import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Match } from '@/types';
import PinkButton from './PinkButton';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MatchModalProps {
  visible: boolean;
  match: Match | null;
  onClose: () => void;
  onSendMessage: () => void;
}

export default function MatchModal({
  visible,
  match,
  onClose,
  onSendMessage
}: MatchModalProps) {
  const { colors, isDark } = useTheme();


  if (!match) {
    return null;
  }



  const { catAId, catBId } = match;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}>
        <View style={{
          width: screenWidth * 0.9,
          backgroundColor: isDark ? '#2a2a2a' : 'white',
          borderRadius: 24,
          padding: 24,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 20,
          zIndex: 10000,
          maxHeight: screenHeight * 0.8,
          borderWidth: 2,
          borderColor: colors.primary,
        }}>
          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>

          {/* Match Icon */}
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Ionicons name="heart" size={40} color="white" />
          </View>

          {/* Title */}
          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
            textAlign: 'center',
          }}>
            It's a Match! 💕
          </Text>

          <Text style={{
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 22,
          }}>
            คุณและเจ้าของ {catAId.name} ชอบกันและกัน!{'\n'}
            ไปแชทกันเลย
          </Text>

          {/* Cat Photos */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 32,
            gap: 16,
          }}>
            {/* Cat A */}
            <View style={{ alignItems: 'center' }}>
              <View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                overflow: 'hidden',
                borderWidth: 4,
                borderColor: colors.primary,
              }}>
                <Image
                  source={{ uri: catAId.photos[0]?.url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
              <Text style={{
                marginTop: 8,
                fontSize: 16,
                fontWeight: 'bold',
                color: colors.text,
              }}>
                {catAId.name}
              </Text>
            </View>

            {/* Heart Icon */}
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primary + '20',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="heart" size={24} color={colors.primary} />
            </View>

            {/* Cat B */}
            <View style={{ alignItems: 'center' }}>
              <View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                overflow: 'hidden',
                borderWidth: 4,
                borderColor: colors.primary,
              }}>
                <Image
                  source={{ uri: catBId.photos[0]?.url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
              <Text style={{
                marginTop: 8,
                fontSize: 16,
                fontWeight: 'bold',
                color: colors.text,
              }}>
                {catBId.name}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ gap: 12, width: '100%' }}>
            <PinkButton
              title="ไปแชทกัน 💬"
              onPress={onSendMessage}
              size="large"
              variant="gradient"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}