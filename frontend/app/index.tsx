import { Text, View, TouchableOpacity, StatusBar, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView, Platform, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { School, ArrowRight, BookOpen, Library, CreditCard, BarChart2, Users, Settings, BadgeCheck, ChevronDown, Check } from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import React, { useEffect, useState, useRef } from "react";

export default function Index() {
  const { session, loading, profile } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Animation Refs
  const scrollAnimation = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [inHero, setInHero] = useState(true);

  // Lottie-style Loop

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
    ])
  );
  anim.start();
  return () => anim.stop();
}, []);

// Replace arrowContainerOpacity with inHero state
const handleScroll = Animated.event(
  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
  {
    useNativeDriver: false,
    listener: (e: any) => {
      setInHero(e.nativeEvent.contentOffset.y < 80);
    },
  },
);

  // Fade out arrows as user scrolls down
  const arrowContainerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    if (!loading && session && profile) {
      if (profile.role === 'admin') router.replace("/(admin)");
      else if (profile.role === 'teacher') router.replace("/(teacher)");
      else if (profile.role === 'student') router.replace("/(student)");
    }
  }, [loading, session, profile]);

  const handleInput = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSignup = async () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1200);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-orange-50">
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={{ flex: 1, padding: 16 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          className="lg:w-[80dvw] m-auto"
        >
          {/* Hero Section */}
          <View className="flex justify-center items-center mt-8 mb-20 h-[90vh] relative">
            <View className="bg-orange-500 p-10 rounded-2xl shadow-sm">
              <School size={50} color="white" />
            </View>
            <Text className="text-orange-600 font-extrabold text-3xl text-center mt-20 mb-2">
              All-in-one learning, teaching, and management hub
            </Text>
            <Text className="text-gray-700 text-sm w-[70dvw] text-center my-2">
              Empower your institution with a modern, cloud-based LMS. Our
              platform brings together courses, digital resources, payments,
              analytics, and user management in one seamless experience.
            </Text>
            <View className="flex-row mt-4">
              <TouchableOpacity
                className="bg-orange-500 px-6 py-3 rounded-xl flex-row items-center justify-center shadow-md mr-4"
                onPress={() => {
                  formRef.current?.measure?.(
                    (x, y, width, height, pageX, pageY) => {
                      scrollRef.current?.scrollTo({
                        y: pageY - 80,
                        animated: true,
                      });
                    },
                  );
                }}
              >
                <Text className="text-white font-bold">Get Started</Text>
              </TouchableOpacity>
            </View>

            {/* Perfected Staggered Arrows */}
            <Animated.View
              style={{
                position: "absolute",
                bottom: 40,
                left: 0,
                right: 0,
                alignItems: "center",
                zIndex: 40,
              }}
            >
              <View style={{ height: 70, width: 40, alignItems: "center" }}>
                {[0, 1, 2].map((index) => {
                  const offset = index * 0.2

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
                      <ChevronDown size={26} color="#FF6900" strokeWidth={3} />
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>
          </View>

          {/* Feature Sections */}
          <View
            className="mb-6 flex-row flex-wrap justify-center"
            style={{ gap: 24 }}
          >
            {[
              {
                icon: <BookOpen size={20} color="#FF6B00" />,
                title: "Courses",
                desc: "Browse, enroll, and manage courses with ease.",
              },
              {
                icon: <Library size={20} color="#FF6B00" />,
                title: "Library",
                desc: "Access digital books and resources anytime.",
              },
              {
                icon: <CreditCard size={20} color="#FF6B00" />,
                title: "Payments",
                desc: "Track fees and manage payments simply.",
              },
              {
                icon: <BarChart2 size={20} color="#FF6B00" />,
                title: "Analytics",
                desc: "Get actionable insights and reports.",
              },
              {
                icon: <Users size={20} color="#FF6B00" />,
                title: "Users",
                desc: "Manage students, teachers, and admins.",
              },
              {
                icon: <Settings size={20} color="#FF6B00" />,
                title: "Settings",
                desc: "Customize your experience to your needs.",
              },
            ].map(({ icon, title, desc }) => (
              <View
                key={title}
                style={{
                  maxWidth: 320,
                  minWidth: "48%",
                  flexBasis: "48%",
                  flexGrow: 1,
                  borderWidth: 2,
                  borderColor: "#FF6B00",
                  backgroundColor: "#FFF7ED",
                }}
                className="rounded-2xl shadow-md p-6 mb-4 items-center w-full lg:w-[30%]"
              >
                <View className="flex-row items-center w-full justify-start mb-3">
                  <View
                    style={{
                      borderWidth: 2,
                      borderColor: "#FF8000",
                      backgroundColor: "#FFE3C0",
                      borderRadius: 999,
                      padding: 12,
                      marginRight: 12,
                    }}
                  >
                    {icon}
                  </View>
                  <Text className="text-orange-700 font-bold text-xl ml-4">
                    {title}
                  </Text>
                </View>
                <Text className="text-gray-500 text-base">{desc}</Text>
              </View>
            ))}
          </View>

          {/* Free Tier */}
          <View className="bg-orange-100 rounded-2xl p-6 my-20 items-center border border-orange-200">
            <BadgeCheck size={32} color="#FF6B00" />
            <Text className="text-orange-700 font-bold text-lg mt-2 mb-1">
              Free Trial
            </Text>
            <Text className="text-orange-700 text-base text-center">
              Get started with all core modules at no cost.
            </Text>
            <TouchableOpacity 
              className="bg-orange-500 px-6 py-3 rounded-xl flex-row items-center justify-center shadow-md mr-4"
              onPress={() => router.push("/(auth)/Trial")}
            >
              <Text className="text-white font-bold">Free Trial Demo</Text>
            </TouchableOpacity>
          </View>

          {/* Signup Form */}
          <View ref={formRef} className="my-10 w-full items-center">
            <Text className="text-gray-900 font-black text-3xl mb-2">
              Flexible Plans
            </Text>
            <Text className="text-gray-500 mb-10 text-center px-4">
              Choose the right fit for your school's growth.
            </Text>

            <View
              className="flex-row flex-wrap justify-center w-full"
              style={{ gap: Platform.OS === "web" ? 24 : 0 }}
            >
              <PricingBrick
                title="BASIC"
                price="6.95"
                features={[
                  "Up to 50 Students",
                  "Core LMS Access",
                  "Standard Analytics",
                  "Community Support",
                ]}
              />
              <PricingBrick
                title="PRO"
                price="19.95"
                isPopular={true}
                features={[
                  "Unlimited Students",
                  "Advanced Finance Hub",
                  "Custom Reports",
                  "Priority Support",
                  "No Distractions",
                ]}
              />
              <PricingBrick
                title="PREMIUM"
                price="69.95"
                features={[
                  "Multiple Campuses",
                  "White-label Branding",
                  "API Integration",
                  "Dedicated Manager",
                  "Prevent Online Tracking",
                ]}
              />
            </View>
          </View>

          {/* Footer */}
          <View className="items-center px-8 mb-8 mt-2">
            <Text className="text-gray-400 text-sm text-center">
              Already have an account?
            </Text>
            <TouchableOpacity
              className="mt-2"
              onPress={() => router.push("/(auth)/signIn")}
            >
              <Text className="text-orange-600 font-semibold text-base">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PricingBrick = ({ title, price, features, isPopular = false }: any) => (
  <View 
    className={`bg-white rounded-2xl shadow-lg mb-8 overflow-hidden border ${isPopular ? 'border-green-500 scale-105 z-10' : 'border-gray-100'}`}
    style={{ width: Platform.OS === 'web' ? 280 : '100%', minHeight: 400 }}
  >
    {isPopular && (
      <View className="bg-green-500 py-2 items-center">
        <Text className="text-white font-bold text-xs uppercase tracking-widest">Popular</Text>
      </View>
    )}
    <View className="p-6 items-center flex-1">
      <Text className="text-gray-400 font-bold text-lg mb-2">{title}</Text>
      <View className="flex-row items-baseline mb-6">
        <Text className="text-2xl font-bold text-gray-800">$</Text>
        <Text className="text-5xl font-black text-gray-800">{price}</Text>
        <Text className="text-gray-400 text-xs ml-1">/yr</Text>
      </View>
      
      <View className="w-full gap-y-3 mb-8">
        {features.map((feat: string, i: number) => (
          <View key={i} className="flex-row items-center">
            <Check size={16} color={isPopular ? "#22C55E" : "#FF6B00"} />
            <Text className="text-gray-600 text-sm ml-2">{feat}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity 
        className={`w-full py-4 rounded-xl items-center mt-auto ${isPopular ? 'bg-green-500' : 'bg-orange-500'}`}
        onPress={() => router.push('/(auth)/Trial')}
      >
        <Text className="text-white font-bold uppercase">Get Started</Text>
      </TouchableOpacity>
    </View>
  </View>
);