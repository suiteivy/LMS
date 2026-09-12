import { SettingsService } from '@/services/SettingsService';
import { useAuth } from '@/contexts/AuthContext';
import { router, Stack } from 'expo-router';
import { Shield } from 'lucide-react-native';
import { CloudoraLogo } from '@/components/common/CloudoraLogo';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Clipboard,
  Dimensions,
  Easing as EasingRN,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { LivingBackground } from '@/components/landing/LivingBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { getPasswordRequirementStatuses } from '@/utils/validation';
import { safeSignOut } from '@/utils/safeSignOut';
import { LogoutReason } from '@/types/logout';

const IconIonicons = Ionicons as any;
const CAN_USE_NATIVE_DRIVER = Platform.OS !== 'web';

// ─── Design Tokens ──────────────────────────────────────────────────────────
const FLAME        = '#FF6B00';
const FLAME_DIM    = 'rgba(255,107,0,0.8)';
const FLAME_GLOW   = 'rgba(255,107,0,0.35)';
const FLAME_BG     = 'rgba(255,107,0,0.12)';
const GLASS_BG     = 'rgba(8,5,28,0.72)';
const GLASS_BORDER = 'rgba(255,255,255,0.09)';
const INPUT_BG     = 'rgba(255,255,255,0.04)';
const WHITE_FADE   = 'rgba(255,255,255,0.18)';

const securityPrompts = [
  { key: 'q_childhood_nickname', prompt: 'What is your childhood nickname?' },
  { key: 'q_first_school', prompt: 'What is the name of your first school?' },
  { key: 'q_birth_city', prompt: 'What city were you born in?' },
];

const generateUniqueRecoveryCode = (): string => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const segments: string[] = [];
  for (let s = 0; s < 4; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      let randIndex: number;
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint8Array(1);
        crypto.getRandomValues(array);
        randIndex = array[0] % chars.length;
      } else {
        randIndex = Math.floor(Math.random() * chars.length);
      }
      segment += chars[randIndex];
    }
    segments.push(segment);
  }
  return segments.join('-');
};

// ─── GlassInput Component ───────────────────────────────────────────────────
const GlassInput = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete = 'off',
  textContentType = 'none',
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
      error ? 'rgba(239,68,68,0.5)' : hovered ? 'rgba(255,107,0,0.32)' : GLASS_BORDER,
      error ? 'rgba(239,68,68,0.9)' : FLAME_DIM,
    ],
  });

  const outerGlowOpacity = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const hoverBgOpacity   = hoverAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={{ marginBottom: 18 }}>
      <Text
        style={{
          color: error
            ? 'rgba(239,68,68,0.75)'
            : focused
              ? 'rgba(255,107,0,0.85)'
              : 'rgba(255,255,255,0.45)',
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: 0.4,
          marginBottom: 8,
          marginLeft: 4,
        }}
      >
        {label}
      </Text>

      <View style={{ position: 'relative', height: 56, justifyContent: 'center' }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -4, left: -4, right: -4, bottom: -4,
            borderRadius: 28,
            borderWidth: 1.5,
            borderColor: error ? 'rgba(239,68,68,0.3)' : FLAME_GLOW,
            opacity: outerGlowOpacity,
          } as any}
        />

        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: 24,
            borderWidth: 1,
            borderColor,
          } as any}
        />

        <Pressable
          onHoverIn={onHoverIn}
          onHoverOut={onHoverOut}
          style={{
            height: '100%',
            width: '100%',
            backgroundColor: INPUT_BG,
            borderRadius: 24,
            paddingHorizontal: 20,
            flexDirection: 'row',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            ...(Platform.OS === 'web' ? { outline: 'none' } : {}),
          } as any}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.04)',
              opacity: hoverBgOpacity,
            } as any}
          />

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0, left: 16, right: 16,
              height: 1,
              backgroundColor: WHITE_FADE,
              borderRadius: 1,
            }}
          />

          <TextInput
            style={{
              flex: 1,
              height: '100%',
              color: '#ffffff',
              fontWeight: '500',
              fontSize: 15,
              backgroundColor: 'transparent',
              outline: 'none',
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
            autoCorrect={false}
            spellCheck={false}
            autoComplete={autoComplete}
            textContentType={textContentType}
            {...(Platform.OS === 'web' ? {
              'data-lpignore': 'true',
              'data-1p-ignore': 'true',
              'data-form-type': 'other',
            } : {})}
          />
          {suffix && <View style={{ zIndex: 3 }}>{suffix}</View>}
        </Pressable>
      </View>

      {error && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 4 }}>
          <IconIonicons name="alert-circle" size={13} color="rgba(252,165,165,0.9)" />
          <Text style={{ color: 'rgba(252,165,165,0.9)', fontSize: 12, marginLeft: 4, fontWeight: '600' }}>
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
    outputRange: ['rgba(255,107,0,0)', 'rgba(255,140,64,0.18)'],
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
        overflow: 'hidden',
        alignSelf: 'center',
        width: '100%',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {!disabled && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -6, left: -6, right: -6, bottom: -6,
            borderRadius: 30,
            backgroundColor: 'rgba(255,107,0,0.18)',
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
            height: 58,
            borderRadius: 24,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            position: 'relative',
            ...(Platform.OS === 'web' ? {
              background: loading || disabled
                ? 'rgba(255,107,0,0.5)'
                : 'linear-gradient(135deg, #FF8C40 0%, #FF6B00 45%, #E85D00 100%)',
              boxShadow: hovered && !loading && !disabled
                ? '0 0 0 1px rgba(255,140,64,0.5), 0 16px 40px rgba(255,107,0,0.55), 0 4px 12px rgba(255,107,0,0.4)'
                : '0 12px 32px rgba(255,107,0,0.4), 0 2px 8px rgba(255,107,0,0.3)',
              transition: 'box-shadow 0.2s ease',
              cursor: loading || disabled ? 'default' : 'pointer',
            } : {
              backgroundColor: loading || disabled ? 'rgba(255,107,0,0.55)' : FLAME,
              boxShadow: [{
                offsetX: 0, offsetY: 12, blurRadius: 28,
                color: 'rgba(255,107,0,0.5)',
              }],
            }),
          } as any,
        ]}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: '50%',
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        />

        {Platform.OS === 'web' && !disabled && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0, bottom: 0,
              width: 80,
              backgroundColor: 'rgba(255,255,255,0.22)',
              transform: [{ translateX: sweepTranslateX }, { skewX: '-18deg' } as any],
            }}
          />
        )}

        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: hoverBgColor,
          } as any}
        />

        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>
              Saving…
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Shield size={18} color="rgba(255,255,255,0.92)" />
            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 }}>
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        opacity: entranceOpacity,
        transform: [{ translateY: entranceTranslateY }],
      }}
    >
      {/* Unboxed Logo mark */}
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pulseScale }],
        }}
      >
        <CloudoraLogo size={30} glow glowIntensity={0.65} />
      </Animated.View>

      <Text
        style={{
          color: 'rgba(255,255,255,0.75)',
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: 4,
          fontSize: 12,
        }}
      >
        Cloudora
      </Text>
    </Animated.View>
  );
};

// ─── Main SecurityQuestionsSetup Screen ────────────────────────────────────
export default function SecurityQuestionsSetup() {
  const { profile, isProfileLoading, refreshProfile, getRoleRedirect, isPlatformAdmin } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 960;

  const mustChangePassword = !!profile?.must_change_password;
  const [selectedQuestionKey, setSelectedQuestionKey] = useState(securityPrompts[0].key);
  const [selectedAnswer, setSelectedAnswer]           = useState('');
  const [recoveryCode, setRecoveryCode]               = useState(() => generateUniqueRecoveryCode());
  const [copiedCode, setCopiedCode]                   = useState(false);
  const [newPassword, setNewPassword]                 = useState('');
  const [confirmPassword, setConfirmPassword]         = useState('');
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading]                         = useState(false);

  const handleCopyCode = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(recoveryCode);
      } else {
        Clipboard.setString(recoveryCode);
      }
      setCopiedCode(true);
      Toast.show({
        type: 'success',
        text1: 'Recovery Code Copied',
        text2: 'Store this code safely. It can be used if you forget your answer.',
        position: 'top',
        visibilityTime: 3000,
      });
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      Clipboard.setString(recoveryCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleRegenerateCode = () => {
    const freshCode = generateUniqueRecoveryCode();
    setRecoveryCode(freshCode);
    setCopiedCode(false);
    Toast.show({
      type: 'info',
      text1: 'New Recovery Code Generated',
      text2: 'Make sure to copy and store your new code.',
      position: 'top',
      visibilityTime: 3000,
    });
  };

  // Entrance animations
  const cardFade     = useRef(new Animated.Value(0)).current;
  const cardSlide    = useRef(new Animated.Value(60)).current;
  const cardScale    = useRef(new Animated.Value(0.97)).current;
  const logoEntrance = useRef(new Animated.Value(0)).current;
  const btnScale     = useRef(new Animated.Value(1)).current;

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
    ]).start();
  }, []);

  const isPasswordSetupRequired = mustChangePassword;

  // Real-time password requirement statuses
  const passwordStatuses = getPasswordRequirementStatuses(newPassword);
  const isPasswordValid = passwordStatuses.every((r) => r.met);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isAnswerValid = selectedAnswer.trim().length > 0;

  const isFormValid = isPasswordSetupRequired
    ? isAnswerValid && isPasswordValid && passwordsMatch
    : isAnswerValid;

  const inlineValidationError = (() => {
    if (!isAnswerValid) return 'Please provide an answer for your security question.';
    if (isPasswordSetupRequired) {
      if (!newPassword) return 'Please enter a new password.';
      if (!isPasswordValid) return 'New password does not meet all policy requirements.';
      if (!confirmPassword) return 'Please confirm your new password.';
      if (!passwordsMatch) return 'Passwords do not match.';
    }
    return null;
  })();

  const submit = async () => {
    if (!isFormValid) {
      if (inlineValidationError) {
        Toast.show({ type: 'error', text1: 'Validation Error', text2: inlineValidationError });
      }
      return;
    }

    try {
      setLoading(true);
      if (isPasswordSetupRequired) {
        await SettingsService.completeCredentialSetup(
          selectedQuestionKey,
          selectedAnswer.trim(),
          newPassword,
          recoveryCode,
        );
      } else {
        await SettingsService.setupSecurityQuestions(
          selectedQuestionKey,
          selectedAnswer.trim(),
          recoveryCode,
        );
      }

      // Explicitly sign out to invalidate current session and prevent stale session errors
      await safeSignOut('local', LogoutReason.USER_INITIATED, true);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          for (let i = window.localStorage.length - 1; i >= 0; i--) {
            const key = window.localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
              window.localStorage.removeItem(key);
            }
          }
        } catch {}
      }

      Toast.show({
        type: 'success',
        text1: 'Setup Complete',
        text2: isPasswordSetupRequired
          ? 'Your password, security question, and recovery code have been saved. Please sign in with your new password.'
          : 'Security question and recovery code saved. Please sign in to continue.',
        position: 'top',
        visibilityTime: 6000,
      });

      router.replace('/(auth)/signIn' as any);
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to complete setup';
      if (isPasswordSetupRequired && String(err?.response?.data?.code || '').startsWith('CREDENTIAL_SETUP_PARTIAL_')) {
        const partialCode = String(err?.response?.data?.code || '');
        const partialMessage = partialCode === 'CREDENTIAL_SETUP_PARTIAL_PASSWORD_UPDATED'
          ? 'Your password was updated. Retry this step to save security question. Use the new password for your next login.'
          : message;
        Toast.show({
          type: 'info',
          text1: 'Setup partially applied',
          text2: partialMessage,
        });
      } else {
        Toast.show({ type: 'error', text1: 'Failed', text2: message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Living background */}
      <LivingBackground />

      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: isWide ? 1080 : 540, alignSelf: 'center' }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={60}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── RESPONSIVE LIQUID GLASS WRAPPER ────────────────── */}
              <Animated.View
                style={{
                  opacity: cardFade,
                  transform: [{ translateY: cardSlide }, { scale: cardScale }],
                  width: '100%',
                }}
              >
                <View style={{ flexDirection: isWide ? 'row' : 'column', gap: 24, alignItems: isWide ? 'flex-start' : 'stretch', width: '100%' }}>
                  {/* ── LEFT COLUMN: SECURITY SETUP FORM CARD ── */}
                  <View style={{ flex: isWide ? 1.2 : undefined, width: isWide ? undefined : '100%' }}>
                    <GlassCard
                      variant="modal"
                      accentColor={FLAME}
                      glowColor="rgba(255, 107, 0, 0.25)"
                      borderRadius={28}
                      style={{ width: '100%' }}
                      contentStyle={{ padding: 36 }}
                    >
                      {/* ── TOP ROW: Logo right ──────── */}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        marginBottom: 28,
                      }}>
                        <LogoLockup entranceAnim={logoEntrance} />
                      </View>

                      {/* ── HEADING BLOCK — left-aligned, accent underline ── */}
                      <View style={{ marginBottom: 30 }}>
                        <Text style={{
                          fontSize: 32,
                          color: '#ffffff',
                          fontWeight: '800',
                          letterSpacing: -0.5,
                          marginBottom: 6,
                        }}>
                          Security Setup
                        </Text>

                        {/* Accent underline bar */}
                        <View style={{
                          width: 44,
                          height: 2.5,
                          backgroundColor: FLAME,
                          borderRadius: 2,
                          marginBottom: 12,
                          ...(Platform.OS === 'web' ? {
                            boxShadow: `0 0 10px ${FLAME_GLOW}, 0 0 4px rgba(255,107,0,0.5)`,
                          } : {}),
                        } as any} />

                        <Text style={{
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.38)',
                          lineHeight: 20,
                        }}>
                          Save your recovery question and set a new password to continue
                        </Text>
                      </View>

                      {/* ── PICKER: SECURITY QUESTION ── */}
                      <View style={{ marginBottom: 18 }}>
                        <Text style={{
                          color: 'rgba(255,255,255,0.45)',
                          fontSize: 13,
                          fontWeight: '600',
                          letterSpacing: 0.4,
                          marginBottom: 8,
                          marginLeft: 4,
                        }}>
                          Security Question
                        </Text>

                        <View style={{
                          height: 56,
                          backgroundColor: INPUT_BG,
                          borderWidth: 1,
                          borderColor: GLASS_BORDER,
                          borderRadius: 24,
                          overflow: 'hidden',
                          justifyContent: 'center',
                          paddingHorizontal: 16,
                          ...(Platform.OS === 'web' ? { outline: 'none' } : {}),
                        }}>
                          <Picker
                            selectedValue={selectedQuestionKey}
                            onValueChange={(v) => setSelectedQuestionKey(String(v))}
                            style={{
                              color: '#ffffff',
                              backgroundColor: 'transparent',
                              border: 'none',
                              outline: 'none',
                              fontSize: 14,
                              fontWeight: '500',
                            } as any}
                            dropdownIconColor="rgba(255,255,255,0.6)"
                          >
                            {securityPrompts.map((question) => (
                              <Picker.Item
                                key={question.key}
                                label={question.prompt}
                                value={question.key}
                                color={Platform.OS === 'web' ? '#000000' : '#ffffff'}
                              />
                            ))}
                          </Picker>
                        </View>
                      </View>

                      {/* ── ANSWER INPUT ── */}
                      <GlassInput
                        label="Answer"
                        placeholder="Enter your security answer"
                        value={selectedAnswer}
                        onChangeText={setSelectedAnswer}
                        autoCapitalize="none"
                        autoComplete="off"
                        textContentType="none"
                      />

                      {/* ── UNIQUE RECOVERY CODE BLOCK ── */}
                      <View style={{
                        marginBottom: 20,
                        padding: 18,
                        borderRadius: 20,
                        backgroundColor: 'rgba(255, 107, 0, 0.05)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 107, 0, 0.22)',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                            <IconIonicons name="key-outline" size={16} color={FLAME} />
                            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700', letterSpacing: 0.3 }}>
                              Emergency Recovery Code
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={handleRegenerateCode}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6 }}
                            activeOpacity={0.7}
                          >
                            <IconIonicons name="refresh" size={12} color="rgba(255,255,255,0.5)" />
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' }}>
                              Regenerate
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 17, marginBottom: 12 }}>
                          Unique emergency code. You can use this to recover your account if you forget your security question answer.
                        </Text>

                        {/* Code Display + Copy Button */}
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: 'rgba(0,0,0,0.35)',
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: copiedCode ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255,255,255,0.08)',
                          paddingLeft: 16,
                          paddingRight: 6,
                          paddingVertical: 6,
                          gap: 8,
                        }}>
                          <Text
                            selectable
                            style={{
                              color: copiedCode ? '#4ade80' : '#ffffff',
                              fontSize: 15,
                              fontWeight: '700',
                              letterSpacing: 2,
                              fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
                              flex: 1,
                            }}
                          >
                            {recoveryCode}
                          </Text>

                          <TouchableOpacity
                            onPress={handleCopyCode}
                            activeOpacity={0.8}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                              borderRadius: 12,
                              backgroundColor: copiedCode ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,107,0,0.18)',
                              borderWidth: 1,
                              borderColor: copiedCode ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255,107,0,0.35)',
                            }}
                          >
                            <IconIonicons
                              name={copiedCode ? 'checkmark-circle' : 'copy-outline'}
                              size={15}
                              color={copiedCode ? '#4ade80' : FLAME}
                            />
                            <Text style={{
                              color: copiedCode ? '#4ade80' : '#ffffff',
                              fontSize: 12,
                              fontWeight: '700',
                            }}>
                              {copiedCode ? 'Copied!' : 'Copy Code'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* ── PASSWORD SETUP FIELDS (IF REQUIRED) ── */}
                      {isPasswordSetupRequired && (
                        <>
                          <GlassInput
                            label="New Password"
                            placeholder="At least 8 characters"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                            autoComplete="new-password"
                            textContentType="none"
                            suffix={
                              <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={{ padding: 4 }}
                                activeOpacity={0.7}
                              >
                                <IconIonicons
                                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                  size={20}
                                  color="rgba(255,255,255,0.35)"
                                />
                              </TouchableOpacity>
                            }
                          />

                          {/* Live Password Requirements Checklist */}
                          <View style={{ marginTop: -8, marginBottom: 18, paddingHorizontal: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                              Password Requirements:
                            </Text>
                            {passwordStatuses.map((req) => (
                              <View key={req.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 }}>
                                <IconIonicons
                                  name={req.met ? "checkmark-circle" : "ellipse-outline"}
                                  size={14}
                                  color={req.met ? "#4ade80" : "rgba(255,255,255,0.3)"}
                                />
                                <Text style={{ fontSize: 12, color: req.met ? "#4ade80" : "rgba(255,255,255,0.5)", fontWeight: req.met ? '600' : '400' }}>
                                  {req.label}
                                </Text>
                              </View>
                            ))}
                          </View>

                          <GlassInput
                            label="Confirm Password"
                            placeholder="Re-enter your new password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showConfirmPassword}
                            autoCapitalize="none"
                            autoComplete="new-password"
                            textContentType="none"
                            suffix={
                              <TouchableOpacity
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{ padding: 4 }}
                                activeOpacity={0.7}
                              >
                                <IconIonicons
                                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                                  size={20}
                                  color="rgba(255,255,255,0.35)"
                                />
                              </TouchableOpacity>
                            }
                          />

                          {/* Live Password Match Indicator */}
                          {confirmPassword.length > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -10, marginBottom: 18, marginLeft: 4, gap: 6 }}>
                              <IconIonicons
                                name={passwordsMatch ? "checkmark-circle" : "close-circle"}
                                size={14}
                                color={passwordsMatch ? "#4ade80" : "#f87171"}
                              />
                              <Text style={{ fontSize: 12, fontWeight: '600', color: passwordsMatch ? "#4ade80" : "#f87171" }}>
                                {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                              </Text>
                            </View>
                          )}
                        </>
                      )}

                      {/* Specific Inline Error for whichever condition is failing */}
                      {inlineValidationError && (selectedAnswer.length > 0 || newPassword.length > 0 || confirmPassword.length > 0) && (
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: 14,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderRadius: 14,
                          backgroundColor: 'rgba(239,68,68,0.12)',
                          borderWidth: 1,
                          borderColor: 'rgba(239,68,68,0.25)',
                          gap: 8,
                        }}>
                          <IconIonicons name="alert-circle" size={16} color="#fca5a5" />
                          <Text style={{ color: '#fca5a5', fontSize: 12, fontWeight: '600', flex: 1 }}>
                            {inlineValidationError}
                          </Text>
                        </View>
                      )}

                      {/* ── SUBMIT BUTTON ── */}
                      <View style={{ marginTop: 6 }}>
                        <PrimaryButton
                          title={
                            isPasswordSetupRequired
                              ? 'Save & Update Password'
                              : 'Save Security Question'
                          }
                          onPress={submit}
                          loading={loading}
                          disabled={!isFormValid || loading || isProfileLoading}
                          scale={btnScale}
                        />
                      </View>
                    </GlassCard>
                  </View>

                  {/* ── RIGHT COLUMN: SIDE INFORMATION PANEL ── */}
                  <View style={{ flex: isWide ? 0.95 : undefined, width: isWide ? undefined : '100%' }}>
                    <GlassCard
                      variant="modal"
                      accentColor={FLAME}
                      glowColor="rgba(255, 107, 0, 0.2)"
                      borderRadius={28}
                      style={{ width: '100%' }}
                      contentStyle={{ padding: 28 }}
                    >
                      {/* Header with Icon */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                        <View style={{
                          width: 44,
                          height: 44,
                          borderRadius: 15,
                          backgroundColor: 'rgba(255,107,0,0.15)',
                          borderWidth: 1,
                          borderColor: 'rgba(255,107,0,0.35)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <IconIonicons name="shield-checkmark" size={24} color={FLAME} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '800', letterSpacing: -0.2 }}>
                            Important Security Notice
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                            Save your credentials before leaving
                          </Text>
                        </View>
                      </View>

                      {/* Prominent reminder alert callout */}
                      <View style={{
                        backgroundColor: 'rgba(255, 107, 0, 0.08)',
                        borderLeftWidth: 3,
                        borderLeftColor: FLAME,
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 20,
                      }}>
                        <Text style={{ color: '#ffffff', fontSize: 13, lineHeight: 19, fontWeight: '700' }}>
                          Remember your security question answer and store both your answer and recovery code safely.
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: 18, marginTop: 6 }}>
                          These credentials will be strictly required to verify your identity and restore access if you ever forget your password.
                        </Text>
                      </View>

                      {/* Step-by-step guidance list */}
                      <View style={{ gap: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                          <View style={{ marginTop: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                            <IconIonicons name="help-circle-outline" size={14} color={FLAME} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>
                              1. Remember Your Answer
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 17 }}>
                              Your security answer is case-insensitive, but spelling must match. Record or memorize it accurately.
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                          <View style={{ marginTop: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                            <IconIonicons name="copy-outline" size={14} color={FLAME} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>
                              2. Store Your Recovery Code
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 17 }}>
                              Copy and save your unique recovery code into a password manager, encrypted note, or secure physical location.
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                          <View style={{ marginTop: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                            <IconIonicons name="refresh-circle-outline" size={14} color={FLAME} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>
                              3. Emergency Password Reset
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 17 }}>
                              If you ever forget your password, you can reset it with your security answer. If you also forget the answer, this recovery code is your emergency bypass.
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Hashing privacy notice */}
                      <View style={{
                        marginTop: 22,
                        padding: 12,
                        borderRadius: 14,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.08)',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <IconIonicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.4)" />
                        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, flex: 1, lineHeight: 16 }}>
                          Answers and recovery codes are salted and cryptographically hashed before being stored in Cloudora.
                        </Text>
                      </View>
                    </GlassCard>
                  </View>
                </View>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>

      {/* Web styles */}
      {Platform.OS === 'web' && (
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
          /* Autofill kill */
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0px 1000px #08051c inset !important;
            box-shadow: 0 0 0px 1000px #08051c inset !important;
            -webkit-text-fill-color: rgba(255,255,255,0.95) !important;
            caret-color: white !important;
            transition: background-color 9999s ease-in-out 0s;
          }
          select {
            background-color: transparent !important;
            color: white !important;
            border: none !important;
            outline: none !important;
          }
          select option {
            background-color: #0b071e !important;
            color: white !important;
          }
        `}</style>
      )}
    </>
  );
}
