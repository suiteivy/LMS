import { Platform } from "react-native";
import axios, { AxiosInstance, AxiosError } from "axios";
import { showError } from "../utils/toast";

import { supabase } from "@/libs/supabase";

/**
 * To Do:
 * Determine the appropriate base URL for API calls based on environment and platform
 * Priority: Environment variable -> Platform-specific defaults
 * @returns {string} The base URL for API requests
 */
const getBaseUrl = (): string => {
  // First priority: Use environment variable if available
  const envUrl: string | undefined = process.env.EXPO_PUBLIC_URL;

  if (envUrl) {
    return envUrl;
  }

  // Platform-specific defaults for development
  if (Platform.OS === "android") {
    // Android emulator uses this special IP to access host machine's localhost
    return "http://10.0.2.2:4001/api";
  }

  // Default for iOS simulator and other platforms
  return "http://localhost:4001/api";
};

/**
 * To Do:
 * Axios instance configured with appropriate base URL and default headers
 * Automatically handles different environments (production/development)
 * and platforms (iOS/Android)
 */
const baseURL = getBaseUrl();
console.log("API Base URL:", baseURL);
console.log("Loaded EXPO_PUBLIC_URL:", process.env.EXPO_PUBLIC_URL);

export const api: AxiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor: Inject Auth Token
api.interceptors.request.use(
  async (config) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        // console.log("Attaching auth token to request:", config.url);
        config.headers.Authorization = `Bearer ${session.access_token}`;
      } else {
        console.warn("No active session found for request:", config.url);
      }
    } catch (error) {
      console.error("Error fetching session for API request:", error);
    }
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

      switch (status) {
        case 400:
          title = "Invalid Request";
          break;
        case 401:
          title = "Unauthorized";
          message = "Please sign in again.";
          // Trigger global sign-out to clear state and redirect
          supabase.auth.signOut().catch(e => console.error("Error signing out after 401:", e));
          break;
        case 403:
          title = "Permission Denied";
          message = "You don't have access to this resource.";
          break;
        case 404:
          title = "Not Found";
          message = "The requested resource was not found.";
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
      title = "Network Error";
      message = "Could not connect to the server. Please check your internet connection.";
    } else {
      message = error.message;
    }

    // Enhanced Logging
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    console.error(`[API Error] ${method} ${url} (${error.response?.status || 'Network'}):`, message);

    // Only show toast if it's not a "cancelled" request or specific silences
    if (error.message !== 'canceled') {
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
