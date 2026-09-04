import React, { useEffect, useRef } from 'react';
import { View, Platform, StyleSheet, Dimensions, Animated, Easing } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Luminous particle definition
const PARTICLES = [
  { top: '12%', left: '18%', size: 3, color: '#FF8C40', delay: 0, duration: 4500 },
  { top: '24%', left: '78%', size: 4, color: '#A78BFA', delay: 800, duration: 5200 },
  { top: '38%', left: '32%', size: 2.5, color: '#60A5FA', delay: 1500, duration: 6000 },
  { top: '48%', left: '88%', size: 3.5, color: '#FF6B00', delay: 400, duration: 4800 },
  { top: '62%', left: '12%', size: 4, color: '#8B5CF6', delay: 1200, duration: 5600 },
  { top: '75%', left: '68%', size: 3, color: '#34D399', delay: 2000, duration: 6400 },
  { top: '88%', left: '42%', size: 2.5, color: '#FF8C40', delay: 600, duration: 5000 },
  { top: '94%', left: '85%', size: 3.5, color: '#818CF8', delay: 1700, duration: 5800 },
];

export const LivingBackground: React.FC = () => {
  const isWeb = Platform.OS === 'web';

  // Animated values for native fallback
  const nebula1Anim = useRef(new Animated.Value(0)).current;
  const nebula2Anim = useRef(new Animated.Value(0)).current;
  const nebula3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (anim: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const l1 = createLoop(nebula1Anim, 18000);
    const l2 = createLoop(nebula2Anim, 24000);
    const l3 = createLoop(nebula3Anim, 20000);

    l1.start();
    l2.start();
    l3.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, []);

  const nebula1Transform = [
    {
      translateX: nebula1Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 40],
      }),
    },
    {
      translateY: nebula1Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -35],
      }),
    },
    {
      scale: nebula1Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1],
      }),
    },
  ];

  const nebula2Transform = [
    {
      translateX: nebula2Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -45],
      }),
    },
    {
      translateY: nebula2Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 30],
      }),
    },
    {
      scale: nebula2Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.08],
      }),
    },
  ];

  const nebula3Transform = [
    {
      translateX: nebula3Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 30],
      }),
    },
    {
      translateY: nebula3Anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 25],
      }),
    },
  ];

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: '#070514',
          overflow: 'hidden',
          zIndex: 0,
          // Fixed positioning on web for continuous canvas during page scroll
          ...(isWeb ? ({ position: 'fixed', inset: 0 } as any) : {}),
        },
      ]}
    >
      {/* Subtle cybernetic constellation grid */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: 0.18,
            ...(isWeb
              ? ({
                  backgroundImage: `
                    linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
                  `,
                  backgroundSize: '54px 54px',
                  maskImage: 'radial-gradient(ellipse at 50% 50%, black 40%, transparent 85%)',
                  WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 40%, transparent 85%)',
                } as any)
              : {}),
          },
        ]}
      />

      {/* Cybernetic diagonal energy conduit lines */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: 0.07,
            ...(isWeb
              ? ({
                  backgroundImage: `
                    repeating-linear-gradient(
                      -45deg,
                      rgba(139, 92, 246, 0.25),
                      rgba(139, 92, 246, 0.25) 1px,
                      transparent 1px,
                      transparent 90px
                    )
                  `,
                } as any)
              : {}),
          },
        ]}
      />

      {/* Nebula 1: Brand Flame (#FF6B00) - Primary Energy Center */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: '-15%',
            left: '-10%',
            width: Math.max(SCREEN_WIDTH * 0.75, 550),
            height: Math.max(SCREEN_WIDTH * 0.75, 550),
            borderRadius: 9999,
            backgroundColor: 'rgba(255, 107, 0, 0.11)',
            ...(isWeb
              ? ({
                  filter: 'blur(100px)',
                  willChange: 'transform',
                } as any)
              : {}),
          },
          isWeb ? ({ className: 'anim-nebula-slow' } as any) : { transform: nebula1Transform },
        ]}
      />

      {/* Nebula 2: Cyber Violet (#8B5CF6) - Quantum Depth */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: '30%',
            right: '-15%',
            width: Math.max(SCREEN_WIDTH * 0.7, 500),
            height: Math.max(SCREEN_WIDTH * 0.7, 500),
            borderRadius: 9999,
            backgroundColor: 'rgba(139, 92, 246, 0.12)',
            ...(isWeb
              ? ({
                  filter: 'blur(110px)',
                  willChange: 'transform',
                } as any)
              : {}),
          },
          isWeb ? ({ className: 'anim-nebula-alt' } as any) : { transform: nebula2Transform },
        ]}
      />

      {/* Nebula 3: Azure Stream (#3B82F6 / #06B6D4) - Grounding Horizon */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: '-10%',
            left: '15%',
            width: Math.max(SCREEN_WIDTH * 0.8, 600),
            height: Math.max(SCREEN_WIDTH * 0.55, 450),
            borderRadius: 9999,
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            ...(isWeb
              ? ({
                  filter: 'blur(120px)',
                  willChange: 'transform',
                } as any)
              : {}),
          },
          isWeb ? ({ className: 'anim-nebula-slow' } as any) : { transform: nebula3Transform },
        ]}
      />

      {/* Center atmospheric glow node */}
      <View
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 320,
          height: 320,
          marginLeft: -160,
          marginTop: -160,
          borderRadius: 160,
          backgroundColor: 'rgba(255, 107, 0, 0.04)',
          ...(isWeb ? ({ filter: 'blur(80px)' } as any) : {}),
        }}
      />

      {/* Floating luminous micro particles */}
      {PARTICLES.map((p, idx) => (
        <View
          key={idx}
          style={[
            {
              position: 'absolute',
              top: p.top as any,
              left: p.left as any,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              shadowColor: p.color,
              boxShadow: [{
                offsetX: 0,
                offsetY: 0,
                blurRadius: p.size * 3,
                color: p.color,
              }],
              opacity: 0.6,
            },
            isWeb
              ? ({
                  className: 'anim-float-particle',
                  animationDelay: `${p.delay}ms`,
                  animationDuration: `${p.duration}ms`,
                } as any)
              : {},
          ]}
        />
      ))}

      {/* Top subtle vignette */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            ...(isWeb
              ? ({
                  background: 'radial-gradient(circle at 50% 0%, transparent 50%, rgba(7, 5, 20, 0.6) 100%)',
                } as any)
              : {}),
          },
        ]}
      />
    </View>
  );
};
