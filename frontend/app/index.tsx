import { authService, supabase } from '@/libs/supabase'
import { Database } from '@/types/database'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Session, User } from '@supabase/supabase-js'
import { router, usePathname } from 'expo-router'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
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
import {
  ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StatusBar, Text, TouchableOpacity, View, Modal, TextInput
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

  useEffect(() => {
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

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20 }}>
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

          {/* ═══════════════════════ PRICING SECTION ═══════════════════════ */}
          <View
            ref={pricingRef}
            onLayout={(e) => handleLayout("pricing", e.nativeEvent.layout.y)}
            style={{ paddingHorizontal: 20, paddingVertical: 60, backgroundColor: "#0F0B2E" }}
          >
            <Text style={{ color: "white", fontSize: 28, fontWeight: "900", textAlign: "center", marginBottom: 32 }}>
              Choose Your Plan
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 24 }}>
              {[
                { name: "Free Trial", price: "Free", desc: "For exploring the platform", features: ["1 Admin", "Up to 50 Students", "30 Days Access"] },
                { name: "Essential", price: "$49/mo", desc: "For small institutions", features: ["Unlimited Teachers", "Up to 500 Students", "Core Modules"] },
                { name: "Premium", price: "$199/mo", desc: "For large organizations", features: ["Unlimited Everything", "Custom Branding", "Priority Support"] }
              ].map((plan) => (
                <View key={plan.name} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: SCREEN_WIDTH > 800 ? '30%' : '100%', minWidth: 280 }}>
                  <Text style={{ color: "#FF8C40", fontWeight: "800", fontSize: 20, marginBottom: 8 }}>{plan.name}</Text>
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 32, marginBottom: 4 }}>{plan.price}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)" }}>{plan.desc}</Text>
                  <View style={{ gap: 12, marginBottom: 32 }}>
                    {plan.features.map((feat, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <BadgeCheck size={18} color="#FF8C40" />
                        <Text style={{ color: "rgba(255,255,255,0.8)", marginLeft: 10, fontSize: 13 }}>{feat}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={{
                      width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center',
                      backgroundColor: plan.name === 'Essential' ? '#FF6B00' : 'rgba(255,255,255,0.1)'
                    }}
                    onPress={() => openRegistrationModal(plan.name)}
                  >
                    <Text style={{ color: "white", fontWeight: "700" }}>Get Started</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Registration Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View style={{ backgroundColor: "#13103A", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, minHeight: 450 }}>
            <View style={{ width: 40, height: 4, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2, alignSelf: "center", marginBottom: 24 }} />

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
      </Modal>
    </SafeAreaView>
  );
}
