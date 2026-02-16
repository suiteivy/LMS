import { Text, View, TouchableOpacity, StatusBar, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { School, ArrowRight, BookOpen, Library, CreditCard, BarChart2, Users, Settings, BadgeCheck } from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";


export default function Index() {
  // All hooks must be at the top, before any conditional returns
  const { session, loading, profile } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!loading) {
      if (session && profile) {
        if (profile.role === 'admin') {
          router.replace("/(admin)");
        } else if (profile.role === 'teacher') {
          router.replace("/(teacher)");
        } else if (profile.role === 'student') {
          router.replace("/(student)");
        }
      }
    }
  }, [loading, session, profile]);

  const handleInput = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSignup = async () => {
    setSubmitting(true);
    // Simulate API call
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }} >
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, padding: 16 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          className="lg:w-[80dvw] m-auto"
        >
          {/* Logo & Tagline */}
          <View className=" flex justify-center align-middle items-center mt-8 mb-20 h-[90dvh] ">
            <View className="bg-orange-500 p-10 rounded-2xl shadow-sm">
              <School size={50} color="white" />
            </View>
            <Text className="text-orange-600 font-extrabold text-3xl text-center mt-20 mb-2">
               All-in-one learning, teaching, and management hub
            </Text>
            <Text className="text-gray-700 text-sm w-[70dvw] text-center  my-2">
                      Empower your institution with a modern, cloud-based LMS. Our platform brings together courses, digital resources, payments, analytics, and user management in one seamless experience—designed for schools, colleges, and training centers of all sizes.
            </Text>
            <View className="flex-row mt-4">
                <TouchableOpacity
                className="bg-orange-500 px-6 py-3 rounded-xl flex-row items-center justify-center shadow-md mr-4"
                onPress={() => {
                  if (formRef.current && scrollRef.current) {
                    // Native: measureLayout, Web: measure (relative to window)
                    // This works for both platforms
                    formRef.current.measure?.((x, y, width, height, pageX, pageY) => {
                      // ScrollView's scrollTo expects y relative to content
                      scrollRef.current?.scrollTo({ y: pageY - 80, animated: true });
                    });
                  }
                }}
                >
                <Text className="text-white font-bold">Get Started</Text>
                </TouchableOpacity>
            </View>
          </View>

          {/* Feature Sections - Responsive */}
          <View
            className="mb-6 flex-row flex-wrap justify-center"
            style={{ gap: 24 }}
          >
            {[
              {
                icon: <BookOpen size={20} color="#FF6B00" />,
                title: "Courses",
                desc: "Browse, enroll, and manage courses with ease. Flexible for any curriculum.",
              },
              {
                icon: <Library size={20} color="#FF6B00" />,
                title: "Library",
                desc: "Access digital books and resources anytime, anywhere—no more lost materials.",
              },
              {
                icon: <CreditCard size={20} color="#FF6B00" />,
                title: "Payments",
                desc: "Track fees, manage payments, and simplify bursary operations for everyone.",
              },
              {
                icon: <BarChart2 size={20} color="#FF6B00" />,
                title: "Analytics",
                desc: "Get actionable insights and reports to drive better decisions and outcomes.",
              },
              {
                icon: <Users size={20} color="#FF6B00" />,
                title: "Users",
                desc: "Manage students, teachers, and admins with powerful role-based controls.",
              },
              {
                icon: <Settings size={20} color="#FF6B00" />,
                title: "Settings",
                desc: "Customize your experience and adapt the platform to your needs.",
              },
            ].map(({ icon, title, desc }) => (
              <View
                key={title}
                style={{
                  maxWidth: 320,
                  minWidth: '48%',
                  flexBasis: '48%',
                  flexGrow: 1,
                  borderWidth: 2,
                  borderColor: "#FF6B00",
                  backgroundColor: "#FFF7ED",
                }}
                className="rounded-2xl shadow-md p-6 mb-4 items-center w-full lg:w-[30%]"
              >
                <View className="flex-row items-center w-full justify-estart mb-3">
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
                  <Text className="text-orange-700 font-bold text-xl ml-8">{title}</Text>
                </View>
                <Text className="text-gray-500 text-base ">{desc}</Text>
              </View>
            ))}
          </View>

          {/* Free Tier Section */}
          <View className="bg-orange-100 rounded-2xl p-6 my-20 items-center border border-orange-200">
            <BadgeCheck size={32} color="#FF6B00" />
            <Text className="text-orange-700 font-bold text-lg mt-2 mb-1">Free Trial</Text>
            <Text className="text-orange-700 text-base text-center">Get started with all core modules at no cost. Upgrade anytime for more features!</Text>
          </View>

          {/* Signup Form Section */}
            <View ref={formRef} className="my-10 w-full items-center">
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              keyboardVerticalOffset={100}
              style={{ width: "100%" }}
            >
              <View className="bg-white rounded-2xl shadow-md p-6 w-full items-center">
              <Text className="text-orange-600 font-bold text-2xl mb-2">Sign Up for Free Trial</Text>
              <Text className="text-gray-500 text-sm text-center mb-8">Be among the first to experience the future of learning management.</Text>
              {submitted ? (
                <Text className="text-green-600 font-semibold text-center">Thank you! We'll be in touch soon.</Text>
              ) : (
                <>
                <View className="w-full mb-3 gap-2">
                  <Text className="text-gray-700 font-medium mb-1 ml-1">Full Name</Text>
                  <TextInput
                  className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-base"
                  placeholder="Full Name"
                  value={form.name}
                  onChangeText={v => handleInput('name', v)}
                  editable={!submitting}
                  autoCapitalize="words"
                  returnKeyType="next"
                  />
                </View>
                <View className="w-full mb-3 gap-2">
                  <Text className="text-gray-700 font-medium mb-1 ml-1">Email Address</Text>
                  <TextInput
                  className="w-full bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-base"
                  placeholder="Email Address"
                  value={form.email}
                  onChangeText={v => handleInput('email', v)}
                  editable={!submitting}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  />
                </View>
                <View className="w-full mb-4 gap-2">
                  <Text className="text-gray-700 font-medium mb-1 ml-1">Message</Text>
                  <TextInput
                  className="w-full h-24 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-base"
                  placeholder="Tell us about your institution or any questions"
                  value={form.message || ''}
                  onChangeText={v => handleInput('message', v)}
                  editable={!submitting}
                  multiline
                  numberOfLines={3}
                  returnKeyType="done"
                  />
                </View>
                <TouchableOpacity
                  className="bg-orange-500 w-full py-4 rounded-xl flex-row items-center justify-center shadow-md"
                  onPress={handleSignup}
                  disabled={submitting}
                >
                  <Text className="text-white text-lg font-semibold mr-2">
                  {submitting ? 'Submitting...' : 'Get Free Trial'}
                  </Text>
                  <ArrowRight size={24} color="white" />
                </TouchableOpacity>
                </>
              )}
              </View>
            </KeyboardAvoidingView>
            </View>

          {/* Footer CTA */}
          <View className="items-center px-8 mb-8 mt-2">
            <Text className="text-gray-400 text-sm text-center">
              Already have an account?
            </Text>
            <TouchableOpacity
              className="mt-2"
              onPress={() => router.push("/(auth)/signIn")}
            >
              <Text className="text-orange-600 font-semibold text-base">Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
