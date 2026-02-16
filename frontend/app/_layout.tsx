import { Stack } from "expo-router";
import "../styles/global.css";
import React from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { InactivityWrapper } from "@/components/InactivityWrapper";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <InactivityWrapper>
            <Stack screenOptions={{
              headerShown: false,
            }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)/signIn" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="(student)" />
              <Stack.Screen name="(teacher)" />
              <Stack.Screen name="(parent)" />
            </Stack>
            <Toast />
          </InactivityWrapper>
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
