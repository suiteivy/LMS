import { Stack } from "expo-router";
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

  // Handle user interaction for inactivity timer
  const handleInteraction = React.useCallback(() => {
    if (session) {
      resetSessionTimer();
    }
    return false;
  }, [resetSessionTimer, session]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/signIn" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(parent)" />
      </Stack>
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
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      )}
    </>
  );
}
