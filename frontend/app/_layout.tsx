import { Stack } from "expo-router";
import "../styles/global.css";
import React from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Slot } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="/" />
          <Stack.Screen name="/auth/signUp" />
          <Stack.Screen name="/sign" />
          <Stack.Screen name="(student)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
