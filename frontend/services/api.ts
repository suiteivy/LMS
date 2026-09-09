import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { getApiBaseUrl } from "@/utils/backendUrl";
import { assertNoDoubleApiSegment } from "@/utils/validateApiUrl";

import { showError, showWarning, showInfo } from "../utils/toast";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Extend Axios request config to support a per-request flag that suppresses
// the global error toast (useful for background fetches that have silent fallbacks).
declare module 'axios' {
  interface AxiosRequestConfig {
    skipErrorToast?: boolean;
    retryable?: boolean;
    skipErrorLog?: boolean;
    _isRetry?: boolean;
  }
}

import { supabase } from "@/libs/supabase";
import { safeSignOut } from "@/utils/safeSignOut";
import { LogoutReason } from "@/types/logout";



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
export const clearPendingRetry = () => { _pendingRetry = null; };
export const retryLastRequest = async () => {
  const fn = _pendingRetry;
  if (!fn) return;
  _pendingRetry = null;
  return fn();
};

const baseURL = getApiBaseUrl();

let latestAccessToken: string | null = null;
let authContextReady = false;
let isSigningOut = false;

export const setSigningOutState = (signingOut: boolean) => {
  isSigningOut = signingOut;
  if (signingOut) {
    latestAccessToken = null;
  }
};

const setLatestAccessToken = (token?: string | null) => {
  if (isSigningOut) {
    latestAccessToken = null;
    return;
  }
  latestAccessToken = token || null;
};

supabase.auth.getSession()
  .then(({ data }) => {
    if (!isSigningOut) {
      setLatestAccessToken(data?.session?.access_token || null);
    }
    authContextReady = true;
  })
  .catch(() => {
    authContextReady = true;
  });

supabase.auth.onAuthStateChange((_event, session) => {
  if (isSigningOut) {
    setLatestAccessToken(null);
    return;
  }
  setLatestAccessToken(session?.access_token || null);
  authContextReady = true;
});

export const isTokenExpired = (token?: string | null, bufferSeconds = 30): boolean => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = typeof atob !== 'undefined'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('utf-8');
    const payload = JSON.parse(jsonStr);
    if (!payload.exp) return false;
    return (payload.exp * 1000) <= (Date.now() + bufferSeconds * 1000);
  } catch {
    return false;
  }
};

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

    // Validate no /api/api/ duplication in constructed URL
    const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
    assertNoDoubleApiSegment(fullUrl);

    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    
    try {
      if (isSigningOut && !isLikelyPublicRoute(config.url)) {
        const unauthError: any = new Error('No authentication token available');
        unauthError.isAuthError = true;
        unauthError.config = config;
        unauthError.response = {
          status: 401,
          data: { error: 'No token provided', code: 'NO_TOKEN' },
        };
        return Promise.reject(unauthError);
      }

      let token = latestAccessToken;

      if (!token || isTokenExpired(token)) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;

        if (token && isTokenExpired(token)) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          token = refreshed?.session?.access_token || null;
        }

        setLatestAccessToken(token);
        authContextReady = true;
      }

      if (!token && !isLikelyPublicRoute(config.url)) {
        token = await waitForAuthToken(1200);
        if (token && isTokenExpired(token)) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          token = refreshed?.session?.access_token || null;
        }
        setLatestAccessToken(token);
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (!isLikelyPublicRoute(config.url)) {
        // Prevent sending doomed unauthenticated requests over the wire for protected endpoints
        const unauthError: any = new Error('No authentication token available');
        unauthError.isAuthError = true;
        unauthError.config = config;
        unauthError.response = {
          status: 401,
          data: { error: 'No token provided', code: 'NO_TOKEN' },
        };
        return Promise.reject(unauthError);
      }
    } catch (error: any) {
      if (error?.isAuthError) {
        return Promise.reject(error);
      }
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
  async (error: AxiosError) => {
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

      // Sanitize raw database or schema errors from leaking to UI
      const rawDbPatterns = /database|schema|relation|syntax error|pg_|supabase|postgres/i;
      if (rawDbPatterns.test(message)) {
        message = "An unexpected error occurred. Please try again.";
      }

      switch (status) {
        case 400:
          title = "Invalid Request";
          break;
        case 401: {
          title = "Unauthorized";
          message = data?.error || data?.message || "Please sign in again.";

          const skipSignOut = (error.config as InternalAxiosRequestConfig & { skipErrorToast?: boolean })?.skipErrorToast;
          const errorCode = data?.code;
          const shouldForceSignOut = ['SESSION_IDLE_TIMEOUT', 'SESSION_TIMEOUT', 'SESSION_REVOKED'].includes(errorCode);

          // If standard 401 occurred (e.g. token expired) and request hasn't been retried yet,
          // attempt a single token refresh and retry before concluding unauthorized.
          const originalConfig = error.config as (InternalAxiosRequestConfig & { _isRetry?: boolean }) | undefined;
          if (originalConfig && !originalConfig._isRetry && !shouldForceSignOut && !isSigningOut && !isLikelyPublicRoute(originalConfig.url)) {
            originalConfig._isRetry = true;
            try {
              const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
              if (!refreshErr && refreshData?.session?.access_token) {
                const freshToken = refreshData.session.access_token;
                setLatestAccessToken(freshToken);
                originalConfig.headers.Authorization = `Bearer ${freshToken}`;
                return api.request(originalConfig);
              }
            } catch {
              // Refresh failed, proceed to 401 handling
            }
          }

          let logoutReason = LogoutReason.UNKNOWN;
          if (errorCode === 'SESSION_IDLE_TIMEOUT') {
            logoutReason = LogoutReason.INACTIVITY_TIMEOUT;
          } else if (errorCode === 'SESSION_TIMEOUT' || errorCode === 'SESSION_REVOKED') {
            logoutReason = LogoutReason.SESSION_TIMEOUT;
          } else if (error.response?.status === 401) {
            logoutReason = LogoutReason.TOKEN_EXPIRED;
          }

          if (!skipSignOut && shouldForceSignOut && error.config?.headers?.Authorization) {
            console.warn(`[API] 401 ${errorCode} received. Checking session before triggering safeSignOut.`);
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                safeSignOut('local', logoutReason, true).catch(e => console.warn("safeSignOut error:", e));
              }
            });
          }
          return Promise.reject({ ...error, isAuthError: true });
        }
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
          message = "An unexpected error occurred. Please try again.";
          break;
        case 502:
        case 503:
        case 504:
          title = "Service Unavailable";
          message = "The server is temporarily unavailable. Please try again shortly.";
          severity = 'warning';
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
