import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Robustly detects whether the runtime is a physical hardware device
 * or an emulator/simulator, across Android, iOS, and Web.
 * Does NOT rely on Constants.isDevice alone (which was removed in Expo SDK 54).
 */
export const isPhysicalDevice = (): boolean => {
  if (Platform.OS === 'web') return false;

  // Check if Constants.isDevice exists (e.g. polyfill or custom config)
  if (typeof (Constants as any).isDevice === 'boolean') {
    return (Constants as any).isDevice;
  }

  if (Platform.OS === 'android') {
    const constants = (Platform.constants as any) || {};
    const brand = String(constants.Brand || '').toLowerCase();
    const model = String(constants.Model || '').toLowerCase();
    const fingerprint = String(constants.Fingerprint || '').toLowerCase();
    const hardware = String(constants.Hardware || '').toLowerCase();
    const product = String(constants.Product || '').toLowerCase();
    const manufacturer = String(constants.Manufacturer || '').toLowerCase();

    const isEmulator =
      fingerprint.startsWith('generic') ||
      fingerprint.startsWith('unknown') ||
      model.includes('google_sdk') ||
      model.includes('emulator') ||
      model.includes('android sdk built for') ||
      hardware.includes('goldfish') ||
      hardware.includes('ranchu') ||
      product.includes('sdk') ||
      product.includes('google_sdk') ||
      product.includes('sdk_gphone') ||
      manufacturer.includes('genymotion');

    return !isEmulator;
  }

  if (Platform.OS === 'ios') {
    const constants = (Platform.constants as any) || {};
    const model = String(constants.Model || '').toLowerCase();
    return !model.includes('simulator');
  }

  return false;
};

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
        // Reject non-routable link-local 169.254.x.x addresses
        if (host && !host.startsWith('169.254.')) {
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

let _developerManualLanIp: string | null = null;
const DEV_LAN_OVERRIDE_KEY = 'developer_manual_lan_ip_override';

// Load persisted manual LAN IP on module init in development
if (__DEV__) {
  AsyncStorage.getItem(DEV_LAN_OVERRIDE_KEY)
    .then((stored) => {
      if (stored && stored.trim().length > 0) {
        _developerManualLanIp = stored.trim();
      }
    })
    .catch(() => {});
}

/**
 * Allows developers to explicitly set or override the workstation LAN IP in development builds.
 * Persists the override to AsyncStorage so physical devices remember the host across reloads.
 */
export const setDeveloperManualLanIp = async (ip: string | null) => {
  _developerManualLanIp = ip ? ip.trim() : null;
  if (__DEV__) {
    if (ip && ip.trim().length > 0) {
      await AsyncStorage.setItem(DEV_LAN_OVERRIDE_KEY, ip.trim()).catch(() => {});
    } else {
      await AsyncStorage.removeItem(DEV_LAN_OVERRIDE_KEY).catch(() => {});
    }
  }
};

export const getDeveloperManualLanIp = (): string | null => {
  return _developerManualLanIp;
};

/**
 * Resolves the workstation's LAN IP fallback.
 * Priority:
 * 1. Developer manual override (AsyncStorage / in-memory)
 * 2. EXPO_PUBLIC_DEV_LAN_IP
 * 3. EXPO_PUBLIC_LAN_IP
 * 4. Extracted host from EXPO_PUBLIC_BACKEND_URL
 * 5. Default local subnet fallback
 */
export const getFallbackLanIp = (): string => {
  if (_developerManualLanIp) return _developerManualLanIp;
  if (process.env.EXPO_PUBLIC_DEV_LAN_IP) return process.env.EXPO_PUBLIC_DEV_LAN_IP.trim();
  if (process.env.EXPO_PUBLIC_LAN_IP) return process.env.EXPO_PUBLIC_LAN_IP.trim();
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    try {
      const match = process.env.EXPO_PUBLIC_BACKEND_URL.match(/:\/\/([^/:]+)/);
      if (match && match[1]) return match[1].trim();
    } catch {}
  }
  return '192.168.1.103';
};

/**
 * Resolves the appropriate development host for the current runtime target:
 * - Production builds: always return production domain; NEVER resolve local IPs.
 * - Web: 'localhost'
 * - iOS Simulator: 'localhost' (shares host network stack)
 * - Android Emulator fallback: '10.0.2.2' (host loopback alias)
 * - Android Physical / Device / Network:
 *     - If Metro bundler is served via USB reverse ('localhost' or '127.0.0.1'): '127.0.0.1' (routes via adb reverse)
 *     - If Metro bundler is served via Wi-Fi: bundler LAN IP (e.g. 192.168.x.x)
 *     - Fallback: workstation LAN IP (192.168.1.103 or user configured)
 *     - NEVER returns '10.0.2.2' on physical hardware!
 */
export const resolveDevHost = (): string => {
  // Strict production guard: dev hosts must never be resolved in production builds
  if (!__DEV__) {
    return 'api.cloudora.app';
  }

  if (Platform.OS === 'web') {
    return 'localhost';
  }

  const expoHost = getExpoDevHost();
  const isPhysical = isPhysicalDevice();
  const fallbackLanIp = getFallbackLanIp();

  // On physical devices:
  if (isPhysical) {
    if (expoHost && !expoHost.startsWith('10.0.2.') && !expoHost.startsWith('169.254.')) {
      // When Metro was fetched via USB (adb reverse), expoHost will be 'localhost' or '127.0.0.1'.
      // With `adb reverse tcp:4001 tcp:4001`, 127.0.0.1 routes directly to workstation backend over USB.
      if (expoHost === 'localhost' || expoHost === '127.0.0.1') {
        return '127.0.0.1';
      }
      return expoHost;
    }

    const hasExplicitLan = Boolean(
      _developerManualLanIp ||
      process.env.EXPO_PUBLIC_DEV_LAN_IP ||
      process.env.EXPO_PUBLIC_LAN_IP ||
      process.env.EXPO_PUBLIC_BACKEND_URL
    );

    if (!hasExplicitLan) {
      console.warn(
        `[DevHost] Metro host auto-detection unavailable on physical device. Falling back to default (${fallbackLanIp}). ` +
        `Set EXPO_PUBLIC_LAN_IP or use setDeveloperManualLanIp('YOUR_PC_IP') if unable to connect to backend.`
      );
    }

    return fallbackLanIp;
  }

  // On Android Emulator:
  if (Platform.OS === 'android') {
    if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1' && !expoHost.startsWith('169.254.')) {
      return expoHost;
    }
    return '10.0.2.2';
  }

  // On iOS Simulator:
  if (Platform.OS === 'ios') {
    if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1' && !expoHost.startsWith('169.254.')) {
      return expoHost;
    }
    return 'localhost';
  }

  return expoHost || fallbackLanIp;
};

/**
 * Returns an alternative fallback dev host for automatic failover.
 * - If primary is localhost/127.0.0.1 -> fallback is workstation LAN IP.
 * - If primary is workstation LAN IP -> fallback is 127.0.0.1.
 */
export const getFallbackDevHost = (): string | null => {
  if (Platform.OS === 'web') return null;

  const currentHost = resolveDevHost();
  const fallbackLanIp = getFallbackLanIp();

  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return fallbackLanIp;
  }
  if (currentHost === fallbackLanIp) {
    return '127.0.0.1';
  }
  return fallbackLanIp;
};

/**
 * Returns the backend API base URL, guaranteed to end with `/api` exactly once.
 *
 * How env variables are handled:
 *   - Reads EXPO_PUBLIC_API_URL or EXPO_PUBLIC_URL or NEXT_PUBLIC_API_BASE_URL.
 *   - On native platforms (Android / iOS):
 *       - Intelligently swaps 'localhost' with the correct environment-aware host
 *         (10.0.2.2 on Android emulator, 127.0.0.1/LAN IP on physical device, localhost on iOS sim/web).
 *       - Rejects non-routable link-local 169.254.x.x addresses.
 *   - In production:
 *       - Uses the configured production URL as-is without dev host mutation.
 *   - Normalizes trailing slashes and ensures single `/api` suffix.
 *
 * @returns e.g. "http://127.0.0.1:4001/api" or "http://192.168.100.83:4001/api" or "https://api.yourdomain.com/api"
 */
export const getApiBaseUrl = (): string => {
  // STRICT PRODUCTION GUARD: Production builds NEVER resolve to localhost, 10.0.2.2, or dev LAN IPs
  if (!__DEV__) {
    const prodUrl =
      process.env.EXPO_PUBLIC_API_URL ||
      process.env.EXPO_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'https://api.cloudora.app';

    let cleanProd = prodUrl.trim().replace(/\/+$/, '').replace(/\/api$/i, '').replace(/\/+$/, '');
    return `${cleanProd}/api`;
  }

  // Development Mode resolution:
  let url =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL;

  // On native platforms, swap localhost with environment-aware dev host
  if (Platform.OS !== 'web') {
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
    const devHost = resolveDevHost();
    url = `http://${devHost}:4001`;
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
 * Returns the alternative fallback API base URL for automatic host failover.
 */
export const getFallbackApiBaseUrl = (): string => {
  if (!__DEV__) return getApiBaseUrl();

  const fallbackHost = getFallbackDevHost();
  if (!fallbackHost) return getApiBaseUrl();

  const currentHost = resolveDevHost();
  let base = getApiBaseUrl();
  return base.replace(currentHost, fallbackHost);
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
  const constants = (Platform.constants as any) || {};
  return {
    isDev: __DEV__,
    platform: Platform.OS,
    isPhysicalDevice: isPhysicalDevice(),
    deviceBrand: constants.Brand || constants.Manufacturer || null,
    deviceModel: constants.Model || null,
    scriptURL: (NativeModules as any)?.SourceCode?.scriptURL || null,
    expoDevHost: getExpoDevHost(),
    developerManualLanIp: _developerManualLanIp,
    physicalAutoDetectSuccess: isPhysicalDevice() ? Boolean(getExpoDevHost()) : null,
    resolvedDevHost: resolveDevHost(),
    fallbackDevHost: getFallbackDevHost(),
    envPublicApiUrl: process.env.EXPO_PUBLIC_API_URL,
    resolvedApiBaseUrl: getApiBaseUrl(),
    fallbackApiBaseUrl: getFallbackApiBaseUrl(),
    resolvedBackendRootUrl: getBackendRootUrl(),
  };
};

