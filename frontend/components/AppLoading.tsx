import { useTheme } from '@/contexts/ThemeContext';
import { Cloud } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const PROMPTS = [
  "Getting things ready...",
  "Hold on a bit...",
  "Almost there...",
  "Setting up your dashboard...",
  "Looking for your data...",
  "Preparing the experience..."
];

// ─── Floating dot ─────────────────────────────────────────────────────────────
function FloatingDot({ delay, color }: { delay: number; color: string }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.3, { duration: 600 })
        ),
        -1,
        false
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          marginHorizontal: 4,
        },
        style,
      ]}
    />
  );
}

// ─── Cloud icon animation ──────────────────────────────────────────────────────
function AnimatedCloud({ isDark }: { isDark: boolean }) {
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Fade + scale in
    opacity.value = withTiming(1, { duration: 800 });
    scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) });

    // Gentle float loop
    translateY.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
  }, []);

  const cloudStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  // Glow ring pulse
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.4);

  useEffect(() => {
    glowScale.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      )
    );
    glowOpacity.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(0.1, { duration: 1800 }),
          withTiming(0.4, { duration: 1800 })
        ),
        -1,
        false
      )
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 120, height: 120 }}>
      {/* Glow ring */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: 110,
            height: 110,
            borderRadius: 55,
            backgroundColor: '#FF6900',
          },
          glowStyle,
        ]}
      />
      {/* Cloud icon */}
      <Animated.View
        style={[
          {
            width: 96,
            height: 96,
            borderRadius: 28,
            backgroundColor: isDark ? '#1a1a1a' : '#fff7f0',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: '#FF690030',
            shadowColor: '#FF6900',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          },
          cloudStyle,
        ]}
      >
        <Cloud size={48} color="#FF6900" strokeWidth={1.5} />
      </Animated.View>
    </View>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ isDark }: { isDark: boolean }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withRepeat(
      withSequence(
        withTiming(100, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View
      style={{
        width: 200,
        height: 3,
        borderRadius: 2,
        backgroundColor: isDark ? '#2c2c2c' : '#f0f0f0',
        overflow: 'hidden',
        marginTop: 32,
      }}
    >
      <Animated.View
        style={[
          {
            height: 3,
            borderRadius: 2,
            backgroundColor: '#FF6900',
          },
          barStyle,
        ]}
      />
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export const AppLoading: React.FC = () => {
  const { isDark } = useTheme();
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % PROMPTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(600)}
      style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#ffffff' }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>

        {/* Cloud */}
        <AnimatedCloud isDark={isDark} />

        {/* Brand name */}
        <Animated.View entering={FadeIn.delay(400).duration(800)} style={{ marginTop: 28, alignItems: 'center' }}>
          <Text style={{
            fontSize: 28,
            fontWeight: '900',
            color: isDark ? '#ffffff' : '#111111',
            letterSpacing: -0.5,
          }}>
            Cloudora
          </Text>
          <Text style={{
            fontSize: 11,
            fontWeight: '700',
            color: '#FF6900',
            letterSpacing: 4,
            textTransform: 'uppercase',
            marginTop: 4,
          }}>
            Learning Management
          </Text>
        </Animated.View>

        {/* Progress bar */}
        <ProgressBar isDark={isDark} />

        {/* Animated prompt */}
        <Animated.View
          key={promptIndex}
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(300)}
          style={{ marginTop: 20, height: 24, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{
            fontSize: 13,
            color: isDark ? '#6b7280' : '#9ca3af',
            fontWeight: '500',
            textAlign: 'center',
          }}>
            {PROMPTS[promptIndex]}
          </Text>
        </Animated.View>

        {/* Floating dots */}
        <View style={{ flexDirection: 'row', marginTop: 32 }}>
          <FloatingDot delay={0} color="#FF6900" />
          <FloatingDot delay={200} color="#FF6900" />
          <FloatingDot delay={400} color="#FF6900" />
        </View>

      </View>
    </Animated.View>
  );
};