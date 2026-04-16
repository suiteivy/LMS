import { AppLoading } from "@/components/AppLoading";
import { toastConfig } from "@/components/CustomToast";
import Notifications from "@/components/Notifications";
import DemoBanner from "@/components/DemoBanner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { NotificationProvider, useNotifications } from "@/contexts/NotificationContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { logger } from "@/services/LoggingService";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { LogBox, Platform, View } from "react-native";
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import "../styles/global.css";

declare const global: typeof globalThis & {
  ErrorUtils?: {
    getGlobalHandler: () => (error: Error, isFatal: boolean) => void;
    setGlobalHandler: (handler: (error: Error, isFatal: boolean) => void) => void;
  };
};

if (global.ErrorUtils) {
  const _originalHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
    if (isFatal) {
      logger.fatal(`Fatal Error: ${error?.message}`, error?.stack);
    } else {
      logger.error(`Non-Fatal Error: ${error?.message}`, error?.stack);
    }
    if (!isFatal && error?.message?.includes("Couldn't find a navigation context")) {
      return;
    }
    _originalHandler(error, isFatal);
  });
}

const _origConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const first = args[0];
  const msg = first instanceof Error ? first.message : String(first ?? '');
  if (msg.includes("Couldn't find a navigation context")) return;
  _origConsoleError(...args);
};

LogBox.ignoreLogs(["Couldn't find a navigation context"]);

// SuiteIvy Dark color palette (matches landing page)
// Background:  #0F0B2E  (deep navy)
// Surface:     #13103A  (slightly lighter navy)
// Cards:       #1A1650  (muted navy)
// Borders:     rgba(255,255,255,0.1)  (translucent white)

// â”€â”€â”€ Root â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <CurrencyProvider>
              <NotificationProvider>
                <AppShell />
                <Toast config={toastConfig} />
              </NotificationProvider>
            </CurrencyProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// â”€â”€â”€ AppShell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AppShell() {
  const { isDark, theme } = useTheme();

  React.useEffect(() => {
    logger.info(`Theme changed. Mode: ${theme}, isDark: ${isDark}`);
  }, [theme, isDark]);

  return (
    <>
      {Platform.OS === 'android' ? (
        <StatusBar
          style={isDark ? "light" : "dark"}
          backgroundColor={isDark ? '#0F0B2E' : '#ffffff'}
          translucent={false}
        />
      ) : (
        <StatusBar style={isDark ? "light" : "dark"} />
      )}
      <DemoBanner />
      <AuthHandler />
    </>
  );
}

// â”€â”€â”€ GlobalNotifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function GlobalNotifications() {
  const { showNotifications, setShowNotifications } = useNotifications();
  return (
    <Notifications
      visible={showNotifications}
      onClose={() => setShowNotifications(false)}
    />
  );
}

// â”€â”€â”€ AuthHandler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AuthHandler() {
  const { loading, isInitializing, isNavReady, resetSessionTimer, session, profile, isPlatformAdmin, getRoleRedirect, signOut } = useAuth();
  const { isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (isInitializing || !isNavReady) return;

    const currentPath = `/${segments.join('/')}`;
    const inAuthGroup = segments.some(s => s === "(auth)");
    const isRoot = currentPath === '/' || currentPath === '/index' || currentPath === '';

    console.log(`[AuthHandler] State - Session: ${!!session}, Root: ${isRoot}, AuthGroup: ${inAuthGroup}, Path: ${currentPath}`);

    if (!session) {
      if (!inAuthGroup && !isRoot) {
        console.log('[AuthHandler] No session, redirecting to signIn');
        router.replace("/(auth)/signIn");
      }
    } else if (profile) {
      // If at root or in auth group, redirect to role-specific dashboard
      if (isRoot || inAuthGroup) {
        const redirectPath = getRoleRedirect(profile, isPlatformAdmin);
        if (redirectPath && currentPath !== redirectPath) {
          console.log(`[AuthHandler] Redirecting to ${redirectPath}`);
          router.replace(redirectPath as any);
        }
      }
    }
  }, [session, profile, isInitializing, isNavReady, segments, isPlatformAdmin]);

  const handleInteraction = React.useCallback(() => {
    if (session) resetSessionTimer();
    return false;
  }, [resetSessionTimer, session]);

  const isLoadingOverlayVisible = isInitializing || loading

  return (
    <View
      style={{ flex: 1, backgroundColor: isDark ? '#0F0B2E' : '#ffffff' }}
      onStartShouldSetResponder={handleInteraction}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/signIn" />
        <Stack.Screen name="(master-admin)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(parent)" />
        <Stack.Screen name="(auth)/forgot-password" />
        <Stack.Screen name="(auth)/demo" />
      </Stack>

      <GlobalNotifications />

      {isLoadingOverlayVisible && (
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 100000,
          }}
        >
          <AppLoading onLogout={signOut} />
        </View>
      )}
    </View>
  );
}