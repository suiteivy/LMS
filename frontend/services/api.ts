import { Platform } from "react-native";
import axios, { AxiosInstance } from "axios";

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
    return "http://10.0.2.2:4000";
  }

  // Default for iOS simulator and other platforms
  return "http://localhost:4000";
};

/**
 * To Do:
 * Axios instance configured with appropriate base URL and default headers
 * Automatically handles different environments (production/development)
 * and platforms (iOS/Android)
 */
export const api: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000, // Added: 10 second timeout to prevent hanging requests
  headers: {
    "Content-Type": "application/json",
    // Added common headers that might be needed
    Accept: "application/json",
  },
});
