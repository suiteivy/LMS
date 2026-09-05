import { SettingsService } from "@/services/SettingsService";
import { validateEmail } from "@/utils/validation";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { Shield, GraduationCap } from "lucide-react-native";
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

const IconIonicons = Ionicons as any;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1600, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1600, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
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
        useNativeDriver: true,
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
  const pulseScale  = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale,  { toValue: 1.1, duration: 2400, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
        Animated.timing(pulseScale,  { toValue: 1,   duration: 2400, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1,   duration: 2000, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.4, duration: 2000, easing: EasingRN.inOut(EasingRN.sin), useNativeDriver: true }),
      ])
    );
    pulse.start();
    glow.start();
    return () => { pulse.stop(); glow.stop(); };
  }, []);

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
      <View style={{ position: "relative", width: 38, height: 38 }}>
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
  const [error, setError]                             = useState<string | null>(null);
  const [successMsg, setSuccessMsg]                   = useState<string | null>(null);
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
  const toastY       = useRef(new Animated.Value(-80)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Staggered field anims
  const field1 = useRef(new Animated.Value(0)).current;
  const field2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(logoEntrance, {
      toValue: 1, duration: 500,
      easing: EasingRN.out(EasingRN.cubic),
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(cardFade,  { toValue: 1, duration: 700, easing: EasingRN.out(EasingRN.quad), useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, useNativeDriver: true, friction: 8, tension: 55 }),
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 55 }),
    ]).start(() => {
      Animated.stagger(100, [
        Animated.spring(field1, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
        Animated.spring(field2, { toValue: 1, useNativeDriver: true, friction: 7, tension: 80 }),
      ]).start();
    });
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
    }, 4000);
  };

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
      Animated.timing(shakeX, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 4,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleReset = async () => {
    setIsHierarchical(false);
    if (!normalizedEmail) {
      setError("Email is required");
      shakeCard();
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      setError("Please enter a valid email");
      shakeCard();
      return;
    }

    if (emailExists !== true) {
      setError("No account exists for this email");
      shakeCard();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response: any = await SettingsService.forgotPassword(normalizedEmail);
      setIsHierarchical(!!response.is_hierarchical);
      showToast(response.message || "Reset request received. Follow the on-screen instructions.");
      setSuccessModalMessage(response.message || "Reset request received successfully.");
      setSuccessModalOpen(true);
    } catch (err: any) {
      const errorData = err.response?.data || err.data;
      if (errorData?.code === "RATE_LIMIT_EXCEEDED") {
        setError(errorData.error || "Too many password reset requests. Please try again in an hour.");
        shakeCard();
      } else if (errorData?.code === "EMAIL_NOT_FOUND") {
        setError(errorData.error || "No account exists for this email.");
        setEmailExists(false);
        setEmailCheckMessage(errorData.error || "No account exists for this email.");
        shakeCard();
      } else {
        setError(errorData?.error || "Unable to process reset request. Please try again.");
        shakeCard();
      }
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
        {/* Toast notification */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, zIndex: 999,
            alignItems: "center",
            paddingTop: 60,
            transform: [{ translateY: toastY }],
            opacity: toastOpacity,
          }}
        >
          <View
            style={{
              backgroundColor: isHierarchical ? "rgba(255,107,0,0.18)" : "rgba(34,197,94,0.2)",
              borderWidth: 1,
              borderColor: isHierarchical ? "rgba(255,107,0,0.4)" : "rgba(34,197,94,0.4)",
              borderRadius: 16,
              paddingHorizontal: 24,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              maxWidth: SCREEN_WIDTH * 0.9,
              boxShadow: [{
                offsetX: 0, offsetY: 8, blurRadius: 16,
                color: isHierarchical ? "rgba(255,107,0,0.3)" : "rgba(34,197,94,0.3)",
              }],
            } as any}
          >
            <IconIonicons
              name={isHierarchical ? "information-circle" : "checkmark-circle"}
              size={22}
              color={isHierarchical ? "#FF6B00" : "#4ade80"}
            />
            <Text
              style={{
                color: isHierarchical ? "#FF6B00" : "#4ade80",
                fontWeight: "700",
                fontSize: 14,
                flexShrink: 1,
              }}
            >
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
              {/* ── LIQUID GLASS CARD ─────────────────────────────────── */}
              <Animated.View
                style={{
                  opacity: cardFade,
                  transform: [{ translateY: cardSlide }, { translateX: shakeX }, { scale: cardScale }],
                  borderRadius: 28,
                  overflow: "hidden",
                  ...(Platform.OS === "web" ? {
                    backdropFilter: "blur(40px) saturate(190%)",
                    WebkitBackdropFilter: "blur(40px) saturate(190%)",
                    background: `
                      linear-gradient(
                        165deg,
                        rgba(24, 15, 52, 0.82) 0%,
                        rgba(11, 7, 30, 0.88) 40%,
                        rgba(6, 4, 20, 0.94) 100%
                      )
                    `,
                    boxShadow: [
                      "0 0 0 1px rgba(255,255,255,0.1)",
                      "0 2px 4px rgba(0,0,0,0.35)",
                      "0 12px 24px -4px rgba(0,0,0,0.5)",
                      "0 24px 48px -8px rgba(0,0,0,0.65)",
                      "0 44px 88px -12px rgba(0,0,0,0.8)",
                      "0 0 90px -10px rgba(255,107,0,0.14)",
                      "inset 0 1px 1px 0 rgba(255,255,255,0.18)",
                      "inset 0 -1px 1px 0 rgba(0,0,0,0.45)",
                    ].join(", "),
                  } : {
                    backgroundColor: GLASS_BG,
                    borderWidth: 1,
                    borderColor: GLASS_BORDER,
                    boxShadow: [{
                      offsetX: 0, offsetY: 28, blurRadius: 60,
                      color: "rgba(0,0,0,0.7)",
                    }],
                  }),
                } as any}
              >
                {/* Top refraction sheen */}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0,
                    height: 80,
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    ...(Platform.OS === "web" ? {
                      background: "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 100%)",
                    } : {
                      backgroundColor: "rgba(255,255,255,0.05)",
                    }),
                  } as any}
                />

                {/* Orange accent line at top card edge */}
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
                <View style={{ padding: 36 }}>

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

                  {/* ── ERROR BANNER ─────────────────────────────────── */}
                  {error && (
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
                      <Text style={{ color: "#fca5a5", fontWeight: "600", flex: 1, fontSize: 13 }}>{error}</Text>
                    </Animated.View>
                  )}

                  {/* ── EMAIL INPUT ──────────────────────────────────── */}
                  <Animated.View style={fieldStyle(field1)}>
                    <GlassInput
                      label="Email Address"
                      placeholder="name@example.com"
                      value={email}
                      onChangeText={(v: string) => {
                        setEmail(v);
                        setEmailTouched(true);
                        setError(null);
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={error}
                      suffix={emailCheckLoading ? <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" /> : null}
                    />

                    {/* Live email verification status badge */}
                    {!!emailTouched && !error && !!emailCheckMessage && (
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

                </View>
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
          <View style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 24,
            overflow: "hidden",
            padding: 28,
            ...(Platform.OS === "web" ? {
              backdropFilter: "blur(32px) saturate(180%)",
              WebkitBackdropFilter: "blur(32px) saturate(180%)",
              background: `
                linear-gradient(
                  165deg,
                  rgba(24, 15, 52, 0.9) 0%,
                  rgba(11, 7, 30, 0.94) 100%
                )
              `,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.1), 0 24px 60px rgba(0,0,0,0.8)",
            } : {
              backgroundColor: "#13103A",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }),
          } as any}>
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
          </View>
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
