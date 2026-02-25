// lib/supabaseClient.ts
import { Database } from "@/types/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Helper to resolve backend API base URL (mirrors logic in api.ts)
const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_URL;
  if (envUrl) return envUrl;
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:4001/api`;
  }
  if (Platform.OS === 'android') return 'http://10.0.2.2:4001/api';
  return 'http://localhost:4001/api';
};


const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const storageAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      return window.localStorage.setItem(key, value);
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      return window.localStorage.removeItem(key);
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth service functions
export const authService = {
  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Sign out
  signOut: async () => {
    try {
      // 1. Try to notify backend to clean up trial session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        try {
          await fetch(`${getApiBaseUrl()}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            }
          });
        } catch (e) {
          console.warn("Backend logout failed", e);
          // Continue to local sign out anyway
        }
      }

      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error };
    }
  },

  // Get current user profile
  getCurrentUserProfile: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return { data: null, error: "No user found" };

      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      return { data: profile, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update user profile
  updateProfile: async (
    updates: Database["public"]["Tables"]["users"]["Update"]
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Update role-specific profile (students, teachers, parents table)
  updateRoleProfile: async (
    table: "students" | "teachers" | "parents",
    updates: Record<string, any>
  ) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  },

  // Reset password
  resetPassword: async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (error) {
      return { error };
    }
  },

  // Check if user exists in users table
  checkUserExists: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .single();

      return { exists: !!data, error };
    } catch (error) {
      return { exists: false, error };
    }
  },

  // Start a demo session
  startDemoSession: async (role: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/demo/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { data: null, error: data.error || "Failed to start demo" };
      }

      // Manually set the session in Supabase client
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: data.token,
        refresh_token: data.refreshToken,
      });

      if (sessionError) return { data: null, error: sessionError };

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message || "Network error" };
    }
  },
};
