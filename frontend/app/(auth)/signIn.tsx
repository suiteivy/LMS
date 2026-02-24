import { FullScreenLoader } from "@/components/common/FullScreenLoader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { getAuthErrorMessage, validateEmail } from "@/utils/validation";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Sparkles } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const IconFontAwesome = FontAwesome as any;
const IconIonicons = Ionicons as any;

interface FormData {
  email: string;
  password: string;
}

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formData, setFormData] = useState<FormData>({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signIn } = useAuth();

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const formFade = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(20)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.timing(formFade, { toValue: 1, duration: 800, delay: 300, useNativeDriver: true }),
      Animated.timing(formSlide, { toValue: 0, duration: 600, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const pulse = Animated.loop(Animated.sequence([
        Animated.timing(btnPulse, { toValue: 1.02, duration: 2000, useNativeDriver: true }),
        Animated.timing(btnPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]));
      pulse.start();
      return () => pulse.stop();
    }
  }, [isLoading]);

  const showMessage = (msg: string, success: boolean) => {
    setMessage(msg);
    setIsSuccess(success);
    setIsModalVisible(true);
    setTimeout(() => setIsModalVisible(false), 2000);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (errorMessage) setErrorMessage(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error, data } = await signIn(formData.email, formData.password);

      if (error) {
        setErrorMessage(getAuthErrorMessage(error));
        setIsLoading(false);
        return;
      }

      if (!data?.user) {
        setErrorMessage("No user data returned");
        setIsLoading(false);
        return;
      }

      interface UserRow { role: string; full_name: string; id: string; institution_id: string; }
      const { data: userData, error: roleError } = await supabase
        .from("users")
        .select("role, full_name, id, institution_id")
        .eq("id", data.user.id)
        .single() as { data: UserRow | null; error: any };

      if (roleError || !userData) {
        setErrorMessage("Could not fetch user role");
        setIsLoading(false);
        return;
      }

      if (!userData?.role) {
        setErrorMessage("No role assigned to user.");
        setIsLoading(false);
        return;
      }

      showMessage(`👋 Welcome back, ${userData.full_name || "there"}!`, true);

      setTimeout(() => {
        switch (userData.role) {
          case "admin": router.replace("/(admin)"); break;
          case "teacher": router.replace("/(teacher)"); break;
          case "student": router.replace("/(student)"); break;
          case "parent": router.replace("/(parent)" as any); break;
          default: setErrorMessage("Unrecognized user role: " + userData.role); break;
        }
      }, 2000);
    } catch (error: unknown) {
      setErrorMessage(
        "An unexpected error occurred: " +
        (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: "#ffffff" }}>
          <SafeAreaView style={{ flex: 1, width: "100%", maxWidth: 500, alignSelf: "center", backgroundColor: "#ffffff" }}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              <Animated.View style={{ padding: 32, opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

                {/* Header row */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", position: "relative", height: 40, marginBottom: 40 }}>
                  <TouchableOpacity
                    onPress={() => router.replace("/")}
                    activeOpacity={0.7}
                    style={{ position: "absolute", left: 0, width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#f3f4f6" }}
                  >
                    <IconIonicons name="arrow-back" size={20} color="#6b7280" />
                  </TouchableOpacity>
                  <Text style={{ color: "#9ca3af", fontWeight: "700", textTransform: "uppercase", letterSpacing: 3, fontSize: 10 }}>
                    Auth Portal
                  </Text>
                </View>

                {/* Hero text */}
                <View style={{ alignItems: "center", marginBottom: 40 }}>
                  <Text style={{ fontSize: 36, color: "#111827", fontWeight: "700", letterSpacing: -1, textAlign: "center" }}>
                    Welcome Back
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontSize: 36, color: "#9ca3af", fontWeight: "300", letterSpacing: -1 }}>
                      to your account
                    </Text>
                    <Text style={{ fontSize: 36, color: "#FF6B00", fontWeight: "700" }}>.</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: "#4b5563", marginTop: 12, textAlign: "center", lineHeight: 20, paddingHorizontal: 16, fontWeight: "500" }}>
                    Enter your credentials to securely access your dashboard.
                  </Text>
                </View>

                {/* Error message */}
                {errorMessage && (
                  <View style={{ backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fee2e2", padding: 16, borderRadius: 16, marginBottom: 24, flexDirection: "row", alignItems: "center" }}>
                    <IconIonicons name="alert-circle" size={20} color="#ef4444" />
                    <Text style={{ color: "#dc2626", marginLeft: 8, fontWeight: "600", flex: 1 }}>{errorMessage}</Text>
                  </View>
                )}

                {/* Email */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, marginLeft: 4 }}>
                    Email Address
                  </Text>
                  <View style={{ height: 56, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: errors.email ? "#ef4444" : "#f3f4f6", borderRadius: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" }}>
                    <IconIonicons name="mail-outline" size={20} color="#9ca3af" />
                    <TextInput
                      keyboardType="email-address"
                      style={{ flex: 1, marginLeft: 12, color: "#111827", fontWeight: "600", height: "100%" }}
                      placeholder="name@example.com"
                      placeholderTextColor="#9ca3af"
                      value={formData.email}
                      onChangeText={(v) => handleInputChange("email", v)}
                      autoCapitalize="none"
                    />
                  </View>
                  {errors.email && (
                    <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4, marginLeft: 4, fontWeight: "700", fontStyle: "italic" }}>{errors.email}</Text>
                  )}
                </View>

                {/* Password */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, marginLeft: 4 }}>
                    Password
                  </Text>
                  <View style={{ height: 56, backgroundColor: "#f9fafb", borderWidth: 1, borderColor: errors.password ? "#ef4444" : "#f3f4f6", borderRadius: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" }}>
                    <IconIonicons name="lock-closed-outline" size={20} color="#9ca3af" />
                    <TextInput
                      style={{ flex: 1, marginLeft: 12, color: "#111827", fontWeight: "600", height: "100%" }}
                      placeholder="••••••••"
                      secureTextEntry={!showPassword}
                      placeholderTextColor="#9ca3af"
                      value={formData.password}
                      onChangeText={(v) => handleInputChange("password", v)}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <IconIonicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                  {errors.password && (
                    <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4, marginLeft: 4, fontWeight: "700", fontStyle: "italic" }}>{errors.password}</Text>
                  )}
                </View>

                {/* Forgot password */}
                <TouchableOpacity onPress={() => router.push("/forgot-password" as any)} style={{ marginTop: 16, alignSelf: "flex-end" }}>
                  <Text style={{ color: "#FF6B00", fontWeight: "700", fontSize: 14 }}>Forgot password?</Text>
                </TouchableOpacity>

                {/* Sign in button */}
                <Animated.View style={{ transform: [{ scale: btnPulse }], marginTop: 40 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: "#FF6B00", height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", shadowColor: "#FF6B00", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
                    onPress={onSubmit}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 18 }}>Sign In</Text>
                  </TouchableOpacity>
                </Animated.View>

                {/* Divider */}
                <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 28 }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: "#f3f4f6" }} />
                  <Text style={{ color: "#9ca3af", fontSize: 12, fontWeight: "600", marginHorizontal: 16 }}>OR</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "#f3f4f6" }} />
                </View>

                {/* Demo CTA */}
                <TouchableOpacity
                  style={{ height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: "#f3f4f6", backgroundColor: "#f9fafb", justifyContent: "center", alignItems: "center", flexDirection: "row" }}
                  onPress={() => router.push('/demo' as any)}
                  activeOpacity={0.8}
                >
                  <Sparkles size={16} color="#FF6B00" />
                  <Text style={{ color: "#374151", fontWeight: "700", fontSize: 14, marginLeft: 8 }}>
                    Try Interactive Demo
                  </Text>
                </TouchableOpacity>

              </Animated.View>
            </ScrollView>
          </SafeAreaView>
        </View>
        <FullScreenLoader visible={isLoading} message="Signing in..." />
      </SafeAreaProvider>
    </>
  );
}