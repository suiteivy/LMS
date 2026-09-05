import { SettingsService } from '@/services/SettingsService';
import { useAuth } from '@/contexts/AuthContext';
import { router, Stack } from 'expo-router';
import { Shield, GraduationCap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { LivingBackground } from '@/components/landing/LivingBackground';

const IconIonicons = Ionicons as any;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        opacity: entranceOpacity,
        transform: [{ translateY: entranceTranslateY }],
      }}
    >
      <View style={{ position: 'relative', width: 38, height: 38 }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -8, left: -8, right: -8, bottom: -8,
            borderRadius: 27,
            backgroundColor: FLAME_GLOW,
            opacity: glowOpacity,
            ...(Platform.OS === 'web' ? { filter: 'blur(8px)' } : {}),
          } as any}
        />
        <Animated.View
          style={{
            width: 38, height: 38, borderRadius: 12,
            backgroundColor: FLAME_BG,
            borderWidth: 1.5, borderColor: 'rgba(255,107,0,0.5)',
            alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: pulseScale }],
            ...(Platform.OS === 'web' ? {
              boxShadow: '0 0 12px rgba(255,107,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
            } : {}),
          } as any}
        >
          <GraduationCap size={20} color={FLAME} />
        </Animated.View>
      </View>

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
  const mustChangePassword = !!profile?.must_change_password;
  const [selectedQuestionKey, setSelectedQuestionKey] = useState(securityPrompts[0].key);
  const [selectedAnswer, setSelectedAnswer]           = useState('');
  const [newPassword, setNewPassword]                 = useState('');
  const [confirmPassword, setConfirmPassword]         = useState('');
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading]                         = useState(false);

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
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(cardFade,  { toValue: 1, duration: 700, easing: EasingRN.out(EasingRN.quad), useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, useNativeDriver: true, friction: 8, tension: 55 }),
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 55 }),
    ]).start();
  }, []);

  const isPasswordSetupRequired = mustChangePassword;

  const submit = async () => {
    if (!selectedQuestionKey || !selectedAnswer.trim()) {
      Toast.show({ type: 'error', text1: 'Missing answer', text2: 'Please select one question and provide your answer.' });
      return;
    }

    if (isPasswordSetupRequired) {
      if (!newPassword || !confirmPassword) {
        Toast.show({ type: 'error', text1: 'Missing password fields', text2: 'Enter your new password and confirmation.' });
        return;
      }
      if (newPassword.length < 6) {
        Toast.show({ type: 'error', text1: 'Weak password', text2: 'New password must be at least 6 characters.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        Toast.show({ type: 'error', text1: 'Password mismatch', text2: 'New password and confirm password must match.' });
        return;
      }
    }

    try {
      setLoading(true);
      if (isPasswordSetupRequired) {
        await SettingsService.completeCredentialSetup(
          selectedQuestionKey,
          selectedAnswer.trim(),
          newPassword,
        );
      } else {
        await SettingsService.setupSecurityQuestions(selectedQuestionKey, selectedAnswer.trim());
      }

      const latestProfile = await refreshProfile();
      const redirectPath = getRoleRedirect(latestProfile, isPlatformAdmin);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: isPasswordSetupRequired
          ? 'Security question saved and password updated.'
          : 'Security question saved.',
      });

      if (redirectPath) {
        router.replace(redirectPath as any);
      }
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
        <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 540, alignSelf: 'center' }}>
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
              {/* ── LIQUID GLASS CARD ─────────────────────────────────── */}
              <Animated.View
                style={{
                  opacity: cardFade,
                  transform: [{ translateY: cardSlide }, { scale: cardScale }],
                  borderRadius: 28,
                  overflow: 'hidden',
                  ...(Platform.OS === 'web' ? {
                    backdropFilter: 'blur(40px) saturate(190%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(190%)',
                    background: `
                      linear-gradient(
                        165deg,
                        rgba(24, 15, 52, 0.82) 0%,
                        rgba(11, 7, 30, 0.88) 40%,
                        rgba(6, 4, 20, 0.94) 100%
                      )
                    `,
                    boxShadow: [
                      '0 0 0 1px rgba(255,255,255,0.1)',
                      '0 2px 4px rgba(0,0,0,0.35)',
                      '0 12px 24px -4px rgba(0,0,0,0.5)',
                      '0 24px 48px -8px rgba(0,0,0,0.65)',
                      '0 44px 88px -12px rgba(0,0,0,0.8)',
                      '0 0 90px -10px rgba(255,107,0,0.14)',
                      'inset 0 1px 1px 0 rgba(255,255,255,0.18)',
                      'inset 0 -1px 1px 0 rgba(0,0,0,0.45)',
                    ].join(', '),
                  } : {
                    backgroundColor: GLASS_BG,
                    borderWidth: 1,
                    borderColor: GLASS_BORDER,
                    boxShadow: [{
                      offsetX: 0, offsetY: 28, blurRadius: 60,
                      color: 'rgba(0,0,0,0.7)',
                    }],
                  }),
                } as any}
              >
                {/* Top refraction sheen */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 80,
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    ...(Platform.OS === 'web' ? {
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 100%)',
                    } : {
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    }),
                  } as any}
                />

                {/* Orange accent line at top card edge */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 0, left: 32, right: 32,
                    height: 1,
                    backgroundColor: 'rgba(255,107,0,0.3)',
                    borderRadius: 1,
                  }}
                />

                {/* Card content */}
                <View style={{ padding: 36 }}>

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
                  />

                  {/* ── PASSWORD SETUP FIELDS (IF REQUIRED) ── */}
                  {isPasswordSetupRequired && (
                    <>
                      <GlassInput
                        label="New Password"
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
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

                      <GlassInput
                        label="Confirm Password"
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
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
                    </>
                  )}

                  {/* ── SUBMIT BUTTON ── */}
                  <View style={{ marginTop: 12 }}>
                    <PrimaryButton
                      title={
                        isPasswordSetupRequired
                          ? 'Save & Update Password'
                          : 'Save Security Question'
                      }
                      onPress={submit}
                      loading={loading}
                      disabled={isProfileLoading}
                      scale={btnScale}
                    />
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
