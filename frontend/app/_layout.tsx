import { AppLoading } from "@/components/AppLoading";
import { toastConfig } from "@/components/CustomToast";
import Notifications from "@/components/Notifications";
import DemoBanner from "@/components/DemoBanner";
import { OfflineBanner } from "@/components/OfflineBanner";
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
  const all = args.map((arg) => (arg instanceof Error ? arg.message : String(arg ?? ''))).join(' ');
  if (msg.includes("Couldn't find a navigation context")) return;
  if (all.includes("non-boolean attribute") && all.includes("collapsable")) return;
  _origConsoleError(...args);
};

const _origConsoleWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const all = args.map((arg) => (arg instanceof Error ? arg.message : String(arg ?? ''))).join(' ');
  if (all.includes("non-boolean attribute") && all.includes("collapsable")) return;
  _origConsoleWarn(...args);
};

LogBox.ignoreLogs([
  "Couldn't find a navigation context",
  "Received `false` for a non-boolean attribute `collapsable`",
  "non-boolean attribute `collapsable`"
]);

// SuiteIvy Dark color palette (matches landing page)
// Background:  #0F0B2E  (deep navy)
// Surface:     #13103A  (slightly lighter navy)
// Cards:       #1A1650  (muted navy)
// Borders:     rgba(255,255,255,0.1)  (translucent white)

// Root 
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
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
}

// AppShell 
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
      <OfflineBanner />
      <AuthHandler />
    </>
  );
}

//  GlobalNotifications 
function GlobalNotifications() {
  const { showNotifications, setShowNotifications } = useNotifications();
  return (
    <Notifications
      visible={showNotifications}
      onClose={() => setShowNotifications(false)}
    />
  );
}

// AuthHandler 
function AuthHandler() {
  const { loading, isInitializing, isNavReady, resetSessionTimer, session, profile, isPlatformAdmin, getRoleRedirect, signOut, wasDemo, clearWasDemo } = useAuth();
  const { isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  
  // Guard against redirect loops
  const redirectCount = React.useRef(0);
  const lastRedirectPath = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (isInitializing || !isNavReady) return;

    // Normalize paths: remove trailing slashes and clarify root
    const normalizePath = (p: string) => {
      let normalized = p.replace(/\/+$/, '') || '/';
      if (normalized.endsWith('/index')) normalized = normalized.replace(/\/index$/, '') || '/';
      return normalized;
    };

    const currentPath = normalizePath(`/${segments.join('/')}`);
    const inAuthGroup = segments.some(s => s === "(auth)");
    const isRoot = currentPath === '/' || currentPath === '';
    const isCredentialDelivery = currentPath === '/credential-delivery';


    const handleRedirect = (path: string) => {
      const normalizedTarget = normalizePath(path);
      if (currentPath === normalizedTarget) return;

      // Loop prevention
      if (lastRedirectPath.current === normalizedTarget) {
        redirectCount.current++;
        if (redirectCount.current > 5) {
          console.error(`[AuthHandler] REDIRECT LOOP DETECTED on ${normalizedTarget}. Aborting.`);
          return;
        }
      } else {
        redirectCount.current = 0;
        lastRedirectPath.current = normalizedTarget;
      }

      router.replace(normalizedTarget as any);
    };

    if (!session) {
      if (!inAuthGroup && !isRoot && !isCredentialDelivery) {
        if (wasDemo) {
          handleRedirect("/");
          clearWasDemo();
        } else {
          handleRedirect("/(auth)/signIn");
        }
      }
    } else if (profile) {
      const requiresCredentialSetup = !!(profile as any).must_change_password || !!(profile as any).requires_security_questions_setup;
      if (requiresCredentialSetup && currentPath !== '/(auth)/security-questions') {
        handleRedirect('/(auth)/security-questions');
        return;
      }

      // If at root or in auth group, redirect to role-specific dashboard
      if (isRoot || inAuthGroup) {
        if (requiresCredentialSetup && currentPath === '/(auth)/security-questions') {
          return;
        }
        const redirectPath = getRoleRedirect(profile, isPlatformAdmin);
        if (redirectPath) {
          handleRedirect(redirectPath);
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
        <Stack.Screen name="(auth)/security-questions" />
        <Stack.Screen name="(auth)/verify-security-questions" />
        <Stack.Screen name="credential-delivery" />
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
