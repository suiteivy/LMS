import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Rect,
} from 'react-native-svg';
import { MobileLivingBackground } from '@/components/landing/MobileLivingBackground';

export interface AnimatedEntranceTransitionProps {
  onComplete?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BG_COLOR = '#070514';
const FLAME_PRIMARY = '#FF6B00';
const FLAME_ACCENT = '#FFA040';

// Canonical splash dimensions matching native splash exactly (180dp x 102dp)
const ICON_WIDTH = 180;
const ICON_HEIGHT = 102;

/**
 * AnimatedEntranceTransition (Round 3 Redesign)
 *
 * Visual & Motion Architecture:
 * - NO SURROUNDING CIRCLES or badge containers: the cloud icon stands completely
 *   unboxed and free in deep space (#070514).
 * - THE CLOUD LOGO ITSELF ANIMATES: an organic breathing pulse with overshoot
 *   easing, accompanied by an internal specular light sweep traversing diagonally
 *   across the cloud contours.
 * - MEANINGFUL PACING (3.0s total): slowed down to the upper end of the recommended
 *   range with time biased toward the cloud's own internal motion.
 * - STAGGERED REVEAL: Sub-wordmark ("CLOUDORA / LEARNING ECOSYSTEM") emerges
 *   gracefully after the cloud's form has established its presence.
 * - ACCESSIBILITY & SAFETY: Reduced motion fast-path (180ms fade) and cold-launch
 *   watchdog fallback ensure zero risk of app lockup.
 */
export const AnimatedEntranceTransition: React.FC<AnimatedEntranceTransitionProps> = ({
  onComplete,
}) => {
  const [isDone, setIsDone] = useState(false);
  const hasFinishedRef = useRef(false);

  // Animated values
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const cloudScale = useRef(new Animated.Value(1)).current;
  const cloudGlowOpacity = useRef(new Animated.Value(0)).current;
  const cloudGlowScale = useRef(new Animated.Value(0.95)).current;
  const lightSweepTranslateX = useRef(new Animated.Value(-ICON_WIDTH * 1.5)).current;
  const lightSweepOpacity = useRef(new Animated.Value(0)).current;

  // Header ascension and wordmark reveal
  const sceneTranslateY = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(16)).current;

  const finish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsDone(true);
    onComplete?.();
  };

  useEffect(() => {
    let isMounted = true;

    // Immediately release native OS splash screen now that in-app view is rendered
    const releaseNativeSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Native splash may already have been dismissed
      }
    };
    releaseNativeSplash();

    // Watchdog fallback (4000ms safety buffer to guarantee app never hangs)
    const watchdogTimer = setTimeout(() => {
      if (isMounted) finish();
    }, 4000);

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (!isMounted || hasFinishedRef.current) return;

        if (reduceMotion) {
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            if (isMounted) finish();
          });
          return;
        }

        // Orchestrated 3.0s Cinematic Entrance Motion
        const targetLiftY = -(SCREEN_HEIGHT * 0.26);

        Animated.sequence([
          // Phase 1 (0.0s – 0.4s): Ambient Dawn & Splash Handshake
          // Cloud rests in place matching native splash screen (180x102)
          Animated.delay(400),

          // Phase 2 (0.4s – 1.4s): Cloud Luminescence & Anticipation Bloom (1000ms)
          // Cloud breathes outward with soft spring-style overshoot easing
          Animated.parallel([
            Animated.timing(cloudScale, {
              toValue: 1.08,
              duration: 1000,
              easing: Easing.out(Easing.back(1.4)), // Gentle anticipation overshoot
              useNativeDriver: true,
            }),
            Animated.timing(cloudGlowOpacity, {
              toValue: 0.75,
              duration: 800,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(cloudGlowScale, {
              toValue: 1.15,
              duration: 1000,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),

          // Phase 3 (1.4s – 2.2s): Prismatic Light Sweep & Wordmark Emergence (800ms)
          // A radiant light sweep travels diagonally across the cloud's volumes
          Animated.parallel([
            // Cloud gently breathes back toward resting scale
            Animated.timing(cloudScale, {
              toValue: 1.02,
              duration: 800,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            // Diagonal specular light beam sweep
            Animated.sequence([
              Animated.timing(lightSweepOpacity, {
                toValue: 0.85,
                duration: 200,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              Animated.timing(lightSweepTranslateX, {
                toValue: ICON_WIDTH * 1.5,
                duration: 600,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
                useNativeDriver: true,
              }),
              Animated.timing(lightSweepOpacity, {
                toValue: 0,
                duration: 200,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
            // Staggered wordmark reveal (emerges 200ms into Phase 3)
            Animated.sequence([
              Animated.delay(200),
              Animated.parallel([
                Animated.timing(textOpacity, {
                  toValue: 1,
                  duration: 600,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.timing(textTranslateY, {
                  toValue: 0,
                  duration: 600,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
              ]),
            ]),
          ]),

          // Phase 4 (2.2s – 2.6s): Harmonious Resonance & Brand Hold (400ms)
          // Logo and wordmark hold in pristine clarity with soft radiant breathing
          Animated.parallel([
            Animated.timing(cloudScale, {
              toValue: 1.0,
              duration: 400,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(cloudGlowOpacity, {
              toValue: 0.5,
              duration: 400,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),

          // Phase 5 (2.6s – 3.0s): Fluid Spatial Dissolve & Destination Handoff (400ms)
          Animated.parallel([
            Animated.timing(sceneTranslateY, {
              toValue: targetLiftY,
              duration: 400,
              easing: Easing.bezier(0.4, 0.0, 0.2, 1),
              useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
              toValue: 0,
              duration: 380,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(textOpacity, {
              toValue: 0,
              duration: 300,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]).start(({ finished }) => {
          if (isMounted) finish();
        });
      })
      .catch(() => {
        if (isMounted) finish();
      });

    return () => {
      isMounted = false;
      clearTimeout(watchdogTimer);
    };
  }, []);

  if (isDone) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        styles.container,
        { opacity: overlayOpacity },
      ]}
    >
      {/* Unified Cross-Screen Animated Living Background (Shared across Splash, Onboarding, Sign-In) */}
      <MobileLivingBackground />

      {/* Center Stage: Cloud Logo Standalone (Completely Unboxed, Zero Surrounding Rings) */}
      <Animated.View
        style={[
          styles.cloudCenterStage,
          {
            transform: [
              { translateY: sceneTranslateY },
              { scale: cloudScale },
            ],
          },
        ]}
      >
        {/* Soft Bioluminescent Cloud Silhouette Glow (Matches Cloud Shape, Not a Circle) */}
        <Animated.View
          style={[
            styles.cloudGlowBackdrop,
            {
              opacity: cloudGlowOpacity,
              transform: [{ scale: cloudGlowScale }],
            },
          ]}
        >
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={styles.cloudImageGlow}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Primary Sharp Cloudora Cloud Logo */}
        <View style={styles.cloudImageWrapper}>
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={styles.cloudImage}
            resizeMode="contain"
            accessibilityLabel="Cloudora LMS"
          />

          {/* Diagonal Specular Light Sweep Overlay */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.lightSweepContainer,
              {
                opacity: lightSweepOpacity,
                transform: [
                  { translateX: lightSweepTranslateX },
                  { rotate: '30deg' },
                ],
              },
            ]}
          >
            <Svg width={60} height={ICON_HEIGHT * 1.6} viewBox="0 0 60 160">
              <Defs>
                <LinearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                  <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.75" />
                  <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="60" height="160" fill="url(#sweepGrad)" />
            </Svg>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Branded Sub-wordmark (Staggered Reveal) */}
      <Animated.View
        style={[
          styles.brandTextContainer,
          {
            opacity: textOpacity,
            transform: [
              { translateY: sceneTranslateY },
              { translateY: textTranslateY },
            ],
          },
        ]}
      >
        <Text style={styles.brandTitle}>CLOUDORA</Text>
        <Text style={styles.brandTagline}>LEARNING ECOSYSTEM</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
  },
  cloudCenterStage: {
    width: ICON_WIDTH,
    height: ICON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudGlowBackdrop: {
    position: 'absolute',
    width: ICON_WIDTH * 1.15,
    height: ICON_HEIGHT * 1.15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: FLAME_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.85,
    shadowRadius: 32,
  },
  cloudImageGlow: {
    width: ICON_WIDTH * 1.15,
    height: ICON_HEIGHT * 1.15,
    tintColor: FLAME_ACCENT,
    opacity: 0.45,
  },
  cloudImageWrapper: {
    width: ICON_WIDTH,
    height: ICON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cloudImage: {
    width: ICON_WIDTH,
    height: ICON_HEIGHT,
  },
  lightSweepContainer: {
    position: 'absolute',
    top: -ICON_HEIGHT * 0.3,
    bottom: -ICON_HEIGHT * 0.3,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextContainer: {
    position: 'absolute',
    bottom: Math.max(SCREEN_HEIGHT * 0.16, 90),
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 3.5,
    marginTop: 6,
    textTransform: 'uppercase',
  },
});

export default AnimatedEntranceTransition;
