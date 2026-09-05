import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { safeSignOut } from "@/utils/safeSignOut";
import { LogoutReason, LOGOUT_MESSAGES } from "@/types/logout";
import { getAuthErrorMessage, validateEmail } from "@/utils/validation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Shield, GraduationCap } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing as EasingRN,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LivingBackground } from "@/components/landing/LivingBackground";

const IconIonicons = Ionicons as any;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Design tokens (shared across all four elements) ──────────────────────────
const FLAME      = "#FF6B00";
const FLAME_DIM  = "rgba(255,107,0,0.8)";
const FLAME_GLOW = "rgba(255,107,0,0.35)";
const FLAME_BG   = "rgba(255,107,0,0.12)";
const GLASS_BG   = "rgba(8,5,28,0.72)";       // liquid glass card surface
const GLASS_BORDER = "rgba(255,255,255,0.09)";
const GLASS_TOP  = "rgba(255,255,255,0.13)";   // top highlight sheen
const INPUT_BG   = "rgba(255,255,255,0.04)";   // inset glass look
const INPUT_HOVER_BG = "rgba(255,255,255,0.07)";
const WHITE_DIM  = "rgba(255,255,255,0.35)";
const WHITE_FADE = "rgba(255,255,255,0.18)";

// ─── GlassInput — redesigned input with hover + focus states ─────────────────
const GlassInput = ({
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
  const [hovered, setHovered] = useState(false);

  // Animated values
  const focusAnim  = useRef(new Animated.Value(0)).current; // 0→1 on focus
  const hoverAnim  = useRef(new Animated.Value(0)).current; // 0→1 on hover
  const iconScale  = useRef(new Animated.Value(1)).current;
  const labelUp    = useRef(new Animated.Value(value ? 1 : 0)).current; // floating label

  // Keep label floated when value is pre-filled
  useEffect(() => {
    Animated.timing(labelUp, {
      toValue: value || focused ? 1 : 0,
      duration: 180,
      easing: EasingRN.out(EasingRN.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, focused]);

  const onFocus = () => {
    setFocused(true);
    Animated.parallel([
      Animated.timing(focusAnim, { toValue: 1, duration: 260, easing: EasingRN.out(EasingRN.quad), useNativeDriver: false }),
      Animated.spring(iconScale, { toValue: 1.18, useNativeDriver: true, friction: 4, tension: 120 }),
    ]).start();
  };

  const onBlur = () => {
    setFocused(false);
    Animated.parallel([
      Animated.timing(focusAnim, { toValue: 0, duration: 240, useNativeDriver: false }),
      Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }),
    ]).start();
  };

  const onHoverIn = () => {
    if (focused) return;
    setHovered(true);
    Animated.timing(hoverAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };

  const onHoverOut = () => {
    setHovered(false);
    Animated.timing(hoverAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
  };

  // Interpolated colours — border warms on hover, intensifies on focus
  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? "rgba(239,68,68,0.5)" : hovered ? "rgba(255,107,0,0.32)" : GLASS_BORDER,
      error ? "rgba(239,68,68,0.9)" : FLAME_DIM,
    ],
  });

  const outerGlowOpacity = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // Floating label interpolations
  const labelY    = labelUp.interpolate({ inputRange: [0, 1], outputRange: [0, -22] });
  const labelSize = labelUp.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.35)",
      error ? "rgba(239,68,68,0.9)" : "rgba(255,107,0,0.9)",
    ],
  });

  const iconColor = focused
    ? (error ? "rgba(239,68,68,0.9)" : FLAME)
    : error
      ? "rgba(239,68,68,0.7)"
      : WHITE_DIM;

  return (
    <View style={{ marginBottom: 28 }}>
      {/* Outer glow ring (focus only) */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -4, left: -4, right: -4, bottom: -4,
          borderRadius: 20,
          borderWidth: 1.5,
          borderColor: error ? "rgba(239,68,68,0.3)" : FLAME_GLOW,
          opacity: outerGlowOpacity,
        } as any}
      />


      {/* Animated border */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: 16,
          borderWidth: 1,
          borderColor,
        } as any}
      />

      {/* Main input surface */}
      <Pressable
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        style={{
          height: 60,
          backgroundColor: "transparent",
          borderRadius: 16,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
          ...(Platform.OS === "web" ? { outline: "none" } : {}),
        } as any}
      >
        {/* Top-edge micro-highlight (emboss) */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0, left: 12, right: 12,
            height: 1,
            backgroundColor: WHITE_FADE,
            borderRadius: 1,
          }}
        />

        {/* Floating label */}
        <Animated.Text
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 52,
            top: 19,
            fontSize: labelSize,
            color: labelColor,
            fontWeight: "600",
            letterSpacing: 0.3,
            transform: [{ translateY: labelY }],
            zIndex: 2,
          } as any}
        >
          {label}
        </Animated.Text>

        {/* Icon */}
        <Animated.View style={{ transform: [{ scale: iconScale }], zIndex: 3 }}>
          <IconIonicons name={icon} size={20} color={iconColor} />
        </Animated.View>

        {/* Text input */}
        <TextInput
          style={{
            flex: 1,
            marginLeft: 12,
            color: "#ffffff",
            fontWeight: "500",
            fontSize: 15,
            paddingTop: value || focused ? 10 : 0,
            backgroundColor: "transparent",
            outline: "none",
            zIndex: 3,
          } as any}
          placeholder={value || focused ? placeholder : ""}
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
        {suffix && <View style={{ zIndex: 3 }}>{suffix}</View>}
      </Pressable>


      {/* Error message */}
      {error && (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, marginLeft: 2 }}>
          <IconIonicons name="alert-circle" size={13} color="rgba(252,165,165,0.9)" />
          <Text style={{ color: "rgba(252,165,165,0.9)", fontSize: 12, marginLeft: 4, fontWeight: "600" }}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── ForgotLink — animated underline draw on hover ───────────────────────────
const ForgotLink = ({ onPress }: { onPress: () => void }) => {
  const underlineAnim = useRef(new Animated.Value(0)).current;

  const onHoverIn = () =>
    Animated.timing(underlineAnim, {
      toValue: 1,
      duration: 280,
      easing: EasingRN.out(EasingRN.cubic),
      useNativeDriver: true,
    }).start();

  const onHoverOut = () =>
    Animated.timing(underlineAnim, {
      toValue: 0,
      duration: 180,
      easing: EasingRN.in(EasingRN.quad),
      useNativeDriver: true,
    }).start();

  const scaleX = underlineAnim; // 0 → 1, origin left

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      style={[
        { alignItems: "flex-start" },
        Platform.OS === "web" ? { cursor: "pointer" } as any : {},
      ]}
    >
      <Text style={{ color: FLAME, fontWeight: "700", fontSize: 13 }}>
        Forgot password?
      </Text>
      {/* Underline draws left→right on hover */}
      <View style={{ height: 1.5, width: "100%", overflow: "hidden" }}>
        <Animated.View
          style={{
            height: "100%",
            width: "100%",
            backgroundColor: FLAME,
            transform: [{ scaleX }, { translateX: underlineAnim.interpolate({ inputRange: [0, 1], outputRange: ["-50%", "0%"] }) }],
            transformOrigin: "left",
            borderRadius: 1,
            ...(Platform.OS === "web" ? { boxShadow: `0 0 6px ${FLAME_GLOW}` } : {}),
          } as any}
        />
      </View>
    </Pressable>
  );
};

// ─── PrimaryButton — gradient + animated loading state ───────────────────────
const PrimaryButton = ({
  onPress,
  loading,
  scale,
}: {
  onPress: () => void;
  loading: boolean;
  scale: Animated.Value;
}) => {
  const [hovered, setHovered] = useState(false);
  const hoverAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const sweepAnim  = useRef(new Animated.Value(-1)).current;

  // Idle glow pulse
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1600, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Hover shine sweep
  useEffect(() => {
    if (hovered) {
      sweepAnim.setValue(-1);
      Animated.timing(sweepAnim, {
        toValue: 2,
        duration: 600,
        easing: EasingRN.out(EasingRN.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [hovered]);

  const onHoverIn = () => {
    setHovered(true);
    Animated.timing(hoverAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };

  const onHoverOut = () => {
    setHovered(false);
    Animated.timing(hoverAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const hoverBgColor = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,107,0,0)", "rgba(255,140,64,0.18)"],
  });

  const sweepTranslateX = sweepAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-300, 300],
  });

  // Pop-out lift: smoothly floats up 4px on hover
  const hoverLiftY = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  });
  const hoverScalePop = hoverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });

  return (
    <Animated.View
      style={{
        transform: [{ scale }, { translateY: hoverLiftY }, { scale: hoverScalePop }],
        borderRadius: 20,
        overflow: "hidden",
        alignSelf: "center",
        width: "88%",
      }}
    >
      {/* Outer ambient glow — pulses softly */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -6, left: -6, right: -6, bottom: -6,
          borderRadius: 26,
          backgroundColor: "rgba(255,107,0,0.18)",
          transform: [{ scale: pulseAnim }],
        } as any}
      />

      <Pressable
        onPress={loading ? undefined : onPress}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        style={[
          {
            height: 60,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            position: "relative",
            ...(Platform.OS === "web" ? {
              background: loading
                ? "rgba(255,107,0,0.5)"
                : "linear-gradient(135deg, #FF8C40 0%, #FF6B00 45%, #E85D00 100%)",
              boxShadow: hovered && !loading
                ? "0 0 0 1px rgba(255,140,64,0.5), 0 16px 40px rgba(255,107,0,0.55), 0 4px 12px rgba(255,107,0,0.4)"
                : "0 12px 32px rgba(255,107,0,0.4), 0 2px 8px rgba(255,107,0,0.3)",
              transition: "box-shadow 0.2s ease",
              cursor: loading ? "default" : "pointer",
            } : {
              backgroundColor: loading ? "rgba(255,107,0,0.55)" : FLAME,
              boxShadow: [{
                offsetX: 0, offsetY: 12, blurRadius: 28,
                color: "rgba(255,107,0,0.5)",
              }],
            }),
          } as any,
        ]}
      >
        {/* Top sheen highlight (always visible — adds depth) */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, height: "50%",
            backgroundColor: "rgba(255,255,255,0.12)",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        />

        {/* Hover sweep shine */}
        {Platform.OS === "web" && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0, bottom: 0,
              width: 80,
              backgroundColor: "rgba(255,255,255,0.22)",
              transform: [{ translateX: sweepTranslateX }, { skewX: "-18deg" } as any],
            }}
          />
        )}

        {/* Hover bg tint overlay */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: hoverBgColor,
          } as any}
        />

        {/* Content */}
        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 17 }}>
              Signing in…
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Shield size={18} color="rgba(255,255,255,0.92)" />
            <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 17, letterSpacing: 0.4 }}>
              Sign In
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// ─── LogoLockup — enhanced logo + name with entrance + idle animation ─────────
const LogoLockup = ({ entranceAnim }: { entranceAnim: Animated.Value }) => {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Gentle idle scale pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.1, duration: 2400, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 2400, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
      ])
    );
    // Glow breathe
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1, duration: 2000, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.4, duration: 2000, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
      ])
    );
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, []);

  const entranceOpacity = entranceAnim;
  const entranceTranslateY = entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] });

  return (
    <Animated.View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        opacity: entranceOpacity,
        transform: [{ translateY: entranceTranslateY }],
      }}
    >
      {/* Logo mark */}
      <View style={{ position: "relative", width: 38, height: 38 }}>
        {/* Ambient glow behind the badge */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -8, left: -8, right: -8, bottom: -8,
            borderRadius: 27,
            backgroundColor: FLAME_GLOW,
            opacity: glowOpacity,
            ...(Platform.OS === "web" ? { filter: "blur(8px)" } : {}),
          } as any}
        />
        {/* Badge */}
        <Animated.View
          style={{
            width: 38, height: 38, borderRadius: 12,
            backgroundColor: FLAME_BG,
            borderWidth: 1.5, borderColor: "rgba(255,107,0,0.5)",
            alignItems: "center", justifyContent: "center",
            transform: [{ scale: pulseScale }],
            ...(Platform.OS === "web" ? {
              boxShadow: "0 0 12px rgba(255,107,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
            } : {}),
          } as any}
        >
          <GraduationCap size={20} color={FLAME} />
        </Animated.View>
      </View>

      {/* App name */}
      <Text
        style={{
          color: "rgba(255,255,255,0.75)",
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 4,
          fontSize: 12,
        }}
      >
        Cloudora
      </Text>
    </Animated.View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface FormData {
  email: string;
  password: string;
}

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toastConfig, setToastConfig] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [logoutReason, setLogoutReason] = useState<LogoutReason | null>(null);
  const { signIn, loading: isGlobalLoading, maintenanceModeMessage, refreshMaintenanceStatus } = useAuth();

  // ── Entrance animations ──────────────────────────────────────────────────
  const cardFade    = useRef(new Animated.Value(0)).current;
  const cardSlide   = useRef(new Animated.Value(60)).current;
  const logoEntrance = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(1)).current;
  const shakeX      = useRef(new Animated.Value(0)).current;
  const toastY      = useRef(new Animated.Value(-80)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Staggered field anims
  const field1 = useRef(new Animated.Value(0)).current;
  const field2 = useRef(new Animated.Value(0)).current;
  const field3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo fades in first
    Animated.timing(logoEntrance, { toValue: 1, duration: 500, easing: EasingRN.out(EasingRN.cubic), useNativeDriver: true }).start();

    // Card rises up with a spring after a short delay
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 700, easing: EasingRN.out(EasingRN.quad), useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, useNativeDriver: true, friction: 8, tension: 55 }),
    ]).start(() => {
      // Fields stagger in
      Animated.stagger(100, [
        Animated.spring(field1, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
        Animated.spring(field2, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
        Animated.spring(field3, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
      ]).start();
    });

    // Persisted logout reason
    AsyncStorage.getItem("logout_reason").then((raw) => {
      if (raw && raw in LOGOUT_MESSAGES) {
        setLogoutReason(raw as LogoutReason);
        AsyncStorage.removeItem("logout_reason").catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToastConfig({ msg, type });
    Animated.parallel([
      Animated.spring(toastY, { toValue: 0, useNativeDriver: true, friction: 7 }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastY, { toValue: -80, duration: 400, useNativeDriver: true }),
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setToastConfig(null));
    }, 3000);
  };

  const shakeCard = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const pressBtn = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 140 }),
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
    setErrorMessage(null);

    try {
      const { error, data } = await signIn(formData.email, formData.password);

      if (error) {
        setErrorMessage(getAuthErrorMessage(error));
        shakeCard();
        return;
      }

      if (!data?.user) {
        setErrorMessage("No user data returned");
        return;
      }

      interface UserRow {
        role: string;
        full_name: string;
        id: string;
        institution_id: string;
        must_change_password?: boolean;
        requires_security_questions_setup?: boolean;
      }
      const { data: userData, error: roleError } = await supabase
        .from("users")
        .select("role, full_name, id, institution_id, must_change_password, requires_security_questions_setup")
        .eq("id", data.user.id)
        .single() as { data: UserRow | null; error: any };

      if (roleError || !userData) {
        setErrorMessage("Could not fetch user role");
        return;
      }

      if (!userData?.role) {
        setErrorMessage("No role assigned to user.");
        return;
      }

      // Global maintenance: allow platform admins, block institution users
      const maintenance = await refreshMaintenanceStatus();
      if (Platform.OS === "web" && maintenance.enabled && !!userData.institution_id) {
        showToast(maintenance.message || maintenanceModeMessage || "System maintenance is in progress. Please try again later.", "info");
        await safeSignOut("local", LogoutReason.UNKNOWN, true);
        shakeCard();
        return;
      }

      // --- Security Check: Validate Institution Status ---
      if (userData.role !== "master_admin" && userData.institution_id) {
        const { data: instData, error: instError } = await supabase
          .from("institutions")
          .select("subscription_status")
          .eq("id", userData.institution_id)
          .single() as { data: { subscription_status: string | null } | null; error: any };

        if (instError || !instData) {
          setErrorMessage("Could not verify institution status");
          await safeSignOut("local", LogoutReason.AUTH_ERROR_403, true);
          return;
        }

        // Master admin sets status to 'suspended' when disabling an institution
        if (instData.subscription_status === "suspended" || instData.subscription_status === "cancelled") {
          showToast("Access Denied: Your institution's account has been disabled.", "error");
          shakeCard();
          await safeSignOut("local", LogoutReason.INSTITUTION_SUSPENDED, true);
          return;
        }
      }

      showToast(`Welcome back, ${userData.full_name || "there"}!`);

      if ((userData as any).must_change_password || (userData as any).requires_security_questions_setup) {
        setTimeout(() => {
          router.replace("/(auth)/security-questions" as any);
        }, 200);
      }

      // Let AuthHandler detect session change and handle the transition
    } catch (error: unknown) {
      setErrorMessage(
        "An unexpected error occurred: " +
        (error instanceof Error ? error.message : String(error))
      );
      shakeCard();
    }
  };

  const fieldStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  });

  return (
    <>
      {/* Continuous living background — identical to landing page */}
      <LivingBackground />

      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        {/* Toast */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            zIndex: 999,
            alignItems: "center",
            paddingTop: 60,
            transform: [{ translateY: toastY }],
            opacity: toastOpacity,
          }}
        >
          <View style={{
            backgroundColor: toastConfig?.type === "error"
              ? "rgba(239,68,68,0.2)"
              : toastConfig?.type === "info"
                ? "rgba(59,130,246,0.2)"
                : "rgba(34,197,94,0.2)",
            borderWidth: 1,
            borderColor: toastConfig?.type === "error"
              ? "rgba(239,68,68,0.4)"
              : toastConfig?.type === "info"
                ? "rgba(59,130,246,0.45)"
                : "rgba(34,197,94,0.4)",
            borderRadius: 16,
            paddingHorizontal: 24,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            boxShadow: [{
              offsetX: 0, offsetY: 8, blurRadius: 16,
              color: toastConfig?.type === "error"
                ? "rgba(239,68,68,0.3)"
                : toastConfig?.type === "info"
                  ? "rgba(59,130,246,0.3)"
                  : "rgba(34,197,94,0.3)",
            }],
          } as any}>
            <IconIonicons
              name={toastConfig?.type === "error" ? "close-circle" : toastConfig?.type === "info" ? "information-circle" : "checkmark-circle"}
              size={22}
              color={toastConfig?.type === "error" ? "#f87171" : toastConfig?.type === "info" ? "#60a5fa" : "#4ade80"}
            />
            <Text style={{
              color: toastConfig?.type === "error" ? "#f87171" : toastConfig?.type === "info" ? "#60a5fa" : "#4ade80",
              fontWeight: "700", fontSize: 15,
            }}>
              {toastConfig?.msg}
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
              {/* ── LIQUID GLASS CARD ─────────────────────────────────── */}
              <Animated.View
                style={{
                  opacity: cardFade,
                  transform: [{ translateY: cardSlide }, { translateX: shakeX }],
                  borderRadius: 32,
                  overflow: "hidden",
                  ...(Platform.OS === "web" ? {
                    // Full liquid glass treatment on web
                    backdropFilter: "blur(32px) saturate(180%)",
                    WebkitBackdropFilter: "blur(32px) saturate(180%)",
                    background: `
                      linear-gradient(
                        160deg,
                        rgba(255,255,255,0.065) 0%,
                        rgba(8,5,28,0.72) 35%,
                        rgba(8,5,28,0.78) 100%
                      )
                    `,
                    boxShadow: [
                      "0 0 0 1px rgba(255,255,255,0.09)",           // outer border
                      "inset 0 1px 0 rgba(255,255,255,0.14)",       // top sheen
                      "inset 0 -1px 0 rgba(0,0,0,0.2)",            // bottom depth
                      "inset 1px 0 0 rgba(255,255,255,0.07)",       // left edge
                      "0 32px 80px rgba(0,0,0,0.6)",               // drop shadow
                      "0 0 60px rgba(255,107,0,0.06)",              // ambient flame glow
                    ].join(", "),
                  } : {
                    backgroundColor: GLASS_BG,
                    borderWidth: 1,
                    borderColor: GLASS_BORDER,
                    boxShadow: [{
                      offsetX: 0, offsetY: 28, blurRadius: 60,
                      color: "rgba(0,0,0,0.6)",
                    }],
                  }),
                } as any}
              >
                {/* Top refraction sheen overlay — gives the glass "depth" */}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0,
                    height: 80,
                    borderTopLeftRadius: 32,
                    borderTopRightRadius: 32,
                    ...(Platform.OS === "web" ? {
                      background: "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 100%)",
                    } : {
                      backgroundColor: "rgba(255,255,255,0.05)",
                    }),
                  } as any}
                />

                {/* Orange accent line at the very top edge */}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 0, left: 32, right: 32,
                    height: 1,
                    backgroundColor: "rgba(255,107,0,0.3)",
                    borderRadius: 1,
                  }}
                />

                {/* Card content */}
                <View style={{ padding: 32 }}>

                  {/* ── HEADER ROW ──────────────────────────────────── */}
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    height: 48,
                    marginBottom: 32,
                  }}>
                    {/* Back button */}
                    <TouchableOpacity
                      onPress={() => router.replace("/")}
                      activeOpacity={0.7}
                      style={{
                        position: "absolute", left: 0,
                        width: 42, height: 42,
                        alignItems: "center", justifyContent: "center",
                        borderRadius: 14,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        borderWidth: 1,
                        borderColor: GLASS_BORDER,
                      }}
                    >
                      <IconIonicons name="arrow-back" size={20} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>

                    {/* Logo lockup */}
                    <LogoLockup entranceAnim={logoEntrance} />
                  </View>

                  {/* ── HERO TEXT ────────────────────────────────────── */}
                  <View style={{ alignItems: "center", marginBottom: 36 }}>
                    <View style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 6 }}>
                      <Text style={{ fontSize: 34, color: "#ffffff", fontWeight: "800", letterSpacing: -0.5 }}>
                        Welcome{" "}
                      </Text>
                      <Text style={{ fontSize: 34, color: FLAME, fontWeight: "800", letterSpacing: -0.5 }}>
                        back
                      </Text>
                      <Text style={{ fontSize: 34, color: "rgba(255,255,255,0.22)", fontWeight: "300" }}>.</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.38)", textAlign: "center", lineHeight: 22, paddingHorizontal: 16 }}>
                      Sign in to securely access your dashboard
                    </Text>
                  </View>

                  {/* ── ERROR BANNER ─────────────────────────────────── */}
                  {errorMessage && (
                    <Animated.View style={{
                      backgroundColor: "rgba(239,68,68,0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(239,68,68,0.28)",
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

                  {/* ── LOGOUT REASON BANNER ─────────────────────────── */}
                  {logoutReason && (
                    <Animated.View style={{
                      backgroundColor: logoutReason === LogoutReason.INSTITUTION_SUSPENDED
                        ? "rgba(239,68,68,0.1)"
                        : logoutReason === LogoutReason.REVOKED_BY_OTHER_DEVICE || logoutReason === LogoutReason.ADMIN_REVOKED_ALL
                          ? "rgba(251,146,60,0.1)"
                          : "rgba(99,102,241,0.1)",
                      borderWidth: 1,
                      borderColor: logoutReason === LogoutReason.INSTITUTION_SUSPENDED
                        ? "rgba(239,68,68,0.28)"
                        : logoutReason === LogoutReason.REVOKED_BY_OTHER_DEVICE || logoutReason === LogoutReason.ADMIN_REVOKED_ALL
                          ? "rgba(251,146,60,0.28)"
                          : "rgba(99,102,241,0.28)",
                      padding: 14,
                      borderRadius: 14,
                      marginBottom: 20,
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 10,
                    }}>
                      <IconIonicons
                        name={
                          logoutReason === LogoutReason.INSTITUTION_SUSPENDED ? "ban"
                            : logoutReason === LogoutReason.REVOKED_BY_OTHER_DEVICE ? "phone-portrait-outline"
                              : logoutReason === LogoutReason.ADMIN_REVOKED_ALL ? "shield-checkmark-outline"
                                : "time-outline"
                        }
                        size={20}
                        color={
                          logoutReason === LogoutReason.INSTITUTION_SUSPENDED ? "#f87171"
                            : logoutReason === LogoutReason.REVOKED_BY_OTHER_DEVICE || logoutReason === LogoutReason.ADMIN_REVOKED_ALL
                              ? "#fb923c"
                              : "#818cf8"
                        }
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          color: logoutReason === LogoutReason.INSTITUTION_SUSPENDED
                            ? "#fca5a5"
                            : logoutReason === LogoutReason.REVOKED_BY_OTHER_DEVICE || logoutReason === LogoutReason.ADMIN_REVOKED_ALL
                              ? "#fed7aa"
                              : "#c7d2fe",
                          fontWeight: "700", fontSize: 13, marginBottom: 2,
                        }}>
                          {LOGOUT_MESSAGES[logoutReason]?.title ?? "Signed Out"}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.42)", fontSize: 12, lineHeight: 18 }}>
                          {LOGOUT_MESSAGES[logoutReason]?.body ?? "You have been signed out."}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setLogoutReason(null)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <IconIonicons name="close" size={16} color="rgba(255,255,255,0.3)" />
                      </TouchableOpacity>
                    </Animated.View>
                  )}

                  {/* ── EMAIL INPUT ──────────────────────────────────── */}
                  <Animated.View style={fieldStyle(field1)}>
                    <GlassInput
                      label="Email"
                      icon="mail-outline"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChangeText={(v: string) => handleInputChange("email", v)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={errors.email}
                    />
                  </Animated.View>

                  {/* ── PASSWORD INPUT ───────────────────────────────── */}
                  <Animated.View style={fieldStyle(field2)}>
                    <GlassInput
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

                  {/* ── FORGOT PASSWORD ──────────────────────────────── */}
                  <Animated.View style={[fieldStyle(field3), { alignItems: "flex-end", marginBottom: 28, marginTop: -8 }]}>
                    <ForgotLink onPress={() => router.push("/forgot-password" as any)} />
                  </Animated.View>

                  {/* ── SIGN IN BUTTON ───────────────────────────────── */}
                  <PrimaryButton
                    onPress={onSubmit}
                    loading={isGlobalLoading}
                    scale={btnScale}
                  />

                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>

      {/* Web: global CSS overrides */}
      {Platform.OS === "web" && (
        <style>{`
          /* Strip ALL native input styling in every state */
          input,
          input:hover,
          input:focus,
          input:focus-visible,
          input:active,
          textarea,
          textarea:hover,
          textarea:focus,
          textarea:focus-visible {
            -webkit-appearance: none !important;
            appearance: none !important;
            background-color: transparent !important;
            background: transparent !important;
            color: white !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          /* Autofill kill */
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
            box-shadow: 0 0 0px 1000px transparent inset !important;
            -webkit-text-fill-color: rgba(255,255,255,0.95) !important;
            caret-color: white !important;
            transition: background-color 9999s ease-in-out 0s;
          }

          /* Strip focus ring from Pressable divs */
          div:focus,
          div:focus-visible,
          div:focus-within {
            outline: none !important;
            box-shadow: none !important;
          }

          /* Mobile tap flash */
          * {
            -webkit-tap-highlight-color: transparent;
          }

          @media (prefers-reduced-motion: reduce) {
            * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
          }
        `}</style>
      )}
    </>
  );
}
