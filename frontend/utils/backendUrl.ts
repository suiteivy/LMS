import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

/**
 * Extracts the Metro bundler host address from various Expo Constants locations
 * across different Expo SDK versions (Expo Go, dev client, bare workflow).
 */
export const getExpoDevHost = (): string | null => {
  // First, check React Native's NativeModules.SourceCode.scriptURL (the most reliable source in dev builds)
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
  if (typeof scriptURL === 'string' && scriptURL.includes('://')) {
    try {
      const match = scriptURL.match(/:\/\/([^/:]+)/);
      if (match && match[1]) {
        const host = match[1].trim();
        if (host && !host.startsWith('169.254.') && host !== 'localhost' && host !== '127.0.0.1') {
          return host;
        }
      }
    } catch {
      // Ignore URL parse errors
    }
  }

  const candidates: Array<string | undefined | null> = [
    Constants.expoConfig?.hostUri,
    (Constants as any).expoGoConfig?.debuggerHost,
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost,
    (Constants as any).manifest2?.extra?.expoClient?.hostUri,
    (Constants as any).manifest?.debuggerHost,
    (Constants as any).experienceUrl,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      const host = candidate.split(':')[0].trim();
      // Reject link-local 169.254.x.x addresses as they are non-routable on Wi-Fi/LAN
      if (host && !host.startsWith('169.254.')) {
        return host;
      }
    }
  }

  // Fallback: parse from linkingUri if available (e.g. exp://192.168.1.100:8081)
  const linkingUri = Constants.linkingUri;
  if (typeof linkingUri === 'string' && linkingUri.includes('://')) {
    try {
      const match = linkingUri.match(/:\/\/([^/:]+)/);
      if (match && match[1]) {
        const host = match[1].trim();
        if (host && !host.startsWith('169.254.')) {
          return host;
        }
      }
    } catch {
      // Ignore URL parse errors
    }
  }

  return null;
};

/**
 * Resolves the appropriate development host for the current runtime target:
 * - Web: 'localhost'
 * - iOS Simulator: 'localhost' (shares host network stack)
 * - Android Physical / Device / Network: Metro bundler LAN IP (e.g. 192.168.x.x)
 * - Android Emulator fallback: '10.0.2.2'
 */
export const resolveDevHost = (): string => {
  if (Platform.OS === 'web') {
    return 'localhost';
  }

  const expoHost = getExpoDevHost();
  const isPhysical = Constants.isDevice ?? false;

  // On physical devices, we MUST use a routable LAN IP
  if (isPhysical) {
    if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
      return expoHost;
    }
    return '192.168.100.25';
  }

  // On Android:
  // Prefer the Metro LAN host if available; otherwise use workstation LAN IP (192.168.100.25) or emulator loopback
  if (Platform.OS === 'android') {
    if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1' && !expoHost.startsWith('10.0.2.')) {
      return expoHost;
    }
    return '192.168.100.25';
  }

  // On iOS Simulator:
  // localhost shares host networking directly
  if (Platform.OS === 'ios') {
    if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
      return expoHost;
    }
    return 'localhost';
  }

  return expoHost || '192.168.100.25';
};

/**
 * Returns the backend API base URL, guaranteed to end with `/api` exactly once.
 *
 * How env variables are handled:
 *   - Reads EXPO_PUBLIC_API_URL or EXPO_PUBLIC_URL or NEXT_PUBLIC_API_BASE_URL.
 *   - In local development (__DEV__):
 *       - Intelligently swaps 'localhost' with the correct environment-aware host
 *         (10.0.2.2 on Android emulator, LAN IP on physical device, localhost on iOS sim/web).
 *       - Rejects non-routable link-local 169.254.x.x addresses.
 *   - In production:
 *       - Uses the configured production URL as-is without dev host mutation.
 *   - Normalizes trailing slashes and ensures single `/api` suffix.
 *
 * @returns e.g. "http://192.168.100.25:4001/api" or "http://10.0.2.2:4001/api" or "https://api.yourdomain.com/api"
 */
export const getApiBaseUrl = (): string => {
  let url =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL;

  // In local dev on native, swap localhost with environment-aware dev host
  if (__DEV__ && Platform.OS !== 'web') {
    const devHost = resolveDevHost();

    if (url && (url.includes('localhost') || url.includes('127.0.0.1'))) {
      url = url.replace(/localhost|127\.0\.0\.1/g, devHost);
    }

    if (!url) {
      url = `http://${devHost}:4001`;
    }
  }

  // Fallbacks for when no env var is set
  if (!url) {
    if (__DEV__) {
      const devHost = resolveDevHost();
      url = `http://${devHost}:4001`;
    } else {
      url = 'https://api.cloudora.app';
    }
  }

  // Normalize steps:
  // 1. Trim whitespace and any trailing slashes
  url = url.trim().replace(/\/+$/, '');
  // 2. Strip /api suffix if present (case-insensitive)
  url = url.replace(/\/api$/i, '');
  // 3. Strip any remaining trailing slashes (e.g. from /api/)
  url = url.replace(/\/+$/, '');

  // 4. Return with single /api suffix
  return `${url}/api`;
};

/**
 * Returns the backend root URL **without** the `/api` suffix.
 * Use only when you need the bare server origin (e.g. health checks, WebSocket).
 */
export const getBackendRootUrl = (): string => {
  return getApiBaseUrl().replace(/\/api\/?$/i, '');
};

/**
 * Debugging helper that returns current URL resolution diagnostics.
 */
export const getApiDiagnostics = () => {
  return {
    platform: Platform.OS,
    isDevice: Constants.isDevice,
    expoDevHost: getExpoDevHost(),
    resolvedDevHost: resolveDevHost(),
    envPublicApiUrl: process.env.EXPO_PUBLIC_API_URL,
    resolvedApiBaseUrl: getApiBaseUrl(),
    resolvedBackendRootUrl: getBackendRootUrl(),
  };
};
