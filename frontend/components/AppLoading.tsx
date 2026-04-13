import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const PROMPTS = [
  'Preparing your workspaceâ€¦',
  'Syncing cloud dataâ€¦',
  'Loading curriculum resourcesâ€¦',
  'Almost thereâ€¦',
  'Welcome back to Cloudora',
];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* Animated SVG ring spinner */
function RingSpinner({ size, strokeWidth, color }: { size: number; strokeWidth: number; color: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  const dash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1600, useNativeDriver: true, easing: Easing.linear })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(dash, { toValue: 1, duration: 900, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(dash, { toValue: 0, duration: 900, useNativeDriver: false, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
  }, []);

  const rotateDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = dash.interpolate({ inputRange: [0, 1], outputRange: [circumference * 0.75, circumference * 0.1] });

  return (
    <Animated.View style={{ transform: [{ rotate: rotateDeg }] }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={color} stopOpacity="0" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring-grad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
    </Animated.View>
  );
}

/* Floating ambient orb */
function Orb({ size, color, top, left, duration, delay }: any) {
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const yAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -30, duration, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(y, { toValue: 0, duration, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    );
    const oAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: duration * 0.8, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: duration * 0.8, useNativeDriver: true }),
      ])
    );
    const startTimer = setTimeout(() => { yAnim.start(); oAnim.start(); }, delay);
    return () => { clearTimeout(startTimer); yAnim.stop(); oAnim.stop(); };
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY: y }],
        ...(Platform.OS === 'web' ? { filter: 'blur(48px)' } : {}),
      } as any}
    />
  );
}

/* Prompt text with slide/fade animation */
function PromptText({ text, isDark }: { text: string; isDark: boolean }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={{
        fontSize: 14,
        color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,11,46,0.45)',
        textAlign: 'center',
        letterSpacing: 0.3,
        opacity: fade,
        transform: [{ translateY: slide }],
      }}
    >
      {text}
    </Animated.Text>
  );
}

export function AppLoading({ onLogout, message }: { onLogout?: () => void; message?: string }) {
  const { isDark } = useTheme();
  const [promptIndex, setPromptIndex] = useState(0);
  const [showRescue, setShowRescue] = useState(false);

  // Progress bar
  const progress = useRef(new Animated.Value(0)).current;
  // Logo pulse
  const pulse = useRef(new Animated.Value(1)).current;
  // Dots cascade
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Prompt cycling
    const interval = setInterval(() => {
      setPromptIndex((p) => (p + 1) % PROMPTS.length);
    }, 2500);

    // Rescue button
    const rescueTimer = setTimeout(() => setShowRescue(true), 8000);

    // Progress bar animation (fake progress, stops at ~90%)
    Animated.timing(progress, {
      toValue: 0.9,
      duration: 9000,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();

    // Logo gentle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();

    // Bouncing dots
    const dotAnim = (d: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(d, { toValue: -6, duration: 350, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(d, { toValue: 0, duration: 350, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ])
      );
    dotAnim(dot1, 0).start();
    dotAnim(dot2, 150).start();
    dotAnim(dot3, 300).start();

    return () => {
      clearInterval(interval);
      clearTimeout(rescueTimer);
    };
  }, []);

  const bg = isDark ? '#0F0B2E' : '#FFFFFF';
  const accent = '#FF6900';
  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ flex: 1, backgroundColor: bg }} collapsable={undefined}>
      {/* Ambient background orbs */}
      <Orb size={350} color="rgba(255,105,0,0.12)" top="-10%" left="-15%" duration={5000} delay={0} />
      <Orb size={280} color="rgba(99,102,241,0.10)" top="60%" left="55%" duration={6500} delay={400} />
      <Orb size={220} color="rgba(236,72,153,0.08)" top="35%" left="65%" duration={4500} delay={800} />
      <Orb size={200} color="rgba(59,130,246,0.07)" top="75%" left="-5%" duration={7000} delay={200} />

      {/* Center content */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>

        {/* Logo + ring spinner stack */}
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 36 }}>
          {/* Outer ring spinner */}
          <View style={{ position: 'absolute' }}>
            <RingSpinner size={120} strokeWidth={2.5} color={accent} />
          </View>
          {/* Inner secondary ring (opposite direction via delay trick) */}
          <View style={{ position: 'absolute' }}>
            <RingSpinner size={96} strokeWidth={1.5} color="rgba(255,105,0,0.4)" />
          </View>
          {/* Logo icon box */}
          <Animated.View
            style={{
              width: 68,
              height: 68,
              borderRadius: 22,
              backgroundColor: isDark ? 'rgba(255,105,0,0.12)' : 'rgba(255,105,0,0.08)',
              borderWidth: 1.5,
              borderColor: 'rgba(255,105,0,0.25)',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pulse }],
              ...(Platform.OS === 'web' ? {
                boxShadow: '0 0 24px rgba(255,105,0,0.2)',
              } : {
                boxShadow: [{ offsetX: 0, offsetY: 0, blurRadius: 16, color: 'rgba(255, 105, 0, 0.3)' }],
                shadowColor: accent,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 8,
              }),
            } as any}
          >
            {/* Cloud-like SVG icon */}
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
              <Defs>
                <LinearGradient id="cloud-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FF9500" />
                  <Stop offset="100%" stopColor="#FF6900" />
                </LinearGradient>
              </Defs>
              {/* Cloud shaped path rendered as circles */}
              <Circle cx="12" cy="14" r="5" fill="url(#cloud-grad)" />
              <Circle cx="8" cy="15" r="3.5" fill="url(#cloud-grad)" />
              <Circle cx="16" cy="15" r="3.5" fill="url(#cloud-grad)" />
              <Circle cx="10" cy="11" r="3" fill="url(#cloud-grad)" />
              <Circle cx="14" cy="10" r="3.5" fill="url(#cloud-grad)" />
            </Svg>
          </Animated.View>
        </View>

        {/* Title */}
        <Text style={{
          fontSize: 22,
          fontWeight: '800',
          color: isDark ? '#FFFFFF' : '#0F0B2E',
          textAlign: 'center',
          letterSpacing: -0.5,
          marginBottom: 8,
        }}>
          {message || 'Loading Cloudora'}
        </Text>

        {/* Bouncing dots */}
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {[dot1, dot2, dot3].map((d, i) => (
            <Animated.View
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: accent,
                opacity: 0.85,
                transform: [{ translateY: d }],
              }}
            />
          ))}
        </View>
      </View>

      {/* Bottom Loading status */}
      <View style={{ position: 'absolute', bottom: 140, width: '100%', alignItems: 'center' }}>
        {/* Animated prompt */}
        <PromptText key={promptIndex} text={PROMPTS[promptIndex]} isDark={isDark} />

        {/* Progress bar */}
        <View style={{
          marginTop: 24,
          width: 200,
          height: 3,
          borderRadius: 2,
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,11,46,0.08)',
          overflow: 'hidden',
        }}>
          <Animated.View style={{
            height: '100%',
            width: progressWidth,
            borderRadius: 2,
            backgroundColor: accent,
          }} />
        </View>
      </View>

      {/* Emergency logout */}
      {showRescue && onLogout && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 56,
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Text style={{
            color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
            fontSize: 13,
            marginBottom: 12,
            textAlign: 'center',
          }}>
            Taking too long?
          </Text>
          <TouchableOpacity
            onPress={onLogout}
            style={{
              paddingHorizontal: 22,
              paddingVertical: 10,
              borderRadius: 22,
              backgroundColor: 'rgba(255,105,0,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(255,105,0,0.2)',
            }}
          >
            <Text style={{ color: accent, fontWeight: '700', fontSize: 14 }}>
              Emergency Sign Out
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}