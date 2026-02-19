import React, { useState } from "react";
import { Text, View, TouchableOpacity, ActivityIndicator, Alert, ImageBackground, Dimensions, Modal, TextInput, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const { height, width } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.22; // Responsive height

type RoleType = 'student' | 'teacher' | 'parent' | 'admin';

interface RoleData {
  id: RoleType;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string; // Tailwind class
  borderColor: string; // Tailwind class
  shadowColor: string; // Tailwind class
  image: string;
  features: string[];
}

const ROLES: RoleData[] = [
  {
    id: 'student',
    title: "Student Module",
    subtitle: "Assignments, grades & library",
    icon: "school",
    color: "#f97316", // Orange-500
    bgColor: "bg-orange-500",
    borderColor: "border-orange-200",
    shadowColor: "shadow-orange-200",
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=800',
    features: ["View Assignments", "Check Grades", "Access Library", "Submit Work"]
  },
  {
    id: 'parent',
    title: "Parent Module",
    subtitle: "Monitor progress & attendance",
    icon: "people",
    color: "#3b82f6", // Blue-500
    bgColor: "bg-blue-500",
    borderColor: "border-blue-200",
    shadowColor: "shadow-blue-200",
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=800',
    features: ["Track Progress", "Attendance Reports", "Teacher Chat", "Fee Payments"]
  },
  {
    id: 'teacher',
    title: "Teacher Module",
    subtitle: "Class management & grading",
    icon: "easel",
    color: "#10b981", // Emerald-500
    bgColor: "bg-emerald-500",
    borderColor: "border-emerald-200",
    shadowColor: "shadow-emerald-200",
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800',
    features: ["Manage Classes", "Grade Students", "Lesson Planning", "Analytics"]
  },
  {
    id: 'admin',
    title: "Admin Module",
    subtitle: "System control & analytics",
    icon: "settings",
    color: "#6b7280", // Gray-500
    bgColor: "bg-gray-600",
    borderColor: "border-gray-200",
    shadowColor: "shadow-gray-200",
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
    features: ["User Management", "System Settings", "Financial Reports", "Audit Logs"]
  }
];

export default function Trial() {
  const [isLoading, setIsLoading] = useState(false);
  const { startTrial } = useAuth();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRoleData, setSelectedRoleData] = useState<RoleData | null>(null);

  const openTrialModal = (role: RoleData) => {
    setSelectedRoleData(role);
    setModalVisible(true);
  };

  const handleTrialLogin = async () => {
    if (!selectedRoleData) return;

    setIsLoading(true);
    setModalVisible(false);

    try {
      const { error } = await startTrial(selectedRoleData.id);

      if (error) {
        Alert.alert("Trial Access Failed", "Could not start the demo session. Please try again.");
        setIsLoading(false); // Reset if failed, otherwise duplicate UI effect
        return;
      }

      // Route based on role
      const routes: Record<RoleType, string> = {
        admin: '/(admin)',
        teacher: '/(teacher)',
        student: '/(student)',
        parent: '/(parent)'
      };

      router.replace(routes[selectedRoleData.id] as any);

    } catch (error: any) {
      console.error(error.message);
      Alert.alert("Error", "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  const renderCard = (role: RoleData) => (
    <TouchableOpacity
      key={role.id}
      onPress={() => openTrialModal(role)}
      activeOpacity={0.9}
      style={{ height: CARD_HEIGHT }}
      className={`rounded-2xl overflow-hidden shadow-sm mb-5 border ${role.borderColor} bg-white`}
    >
      <ImageBackground
        source={{ uri: role.image }}
        className="flex-1 justify-end"
        imageStyle={{ borderRadius: 16 }}
      >
        {/* Gradient Overlay for Text Readability */}
        <View className="absolute inset-0 bg-black/40" />
        <View className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <View className="p-5 flex-row items-end justify-between">
          <View className="flex-1 mr-4">
            <View className={`self-start px-2 py-1 rounded-md mb-2 bg-white/20 backdrop-blur-md`}>
              <Text className="text-white text-[10px] font-bold uppercase tracking-wider">Interactive Demo</Text>
            </View>
            <Text className="text-white font-extrabold text-2xl leading-tight shadow-md">{role.title}</Text>
            <Text className="text-gray-200 text-sm mt-1 font-medium leading-5">{role.subtitle}</Text>
          </View>

          <View className={`${role.bgColor} p-3 rounded-full shadow-lg border border-white/20`}>
            <Ionicons name={role.icon} size={24} color="white" />
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-2 pb-6">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-8 mt-2">
            <TouchableOpacity
              onPress={() => router.push('/')}
              className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm border border-gray-100"
            >
              <Ionicons name="arrow-back" size={20} color="#374151" />
            </TouchableOpacity>

            <View className="items-end">
              <Text className="text-orange-600 font-bold uppercase tracking-widest text-xs">Playground</Text>
              <Text className="text-gray-900 font-black text-xl">Select Persona</Text>
            </View>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View className="absolute inset-0 z-50 bg-white/50 items-center justify-center h-full">
              <View className="bg-white p-6 rounded-2xl shadow-xl items-center">
                <ActivityIndicator size="large" color="#f97316" />
                <Text className="text-gray-600 font-bold mt-4">Preparing Environment...</Text>
              </View>
            </View>
          )}

          {/* Cards Grid */}
          <View>
            {ROLES.map(renderCard)}
          </View>
        </View>
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} statusBarTranslucent>
        <View className="flex-1 justify-end sm:justify-center bg-black/60">
          <TouchableOpacity
            className="absolute inset-0"
            onPress={() => setModalVisible(false)}
          />

          <View className="bg-white w-full sm:w-[90%] sm:self-center sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl max-h-[85%]">
            {/* Header Accent */}
            {selectedRoleData && (
              <View className={`${selectedRoleData.bgColor} py-4 px-6 flex-row items-center justify-between`}>
                <View className="flex-row items-center">
                  <Ionicons name={selectedRoleData.icon} size={20} color="white" />
                  <Text className="text-white font-bold text-sm uppercase tracking-widest ml-2">
                    {selectedRoleData.id} Experience
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} className="bg-black/20 p-1 rounded-full">
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            )}

            <ScrollView className="p-6">
              <Text className="text-3xl font-black text-gray-900 mb-2">Personalize Trial</Text>
              <Text className="text-gray-500 mb-6 text-base">
                Instantly generate a custom {selectedRoleData?.id} dashboard tailored for you.
              </Text>

              {/* Feature List */}
              <View className="flex-row flex-wrap mb-8 gap-2">
                {selectedRoleData?.features.map((feature, index) => (
                  <View key={index} className="flex-row items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                    <Ionicons name="checkmark-circle" size={16} color={selectedRoleData.color} />
                    <Text className="text-gray-700 text-sm font-semibold ml-2">{feature}</Text>
                  </View>
                ))}
              </View>

              <View className="space-y-4">
                <Text className="text-gray-600 text-center mb-4">
                  Ready to explore? Click below to instantly access the demo environment.
                </Text>

                <TouchableOpacity
                  onPress={handleTrialLogin}
                  activeOpacity={0.8}
                  className={`${selectedRoleData?.bgColor || 'bg-gray-800'} py-5 rounded-xl items-center shadow-lg shadow-gray-200 mt-2`}
                >
                  <Text className="text-white font-bold text-lg">Launch Demo</Text>
                </TouchableOpacity>

                <Text className="text-center text-gray-400 text-xs mt-4 mb-2">
                  By starting, you agree to enter a public demo environment. Data is reset periodically.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}