// lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { Database } from "@/types/database";

// Storage adapter for React Native
const asyncStorageAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

// Safe localStorage adapter for Web
const safeLocalStorage = {
  getItem: (key: string) => {
    if (typeof window !== "undefined" && window.localStorage)
      return window.localStorage.getItem(key);
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== "undefined" && window.localStorage)
      return window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window !== "undefined" && window.localStorage)
      return window.localStorage.removeItem(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? safeLocalStorage : asyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth service functions
export const authService = {
  // Sign up with email and password
  signUp: async (
    email: string,
    password: string,
    userData: {
      full_name: string;
      role: "admin" | "student" | "teacher";
      institution_id?: string;
    }
  ) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // Creating user profile in users table
        const { error: profileError } = await supabase.from("users").insert({
          id: authData.user.id,
          email: authData.user.email!,
          full_name: userData.full_name,
          role: userData.role,
          institution_id: userData.institution_id || null,
        });

        if (profileError) throw profileError;
      }

      return { data: authData, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

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
};
