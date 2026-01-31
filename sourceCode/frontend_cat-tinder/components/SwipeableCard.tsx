// components/SwipeableCard.tsx - เวอร์ชันที่ปัดได้
import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Cat } from '@/types';
import Foundation from '@expo/vector-icons/Foundation';


const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.9;

interface SwipeableCardProps {
  cat: Cat;
  onSwipeLeft: () => void; // ไม่สนใจ
  onSwipeUp: () => void; // สนใจ
  onSwipeRight: () => void; // ชอบ
  onTap: () => void;
  isFirst: boolean;
}

export default function SwipeableCard({
  cat,
  onSwipeLeft,
  onSwipeUp,
  onSwipeRight,
  onTap,
  isFirst
}: SwipeableCardProps) {
  const { colors } = useTheme();

  // Animation values
  const pan = useRef(new Animated.ValueXY()).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const getAge = () => {
    if (cat.ageYears > 0) {
      return cat.ageMonths > 0
        ? `${cat.ageYears}ปี ${cat.ageMonths}ด`
        : `${cat.ageYears}ปี`;
    }
    return `${cat.ageMonths}ด`;
  };

  // Create PanResponder for gesture handling
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only enable swiping for the first card
        return isFirst && (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5);
      },
      onPanResponderGrant: () => {
        // Extract current values properly
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isFirst) return;

        pan.setValue({ x: gestureState.dx, y: gestureState.dy });

        // Rotate card based on horizontal movement
        const rotateValue = gestureState.dx / (screenWidth / 2);
        rotate.setValue(rotateValue);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!isFirst) return;

        pan.flattenOffset();

        const SWIPE_THRESHOLD = screenWidth * 0.25;
        const SWIPE_UP_THRESHOLD = -100;

        if (gestureState.dy < SWIPE_UP_THRESHOLD) {
          // Swipe up - สนใจ (interested)
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: gestureState.dx, y: -screenHeight - 100 },
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
          ]).start(() => {
            onSwipeUp();
            resetCard();
          });
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right - ชอบ (like)
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: screenWidth + 100, y: gestureState.dy },
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
          ]).start(() => {
            onSwipeRight();
            resetCard();
          });
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left - ไม่สนใจ (pass)
          Animated.parallel([
            Animated.timing(pan, {
              toValue: { x: -screenWidth - 100, y: gestureState.dy },
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
          ]).start(() => {
            onSwipeLeft();
            resetCard();
          });
        } else {
          // Snap back to center
          Animated.parallel([
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              useNativeDriver: false,
            }),
            Animated.spring(rotate, {
              toValue: 0,
              useNativeDriver: false,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const resetCard = () => {
    pan.setValue({ x: 0, y: 0 });
    rotate.setValue(0);
    opacity.setValue(1);
  };

  const cardStyle = {
    width: CARD_WIDTH,
    height: 580, // เพิ่มความสูงเพื่อให้พื้นที่ข้อความมากขึ้น
    position: 'absolute' as const,
    backgroundColor: colors.surface,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: isFirst ? 2 : 1,
    transform: isFirst ? [
      { translateX: pan.x },
      { translateY: pan.y },
      {
        rotate: rotate.interpolate({
          inputRange: [-1, 1],
          outputRange: ['-8deg', '8deg'],
        })
      }
    ] : [{ scale: 0.95 }],
    opacity: isFirst ? opacity : 1,
  };

  return (
    <Animated.View
      style={cardStyle}
      {...(isFirst ? panResponder.panHandlers : {})}
    >
      {/* Main Photo - เพิ่ม TouchableOpacity สำหรับ tap to view details */}
      <TouchableOpacity
        onPress={onTap}
        style={{ flex: 1 }}
        activeOpacity={0.95}
      >
        <View style={{
          height: 420,
          overflow: 'hidden',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20
        }}>
          <Image
            source={{ uri: cat.photos[0]?.url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />

          {/* Gradient overlay for better text visibility */}
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            backgroundColor: 'rgba(0,0,0,0.3)',
          }} />
        </View>

        {/* Compact Cat Info */}
        <View style={{ padding: 16, paddingBottom: isFirst ? 100 : 16 }}>
          {/* Name and Gender */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
            justifyContent: 'space-between'
          }}>
            <Text style={{
              color: colors.text,
              fontSize: 24,
              fontWeight: 'bold',
              flex: 1,
              marginRight: 8
            }}>
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

          {/* Essential Info in a row */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}>
            {/* Age */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={{
                color: colors.textSecondary,
                marginLeft: 4,
                fontSize: 14
              }}>
                {getAge()}
              </Text>
            </View>

            {/* Breed */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="paw-outline" size={14} color={colors.textSecondary} />
              <Text style={{
                color: colors.textSecondary,
                marginLeft: 4,
                fontSize: 14
              }}>
                {cat.breed}
              </Text>
            </View>

            {/* Distance */}
            {cat.distance !== undefined && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={{
                  color: colors.textSecondary,
                  marginLeft: 4,
                  fontSize: 14
                }}>
                  {cat.distance}กม.
                </Text>
              </View>
            )}

            {/* Vaccinated badge */}
            {cat.vaccinated && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#10b981' + '20',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8,
              }}>
                <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                <Text style={{
                  color: '#10b981',
                  marginLeft: 3,
                  fontSize: 10,
                  fontWeight: '500'
                }}>
                  วัคซีน
                </Text>
              </View>
            )}
          </View>

          {/* Tap hint */}
          
        </View>
      </TouchableOpacity>

      {/* Action Buttons - แสดงเฉพาะ card แรก */}
      {isFirst && (
        <View style={{
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 20,
        }}>
          {/* Pass Button - ไม่สนใจ */}
          <TouchableOpacity
            onPress={onSwipeLeft}
            style={{
              width: 45,
              height: 45,
              borderRadius: 22.5,
              backgroundColor: '#D95B5B',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>

          {/* Interest Button - สนใจ */}
          <TouchableOpacity
            onPress={onSwipeUp}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#F0CF67',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Ionicons name="star" size={22} color="white" />
          </TouchableOpacity>

          {/* Like Button - ชอบ */}
          <TouchableOpacity
            onPress={onSwipeRight}
            style={{
              width: 45,
              height: 45,
              borderRadius: 22.5,
              backgroundColor: '#E89292',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <Ionicons name="heart" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Swipe Indicators */}
      {isFirst && (
        <>
          {/* Like Indicator - Right */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 100,
              right: 20,
              transform: [{
                rotate: '12deg'
              }],
              opacity: pan.x.interpolate({
                inputRange: [0, screenWidth * 0.25],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
            }}
          >
            <View style={{
              backgroundColor: '#E89292',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 3,
              borderColor: 'white',
            }}>
              <Text style={{
                color: 'white',
                fontSize: 20,
                fontWeight: 'bold',
              }}>
                LIKE
              </Text>
            </View>
          </Animated.View>

          {/* Interest Indicator - Up */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 50,
              left: 0,
              right: 0,
              alignItems: 'center',
              opacity: pan.y.interpolate({
                inputRange: [-100, 0],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            }}
          >
            <View style={{
              backgroundColor: '#f59e0b',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 3,
              borderColor: 'white',
            }}>
              <Text style={{
                color: 'white',
                fontSize: 20,
                fontWeight: 'bold',
              }}>
                INTERESTED ⭐
              </Text>
            </View>
          </Animated.View>

          {/* Pass Indicator - Left */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 100,
              left: 20,
              transform: [{
                rotate: '-12deg'
              }],
              opacity: pan.x.interpolate({
                inputRange: [-screenWidth * 0.25, 0],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            }}
          >
            <View style={{
              backgroundColor: '#D95B5B',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 3,
              borderColor: 'white',
            }}>
              <Text style={{
                color: 'white',
                fontSize: 20,
                fontWeight: 'bold',
              }}>
                PASS
              </Text>
            </View>
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
}