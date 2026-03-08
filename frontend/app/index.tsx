import { AppLoading } from "@/components/AppLoading";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { BlurView } from 'expo-blur';
import { router, usePathname } from "expo-router";
import {
  BadgeCheck,
  BarChart2,
  BookOpen,
  Check,
  Coins,
  CreditCard,
  Crown,
  Library,
  MoveRight,
  Plus,
  School,
  Settings,
  Sparkles,
  Timer,
  Users
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView, StatusBar, Text,
  TextInput,
  TouchableOpacity, View
} from "react-native";
import Reanimated, {
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Pricing Components ──────────────────────────────────────────────────────
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

// ── Tier Tab Pill ────────────────────────────────────────────────────────────
const PackageTierTab = ({ tier, label, icon, tagline, isActive, onPress }: any) => {
  const [hovered, setHovered] = useState(false);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.sin) })
        ), -1, true
      );
    } else {
      glow.value = withTiming(0, { duration: 300 });
    }
  }, [isActive]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.5]),
  }));

  const isWeb = Platform.OS === 'web';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      //@ts-ignore
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={[
        {
          // Wide screens (>= 768px): flex fills equal share; narrow: fixed compact width
          ...(SCREEN_WIDTH >= 768
            ? { flex: 1, minWidth: 110, maxWidth: 200 }
            : { width: 118, flexShrink: 0 }),
          paddingVertical: 16,
          paddingHorizontal: 14,
          borderRadius: 20,
          alignItems: 'center',
          borderWidth: 1.5,
          position: 'relative',
          overflow: 'hidden',
          borderColor: isActive ? `${tier.accent}66` : 'rgba(255,255,255,0.08)',
          backgroundColor: isActive ? `${tier.accent}12` : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        },
        isWeb ? {
          transition: 'background-color 0.3s ease, border-color 0.3s ease, transform 0.2s ease',
          transform: hovered && !isActive ? [{ scale: 1.02 }] : [{ scale: 1 }],
          cursor: 'pointer',
        } as any : {},
      ]}
    >
      {/* Glow blob behind active */}
      {isActive && (
        <Reanimated.View style={[{
          position: 'absolute',
          top: '-50%', left: '-50%',
          width: '200%', height: '200%',
          borderRadius: 999,
          opacity: 0.15,
        } as any, glowStyle]} />
      )}

      {/* Active underline bar */}
      {isActive && (
        <View style={{
          position: 'absolute', bottom: 0, left: '20%', right: '20%',
          height: 2.5, borderRadius: 2,
          backgroundColor: tier.accent,
        }} />
      )}

      <View style={{
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: isActive ? `${tier.accent}25` : 'rgba(255,255,255,0.06)',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: isActive ? `${tier.accent}40` : 'rgba(255,255,255,0.08)',
      }}>
        {React.cloneElement(icon, { size: 16, color: isActive ? tier.accent : 'rgba(255,255,255,0.45)' })}
      </View>

      <Text style={{
        color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
        fontWeight: '800',
        fontSize: 13,
        marginBottom: 2,
      }}>{label}</Text>

      <Text style={{
        color: isActive ? `${tier.accent}CC` : 'rgba(255,255,255,0.3)',
        fontSize: 10,
        textAlign: 'center',
        lineHeight: 13,
      }}>{tagline}</Text>
    </TouchableOpacity>
  );
};

// ── Plan Card within a tier ────────────────────────────────────────────────
const PlanCard = ({ plan, tierAccent, openRegistrationModal }: any) => {
  const [hovered, setHovered] = useState(false);
  const animValue = useSharedValue(0);
  const borderAnim = useSharedValue(0);

  useEffect(() => {
    animValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5000 }),
        withTiming(0, { duration: 5000 })
      ), -1, true
    );
    if (plan.premium) {
      borderAnim.value = withRepeat(withTiming(1, { duration: 4000 }), -1, false);
    }
  }, []);

  const blob1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(animValue.value, [0, 1], [-20, 20]) },
      { translateY: interpolate(animValue.value, [0, 1], [-10, 30]) }
    ],
    opacity: 0.3
  }));

  const blob2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(animValue.value, [0, 1], [20, -20]) },
      { translateY: interpolate(animValue.value, [0, 1], [10, -20]) }
    ],
    opacity: 0.25
  }));

  const nativeHover = useSharedValue(0);
  const nativeAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(nativeHover.value, [0, 1], [0, -12]) },
      { scale: interpolate(nativeHover.value, [0, 1], [1, 1.03]) },
    ],
  }));

  const cardWidth = Platform.OS === 'web' && SCREEN_WIDTH > 1100
    ? '30%'
    : Platform.OS === 'web' && SCREEN_WIDTH > 768
      ? '46%'
      : '100%';

  const webHoverStyle = Platform.OS === 'web' ? {
    transform: hovered ? [{ translateY: -12 }, { scale: 1.03 }] : [{ translateY: 0 }, { scale: 1 }],
    transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease',
    boxShadow: hovered
      ? `0 24px 48px ${plan.accent}55, 0 8px 24px ${plan.accent}33`
      : `0 8px 24px rgba(0,0,0,0.3)`,
    cursor: 'pointer',
  } : {};

  const sharedContainerStyle: any = {
    width: cardWidth,
    minWidth: 260,
    marginVertical: 12,
    position: 'relative',
    // isolate rendering context to fix backdrop-filter clip bugs
    ...(Platform.OS === 'web' && { transform: [{ translateZ: '0' }] })
  };

  const containerStyle = Platform.OS === 'web'
    ? [sharedContainerStyle, webHoverStyle]
    : [sharedContainerStyle, nativeAnimStyle];

  const onHoverIn = () => setHovered(true);
  const onHoverOut = () => setHovered(false);

  return (
    <Reanimated.View
      style={containerStyle as any}
      //@ts-ignore
      onMouseEnter={onHoverIn}
      onMouseLeave={onHoverOut}
    >
      {/* Premium rotating border */}
      {plan.premium && Platform.OS === 'web' && (
        <View style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 38, overflow: 'hidden' }}>
          <Reanimated.View
            style={[useAnimatedStyle(() => ({
              transform: [{ rotate: `${borderAnim.value * 360}deg` }]
            })), {
              width: '200%', height: '200%',
              position: 'absolute', top: '-50%', left: '-50%',
              //@ts-ignore
              backgroundImage: `conic-gradient(from 0deg, transparent, ${plan.accent}, #EC4899, ${tierAccent}, transparent)`,
            }] as any}
          />
        </View>
      )}

      {/* Main Inner Card container */}
      <View style={{
        borderRadius: 36, overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: plan.popular ? `${plan.accent}66` : 'rgba(255,255,255,0.1)',
        height: '100%', flex: 1,
        backgroundColor: 'rgba(255,255,255,0.02)',
        position: 'relative',
      }}>

        {/* Backdrop filter container separated from main wrapper to avoid Chrome clip bug */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: 36, zIndex: 0 }}>
          {Platform.OS === 'web' ? (
            <div style={{ width: '100%', height: '100%', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }} />
          ) : (
            <BlurView intensity={30} style={{ flex: 1 }} tint="dark" />
          )}
        </View>

        {/* Decorative blobs */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1, overflow: 'hidden', borderRadius: 36 }}>
          {Platform.OS === 'web' ? (
            <>
              <Reanimated.View style={[blob1Style, {
                position: 'absolute', top: '-10%', left: '-10%', width: 140, height: 140, borderRadius: 70,
                backgroundColor: plan.accent, filter: 'blur(60px)'
              } as any]} />
              <Reanimated.View style={[blob2Style, {
                position: 'absolute', bottom: '-10%', right: '-10%', width: 160, height: 160, borderRadius: 80,
                backgroundColor: tierAccent || plan.accent, filter: 'blur(60px)'
              } as any]} />
            </>
          ) : (
            <Svg height="100%" width="100%">
              <Defs>
                <LinearGradient id={`grad-${plan.name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={plan.accent} stopOpacity="0.4" />
                  <Stop offset="100%" stopColor={plan.accent} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Reanimated.View style={blob1Style}>
                <Circle cx="20%" cy="20%" r="80" fill={`url(#grad-${plan.name})`} />
              </Reanimated.View>
              <Reanimated.View style={blob2Style}>
                <Circle cx="80%" cy="80%" r="100" fill={`url(#grad-${plan.name})`} />
              </Reanimated.View>
            </Svg>
          )}
        </View>

        {(plan.popular || plan.premium) && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: plan.accent, opacity: hovered ? 0.08 : 0.03,
            zIndex: 1, transition: 'opacity 0.4s ease', pointerEvents: 'none'
          } as any} />
        )}

        {/* Shine sweep locked to bounds */}
        {Platform.OS === 'web' && (
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, overflow: 'hidden', borderRadius: 36 } as any}>
            <View style={{
              position: 'absolute', top: 0, width: 80, height: '100%',
              background: 'linear-gradient(105deg, transparent, rgba(255,255,255,0.08), transparent)',
              transform: [{ skewX: '-20deg' }],
              transition: 'left 0.7s ease',
              left: hovered ? '150%' : '-80px',
            } as any} />
          </View>
        )}

        <View style={{ padding: 32, flex: 1 }}>
          {/* Popular / Elite ribbon */}
          {(plan.popular || plan.premium) && (
            <View style={{
              position: 'absolute', top: 20, right: -30,
              backgroundColor: plan.premium ? '#8B5CF6' : plan.accent,
              paddingHorizontal: 40, paddingVertical: 6,
              transform: [{ rotate: '45deg' }],
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
              zIndex: 20
            }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>
                {plan.premium ? 'Elite' : 'Popular'}
              </Text>
            </View>
          )}

          {/* Icon */}
          <View style={{
            marginBottom: 22,
            backgroundColor: `${plan.accent}15`,
            width: 56, height: 56, borderRadius: 18,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1.5, borderColor: `${plan.accent}33`
          }}>
            {React.cloneElement(plan.icon, { size: 24, color: plan.accent })}
          </View>

          {/* Plan name */}
          <Text style={{
            color: plan.accent, fontWeight: '800', fontSize: 12,
            textTransform: 'uppercase', letterSpacing: 3, marginBottom: 10
          }}>{plan.name}</Text>

          {/* Price */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 }}>
            <Text style={{ color: 'white', fontWeight: '900', fontSize: 44 }}>{plan.price.split('/')[0]}</Text>
            {plan.price.includes('/') && (
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600', fontSize: 17, marginBottom: 10, marginLeft: 4 }}>/{plan.price.split('/')[1]}</Text>
            )}
          </View>

          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 28, lineHeight: 21 }}>{plan.desc}</Text>

          {/* Features */}
          <View style={{ gap: 14, marginBottom: 36, flex: 1 }}>
            {plan.features.map((feat: string, i: number) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 7,
                  backgroundColor: `${plan.accent}15`,
                  alignItems: 'center', justifyContent: 'center',
                  marginRight: 14, borderWidth: 1, borderColor: `${plan.accent}33`
                }}>
                  <Check size={13} color={plan.accent} strokeWidth={3} />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14, fontWeight: '500' }}>{feat}</Text>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={{
              width: '100%', paddingVertical: 18, borderRadius: 22,
              alignItems: 'center',
              backgroundColor: plan.popular || plan.premium ? plan.accent : 'transparent',
              borderWidth: 1.5,
              borderColor: plan.popular || plan.premium ? 'rgba(255,255,255,0.2)' : `${plan.accent}55`,
              shadowColor: plan.accent,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: plan.popular || plan.premium ? 0.4 : 0.1,
              shadowRadius: 16,
            }}
            onPress={() => openRegistrationModal(plan.name)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{
                color: plan.popular || plan.premium ? 'white' : plan.accent,
                fontWeight: '800', fontSize: 15,
              }}>
                {plan.cta ?? 'Get Started'}
              </Text>
              <MoveRight size={18} color={plan.popular || plan.premium ? 'white' : plan.accent} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Reanimated.View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Tier & plan data.....change to addons
// ─────────────────────────────────────────────────────────────────────────────
const TIERS = [
  {
    key: 'plans',
    label: 'Pricing Plans',
    tagline: 'Small schools',
    icon: <Coins size={16} color="white" />,
    accent: '#3B82F6',
    description: 'Ideal for independent schools and small academies getting started.',
  },
  {
    key: 'custom',
    label: 'Custom',
    tagline: 'Large schools',
    icon: <School size={16} color="white" />,
    accent: '#3B82F6',
    description: 'Ideal for independent schools and small academies getting started.',
  },
] as const;

type TierKey = 'plans' | 'custom' | 'addOns'

const TIER_PLANS: Record<TierKey, any[]> = {
  plans: [
    {
      name: 'Basic',
      price: '$100/month',
      desc: 'Ideal for Small schools & early adopters ideal for 200-900 students',
      features: [
        'Student module',
        'Teacher module',
        'Parent module',
      ],
      icon: <BookOpen size={24} color="#3B82F6" />,
      accent: '#3B82F6',
      cta: 'Get Started',
    },
    {
      name: 'Pro',
      price: '$300/month',
      desc: 'Mid-sized schools and training centers\nUp to 1000 students',
      features: [
        'Student module',
        'Teacher module',
        'Parent module',
      ],
      icon: <Crown size={24} color="#F59E0B" />,
      accent: '#F59E0B',
      popular: true,
      cta: 'Start Pro',
    },
    {
      name: 'Premium',
      price: '$500/month',
      desc: 'Large private school & tertiary institutions\nIdeal for 5000+ students',
      features: [
        'Student module',
        'Teacher module',
        'Parent module',
      ],
      icon: <Sparkles size={24} color="#8B5CF6" />,
      accent: '#8B5CF6',
      premium: true,
      cta: 'Go Premium',
    },
  ],
  custom: [
    {
      name: 'Custom',
      price: 'Custom',
      desc: 'Custom plan tailored and configured to meet a specific orgainizations learning needs and have features, content or workflows tailored for your organization',
      features: [
        'Client-specific courses',
        'Categories',
        'HR management',
        'Progress learner reports',
        'UI adjusments',
      ],
      icon: <Sparkles size={24} color="#8B5CF6" />,
      accent: '#8B5CF6',
      premium: true,
      cta: 'Select custom features & modules',
    },
  ],
  addOns: [
    {
      name: 'Library Module',
      price: '$30',
      desc: 'Manage library and virtual materials on a main dashboard',
      features: [

      ],
      icon: <Sparkles size={24} color="#8B5CF6" />,
      accent: '#8B5CF6',
      premium: true,
      cta: 'Go Premium',
    },
    {
      name: 'Bursary Module',
      price: '$30',
      desc: 'Manage student accounts and financial logs on a main dashboard',
      features: [

      ],
      icon: <Sparkles size={24} color="#8B5CF6" />,
      accent: '#8B5CF6',
      premium: true,
      cta: 'Go Premium',
    },
    {
      name: 'Messageing + Virtual Diary',
      price: '$10',
      desc: 'Direct messaging and announcment sharing on e-learning platform',
      features: [

      ],
      icon: <Sparkles size={24} color="#8B5CF6" />,
      accent: '#8B5CF6',
      premium: true,
      cta: 'Go Premium',
    },
  ]
};


// ─── Feature Card Component ─────────────────────────────────────────────────
const FeatureCard = ({ icon, title, desc, accent, tag }: any) => {
  const hoverVal = useSharedValue(0);
  const glowVal = useSharedValue(0);

  useEffect(() => {
    glowVal.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.4, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(hoverVal.value, [0, 1], [0, -10]) },
      { scale: interpolate(hoverVal.value, [0, 1], [1, 1.025]) },
    ],
    shadowOpacity: interpolate(hoverVal.value, [0, 1], [0.08, 0.35]),
    shadowRadius: interpolate(hoverVal.value, [0, 1], [8, 28]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowVal.value, [0, 1], [0.25, 0.7]),
    transform: [{ scale: interpolate(glowVal.value, [0, 1], [0.95, 1.05]) }],
  }));

  const onHoverIn = () => {
    if (Platform.OS === 'web') hoverVal.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
  };
  const onHoverOut = () => {
    if (Platform.OS === 'web') hoverVal.value = withTiming(0, { duration: 350, easing: Easing.inOut(Easing.cubic) });
  };

  const cardWidth = Platform.OS === 'web' && SCREEN_WIDTH >= 1100
    ? '30%'
    : Platform.OS === 'web' && SCREEN_WIDTH >= 700
      ? '46%'
      : '100%';

  return (
    <Reanimated.View
      style={[{
        width: cardWidth,
        minWidth: 240,
        margin: 10,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
        shadowColor: accent,
        shadowOffset: { width: 0, height: 8 },
      }, cardStyle]}
      //@ts-ignore
      onPointerEnter={onHoverIn}
      onPointerLeave={onHoverOut}
    >
      {/* Top accent bar */}
      <View style={{ height: 3, backgroundColor: accent, opacity: 0.7 }} />

      <View style={{ padding: 26 }}>
        {/* Icon with animated glow */}
        <View style={{ marginBottom: 20, alignSelf: 'flex-start' }}>
          <Reanimated.View style={[{
            position: 'absolute',
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: accent,
            opacity: 0.1,
          }, glowStyle]} />
          <View style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: `${accent}1A`,
            borderWidth: 1,
            borderColor: `${accent}35`,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {icon}
          </View>
        </View>

        {/* Tag */}
        {tag && (
          <View style={{
            alignSelf: 'flex-start',
            backgroundColor: `${accent}18`,
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: `${accent}30`,
          }}>
            <Text style={{ color: accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>{tag}</Text>
          </View>
        )}

        <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 18, marginBottom: 8, letterSpacing: -0.3 }}>
          {title}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13.5, lineHeight: 21 }}>
          {desc}
        </Text>

        {/* Arrow indicator */}
        <View style={{
          marginTop: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        }}>
          <View style={{ width: 20, height: 1.5, backgroundColor: accent, opacity: 0.6 }} />
          <MoveRight size={14} color={accent} />
        </View>
      </View>
    </Reanimated.View>
  );
};

// ─── Discount Banner ────────────────────────────────────────────────────────
// Offer ends Saturday 2026-02-28 00:00:00 EAT (UTC+3)
const OFFER_END = new Date('2026-02-28T00:00:00+03:00').getTime();

function useCountdown(targetMs: number) {
  const calc = () => {
    const diff = Math.max(0, targetMs - Date.now());
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1_000),
      expired: diff === 0,
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function DiscountBanner() {
  const { days, hours, minutes, seconds, expired } = useCountdown(OFFER_END);
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  if (expired) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: '#EA580C',
        paddingTop: Math.max(insets.top, 8),
        paddingBottom: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        flexWrap: 'wrap',
        // subtle glow shadow
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      {/* Left: sparkle + offer text */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Sparkles size={15} color="#FEF3C7" />
        <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>
          Limited-Time: 10% OFF all Cloudora services
        </Text>
      </View>

      {/* Divider */}
      <View style={{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.35)' }} />

      {/* Right: live countdown */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Timer size={13} color="#FEF3C7" />
        {[
          { v: days, l: 'd' },
          { v: hours, l: 'h' },
          { v: minutes, l: 'm' },
          { v: seconds, l: 's' },
        ].map(({ v, l }, i) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {i > 0 && <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginHorizontal: 1 }}>:</Text>}
            <Animated.View
              style={{
                backgroundColor: 'rgba(0,0,0,0.25)',
                borderRadius: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
                transform: [{ scale: l === 's' ? pulse : 1 }],
              }}
            >
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 }}>
                {pad(v)}{l}
              </Text>
            </Animated.View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function Index() {
  const { session, loading, isInitializing, profile, isPlatformAdmin } = useAuth();
  const formRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const pathname = usePathname();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierKey>('plans');
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isNavReady, setIsNavReady] = useState(false);
  const [addonModalVisible, setAddonModalVisible] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedCustomFeatures, setSelectedCustomFeatures] = useState<string[]>([]);
  const [selectedCoreModules, setSelectedCoreModules] = useState<string[]>([]);

  // Show AppLoading for 5s before redirecting to dashboard
  const [navigating, setNavigating] = useState(false);
  const pendingRoute = useRef<string | null>(null);

  // Section refs for smooth scrolling
  const featuresRef = useRef<View>(null);
  const pricingRef = useRef<View>(null);
  // Y-offset of the plan-cards block (so we can scroll to it on mobile tier tap)
  const [pricingCardsY, setPricingCardsY] = useState<number | null>(null);

  // Sticky nav visibility
  const [showNav, setShowNav] = useState(false);
  const navOpacity = useRef(new Animated.Value(0)).current;
  const [sectionPositions, setSectionPositions] = useState<
    Record<string, number>
  >({});

  const handleLayout = (key: string, y: number) => {
    setSectionPositions((prev) => ({ ...prev, [key]: y }));
  };

  // Animation Refs
  const scrollAnimation = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(30)).current;
  const ctaPulse = useRef(new Animated.Value(1)).current;

  // Floating orbs animation
  const orb1 = useRef(new Animated.Value(0)).current;
  const orb2 = useRef(new Animated.Value(0)).current;
  const orb3 = useRef(new Animated.Value(0)).current;

  // Hero fade in
  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(heroSlide, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // CTA pulse
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Floating orbs
  useEffect(() => {
    const animate = (val: Animated.Value, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration: dur,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: dur,
            useNativeDriver: true,
          }),
        ]),
      );
    const a1 = animate(orb1, 4000);
    const a2 = animate(orb2, 5000);
    const a3 = animate(orb3, 3500);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  // Scroll arrows loop
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scrollAnimation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(scrollAnimation, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (e: any) => {
        const y = e.nativeEvent.contentOffset.y;
        const shouldShow = y > 300;
        if (shouldShow !== showNav) {
          setShowNav(shouldShow);
          Animated.timing(navOpacity, {
            toValue: shouldShow ? 1 : 0,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }
      },
    },
  );

  // Smooth scroll to section
  const scrollToSection = (key: string) => {
    const y = sectionPositions[key];
    if (typeof y === "number") {
      scrollRef.current?.scrollTo({ y: y - 60, animated: true });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsNavReady(true), 1);
    return () => clearTimeout(timer);
  }, []);

  // Detect session → immediate redirect
  useEffect(() => {
    // Reset navigating lock if session is lost (e.g. user logged out)
    if (!session) {
      setNavigating(false);
    }

    if (!isNavReady || isInitializing || navigating) return;

    if (session && profile) {
      setNavigating(true);

      let route: string | null = null;
      if (isPlatformAdmin) {
        route = "/(master-admin)";
      } else {
        switch (profile.role) {
          case "admin": route = "/(admin)"; break;
          case "teacher": route = "/(teacher)"; break;
          case "student": route = "/(student)"; break;
          case "parent": route = "/(parent)"; break;
          default:
            console.error("Unrecognized role on landing page:", profile.role);
            // Fallback to sign in if we can't determine where they belong
            route = "/(auth)/signIn";
            break;
        }
      }

      if (route) {
        router.replace(route as any);
      } else {
        // Absolute fallback to avoid hang
        router.replace("/(auth)/signIn");
      }
    }
  }, [isNavReady, isInitializing, session, profile, isPlatformAdmin, navigating]);

  // No local AppLoading here — trust _layout.tsx's global overlay
  if (isInitializing || navigating) {
    return <View style={{ flex: 1, backgroundColor: "#0F0B2E" }} />;
  }

  // Orb translations
  const orb1Y = orb1.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const orb1X = orb1.interpolate({ inputRange: [0, 1], outputRange: [0, 15] });
  const orb2Y = orb2.interpolate({ inputRange: [0, 1], outputRange: [0, 25] });
  const orb2X = orb2.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const orb3Y = orb3.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });

  const handleSignup = async () => {
    if (!form.name || !form.email) {
      alert("Please fill in your name and email.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/contact/booking', {
        name: form.name,
        email: form.email,
        plan: selectedPlan,
        addons: selectedAddons,
        customFeatures: selectedCustomFeatures,
        coreModules: selectedCoreModules,
        message: form.message || `Setup request for ${selectedPlan} plan${selectedCoreModules.length > 0 ? ` with core modules: ${selectedCoreModules.join(', ')}` : ''}${selectedAddons.length > 0 ? ` with addons: ${selectedAddons.join(', ')}` : ''}${selectedCustomFeatures.length > 0 ? ` with custom features: ${selectedCustomFeatures.join(', ')}` : ''}`
      });

      if (response.data.success) {
        setSubmitted(true);
      }
    } catch (error: any) {
      console.error("Booking error:", error);
      alert(error.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const openRegistrationModal = (planName: string) => {
    setSelectedPlan(planName);
    setForm({ name: '', email: '', message: '' });
    setSelectedAddons([]);
    setSelectedCustomFeatures([]);
    setSelectedCoreModules([]);
    setSubmitted(false);

    if (planName.toLowerCase().includes("free trial")) {
      setModalVisible(true);
    } else if (planName.toLowerCase().includes("custom")) {
      setCustomModalVisible(true);
    } else {
      setAddonModalVisible(true);
    }
  };

  const proceedToRegistration = () => {
    setAddonModalVisible(false);
    setCustomModalVisible(false);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F0B2E" }}>
      <StatusBar barStyle="light-content" />

      {/* ═══════════════ FIXED DISCOUNT BANNER ═══════════════ */}
      <DiscountBanner />

      {/* ═══════════════ FLOATING STICKY NAV ═══════════════ */}
      <Animated.View
        pointerEvents={showNav ? "auto" : "none"}
        style={{
          position: "absolute",
          top: Platform.OS === "web" ? 10 : 50,
          left: 0,
          right: 0,
          zIndex: 100,
          alignItems: "center",
          opacity: navOpacity,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "rgba(15, 11, 46, 0.85)",
            borderRadius: 20,
            paddingHorizontal: 6,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 10,
            gap: 2,
          }}
        >
          {[
            { label: "Features", onPress: () => scrollToSection("features") },
            { label: "Pricing", onPress: () => scrollToSection("pricing") },
            {
              label: "Sign In",
              onPress: () => router.push("/(auth)/signIn"),
              accent: true,
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 14,
                backgroundColor: item.accent ? "#FF6B00" : "transparent",
              }}
            >
              <Text
                style={{
                  color: item.accent ? "white" : "rgba(255,255,255,0.7)",
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══════════════════════ HERO SECTION ═══════════════════════ */}
          <View
            style={{
              minHeight: Dimensions.get("window").height * 0.92,
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 24,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Gradient background layers */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "#0F0B2E",
              }}
            />
            <View
              style={{
                position: "absolute",
                top: "10%",
                left: "-20%",
                width: 400,
                height: 400,
                borderRadius: 200,
                backgroundColor: "rgba(255, 107, 0, 0.08)",
              }}
            />
            <View
              style={{
                position: "absolute",
                bottom: "5%",
                right: "-15%",
                width: 350,
                height: 350,
                borderRadius: 175,
                backgroundColor: "rgba(139, 92, 246, 0.08)",
              }}
            />

            {/* Floating Orbs */}
            <Animated.View
              style={{
                position: "absolute",
                top: "15%",
                left: "10%",
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "rgba(255, 107, 0, 0.15)",
                transform: [{ translateY: orb1Y }, { translateX: orb1X }],
              }}
            />
            <Animated.View
              style={{
                position: "absolute",
                top: "60%",
                right: "8%",
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "rgba(139, 92, 246, 0.2)",
                transform: [{ translateY: orb2Y }, { translateX: orb2X }],
              }}
            />
            <Animated.View
              style={{
                position: "absolute",
                bottom: "25%",
                left: "20%",
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                transform: [{ translateY: orb3Y }],
              }}
            />

            {/* Hero Content */}
            <Animated.View
              style={{
                opacity: heroFade,
                transform: [{ translateY: heroSlide }],
                alignItems: "center",
                zIndex: 10,
              }}
            >
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 24,
                  backgroundColor: "rgba(255, 107, 0, 0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 107, 0, 0.3)",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 32,
                }}
              >
                <View
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 16,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "#FF6B00",
                  }}
                >
                  <School size={34} color="white" />
                </View>
              </View>

              <View
                style={{
                  backgroundColor: "rgba(255,107,0,0.12)",
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: "rgba(255,107,0,0.25)",
                  marginBottom: 20,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Sparkles size={14} color="#FF8C40" />
                <Text
                  style={{
                    color: "#FF8C40",
                    fontSize: 12,
                    fontWeight: "700",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    marginLeft: 6,
                  }}
                >
                  Next-Gen School Platform
                </Text>
              </View>

              <Text
                style={{
                  color: "white",
                  fontSize: 36,
                  fontWeight: "900",
                  textAlign: "center",
                  lineHeight: 44,
                  maxWidth: 600,
                }}
              >
                All-in-one{"\n"}
                <Text style={{ color: "#FF8C40" }}>Learning</Text>,{" "}
                <Text style={{ color: "#A78BFA" }}>Teaching</Text> &{"\n"}
                <Text style={{ color: "#60A5FA" }}>Management</Text> Hub
              </Text>

              <Text
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 15,
                  textAlign: "center",
                  maxWidth: 450,
                  marginTop: 16,
                  lineHeight: 22,
                }}
              >
                Empower your institution with a modern, cloud-based LMS.{"\n"}
                Courses, resources, payments, analytics — all in one place.
              </Text>

              <View style={{ flexDirection: "row", marginTop: 32, gap: 12 }}>
                <Animated.View style={{ transform: [{ scale: ctaPulse }] }}>
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: 32, paddingVertical: 18,
                      borderRadius: 16, backgroundColor: "white",
                      elevation: 6, shadowColor: "white",
                      flexDirection: "row", alignItems: "center",
                    }}
                    onPress={() => openRegistrationModal("Free Trial")}
                    activeOpacity={0.9}
                  >
                    <Text style={{
                      color: "#0F172A", fontWeight: "900",
                      fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase", marginRight: 12,
                    }}>
                      Start Free Trial
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: "rgba(255,255,255,0.2)",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  onPress={() => router.push("/demo" as any)}
                >
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.9)",
                      fontWeight: "700",
                      fontSize: 15,
                    }}
                  >
                    Try Demo
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>

          {/* ═══════════════════════ FEATURES SECTION ═══════════════════════ */}
          <View
            ref={featuresRef}
            onLayout={(e) => handleLayout("features", e.nativeEvent.layout.y)}
            style={{
              paddingHorizontal: 20,
              paddingTop: 72,
              paddingBottom: 72,
              backgroundColor: "#13103A",
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Section background mesh */}
            <View style={{
              position: 'absolute', top: '10%', left: '-5%',
              width: 320, height: 320, borderRadius: 160,
              backgroundColor: 'rgba(255,107,0,0.05)',
            } as any} />
            <View style={{
              position: 'absolute', bottom: '5%', right: '-5%',
              width: 280, height: 280, borderRadius: 140,
              backgroundColor: 'rgba(99,102,241,0.07)',
            } as any} />

            {/* Section header */}
            <View style={{ alignItems: 'center', marginBottom: 52 }}>
              {/* Badge */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 7,
                backgroundColor: 'rgba(255,107,0,0.1)',
                borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
                borderWidth: 1, borderColor: 'rgba(255,107,0,0.22)',
                marginBottom: 20,
              }}>
                <BadgeCheck size={14} color="#FF8C40" />
                <Text style={{ color: '#FF8C40', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>
                  Platform Capabilities
                </Text>
              </View>

              <Text style={{ color: '#ffffff', fontSize: Platform.OS === 'web' && SCREEN_WIDTH > 768 ? 40 : 30, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5, lineHeight: Platform.OS === 'web' && SCREEN_WIDTH > 768 ? 48 : 38 }}>
                Everything You{' '}
                <Text style={{ color: '#FF8C40' }}>Need</Text>
              </Text>

              {/* Animated underline */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <View style={{ width: 32, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,107,0,0.3)' }} />
                <View style={{ width: 64, height: 2, borderRadius: 2, backgroundColor: '#FF6B00' }} />
                <View style={{ width: 32, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,107,0,0.3)' }} />
              </View>

              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, textAlign: 'center', marginTop: 18, maxWidth: 520, lineHeight: 23 }}>
                A unified platform built for every stakeholder — from admin and teachers to students and parents.
              </Text>
            </View>

            {/* Feature cards grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginHorizontal: -10 }}>
              {[
                {
                  icon: <BookOpen size={24} color="#FF8C40" />,
                  title: 'Course Management',
                  desc: 'Create, publish and manage rich courses with videos, quizzes, and assignments — all in one editor.',
                  accent: '#FF6B00',
                  tag: 'Core',
                },
                {
                  icon: <Library size={24} color="#A78BFA" />,
                  title: 'Digital Library',
                  desc: 'Give students and teachers instant access to a searchable library of books, PDFs, and media.',
                  accent: '#7C3AED',
                  tag: 'Resources',
                },
                {
                  icon: <CreditCard size={24} color="#60A5FA" />,
                  title: 'Fee & Payments',
                  desc: 'Automate invoicing, track outstanding fees, and accept payments — with real-time dashboards.',
                  accent: '#2563EB',
                  tag: 'Finance',
                },
                {
                  icon: <BarChart2 size={24} color="#34D399" />,
                  title: 'Advanced Analytics',
                  desc: 'Drill into performance trends, attendance, and engagement with beautiful, exportable reports.',
                  accent: '#059669',
                  tag: 'Insights',
                },
                {
                  icon: <Users size={24} color="#F472B6" />,
                  title: 'User Management',
                  desc: 'Onboard and manage admins, teachers, students, and parents with role-based access control.',
                  accent: '#DB2777',
                  tag: 'Admin',
                },
                {
                  icon: <Settings size={24} color="#FBBF24" />,
                  title: 'Smart Configuration',
                  desc: 'Customize branding, modules, permissions and notifications to perfectly fit your institution.',
                  accent: '#D97706',
                  tag: 'Setup',
                },
              ].map((feat) => (
                <FeatureCard key={feat.title} {...feat} />
              ))}
            </View>

          </View>

          {/* ═══════════════════════ PRICING SECTION ═══════════════════════ */}
          <View
            ref={pricingRef}
            onLayout={(e) => handleLayout("pricing", e.nativeEvent.layout.y)}
            style={{
              paddingHorizontal: 20,
              paddingTop: 72,
              paddingBottom: 80,
              backgroundColor: '#0A0820',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background mesh blobs */}
            <View style={{ position: 'absolute', top: '5%', left: '-10%', width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(255,107,0,0.05)' } as any} />
            <View style={{ position: 'absolute', bottom: '5%', right: '-10%', width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(139,92,246,0.06)' } as any} />

            {/* Section header */}
            <View style={{ alignItems: 'center', marginBottom: 52 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 7,
                backgroundColor: 'rgba(255,107,0,0.1)',
                borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
                borderWidth: 1, borderColor: 'rgba(255,107,0,0.22)',
                marginBottom: 20,
              }}>
                <CreditCard size={14} color="#FF8C40" />
                <Text style={{ color: '#FF8C40', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>
                  Flexible Pricing
                </Text>
              </View>

              <Text style={{
                color: '#ffffff',
                fontSize: Platform.OS === 'web' && SCREEN_WIDTH > 768 ? 42 : 30,
                fontWeight: '900',
                textAlign: 'center',
                letterSpacing: -0.5,
                lineHeight: Platform.OS === 'web' && SCREEN_WIDTH > 768 ? 50 : 38,
                marginBottom: 12,
              }}>
                Choose Your{' '}
                <Text style={{ color: '#FF8C40' }}>Package</Text>
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <View style={{ width: 32, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,107,0,0.3)' }} />
                <View style={{ width: 64, height: 2, borderRadius: 2, backgroundColor: '#FF6B00' }} />
                <View style={{ width: 32, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,107,0,0.3)' }} />
              </View>

              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, textAlign: 'center', maxWidth: 520, lineHeight: 23 }}>
                Select your deployment scale, then pick the plan that fits your institution.
              </Text>
            </View>

            {/* ── LEVEL 1: Tier Selector ── */}
            {SCREEN_WIDTH >= 768 ? (
              /* Wide screen (>=768px): centred flex row */
              <View style={{
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 10,
                flexWrap: 'wrap',
                marginBottom: 16,
                paddingHorizontal: 40,
              }}>
                {TIERS.map((tier) => (
                  <PackageTierTab
                    key={tier.key}
                    tier={tier}
                    label={tier.label}
                    icon={tier.icon}
                    tagline={tier.tagline}
                    isActive={selectedTier === tier.key}
                    onPress={() => setSelectedTier(tier.key)}
                  />
                ))}
              </View>
            ) : (
              /* Narrow screen (<768px): horizontal scroll strip */
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 20,
                  paddingBottom: 4,
                }}
                style={{ marginBottom: 16 }}
              >
                {TIERS.map((tier) => (
                  <PackageTierTab
                    key={tier.key}
                    tier={tier}
                    label={tier.label}
                    icon={tier.icon}
                    tagline={tier.tagline}
                    isActive={selectedTier === tier.key}
                    onPress={() => {
                      setSelectedTier(tier.key);
                      // Gently scroll so the plan cards come into view
                      if (pricingCardsY !== null) {
                        scrollRef.current?.scrollTo({
                          y: pricingCardsY - 80,
                          animated: true,
                        });
                      }
                    }}
                  />
                ))}
              </ScrollView>
            )}

            {/* Active tier description */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <Text style={{
                color: 'rgba(255,255,255,0.38)',
                fontSize: 13,
                textAlign: 'center',
                maxWidth: 480,
                lineHeight: 20,
              }}>
                {TIERS.find(t => t.key === selectedTier)?.description}
              </Text>
            </View>

            {/* ── LEVEL 2: Plan Cards ── */}
            <View
              onLayout={(e) => setPricingCardsY(e.nativeEvent.layout.y + (sectionPositions['pricing'] ?? 0))}
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: Platform.OS === 'web' ? 24 : 0,
                width: '100%',
              }}>
              {TIER_PLANS[selectedTier].map((plan) => (
                <PlanCard
                  key={`${selectedTier}-${plan.name}`}
                  plan={plan}
                  tierAccent={TIERS.find(t => t.key === selectedTier)?.accent ?? '#FF6B00'}
                  openRegistrationModal={(planName: string) =>
                    openRegistrationModal(`${TIERS.find(t => t.key === selectedTier)?.label} ${planName}`)
                  }
                />
              ))}
            </View>

            {/* Free Trial Card */}
            <View style={{
              width: '100%',
              marginTop: 40,
              alignItems: 'center',
            }}>
              <View style={{
                width: Platform.OS === 'web' && SCREEN_WIDTH > 768 ? '70%' : '100%',
                maxWidth: 700,
                borderRadius: 28,
                overflow: 'hidden',
                borderWidth: 1.5,
                borderColor: 'rgba(52,211,153,0.35)',
                backgroundColor: 'rgba(52,211,153,0.05)',
              }}>
                {/* Top accent bar */}
                <View style={{ height: 3, backgroundColor: '#10B981', opacity: 0.8 }} />

                <View style={{
                  padding: 28,
                  flexDirection: Platform.OS === 'web' && SCREEN_WIDTH > 600 ? 'row' : 'column',
                  alignItems: 'center',
                  gap: 24,
                }}>
                  {/* Icon + label */}
                  <View style={{ alignItems: 'center', gap: 10, minWidth: 80 }}>
                    <View style={{
                      width: 56, height: 56, borderRadius: 18,
                      backgroundColor: 'rgba(16,185,129,0.12)',
                      borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.3)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Sparkles size={24} color="#10B981" />
                    </View>
                    <View style={{
                      backgroundColor: 'rgba(16,185,129,0.15)',
                      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3,
                      borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
                    }}>
                      <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Free</Text>
                    </View>
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 20, marginBottom: 6 }}>
                      Try Cloudora Free for 14 Days
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 21 }}>
                      No credit card required. Get full access to all core features and see how Cloudora transforms your institution.
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                      {['Unlimited Students', 'All Core Modules', 'Email Support', 'No Commitment'].map((feat) => (
                        <View key={feat} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Check size={12} color="#10B981" strokeWidth={3} />
                          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' }}>{feat}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* CTA button */}
                  <TouchableOpacity
                    onPress={() => openRegistrationModal('Free Trial')}
                    activeOpacity={0.85}
                    style={{
                      paddingVertical: 16, paddingHorizontal: 28,
                      borderRadius: 18,
                      backgroundColor: '#10B981',
                      alignItems: 'center',
                      shadowColor: '#10B981',
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.35,
                      shadowRadius: 16,
                      minWidth: 160,
                    }}
                  >
                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 14 }}>Start Free Trial</Text>
                    {/* <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>No card needed</Text> */}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ── Add-Ons Section ── */}
            <View style={{ width: '100%', marginTop: 56 }}>
              {/* Header */}
              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 7,
                  backgroundColor: 'rgba(139,92,246,0.1)',
                  borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
                  borderWidth: 1, borderColor: 'rgba(139,92,246,0.22)',
                  marginBottom: 14,
                }}>
                  <Sparkles size={14} color="#A78BFA" />
                  <Text style={{ color: '#A78BFA', fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' }}>
                    Add-Ons
                  </Text>
                </View>
                <Text style={{ color: 'white', fontWeight: '800', fontSize: 22, textAlign: 'center', marginBottom: 6 }}>
                  Enhance Your Plan
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', maxWidth: 460, lineHeight: 20 }}>
                  Bolt on powerful modules to any plan — available standalone or bundled with Pro &amp; above.
                </Text>
              </View>

              {/* Add-on cards */}
              <View style={{
                flexDirection: Platform.OS === 'web' && SCREEN_WIDTH > 700 ? 'row' : 'column',
                gap: 20, justifyContent: 'center', flexWrap: 'wrap',
                paddingHorizontal: Platform.OS === 'web' ? 40 : 0,
              }}>
                {[
                  {
                    icon: <Library size={28} color="#A78BFA" />,
                    name: 'Digital Library',
                    tagline: 'Add-On Module',
                    price: 'From $19/mo',
                    accent: '#8B5CF6',
                    desc: 'Give your institution a fully searchable digital library — books, PDFs, videos and more. Included in Pro & above.',
                    features: [
                      'Unlimited uploads & categories',
                      'Student & teacher access controls',
                      'Search, filter & bookmarking',
                      'Mobile-friendly reader',
                    ],
                    includedIn: 'Included in Basic Pro, Enterprise & Custom plans',
                  },
                  {
                    icon: <BadgeCheck size={28} color="#34D399" />,
                    name: 'Messaging',
                    tagline: 'Add-On Module',
                    price: 'From $14/mo',
                    accent: '#10B981',
                    desc: 'Real-time in-app messaging between teachers, students and parents. Keep communication within the platform.',
                    features: [
                      'Direct & group messaging',
                      'Announcements & broadcasts',
                      'File & image sharing',
                      'Read receipts & notifications',
                    ],
                    includedIn: 'Included in Basic Pro, Enterprise & Custom plans',
                  },
                ].map((addon) => (
                  <View
                    key={addon.name}
                    style={Platform.OS === 'web' ? {
                      flex: 1, minWidth: 280, maxWidth: 440,
                    } : { width: '100%' }}
                  >
                    <View style={{
                      borderRadius: 28, overflow: 'hidden',
                      borderWidth: 1.5, borderColor: `${addon.accent}33`,
                      backgroundColor: `${addon.accent}08`,
                    }}>
                      {/* Top accent line */}
                      <View style={{ height: 3, backgroundColor: addon.accent, opacity: 0.7 }} />
                      <View style={{ padding: 28 }}>
                        {/* Icon + prices row */}
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                          <View style={{
                            width: 54, height: 54, borderRadius: 16,
                            backgroundColor: `${addon.accent}15`,
                            borderWidth: 1, borderColor: `${addon.accent}30`,
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            {addon.icon}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <View style={{
                              backgroundColor: `${addon.accent}18`, borderRadius: 8,
                              paddingHorizontal: 10, paddingVertical: 3,
                              borderWidth: 1, borderColor: `${addon.accent}28`, marginBottom: 6,
                            }}>
                              <Text style={{ color: addon.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                                {addon.tagline}
                              </Text>
                            </View>
                            <Text style={{ color: 'white', fontWeight: '900', fontSize: 22 }}>{addon.price}</Text>
                          </View>
                        </View>

                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 18, marginBottom: 8 }}>{addon.name}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 20, marginBottom: 18 }}>{addon.desc}</Text>

                        {/* Features */}
                        <View style={{ gap: 10, marginBottom: 20 }}>
                          {addon.features.map((feat) => (
                            <View key={feat} style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View style={{
                                width: 20, height: 20, borderRadius: 6,
                                backgroundColor: `${addon.accent}15`,
                                alignItems: 'center', justifyContent: 'center',
                                marginRight: 12, borderWidth: 1, borderColor: `${addon.accent}30`,
                              }}>
                                <Check size={12} color={addon.accent} strokeWidth={3} />
                              </View>
                              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{feat}</Text>
                            </View>
                          ))}
                        </View>

                        {/* Included-in note */}
                        <View style={{
                          backgroundColor: `${addon.accent}10`, borderRadius: 10,
                          paddingHorizontal: 14, paddingVertical: 8,
                          borderWidth: 1, borderColor: `${addon.accent}20`, marginBottom: 20,
                          flexDirection: 'row', alignItems: 'center', gap: 8,
                        }}>
                          <Check size={13} color={addon.accent} strokeWidth={3} />
                          <Text style={{ color: addon.accent, fontSize: 11, fontWeight: '600', flex: 1 }}>{addon.includedIn}</Text>
                        </View>

                        {/* CTA */}
                        <TouchableOpacity
                          style={{
                            width: '100%', paddingVertical: 14, borderRadius: 18,
                            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                            borderWidth: 1.5, borderColor: `${addon.accent}55`,
                            backgroundColor: 'transparent',
                          }}
                          onPress={() => openRegistrationModal(`${addon.name} Add-On`)}
                          activeOpacity={0.8}
                        >
                          <Text style={{ color: addon.accent, fontWeight: '700', fontSize: 14 }}>Talk to Sales</Text>
                          <MoveRight size={16} color={addon.accent} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Contact CTA for Custom */}
            {selectedTier === 'custom' && (
              <View style={{ alignItems: 'center', marginTop: 36 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginBottom: 12 }}>
                  Need a fully custom quote? Talk to our team directly.
                </Text>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: 'rgba(139,92,246,0.12)',
                    borderWidth: 1.5, borderColor: 'rgba(139,92,246,0.35)',
                    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28,
                  }}
                  onPress={() => openRegistrationModal('Custom Enterprise')}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#A78BFA', fontWeight: '700', fontSize: 14 }}>Schedule a Demo</Text>
                  <MoveRight size={16} color="#A78BFA" />
                </TouchableOpacity>
              </View>
            )}
          </View>


          {/* ═══════════════════════ FOOTER ═══════════════════════ */}
          <View
            style={{
              alignItems: "center",
              paddingHorizontal: 32,
              paddingBottom: 24,
              paddingTop: 32,
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              Already have an account?
            </Text>
            <TouchableOpacity
              style={{ marginTop: 8 }}
              onPress={() => router.push("/(auth)/signIn")}
            >
              <Text
                style={{ color: "#FF8C40", fontWeight: "700", fontSize: 15 }}
              >
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Addon Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={addonModalVisible}
        onRequestClose={() => setAddonModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)" }}>
          <View style={{
            backgroundColor: "#13103A",
            borderRadius: 32,
            padding: 24,
            width: Platform.OS === 'web' ? 500 : '90%',
            maxWidth: 500,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)"
          }}>
            <TouchableOpacity
              style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}
              onPress={() => setAddonModalVisible(false)}
            >
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 24, fontWeight: "bold" }}>×</Text>
            </TouchableOpacity>

            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 20,
                backgroundColor: "rgba(255, 107, 0, 0.1)",
                justifyContent: "center", alignItems: "center",
                marginBottom: 16,
                borderWidth: 1, borderColor: "rgba(255, 107, 0, 0.3)"
              }}>
                <Plus size={32} color="#FF6B00" />
              </View>
              <Text style={{ color: "white", fontSize: 24, fontWeight: "900", textAlign: "center" }}>Boost Your Plan</Text>
              <Text style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 8 }}>Enhance your {selectedPlan} with powerful add-ons.</Text>
            </View>

            <View style={{ gap: 12, marginBottom: 24 }}>
              {TIER_PLANS.addOns.map((addon) => {
                const isSelected = selectedAddons.includes(addon.name);
                return (
                  <TouchableOpacity
                    key={addon.name}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedAddons(selectedAddons.filter(a => a !== addon.name));
                      } else {
                        setSelectedAddons([...selectedAddons, addon.name]);
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: isSelected ? "rgba(255, 107, 0, 0.15)" : "rgba(255,255,255,0.05)",
                      padding: 16,
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderColor: isSelected ? "#FF6B00" : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: isSelected ? "white" : "rgba(255,255,255,0.9)", fontWeight: "700", fontSize: 16 }}>{addon.name}</Text>
                      <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 }}>{addon.desc}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: "#FF8C40", fontWeight: "800", fontSize: 14 }}>{addon.price}</Text>
                      {isSelected && (
                        <View style={{ backgroundColor: "#FF6B00", borderRadius: 8, padding: 2, marginTop: 4 }}>
                          <Check size={12} color="white" strokeWidth={3} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: "#FF6B00",
                  paddingVertical: 18,
                  borderRadius: 18,
                  alignItems: "center",
                  shadowColor: "#FF6B00",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                }}
                onPress={proceedToRegistration}
              >
                <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
                  {selectedAddons.length > 0 ? "Add & Continue" : "Skip & Continue"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ paddingVertical: 12, alignItems: "center" }}
                onPress={() => setAddonModalVisible(false)}
              >
                <Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Features Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={customModalVisible}
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)" }}>
          <View style={{
            backgroundColor: "#13103A",
            borderRadius: 32,
            padding: 24,
            width: Platform.OS === 'web' ? 600 : '95%',
            maxWidth: 600,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.1)"
          }}>
            <TouchableOpacity
              style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}
              onPress={() => setCustomModalVisible(false)}
            >
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 24, fontWeight: "bold" }}>×</Text>
            </TouchableOpacity>

            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 20,
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                justifyContent: "center", alignItems: "center",
                marginBottom: 16,
                borderWidth: 1, borderColor: "rgba(139, 92, 246, 0.3)"
              }}>
                <Settings size={32} color="#8B5CF6" />
              </View>
              <Text style={{ color: "white", fontSize: 24, fontWeight: "900", textAlign: "center" }}>Configure Custom Plan</Text>
              <Text style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 8 }}>Select the specialized features and modules for your institution.</Text>
            </View>

            <View style={{ maxHeight: 400 }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Core Modules Section */}
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, marginLeft: 4 }}>Core Modules</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24, justifyContent: 'flex-start' }}>
                  {['Student module', 'Teacher module', 'Parent module'].map((mod) => {
                    const isSelected = selectedCoreModules.includes(mod);
                    return (
                      <TouchableOpacity
                        key={mod}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedCoreModules(selectedCoreModules.filter(m => m !== mod));
                          } else {
                            setSelectedCoreModules([...selectedCoreModules, mod]);
                          }
                        }}
                        style={{
                          backgroundColor: isSelected ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.04)",
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderRadius: 14,
                          borderWidth: 1.5,
                          borderColor: isSelected ? "#3B82F6" : "rgba(255,255,255,0.08)",
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        <Text style={{ color: isSelected ? "white" : "rgba(255,255,255,0.7)", fontWeight: "600", fontSize: 13 }}>{mod}</Text>
                        {isSelected && <Check size={14} color="#3B82F6" strokeWidth={3} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Modules Section */}
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, marginLeft: 4 }}>Custom Modules</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24, justifyContent: 'flex-start' }}>
                  {TIER_PLANS.custom[0].features.map((feat: string) => {
                    const isSelected = selectedCustomFeatures.includes(feat);
                    return (
                      <TouchableOpacity
                        key={feat}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedCustomFeatures(selectedCustomFeatures.filter(f => f !== feat));
                          } else {
                            setSelectedCustomFeatures([...selectedCustomFeatures, feat]);
                          }
                        }}
                        style={{
                          backgroundColor: isSelected ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.04)",
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderRadius: 14,
                          borderWidth: 1.5,
                          borderColor: isSelected ? "#8B5CF6" : "rgba(255,255,255,0.08)",
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8
                        }}
                      >
                        <Text style={{ color: isSelected ? "white" : "rgba(255,255,255,0.7)", fontWeight: "600", fontSize: 13 }}>{feat}</Text>
                        {isSelected && <Check size={14} color="#8B5CF6" strokeWidth={3} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Add-on Modules Section */}
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12, marginLeft: 4 }}>Add-on Modules (Included in Custom)</Text>
                <View style={{ gap: 10, marginBottom: 24 }}>
                  {TIER_PLANS.addOns.map((addon) => {
                    const isSelected = selectedAddons.includes(addon.name);
                    return (
                      <TouchableOpacity
                        key={addon.name}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedAddons(selectedAddons.filter(a => a !== addon.name));
                          } else {
                            setSelectedAddons([...selectedAddons, addon.name]);
                          }
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isSelected ? "rgba(255, 107, 0, 0.15)" : "rgba(255,255,255,0.04)",
                          padding: 14,
                          borderRadius: 16,
                          borderWidth: 1.5,
                          borderColor: isSelected ? "#FF6B00" : "rgba(255,255,255,0.08)",
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: isSelected ? "white" : "rgba(255,255,255,0.9)", fontWeight: "700", fontSize: 14 }}>{addon.name}</Text>
                          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 1 }}>{addon.desc}</Text>
                        </View>
                        {isSelected && (
                          <View style={{ backgroundColor: "#FF6B00", borderRadius: 8, padding: 2 }}>
                            <Check size={12} color="white" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View style={{ gap: 12 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: "#8B5CF6",
                  paddingVertical: 18,
                  borderRadius: 18,
                  alignItems: "center",
                  shadowColor: "#8B5CF6",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                }}
                onPress={proceedToRegistration}
              >
                <Text style={{ color: "white", fontWeight: "900", fontSize: 16 }}>
                  {(selectedCustomFeatures.length > 0 || selectedCoreModules.length > 0 || selectedAddons.length > 0) ? "Apply & Continue" : "Skip & Continue"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ paddingVertical: 12, alignItems: "center" }}
                onPress={() => setCustomModalVisible(false)}
              >
                <Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Registration Modal */}
      < Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)
        }
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View style={{ backgroundColor: "#13103A", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: 450 }}>
            <View style={{ width: 40, height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, alignSelf: "center", marginBottom: 24 }} />
            {/* Close button */}
            <TouchableOpacity
              style={{ position: "absolute", top: 24, right: 24, zIndex: 10 }}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 24, fontWeight: "bold" }}>×</Text>
            </TouchableOpacity>

            {submitted ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(52, 211, 153, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
                  <Check size={40} color="#10B981" />
                </View>
                <Text style={{ color: "white", fontSize: 24, fontWeight: "900", textAlign: "center", marginBottom: 12 }}>Request Received!</Text>
                <Text style={{ color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 32 }}>Our team will reach out to you within 24 hours to set up your {selectedPlan} account.</Text>
                <TouchableOpacity style={{ backgroundColor: "#FF6B00", paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 }} onPress={() => setModalVisible(false)}>
                  <Text style={{ color: "white", fontWeight: "700" }}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={{ color: "white", fontSize: 22, fontWeight: "900", marginBottom: 8 }}>Register for {selectedPlan}</Text>
                <Text style={{ color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>Enter your details and our team will contact you shortly.</Text>

                <View style={{ gap: 16, marginBottom: 32 }}>
                  <TextInput
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 18, color: "white", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
                    placeholder="Institution Name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={form.name}
                    onChangeText={(t) => setForm(prev => ({ ...prev, name: t }))}
                  />
                  <TextInput
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 18, color: "white", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
                    placeholder="Contact Email"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="email-address"
                    value={form.email}
                    onChangeText={(t) => setForm(prev => ({ ...prev, email: t }))}
                  />
                  <TextInput
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 18, color: "white", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", minHeight: 80 }}
                    placeholder="Additional Message (Optional)"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                    value={form.message}
                    onChangeText={(t) => setForm(prev => ({ ...prev, message: t }))}
                  />
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: "#FF6B00", paddingVertical: 18, borderRadius: 16, alignItems: "center", flexDirection: 'row', justifyContent: 'center' }}
                  onPress={handleSignup}
                  disabled={submitting}
                >
                  {submitting ? <ActivityIndicator color="white" style={{ marginRight: 10 }} /> : null}
                  <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
                    {submitting ? "Sending Request..." : "Request Setup"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal >
    </SafeAreaView >
  );
}
