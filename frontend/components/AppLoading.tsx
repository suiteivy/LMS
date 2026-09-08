import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Path,
  Rect,
} from 'react-native-svg';
import { LogOut } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { LivingBackground } from '@/components/landing/LivingBackground';
import { CloudoraLogo } from '@/components/common/CloudoraLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

/* ─────────────────────────────────────────────────────────────────────────────
   1. SEGMENTED CYBER PROGRESS CONDUIT (Integrated into Loader)
───────────────────────────────────────────────────────────────────────────── */
export function CyberConduit({
  progressVal,
  maxWidth = 340,
}: {
  progressVal: Animated.Value;
  maxWidth?: number;
}) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const id = progressVal.addListener(({ value }) => {
      setPercent(Math.min(99, Math.round(value * 100)));
    });
    return () => progressVal.removeListener(id);
  }, [progressVal]);

  const TOTAL_CELLS = 20;
  const activeCells = Math.floor((percent / 100) * TOTAL_CELLS);

  return (
    <View style={{ width: '100%', maxWidth, alignItems: 'center' }}>
      {/* Monospace Percentage */}
      <View
        style={{
          width: '100%',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            color: '#FFA040',
            fontSize: 13,
            fontWeight: '900',
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            letterSpacing: 1.5,
          }}
        >
          {percent}%
        </Text>
      </View>

      {/* Segmented LED Energy Bar */}
      <View
        style={{
          width: '100%',
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          padding: 1.5,
          flexDirection: 'row',
          gap: 2,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: TOTAL_CELLS }).map((_, idx) => {
          const isActive = idx <= activeCells;
          return (
            <View
              key={idx}
              style={{
                flex: 1,
                borderRadius: 1.5,
                backgroundColor: isActive
                  ? idx < 12
                    ? '#7C3AED'
                    : '#FF6B00'
                  : 'transparent',
                opacity: isActive ? 0.95 : 0.15,
                ...(isActive && isWeb
                  ? ({
                      boxShadow:
                        idx < 12
                          ? '0 0 6px rgba(124, 58, 237, 0.6)'
                          : '0 0 6px rgba(255, 107, 0, 0.8)',
                    } as any)
                  : {}),
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. KINETIC QUANTUM REACTOR LOADER (Floating & Unboxed)
   - Completely unboxed: no square container or background box around the logo.
   - Preserves the iconic Cloudora logo, freely floating inside the kinetic rings.
   - Features the integrated clean progress bar beneath the reactor.
───────────────────────────────────────────────────────────────────────────── */
export interface QuantumReactorProps {
  size?: number;
  accentColor?: string;
  showProgress?: boolean;
  progressVal?: Animated.Value;
}

export function QuantumReactorLoader({
  size = 190,
  accentColor = '#FF6B00',
  showProgress = true,
  progressVal,
}: QuantumReactorProps) {
  // Rotations
  const outerRotate = useRef(new Animated.Value(0)).current;
  const middleRotate = useRef(new Animated.Value(0)).current;
  const innerRotate = useRef(new Animated.Value(0)).current;

  // Pulse & holographic breathing
  const corePulse = useRef(new Animated.Value(1)).current;
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;

  // Internal progress fallback if not passed from parent
  const internalProgress = useRef(new Animated.Value(0)).current;
  const activeProgress = progressVal || internalProgress;

  useEffect(() => {
    // 1. Outer chrono orbital track (clockwise, smooth 14s)
    Animated.loop(
      Animated.timing(outerRotate, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 2. Middle segmented flux ring (counter-clockwise, 9s)
    Animated.loop(
      Animated.timing(middleRotate, {
        toValue: 1,
        duration: 9000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 3. Inner high-velocity plasma conduit (clockwise, 3s)
    Animated.loop(
      Animated.timing(innerRotate, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 4. Logo core floating breathing pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(corePulse, {
          toValue: 1.08,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(corePulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 5. Expanding resonance pulse waves
    const createWaveAnim = (animVal: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animVal, {
            toValue: 1,
            duration: 2600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(animVal, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    createWaveAnim(wave1, 0).start();
    createWaveAnim(wave2, 1300).start();

    // Fallback internal progress animation if no progressVal supplied
    if (!progressVal) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(internalProgress, {
            toValue: 0.92,
            duration: 5000,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.delay(1000),
          Animated.timing(internalProgress, {
            toValue: 0.1,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [progressVal]);

  const outerDeg = outerRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const middleDeg = middleRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });
  const innerDeg = innerRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Wave interpolations
  const wave1Scale = wave1.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.45] });
  const wave1Opacity = wave1.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.6, 0.3, 0] });

  const wave2Scale = wave2.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.45] });
  const wave2Opacity = wave2.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.6, 0.3, 0] });

  const logoFloatingSize = size * 0.52;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* ── ORBITAL REACTOR KINETIC FIELD ── */}
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* ── RESONANCE PULSE WAVE 1 ── */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size * 0.76,
            height: size * 0.76,
            borderRadius: (size * 0.76) / 2,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 107, 0, 0.45)',
            opacity: wave1Opacity,
            transform: [{ scale: wave1Scale }],
          }}
        />

        {/* ── RESONANCE PULSE WAVE 2 ── */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size * 0.76,
            height: size * 0.76,
            borderRadius: (size * 0.76) / 2,
            borderWidth: 1.5,
            borderColor: 'rgba(124, 58, 237, 0.45)',
            opacity: wave2Opacity,
            transform: [{ scale: wave2Scale }],
          }}
        />

        {/* ── AMBIENT BIOLUMINESCENT HALO ── */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size * 0.65,
            height: size * 0.65,
            borderRadius: (size * 0.65) / 2,
            backgroundColor: 'rgba(255, 107, 0, 0.18)',
            ...(isWeb
              ? ({
                  filter: 'blur(28px)',
                } as any)
              : {}),
          }}
        />

        {/* ── LAYER 1: OUTER CHRONO ORBITAL TRACK (Clockwise) ── */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            transform: [{ rotate: outerDeg }],
          }}
        >
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Defs>
              <LinearGradient id="outerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#FF8C40" stopOpacity="0.9" />
                <Stop offset="40%" stopColor="#FF6B00" stopOpacity="0.3" />
                <Stop offset="80%" stopColor="#7C3AED" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#38BDF8" stopOpacity="1" />
              </LinearGradient>
            </Defs>

            {/* Background guide track */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 6}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={1.5}
              fill="none"
              strokeDasharray="3 9"
            />

            {/* Primary segmented chrono arcs */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size / 2 - 6}
              stroke="url(#outerGrad)"
              strokeWidth={2.5}
              fill="none"
              strokeDasharray={`${size * 0.45} ${size * 0.18} ${size * 0.28} ${size * 0.35}`}
              strokeLinecap="round"
            />

            {/* Orbiting Quantum Photon Bead */}
            <Circle cx={size / 2} cy={6} r={4.5} fill="#FFA040" />
            <Circle
              cx={size / 2}
              cy={6}
              r={7}
              stroke="rgba(255, 160, 64, 0.5)"
              strokeWidth={1.5}
              fill="none"
            />
          </Svg>
        </Animated.View>

        {/* ── LAYER 2: MIDDLE TELEMETRY & FLUX RING (Counter-Clockwise) ── */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size * 0.78,
            height: size * 0.78,
            transform: [{ rotate: middleDeg }],
          }}
        >
          <Svg width={size * 0.78} height={size * 0.78} viewBox={`0 0 ${size * 0.78} ${size * 0.78}`}>
            <Defs>
              <LinearGradient id="midGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#06B6D4" stopOpacity="0.85" />
                <Stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.4" />
                <Stop offset="100%" stopColor="#FF6B00" stopOpacity="0.9" />
              </LinearGradient>
            </Defs>

            <Circle
              cx={(size * 0.78) / 2}
              cy={(size * 0.78) / 2}
              r={(size * 0.78) / 2 - 5}
              stroke="url(#midGrad)"
              strokeWidth={1.8}
              fill="none"
              strokeDasharray="18 12 6 12 32 14"
              strokeLinecap="round"
            />

            <Circle cx={(size * 0.78) / 2} cy={5} r={2.5} fill="#06B6D4" />
            <Circle cx={(size * 0.78) - 10} cy={(size * 0.78) * 0.75} r={2.5} fill="#8B5CF6" />
            <Circle cx={10} cy={(size * 0.78) * 0.75} r={2.5} fill="#FF6B00" />
          </Svg>
        </Animated.View>

        {/* ── LAYER 3: INNER HIGH-VELOCITY FLUX VORTEX (Clockwise) ── */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size * 0.58,
            height: size * 0.58,
            transform: [{ rotate: innerDeg }],
          }}
        >
          <Svg width={size * 0.58} height={size * 0.58} viewBox={`0 0 ${size * 0.58} ${size * 0.58}`}>
            <Defs>
              <LinearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor="#FF9500" stopOpacity="0" />
                <Stop offset="70%" stopColor="#FF6B00" stopOpacity="0.7" />
                <Stop offset="100%" stopColor="#FFA040" stopOpacity="1" />
              </LinearGradient>
            </Defs>

            <Circle
              cx={(size * 0.58) / 2}
              cy={(size * 0.58) / 2}
              r={(size * 0.58) / 2 - 4}
              stroke="url(#innerGrad)"
              strokeWidth={2.4}
              fill="none"
              strokeDasharray={`${(size * 0.58) * 1.2} ${(size * 0.58) * 0.5}`}
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>


        {/* ── LAYER 5: FLOATING CLOUDORA LOGO (UNBOXED & FREE FLOATING) ── */}
        <Animated.View
          style={{
            width: logoFloatingSize * 1.38,
            height: logoFloatingSize,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: corePulse }],
            ...(isWeb
              ? ({
                  filter: 'drop-shadow(0 0 20px rgba(255, 107, 0, 0.7))',
                } as any)
              : {}),
          }}
        >
          {/* Canonical Cloudora Cloud Icon (Unboxed & Reusable) */}
          <CloudoraLogo size={logoFloatingSize} />
        </Animated.View>
      </View>

      {/* ── INTEGRATED PROGRESS BAR (Directly beneath floating loader) ── */}
      {showProgress && (
        <View style={{ marginTop: 24, width: '100%', alignItems: 'center' }}>
          <CyberConduit progressVal={activeProgress} maxWidth={Math.max(size * 1.5, 300)} />
        </View>
      )}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. MAIN FUTURISTIC LOADER PAGE (AppLoading)
───────────────────────────────────────────────────────────────────────────── */
export function AppLoading({
  onLogout,
  message,
}: {
  onLogout?: () => void;
  message?: string;
}) {
  const { isDark } = useTheme();
  const [showRescue, setShowRescue] = useState(false);
  const [connectionNote, setConnectionNote] = useState<string | null>(null);

  // Animated progress state
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Dynamic progress trajectory: jumps quickly to ~70%, then steadily reaches 94%
    Animated.sequence([
      Animated.timing(progressAnim, {
        toValue: 0.45,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 0.78,
        duration: 3500,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 0.94,
        duration: 6000,
        easing: Easing.out(Easing.sin),
        useNativeDriver: false,
      }),
    ]).start();

    // Informative status updates for slower connections
    const noteTimer = setTimeout(() => {
      setConnectionNote('CONNECTING TO YOUR ACCOUNT...');
    }, 3500);

    // Timeout option to sign out if loading takes longer than usual (5 seconds)
    const rescueTimer = setTimeout(() => setShowRescue(true), 5000);

    return () => {
      clearTimeout(noteTimer);
      clearTimeout(rescueTimer);
    };
  }, []);

  return (
    <View style={styles.canvasContainer}>
      {/* ── 1. LIVING BIOLUMINESCENT AURORA BACKGROUND ── */}
      <LivingBackground
        colorStops={['#FF6B00', '#7C3AED', '#3166BE']}
        amplitude={1.1}
        blend={0.65}
        speed={0.4}
      />

      {/* ── 2. FLOATING CENTERPIECE LOADER ── */}
      <View style={styles.centerStage}>
        {/* Floating Quantum Reactor with Integrated Progress Bar */}
        <QuantumReactorLoader
          size={SCREEN_WIDTH < 400 ? 170 : 210}
          progressVal={progressAnim}
          showProgress={true}
        />

        {/* Brand Header */}
        <View style={{ alignItems: 'center', marginTop: 18 }}>
          <Text style={styles.brandTitle}>
            {message || 'CLOUDORA'}
          </Text>
          <Text style={styles.brandSubtitle}>
            {connectionNote || 'INTELLIGENT LEARNING ECOSYSTEM'}
          </Text>
        </View>
      </View>

      {/* ── 3. BOTTOM RESCUE ACTION ── */}
      <View style={styles.bottomHudZone}>
        {showRescue && onLogout ? (
          <Animated.View style={styles.rescueContainer}>
            <Text style={styles.rescuePrompt}>
              Taking longer than usual to load?
            </Text>
            <TouchableOpacity
              onPress={onLogout}
              activeOpacity={0.8}
              style={styles.rescueButton}
              accessibilityRole="button"
              accessibilityLabel="Sign out and try again"
            >
              <LogOut size={14} color="#FFA040" />
              <Text style={styles.rescueButtonText}>
                SIGN OUT & TRY AGAIN
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          null
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasContainer: {
    flex: 1,
    backgroundColor: '#070514',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'ios' ? 24 : 18,
    paddingHorizontal: 20,
  },
  centerStage: {
    flex: 1,
    width: '100%',
    maxWidth: 540,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 4,
    ...(isWeb
      ? ({
          textShadow: '0 0 24px rgba(255, 107, 0, 0.35)',
        } as any)
      : {}),
  },
  brandSubtitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  bottomHudZone: {
    position: 'absolute',
    bottom: 24,
    width: '100%',
    maxWidth: 960,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  rescueContainer: {
    alignItems: 'center',
    gap: 8,
  },
  rescuePrompt: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    textAlign: 'center',
  },
  rescueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.35)',
    ...(isWeb
      ? ({
          cursor: 'pointer',
          boxShadow: '0 0 16px rgba(255, 107, 0, 0.2)',
        } as any)
      : {}),
  },
  rescueButtonText: {
    color: '#FFA040',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default AppLoading;