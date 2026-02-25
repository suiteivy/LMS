import { AppLoading } from "@/components/AppLoading";
import { useAuth } from "@/contexts/AuthContext";
import { router, usePathname } from "expo-router";
import {
  BadgeCheck,
  BarChart2,
  BookOpen,
  Check,
  ChevronDown,
  CreditCard,
  Crown,
  Library,
  School,
  Settings,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StatusBar, Text, TouchableOpacity, View, Modal, TextInput
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function Index() {
  const { session, loading, isInitializing, profile } = useAuth();
  const formRef = useRef<View>(null);
  const trialRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const pathname = usePathname();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Section refs for smooth scrolling
  const featuresRef = useRef<View>(null);
  const demoRef = useRef<View>(null);
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

  const [isNavReady, setIsNavReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsNavReady(true), 1);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Only auto-redirect to dashboard if we are actually ON the landing page.
    // This prevents stealing the navigation if the user is refreshing a deep page
    // and AuthHandler transiently lands them here.
    const isActuallyOnLanding = pathname === "/" || pathname === "/index";

    if (
      isActuallyOnLanding &&
      isNavReady &&
      !isInitializing &&
      session &&
      profile
    ) {
      if (profile.role === "admin") router.replace("/(admin)");
      else if (profile.role === "teacher") router.replace("/(teacher)");
      else if (profile.role === "student") router.replace("/(student)");
      else if (profile.role === "parent") router.replace("/(parent)");
    }
  }, [isNavReady, isInitializing, session, profile, pathname]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0F0B2E",
        }}
      >
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  // Orb translations
  const orb1Y = orb1.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const orb1X = orb1.interpolate({ inputRange: [0, 1], outputRange: [0, 15] });
  const orb2Y = orb2.interpolate({ inputRange: [0, 1], outputRange: [0, 25] });
  const orb2X = orb2.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const orb3Y = orb3.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.message) {
      alert("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/contact/booking', {
        name: form.name,
        email: form.email,
        plan: selectedPlan,
        message: form.message
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
            { label: "Demo", onPress: () => scrollToSection("demo") },
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
              {/* Logo Badge */}
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

              {/* Tagline badge */}
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

              {/* Headline */}
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

              {/* Subtitle */}
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

              {/* CTA Buttons */}
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

            {/* Scroll Indicator Arrows */}
            {/* <Animated.View
              style={{
                position: "absolute",
                bottom: 30,
                alignItems: "center",
                zIndex: 40,
              
              }}
            >
              <View style={{ height: 70, width: 40, alignItems: "center" }}>
                {[0, 1, 2].map((index) => {
                  const offset = index * 0.2;
                  const translateY = scrollAnimation.interpolate({
                    inputRange: [
                      Math.max(0, offset),
                      Math.min(0.4 + offset, 1),
                      1,
                    ],
                    outputRange: [0, 10, 10],
                    extrapolate: "clamp",
                  });
                  const opacity = scrollAnimation.interpolate({
                    inputRange: [
                      Math.max(0, offset),
                      Math.min(0.15 + offset, 1),
                      Math.min(0.35 + offset, 1),
                      Math.min(0.55 + offset, 1),
                      1,
                    ],
                    outputRange: [0, 1, 1, 0, 0],
                    extrapolate: "clamp",
                  });
                  return (
                    <Animated.View
                      key={index}
                      style={{
                        position: "absolute",
                        top: index * 18,
                        opacity,
                        transform: [{ translateY }],
                      }}
                    >
                      <ChevronDown size={26} color="#FF8C40" strokeWidth={3} />
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View> */}
          </View>

          {/* ═══════════════════════ FEATURES SECTION ═══════════════════════ */}
          <View
            ref={featuresRef}
            onLayout={(e) => handleLayout("features", e.nativeEvent.layout.y)}
            style={{
              paddingHorizontal: 20,
              paddingTop: 60,
              paddingBottom: 40,
              backgroundColor: "#13103A",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 28,
                fontWeight: "900",
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

            <View className="max-lg:flex-col flex-col lg:flex-row flex-wrap justify-center items-center gap-5">
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
                <Pressable
                  key={title}
                  style={({ pressed }) => ({
                    maxWidth: 340,
                    minWidth: "46%",
                    flexBasis: "46%",
                    flexGrow: 1,
                    backgroundColor: "rgba(255,255,255,0.04)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                    borderRadius: 20,
                    padding: 20,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
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
                </Pressable>
              ))}
            </View>
          </View>

          {/* ═══════════════════════ INTERACTIVE DEMO SECTION ═══════════════════════ */}
          <View
            ref={demoRef}
            onLayout={(e) => handleLayout("demo", e.nativeEvent.layout.y)}
            style={{
              marginHorizontal: 20,
              marginVertical: 40,
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,107,0,0.2)",
              backgroundColor: "rgba(255,107,0,0.06)",
              padding: 32,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: "rgba(255,107,0,0.15)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <BadgeCheck size={28} color="#FF8C40" />
            </View>
            <Text
              style={{
                color: "white",
                fontWeight: "800",
                fontSize: 20,
                marginBottom: 6,
                textAlign: "center",
              }}
            >
              Interactive Demo
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                textAlign: "center",
                maxWidth: 320,
                marginBottom: 20,
              }}
            >
              Explore the platform instantly — no signup required. Try every
              role and feature live.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#FF6B00",
                paddingHorizontal: 28,
                paddingVertical: 14,
                borderRadius: 14,
                flexDirection: "row",
                alignItems: "center",
                shadowColor: "#FF6B00",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 6,
              }}
              onPress={() => router.push("/demo" as any)}
            >
              <Sparkles size={16} color="white" />
              <Text
                style={{
                  color: "white",
                  fontWeight: "800",
                  marginLeft: 8,
                  fontSize: 15,
                }}
              >
                Try Interactive Demo
              </Text>
            </TouchableOpacity>
          </View>

          {/* ═══════════════════════ PRICING SECTION ═══════════════════════ */}
          <View
            ref={pricingRef}
            onLayout={(e) => handleLayout("pricing", e.nativeEvent.layout.y)}
            style={{
              paddingHorizontal: 16,
              paddingTop: 40,
              paddingBottom: 20,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 30,
                fontWeight: "900",
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              Flexible Plans
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                textAlign: "center",
                marginBottom: 36,
                maxWidth: 400,
              }}
            >
              Choose the right fit for your school's growth.
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: Platform.OS === "web" ? 20 : 0,
                width: "100%",
              }}
            >
              {/* FREE TRIAL card */}
              <PricingCard
                tier="trial"
                title="FREE TRIAL"
                price="0"
                period="30 days"
                features={[
                  "Up to 10 Students",
                  "Basic LMS Access",
                  "Limited Analytics",
                  "Community Forum",
                ]}
                ctaLabel="Start Free Trial"
                onPressCta={() => openRegistrationModal("Free Trial")}
              />

              {/* BASIC card */}
              <PricingCard
                tier="basic"
                title="BASIC"
                price="150.00"
                period="/yr"
                features={[
                  "Up to 50 Students",
                  "Core LMS Access",
                  "Standard Analytics",
                  "Community Support",
                ]}
                ctaLabel="Get Started"
                onPressCta={() => openRegistrationModal("Basic Plan")}
              />

              {/* PRO card — Most Popular */}
              <PricingCard
                tier="pro"
                title="PRO"
                price="350.00"
                period="/yr"
                isPopular={true}
                features={[
                  "Unlimited Students",
                  "Advanced Finance Hub",
                  "Custom Reports",
                  "Priority Support",
                  "No Distractions",
                ]}
                ctaLabel="Get Started"
                onPressCta={() => openRegistrationModal("Pro Plan")}
              />

              {/* PREMIUM card */}
              <PricingCard
                tier="premium"
                title="PREMIUM"
                price="550.00"
                period="/yr"
                features={[
                  "Multiple Campuses",
                  "White-label Branding",
                  "API Integration",
                  "Dedicated Manager",
                  "Prevent Online Tracking",
                ]}
                ctaLabel="Contact Sales"
                onPressCta={() => openRegistrationModal("Premium Plan")}
              />
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

          {/* Registration Modal Popup */}
          <Modal visible={modalVisible} animationType="fade" transparent={true}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)", paddingHorizontal: 16 }}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ width: "100%", maxWidth: 500 }}
              >
                <View style={{ backgroundColor: "#1E293B", borderRadius: 32, padding: 32, width: "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 }}>
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 24, marginBottom: 8 }}>
                    {selectedPlan === 'Free Trial' ? 'Get Started for Free' : `Sign Up for ${selectedPlan}`}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 24 }}>
                    Enter your details and our team will set up your workspace.
                  </Text>

                  {submitted ? (
                    <View style={{ alignItems: "center", paddingVertical: 24 }}>
                      <BadgeCheck size={48} color="#10B981" />
                      <Text style={{ color: "white", fontWeight: "bold", fontSize: 20, marginTop: 16, marginBottom: 8 }}>Thank you!</Text>
                      <Text style={{ color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: 24 }}>We'll be in touch soon with your login instructions.</Text>
                      <TouchableOpacity
                        style={{ backgroundColor: "rgba(255,255,255,0.1)", width: "100%", paddingVertical: 16, borderRadius: 16, alignItems: "center" }}
                        onPress={() => setModalVisible(false)}
                      >
                        <Text style={{ color: "white", fontWeight: "bold" }}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <TextInput
                        style={{ backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: "white", padding: 16, borderRadius: 16, marginBottom: 16, fontWeight: "500" }}
                        placeholder="Full Name"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={form.name}
                        onChangeText={v => setForm({ ...form, name: v })}
                        editable={!submitting}
                      />

                      <TextInput
                        style={{ backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: "white", padding: 16, borderRadius: 16, marginBottom: 16, fontWeight: "500" }}
                        placeholder="Your Email"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={form.email}
                        onChangeText={v => setForm({ ...form, email: v })}
                        editable={!submitting}
                      />

                      <TextInput
                        style={{ backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: "white", padding: 16, borderRadius: 16, marginBottom: 24, fontWeight: "500" }}
                        placeholder="Organization Name"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={form.message}
                        onChangeText={v => setForm({ ...form, message: v })}
                        editable={!submitting}
                      />

                      <View style={{ flexDirection: "row", gap: 12 }}>
                        <TouchableOpacity
                          onPress={() => setModalVisible(false)}
                          style={{ flex: 1, paddingVertical: 16, alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16 }}
                          disabled={submitting}
                        >
                          <Text style={{ color: "rgba(255,255,255,0.6)", fontWeight: "bold" }}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleSignup}
                          style={{ flex: 2, backgroundColor: "#3B82F6", paddingVertical: 16, borderRadius: 16, justifyContent: "center", alignItems: "center", flexDirection: "row" }}
                          disabled={submitting}
                        >
                          <Text style={{ color: "white", fontWeight: "bold", marginRight: 8 }}>
                            {submitting ? 'Submitting...' : 'Submit Request'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ════════════════════════════════════════════════════════════════════
   PRICING CARD COMPONENT — Tier-aware styling
   ════════════════════════════════════════════════════════════════════ */

interface PricingCardProps {
  tier: "trial" | "basic" | "pro" | "premium";
  title: string;
  price: string;
  period: string;
  features: string[];
  isPopular?: boolean;
  roleAccess?: string;
  ctaLabel: string;
  onPressCta: () => void;
}

const TIER_STYLES = {
  trial: {
    bg: "rgba(255,255,255,0.03)",
    border: "rgba(100,116,139,0.4)",
    borderStyle: "dashed" as const,
    accent: "#94A3B8",
    ctaBg: "#475569",
    ctaShadow: "#475569",
    badgeBg: "rgba(100,116,139,0.15)",
    badgeText: "#94A3B8",
    badgeLabel: "30 Days Free",
    checkColor: "#94A3B8",
    titleColor: "#94A3B8",
    headerBg: undefined as string | undefined,
  },
  basic: {
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.1)",
    borderStyle: "solid" as const,
    accent: "#9CA3AF",
    ctaBg: "#4B5563",
    ctaShadow: "#374151",
    badgeBg: undefined,
    badgeText: undefined,
    badgeLabel: undefined,
    checkColor: "#9CA3AF",
    titleColor: "#9CA3AF",
    headerBg: undefined,
  },
  pro: {
    bg: "rgba(34,197,94,0.04)",
    border: "#22C55E",
    borderStyle: "solid" as const,
    accent: "#22C55E",
    ctaBg: "#16A34A",
    ctaShadow: "#15803D",
    badgeBg: "#22C55E",
    badgeText: "#fff",
    badgeLabel: "⭐ Most Popular",
    checkColor: "#22C55E",
    titleColor: "#22C55E",
    headerBg: "#22C55E",
  },
  premium: {
    bg: "rgba(245,158,11,0.04)",
    border: "rgba(245,158,11,0.5)",
    borderStyle: "solid" as const,
    accent: "#F59E0B",
    ctaBg: "#D97706",
    ctaShadow: "#B45309",
    badgeBg: "rgba(245,158,11,0.15)",
    badgeText: "#F59E0B",
    badgeLabel: "Enterprise",
    checkColor: "#F59E0B",
    titleColor: "#F59E0B",
    headerBg: undefined,
  },
};

const PricingCard = ({
  tier, title, price, period, features, isPopular = false, roleAccess, ctaLabel, onPressCta
}: PricingCardProps) => {
  const s = TIER_STYLES[tier];
  const isPremium = tier === "premium";
  const isPro = tier === "pro";

  return (
    <View
      style={{
        width: Platform.OS === "web" ? 270 : "100%",
        minHeight: 420,
        borderRadius: 24,
        overflow: "hidden",
        marginBottom: 20,
        borderWidth: isPro ? 2 : 1.5,
        borderColor: s.border,
        borderStyle: s.borderStyle,
        backgroundColor: s.bg,
        shadowColor: isPro ? "#22C55E" : isPremium ? "#F59E0B" : "transparent",
        shadowOffset: { width: 0, height: isPro ? 12 : isPremium ? 8 : 0 },
        shadowOpacity: isPro ? 0.25 : isPremium ? 0.15 : 0,
        shadowRadius: isPro ? 30 : isPremium ? 24 : 0,
        elevation: isPro ? 12 : isPremium ? 8 : 0,
        transform: [{ scale: isPro ? 1.03 : 1 }],
        zIndex: isPro ? 10 : 1,
      }}
    >
      {/* Top banner for PRO */}
      {isPro && s.headerBg && (
        <View
          style={{
            backgroundColor: s.headerBg,
            paddingVertical: 8,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "white",
              fontWeight: "900",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            ⭐ Most Popular
          </Text>
        </View>
      )}

      {/* Premium gold header */}
      {isPremium && (
        <View
          style={{
            paddingVertical: 10,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            backgroundColor: "rgba(245,158,11,0.12)",
            borderBottomWidth: 1,
            borderBottomColor: "rgba(245,158,11,0.2)",
          }}
        >
          <Crown size={14} color="#F59E0B" />
          <Text
            style={{
              color: "#F59E0B",
              fontWeight: "900",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginLeft: 6,
            }}
          >
            Enterprise
          </Text>
          <Star size={14} color="#F59E0B" style={{ marginLeft: 6 }} />
        </View>
      )}

      {/* Trial badge */}
      {tier === "trial" && s.badgeLabel && (
        <View
          style={{
            paddingVertical: 8,
            alignItems: "center",
            backgroundColor: s.badgeBg,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(100,116,139,0.15)",
          }}
        >
          <Text
            style={{
              color: s.badgeText,
              fontWeight: "800",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            {s.badgeLabel}
          </Text>
        </View>
      )}

      <View style={{ padding: 24, alignItems: "center", flex: 1 }}>
        {/* Title */}
        <Text
          style={{
            color: s.titleColor,
            fontWeight: "800",
            fontSize: 15,
            letterSpacing: 2,
            marginBottom: 12,
          }}
        >
          {title}
        </Text>

        {/* Price */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            $
          </Text>
          <Text
            style={{
              fontSize: isPro ? 52 : 44,
              fontWeight: "900",
              color: isPro ? "#22C55E" : isPremium ? "#F59E0B" : "white",
            }}
          >
            {price}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: 13,
              marginLeft: 4,
            }}
          >
            {period}
          </Text>
        </View>

        {/* Features */}
        <View style={{ width: "100%", gap: 12, marginBottom: 20 }}>
          {features.map((feat, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: `${s.checkColor}18`,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Check size={13} color={s.checkColor} strokeWidth={3} />
              </View>
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 13,
                  marginLeft: 10,
                  fontWeight: "500",
                }}
              >
                {feat}
              </Text>
            </View>
          ))}
        </View>

        {/* Role access note (free trial only) */}
        {roleAccess && (
          <View
            style={{
              backgroundColor: "rgba(100,116,139,0.08)",
              borderRadius: 10,
              padding: 10,
              marginBottom: 16,
              width: "100%",
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 11,
                textAlign: "center",
                lineHeight: 16,
              }}
            >
              Roles: {roleAccess}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={{
            width: "100%",
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center",
            marginTop: "auto",
            backgroundColor: s.ctaBg,
            shadowColor: s.ctaShadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isPro ? 0.4 : 0.2,
            shadowRadius: 12,
            elevation: 4,
          }}
          onPress={onPressCta}
        >
          <Text
            style={{
              color: "white",
              fontWeight: "800",
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
