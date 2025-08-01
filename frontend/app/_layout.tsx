import { Stack } from "expo-router";
import "../styles/global.css";
import React from "react";
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="signUp" />
        <Stack.Screen name="sign" />
      </Stack>
    </AuthProvider>
  );
}
