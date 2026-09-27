import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
  G,
} from 'react-native-svg';
import { MobileLivingBackground } from '@/components/landing/MobileLivingBackground';

export interface AnimatedEntranceTransitionProps {
  onComplete?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Color Palette — SuiteIvy / Cloudora Liquid Glass
const BG_COLOR = '#060412';
const FLAME_PRIMARY = '#FF6B00';
const FLAME_CORE = '#FFA040';
const FLAME_HIGHLIGHT = '#FFE0B2';
const VIOLET_PRIMARY = '#7C3AED';
const CYAN_SPECULAR = '#38BDF8';

// Proportional Canonical Cloud Dimensions (1.4:1 aspect ratio matching 28:20 vector viewBox)
const CLOUD_WIDTH = 138;
const CLOUD_HEIGHT = 98;
const GLINT_SIZE = 26;

// Exact apex of the pinnacle cloud dome in 28:20 coordinate space:
// Highest dome is cx=16.5, cy=8.8, r=5.0 -> apex top is (16.5, 3.8).
// In pixel space: x = (16.5 / 28) * 138 = 81.3px, y = (3.8 / 20) * 98 = 18.6px.
const GLINT_LEFT = Math.round((16.5 / 28) * CLOUD_WIDTH - GLINT_SIZE / 2);
const GLINT_TOP = Math.round((3.8 / 20) * CLOUD_HEIGHT - GLINT_SIZE / 2);

/**
 * Molten Glass Droplet Component
 * Luminous molten bead with intense white-hot core, flame mantle, and violet aura.
 */
interface MoltenBeadProps {
  id: string;
  size: number;
}

const MoltenBead: React.FC<MoltenBeadProps> = ({ id, size }) => {
  const half = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id={`beadGrad-${id}`} cx="45%" cy="40%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="25%" stopColor={FLAME_HIGHLIGHT} stopOpacity="0.95" />
          <Stop offset="55%" stopColor={FLAME_CORE} stopOpacity="0.85" />
          <Stop offset="80%" stopColor={FLAME_PRIMARY} stopOpacity="0.5" />
          <Stop offset="100%" stopColor={VIOLET_PRIMARY} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={half} cy={half} r={half} fill={`url(#beadGrad-${id})`} />
    </Svg>
  );
};

/**
 * Prismatic Starburst Glint
 * High-refraction 4-point diamond specular glint that sparks across the glass crest.
 */
const PrismaticStarGlint: React.FC<{ size: number }> = ({ size }) => {
  const half = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="glintAura" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="25%" stopColor={CYAN_SPECULAR} stopOpacity="0.8" />
          <Stop offset="60%" stopColor={FLAME_CORE} stopOpacity="0.35" />
          <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {/* Soft chromatic aura */}
      <Circle cx={half} cy={half} r={half * 0.9} fill="url(#glintAura)" />
      {/* 4-point diamond specular spike */}
      <G fill="#FFFFFF">
        <Path
          d={`M ${half} 2 Q ${half} ${half} ${size - 2} ${half} Q ${half} ${half} ${half} ${size - 2} Q ${half} ${half} 2 ${half} Q ${half} ${half} ${half} 2 Z`}
          opacity={0.98}
        />
      </G>
    </Svg>
  );
};

/**
 * AnimatedEntranceTransition — Concept: "Liquid Glass Formation"
 *
 * Reconfigured Architecture:
 * 1. Background: Unified living Aurora Borealis background matching the web shader.
 * 2. Vector Cloud Logo: Pure mathematical SVG (zero downscaled raster PNGs, zero blur,
 *    zero duplicate overlapping layers, exact sub-pixel alignment).
 * 3. Caustic Light Sweep: Precision-clipped to the cloud silhouette body.
 * 4. Star Glint: Pinpoint anchored to the highest dome crest at (81px, 19px).
 *
 * Cinematic Sequence (~3.6s total):
 * 1. Gathering & Coalescence (0.0s – 0.9s): Molten beads converge into central nucleus.
 * 2. Surface Tension Reshaping (0.9s – 1.9s): Vector cloud blooms with liquid elasticity.
 * 3. Vitrification & Cooling (1.9s – 2.5s): Crystal beveled rim highlight solidifies.
 * 4. Specular Sweep & Star Glint (2.4s – 3.0s): Light beam sweeps across cloud face; star glint sparks at apex.
 * 5. Brand Materialization (2.8s – 3.3s): "CLOUDORA" mark illuminates below.
 * 6. Velvet Curtain Dissolve (3.3s – 3.75s): Scrim dissolves smoothly into app.
 */
export const AnimatedEntranceTransition: React.FC<AnimatedEntranceTransitionProps> = ({
  onComplete,
}) => {
  const [isDone, setIsDone] = useState(false);
  const hasFinishedRef = useRef(false);

  // Master backdrop scrim opacity (dissolves to reveal destination screen underneath)
  const backdropOpacity = useRef(new Animated.Value(1)).current;

  // Spatial translation for the single persistent cloud element handoff
  const sceneTranslateY = useRef(new Animated.Value(0)).current;

  // Destination header lift and scale targets for persistent handoff
  const targetLiftY = -Math.round((SCREEN_HEIGHT * 0.5) - Math.max(SCREEN_HEIGHT * 0.08, 68));
  const targetScale = 0.32;

  // Phase 1: Molten Liquid Beads (4 organic converging droplets)
  const bead1X = useRef(new Animated.Value(-SCREEN_WIDTH * 0.32)).current;
  const bead1Y = useRef(new Animated.Value(-SCREEN_HEIGHT * 0.16)).current;
  const bead1Opacity = useRef(new Animated.Value(0)).current;

  const bead2X = useRef(new Animated.Value(SCREEN_WIDTH * 0.32)).current;
  const bead2Y = useRef(new Animated.Value(-SCREEN_HEIGHT * 0.14)).current;
  const bead2Opacity = useRef(new Animated.Value(0)).current;

  const bead3X = useRef(new Animated.Value(-SCREEN_WIDTH * 0.28)).current;
  const bead3Y = useRef(new Animated.Value(SCREEN_HEIGHT * 0.15)).current;
  const bead3Opacity = useRef(new Animated.Value(0)).current;

  const bead4X = useRef(new Animated.Value(SCREEN_WIDTH * 0.30)).current;
  const bead4Y = useRef(new Animated.Value(SCREEN_HEIGHT * 0.16)).current;
  const bead4Opacity = useRef(new Animated.Value(0)).current;

  // Central Molten Nucleus / Ripple
  const nucleusOpacity = useRef(new Animated.Value(0)).current;
  const nucleusScale = useRef(new Animated.Value(0.2)).current;
  const rippleScale = useRef(new Animated.Value(0.4)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  // Phase 2: Liquid Glass Cloud Silhouette Morph & Surface Tension
  const cloudOpacity = useRef(new Animated.Value(0)).current;
  const cloudScale = useRef(new Animated.Value(0.6)).current;
  const moltenCoreOpacity = useRef(new Animated.Value(0)).current;
  const moltenCoreScale = useRef(new Animated.Value(0.4)).current;

  // Phase 3: Vitrification & Cooling
  const crystalGlowOpacity = useRef(new Animated.Value(0)).current;
  const beveledRimOpacity = useRef(new Animated.Value(0)).current;

  // Phase 4: Specular Light Sweep & Star Glint
  const sweepTranslateX = useRef(new Animated.Value(-CLOUD_WIDTH * 1.4)).current;
  const sweepOpacity = useRef(new Animated.Value(0)).current;
  const glintScale = useRef(new Animated.Value(0)).current;
  const glintOpacity = useRef(new Animated.Value(0)).current;
  const glintRotate = useRef(new Animated.Value(0)).current;

  // Phase 5: Brand Typography
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(10)).current;

  const finish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsDone(true);
    onComplete?.();
  };

  useEffect(() => {
    let isMounted = true;

    // Immediately release native OS splash screen
    const releaseNativeSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Native splash may already be dismissed
      }
    };
    releaseNativeSplash();

    // Cold-launch watchdog safety fallback (4800ms)
    const watchdogTimer = setTimeout(() => {
      if (isMounted) finish();
    }, 4800);

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (!isMounted || hasFinishedRef.current) return;

        if (reduceMotion) {
          // Graceful reduced-motion experience: gentle fade in, hold, fade out
          Animated.sequence([
            Animated.parallel([
              Animated.timing(cloudOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
              Animated.timing(cloudScale, { toValue: 1, duration: 600, useNativeDriver: true }),
              Animated.timing(textOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
            ]),
            Animated.delay(800),
            Animated.parallel([
              Animated.timing(backdropOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
              Animated.timing(cloudOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
              Animated.timing(textOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]),
          ]).start(() => {
            if (isMounted) finish();
          });
          return;
        }

        // ── Grand Liquid Glass Formation Orchestration (~3.8s total) ──
        Animated.sequence([
          // ── PHASE 1: Molten Gathering & Coalescence (0.0s – 0.9s) ──
          Animated.parallel([
            // Molten droplets fade in and converge inward
            Animated.sequence([
              Animated.parallel([
                Animated.timing(bead1Opacity, { toValue: 0.95, duration: 320, useNativeDriver: true }),
                Animated.timing(bead2Opacity, { toValue: 0.9, duration: 320, useNativeDriver: true }),
                Animated.timing(bead3Opacity, { toValue: 0.85, duration: 320, useNativeDriver: true }),
                Animated.timing(bead4Opacity, { toValue: 0.9, duration: 320, useNativeDriver: true }),
              ]),
              Animated.delay(260),
              Animated.parallel([
                Animated.timing(bead1Opacity, { toValue: 0, duration: 320, useNativeDriver: true }),
                Animated.timing(bead2Opacity, { toValue: 0, duration: 320, useNativeDriver: true }),
                Animated.timing(bead3Opacity, { toValue: 0, duration: 320, useNativeDriver: true }),
                Animated.timing(bead4Opacity, { toValue: 0, duration: 320, useNativeDriver: true }),
              ]),
            ]),

            // Physical fluid convergence toward center
            Animated.timing(bead1X, { toValue: 0, duration: 860, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
            Animated.timing(bead1Y, { toValue: 0, duration: 860, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),

            Animated.timing(bead2X, { toValue: 0, duration: 860, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
            Animated.timing(bead2Y, { toValue: 0, duration: 860, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),

            Animated.timing(bead3X, { toValue: 0, duration: 860, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
            Animated.timing(bead3Y, { toValue: 0, duration: 860, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),

            Animated.timing(bead4X, { toValue: 0, duration: 860, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
            Animated.timing(bead4Y, { toValue: 0, duration: 860, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),

            // Central Molten Nucleus wells up as beads merge into it
            Animated.sequence([
              Animated.delay(240),
              Animated.parallel([
                Animated.timing(nucleusOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(nucleusScale, { toValue: 1.15, duration: 520, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
              ]),
              // Coalescence Ripple shockwave
              Animated.parallel([
                Animated.timing(rippleOpacity, { toValue: 0.8, duration: 160, useNativeDriver: true }),
                Animated.timing(rippleScale, { toValue: 2.2, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              ]),
              Animated.timing(rippleOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]),
          ]),

          // ── PHASE 2: Surface Tension Reshaping into Cloud Silhouette (0.9s – 1.9s) ──
          Animated.parallel([
            // Molten nucleus expands outward into the cloud form
            Animated.timing(nucleusScale, {
              toValue: 2.6,
              duration: 750,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(nucleusOpacity, {
              toValue: 0,
              duration: 650,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),

            // Molten Core behind the cloud blooms and matches surface tension
            Animated.sequence([
              Animated.parallel([
                Animated.timing(moltenCoreOpacity, { toValue: 0.9, duration: 450, useNativeDriver: true }),
                Animated.timing(moltenCoreScale, { toValue: 1.25, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              ]),
              Animated.timing(moltenCoreOpacity, { toValue: 0.25, duration: 450, useNativeDriver: true }),
            ]),

            // The Cloudora Liquid Glass silhouette blooms and snaps into shape
            Animated.sequence([
              Animated.parallel([
                Animated.timing(cloudOpacity, {
                  toValue: 1,
                  duration: 650,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.timing(cloudScale, {
                  toValue: 1.08,
                  duration: 650,
                  easing: Easing.out(Easing.back(1.6)),
                  useNativeDriver: true,
                }),
              ]),
              // Viscous harmonic settle to perfect solid scale
              Animated.timing(cloudScale, {
                toValue: 1.0,
                duration: 350,
                easing: Easing.inOut(Easing.quad),
                useNativeDriver: true,
              }),
            ]),
          ]),

          // ── PHASE 3 & 4: Vitrification, Specular Sweep & Star Glint (1.9s – 2.9s) ──
          Animated.parallel([
            // Vitrification: Crystal glass glow and beveled edge rim highlights solidify
            Animated.timing(crystalGlowOpacity, {
              toValue: 0.75,
              duration: 500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(beveledRimOpacity, {
              toValue: 0.9,
              duration: 500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),

            // Specular caustic light sweep traverses the beveled face of the cloud
            Animated.sequence([
              Animated.delay(100),
              Animated.parallel([
                Animated.timing(sweepOpacity, { toValue: 0.95, duration: 180, useNativeDriver: true }),
                Animated.timing(sweepTranslateX, {
                  toValue: CLOUD_WIDTH * 1.4,
                  duration: 620,
                  easing: Easing.bezier(0.22, 1, 0.36, 1),
                  useNativeDriver: true,
                }),
              ]),
              Animated.timing(sweepOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
            ]),

            // Prismatic Diamond Starburst Glint flares at the apex lobe
            Animated.sequence([
              Animated.delay(380),
              Animated.parallel([
                Animated.timing(glintOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.timing(glintScale, {
                  toValue: 1.35,
                  duration: 260,
                  easing: Easing.out(Easing.back(2.0)),
                  useNativeDriver: true,
                }),
                Animated.timing(glintRotate, {
                  toValue: 1,
                  duration: 480,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
              ]),
              Animated.parallel([
                Animated.timing(glintOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
                Animated.timing(glintScale, { toValue: 0.2, duration: 240, useNativeDriver: true }),
              ]),
            ]),

            // Brand Typography ("CLOUDORA") illuminates smoothly
            Animated.sequence([
              Animated.delay(350),
              Animated.parallel([
                Animated.timing(textOpacity, {
                  toValue: 1,
                  duration: 450,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
                Animated.timing(textTranslateY, {
                  toValue: 0,
                  duration: 450,
                  easing: Easing.out(Easing.cubic),
                  useNativeDriver: true,
                }),
              ]),
            ]),
          ]),

          // ── PHASE 5: Equilibrium Rest in Pristine Clarity (2.9s – 3.3s) ──
          Animated.delay(400),

          // ── PHASE 6: Persistent Handoff & Scrim Dissolve (3.3s – 3.8s) ──
          // Single-element persistent handoff: the vector cloud glides smoothly into the destination
          // header position while the backdrop dissolves to resolve the destination screen content.
          Animated.parallel([
            // 1. Spatial Ascent to Destination Header (500ms, smooth deceleration settle)
            Animated.timing(sceneTranslateY, {
              toValue: targetLiftY,
              duration: 500,
              easing: Easing.bezier(0.22, 1, 0.36, 1),
              useNativeDriver: true,
            }),
            // 2. Scale down smoothly from hero presence to header size
            Animated.timing(cloudScale, {
              toValue: targetScale,
              duration: 500,
              easing: Easing.bezier(0.22, 1, 0.36, 1),
              useNativeDriver: true,
            }),
            // 3. Dissolve backdrop scrim so destination screen content gradually resolves in
            Animated.timing(backdropOpacity, {
              toValue: 0,
              duration: 480,
              easing: Easing.bezier(0.4, 0, 0.2, 1),
              useNativeDriver: true,
            }),
            // 4. Accompanying brand wordmark dissolves and settles gently in place
            Animated.timing(textOpacity, {
              toValue: 0,
              duration: 260,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(textTranslateY, {
              toValue: 14,
              duration: 260,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            // 5. Embellishments cleanly distill away during departure
            Animated.timing(crystalGlowOpacity, {
              toValue: 0,
              duration: 250,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(beveledRimOpacity, {
              toValue: 0,
              duration: 250,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(moltenCoreOpacity, {
              toValue: 0,
              duration: 220,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            // 6. Seamless final cross-fade into destination header logo at arrival
            Animated.sequence([
              Animated.delay(440),
              Animated.timing(cloudOpacity, {
                toValue: 0,
                duration: 60,
                easing: Easing.linear,
                useNativeDriver: true,
              }),
            ]),
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

  if (isDone) {
    return null;
  }

  const glintRotation = glintRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        styles.rootContainer,
      ]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      {/* ── Backdrop Scrim Layer (Dissolves in Phase 6 to reveal destination content) ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          styles.backdropContainer,
          { opacity: backdropOpacity },
        ]}
      >
        {/* Layer 1: Unified Native Living Aurora Background (Matches Web Aurora Shader) */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <MobileLivingBackground speed={0.8} />
        </View>

        {/* Layer 2: Phase 1 Molten Liquid Droplets (Inward Convergence) */}
        {/* Droplet 1 (Top-Left) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.beadContainer,
            {
              opacity: bead1Opacity,
              transform: [{ translateX: bead1X }, { translateY: bead1Y }],
            },
          ]}
        >
          <MoltenBead id="mb1" size={32} />
        </Animated.View>

        {/* Droplet 2 (Top-Right) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.beadContainer,
            {
              opacity: bead2Opacity,
              transform: [{ translateX: bead2X }, { translateY: bead2Y }],
            },
          ]}
        >
          <MoltenBead id="mb2" size={28} />
        </Animated.View>

        {/* Droplet 3 (Bottom-Left) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.beadContainer,
            {
              opacity: bead3Opacity,
              transform: [{ translateX: bead3X }, { translateY: bead3Y }],
            },
          ]}
        >
          <MoltenBead id="mb3" size={26} />
        </Animated.View>

        {/* Droplet 4 (Bottom-Right) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.beadContainer,
            {
              opacity: bead4Opacity,
              transform: [{ translateX: bead4X }, { translateY: bead4Y }],
            },
          ]}
        >
          <MoltenBead id="mb4" size={30} />
        </Animated.View>

        {/* Layer 3: Central Molten Plasma Nucleus & Fluid Ripple */}
        {/* Coalescence Shockwave Ripple */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rippleContainer,
            {
              opacity: rippleOpacity,
              transform: [{ scale: rippleScale }],
            },
          ]}
        >
          <Svg width={80} height={80} viewBox="0 0 80 80">
            <Circle cx="40" cy="40" r="38" stroke={FLAME_CORE} strokeWidth="1.5" fill="none" opacity={0.8} />
          </Svg>
        </Animated.View>

        {/* Molten Nucleus */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.nucleusContainer,
            {
              opacity: nucleusOpacity,
              transform: [{ scale: nucleusScale }],
            },
          ]}
        >
          <Svg width={64} height={64} viewBox="0 0 64 64">
            <Defs>
              <RadialGradient id="nucleusGrad" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="30%" stopColor={FLAME_HIGHLIGHT} stopOpacity="0.95" />
                <Stop offset="60%" stopColor={FLAME_PRIMARY} stopOpacity="0.75" />
                <Stop offset="85%" stopColor={VIOLET_PRIMARY} stopOpacity="0.4" />
                <Stop offset="100%" stopColor={BG_COLOR} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="32" cy="32" r="32" fill="url(#nucleusGrad)" />
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* ── Persistent Foreground Stage (Single continuously-mounted element that hands off) ── */}
      <View style={styles.centerStage} pointerEvents="none">
        <Animated.View
          style={[
            styles.cloudWrapper,
            {
              opacity: cloudOpacity,
              transform: [
                { translateY: sceneTranslateY },
                { scale: cloudScale },
              ],
            },
          ]}
        >
          {/* Molten Inner Reservoir Glow (Wells up inside the cloud) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.moltenCoreLayer,
              {
                opacity: moltenCoreOpacity,
                transform: [{ scale: moltenCoreScale }],
              },
            ]}
          >
            <Svg width={CLOUD_WIDTH} height={CLOUD_HEIGHT} viewBox="0 0 130 90">
              <Defs>
                <RadialGradient id="innerMoltenCore" cx="50%" cy="50%" rx="48%" ry="48%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                  <Stop offset="35%" stopColor={FLAME_HIGHLIGHT} stopOpacity="0.9" />
                  <Stop offset="70%" stopColor={FLAME_PRIMARY} stopOpacity="0.6" />
                  <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="65" cy="45" r="40" fill="url(#innerMoltenCore)" />
            </Svg>
          </Animated.View>

          {/* Deep Vitrified Ambient Caustic Glow Aura (Single diffuse radial gradient, zero ghosting) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cloudBackdropGlow,
              { opacity: crystalGlowOpacity },
            ]}
          >
            <Svg width={CLOUD_WIDTH * 1.5} height={CLOUD_HEIGHT * 1.5} viewBox="0 0 200 140">
              <Defs>
                <RadialGradient id="cloudAuraGrad" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0%" stopColor={FLAME_CORE} stopOpacity="0.45" />
                  <Stop offset="45%" stopColor={FLAME_PRIMARY} stopOpacity="0.25" />
                  <Stop offset="80%" stopColor={VIOLET_PRIMARY} stopOpacity="0.08" />
                  <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="200" height="140" fill="url(#cloudAuraGrad)" />
            </Svg>
          </Animated.View>

          {/* PRIMARY CLOUDORA VECTOR CLOUD (Single crisp vector instance, 100% sharp on all DPIs) */}
          <View style={styles.cloudVectorContainer}>
            <Svg width={CLOUD_WIDTH} height={CLOUD_HEIGHT} viewBox="0 0 28 20" fill="none">
              <Defs>
                <LinearGradient id="entranceCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FFA040" />
                  <Stop offset="45%" stopColor="#FF6B00" />
                  <Stop offset="100%" stopColor="#E05300" />
                </LinearGradient>
                <LinearGradient id="entranceRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                  <Stop offset="100%" stopColor="#FF6B00" stopOpacity="0.15" />
                </LinearGradient>
              </Defs>

              {/* Core solid body */}
              <Circle cx="14" cy="12.5" r="5.5" fill="url(#entranceCloudGrad)" />

              {/* Outer side puffs giving the wide aerodynamic silhouette */}
              <Circle cx="6.5" cy="13.5" r="4.2" fill="url(#entranceCloudGrad)" />
              <Circle cx="21.5" cy="13.5" r="4.2" fill="url(#entranceCloudGrad)" />

              {/* Upper cloud domes */}
              <Circle cx="10.5" cy="9.8" r="4.4" fill="url(#entranceCloudGrad)" />
              <Circle cx="16.5" cy="8.8" r="5.0" fill="url(#entranceCloudGrad)" />

              {/* Crisp wide base connector pill */}
              <Rect x="5.5" y="11.8" width="17" height="5" rx="2.5" fill="url(#entranceCloudGrad)" />

              {/* Upper specular crest highlight path */}
              <Path
                d="M 12 7.2 C 14 5.5 18 5.8 19.8 8.6"
                stroke="url(#entranceRimGrad)"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </Svg>

            {/* Vitrification Beveled Rim Highlight Overlay */}
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                { opacity: beveledRimOpacity },
              ]}
            >
              <Svg width={CLOUD_WIDTH} height={CLOUD_HEIGHT} viewBox="0 0 28 20" fill="none">
                <Path
                  d="M 12 7.2 C 14 5.5 18 5.8 19.8 8.6"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity={0.85}
                />
              </Svg>
            </Animated.View>

            {/* Specular Diagonal Caustic Light Sweep Overlay (Clipped to Cloud Bounds) */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sweepContainer,
                {
                  opacity: sweepOpacity,
                  transform: [
                    { translateX: sweepTranslateX },
                    { rotate: '35deg' },
                  ],
                },
              ]}
            >
              <Svg width={42} height={CLOUD_HEIGHT * 1.8} viewBox="0 0 42 180">
                <Defs>
                  <LinearGradient id="sweepBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor={CYAN_SPECULAR} stopOpacity="0" />
                    <Stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.4" />
                    <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.95" />
                    <Stop offset="75%" stopColor={FLAME_CORE} stopOpacity="0.45" />
                    <Stop offset="100%" stopColor={FLAME_PRIMARY} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width={42} height={180} fill="url(#sweepBeam)" />
              </Svg>
            </Animated.View>
          </View>

          {/* Prismatic Star Glint (Positioned mathematically at apex crest of top cloud dome) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glintHolder,
              {
                opacity: glintOpacity,
                transform: [
                  { scale: glintScale },
                  { rotate: glintRotation },
                ],
              },
            ]}
          >
            <PrismaticStarGlint size={GLINT_SIZE} />
          </Animated.View>
        </Animated.View>

        {/* ── Layer 5: Brand Typography Materialization ── */}
        <Animated.View
          style={[
            styles.brandTextContainer,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandTitle}>CLOUDORA</Text>
          <Text style={styles.brandSubtitle}>LEARNING WORKSPACE</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
  },
  backdropContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beadContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nucleusContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudWrapper: {
    width: CLOUD_WIDTH,
    height: CLOUD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moltenCoreLayer: {
    position: 'absolute',
    width: CLOUD_WIDTH,
    height: CLOUD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudBackdropGlow: {
    position: 'absolute',
    width: CLOUD_WIDTH * 1.5,
    height: CLOUD_HEIGHT * 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudVectorContainer: {
    width: CLOUD_WIDTH,
    height: CLOUD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 24,
  },
  sweepContainer: {
    position: 'absolute',
    top: -CLOUD_HEIGHT * 0.4,
    bottom: -CLOUD_HEIGHT * 0.4,
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glintHolder: {
    position: 'absolute',
    top: GLINT_TOP,
    left: GLINT_LEFT,
    width: GLINT_SIZE,
    height: GLINT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextContainer: {
    alignItems: 'center',
    marginTop: 22,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 6,
    textAlign: 'center',
  },
  brandSubtitle: {
    color: 'rgba(255, 255, 255, 0.48)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3.2,
    marginTop: 6,
    textAlign: 'center',
  },
});

export default AnimatedEntranceTransition;
