import { SettingsService } from "@/services/SettingsService";
import { validateEmail } from "@/utils/validation";
import { showError, showSuccess, showInfo } from "@/utils/toast";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { Shield } from "lucide-react-native";
import { CloudoraLogo } from "@/components/common/CloudoraLogo";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing as EasingRN,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LivingBackground } from "@/components/landing/LivingBackground";
import { GlassCard } from "@/components/ui/GlassCard";

const IconIonicons = Ionicons as any;
const CAN_USE_NATIVE_DRIVER = Platform.OS !== "web";

// ─── Design Tokens ──────────────────────────────────────────────────────────
const FLAME        = "#FF6B00";
const FLAME_DIM    = "rgba(255,107,0,0.8)";
const FLAME_GLOW   = "rgba(255,107,0,0.35)";
const FLAME_BG     = "rgba(255,107,0,0.12)";
const GLASS_BG     = "rgba(8,5,28,0.72)";
const GLASS_BORDER = "rgba(255,255,255,0.09)";
const INPUT_BG     = "rgba(255,255,255,0.04)";
const WHITE_FADE   = "rgba(255,255,255,0.18)";

// ─── GlassInput Component ───────────────────────────────────────────────────
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

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? "rgba(239,68,68,0.5)" : hovered ? "rgba(255,107,0,0.32)" : GLASS_BORDER,
      error ? "rgba(239,68,68,0.9)" : FLAME_DIM,
    ],
  });

  const outerGlowOpacity = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const hoverBgOpacity   = hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={{ marginBottom: 20 }}>
      {/* Static label above input */}
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

      {/* Input container wrapper */}
      <View style={{ position: "relative", height: 58, justifyContent: "center" }}>
        {/* Outer glow ring on focus */}
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
          {/* Hover highlight overlay */}
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

          {/* Top-edge micro-highlight */}
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

          {/* Text input */}
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

// ─── PrimaryButton Component ────────────────────────────────────────────────
const PrimaryButton = ({
  onPress,
  loading,
  disabled,
  title,
  scale,
}: {
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
  title: string;
  scale: Animated.Value;
}) => {
  const [hovered, setHovered] = useState(false);
  const hoverAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sweepAnim = useRef(new Animated.Value(-1)).current;

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

  useEffect(() => {
    if (hovered && !disabled && !loading) {
      sweepAnim.setValue(-1);
      Animated.timing(sweepAnim, {
        toValue: 2,
        duration: 600,
        easing: EasingRN.out(EasingRN.cubic),
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }).start();
    }
  }, [hovered, disabled, loading]);

  const onHoverIn = () => {
    if (disabled || loading) return;
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

  const hoverLiftY    = hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const hoverScalePop = hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.015] });

  return (
    <Animated.View
      style={{
        transform: [{ scale }, { translateY: hoverLiftY }, { scale: hoverScalePop }],
        borderRadius: 24,
        overflow: "hidden",
        alignSelf: "center",
        width: "88%",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {/* Ambient glow */}
      {!disabled && (
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
      )}

      <Pressable
        onPress={loading || disabled ? undefined : onPress}
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
              background: loading || disabled
                ? "rgba(255,107,0,0.5)"
                : "linear-gradient(135deg, #FF8C40 0%, #FF6B00 45%, #E85D00 100%)",
              boxShadow: hovered && !loading && !disabled
                ? "0 0 0 1px rgba(255,140,64,0.5), 0 16px 40px rgba(255,107,0,0.55), 0 4px 12px rgba(255,107,0,0.4)"
                : "0 12px 32px rgba(255,107,0,0.4), 0 2px 8px rgba(255,107,0,0.3)",
              transition: "box-shadow 0.2s ease",
              cursor: loading || disabled ? "default" : "pointer",
            } : {
              backgroundColor: loading || disabled ? "rgba(255,107,0,0.55)" : FLAME,
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
        {Platform.OS === "web" && !disabled && (
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
              Sending…
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Shield size={18} color="rgba(255,255,255,0.92)" />
            <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 17, letterSpacing: 0.3 }}>
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// ─── LogoLockup Component ───────────────────────────────────────────────────
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

// ─── Main ForgotPassword Screen ─────────────────────────────────────────────
export default function ForgotPassword() {
  const [email, setEmail]                             = useState("");
  const [loading, setLoading]                         = useState(false);
  const [emailCheckLoading, setEmailCheckLoading]     = useState(false);
  const [emailExists, setEmailExists]                 = useState<boolean | null>(null);
  const [emailCheckMessage, setEmailCheckMessage]     = useState<string | null>(null);
  const [emailTouched, setEmailTouched]               = useState(false);
  const [successModalOpen, setSuccessModalOpen]       = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState("");
  const [isHierarchical, setIsHierarchical]           = useState(false);

  // Entrance animations
  const cardFade     = useRef(new Animated.Value(0)).current;
  const cardSlide    = useRef(new Animated.Value(60)).current;
  const cardScale    = useRef(new Animated.Value(0.97)).current;
  const logoEntrance = useRef(new Animated.Value(0)).current;
  const btnScale     = useRef(new Animated.Value(1)).current;
  const shakeX       = useRef(new Animated.Value(0)).current;

  // Staggered field anims
  const field1 = useRef(new Animated.Value(0)).current;
  const field2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(logoEntrance, {
      toValue: 1, duration: 500,
      easing: EasingRN.out(EasingRN.cubic),
      useNativeDriver: CAN_USE_NATIVE_DRIVER,
    }).start();

    Animated.parallel([
      Animated.timing(cardFade,  { toValue: 1, duration: 700, easing: EasingRN.out(EasingRN.quad), useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.spring(cardSlide, { toValue: 0, useNativeDriver: CAN_USE_NATIVE_DRIVER, friction: 8, tension: 55 }),
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: CAN_USE_NATIVE_DRIVER, friction: 8, tension: 55 }),
    ]).start(() => {
      Animated.stagger(100, [
        Animated.spring(field1, { toValue: 1, useNativeDriver: CAN_USE_NATIVE_DRIVER, friction: 7, tension: 80 }),
        Animated.spring(field2, { toValue: 1, useNativeDriver: CAN_USE_NATIVE_DRIVER, friction: 7, tension: 80 }),
      ]).start();
    });
  }, []);

  const normalizedEmail = email.trim().toLowerCase();
  const canValidateEmail = validateEmail(normalizedEmail);

  useEffect(() => {
    if (!emailTouched) return;

    if (!normalizedEmail) {
      setEmailExists(null);
      setEmailCheckMessage(null);
      setEmailCheckLoading(false);
      return;
    }

    if (!canValidateEmail) {
      setEmailExists(null);
      setEmailCheckMessage("Enter a valid email address.");
      setEmailCheckLoading(false);
      return;
    }

    let cancelled = false;
    setEmailCheckLoading(true);

    const timer = setTimeout(async () => {
      try {
        const result = await SettingsService.checkForgotPasswordEmail(normalizedEmail);
        if (cancelled) return;
        setEmailExists(!!result.exists);
        setEmailCheckMessage(result.message || (result.exists ? "Email found." : "No account exists for this email."));
      } catch {
        if (cancelled) return;
        setEmailExists(null);
        setEmailCheckMessage("Unable to verify email right now.");
      } finally {
        if (!cancelled) setEmailCheckLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedEmail, canValidateEmail, emailTouched]);

  const shakeCard = () => {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10, duration: 60, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: 8,  duration: 60, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: 4,  duration: 60, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
      Animated.timing(shakeX, { toValue: 0,  duration: 60, useNativeDriver: CAN_USE_NATIVE_DRIVER }),
    ]).start();
  };

  const handleReset = async () => {
    setIsHierarchical(false);
    if (!normalizedEmail) {
      showError("Email Required", "Please enter your email address.");
      shakeCard();
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      showError("Invalid Email", "Please enter a valid email address.");
      shakeCard();
      return;
    }

    if (emailExists !== true) {
      showError("Account Not Found", "No account exists for this email address.");
      shakeCard();
      return;
    }

    setLoading(true);
    try {
      const response: any = await SettingsService.forgotPassword(normalizedEmail);
      setIsHierarchical(!!response.is_hierarchical);
      if (response.is_hierarchical) {
        showInfo("Reset Request", response.message || "Reset request received. Follow the on-screen instructions.");
      } else {
        showSuccess("Request Received", response.message || "Password reset instructions sent.");
      }
      setSuccessModalMessage(response.message || "Reset request received successfully.");
      setSuccessModalOpen(true);
    } catch (err: any) {
      const errorData = err.response?.data || err.data;
      if (errorData?.code === "RATE_LIMIT_EXCEEDED") {
        showError("Too Many Requests", errorData.error || "Too many password reset requests. Please try again in an hour.");
      } else if (errorData?.code === "EMAIL_NOT_FOUND") {
        showError("Account Not Found", errorData.error || "No account exists for this email.");
        setEmailExists(false);
        setEmailCheckMessage(errorData.error || "No account exists for this email.");
      } else {
        const raw = errorData?.error || errorData?.message || err?.message;
        const safe = (raw && !/database|schema|relation|syntax/i.test(raw))
          ? raw
          : "Unable to process reset request. Please try again.";
        showError("Reset Failed", safe);
      }
      shakeCard();
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Living background */}
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
                    {/* Back to sign in — left */}
                    <TouchableOpacity
                      onPress={() => router.back()}
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
                  <View style={{ marginBottom: 36 }}>
                    <Text style={{
                      fontSize: 32,
                      color: "#ffffff",
                      fontWeight: "800",
                      letterSpacing: -0.5,
                      marginBottom: 6,
                    }}>
                      Reset Password
                    </Text>

                    {/* Accent underline bar */}
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
                      Enter your email address to request a secure password reset link
                    </Text>
                  </View>

                  {/* ── EMAIL INPUT ──────────────────────────────────── */}
                  <Animated.View style={fieldStyle(field1)}>
                    <GlassInput
                      label="Email Address"
                      placeholder="name@example.com"
                      value={email}
                      onChangeText={(v: string) => {
                        setEmail(v);
                        setEmailTouched(true);
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={emailTouched && emailExists === false}
                      suffix={emailCheckLoading ? <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" /> : null}
                    />

                    {/* Live email verification status badge */}
                    {!!emailTouched && !!emailCheckMessage && (
                      <Text
                        style={{
                          color: emailExists === true ? "rgba(74, 222, 128, 0.95)" : emailExists === false ? "rgba(252,165,165,0.95)" : "rgba(255,255,255,0.5)",
                          fontSize: 12,
                          marginTop: -12,
                          marginBottom: 16,
                          marginLeft: 4,
                          fontWeight: "600",
                        }}
                      >
                        {emailCheckMessage}
                      </Text>
                    )}
                  </Animated.View>

                  {/* ── REQUEST RESET BUTTON ─────────────────────────── */}
                  <Animated.View style={[fieldStyle(field2), { marginTop: 8 }]}>
                    <PrimaryButton
                      title="Request Reset"
                      onPress={handleReset}
                      loading={loading}
                      disabled={!canValidateEmail || emailExists !== true}
                      scale={btnScale}
                    />
                  </Animated.View>

                  {/* ── FOOTER NAVIGATION ────────────────────────────── */}
                  <View style={{ alignItems: "center", marginTop: 28 }}>
                    <TouchableOpacity
                      onPress={() => router.push("/(auth)/verify-security-questions" as any)}
                      activeOpacity={0.7}
                      style={{ marginBottom: 12 }}
                    >
                      <Text style={{ color: FLAME, fontWeight: "700", fontSize: 13 }}>
                        Prefer security question recovery? Continue here
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                      <Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "600", fontSize: 13 }}>
                        Back to <Text style={{ color: FLAME, fontWeight: "700" }}>Sign In</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>

      {/* ── SUCCESS MODAL (Liquid Glass) ───────────────────────────── */}
      <Modal visible={successModalOpen} animationType="fade" transparent>
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}>
          <GlassCard
            variant="modal"
            accentColor="#22C55E"
            glowColor="rgba(34, 197, 94, 0.35)"
            borderRadius={24}
            style={{
              width: "100%",
              maxWidth: 420,
            }}
            contentStyle={{
              padding: 28,
            }}
          >
            <View style={{
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: "rgba(34,197,94,0.15)",
              borderWidth: 1, borderColor: "rgba(34,197,94,0.3)",
              alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <IconIonicons name="checkmark-circle" size={24} color="#4ade80" />
            </View>
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", marginBottom: 8 }}>
              Request Submitted
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", lineHeight: 22, fontSize: 14 }}>
              {successModalMessage}
            </Text>

            <TouchableOpacity
              onPress={() => {
                setSuccessModalOpen(false);
                router.back();
              }}
              activeOpacity={0.8}
              style={{
                marginTop: 22,
                backgroundColor: FLAME,
                borderRadius: 16,
                alignItems: "center",
                paddingVertical: 14,
                ...(Platform.OS === "web" ? {
                  boxShadow: "0 8px 24px rgba(255,107,0,0.4)",
                } : {}),
              } as any}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>Back to Sign In</Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>

      {/* Web styles */}
      {Platform.OS === "web" && (
        <style>{`
          input, textarea {
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
          input:-webkit-autofill {
            -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
            box-shadow: 0 0 0px 1000px transparent inset !important;
            -webkit-text-fill-color: rgba(255,255,255,0.95) !important;
            caret-color: white !important;
            transition: background-color 9999s ease-in-out 0s;
          }
        `}</style>
      )}
    </>
  );
}
