import { FullScreenLoader } from "@/components/common/FullScreenLoader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { getAuthErrorMessage, validateEmail } from "@/utils/validation";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Shield, Sparkles, GraduationCap } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing as EasingRN,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Reanimated from "react-native-reanimated";

const IconIonicons = Ionicons as any;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Floating animated orb ──────────────────────────────────────────────────
const FloatingOrb = ({
  size,
  color,
  top,
  left,
  duration,
  delay,
}: {
  size: number;
  color: string;
  top?: any;
  left?: any;
  duration: number;
  delay: number;
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-24, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: duration * 0.8 }),
        withTiming(0.5, { duration: duration * 0.8 })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View
      style={[
        {
          position: "absolute",
          top,
          left,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        { filter: "blur(50px)" } as any,
        animStyle,
      ]}
    />
  );
};

// ─── Animated input field ───────────────────────────────────────────────────
const AnimatedInput = ({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  label,
  error,
  suffix,
}: any) => {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
      Animated.spring(iconScale, { toValue: 1.15, useNativeDriver: true, friction: 4 }),
    ]).start();
  };

  const onBlur = () => {
    setFocused(false);
    Animated.parallel([
      Animated.timing(borderAnim, { toValue: 0, duration: 250, useNativeDriver: false }),
      Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
  };

  const animatedBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.12)",
      error ? "rgba(239,68,68,0.9)" : "rgba(255,107,0,0.8)",
    ],
  });

  const glowOpacity = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: focused
            ? "rgba(255,107,0,0.9)"
            : error
              ? "rgba(239,68,68,0.8)"
              : "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: 2,
          marginBottom: 8,
          marginLeft: 2,
        } as any}
      >
        {label}
      </Text>

      {/* Input wrapper — positioned so the animated border overlays don't affect layout */}
      <View style={{ position: "relative" }}>
        {/* Glow ring — animated opacity only */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -3, left: -3, right: -3, bottom: -3,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: error ? "rgba(239,68,68,0.4)" : "rgba(255,107,0,0.35)",
            opacity: glowOpacity,
          } as any}
        />
        {/* Animated border ring — isolated so it doesn't conflict with backgroundColor */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: animatedBorderColor,
          } as any}
        />
        {/* Plain View for content — background colour change is instant/state-driven */}
        <View
          style={{
            height: 56,
            backgroundColor: focused ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)",
            borderRadius: 16,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <IconIonicons
              name={icon}
              size={20}
              color={
                focused
                  ? "rgba(255,107,0,0.9)"
                  : error
                    ? "rgba(239,68,68,0.7)"
                    : "rgba(255,255,255,0.35)"
              }
            />
          </Animated.View>
          <TextInput
            style={{
              flex: 1,
              marginLeft: 12,
              color: "#ffffff",
              fontWeight: "600",
              fontSize: 15,
              height: "100%",
            } as any}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.2)"
            value={value}
            onChangeText={onChangeText}
            onFocus={onFocus}
            onBlur={onBlur}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
          />
          {suffix}
        </View>
      </View>

      {error && (
        <Animated.View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 6, marginLeft: 4 }}
        >
          <IconIonicons name="alert-circle" size={13} color="rgba(252,165,165,0.9)" />
          <Text style={{ color: "rgba(252,165,165,0.9)", fontSize: 12, marginLeft: 4, fontWeight: "600" }}>
            {error}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

// ─── Password Strength Bar ──────────────────────────────────────────────────
const PasswordStrength = ({ password }: { password: string }) => {
  if (!password) return null;

  const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strength = getStrength(password);
  const configs = [
    { label: "Weak", color: "#ef4444" },
    { label: "Fair", color: "#f97316" },
    { label: "Good", color: "#eab308" },
    { label: "Strong", color: "#22c55e" },
  ];
  const current = configs[strength - 1] || configs[0];

  return (
    <View style={{ marginTop: -8, marginBottom: 16, paddingHorizontal: 2 }}>
      <View style={{ flexDirection: "row", gap: 5, marginBottom: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 4,
              backgroundColor: i <= strength ? current.color : "rgba(255,255,255,0.1)",
              transition: "background-color 0.3s",
            } as any}
          />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: current.color, fontWeight: "700", letterSpacing: 0.5 }}>
        {current.label} password
      </Text>
    </View>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
interface FormData {
  email: string;
  password: string;
}

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { signIn } = useAuth();

  // ── Entrance animations ──
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(50)).current;
  const logoSpin = useRef(new Animated.Value(0)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const toastY = useRef(new Animated.Value(-80)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Staggered field anims
  const field1 = useRef(new Animated.Value(0)).current;
  const field2 = useRef(new Animated.Value(0)).current;
  const field3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Card entrance
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }),
    ]).start(() => {
      // Stagger fields
      Animated.stagger(120, [
        Animated.spring(field1, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.spring(field2, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.spring(field3, { toValue: 1, useNativeDriver: true, friction: 7 }),
      ]).start();
    });

    // Logo idle spin
    const spin = Animated.loop(
      Animated.sequence([
        Animated.timing(logoSpin, { toValue: 1, duration: 8000, useNativeDriver: true, easing: EasingRN.linear }),
        Animated.timing(logoSpin, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    spin.start();

    // Logo idle pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();

    return () => {
      spin.stop();
      pulse.stop();
    };
  }, []);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    Animated.parallel([
      Animated.spring(toastY, { toValue: 0, useNativeDriver: true, friction: 7 }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastY, { toValue: -80, duration: 400, useNativeDriver: true }),
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setSuccessMsg(null));
    }, 2500);
  };

  const shakeCard = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const pressBtn = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (errorMessage) setErrorMessage(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = "Email is required";
    else if (!validateEmail(formData.email)) newErrors.email = "Please enter a valid email";
    if (!formData.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async () => {
    pressBtn();
    if (!validateForm()) {
      shakeCard();
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error, data } = await signIn(formData.email, formData.password);

      if (error) {
        setErrorMessage(getAuthErrorMessage(error));
        shakeCard();
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

      showToast(`👋 Welcome back, ${userData.full_name || "there"}!`);

      setTimeout(() => {
        switch (userData.role) {
          case "admin": router.replace("/(admin)"); break;
          case "teacher": router.replace("/(teacher)"); break;
          case "student": router.replace("/(student)"); break;
          case "parent": router.replace("/(parent)" as any); break;
          default: setErrorMessage("Unrecognized user role: " + userData.role); break;
        }
      }, 2200);
    } catch (error: unknown) {
      setErrorMessage(
        "An unexpected error occurred: " +
        (error instanceof Error ? error.message : String(error))
      );
      shakeCard();
    } finally {
      setIsLoading(false);
    }
  };

  const spinDeg = logoSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const fieldStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  });

  return (
    <>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: "#0F0B2E" }}>
          {/* ─── Animated background orbs ─── */}
          <FloatingOrb size={320} color="rgba(255,107,0,0.09)" top="-5%" left="-15%" duration={5000} delay={0} />
          <FloatingOrb size={260} color="rgba(99,102,241,0.12)" top="55%" left="60%" duration={6500} delay={500} />
          <FloatingOrb size={200} color="rgba(236,72,153,0.08)" top="30%" left="70%" duration={4500} delay={1000} />
          <FloatingOrb size={180} color="rgba(59,130,246,0.08)" top="70%" left="-5%" duration={7000} delay={300} />

          {/* ─── Success toast ─── */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 999,
              alignItems: "center",
              paddingTop: 60,
              transform: [{ translateY: toastY }],
              opacity: toastOpacity,
            }}
          >
            <View style={{
              backgroundColor: "rgba(34,197,94,0.2)",
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.4)",
              borderRadius: 16,
              paddingHorizontal: 24,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              shadowColor: "#22c55e",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
            }}>
              <IconIonicons name="checkmark-circle" size={22} color="#4ade80" />
              <Text style={{ color: "#4ade80", fontWeight: "700", fontSize: 15 }}>
                {successMsg}
              </Text>
            </View>
          </Animated.View>

          <SafeAreaView style={{ flex: 1, width: "100%", maxWidth: 500, alignSelf: "center" }}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={60}
            >
              <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* ─── Card ─── */}
                <Animated.View
                  style={{
                    opacity: cardFade,
                    transform: [{ translateY: cardSlide }, { translateX: shakeX }],
                    backgroundColor: "rgba(255,255,255,0.045)",
                    borderRadius: 32,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.09)",
                    padding: 32,
                    ...(Platform.OS === "web" ? {
                      backdropFilter: "blur(24px)",
                      boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset",
                    } : {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 24 },
                      shadowOpacity: 0.5,
                      shadowRadius: 48,
                    }),
                  } as any}
                >
                  {/* Header row */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", position: "relative", height: 44, marginBottom: 36 }}>
                    <TouchableOpacity
                      onPress={() => router.replace("/")}
                      activeOpacity={0.7}
                      style={{
                        position: "absolute",
                        left: 0,
                        width: 42,
                        height: 42,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 14,
                        backgroundColor: "rgba(255,255,255,0.07)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.1)",
                      }}
                    >
                      <IconIonicons name="arrow-back" size={20} color="rgba(255,255,255,0.65)" />
                    </TouchableOpacity>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {/* Animated logo */}
                      <Animated.View style={{
                        width: 32, height: 32, borderRadius: 10,
                        backgroundColor: "rgba(255,107,0,0.2)",
                        borderWidth: 1, borderColor: "rgba(255,107,0,0.4)",
                        alignItems: "center", justifyContent: "center",
                        transform: [{ scale: logoPulse }],
                      }}>
                        <GraduationCap size={18} color="#FF6B00" />
                      </Animated.View>
                      <Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "700", textTransform: "uppercase", letterSpacing: 3, fontSize: 10 }}>
                        SuiteIvy
                      </Text>
                    </View>
                  </View>

                  {/* Hero text */}
                  <View style={{ alignItems: "center", marginBottom: 36 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                      <Text style={{ fontSize: 34, color: "#ffffff", fontWeight: "800", letterSpacing: -0.5 }}>
                        Welcome{" "}
                      </Text>
                      <Text style={{ fontSize: 34, color: "#FF6B00", fontWeight: "800", letterSpacing: -0.5 }}>
                        back
                      </Text>
                      <Text style={{ fontSize: 34, color: "rgba(255,255,255,0.25)", fontWeight: "300" }}>.</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 22, paddingHorizontal: 12 }}>
                      Sign in to securely access your dashboard
                    </Text>
                  </View>

                  {/* Error banner */}
                  {errorMessage && (
                    <Animated.View style={{
                      backgroundColor: "rgba(239,68,68,0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(239,68,68,0.3)",
                      padding: 14,
                      borderRadius: 14,
                      marginBottom: 20,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}>
                      <IconIonicons name="alert-circle" size={20} color="#f87171" />
                      <Text style={{ color: "#fca5a5", fontWeight: "600", flex: 1, fontSize: 13 }}>{errorMessage}</Text>
                    </Animated.View>
                  )}

                  {/* Email field */}
                  <Animated.View style={fieldStyle(field1)}>
                    <AnimatedInput
                      label="Email Address"
                      icon="mail-outline"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChangeText={(v: string) => handleInputChange("email", v)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={errors.email}
                    />
                  </Animated.View>

                  {/* Password field */}
                  <Animated.View style={fieldStyle(field2)}>
                    <AnimatedInput
                      label="Password"
                      icon="lock-closed-outline"
                      placeholder="••••••••"
                      value={formData.password}
                      onChangeText={(v: string) => handleInputChange("password", v)}
                      secureTextEntry={!showPassword}
                      error={errors.password}
                      suffix={
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={{ padding: 4 }}
                          activeOpacity={0.7}
                        >
                          <IconIonicons
                            name={showPassword ? "eye-outline" : "eye-off-outline"}
                            size={20}
                            color="rgba(255,255,255,0.35)"
                          />
                        </TouchableOpacity>
                      }
                    />
                  </Animated.View>

                  {/* Forgot password */}
                  <Animated.View style={[fieldStyle(field3), { alignItems: "flex-end", marginBottom: 28 }]}>
                    <TouchableOpacity
                      onPress={() => router.push("/forgot-password" as any)}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: "#FF6B00", fontWeight: "700", fontSize: 13 }}>
                        Forgot password?
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>

                  {/* Sign in button */}
                  <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                    <TouchableOpacity
                      onPress={onSubmit}
                      disabled={isLoading}
                      activeOpacity={0.85}
                      style={{
                        height: 58,
                        borderRadius: 18,
                        backgroundColor: "#FF6B00",
                        justifyContent: "center",
                        alignItems: "center",
                        overflow: "hidden",
                        ...(Platform.OS === "web" ? {
                          boxShadow: "0 12px 32px rgba(255,107,0,0.45), 0 2px 8px rgba(255,107,0,0.3)",
                        } : {
                          shadowColor: "#FF6B00",
                          shadowOffset: { width: 0, height: 10 },
                          shadowOpacity: 0.5,
                          shadowRadius: 20,
                          elevation: 8,
                        }),
                      } as any}
                    >
                      {/* Shimmer overlay */}
                      {Platform.OS === "web" && (
                        <View style={{
                          position: "absolute",
                          top: 0, left: 0, right: 0, bottom: 0,
                          background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
                          backgroundSize: "200% 100%",
                          animation: "shimmer 2.5s infinite",
                        } as any} />
                      )}

                      {isLoading ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                          <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
                          <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 17 }}>
                            Signing in…
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                          <Shield size={18} color="rgba(255,255,255,0.85)" />
                          <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 17, letterSpacing: 0.3 }}>
                            Sign In Securely
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>

                  {/* Security note */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 14, gap: 6 }}>
                    <IconIonicons name="lock-closed" size={11} color="rgba(255,255,255,0.25)" />
                    <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: "600" }}>
                      256-bit encrypted · Secured by Supabase
                    </Text>
                  </View>

                  {/* Divider */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 28 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
                    <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: "700", marginHorizontal: 16, letterSpacing: 1 }}>OR</Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
                  </View>

                  {/* Demo CTA */}
                  <TouchableOpacity
                    style={{
                      height: 52,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: "rgba(255,255,255,0.1)",
                      backgroundColor: "rgba(255,255,255,0.04)",
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "row",
                      gap: 10,
                    }}
                    onPress={() => router.push("/demo" as any)}
                    activeOpacity={0.75}
                  >
                    <Sparkles size={16} color="#FF6B00" />
                    <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700", fontSize: 14 }}>
                      Try Interactive Demo
                    </Text>
                  </TouchableOpacity>

                </Animated.View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>

        {/* Shimmer keyframe for web */}
        {Platform.OS === "web" && (
          <style>{`
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        )}

        <FullScreenLoader visible={isLoading} message="Signing in..." />
      </SafeAreaProvider>
    </>
  );
}
