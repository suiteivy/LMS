import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface MobileLivingBackgroundProps {
  colorStops?: string[]; // [primary, secondary, tertiary]
  style?: StyleProp<ViewStyle>;
}

/**
 * MobileLivingBackground
 *
 * Unified, 60fps native-accelerated living aurora background tailored for mobile devices.
 * Employs hardware-accelerated transforms (translateX, translateY, scale, rotate, opacity)
 * via React Native's NativeDriver to guarantee butter-smooth performance even on
 * low-end Android chipsets (e.g., Unisoc T612, MediaTek Helio G35).
 *
 * Serves as the single shared visual foundation across:
 * 1. Splash Screen / Animated Entrance Transition
 * 2. Onboarding Carousel Screens
 * 3. Mobile Sign-In Screen
 */
export const MobileLivingBackground: React.FC<MobileLivingBackgroundProps> = ({
  colorStops = ['#FF6B00', '#7C3AED', '#3166BE'],
  style,
}) => {
  // Orb floating animation values (Native Driver)
  const orb1TranslateX = useRef(new Animated.Value(0)).current;
  const orb1TranslateY = useRef(new Animated.Value(0)).current;
  const orb1Scale = useRef(new Animated.Value(1)).current;

  const orb2TranslateX = useRef(new Animated.Value(0)).current;
  const orb2TranslateY = useRef(new Animated.Value(0)).current;
  const orb2Scale = useRef(new Animated.Value(1)).current;

  const orb3TranslateX = useRef(new Animated.Value(0)).current;
  const orb3TranslateY = useRef(new Animated.Value(0)).current;

  // Aurora Curtain wave animation values (Native Driver)
  const auroraTranslateX = useRef(new Animated.Value(0)).current;
  const auroraTranslateY = useRef(new Animated.Value(0)).current;
  const auroraScale = useRef(new Animated.Value(1)).current;
  const auroraRotate = useRef(new Animated.Value(0)).current;
  const auroraOpacity = useRef(new Animated.Value(0.26)).current;

  useEffect(() => {
    // Orb 1: Primary top-left ambient drift (12s infinite loop)
    const anim1 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb1TranslateX, {
            toValue: SCREEN_WIDTH * 0.15,
            duration: 6000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb1TranslateY, {
            toValue: SCREEN_HEIGHT * 0.08,
            duration: 6000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb1Scale, {
            toValue: 1.15,
            duration: 6000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb1TranslateX, {
            toValue: 0,
            duration: 6000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb1TranslateY, {
            toValue: 0,
            duration: 6000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb1Scale, {
            toValue: 1.0,
            duration: 6000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Orb 2: Secondary center-right ambient drift (15s infinite loop)
    const anim2 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb2TranslateX, {
            toValue: -SCREEN_WIDTH * 0.18,
            duration: 7500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb2TranslateY, {
            toValue: -SCREEN_HEIGHT * 0.1,
            duration: 7500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb2Scale, {
            toValue: 0.88,
            duration: 7500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb2TranslateX, {
            toValue: 0,
            duration: 7500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(orb2TranslateY, {
            toValue: 0,
            duration: 7500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb2Scale, {
            toValue: 1.0,
            duration: 7500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Orb 3: Tertiary bottom-left subtle counter-drift (18s infinite loop)
    const anim3 = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orb3TranslateX, {
            toValue: SCREEN_WIDTH * 0.12,
            duration: 9000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb3TranslateY, {
            toValue: -SCREEN_HEIGHT * 0.06,
            duration: 9000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(orb3TranslateX, {
            toValue: 0,
            duration: 9000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(orb3TranslateY, {
            toValue: 0,
            duration: 9000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Aurora Curtain: Wave & breathing drift (14s organic loop)
    const animAurora = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(auroraTranslateX, {
            toValue: SCREEN_WIDTH * 0.1,
            duration: 7000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(auroraTranslateY, {
            toValue: SCREEN_HEIGHT * 0.05,
            duration: 7000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(auroraRotate, {
            toValue: 1,
            duration: 7000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(auroraScale, {
            toValue: 1.08,
            duration: 7000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(auroraOpacity, {
            toValue: 0.38,
            duration: 7000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(auroraTranslateX, {
            toValue: 0,
            duration: 7000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(auroraTranslateY, {
            toValue: 0,
            duration: 7000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(auroraRotate, {
            toValue: 0,
            duration: 7000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(auroraScale, {
            toValue: 1.0,
            duration: 7000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(auroraOpacity, {
            toValue: 0.24,
            duration: 7000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    anim1.start();
    anim2.start();
    anim3.start();
    animAurora.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      animAurora.stop();
    };
  }, []);

  const primaryColor = colorStops[0] || '#FF6B00';
  const secondaryColor = colorStops[1] || '#7C3AED';
  const tertiaryColor = colorStops[2] || '#3166BE';

  const rotateInterpolation = auroraRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-16deg', '-6deg'],
  });

  return (
    <View pointerEvents="none" style={[styles.container, style]}>
      {/* Orb 1: Primary Radiant Nebula (Top Left) */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          {
            backgroundColor: primaryColor,
            transform: [
              { translateX: orb1TranslateX },
              { translateY: orb1TranslateY },
              { scale: orb1Scale },
            ],
          },
        ]}
      />

      {/* Orb 2: Secondary Atmospheric Haze (Center Right) */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          {
            backgroundColor: secondaryColor,
            transform: [
              { translateX: orb2TranslateX },
              { translateY: orb2TranslateY },
              { scale: orb2Scale },
            ],
          },
        ]}
      />

      {/* Orb 3: Tertiary Horizon Glow (Bottom Center) */}
      <Animated.View
        style={[
          styles.orb,
          styles.orb3,
          {
            backgroundColor: tertiaryColor,
            transform: [
              { translateX: orb3TranslateX },
              { translateY: orb3TranslateY },
            ],
          },
        ]}
      />

      {/* Aurora Ambient Curtain Wave (Web Aurora Sibling) */}
      <Animated.View
        style={[
          styles.auroraCurtain,
          {
            opacity: auroraOpacity,
            transform: [
              { translateX: auroraTranslateX },
              { translateY: auroraTranslateY },
              { rotate: rotateInterpolation },
              { scale: auroraScale },
            ],
          },
        ]}
      >
        <Svg width={SCREEN_WIDTH * 1.5} height={SCREEN_HEIGHT * 0.65} viewBox="0 0 500 350">
          <Defs>
            <LinearGradient id="auroraMobileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.45" />
              <Stop offset="45%" stopColor={secondaryColor} stopOpacity="0.38" />
              <Stop offset="100%" stopColor={tertiaryColor} stopOpacity="0.22" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="500" height="350" rx="160" fill="url(#auroraMobileGrad)" />
        </Svg>
      </Animated.View>

      {/* Dark vignette overlay for depth and text legibility */}
      <View style={styles.vignette} />
    </View>
  );
};

const ORB1_SIZE = SCREEN_WIDTH * 0.95;
const ORB2_SIZE = SCREEN_WIDTH * 0.85;
const ORB3_SIZE = SCREEN_WIDTH * 1.1;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#070514',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orb1: {
    top: -ORB1_SIZE * 0.35,
    left: -ORB1_SIZE * 0.25,
    width: ORB1_SIZE,
    height: ORB1_SIZE,
    opacity: 0.28,
  },
  orb2: {
    top: SCREEN_HEIGHT * 0.32,
    right: -ORB2_SIZE * 0.35,
    width: ORB2_SIZE,
    height: ORB2_SIZE,
    opacity: 0.24,
  },
  orb3: {
    bottom: -ORB3_SIZE * 0.45,
    left: SCREEN_WIDTH * 0.05,
    width: ORB3_SIZE,
    height: ORB3_SIZE,
    opacity: 0.26,
  },
  auroraCurtain: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.15,
    left: -SCREEN_WIDTH * 0.25,
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_HEIGHT * 0.65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 5, 20, 0.42)',
  },
});

export default MobileLivingBackground;
