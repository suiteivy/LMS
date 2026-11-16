import React, { useEffect, useRef, useState, useId } from 'react';
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
import { Sparkles, MoveRight, Play } from 'lucide-react-native';
import { router } from 'expo-router';
import { MOTION_TOKENS } from './motionTokens';
import { isReducedMotionPreferred } from './Reveal';

// Global registry of visible Demo buttons so only ONE prominently animates in the viewport at a time
let activeDemoButtonId: string | null = null;
const visibleButtons = new Set<string>();
const listeners = new Set<() => void>();

function registerButton(id: string, isVisible: boolean) {
  if (isVisible) {
    visibleButtons.add(id);
    if (!activeDemoButtonId) {
      activeDemoButtonId = id;
    }
  } else {
    visibleButtons.delete(id);
    if (activeDemoButtonId === id) {
      activeDemoButtonId = visibleButtons.values().next().value || null;
    }
  }
  listeners.forEach((l) => l());
}

export interface DemoButtonProps {
  id?: string;
  label?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showArrow?: boolean;
  variant?: 'primary' | 'nav' | 'compact';
}

/**
 * Premium "Aura" Demo Button
 * Layered, calm, professional animation:
 * 1. Rotating thin gradient ring (7s linear, speeds up on hover)
 * 2. Breathing outer glow (3.2s, no button bouncing)
 * 3. Diagonal shimmer streak (every 4.6s with 1s sweep)
 * 4. Micro-motion icon nudge
 * 5. Magnetic desktop cursor pull (max 6px) & 2px lift
 * 6. Press feedback (0.98 scale + ripple)
 */
export const DemoButton: React.FC<DemoButtonProps> = ({
  id: explicitId,
  label = 'Try Interactive Demo',
  onPress,
  style,
  textStyle,
  size = 'md',
  showIcon = true,
  showArrow = true,
  variant = 'primary',
}) => {
  const generatedId = useId();
  const id = explicitId || `demo-btn-${generatedId}`;

  const isWeb = Platform.OS === 'web';
  const buttonContainerRef = useRef<any>(null);

  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });
  const [, forceUpdate] = useState({});

  // Native fallback animations (for iOS/Android)
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Reduced motion check with dev toggle
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    setReducedMotion(isReducedMotionPreferred());
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(isReducedMotionPreferred());
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
  }, [isWeb]);

  // Tab visibility
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    const handleVisibility = () => setIsTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isWeb]);

  // Viewport intersection observer (only ONE active button runs full aura in viewport)
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

    const node = buttonContainerRef.current;
    const domNode =
      node instanceof HTMLElement
        ? node
        : node?.getScrollableNode
        ? node.getScrollableNode()
        : node?._nativeTag || node;

    if (!domNode || !(domNode instanceof HTMLElement)) {
      registerButton(id, true);
      return () => {
        listeners.delete(onRegistryChange);
        registerButton(id, false);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
          setIsInView(visible);
          registerButton(id, visible);
        });
      },
      { threshold: [0, 0.2, 0.5] }
    );

    observer.observe(domNode);

    return () => {
      listeners.delete(onRegistryChange);
      observer.disconnect();
      registerButton(id, false);
    };
  }, [id, isWeb]);

  const isCoordinatedActive =
    activeDemoButtonId === id && isInView && isTabVisible && !reducedMotion;

  // Native ambient animation loop
  useEffect(() => {
    if (isWeb) return;
    if (!isCoordinatedActive) {
      glowAnim.stopAnimation();
      shimmerAnim.stopAnimation();
      return;
    }

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.35,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    glowLoop.start();

    return () => glowLoop.stop();
  }, [isWeb, isCoordinatedActive, glowAnim, shimmerAnim]);

  // Desktop Magnetic pull calculation
  const handlePointerMove = (e: any) => {
    if (!isWeb || reducedMotion || typeof window === 'undefined') return;
    const domNode = buttonContainerRef.current;
    if (!domNode || typeof domNode.getBoundingClientRect !== 'function') return;

    const rect = domNode.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (e.clientX - centerX) * MOTION_TOKENS.demoButton.magnetic.factor;
    const deltaY = (e.clientY - centerY) * MOTION_TOKENS.demoButton.magnetic.factor;

    const maxPull = MOTION_TOKENS.demoButton.magnetic.maxPull;
    const clampedX = Math.max(-maxPull, Math.min(maxPull, deltaX));
    const clampedY = Math.max(-maxPull, Math.min(maxPull, deltaY));

    setMagneticOffset({ x: clampedX, y: clampedY });
  };

  const handlePointerLeave = () => {
    setHovered(false);
    setMagneticOffset({ x: 0, y: 0 });
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/demo');
    }
  };

  // Sizing definitions
  const sizeStyles = {
    sm: {
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: 14,
      fontSize: 13,
      iconSize: 14,
      minHeight: 44,
    },
    md: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 18,
      fontSize: 15,
      iconSize: 17,
      minHeight: 48,
    },
    lg: {
      paddingVertical: 18,
      paddingHorizontal: 32,
      borderRadius: 22,
      fontSize: 16.5,
      iconSize: 19,
      minHeight: 56,
    },
  }[size];

  // Dynamic CSS styles for Web
  const webAnimationCSS = isWeb
    ? `
      @keyframes auraRingRotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes auraGlowBreathe {
        0%, 100% { opacity: 0.35; filter: blur(12px); transform: scale(1); }
        50% { opacity: 0.85; filter: blur(18px); transform: scale(1.008); }
      }
      @keyframes auraShimmerSweep {
        0%, 75% { transform: translateX(-150%) skewX(-22deg); opacity: 0; }
        76% { opacity: 0.6; }
        85% { transform: translateX(200%) skewX(-22deg); opacity: 0.6; }
        86%, 100% { opacity: 0; }
      }
      @keyframes auraIconNudge {
        0%, 75% { transform: translateX(0); }
        80% { transform: translateX(3.5px); }
        86%, 100% { transform: translateX(0); }
      }
    `
    : '';

  const rotateDuration = hovered
    ? `${MOTION_TOKENS.demoButton.ring.hoverDuration}ms`
    : `${MOTION_TOKENS.demoButton.ring.duration}ms`;

  return (
    <View
      ref={buttonContainerRef}
      style={[
        {
          position: 'relative',
          alignSelf: 'flex-start',
        },
        style,
      ]}
      // @ts-ignore Web pointer events
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={handlePointerLeave}
    >
      {/* Inject CSS keyframes on web */}
      {isWeb && (
        <style dangerouslySetInnerHTML={{ __html: webAnimationCSS }} />
      )}

      {/* 1. BREATHING OUTER GLOW (Aura) */}
      <View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: sizeStyles.borderRadius + 4,
            backgroundColor: 'rgba(255, 107, 0, 0.55)',
            zIndex: 0,
          },
          isWeb
            ? ({
                animation: isCoordinatedActive
                  ? `auraGlowBreathe ${MOTION_TOKENS.demoButton.glow.period}ms ease-in-out infinite`
                  : 'none',
                opacity: hovered ? 0.9 : 0.45,
                filter: hovered ? 'blur(20px)' : 'blur(14px)',
                transition: 'opacity 260ms ease, filter 260ms ease',
              } as any)
            : {},
        ]}
      />

      {/* 2. ROTATING CONIC GRADIENT BORDER RING */}
      <View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: -1.8,
            left: -1.8,
            right: -1.8,
            bottom: -1.8,
            borderRadius: sizeStyles.borderRadius + 2,
            overflow: 'hidden',
            zIndex: 1,
          },
        ]}
      >
        <View
          style={[
            {
              position: 'absolute',
              top: '-150%',
              left: '-150%',
              width: '400%',
              height: '400%',
            },
            isWeb
              ? ({
                  background:
                    'conic-gradient(from 0deg, #FF6B00 0%, #FFA066 25%, #EC4899 50%, #FF8C40 75%, #FF6B00 100%)',
                  animation:
                    isCoordinatedActive && !reducedMotion
                      ? `auraRingRotate ${rotateDuration} linear infinite`
                      : 'none',
                  willChange: 'transform',
                } as any)
              : {
                  backgroundColor: '#FF6B00',
                },
          ]}
        />
      </View>

      {/* 3. SOLID BUTTON CORE & SHIMMER */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          {
            position: 'relative',
            zIndex: 2,
            minHeight: sizeStyles.minHeight,
            paddingVertical: sizeStyles.paddingVertical,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            borderRadius: sizeStyles.borderRadius,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            overflow: 'hidden',
            backgroundColor: '#FF6B00',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.28)',
          },
          isWeb
            ? ({
                background:
                  hovered
                    ? 'linear-gradient(135deg, #FF7D1A 0%, #FF6B00 50%, #EA580C 100%)'
                    : 'linear-gradient(135deg, #FF6B00 0%, #F95000 60%, #D84300 100%)',
                transform: pressed
                  ? 'scale(0.98)'
                  : hovered
                  ? `translate(${magneticOffset.x}px, ${magneticOffset.y - 2}px)`
                  : 'none',
                transition: pressed
                  ? 'transform 80ms ease'
                  : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), background 240ms ease',
                boxShadow: hovered
                  ? '0 0 0 1px rgba(255,255,255,0.4), 0 14px 34px rgba(255,107,0,0.55), inset 0 1px 0 rgba(255,255,255,0.45)'
                  : '0 8px 24px rgba(255,107,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                cursor: 'pointer',
                outline: 'none',
              } as any)
            : {},
        ]}
      >
        {/* Shimmer sweep streak */}
        {isWeb && (
          <View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: 90,
                zIndex: 3,
              },
              {
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                animation:
                  isCoordinatedActive && !reducedMotion
                    ? `auraShimmerSweep ${MOTION_TOKENS.demoButton.shimmer.interval}ms ease-in-out infinite`
                    : 'none',
                willChange: 'transform, opacity',
              } as any,
            ]}
          />
        )}

        {/* Lead Sparkles Icon */}
        {showIcon && (
          <View
            style={[
              { zIndex: 4 },
              isWeb && hovered ? ({ transform: 'rotate(12deg)', transition: 'transform 240ms ease' } as any) : {},
            ]}
          >
            <Sparkles size={sizeStyles.iconSize} color="#FFFFFF" />
          </View>
        )}

        {/* Label */}
        <Text
          style={[
            {
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: sizeStyles.fontSize,
              letterSpacing: 0.25,
              zIndex: 4,
            },
            textStyle,
          ]}
        >
          {label}
        </Text>

        {/* Trail Arrow with micro-motion */}
        {showArrow && (
          <View
            style={[
              { zIndex: 4 },
              isWeb
                ? ({
                    animation:
                      isCoordinatedActive && !reducedMotion
                        ? `auraIconNudge ${MOTION_TOKENS.demoButton.shimmer.interval}ms ease-in-out infinite`
                        : 'none',
                    transform: hovered ? 'translateX(3px)' : 'none',
                    transition: 'transform 240ms ease',
                  } as any)
                : {},
            ]}
          >
            <MoveRight size={sizeStyles.iconSize} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default DemoButton;
