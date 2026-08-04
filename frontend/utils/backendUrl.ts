import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Returns the backend API base URL, guaranteed to end with `/api` exactly once.
 *
 * How env variables are handled:
 *   - Reads EXPO_PUBLIC_API_URL or EXPO_PUBLIC_URL or NEXT_PUBLIC_API_BASE_URL.
 *   - Works correctly regardless of whether the env variable contains:
 *       - Origin only: "http://localhost:4001" or "https://api.yourdomain.com"
 *       - Origin with trailing slash: "https://api.yourdomain.com/"
 *       - Origin with /api: "https://api.yourdomain.com/api"
 *       - Origin with /api/: "https://api.yourdomain.com/api/"
 *   - Normalizes all of them to produce "https://api.yourdomain.com/api"
 *
 * @returns e.g. "http://localhost:4001/api" or "https://api.yourdomain.com/api"
 */
export const getApiBaseUrl = (): string => {
  let url =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.EXPO_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL;

  // In local dev on native, swap localhost for the Metro bundler host IP
  if (__DEV__ && Platform.OS !== 'web') {
    const hostUri = Constants.expoConfig?.hostUri;
    const devIp = hostUri
      ? hostUri.split(':')[0]
      : Platform.OS === 'android'
        ? '10.0.2.2'
        : 'localhost';

    if (url && url.includes('localhost')) {
      url = url.replace('localhost', devIp);
    }
    if (!url) {
      url = `http://${devIp}:4001`;
    }
  }

  // Fallbacks for when no env var is set
  if (!url) {
    if (__DEV__) {
      url =
        Platform.OS === 'android'
          ? 'http://10.0.2.2:4001'
          : 'http://localhost:4001';
    } else {
      url = 'http://192.168.56.1:4001';
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
