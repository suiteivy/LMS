import { Stack } from "expo-router";
import "../styles/global.css";
import React from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import Toast from "react-native-toast-message";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{
        headerShown: false,
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/signIn" />
        <Stack.Screen name="(auth)/signUp" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(teacher)" />
      </Stack>
      <Toast />
    </AuthProvider>
  );
}
