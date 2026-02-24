import { Text, View, TouchableOpacity, StatusBar, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { School, ArrowRight, BookOpen, Library, CreditCard, BarChart2, Users, Settings, BadgeCheck } from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useRef } from "react";

// Cast icons to any to avoid nativewind interop issues
const IconSchool = School as any;
const IconArrowRight = ArrowRight as any;
const IconBookOpen = BookOpen as any;
const IconLibrary = Library as any;
const IconCreditCard = CreditCard as any;
const IconBarChart2 = BarChart2 as any;
const IconUsers = Users as any;
const IconSettings = Settings as any;
const IconBadgeCheck = BadgeCheck as any;


export default function Index() {
  // All hooks must be at the top, before any conditional returns
  const { session, loading, profile } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
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
              <IconSchool size={50} color="white" />
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
                  setSelectedPlan("Free Trial");
                  setModalVisible(true);
                  setSubmitted(false);
                  setForm({ name: '', email: '', message: '' });
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
                icon: <IconBookOpen size={20} color="#FF6B00" />,
                title: "Courses",
                desc: "Browse, enroll, and manage courses with ease. Flexible for any curriculum.",
              },
              {
                icon: <IconLibrary size={20} color="#FF6B00" />,
                title: "Library",
                desc: "Access digital books and resources anytime, anywhere—no more lost materials.",
              },
              {
                icon: <IconCreditCard size={20} color="#FF6B00" />,
                title: "Payments",
                desc: "Track fees, manage payments, and simplify bursary operations for everyone.",
              },
              {
                icon: <IconBarChart2 size={20} color="#FF6B00" />,
                title: "Analytics",
                desc: "Get actionable insights and reports to drive better decisions and outcomes.",
              },
              {
                icon: <IconUsers size={20} color="#FF6B00" />,
                title: "Users",
                desc: "Manage students, teachers, and admins with powerful role-based controls.",
              },
              {
                icon: <IconSettings size={20} color="#FF6B00" />,
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

          {/* Pricing Plans Section */}
          <View className="mb-10 w-full mt-8">
            <Text className="text-center font-bold text-3xl text-gray-900 mb-8">Choose Your Plan</Text>
            <View className="flex-row flex-wrap justify-center" style={{ gap: 24 }}>
              {[
                { name: "Free Trial", price: "Free", desc: "For exploring the platform", features: ["1 Admin", "Up to 50 Students", "30 Days Access"] },
                { name: "Essential", price: "$49/mo", desc: "For small institutions", features: ["Unlimited Teachers", "Up to 500 Students", "Core Modules"] },
                { name: "Premium", price: "$199/mo", desc: "For large organizations", features: ["Unlimited Everything", "Custom Branding", "Priority Support"] }
              ].map((plan) => (
                <View key={plan.name} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm w-full sm:w-[30%] min-w-[280px]">
                  <Text className="text-orange-600 font-bold text-xl mb-1">{plan.name}</Text>
                  <Text className="text-gray-900 font-black text-3xl mb-2">{plan.price}</Text>
                  <Text className="text-gray-500 text-sm mb-6 pb-6 border-b border-gray-100">{plan.desc}</Text>

                  <View className="mb-8 gap-3">
                    {plan.features.map((feat, i) => (
                      <View key={i} className="flex-row items-center">
                        <IconBadgeCheck size={16} color="#FF6B00" />
                        <Text className="text-gray-700 ml-2">{feat}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    className={`w-full py-4 rounded-xl flex-row items-center justify-center ${plan.name === 'Essential' ? 'bg-orange-500' : 'bg-orange-100'}`}
                    onPress={() => {
                      setSelectedPlan(plan.name);
                      setModalVisible(true);
                      setSubmitted(false);
                      setForm({ name: '', email: '', message: '' });
                    }}
                  >
                    <Text className={`font-bold ${plan.name === 'Essential' ? 'text-white' : 'text-orange-600'}`}>
                      Select Plan
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          {/* Registration Modal Popup */}
          <Modal visible={modalVisible} animationType="fade" transparent={true}>
            <View className="flex-1 justify-center items-center bg-black/60 px-4">
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ width: "100%", maxWidth: 500 }}
              >
                <View className="bg-white rounded-[32px] shadow-2xl p-8 w-full">
                  <Text className="text-orange-600 font-black text-2xl mb-2">
                    {selectedPlan === 'Free Trial' ? 'Get Started for Free' : `Sign Up for ${selectedPlan}`}
                  </Text>
                  <Text className="text-gray-500 text-sm mb-6">Enter your details and our team will set up your workspace.</Text>

                  {submitted ? (
                    <View className="items-center py-6">
                      <IconBadgeCheck size={48} color="#10B981" />
                      <Text className="text-gray-900 font-bold text-xl mt-4 mb-2">Thank you!</Text>
                      <Text className="text-gray-500 text-center mb-6">We'll be in touch soon with your login instructions.</Text>
                      <TouchableOpacity
                        className="bg-gray-100 w-full py-4 rounded-xl items-center"
                        onPress={() => setModalVisible(false)}
                      >
                        <Text className="text-gray-600 font-bold">Close</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <TextInput
                        className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-4 font-medium text-gray-800"
                        placeholder="Full Name"
                        value={form.name}
                        onChangeText={v => handleInput('name', v)}
                        editable={!submitting}
                      />

                      <TextInput
                        className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-4 font-medium text-gray-800"
                        placeholder="Your Email"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={form.email}
                        onChangeText={v => handleInput('email', v)}
                        editable={!submitting}
                      />

                      <TextInput
                        className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-6 font-medium text-gray-800"
                        placeholder="Organization Name"
                        value={form.message}
                        onChangeText={v => handleInput('message', v)}
                        editable={!submitting}
                      />

                      <View className="flex-row gap-3">
                        <TouchableOpacity
                          onPress={() => setModalVisible(false)}
                          className="flex-1 py-4 items-center bg-gray-100 rounded-xl"
                          disabled={submitting}
                        >
                          <Text className="text-gray-500 font-bold">Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleSignup}
                          className="flex-[2] bg-orange-500 py-4 rounded-xl justify-center items-center flex-row"
                          disabled={submitting}
                        >
                          <Text className="text-white font-bold mr-2">
                            {submitting ? 'Submitting...' : 'Submit Request'}
                          </Text>
                          {!submitting && <IconArrowRight size={20} color="white" />}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>

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
