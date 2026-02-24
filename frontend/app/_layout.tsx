import { AppLoading } from "@/components/AppLoading";
import { toastConfig } from "@/components/CustomToast";
import Notifications from "@/components/Notifications";
import DemoBanner from "@/components/DemoBanner";
import { DebugOverlay } from "@/components/common/DebugOverlay";
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

// Material Dark color scale
// Background:  #121212
// Surface:     #1e1e1e
// Cards:       #242424
// Borders:     #2c2c2c

// ─── Root ────────────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <CurrencyProvider>
              <NotificationProvider>
                <AppShell />
              </NotificationProvider>
            </CurrencyProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ─── AppShell ────────────────────────────────────────────────────────────────
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
          backgroundColor={isDark ? '#121212' : '#ffffff'}
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

// ─── GlobalNotifications ─────────────────────────────────────────────────────
function GlobalNotifications() {
  const { showNotifications, setShowNotifications } = useNotifications();
  return (
    <Notifications
      visible={showNotifications}
      onClose={() => setShowNotifications(false)}
    />
  );
}

// ─── AuthHandler ─────────────────────────────────────────────────────────────
function AuthHandler() {
  const { loading, isInitializing, resetSessionTimer, session } = useAuth();
  const { isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = React.useState(false);

  React.useEffect(() => {
    if (!isNavigationReady) {
      const timer = setTimeout(() => setIsNavigationReady(true), 1);
      return () => clearTimeout(timer);
    }
  }, [isNavigationReady]);

  React.useEffect(() => {
    // 1. Wait for everything to be ready
    if (isInitializing || !isNavigationReady) return;

    const inAuthGroup = segments.some(s => s === "(auth)");
    const currentPath = `/${segments.join('/')}`;
    const isRoot = currentPath === '/' || currentPath === '/index' || currentPath === '/(auth)';

    // Debug logging for routing issues
    // console.log("[AuthHandler] State:", { hasSession: !!session, inAuthGroup, isRoot, currentPath });

    if (!session) {
      // NOT LOGGED IN
      // If we are not in auth group and not at root, we should probably go to root.
      // BUT: Only if we aren't already there.
      if (!inAuthGroup && !isRoot) {
        // Special case: if we just loaded and isInitializing just flipped to false,
        // we might be in a race with the router. 
        // Let's only redirect if we aren't in a transient state.
        router.replace("/");
      }
    } else {
      // LOGGED IN
      // If we are in the auth group, we should go to root (which will then redirect to dashboard)
      if (inAuthGroup) {
        router.replace("/");
      }
    }
  }, [session, isInitializing, isNavigationReady, segments.join('|')]);

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
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(parent)" />
        <Stack.Screen name="(auth)/forgot-password" />
        <Stack.Screen name="(auth)/demo" />
      </Stack>

      <DebugOverlay />
      <GlobalNotifications />
      <Toast config={toastConfig} />

      {isLoadingOverlayVisible && (
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 100000,
            backgroundColor: isDark ? '#121212' : '#ffffff',
          }}
        >
          <AppLoading />
        </View>
      )}
    </View>
  );
}