import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import { showError } from "../utils/toast";

// Extend Axios request config to support a per-request flag that suppresses
// the global error toast (useful for background fetches that have silent fallbacks).
declare module 'axios' {
  interface AxiosRequestConfig {
    skipErrorToast?: boolean;
  }
}

import { supabase } from "@/libs/supabase";

import Constants from "expo-constants";

/**
 * To Do:
 * Determine the appropriate base URL for API calls based on environment and platform
 * Priority: Environment variable -> Expo Host URI -> Platform-specific defaults
 * @returns {string} The base URL for API requests
 */
const getBaseUrl = (): string => {
  // 1. Check for explicit environment variable override
  if (process.env.EXPO_PUBLIC_URL) {
    return process.env.EXPO_PUBLIC_URL;
  }

  // 2. Fallbacks for local development
  if (__DEV__) {
    // For Android physical devices/emulators when not using a tunnel
    if (Platform.OS === "android") {
      // 10.0.2.2 is the alias to the host loopback (localhost) on the Android emulator
      return "http://10.0.2.2:4001/api";
    }
    
    // Default fallback (iOS simulator or local web)
    return "http://localhost:4001/api";
  }

  // 3. Last resort fallback (historical hardcoded IP - kept as low priority)
  return "http://192.168.56.1:4001/api";
};

const baseURL = getBaseUrl();
console.log("[DEBUG] API Config:", {
  envUrl: process.env.EXPO_PUBLIC_URL,
  hostUri: Constants.expoConfig?.hostUri,
  platform: Platform.OS,
  resolvedBaseUrl: baseURL
});

/**
 * To Do:
 * Axios instance configured with appropriate base URL and default headers
 * Automatically handles different environments (production/development)
 * and platforms (iOS/Android)
 */
// console.log("API Base URL:", baseURL);
// console.log("Loaded EXPO_PUBLIC_URL:", process.env.EXPO_PUBLIC_URL);

export const api: AxiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 30000, // Increased to 30s for complex dashboard queries
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor: Inject Auth Token
api.interceptors.request.use(
  async (config) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);
    
    // console.log(`[API Request ${requestId}] Starting: ${config.method?.toUpperCase()} ${config.url}`);
    
    try {
      // Race protection: if getSession hangs, don't block the whole app.
      // 5s limit for session retrieval in the interceptor.
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session retrieval timeout')), 5000)
      );

      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      } else {
        // Only log warning if it's not a public route
        if (!config.url?.includes('/auth/') && !config.url?.includes('/demo/')) {
          console.warn(`[API ${requestId}] No active session for protected route: ${config.url}`);
        }
      }
    } catch (error: any) {
      console.error(`[API ${requestId}] Auth Interceptor Error/Timeout for ${config.url}:`, error.message);
      // We still return config to let the request proceed (it will likely 401, 
      // but that's better than hanging the UI forever).
    }
    
    // console.log(`[API Request ${requestId}] Interceptor finished in ${Date.now() - startTime}ms`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor for Global Error Handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    let title = "Error";
    let message = "An unexpected error occurred";

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;
      message = data?.error || data?.message || message;

      if (data?.details && Array.isArray(data.details)) {
        message = `${message}:\n• ${data.details.join('\n• ')}`;
      }

      switch (status) {
        case 400:
          title = "Invalid Request";
          break;
        case 401:
          title = "Unauthorized";
          message = "Please sign in again.";

          const skipSignOut = (error.config as InternalAxiosRequestConfig & { skipErrorToast?: boolean })?.skipErrorToast;

          // Trigger global sign-out to clear state and redirect
          // We do NOT show a toast here to avoid spam/race conditions during logout.
          // Only sign out if this was a critical request (not marked skipErrorToast)
          // AND it actually attempted to use a token (if no Authorization header was present
          //   it means it was a premature request, not an invalid session).
          if (!skipSignOut && error.config?.headers?.Authorization) {
            console.warn("[API] 401 received with token. Checking session before triggering global signOut.");
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session) {
                console.warn("[API] Session still exists but 401 received. Triggering signOut.");
                supabase.auth.signOut().catch(e => console.warn("SignOut error:", e));
              } else {
                console.log("[API] 401 received but session is already gone. Skipping signOut.");
              }
            });
          } else {
            console.log("[API] 401 received but skipped signOut due to skipErrorToast or missing token.");
          }
          return Promise.reject({ ...error, isAuthError: true });
        case 403:
          title = "Permission Denied";
          message = "You don't have access to this resource.";
          break;
        case 404:
          title = "Not Found";
          // Only use default if no specific message came from backend
          if (!data?.error && !data?.message) {
            message = "The requested resource was not found.";
          }
          break;
        case 500:
          title = "Server Error";
          // Only overwrite if no specific message came from backend
          if (!data?.error && !data?.message) {
            message = "Something went wrong on our end.";
          }
          break;
      }
    } else if (error.request) {
      if (error.code === 'ECONNABORTED') {
        title = "Timeout Error";
        message = "The request took too long to respond. Please try again.";
      } else {
        title = "Network Error";
        message = `Could not connect to the server at ${baseURL}. Please ensure the backend is running.`;
      }
    } else {
      message = error.message;
    }

    // Enhanced Logging
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    console.error(`[API Error] ${method} ${url} (${error.response?.status || 'Network'}):`, message);

    // Only show toast if it's not a "cancelled" request, NOT a 401 (handled by AuthContext),
    // and the caller hasn't opted out via `skipErrorToast: true`.
    const skipToast = (error.config as InternalAxiosRequestConfig & { skipErrorToast?: boolean })?.skipErrorToast;
    if (error.message !== 'canceled' && error.response?.status !== 401 && !skipToast) {
      showError(title, message);
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
