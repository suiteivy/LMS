import { SettingsService } from '@/services/SettingsService';
import { validateEmail } from '@/utils/validation';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { ArrowLeft, GraduationCap } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Reanimated from 'react-native-reanimated';
import Toast from 'react-native-toast-message';

const IconIonicons = Ionicons as any;

type RecoveryStep = 'email' | 'question' | 'password';

const FloatingOrb = ({
  size,
  color,
  top,
  left,
  duration,
}: {
  size: number;
  color: string;
  top?: any;
  left?: any;
  duration: number;
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
          position: 'absolute',
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

const AnimatedInput = ({
  icon,
  label,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
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
      error ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.12)',
      error ? 'rgba(239,68,68,0.9)' : 'rgba(255,107,0,0.8)',
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
          fontWeight: '700',
          color: focused
            ? 'rgba(255,107,0,0.9)'
            : error
              ? 'rgba(239,68,68,0.8)'
              : 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase',
          letterSpacing: 2,
          marginBottom: 8,
          marginLeft: 2,
        } as any}
      >
        {label}
      </Text>

      <View style={{ position: 'relative' }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -3,
            left: -3,
            right: -3,
            bottom: -3,
            borderRadius: 20,
            borderWidth: 2,
            borderColor: error ? 'rgba(239,68,68,0.4)' : 'rgba(255,107,0,0.35)',
            opacity: glowOpacity,
          } as any}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: animatedBorderColor,
          } as any}
        />
        <View
          style={{
            height: 56,
            backgroundColor: 'transparent',
            borderRadius: 16,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <IconIonicons
              name={icon}
              size={20}
              color={
                focused
                  ? 'rgba(255,107,0,0.9)'
                  : error
                    ? 'rgba(239,68,68,0.7)'
                    : 'rgba(255,255,255,0.35)'
              }
            />
          </Animated.View>
          <TextInput
            style={{
              flex: 1,
              marginLeft: 12,
              color: '#ffffff',
              fontWeight: '600',
              fontSize: 15,
              height: '100%',
              backgroundColor: 'transparent',
              outline: 'none',
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
        </View>
      </View>

      {error ? (
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginLeft: 4 }}>
          <IconIonicons name="alert-circle" size={13} color="rgba(252,165,165,0.9)" />
          <Text style={{ color: 'rgba(252,165,165,0.9)', fontSize: 12, marginLeft: 4, fontWeight: '600' }}>
            {error}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
};

export default function VerifySecurityQuestionsScreen() {
  const [step, setStep] = useState<RecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [emailCheckMessage, setEmailCheckMessage] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(50)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const field1 = useRef(new Animated.Value(0)).current;
  const field2 = useRef(new Animated.Value(0)).current;
  const field3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, useNativeDriver: true, friction: 8, tension: 60 }),
    ]).start(() => {
      Animated.stagger(120, [
        Animated.spring(field1, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.spring(field2, { toValue: 1, useNativeDriver: true, friction: 7 }),
        Animated.spring(field3, { toValue: 1, useNativeDriver: true, friction: 7 }),
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

  const normalizedEmail = email.trim().toLowerCase();
  const canValidateEmail = validateEmail(normalizedEmail);

  useEffect(() => {
    if (!emailTouched || step !== 'email') return;

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
  }, [normalizedEmail, canValidateEmail, emailTouched, step]);

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

  const handleNextFromEmail = async () => {
    pressBtn();
    setError(null);

    if (!normalizedEmail) {
      setError('Email is required.');
      shakeCard();
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      shakeCard();
      return;
    }
    if (emailExists !== true) {
      setError('No account exists for this email.');
      shakeCard();
      return;
    }

    try {
      setLoading(true);
      const probe = await SettingsService.verifySecurityQuestions(normalizedEmail);
      if (!probe.requires_answer) {
        setError(probe.message || 'Unable to load your security question.');
        shakeCard();
        return;
      }
      setSelectedPrompt(probe.selected_question_prompt || null);
      setAttemptsRemaining(typeof probe.attempts_remaining === 'number' ? probe.attempts_remaining : null);
      setStep('question');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Unable to load your security question.');
      shakeCard();
    } finally {
      setLoading(false);
    }
  };

  const handleNextFromQuestion = async () => {
    pressBtn();
    setError(null);

    if (!answer.trim()) {
      setError('Enter your security question answer.');
      shakeCard();
      return;
    }

    try {
      setLoading(true);
      const result = await SettingsService.verifySecurityQuestions(normalizedEmail, answer.trim());

      if (!result.verified) {
        setAttemptsRemaining(typeof result.attempts_remaining === 'number' ? result.attempts_remaining : attemptsRemaining);
        setError(result.message || 'Invalid answer.');
        shakeCard();
        return;
      }

      setStep('password');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'SECURITY_ATTEMPTS_LIMIT') {
        setAttemptsRemaining(0);
      }
      setError(err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Verification failed');
      shakeCard();
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    pressBtn();
    setError(null);

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Fill both password fields.');
      shakeCard();
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      shakeCard();
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      shakeCard();
      return;
    }

    try {
      setLoading(true);
      const result = await SettingsService.verifySecurityQuestions(normalizedEmail, answer.trim(), newPassword);
      if (!result.verified) {
        setError(result.message || 'Unable to reset password.');
        shakeCard();
        return;
      }

      Toast.show({ type: 'success', text1: 'Password updated', text2: 'Sign in with your new password.' });
      router.replace('/(auth)/signIn' as any);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Unable to reset password.');
      shakeCard();
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  });

  const subtitle =
    step === 'email'
      ? 'Enter your account email to begin account recovery.'
      : step === 'question'
        ? 'Answer your selected security question to continue.'
        : 'Set a new password and confirm it to complete recovery.';

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: '#0F0B2E' }}>
        <FloatingOrb size={320} color="rgba(255,107,0,0.09)" top="-5%" left="-15%" duration={5000} />
        <FloatingOrb size={260} color="rgba(99,102,241,0.12)" top="55%" left="60%" duration={6500} />
        <FloatingOrb size={200} color="rgba(236,72,153,0.08)" top="30%" left="70%" duration={4500} />

        <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 500, alignSelf: 'center' }}>
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
              <Animated.View
                style={{
                  opacity: cardFade,
                  transform: [{ translateY: cardSlide }, { translateX: shakeX }],
                  backgroundColor: 'rgba(255,255,255,0.045)',
                  borderRadius: 32,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.09)',
                  padding: 32,
                  ...(Platform.OS === 'web'
                    ? {
                        backdropFilter: 'blur(24px)',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06) inset',
                      }
                    : {
                        boxShadow: [
                          {
                            offsetX: 0,
                            offsetY: 24,
                            blurRadius: 48,
                            color: 'rgba(0,0,0,0.5)',
                          },
                        ],
                      }),
                } as any}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative', height: 44, marginBottom: 36 }}>
                  <TouchableOpacity
                    onPress={() => (step === 'email' ? router.back() : setStep(step === 'password' ? 'question' : 'email'))}
                    activeOpacity={0.7}
                    style={{
                      position: 'absolute',
                      left: 0,
                      width: 42,
                      height: 42,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 14,
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <ArrowLeft size={20} color="rgba(255,255,255,0.65)" />
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Animated.View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        backgroundColor: 'rgba(255,107,0,0.2)',
                        borderWidth: 1,
                        borderColor: 'rgba(255,107,0,0.4)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: [{ scale: logoPulse }],
                      }}
                    >
                      <GraduationCap size={18} color="#FF6B00" />
                    </Animated.View>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 3, fontSize: 10 }}>
                      Cloudora
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'center', marginBottom: 30 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 34, color: '#ffffff', fontWeight: '800', letterSpacing: -0.5 }}>Recover </Text>
                    <Text style={{ fontSize: 34, color: '#FF6B00', fontWeight: '800', letterSpacing: -0.5 }}>Account</Text>
                    <Text style={{ fontSize: 34, color: 'rgba(255,255,255,0.25)', fontWeight: '300' }}>.</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 }}>
                    {subtitle}
                  </Text>
                </View>

                {error ? (
                  <View
                    style={{
                      backgroundColor: 'rgba(239,68,68,0.12)',
                      borderWidth: 1,
                      borderColor: 'rgba(239,68,68,0.3)',
                      padding: 14,
                      borderRadius: 14,
                      marginBottom: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <IconIonicons name="alert-circle" size={20} color="#f87171" />
                    <Text style={{ color: '#fca5a5', fontWeight: '600', flex: 1, fontSize: 13 }}>{error}</Text>
                  </View>
                ) : null}

                {step === 'email' ? (
                  <Animated.View style={fieldStyle(field1)}>
                    <AnimatedInput
                      label="Email Address"
                      icon="mail-outline"
                      placeholder="name@example.com"
                      value={email}
                      onChangeText={(value: string) => {
                        setEmail(value);
                        setEmailTouched(true);
                        setError(null);
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    {!!emailTouched && !error && !!emailCheckMessage ? (
                      <Text
                        style={{
                          color:
                            emailExists === true
                              ? 'rgba(74, 222, 128, 0.95)'
                              : emailExists === false
                                ? 'rgba(252,165,165,0.95)'
                                : 'rgba(255,255,255,0.6)',
                          fontSize: 12,
                          marginTop: -10,
                          marginBottom: 14,
                          marginLeft: 4,
                        }}
                      >
                        {emailCheckLoading ? 'Checking email...' : emailCheckMessage}
                      </Text>
                    ) : null}

                    <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                      <TouchableOpacity
                        onPress={handleNextFromEmail}
                        disabled={loading || emailCheckLoading}
                        activeOpacity={0.85}
                        style={{
                          height: 58,
                          borderRadius: 18,
                          backgroundColor: '#FF6B00',
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: loading || emailCheckLoading ? 0.7 : 1,
                        }}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
                        ) : (
                          <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>Next</Text>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  </Animated.View>
                ) : null}

                {step === 'question' ? (
                  <>
                    <Animated.View style={fieldStyle(field2)}>
                      <View style={{ marginBottom: 12 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>Security Question</Text>
                        <View
                          style={{
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            borderColor: 'rgba(255,255,255,0.12)',
                            borderWidth: 1,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            paddingVertical: 12,
                            marginBottom: 10,
                          }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700' }}>{selectedPrompt}</Text>
                        </View>

                        <AnimatedInput
                          label="Your Answer"
                          icon="help-circle-outline"
                          placeholder="Enter answer"
                          value={answer}
                          onChangeText={(value: string) => {
                            setAnswer(value);
                            setError(null);
                          }}
                          autoCapitalize="none"
                        />

                        {typeof attemptsRemaining === 'number' ? (
                          <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: -8, marginBottom: 8 }}>
                            Attempts remaining this hour: {attemptsRemaining}
                          </Text>
                        ) : null}
                      </View>
                    </Animated.View>

                    <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                      <TouchableOpacity
                        onPress={handleNextFromQuestion}
                        disabled={loading}
                        activeOpacity={0.85}
                        style={{
                          height: 58,
                          borderRadius: 18,
                          backgroundColor: '#FF6B00',
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: loading ? 0.7 : 1,
                        }}
                      >
                        {loading ? (
                          <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
                        ) : (
                          <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>Next</Text>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  </>
                ) : null}

                {step === 'password' ? (
                  <>
                    <Animated.View style={fieldStyle(field2)}>
                      <AnimatedInput
                        label="New Password"
                        icon="lock-closed-outline"
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChangeText={(value: string) => {
                          setNewPassword(value);
                          setError(null);
                        }}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                    </Animated.View>

                    <Animated.View style={fieldStyle(field3)}>
                      <AnimatedInput
                        label="Confirm Password"
                        icon="lock-closed-outline"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChangeText={(value: string) => {
                          setConfirmPassword(value);
                          setError(null);
                        }}
                        secureTextEntry
                        autoCapitalize="none"
                      />
                    </Animated.View>

                    <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                      <TouchableOpacity
                        onPress={handleResetPassword}
                        disabled={loading}
                        activeOpacity={0.85}
                        style={{
                          height: 58,
                          borderRadius: 18,
                          backgroundColor: '#FF6B00',
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: loading ? 0.7 : 1,
                        }}
                      >
                        {loading ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
                            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 17 }}>Saving...</Text>
                          </View>
                        ) : (
                          <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>Reset Password</Text>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  </>
                ) : null}
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </>
  );
}
