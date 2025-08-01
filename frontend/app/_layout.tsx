import { Stack } from "expo-router";
import "../styles/global.css"
import React from "react";


export default function RootLayout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)/student" />
      <Stack.Screen name="(auth)/sign" />
      <Stack.Screen name="(student)" />
    </Stack>
  );
}