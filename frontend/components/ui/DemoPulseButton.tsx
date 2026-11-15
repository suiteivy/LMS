import React, { useEffect, useRef, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Platform,
  StyleProp,
  ViewStyle,
  TextStyle,
  Animated,
  Easing,
} from 'react-native';
import { Sparkles, MoveRight } from 'lucide-react-native';
import { router } from 'expo-router';

// Global registry of visible pulse buttons so only ONE pulses in the viewport at a time
let activePulseId: string | null = null;
const visibleButtons = new Set<string>();
const listeners = new Set<() => void>();

function registerButton(id: string, isVisible: boolean) {
  if (isVisible) {
    visibleButtons.add(id);
    if (!activePulseId) {
      activePulseId = id;
    }
  } else {
    visibleButtons.delete(id);
    if (activePulseId === id) {
      activePulseId = visibleButtons.values().next().value || null;
    }
  }
  listeners.forEach((l) => l());
}

interface DemoPulseButtonProps {
  id?: string;
  label?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showArrow?: boolean;
}

export const DemoPulseButton: React.FC<DemoPulseButtonProps> = ({
  id = 'demo-btn-' + Math.random().toString(36).substring(2, 7),
  label = 'Try Interactive Demo',
  onPress,
  style,
  textStyle,
  size = 'md',
  showIcon = true,
  showArrow = true,
}) => {
  const isWeb = Platform.OS === 'web';
  const buttonRef = useRef<any>(null);

  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [, forceUpdate] = useState({});

  // Pulse animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Reduced motion detection
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);

    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
  }, [isWeb]);

  // Tab visibility detection
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    const handleVisibility = () => {
      setIsTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isWeb]);

  // Viewport intersection observer (only one pulsing button per viewport)
  useEffect(() => {
    const onRegistryChange = () => forceUpdate({});
    listeners.add(onRegistryChange);

    if (!isWeb || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      registerButton(id, true);
      return () => {
        listeners.delete(onRegistryChange);
        registerButton(id, false);
      };
    }

    const node = buttonRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const visible = entry.isIntersecting;
          setIsInView(visible);
          registerButton(id, visible);
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(node);

    return () => {
      listeners.delete(onRegistryChange);
      observer.disconnect();
      registerButton(id, false);
    };
  }, [id, isWeb]);

  const isCurrentPulsing = activePulseId === id && isInView && isTabVisible && !hovered && !pressed && !reducedMotion;

  // Pulse loop effect
  useEffect(() => {
    if (!isCurrentPulsing) {
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        // Heartbeat beat 1
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.035,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
        ]),
        // Relax slightly
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.01,
            duration: 300,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 300,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
        // Rest phase (complete 2.6s cycle)
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
        ]),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [isCurrentPulsing, pulseAnim, glowAnim]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/demo' as any);
    }
  };

  const padVertical = size === 'sm' ? 10 : size === 'lg' ? 18 : 15;
  const padHorizontal = size === 'sm' ? 18 : size === 'lg' ? 32 : 26;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14.5;

  const currentScale = hovered ? 1.025 : pressed ? 0.98 : 1;

  return (
    <View ref={buttonRef} style={{ position: 'relative', alignSelf: 'flex-start' }}>
      {/* Soft expanding glow ring behind the button */}
      {!reducedMotion && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: 22,
            backgroundColor: 'rgba(255, 107, 0, 0.35)',
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.8],
            }),
            transform: [
              {
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.06],
                }),
              },
            ],
            zIndex: 0,
          }}
        />
      )}

      {/* Main Button */}
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={label}
        //@ts-ignore
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        style={[
          {
            position: 'relative',
            zIndex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 9,
            backgroundColor: '#FF6B00',
            paddingVertical: padVertical,
            paddingHorizontal: padHorizontal,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.35)',
            overflow: 'hidden',
            boxShadow: [
              {
                offsetX: 0,
                offsetY: hovered ? 12 : 8,
                blurRadius: hovered ? 28 : 20,
                color: hovered ? 'rgba(255, 107, 0, 0.65)' : 'rgba(255, 107, 0, 0.4)',
              },
            ],
          },
          isWeb
            ? ({
                background: hovered
                  ? 'linear-gradient(135deg, #FF8C40 0%, #FF6B00 50%, #E65100 100%)'
                  : 'linear-gradient(135deg, #FF7A1A 0%, #FF6B00 60%, #EA580C 100%)',
                transform: [
                  { translateY: hovered ? -2 : 0 },
                  { scale: currentScale },
                ],
                transition: reducedMotion
                  ? 'none'
                  : 'transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s ease, background 0.25s ease',
                cursor: 'pointer',
                outline: 'none',
              } as any)
            : {},
          style,
        ]}
      >
        {/* Top glass refraction sheen */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45%',
            opacity: 0.75,
            ...(isWeb
              ? ({
                  background:
                    'linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 100%)',
                } as any)
              : {}),
          }}
        />

        {showIcon && <Sparkles size={size === 'sm' ? 14 : 17} color="#FFFFFF" />}
        <Text
          style={[
            {
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize,
              letterSpacing: 0.3,
            },
            textStyle,
          ]}
        >
          {label}
        </Text>
        {showArrow && (
          <MoveRight
            size={size === 'sm' ? 14 : 17}
            color="#FFFFFF"
            style={
              isWeb && hovered
                ? ({
                    transform: [{ translateX: 3 }],
                    transition: 'transform 0.2s ease',
                  } as any)
                : {}
            }
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

export default DemoPulseButton;
