import { FullScreenLoader } from "@/components/common/FullScreenLoader";
import { SettingsService } from "@/services/SettingsService";
import { validateEmail } from "@/utils/validation";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { Shield, Sparkles, GraduationCap, Mail, ArrowLeft } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing as EasingRN,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Reanimated from "react-native-reanimated";

const IconIonicons = Ionicons as any;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

//  Floating animated orb 
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
        animStyle,
      ]}
    />
  );
};

//  Animated input field 
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

      <View style={{ position: "relative" }}>
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
        <View
          style={{
            height: 56,
            backgroundColor: "transparent",
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
              backgroundColor: "transparent",
              outline: "none",
            } as any}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.3)"
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

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [emailCheckMessage, setEmailCheckMessage] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [isHierarchical, setIsHierarchical] = useState(false);

  //  Entrance animations 
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(50)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const toastY = useRef(new Animated.Value(-80)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Staggered field anims
  const field1 = useRef(new Animated.Value(0)).current;
  const field2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }),
    ]).start(() => {
      Animated.stagger(120, [
        Animated.spring(field1, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.spring(field2, { toValue: 1, useNativeDriver: true, friction: 7 }),
      ]).start();
    });

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(logoPulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
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
      setEmailCheckMessage('Enter a valid email address.');
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
        setEmailCheckMessage(result.message || (result.exists ? 'Email found.' : 'No account exists for this email.'));
      } catch {
        if (cancelled) return;
        setEmailExists(null);
        setEmailCheckMessage('Unable to verify email right now.');
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

  const handleReset = async () => {
    pressBtn();
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
      setSuccessModalMessage(response.message || 'Reset request received successfully.');
      setSuccessModalOpen(true);
    } catch (err: any) {
      const errorData = err.response?.data || err.data;
      if (errorData?.code === 'RATE_LIMIT_EXCEEDED') {
        setError(errorData.error || "Too many password reset requests. Please try again in an hour.");
        shakeCard();
      } else if (errorData?.code === 'EMAIL_NOT_FOUND') {
        setError(errorData.error || 'No account exists for this email.');
        setEmailExists(false);
        setEmailCheckMessage(errorData.error || 'No account exists for this email.');
        shakeCard();
      } else {
        setError(errorData?.error || 'Unable to process reset request. Please try again.');
        shakeCard();
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: "#0F0B2E" }}>
        {/* Orbs */}
        <FloatingOrb size={320} color="rgba(255,107,0,0.09)" top="-5%" left="-15%" duration={5000} delay={0} />
        <FloatingOrb size={260} color="rgba(99,102,241,0.12)" top="55%" left="60%" duration={6500} delay={500} />
        <FloatingOrb size={200} color="rgba(236,72,153,0.08)" top="30%" left="70%" duration={4500} delay={1000} />

        {/* Success toast */}
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
          <View style={{
            backgroundColor: isHierarchical ? "rgba(255,107,0,0.15)" : "rgba(34,197,94,0.2)",
            borderWidth: 1,
            borderColor: isHierarchical ? "rgba(255,107,0,0.4)" : "rgba(34,197,94,0.4)",
            borderRadius: 16,
            paddingHorizontal: 24,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            maxWidth: SCREEN_WIDTH * 0.9,
          }}>
            <IconIonicons 
               name={isHierarchical ? "information-circle" : "checkmark-circle"} 
               size={22} 
               color={isHierarchical ? "#FF6B00" : "#4ade80"} 
            />
            <Text style={{ 
               color: isHierarchical ? "#FF6B00" : "#4ade80", 
               fontWeight: "700", 
               fontSize: 14,
               flexShrink: 1 
            }}>
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
                    boxShadow: [{
                      offsetX: 0,
                      offsetY: 24,
                      blurRadius: 48,
                      color: "rgba(0,0,0,0.5)",
                    }],
                  }),
                } as any}
              >
                {/* Header row */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", position: "relative", height: 44, marginBottom: 36 }}>
                  <TouchableOpacity
                    onPress={() => router.back()}
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
                    <ArrowLeft size={20} color="rgba(255,255,255,0.65)" />
                  </TouchableOpacity>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
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
                      Cloudora
                    </Text>
                  </View>
                </View>

                {/* Hero text */}
                <View style={{ alignItems: "center", marginBottom: 36 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ fontSize: 34, color: "#ffffff", fontWeight: "800", letterSpacing: -0.5 }}>Reset </Text>
                    <Text style={{ fontSize: 34, color: "#FF6B00", fontWeight: "800", letterSpacing: -0.5 }}>Password</Text>
                    <Text style={{ fontSize: 34, color: "rgba(255,255,255,0.25)", fontWeight: "300" }}>.</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 22, paddingHorizontal: 12 }}>
                    Enter your email address to request a password reset.
                  </Text>
                </View>

                {/* Email field */}
                <Animated.View style={fieldStyle(field1)}>
                  <AnimatedInput
                    label="Email Address"
                    icon="mail-outline"
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
                    suffix={emailCheckLoading ? <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" /> : null}
                  />
                  {!!emailTouched && !error && !!emailCheckMessage && (
                    <Text
                      style={{
                        color: emailExists === true ? 'rgba(74, 222, 128, 0.95)' : emailExists === false ? 'rgba(252,165,165,0.95)' : 'rgba(255,255,255,0.6)',
                        fontSize: 12,
                        marginTop: -10,
                        marginBottom: 12,
                        marginLeft: 4,
                        fontWeight: '600',
                      }}
                    >
                      {emailCheckMessage}
                    </Text>
                  )}
                </Animated.View>

                {/* Reset button */}
                <Animated.View style={[fieldStyle(field2), { transform: [{ scale: btnScale }] }]}>
                  <TouchableOpacity
                    onPress={handleReset}
                    disabled={loading || !canValidateEmail || emailExists !== true}
                    activeOpacity={0.85}
                    style={{
                      height: 58,
                      borderRadius: 18,
                      backgroundColor: "#FF6B00",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "hidden",
                      opacity: (loading || !canValidateEmail || emailExists !== true) ? 0.7 : 1,
                      marginTop: 10,
                      ...(Platform.OS === "web" ? {
                        boxShadow: "0 12px 32px rgba(255,107,0,0.45), 0 2px 8px rgba(255,107,0,0.3)",
                      } : {
                        boxShadow: [{
                          offsetX: 0,
                          offsetY: 10,
                          blurRadius: 20,
                          color: "rgba(255, 107, 0, 0.5)",
                        }],
                        }),
                    } as any}
                  >
                    {loading ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
                        <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 17 }}>Sending...</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Shield size={18} color="rgba(255,255,255,0.85)" />
                        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 17, letterSpacing: 0.3 }}>Request Reset</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                {/* Back to sign in */}
                <View style={{ alignItems: "center", marginTop: 24 }}>
                  <TouchableOpacity onPress={() => router.push('/(auth)/verify-security-questions' as any)} activeOpacity={0.7} style={{ marginBottom: 10 }}>
                    <Text style={{ color: "#FF6B00", fontWeight: "700", fontSize: 13 }}>
                      Prefer security question recovery? Continue here
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontWeight: "600", fontSize: 14 }}>
                      Back to <Text style={{ color: "#FF6B00", fontWeight: "700" }}>Sign In</Text>
                    </Text>
                  </TouchableOpacity>
                </View>

              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>

      <Modal visible={successModalOpen} animationType="fade" transparent>
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}>
          <View style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: '#13103A',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            padding: 20,
          }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Request Submitted</Text>
            <Text style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 22 }}>{successModalMessage}</Text>

            <TouchableOpacity
              onPress={() => {
                setSuccessModalOpen(false);
                router.back();
              }}
              style={{
                marginTop: 16,
                backgroundColor: '#FF6B00',
                borderRadius: 12,
                alignItems: 'center',
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Styles for web */}
      {Platform.OS === "web" && (
        <style>{`
            input, textarea {
              background-color: transparent !important;
              background: transparent !important;
              color: white !important;
              border: none !important;
              outline: none !important;
              padding: 0 !important;
            }
          `}</style>
      )}
    </>
  );
}
