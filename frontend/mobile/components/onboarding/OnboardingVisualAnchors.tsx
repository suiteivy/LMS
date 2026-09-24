import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

const ANCHOR_SIZE = 180;

/**
 * Slide 1 Centerpiece: HolographicKnowledgeCore
 * 
 * Lightweight vector isometric tablet with orbital planetary energy rings
 * and academic flame crest. 60fps NativeDriver float.
 */
export const HolographicKnowledgeCore: React.FC = () => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 6],
  });

  return (
    <View style={styles.anchorWrapper}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Svg width={ANCHOR_SIZE} height={ANCHOR_SIZE} viewBox="0 0 180 180" fill="none">
          <Defs>
            {/* Flame tablet gradient */}
            <LinearGradient id="corePlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFA040" stopOpacity="0.9" />
              <Stop offset="60%" stopColor="#FF6B00" stopOpacity="0.75" />
              <Stop offset="100%" stopColor="#C44300" stopOpacity="0.6" />
            </LinearGradient>

            {/* Specular edge highlight */}
            <LinearGradient id="coreRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <Stop offset="50%" stopColor="#FFA040" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.1" />
            </LinearGradient>

            {/* Glass underlay */}
            <LinearGradient id="coreGlassBase" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#251B4D" stopOpacity="0.85" />
              <Stop offset="100%" stopColor="#120D2C" stopOpacity="0.95" />
            </LinearGradient>
          </Defs>

          {/* Outer Orbital Ring */}
          <Path
            d="M 20 90 C 20 50 160 50 160 90 C 160 130 20 130 20 90 Z"
            stroke="rgba(255, 107, 0, 0.3)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />

          {/* Orbital Nodes */}
          <Circle cx="32" cy="74" r="3.5" fill="#FFA040" />
          <Circle cx="150" cy="104" r="4.5" fill="#FF6B00" />
          <Circle cx="115" cy="54" r="2.5" fill="#FFFFFF" opacity="0.8" />

          {/* Lower Shadow Slab */}
          <Path
            d="M 90 40 L 145 70 L 90 102 L 35 70 Z"
            fill="rgba(0, 0, 0, 0.45)"
            transform="translate(0, 24)"
          />

          {/* Main Isometric Glass Tablet Base */}
          <Path
            d="M 90 46 L 146 78 L 90 110 L 34 78 Z"
            fill="url(#coreGlassBase)"
            stroke="rgba(255, 160, 64, 0.25)"
            strokeWidth="1.5"
          />

          {/* Tablet Front Drop Face (Extrusion) */}
          <Path
            d="M 34 78 L 90 110 L 90 122 L 34 90 Z"
            fill="#0F0B26"
            stroke="rgba(255, 107, 0, 0.2)"
            strokeWidth="1"
          />
          <Path
            d="M 90 110 L 146 78 L 146 90 L 90 122 Z"
            fill="#1A123D"
            stroke="rgba(255, 107, 0, 0.2)"
            strokeWidth="1"
          />

          {/* Floating Radiant Knowledge Surface */}
          <Path
            d="M 90 40 L 142 70 L 90 100 L 38 70 Z"
            fill="url(#corePlateGrad)"
            stroke="url(#coreRimGrad)"
            strokeWidth="1.8"
          />

          {/* Holographic Book / Academic Crest Iconography */}
          <G transform="translate(68, 54)">
            {/* Open Book Wings */}
            <Path
              d="M 22 18 C 17 14 6 15 2 17 L 2 29 C 6 27 17 26 22 30 C 27 26 38 27 42 29 L 42 17 C 38 15 27 14 22 18 Z"
              fill="#FFFFFF"
              opacity="0.95"
            />
            {/* Book Spine Center Divider */}
            <Path d="M 22 18 L 22 30" stroke="#FF6B00" strokeWidth="1.8" />
            {/* Graduation Cap Peak Above */}
            <Path d="M 22 7 L 34 12 L 22 17 L 10 12 Z" fill="#FFFFFF" opacity="0.9" />
            <Path d="M 17 14.5 L 17 19.5" stroke="#FFA040" strokeWidth="1.5" />
          </G>

          {/* Specular Glint Top Left */}
          <Circle cx="64" cy="56" r="1.5" fill="#FFFFFF" opacity="0.9" />
          <Circle cx="120" cy="88" r="2" fill="#FFA040" opacity="0.8" />
        </Svg>
      </Animated.View>
    </View>
  );
};

/**
 * Slide 2 Centerpiece: InstitutionalSignalConstellation
 * 
 * Triangular neural node constellation with interconnected laser arcs,
 * pulsing message beacons, and institutional geometry.
 */
export const InstitutionalSignalConstellation: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1.03],
  });

  return (
    <View style={styles.anchorWrapper}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Svg width={ANCHOR_SIZE} height={ANCHOR_SIZE} viewBox="0 0 180 180" fill="none">
          <Defs>
            <LinearGradient id="beamGradA" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#3166BE" stopOpacity="0.3" />
            </LinearGradient>
            <LinearGradient id="beamGradB" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.7" />
              <Stop offset="100%" stopColor="#7C3AED" stopOpacity="0.4" />
            </LinearGradient>
            <LinearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#1E293B" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#0F172A" stopOpacity="0.98" />
            </LinearGradient>
          </Defs>

          {/* Outer Ambient Constellation Ring */}
          <Circle
            cx="90"
            cy="90"
            r="68"
            stroke="rgba(56, 189, 248, 0.15)"
            strokeWidth="1"
            strokeDasharray="6 8"
          />

          {/* Interconnecting Beam Lines */}
          <Path d="M 90 40 L 46 128" stroke="url(#beamGradA)" strokeWidth="2.5" />
          <Path d="M 90 40 L 134 128" stroke="url(#beamGradA)" strokeWidth="2.5" />
          <Path d="M 46 128 L 134 128" stroke="url(#beamGradB)" strokeWidth="2" strokeDasharray="5 5" />

          {/* Center Energy Core Pulse Waves */}
          <Circle cx="90" cy="98" r="22" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1" />
          <Circle cx="90" cy="98" r="14" fill="rgba(49, 102, 190, 0.25)" />
          <Circle cx="90" cy="98" r="5" fill="#38BDF8" />

          {/* Node 1: Apex (Institution / Cloud Core) */}
          <Circle cx="90" cy="40" r="22" fill="url(#nodeGrad)" stroke="#38BDF8" strokeWidth="2" />
          {/* Institutional Pillars Icon */}
          <G transform="translate(80, 30)">
            <Path d="M 2 7 L 10 3 L 18 7 Z" fill="#38BDF8" />
            <Rect x="4" y="9" width="2.5" height="8" rx="1" fill="#FFFFFF" opacity="0.9" />
            <Rect x="9" y="9" width="2.5" height="8" rx="1" fill="#FFFFFF" opacity="0.9" />
            <Rect x="14" y="9" width="2.5" height="8" rx="1" fill="#FFFFFF" opacity="0.9" />
            <Rect x="2" y="18" width="16" height="2" rx="0.5" fill="#38BDF8" />
          </G>

          {/* Node 2: Bottom Left (Educators) */}
          <Circle cx="46" cy="128" r="18" fill="url(#nodeGrad)" stroke="#3166BE" strokeWidth="1.8" />
          {/* Calendar / Schedule Icon */}
          <G transform="translate(38, 120)">
            <Rect x="2" y="3" width="13" height="11" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="1.3" />
            <Path d="M 2 6 L 15 6" stroke="#38BDF8" strokeWidth="1.3" />
            <Circle cx="5.5" cy="9.5" r="1" fill="#38BDF8" />
            <Circle cx="8.5" cy="9.5" r="1" fill="#FFFFFF" />
            <Circle cx="11.5" cy="9.5" r="1" fill="#FFFFFF" />
          </G>

          {/* Node 3: Bottom Right (Students & Parents) */}
          <Circle cx="134" cy="128" r="18" fill="url(#nodeGrad)" stroke="#3166BE" strokeWidth="1.8" />
          {/* Notification / Message Icon */}
          <G transform="translate(126, 120)">
            <Path
              d="M 2 4 C 2 2.8 3 2 4.2 2 L 11.8 2 C 13 2 14 2.8 14 4 L 14 10 C 14 11.2 13 12 11.8 12 L 5 12 L 2 15 Z"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.3"
            />
            <Circle cx="5" cy="7" r="1" fill="#38BDF8" />
            <Circle cx="8" cy="7" r="1" fill="#38BDF8" />
            <Circle cx="11" cy="7" r="1" fill="#38BDF8" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
};

/**
 * Slide 3 Centerpiece: FloatingWorkspaceMatrix
 * 
 * 3 Layered isometric translucent glass cards with depth perspective,
 * color-coded by role (Admin Violet, Teacher Flame, Student Azure).
 */
export const FloatingWorkspaceMatrix: React.FC = () => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-5, 5],
  });

  return (
    <View style={styles.anchorWrapper}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Svg width={ANCHOR_SIZE} height={ANCHOR_SIZE} viewBox="0 0 180 180" fill="none">
          <Defs>
            {/* Card 1: Admin Cyber Violet */}
            <LinearGradient id="cardGradAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#7C3AED" stopOpacity="0.85" />
              <Stop offset="100%" stopColor="#4C1D95" stopOpacity="0.9" />
            </LinearGradient>

            {/* Card 2: Teacher Flame Orange */}
            <LinearGradient id="cardGradTeacher" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFA040" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#EA580C" stopOpacity="0.85" />
            </LinearGradient>

            {/* Card 3: Student Azure Cyan */}
            <LinearGradient id="cardGradStudent" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#0284C7" stopOpacity="0.9" />
            </LinearGradient>
          </Defs>

          {/* Depth Shadow Layer */}
          <Path
            d="M 90 62 L 152 94 L 90 126 L 28 94 Z"
            fill="rgba(0, 0, 0, 0.45)"
            transform="translate(0, 36)"
          />

          {/* CARD 1 (Top/Back Layer — Administrator Workspace) */}
          <G transform="translate(0, -18)">
            <Path
              d="M 90 40 L 148 70 L 90 100 L 32 70 Z"
              fill="url(#cardGradAdmin)"
              stroke="rgba(255, 255, 255, 0.35)"
              strokeWidth="1.5"
            />
            {/* Card Metrics & Shield Tag */}
            <Path d="M 64 66 L 82 75 L 116 58" stroke="#FFFFFF" strokeWidth="1.8" fill="none" opacity="0.9" />
            <Circle cx="64" cy="66" r="2.5" fill="#FFFFFF" />
            <Circle cx="82" cy="75" r="2.5" fill="#A855F7" />
            <Circle cx="116" cy="58" r="3" fill="#FFFFFF" />
          </G>

          {/* CARD 2 (Middle Layer — Educator Workspace) */}
          <G transform="translate(0, 6)">
            <Path
              d="M 90 40 L 148 70 L 90 100 L 32 70 Z"
              fill="url(#cardGradTeacher)"
              stroke="rgba(255, 255, 255, 0.45)"
              strokeWidth="1.5"
            />
            {/* Classroom Progress Bars */}
            <Rect x="58" y="65" width="28" height="4" rx="2" fill="#FFFFFF" opacity="0.9" />
            <Rect x="92" y="65" width="36" height="4" rx="2" fill="rgba(255, 255, 255, 0.55)" />
            <Circle cx="48" cy="67" r="3" fill="#FFFFFF" />
          </G>

          {/* CARD 3 (Foreground Layer — Student/Parent Workspace) */}
          <G transform="translate(0, 30)">
            <Path
              d="M 90 40 L 148 70 L 90 100 L 32 70 Z"
              fill="url(#cardGradStudent)"
              stroke="#FFFFFF"
              strokeWidth="1.8"
            />
            {/* Star Milestone & Success Metrics */}
            <Circle cx="60" cy="68" r="4.5" fill="#FFFFFF" />
            <Rect x="72" y="66" width="48" height="4.5" rx="2" fill="#FFFFFF" opacity="0.9" />
            <Path d="M 126 68 L 132 68" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  anchorWrapper: {
    width: ANCHOR_SIZE,
    height: ANCHOR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
