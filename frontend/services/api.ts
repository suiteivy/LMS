import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import { showError, showWarning, showInfo } from "../utils/toast";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Extend Axios request config to support a per-request flag that suppresses
// the global error toast (useful for background fetches that have silent fallbacks).
declare module 'axios' {
  interface AxiosRequestConfig {
    skipErrorToast?: boolean;
    retryable?: boolean;
    skipErrorLog?: boolean;
  }
}

import { supabase } from "@/libs/supabase";
import { safeSignOut } from "@/utils/safeSignOut";
import { LogoutReason } from "@/types/logout";

import Constants from "expo-constants";

// --- Offline detection & retry ---
let _isOffline = false;
const offlineListeners: Array<(offline: boolean) => void> = [];

export const isOffline = () => _isOffline;
export const onOfflineChange = (cb: (offline: boolean) => void) => {
  offlineListeners.push(cb);
  return () => {
    const idx = offlineListeners.indexOf(cb);
    if (idx >= 0) offlineListeners.splice(idx, 1);
  };
};

const _setOffline = (val: boolean) => {
  if (_isOffline === val) return;
  _isOffline = val;
  offlineListeners.forEach((cb) => cb(val));
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => _setOffline(false));
  window.addEventListener('offline', () => _setOffline(true));
  _isOffline = !navigator.onLine;
}

let _lastNetworkToast = 0;
const NETWORK_TOAST_COOLDOWN = 5000;
const RATE_LIMIT_TOAST_COOLDOWN = 10000;
let _lastRateLimitToast = 0;
let _pendingRetry: (() => Promise<any>) | null = null;

export const getPendingRetry = () => _pendingRetry;

export const getPendingRetry = () => _pendingRetry;
export const clearPendingRetry = () => { _pendingRetry = null; };
export const retryLastRequest = async () => {
  const fn = _pendingRetry;
  if (!fn) return;
  _pendingRetry = null;
  return fn();
};

/**
 * Determine the appropriate base URL for API calls based on environment and platform
 * Priority: Environment variable -> Expo Host URI -> Platform-specific defaults
 * @returns {string} The base URL for API requests
 */
const getBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_URL;

  // In local development on mobile, replace localhost with the Metro bundler host IP or 10.0.2.2 for Android emulator
  if (__DEV__ && Platform.OS !== "web") {
    const hostUri = Constants.expoConfig?.hostUri;
    const devIp = hostUri ? hostUri.split(":")[0] : (Platform.OS === "android" ? "10.0.2.2" : "localhost");

    if (envUrl && envUrl.includes("localhost")) {
      return envUrl.replace("localhost", devIp);
    }
    if (!envUrl) {
      return `http://${devIp}:4001/api`;
    }
  }

  if (envUrl) {
    return envUrl;
  }

  // Fallbacks for local development
  if (__DEV__) {
    if (Platform.OS === "android") {
      return "http://10.0.2.2:4001/api";
    }
    return "http://localhost:4001/api";
  }

  return "http://192.168.56.1:4001/api";
};

const baseURL = getBaseUrl();

let latestAccessToken: string | null = null;
let authContextReady = false;

const setLatestAccessToken = (token?: string | null) => {
  latestAccessToken = token || null;
};

supabase.auth.getSession()
  .then(({ data }) => {
    setLatestAccessToken(data?.session?.access_token || null);
    authContextReady = true;
  })
  .catch(() => {
    authContextReady = true;
  });

supabase.auth.onAuthStateChange((_event, session) => {
  setLatestAccessToken(session?.access_token || null);
  authContextReady = true;
});

const isLikelyPublicRoute = (url?: string) => {
  const target = String(url || '');
  return (
    target.includes('/auth/login') ||
    target.includes('/auth/forgot-password') ||
    target.includes('/auth/reset-password') ||
    target.includes('/auth/verify-security-questions') ||
    target.includes('/auth/credential-delivery') ||
    target.includes('/demo/') ||
    target.includes('/settings/maintenance') ||
    target.includes('/settings/currency')
  );
};

const waitForAuthToken = (timeoutMs: number): Promise<string | null> => {
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | null = null;

    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (unsubscribe) {
        unsubscribe();
      }
      resolve(token);
    };

    const timeout = setTimeout(() => {
      finish(latestAccessToken);
    }, timeoutMs);

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token || null;
      if (!token) return;
      finish(token);
    });

    unsubscribe = () => data.subscription.unsubscribe();
  });
};

/**
 * To Do:
 * Axios instance configured with appropriate base URL and default headers
 * Automatically handles different environments (production/development)
 * and platforms (iOS/Android)
 */

export const api: AxiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 30000, // Increased to 30s for complex dashboard queries
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const rateLimitHolds = new Map<string, number>();

const makeRateLimitKey = (config?: InternalAxiosRequestConfig) => {
  const method = (config?.method || 'get').toLowerCase();
  const url = (config?.url || '').split('?')[0];
  return `${method}:${url}`;
};

const getHoldUntil = (config?: InternalAxiosRequestConfig) => {
  if (!config) return 0;
  const key = makeRateLimitKey(config);
  return rateLimitHolds.get(key) || 0;
};

const setRateLimitHold = (config: InternalAxiosRequestConfig | undefined, retryAfterSeconds: number) => {
  if (!config) return;
  const key = makeRateLimitKey(config);
  rateLimitHolds.set(key, Date.now() + (Math.max(1, retryAfterSeconds) * 1000));
};

const formatRetryAfter = (retryAfterSeconds: number) => {
  const raw = Number(retryAfterSeconds);
  const safe = Number.isFinite(raw) ? raw : 10;
  const total = Math.max(1, Math.floor(safe));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
};

const clearExpiredRateLimitHolds = () => {
  const now = Date.now();
  for (const [key, until] of rateLimitHolds.entries()) {
    if (until <= now) {
      rateLimitHolds.delete(key);
    }
  }
};

// Request Interceptor: Inject Auth Token
api.interceptors.request.use(
  async (config) => {
    clearExpiredRateLimitHolds();
    const holdUntil = getHoldUntil(config);
    if (holdUntil > Date.now()) {
      const retryAfter = Math.max(1, Math.ceil((holdUntil - Date.now()) / 1000));
      const heldError: any = new Error('Rate limited request held');
      heldError.config = config;
      heldError.response = {
        status: 429,
        data: {
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_HELD',
          retryAfter,
        },
      };
      throw heldError;
    }

    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    
    try {
      let token = latestAccessToken;

      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
        setLatestAccessToken(token);
        authContextReady = true;
      }

      if (!token && !isLikelyPublicRoute(config.url)) {
        token = await waitForAuthToken(1200);
        setLatestAccessToken(token);
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error: any) {
      console.error(`[API ${requestId}] Auth interceptor failure for ${config.url}:`, error.message);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for Global Error Handling
api.interceptors.response.use(
  (response) => {
    // Clear offline state on any successful response
    _setOffline(false);
    return response;
  },
  (error: AxiosError) => {
    let title = "Error";
    let message = "An unexpected error occurred";
    let severity: 'error' | 'warning' | 'info' = 'error';

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      message = data?.error || data?.message || message;

      if (data?.details && Array.isArray(data.details)) {
        message = `${message}:\n\u2022 ${data.details.join('\n\u2022 ')}`;
      }

      switch (status) {
        case 400:
          title = "Invalid Request";
          break;
        case 401:
          title = "Unauthorized";
          message = data?.error || data?.message || "Please sign in again.";

          const skipSignOut = (error.config as InternalAxiosRequestConfig & { skipErrorToast?: boolean })?.skipErrorToast;

          const errorCode = data?.code;
          let logoutReason = LogoutReason.UNKNOWN;
          if (errorCode === 'SESSION_IDLE_TIMEOUT') {
            logoutReason = LogoutReason.INACTIVITY_TIMEOUT;
          } else if (errorCode === 'SESSION_TIMEOUT' || errorCode === 'SESSION_REVOKED') {
            logoutReason = LogoutReason.SESSION_TIMEOUT;
          } else if (error.response?.status === 401) {
            logoutReason = LogoutReason.TOKEN_EXPIRED;
          }

          const shouldForceSignOut = ['SESSION_IDLE_TIMEOUT', 'SESSION_TIMEOUT', 'SESSION_REVOKED'].includes(errorCode);

          if (!skipSignOut && shouldForceSignOut && error.config?.headers?.Authorization) {
            console.warn(`[API] 401 ${errorCode} received. Checking session before triggering safeSignOut.`);
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                safeSignOut('local', logoutReason, true).catch(e => console.warn("safeSignOut error:", e));
              }
            });
          }
          return Promise.reject({ ...error, isAuthError: true });
        case 403:
          title = "Permission Denied";
          message = "You don't have access to this resource.";
          severity = 'info';
          break;
        case 404:
          title = "Not Found";
          if (!data?.error && !data?.message) {
            message = "The requested resource was not found.";
          }
          severity = 'info';
          break;
        case 429: {
          title = "Too Many Requests";
          const retryAfter = Number(data?.retryAfter || 10);
          setRateLimitHold(error.config as InternalAxiosRequestConfig, retryAfter);
          message = `You're doing that too often. Please wait ${formatRetryAfter(retryAfter)}.`;
          severity = 'warning';
          break;
        }
        case 500:
          title = "Server Error";
          if (!data?.error && !data?.message) {
            message = "Something went wrong on our end.";
          }
          break;
        case 502:
        case 503:
        case 504:
          title = "Service Unavailable";
          message = "The server is temporarily unavailable. Please try again shortly.";
          severity = 'warning';
          // Store retry function for these transient errors
          if (error.config) {
            const cfg = { ...error.config };
            _pendingRetry = () => api.request(cfg);
          }
          break;
      }
    } else if (error.request) {
      // Network / no response
      _setOffline(true);

      if (error.code === 'ECONNABORTED') {
        title = "Request Timeout";
        message = "The request took too long. Check your connection and try again.";
        severity = 'warning';
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        title = "No Internet Connection";
        message = "You appear to be offline. Please check your network and try again.";
        severity = 'warning';
      } else {
        title = "Connection Failed";
        message = "Could not reach the server. Please check your connection.";
        severity = 'warning';
      }

      // Store retry function
      if (error.config) {
        const cfg = { ...error.config };
        _pendingRetry = () => api.request(cfg);
      }

      // Deduplicate network toasts
      const now = Date.now();
      if (now - _lastNetworkToast < NETWORK_TOAST_COOLDOWN) {
        return Promise.reject({ ...error, message, title, safeData: null });
      }
      _lastNetworkToast = now;
    } else {
      message = error.message;
    }

    // Enhanced Logging
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    const skipLog = (error.config as InternalAxiosRequestConfig & { skipErrorLog?: boolean })?.skipErrorLog;
    if (!skipLog) {
      console.error(`[API Error] ${method} ${url} (${error.response?.status || 'Network'}):`, message);
    }

    // Only show toast if it's not a "cancelled" request, NOT a 401 (handled by AuthContext),
    // and the caller hasn't opted out via `skipErrorToast: true`.
    const skipToast = (error.config as InternalAxiosRequestConfig & { skipErrorToast?: boolean })?.skipErrorToast;
    const now = Date.now();
    const isRateLimited = error.response?.status === 429;
    const canShowRateLimitToast = !isRateLimited || (now - _lastRateLimitToast > RATE_LIMIT_TOAST_COOLDOWN);

    if (error.message !== 'canceled' && error.response?.status !== 401 && !skipToast && canShowRateLimitToast) {
      if (severity === 'warning') {
        showWarning(title, message);
      } else if (severity === 'info') {
        showInfo(title, message);
      } else {
        showError(title, message);
      }

      if (isRateLimited) {
        _lastRateLimitToast = now;
      }
    }

    // Return a structured error object instead of just rejecting with AxiosError
    // to help frontend components handle errors without crashing
    return Promise.reject({
      ...error,
      message,
      title,
      safeData: null // UI can check this if they want to avoid crashes
    });
  }
);
