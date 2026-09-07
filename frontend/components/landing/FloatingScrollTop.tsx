import React, { useState, useEffect, useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  Platform,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { ChevronUp } from 'lucide-react-native';

interface FloatingScrollTopProps {
  visible: boolean;
  onPress: () => void;
}

const isWeb = Platform.OS === 'web';

export const FloatingScrollTop: React.FC<FloatingScrollTopProps> = ({
  visible,
  onPress,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 250,
      useNativeDriver: !isWeb,
    }).start();
  }, [visible, anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  });

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          opacity: anim,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {/* Sleek cyber tooltip on hover (Web only) */}
      {isWeb && isHovered && (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            { whiteSpace: 'nowrap' } as any,
          ]}
        >
          <Text style={styles.tooltipText}>Back to top</Text>
          <View style={styles.tooltipArrow} />
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        accessibilityRole="button"
        accessibilityLabel="Scroll back to top"
        style={[
          styles.button,
          isHovered && styles.buttonHovered,
          isPressed && styles.buttonPressed,
          isWeb && ({
            cursor: 'pointer',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: isHovered
              ? '0 12px 32px rgba(0, 0, 0, 0.6), 0 0 24px rgba(255, 107, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.35)'
              : '0 8px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(255, 107, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
          } as any),
        ]}
        {...(isWeb
          ? {
              onMouseEnter: () => setIsHovered(true),
              onMouseLeave: () => setIsHovered(false),
            }
          : {})}
      >
        {/* Specular highlight overlay for realistic glass sheen */}
        <View
          pointerEvents="none"
          style={[
            styles.specularSheen,
            isWeb && ({
              background:
                'linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%)',
            } as any),
          ]}
        />

        {/* Ambient accent core glow */}
        <View
          pointerEvents="none"
          style={[
            styles.glowCenter,
            isHovered && styles.glowCenterHovered,
          ]}
        />

        {/* Arrow / Chevron Icon */}
        <View
          style={[
            styles.iconWrapper,
            isHovered && isWeb && ({
              transform: 'translateY(-2px)',
              transition: 'transform 0.2s ease',
            } as any),
          ]}
        >
          <ChevronUp
            size={22}
            color={isHovered ? '#FFA055' : '#FFFFFF'}
            strokeWidth={2.6}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 32 : 24,
    right: Platform.OS === 'web' ? 32 : 20,
    zIndex: 90,
    alignItems: 'center',
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(18, 12, 38, 0.8)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 0, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonHovered: {
    borderColor: 'rgba(255, 146, 72, 0.9)',
    backgroundColor: 'rgba(26, 16, 52, 0.9)',
  },
  buttonPressed: {
    transform: [{ scale: 0.92 }],
  },
  specularSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  glowCenter: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
  },
  glowCenterHovered: {
    backgroundColor: 'rgba(255, 107, 0, 0.3)',
    transform: [{ scale: 1.4 }],
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tooltip: {
    position: 'absolute',
    bottom: 56,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(12, 8, 28, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -4,
    width: 8,
    height: 8,
    backgroundColor: 'rgba(12, 8, 28, 0.92)',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    transform: [{ rotate: '45deg' }],
  },
});
