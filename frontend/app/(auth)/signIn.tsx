import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { safeSignOut } from "@/utils/safeSignOut";
import { LogoutReason } from "@/types/logout";
import { getAuthErrorMessage, validateEmail } from "@/utils/validation";
import { showError, showSuccess, showInfo } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Shield } from "lucide-react-native";
import { CloudoraLogo } from "@/components/common/CloudoraLogo";
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
import { GlassCard } from "@/components/ui/GlassCard";

const IconIonicons = Ionicons as any;
const CAN_USE_NATIVE_DRIVER = Platform.OS !== "web";

// ─── Design tokens ──────────────────────────────────────────────────────────
const FLAME      = "#FF6B00";
const FLAME_DIM  = "rgba(255,107,0,0.8)";
const FLAME_GLOW = "rgba(255,107,0,0.35)";
const FLAME_BG   = "rgba(255,107,0,0.12)";
const GLASS_BG   = "rgba(8,5,28,0.72)";
const GLASS_BORDER = "rgba(255,255,255,0.09)";
const GLASS_TOP  = "rgba(255,255,255,0.13)";
const INPUT_BG   = "rgba(255,255,255,0.04)";
const WHITE_DIM  = "rgba(255,255,255,0.35)";
const WHITE_FADE = "rgba(255,255,255,0.18)";

// ─── GlassInput — label-above layout, pill shape, clean interior ──────────
// Reference adaptation: static label above field (muted tone), pill radius (24),
// no leading icon (label provides identification), placeholder dimmer than text.
// All focus/hover border animations preserved.
const GlassInput = ({
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

  const focusAnim = useRef(new Animated.Value(0)).current;
  const hoverAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 260,
      easing: EasingRN.out(EasingRN.quad),
      useNativeDriver: false,
    }).start();
  };

  const onBlur = () => {
    setFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 240, useNativeDriver: false }).start();
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

  // Border warms on hover, intensifies to flame on focus
  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? "rgba(239,68,68,0.5)" : hovered ? "rgba(255,107,0,0.32)" : GLASS_BORDER,
      error ? "rgba(239,68,68,0.9)" : FLAME_DIM,
    ],
  });

  const outerGlowOpacity = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // Hover brightens the input surface
  const hoverBgOpacity = hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={{ marginBottom: 24 }}>
      {/* Static label above the input — changes color on focus/error */}
      <Text
        style={{
          color: error
            ? "rgba(239,68,68,0.75)"
            : focused
              ? "rgba(255,107,0,0.85)"
              : "rgba(255,255,255,0.45)",
          fontSize: 13,
          fontWeight: "600",
          letterSpacing: 0.4,
          marginBottom: 8,
          marginLeft: 4,
        }}
      >
        {label}
      </Text>

      {/* Input container wrapper — keeps border and glow perfectly aligned with the surface */}
      <View style={{ position: "relative", height: 58, justifyContent: "center" }}>
        {/* Outer glow ring — appears on focus */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -4, left: -4, right: -4, bottom: -4,
            borderRadius: 28,
            borderWidth: 1.5,
            borderColor: error ? "rgba(239,68,68,0.3)" : FLAME_GLOW,
            opacity: outerGlowOpacity,
          } as any}
        />

        {/* Animated border layer */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: 24,
            borderWidth: 1,
            borderColor,
          } as any}
        />

        {/* Main input surface — pill shape */}
        <Pressable
          onHoverIn={onHoverIn}
          onHoverOut={onHoverOut}
          style={{
            height: "100%",
            width: "100%",
            backgroundColor: INPUT_BG,
            borderRadius: 24,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
            ...(Platform.OS === "web" ? { outline: "none" } : {}),
          } as any}
        >
          {/* Hover background brightener overlay */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: 24,
              backgroundColor: "rgba(255,255,255,0.04)",
              opacity: hoverBgOpacity,
            } as any}
          />

          {/* Top-edge micro-highlight (glass emboss) */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0, left: 16, right: 16,
              height: 1,
              backgroundColor: WHITE_FADE,
              borderRadius: 1,
            }}
          />

          {/* Text input — no icon offset, full width */}
          <TextInput
            style={{
              flex: 1,
              height: "100%",
              color: "#ffffff",
              fontWeight: "500",
              fontSize: 15,
              backgroundColor: "transparent",
              outline: "none",
              zIndex: 3,
            } as any}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.22)"
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
      </View>

      {/* Inline error message */}
      {error && (
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, marginLeft: 4 }}>
          <IconIonicons name="alert-circle" size={13} color="rgba(252,165,165,0.9)" />
          <Text style={{ color: "rgba(252,165,165,0.9)", fontSize: 12, marginLeft: 4, fontWeight: "600" }}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── ForgotLink — animated underline draw on hover ────────────────────────
const ForgotLink = ({ onPress }: { onPress: () => void }) => {
  const underlineAnim = useRef(new Animated.Value(0)).current;

  const onHoverIn = () =>
    Animated.timing(underlineAnim, {
      toValue: 1,
      duration: 280,
      easing: EasingRN.out(EasingRN.cubic),
      useNativeDriver: CAN_USE_NATIVE_DRIVER,
    }).start();

  const onHoverOut = () =>
    Animated.timing(underlineAnim, {
      toValue: 0,
      duration: 180,
      easing: EasingRN.in(EasingRN.quad),
      useNativeDriver: CAN_USE_NATIVE_DRIVER,
    }).start();

  const scaleX = underlineAnim;

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
            transform: [
              { scaleX },
              { translateX: underlineAnim.interpolate({ inputRange: [0, 1], outputRange: ["-50%", "0%"] }) },
            ],
            transformOrigin: "left",
            borderRadius: 1,
            ...(Platform.OS === "web" ? { boxShadow: `0 0 6px ${FLAME_GLOW}` } : {}),
          } as any}
        />
      </View>
    </Pressable>
  );
};

// ─── PrimaryButton — liquid glass gradient + animated loading state ────────
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
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1600, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: CAN_USE_NATIVE_DRIVER }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1600, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: CAN_USE_NATIVE_DRIVER }),
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
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
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

  // Pop-out lift on hover
  const hoverLiftY = hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const hoverScalePop = hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });

  return (
    <Animated.View
      style={{
        transform: [{ scale }, { translateY: hoverLiftY }, { scale: hoverScalePop }],
        borderRadius: 24,
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
          borderRadius: 30,
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
            borderRadius: 24,
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
        {/* Top sheen highlight */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, height: "50%",
            backgroundColor: "rgba(255,255,255,0.12)",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
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

// ─── LogoLockup — enhanced unboxed logo + name with entrance + idle animation ──
const LogoLockup = ({ entranceAnim }: { entranceAnim: Animated.Value }) => {
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.08, duration: 2400, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: CAN_USE_NATIVE_DRIVER }),
        Animated.timing(pulseScale, { toValue: 1,    duration: 2400, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      ])
    );
    pulse.start();
    return () => { pulse.stop(); };
  }, [pulseScale]);

  const entranceOpacity    = entranceAnim;
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
      {/* Unboxed Logo mark */}
      <Animated.View
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pulseScale }],
        }}
      >
        <CloudoraLogo size={30} glow glowIntensity={0.65} />
      </Animated.View>

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

// ─── Main Component ───────────────────────────────────────────────────────
interface FormData {
  email: string;
  password: string;
}

export default function SignIn() {
  const [showPassword, setShowPassword]     = useState(false);
  const [formData, setFormData]             = useState<FormData>({ email: "", password: "" });
  const [errors, setErrors]                 = useState<Record<string, string>>({});
  const { signIn, loading: isGlobalLoading, maintenanceModeMessage, refreshMaintenanceStatus } = useAuth();

  // ── Entrance animations ──────────────────────────────────────────────
  const cardFade     = useRef(new Animated.Value(0)).current;
  const cardSlide    = useRef(new Animated.Value(60)).current;
  const cardScale    = useRef(new Animated.Value(0.97)).current;  // scale-in on entrance
  const logoEntrance = useRef(new Animated.Value(0)).current;
  const btnScale     = useRef(new Animated.Value(1)).current;
  const shakeX       = useRef(new Animated.Value(0)).current;

  // Staggered field anims
  const field1 = useRef(new Animated.Value(0)).current;
  const field2 = useRef(new Animated.Value(0)).current;
  const field3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo fades in first
    Animated.timing(logoEntrance, {
      toValue: 1, duration: 500,
      easing: EasingRN.out(EasingRN.cubic),
      useNativeDriver: CAN_USE_NATIVE_DRIVER,
    }).start();

    // Card: fade + slide-up spring + scale-in spring
    Animated.parallel([
      Animated.timing(cardFade,  { toValue: 1, duration: 700, easing: EasingRN.out(EasingRN.quad), useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.spring(cardSlide, { toValue: 0, useNativeDriver: CAN_USE_NATIVE_DRIVER, friction: 8, tension: 55 }),
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: CAN_USE_NATIVE_DRIVER, friction: 8, tension: 55 }),
    ]).start(() => {
      // Fields stagger in after card settles
      Animated.stagger(100, [
        Animated.spring(field1, { toValue: 1, useNativeDriver: CAN_USE_NATIVE_DRIVER, friction: 7, tension: 80 }),
        Animated.spring(field2, { toValue: 1, useNativeDriver: CAN_USE_NATIVE_DRIVER, friction: 7, tension: 80 }),
        Animated.spring(field3, { toValue: 1, useNativeDriver: CAN_USE_NATIVE_DRIVER, friction: 7, tension: 80 }),
      ]).start();
    });
  }, []);

  const shakeCard = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue:  10, duration: 55, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: -10, duration: 55, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue:   8, duration: 55, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue:  -8, duration: 55, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue:   4, duration: 55, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue:   0, duration: 55, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
    ]).start();
  };

  const pressBtn = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.94, duration: 80, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.spring(btnScale,  { toValue: 1, useNativeDriver: CAN_USE_NATIVE_DRIVER, friction: 4, tension: 140 }),
    ]).start();
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
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
      showError("Incomplete Form", "Please enter a valid email and password.");
      return;
    }

    try {
      const { error, data } = await signIn(formData.email, formData.password);

      if (error) {
        showError("Sign In Failed", getAuthErrorMessage(error));
        shakeCard();
        return;
      }

      if (!data?.user) {
        showError("Sign In Failed", "Unable to complete sign in. Please try again.");
        shakeCard();
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
        showError("Sign In Failed", "Could not load user profile. Please try again.");
        shakeCard();
        return;
      }

      if (!userData?.role) {
        showError("Sign In Failed", "No role assigned to this account. Please contact your administrator.");
        shakeCard();
        return;
      }

      // Global maintenance: allow platform admins, block institution users
      const maintenance = await refreshMaintenanceStatus();
      if (Platform.OS === "web" && maintenance.enabled && !!userData.institution_id) {
        showInfo("Maintenance", maintenance.message || maintenanceModeMessage || "System maintenance is in progress. Please try again later.");
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
          showError("Access Denied", "Could not verify institution status.");
          await safeSignOut("local", LogoutReason.AUTH_ERROR_403, true);
          return;
        }

        // Master admin sets status to 'suspended' when disabling an institution
        if (instData.subscription_status === "suspended" || instData.subscription_status === "cancelled") {
          showError("Access Denied", "Your institution's account has been disabled.");
          shakeCard();
          await safeSignOut("local", LogoutReason.INSTITUTION_SUSPENDED, true);
          return;
        }
      }

      showSuccess("Welcome", `Welcome back, ${userData.full_name || "there"}!`);

      if ((userData as any).must_change_password || (userData as any).requires_security_questions_setup) {
        setTimeout(() => {
          router.replace("/(auth)/security-questions" as any);
        }, 200);
      }

      // Let AuthHandler detect session change and handle the transition
    } catch (error: unknown) {
      console.error("[SignIn] Unhandled error:", error);
      showError("Sign In Failed", "An unexpected error occurred. Please check your connection and try again.");
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
                  transform: [{ translateY: cardSlide }, { translateX: shakeX }, { scale: cardScale }],
                  width: "100%",
                }}
              >
                <GlassCard
                  variant="modal"
                  accentColor={FLAME}
                  glowColor="rgba(255, 107, 0, 0.25)"
                  borderRadius={28}
                  style={{ width: "100%" }}
                  contentStyle={{ padding: 36 }}
                >
                  {/* ── TOP ROW: Back button left / Logo right ──────── */}
                  <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 32,
                  }}>
                    {/* Back to landing — left */}
                    <TouchableOpacity
                      onPress={() => router.replace("/")}
                      activeOpacity={0.7}
                      style={{
                        width: 38, height: 38,
                        alignItems: "center", justifyContent: "center",
                        borderRadius: 13,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        borderWidth: 1,
                        borderColor: GLASS_BORDER,
                      }}
                    >
                      <IconIonicons name="arrow-back" size={18} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>

                    {/* Logo lockup — right */}
                    <LogoLockup entranceAnim={logoEntrance} />
                  </View>

                  {/* ── HEADING BLOCK — left-aligned, accent underline ── */}
                  {/* Reference pattern: large heading + accent-coloured bar beneath active tab.
                      Since this app has no register route, we render a single heading with
                      a static orange underline bar (same visual rhythm, no fake second tab). */}
                  <View style={{ marginBottom: 36 }}>
                    <Text style={{
                      fontSize: 32,
                      color: "#ffffff",
                      fontWeight: "800",
                      letterSpacing: -0.5,
                      marginBottom: 6,
                    }}>
                      Sign In
                    </Text>

                    {/* Accent underline bar — reference's active-tab indicator */}
                    <View style={{
                      width: 44,
                      height: 2.5,
                      backgroundColor: FLAME,
                      borderRadius: 2,
                      marginBottom: 12,
                      ...(Platform.OS === "web" ? {
                        boxShadow: `0 0 10px ${FLAME_GLOW}, 0 0 4px rgba(255,107,0,0.5)`,
                      } : {}),
                    } as any} />

                    <Text style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.38)",
                      lineHeight: 20,
                    }}>
                      Sign in to securely access your dashboard
                    </Text>
                  </View>

                  {/* ── EMAIL INPUT ──────────────────────────────────── */}
                  <Animated.View style={fieldStyle(field1)}>
                    <GlassInput
                      label="Email"
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
                </GlassCard>
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
