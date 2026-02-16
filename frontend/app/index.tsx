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
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 bg-gray-50 justify-between py-12">
        {/* Company Logo */}
        <View className="flex-row items-center justify-center my-8 py-8">
          <View className="bg-teacherOrange p-12 rounded-xl">
            <School size={100} color="white" />
          </View>
        </View>

        {/* Welcome Section */}
        <View className="items-center px-6">
          <Text className="text-gray-900 font-extrabold text-4xl text-center mb-4">
            Welcome to Our Learning Hub
          </Text>
          <Text className="text-gray-500 text-lg text-center leading-7 mb-2">
            Your gateway to knowledge and growth. Access Subjects, track
            progress, and connect with educators all in one place.
          </Text>
        </View>

        {/* Proceed Button */}
        <View className="items-center px-8 mb-8">
          <TouchableOpacity
            className="bg-orange-500 w-full py-4 rounded-xl flex-row items-center justify-center shadow-lg"
            onPress={() => router.replace("/(auth)/signIn")}
          >
            <Text className="text-white text-xl font-semibold mr-2">
              Get Started
            </Text>
            <ArrowRight size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-gray-400 text-sm mt-4 text-center">
            Sign in to access your personalized dashboard
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
