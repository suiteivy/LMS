import { AppLoading } from "@/components/AppLoading";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { router, usePathname } from "expo-router";
import { supabase } from '@/libs/supabase'
import React, { useEffect, useRef, useState } from 'react'
import {
  BadgeCheck,
  BarChart2,
  BookOpen,
  Check,
  CreditCard,
  Crown,
  Library,
  School,
  Settings,
  Sparkles,
  Star,
  Timer,
  Users,
  MoveRight
} from "lucide-react-native";
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path } from 'react-native-svg';
import {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import Reanimated from 'react-native-reanimated';
import {
  ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView, StatusBar, Text,
  TextInput,
  TouchableOpacity, View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Fancy Pricing Card Component ──────────────────────────────────────────
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

const FancyPricingCard = ({ plan, openRegistrationModal }: any) => {
  const hoverValue = useSharedValue(0);
  const animValue = useSharedValue(0);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const shineX = useSharedValue(-100);

  const borderAnim = useSharedValue(0);

  useEffect(() => {
    animValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5000 }),
        withTiming(0, { duration: 5000 })
      ),
      -1,
      true
    );

    borderAnim.value = withRepeat(
      withTiming(1, { duration: 4000 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { translateY: interpolate(hoverValue.value, [0, 1], [0, -12]) },
        { scale: interpolate(hoverValue.value, [0, 1], [1, 1.03]) },
        { rotateX: `${tiltX.value}deg` },
        { rotateY: `${tiltY.value}deg` },
      ],
      shadowOpacity: interpolate(hoverValue.value, [0, 1], [0.1, 0.4]),
      shadowRadius: interpolate(hoverValue.value, [0, 1], [10, 25]),
    };
  });

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shineX.value }],
  }));

  const blob1Props = useAnimatedProps(() => ({
    cx: interpolate(animValue.value, [0, 1], [10, 40]) + '%',
    cy: interpolate(animValue.value, [0, 1], [10, 30]) + '%',
  }));

  const blob2Props = useAnimatedProps(() => ({
    cx: interpolate(animValue.value, [0, 1], [90, 60]) + '%',
    cy: interpolate(animValue.value, [0, 1], [90, 70]) + '%',
  }));

  const onPointerMove = (e: any) => {
    if (Platform.OS !== 'web') return;
    const { width, height, left, top } = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    const centerX = width / 2;
    const centerY = height / 2;

    tiltY.value = withTiming((x - centerX) / 15, { duration: 100 });
    tiltX.value = withTiming((centerY - y) / 15, { duration: 100 });
  };

  const onHoverIn = () => {
    if (Platform.OS === 'web') {
      hoverValue.value = withTiming(1, { duration: 300 });
      shineX.value = withSequence(
        withTiming(-100, { duration: 0 }),
        withTiming(400, { duration: 800 })
      );
    }
  };

  const onHoverOut = () => {
    if (Platform.OS === 'web') {
      hoverValue.value = withTiming(0, { duration: 300 });
      tiltX.value = withTiming(0);
      tiltY.value = withTiming(0);
    }
  };

  return (
    <Reanimated.View
      style={[{
        width: Platform.OS === 'web' && SCREEN_WIDTH > 1100 ? '23%' : (Platform.OS === 'web' && SCREEN_WIDTH > 768 ? '46%' : '100%'),
        minWidth: 280,
        marginVertical: 12,
        position: 'relative',
        shadowColor: plan.accent,
        shadowOffset: { width: 0, height: 10 },
      }, animatedStyle]}
      //@ts-ignore - for web hover
      onPointerEnter={onHoverIn}
      onPointerLeave={onHoverOut}
      onPointerMove={onPointerMove}
    >
      {/* Premium Rotating Border */}
      {plan.premium && Platform.OS === 'web' && (
        <View style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 38, overflow: 'hidden' }}>
          <Reanimated.View
            style={[useAnimatedStyle(() => ({
              transform: [{ rotate: `${borderAnim.value * 360}deg` }]
            })), {
              width: '200%',
              height: '200%',
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              //@ts-ignore
              backgroundImage: 'conic-gradient(from 0deg, transparent, #8B5CF6, #EC4899, #3B82F6, transparent)',
            }] as any}
          />
        </View>
      )}

      <View style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 36,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: plan.popular ? `${plan.accent}66` : 'rgba(255,255,255,0.1)',
        height: '100%',
        flex: 1,
        backdropFilter: Platform.OS === 'web' ? 'blur(20px)' : 'none'
      } as any}>

        {/* Shine Animation - Web Only */}
        {Platform.OS === 'web' && (
          <Reanimated.View
            style={[{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 50,
              height: '100%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              transform: [{ skewX: '-20deg' }],
              zIndex: 10,
            }, shineStyle]}
          />
        )}

        {/* Background Decorative Shapes */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.25 }}>
          <Svg height="100%" width="100%">
            <Defs>
              <LinearGradient id={`grad-${plan.name}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={plan.accent} stopOpacity="0.6" />
                <Stop offset="100%" stopColor={plan.accent} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <AnimatedCircle r="100" fill={`url(#grad-${plan.name})`} animatedProps={blob1Props} />
            <AnimatedCircle r="120" fill={`url(#grad-${plan.name})`} animatedProps={blob2Props} />
          </Svg>
        </View>

        {/* Dynamic Glow for Pro/Premium */}
        {(plan.popular || plan.premium) && (
          <View style={{
            position: 'absolute',
            top: '20%',
            left: '20%',
            right: '20%',
            bottom: '20%',
            backgroundColor: plan.accent,
            opacity: 0.1,
            borderRadius: 100,
            filter: 'blur(60px)',
            zIndex: -1
          } as any} />
        )}

        {Platform.OS !== 'web' && (
          <BlurView intensity={30} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} tint="dark" />
        )}

        <View style={{ padding: 36, flex: 1 }}>
          {(plan.popular || plan.premium) && (
            <View style={{
              position: 'absolute',
              top: 20,
              right: -30,
              backgroundColor: plan.premium ? '#8B5CF6' : '#F59E0B',
              paddingHorizontal: 40,
              paddingVertical: 6,
              transform: [{ rotate: '45deg' }],
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              zIndex: 20
            }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                {plan.premium ? 'Elite' : 'Popular'}
              </Text>
            </View>
          )}

          <View style={{
            marginBottom: 28,
            backgroundColor: `${plan.accent}15`,
            width: 64,
            height: 64,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: `${plan.accent}33`
          }}>
            {React.cloneElement(plan.icon, { size: 28, color: plan.accent })}
          </View>

          <Text style={{
            color: plan.accent,
            fontWeight: "800",
            fontSize: 14,
            textTransform: 'uppercase',
            letterSpacing: 3,
            marginBottom: 14
          }}>{plan.name}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 }}>
            <Text style={{ color: "white", fontWeight: "900", fontSize: 52 }}>{plan.price.split('/')[0]}</Text>
            {plan.price.includes('/') && (
              <Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "600", fontSize: 20, marginBottom: 12, marginLeft: 4 }}>/{plan.price.split('/')[1]}</Text>
            )}
          </View>

          <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, marginBottom: 36, lineHeight: 24 }}>{plan.desc}</Text>

          <View style={{ gap: 18, marginBottom: 44, flex: 1 }}>
            {plan.features.map((feat: string, i: number) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  backgroundColor: `${plan.accent}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                  borderWidth: 1,
                  borderColor: `${plan.accent}33`
                }}>
                  <Check size={14} color={plan.accent} strokeWidth={3} />
                </View>
                <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: '500' }}>{feat}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={{
              width: '100%',
              paddingVertical: 20,
              borderRadius: 24,
              alignItems: 'center',
              backgroundColor: plan.accent,
              shadowColor: plan.accent,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.4,
              shadowRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)'
            }}
            onPress={() => openRegistrationModal(plan.name)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 17 }}>
                {plan.name === 'Trial' ? 'Get Started' : 'Subscribe Now'}
              </Text>
              <MoveRight size={20} color="white" />
            </View>
          </TouchableOpacity>
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
  const { session, loading, isInitializing, profile } = useAuth();
  const formRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const pathname = usePathname();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isNavReady, setIsNavReady] = useState(false);

  // Show AppLoading for 5s before redirecting to dashboard
  const [navigating, setNavigating] = useState(false);
  const pendingRoute = useRef<string | null>(null);

  // Section refs for smooth scrolling
  const featuresRef = useRef<View>(null);
  const pricingRef = useRef<View>(null);

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

  // Detect session → store the target route and start loading screen
  useEffect(() => {
    const isActuallyOnLanding = pathname === "/" || pathname === "/index";
    if (
      isActuallyOnLanding &&
      isNavReady &&
      !isInitializing &&
      session &&
      profile &&
      !navigating
    ) {
      let route: string | null = null;
      if (profile.role === "admin") route = "/(admin)";
      else if (profile.role === "teacher") route = "/(teacher)";
      else if (profile.role === "student") route = "/(student)";
      else if (profile.role === "parent") route = "/(parent)";

      if (route) {
        pendingRoute.current = route;
        setNavigating(true);
      }
    }
  }, [isNavReady, isInitializing, session, profile, pathname]);

  // After 5 seconds of AppLoading, do the actual redirect
  useEffect(() => {
    if (!navigating) return;
    const timer = setTimeout(() => {
      if (pendingRoute.current) router.replace(pendingRoute.current as any);
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigating]);

  // Show AppLoading immediately if:
  //  1. navigating = true (5-second post-login animation), OR
  //  2. auth is still initializing/loading (prevents landing page flash), OR
  //  3. session already exists — redirect is imminent; don't paint the landing page
  if (navigating || loading || isInitializing || (session && profile)) {
    return <AppLoading />;
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
        message: form.message || `Setup request for ${selectedPlan} plan`
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
    setSubmitted(false);
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
              paddingTop: 48,
              paddingBottom: 40,
              backgroundColor: "#13103A",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 28,
                fontWeight: "800",
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              Everything You Need
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                textAlign: "center",
                marginBottom: 32,
              }}
            >
              Powerful tools for every stakeholder
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "stretch",
                marginHorizontal: -8,
              }}
            >
              {[
                {
                  icon: <BookOpen size={22} color="#FF8C40" />,
                  title: "Courses",
                  desc: "Browse, enroll, and manage courses with ease.",
                  gradient: ["#FF6B00", "#FF8C40"],
                },
                {
                  icon: <Library size={22} color="#A78BFA" />,
                  title: "Library",
                  desc: "Access digital books and resources anytime.",
                  gradient: ["#7C3AED", "#A78BFA"],
                },
                {
                  icon: <CreditCard size={22} color="#60A5FA" />,
                  title: "Payments",
                  desc: "Track fees and manage payments simply.",
                  gradient: ["#2563EB", "#60A5FA"],
                },
                {
                  icon: <BarChart2 size={22} color="#34D399" />,
                  title: "Analytics",
                  desc: "Get actionable insights and reports.",
                  gradient: ["#059669", "#34D399"],
                },
                {
                  icon: <Users size={22} color="#F472B6" />,
                  title: "Users",
                  desc: "Manage students, teachers, and admins.",
                  gradient: ["#DB2777", "#F472B6"],
                },
                {
                  icon: <Settings size={22} color="#FBBF24" />,
                  title: "Settings",
                  desc: "Customize your experience to your needs.",
                  gradient: ["#D97706", "#FBBF24"],
                },
              ].map(({ icon, title, desc, gradient }) => (
                <View
                  key={title}
                  style={{
                    width:
                      Platform.OS === "web" && SCREEN_WIDTH >= 800
                        ? "46%"
                        : "100%",
                    maxWidth: 340,
                    minWidth: Platform.OS === "web" && SCREEN_WIDTH >= 800 ? 260 : "90%",
                    flexGrow: 1,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    borderRadius: 18,
                    padding: 20,
                    margin: 8,
                    alignSelf: "stretch",
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: `${gradient[0]}18`,
                      borderWidth: 1,
                      borderColor: `${gradient[0]}30`,
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    {icon}
                  </View>
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "800",
                      fontSize: 17,
                      marginBottom: 6,
                    }}
                  >
                    {title}
                  </Text>
                  <Text
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 13,
                      lineHeight: 19,
                    }}
                  >
                    {desc}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ═══════════════════════ PRICING SECTION ═══════════════════════ */}
          <View
            ref={pricingRef}
            onLayout={(e) => handleLayout("pricing", e.nativeEvent.layout.y)}
            style={{ paddingHorizontal: 20, paddingVertical: 60, backgroundColor: "#0F0B2E" }}
          >
            <Text style={{ color: "white", fontSize: 28, fontWeight: "900", textAlign: "center", marginBottom: 32 }}>
              Choose Your Plan
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: Platform.OS === "web" ? 24 : 0,
                width: "100%",
                paddingTop: 20
              }}
            >
              {[
                {
                  name: "Trial",
                  price: "Free",
                  desc: "Perfect to explore",
                  features: ["1 Admin Account", "Up to 50 Students", "Core Modules", "Trial Banner"],
                  icon: <Timer size={24} color="#94A3B8" />,
                  accent: "#94A3B8",
                  bg: "rgba(148, 163, 184, 0.05)"
                },
                {
                  name: "Basic",
                  price: "$49/mo",
                  desc: "For growing schools",
                  features: ["2 Admin Accounts", "Unlimited Teachers", "Up to 500 Students", "Standard Analytics"],
                  icon: <BookOpen size={24} color="#3B82F6" />,
                  accent: "#3B82F6",
                  bg: "rgba(59, 130, 246, 0.05)"
                },
                {
                  name: "Pro",
                  price: "$99/mo",
                  desc: "Advanced institutions",
                  features: ["5 Admin Accounts", "Up to 1000 Students", "Advanced Analytics", "Finance Module"],
                  icon: <Crown size={24} color="#F59E0B" />,
                  accent: "#F59E0B",
                  bg: "rgba(245, 158, 11, 0.08)",
                  popular: true
                },
                {
                  name: "Premium",
                  price: "$199/mo",
                  desc: "Ultimate solution",
                  features: ["Unlimited Admins", "Unlimited Students", "Custom Branding", "Bulk Operations"],
                  icon: <Sparkles size={24} color="#8B5CF6" />,
                  accent: "#8B5CF6",
                  bg: "rgba(139, 92, 246, 0.1)",
                  premium: true
                }
              ].map((plan) => (
                <FancyPricingCard
                  key={plan.name}
                  plan={plan}
                  openRegistrationModal={openRegistrationModal}
                />
              ))}
            </View>
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
