import "../styles/global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import React from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator } from "react-native";
import { toastConfig } from "@/components/CustomToast";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CurrencyProvider>
          <NotificationProvider>
            <AuthHandler />
          </NotificationProvider>
        </CurrencyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AuthHandler() {
  const { loading, isInitializing, resetSessionTimer, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    // Only redirect if we are CERTAIN initialization is done
    if (isInitializing) return;

    const inAuthGroup = segments.some(s => s === "(auth)");
    const isRoot = segments.length <= 1;

    if (!session && !inAuthGroup && !isRoot) {
      // User is not signed in and trying to access a protected route
      console.log("[AuthHandler] Redirecting to sign-in (No session)");
      router.replace("/(auth)/signIn");
    } else if (session && inAuthGroup) {
      // User is signed in and trying to access auth pages
      console.log("[AuthHandler] Redirecting to home (Session active)");
      router.replace("/");
    }
  }, [session, isInitializing, segments]);

  // Handle user interaction for inactivity timer
  const handleInteraction = React.useCallback(() => {
    if (session) {
      resetSessionTimer();
    }
    return false;
  }, [resetSessionTimer, session]);

  if (isInitializing) {
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

      {loading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#ffffff',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <ActivityIndicator size="large" color="#ff6900" />
        </View>
      )}
    </>
  );
}