import { Text, View, TouchableOpacity, StatusBar, ActivityIndicator } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { School, ArrowRight } from "lucide-react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function Index() {
  const { session, loading, profile } = useAuth();
  
  useEffect(() => {
    if (!loading) {
      console.log('Index: Auth state resolved. Session:', !!session, 'Profile role:', profile?.role);
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

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#F1FFF8]">
        <ActivityIndicator size="large" color="#1ABC9C" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 bg-[#F1FFF8] justify-between py-12">
        {/* Company Logo */}
        <View className="flex-row items-center justify-center my-8 py-8">
          <View className="bg-primaryColor p-12 rounded-xl">
            <School size={100} color="white" />
          </View>
        </View>

        {/* Welcome Section */}
        <View className="items-center px-6">
          <Text className="text-[#2C3E50] font-extrabold text-4xl text-center mb-4">
            Welcome to Our Learning Hub
          </Text>
          <Text className="text-[#5D6D7E] text-lg text-center leading-7 mb-2">
            Your gateway to knowledge and growth. Access courses, track
            progress, and connect with educators all in one place.
          </Text>
        </View>

        {/* Proceed Button */}
        <View className="items-center px-8 mb-8">
          <TouchableOpacity
            className="bg-[#1ABC9C] w-full py-4 rounded-xl flex-row items-center justify-center shadow-lg"
            onPress={() => router.push("/(auth)/signIn")}
          >
            <Text className="text-white text-xl font-semibold mr-2">
              Get Started
            </Text>
            <ArrowRight size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-[#7F8C8D] text-sm mt-4 text-center">
            Sign in to access your personalized dashboard
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
