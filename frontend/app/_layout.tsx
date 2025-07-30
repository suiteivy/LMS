import { Stack } from "expo-router";
import "../styles/global.css"
import React from "react";


export default function RootLayout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
    }}>
      <Stack.Screen name="/" />
      <Stack.Screen name="/auth/signUp" />
      <Stack.Screen name="/sign" />
    </Stack>
  );
}