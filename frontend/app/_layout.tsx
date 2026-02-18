import "../styles/global.css";
import { Stack } from "expo-router";
import { Stack, useRouter, useSegments } from "expo-router";
import "../styles/global.css";
import React from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator } from "react-native";
import { toastConfig } from "@/components/CustomToast";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <AuthHandler />
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AuthHandler() {
  const { loading, resetSessionTimer, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments.some(s => s === "(auth)");
    const isRoot = segments.length <= 1; // Simplify root check

    if (!session && !inAuthGroup && !isRoot) {
      // User is not signed in and trying to access a protected route
      router.replace("/(auth)/signIn");
    } else if (session && inAuthGroup) {
      // User is signed in and trying to access auth pages
      router.replace("/");
    }
  }, [session, loading, segments, router]); // Added router to deps

  // Handle user interaction for inactivity timer
  const handleInteraction = React.useCallback(() => {
    if (session) {
      resetSessionTimer();
    }
    return false;
  }, [resetSessionTimer, session]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#ff6900" />
      </View>
    );
  }

  return (
    <>
      <View className="flex-1" onStartShouldSetResponder={handleInteraction}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/signIn" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="(teacher)" />
          <Stack.Screen name="(parent)" />
          <Stack.Screen name="(auth)/forgot-password" />
        </Stack>
      </View>
      <Toast config={toastConfig} />
    </>
  );
}