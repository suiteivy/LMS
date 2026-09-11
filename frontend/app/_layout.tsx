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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Animated, Easing as EasingRN, Text } from 'react-native';
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
  if (all.includes("reportAllChanges") || (all.includes("startTime") && all.includes("Cannot read properties of undefined"))) return;

  // Prevent transient auth timeouts or socket drops from triggering fatal LogBox web error overlays
  if (
    all.includes("getUser timeout") ||
    all.includes("getSession timeout") ||
    all.includes("[AuthContext] Error or timeout in getUser during init") ||
    all.includes("Error or timeout in getUser during init") ||
    all.includes("UND_ERR_SOCKET") ||
    all.includes("other side closed") ||
    (all.includes("fetch failed") && all.includes("Supabase"))
  ) {
    _origConsoleWarn("[Auth Notice - Retrying/Fallback Active]:", ...args);
    return;
  }

  _origConsoleError(...args);
};

const _origConsoleWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const all = args.map((arg) => (arg instanceof Error ? arg.message : String(arg ?? ''))).join(' ');
  if (all.includes("non-boolean attribute") && all.includes("collapsable")) return;
  if (Platform.OS === 'web' && all.includes('"shadow*" style props are deprecated. Use "boxShadow"')) return;
  if (Platform.OS === 'web' && all.includes("props.pointerEvents is deprecated. Use style.pointerEvents")) return;
  _origConsoleWarn(...args);
};

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event: ErrorEvent) => {
      const msg = event?.message || event?.error?.message || '';
      const stack = event?.error?.stack || '';
      if (
        msg.includes("Cannot read properties of undefined (reading 'startTime')") ||
        stack.includes('reportAllChanges') ||
        msg.includes("getUser timeout") ||
        msg.includes("getSession timeout")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    },
    true
  );
}

LogBox.ignoreLogs([
  "Couldn't find a navigation context",
  "Received `false` for a non-boolean attribute `collapsable`",
  "non-boolean attribute `collapsable`",
  "reportAllChanges",
  "getUser timeout",
  "getSession timeout",
  "[AuthContext] Error or timeout in getUser during init",
  "Error or timeout in getUser during init",
  "fetch failed",
  "UND_ERR_SOCKET",
  "SocketError: other side closed",
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
  const { isDark } = useTheme();

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
      <OfflineBanner />
      <DemoBanner />
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
  const { loading, isInitializing, isNavReady, resetSessionTimer, session, profile, isPlatformAdmin, getRoleRedirect, signOut, wasDemo, clearWasDemo, maintenanceModeEnabled, maintenanceModeMessage, isDemoExiting } = useAuth();
  const { isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  const normalizePath = React.useCallback((path: string) => {
    let normalized = path.replace(/\/+$/, '') || '/';
    if (normalized.endsWith('/index')) normalized = normalized.replace(/\/index$/, '') || '/';
    return normalized;
  }, []);

  const authPublicPaths = React.useMemo(() => new Set([
    '/signIn',
    '/forgot-password',
    '/verify-security-questions',
    '/security-questions',
    '/demo',
  ]), []);

  const stripRouteGroups = React.useCallback((path: string) => {
    const withoutGroups = path.replace(/\/\([^/]+\)/g, '');
    return withoutGroups.replace(/\/{2,}/g, '/');
  }, []);

  const canonicalizePath = React.useCallback((path: string) => {
    const normalized = normalizePath(path);
    const groupStripped = stripRouteGroups(normalized);
    return normalizePath(groupStripped);
  }, [normalizePath, stripRouteGroups]);

  const routePath = React.useMemo(() => normalizePath(`/${segments.join('/')}`), [segments, normalizePath]);
  const currentPath = React.useMemo(() => canonicalizePath(routePath), [routePath, canonicalizePath]);
  const inAuthGroup = React.useMemo(() => segments.some((s) => s === "(auth)"), [segments]);
  const isAuthPath = React.useMemo(() => {
    if (inAuthGroup) return true;
    return authPublicPaths.has(currentPath);
  }, [inAuthGroup, currentPath, authPublicPaths]);
  const isMobile = Platform.OS !== 'web';

  const pulse = React.useRef(new Animated.Value(0.2)).current;
  React.useEffect(() => {
    if (!maintenanceModeEnabled) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.6, duration: 1000, easing: EasingRN.inOut(EasingRN.ease), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0.2, duration: 1000, easing: EasingRN.inOut(EasingRN.ease), useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [maintenanceModeEnabled]);
  
  // Guard against redirect loops
  const redirectCount = React.useRef(0);
  const lastRedirectPath = React.useRef<string | null>(null);

  // On web, proactively blur active element on route changes so no descendant retains focus when a screen is hidden
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (document.activeElement && document.activeElement !== document.body && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [segments]);

  React.useEffect(() => {
    if (isInitializing || !isNavReady) return;

    const isRoot = routePath === '/' || routePath === '';
    const isCredentialDelivery = currentPath === '/credential-delivery';
    const isNotFound = (segments as string[]).includes('+not-found') || currentPath === '/+not-found';
    const isLoader = currentPath === '/loader';


    const handleRedirect = (path: string) => {
      const normalizedTarget = normalizePath(path);
      const canonicalTarget = canonicalizePath(normalizedTarget);
      const authEquivalentTarget = authPublicPaths.has(canonicalTarget);
      if (routePath === normalizedTarget) return;
      if (authEquivalentTarget && currentPath === canonicalTarget) return;

      const loopKey = authEquivalentTarget ? `auth:${canonicalTarget}` : `route:${normalizedTarget}`;

      // Loop prevention
      if (lastRedirectPath.current === loopKey) {
        redirectCount.current++;
        if (redirectCount.current > 5) {
          console.error(`[AuthHandler] REDIRECT LOOP DETECTED on ${loopKey}. Aborting.`);
          return;
        }
      } else {
        redirectCount.current = 0;
        lastRedirectPath.current = loopKey;
      }

      router.replace(normalizedTarget as any);
    };

    if (!session) {
      if (isAuthPath) {
        if (currentPath === '/demo' && wasDemo) {
          clearWasDemo();
        }
      } else if (!isRoot && !isCredentialDelivery && !isNotFound && !isLoader) {
        if (wasDemo) {
          handleRedirect("/(auth)/demo");
        } else {
          handleRedirect("/(auth)/signIn");
        }
      }
    } else if (profile) {
      const requiresCredentialSetup = !!(profile as any).must_change_password || !!(profile as any).requires_security_questions_setup;
      if (requiresCredentialSetup && currentPath !== '/security-questions') {
        handleRedirect('/(auth)/security-questions');
        return;
      }

      // If at root or in auth group, redirect to role-specific dashboard
      if (isRoot || isAuthPath) {
        if (requiresCredentialSetup && currentPath === '/security-questions') {
          return;
        }
        const redirectPath = getRoleRedirect(profile, isPlatformAdmin);
        if (redirectPath) {
          handleRedirect(redirectPath);
        }
      }
    }
  }, [session, profile, isInitializing, isNavReady, segments, isPlatformAdmin, isAuthPath, currentPath, wasDemo, clearWasDemo, getRoleRedirect, router, normalizePath, canonicalizePath, routePath, authPublicPaths]);

  const handleInteraction = React.useCallback(() => {
    if (session) resetSessionTimer();
    return false;
  }, [resetSessionTimer, session]);

  const isLoadingOverlayVisible = isInitializing || loading || isDemoExiting;

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
        <Stack.Screen name="loader" />
        <Stack.Screen name="+not-found" options={{ headerShown: false, title: 'Not Found' }} />
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
          <AppLoading message={isDemoExiting ? "Exiting Demo Session..." : undefined} onLogout={signOut} />
        </View>
      )}

      {isMobile && maintenanceModeEnabled && !isPlatformAdmin && currentPath !== '/credential-delivery' && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#06070F',
            zIndex: 120000,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 28,
          }}
        >
          <Animated.View
            style={{
              position: 'absolute',
              width: 320,
              height: 320,
              borderRadius: 160,
              backgroundColor: '#FF6900',
              opacity: pulse,
              transform: [{ scale: 1.1 }],
            }}
          />
          <View
            style={{
              backgroundColor: 'rgba(19,16,58,0.75)',
              borderColor: 'rgba(255,105,0,0.35)',
              borderWidth: 1,
              borderRadius: 24,
              paddingVertical: 24,
              paddingHorizontal: 20,
              width: '100%',
              maxWidth: 420,
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <MaterialCommunityIcons name="tools" size={40} color="#FF6900" />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
              Scheduled Maintenance
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 22, textAlign: 'center' }}>
              {maintenanceModeMessage || 'System maintenance is in progress. Please try again later.'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0F0B2E',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}
    >
      <View
        style={{
          backgroundColor: 'rgba(19,16,58,0.85)',
          borderColor: 'rgba(255,107,0,0.3)',
          borderWidth: 1,
          borderRadius: 20,
          padding: 24,
          maxWidth: 420,
          width: '100%',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#FF6B00', fontSize: 18, fontWeight: '800', marginBottom: 8 }}>
          Something went wrong
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
          {error?.message || 'An unexpected error occurred while loading this view.'}
        </Text>
        <View
          style={{
            backgroundColor: '#FF6B00',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <Text
            onPress={retry}
            style={{
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: 14,
              paddingVertical: 12,
              paddingHorizontal: 24,
              textAlign: 'center',
            }}
          >
            Try Again
          </Text>
        </View>
      </View>
    </View>
  );
}

