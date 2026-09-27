/**
 * MobileSignIn Screen
 * 
 * Mobile-native sign-in screen designed specifically for touch & handheld devices:
 * - Edge-to-edge dark theme (#070514) with subtle radiant flame glow
 * - KeyboardAvoidingView with smooth scroll handling for on-screen keyboards
 * - Touch-optimized pill inputs (height 54, large hit-slop)
 * - Eye visibility toggle for password
 * - Direct integration with useAuthContext: validation, maintenance check,
 *   institution suspension check, and role-based routing
 * - Native error toasts and subtle shake on failure
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock, Mail, ShieldAlert, ArrowRight } from 'lucide-react-native';
import { MobileLivingBackground } from '@/components/landing/MobileLivingBackground';
import { CloudoraLogo } from '@/components/common/CloudoraLogo';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/libs/supabase';
import { safeSignOut } from '@/utils/safeSignOut';
import { LogoutReason } from '@/types/logout';
import { getAuthErrorMessage, validateEmail } from '@/utils/validation';
import { showError, showSuccess, showInfo } from '@/utils/toast';
import { mobileColors, MIN_TOUCH_TARGET } from '@/mobile/utils/platform';

const IconMail = Mail as any;
const IconLock = Lock as any;
const IconEye = Eye as any;
const IconEyeOff = EyeOff as any;
const IconArrowRight = ArrowRight as any;
const IconShieldAlert = ShieldAlert as any;

export const MobileSignIn: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, loading: isGlobalLoading, maintenanceModeMessage, refreshMaintenanceStatus, getRoleRedirect } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordInputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!validateEmail(email.trim())) {
      errs.email = 'Please enter a valid email';
    }
    if (!password) {
      errs.password = 'Password is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting || isGlobalLoading) return;

    if (!validate()) {
      triggerShake();
      showError('Incomplete Form', 'Please enter a valid email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanEmail = email.trim();
      const { error, data } = await signIn(cleanEmail, password);

      if (error) {
        showError('Sign In Failed', getAuthErrorMessage(error));
        triggerShake();
        setIsSubmitting(false);
        return;
      }

      if (!data?.user) {
        showError('Sign In Failed', 'Unable to complete sign in. Please try again.');
        triggerShake();
        setIsSubmitting(false);
        return;
      }

      // Fetch user profile & security flags
      const { data: userData, error: roleError } = await (supabase
        .from('users')
        .select('role, full_name, id, institution_id, must_change_password, requires_security_questions_setup')
        .eq('id', data.user.id)
        .single() as any);

      if (roleError || !userData) {
        showError('Sign In Failed', 'Could not load user profile. Please try again.');
        triggerShake();
        setIsSubmitting(false);
        return;
      }

      if (!userData.role) {
        showError('Sign In Failed', 'No role assigned to this account. Contact your administrator.');
        triggerShake();
        setIsSubmitting(false);
        return;
      }

      // Check global maintenance status
      const maintenance = await refreshMaintenanceStatus();
      if (maintenance.enabled && userData.role !== 'master_admin' && !!userData.institution_id) {
        showInfo('Maintenance', maintenance.message || maintenanceModeMessage || 'System maintenance in progress.');
        await safeSignOut('local', LogoutReason.UNKNOWN, true);
        triggerShake();
        setIsSubmitting(false);
        return;
      }

      // Verify Institution Subscription Status
      if (userData.role !== 'master_admin' && userData.institution_id) {
        const { data: instData, error: instError } = await (supabase
          .from('institutions')
          .select('subscription_status')
          .eq('id', userData.institution_id)
          .single() as any);

        if (instError || !instData) {
          showError('Access Denied', 'Could not verify institution status.');
          await safeSignOut('local', LogoutReason.AUTH_ERROR_403, true);
          setIsSubmitting(false);
          return;
        }

        if (instData.subscription_status === 'suspended' || instData.subscription_status === 'cancelled') {
          showError('Access Denied', "Your institution's account has been disabled.");
          triggerShake();
          await safeSignOut('local', LogoutReason.INSTITUTION_SUSPENDED, true);
          setIsSubmitting(false);
          return;
        }
      }

      showSuccess('Welcome', `Welcome back, ${userData.full_name || 'there'}!`);

      if (userData.must_change_password || userData.requires_security_questions_setup) {
        setTimeout(() => {
          router.replace('/(auth)/security-questions' as any);
        }, 200);
      } else {
        const redirectPath = getRoleRedirect(userData, userData.role === 'master_admin');
        if (redirectPath) {
          setTimeout(() => {
            router.replace(redirectPath as any);
          }, 150);
        }
      }
    } catch (e: any) {
      showError('Error', e?.message || 'An unexpected error occurred.');
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || isGlobalLoading;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Unified Cross-Screen Animated Living Background (Shared across Splash, Onboarding, Sign-In) */}
      <MobileLivingBackground />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Brand — Standalone Unboxed Cloud Logo */}
          <View style={styles.brandHeader}>
            <View style={styles.logoContainer}>
              <CloudoraLogo
                width={64}
                height={46}
                glow={true}
                glowIntensity={0.6}
              />
            </View>
            <Text style={styles.brandTitle}>CLOUDORA</Text>
            <Text style={styles.brandSubtitle}>Sign in to your learning workspace</Text>
          </View>

          {/* Form Card */}
          <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
            {/* 1. Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.email ? styles.inputWrapperError : null,
                ]}
              >
                <IconMail size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="name@school.edu"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* 2. Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.password ? styles.inputWrapperError : null,
                ]}
              >
                <IconLock size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.textInput}
                  placeholder="••••••••••••"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <IconEyeOff size={18} color="rgba(255,255,255,0.5)" />
                  ) : (
                    <IconEye size={18} color="rgba(255,255,255,0.5)" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {/* 3. Forgot Password Link (Correctly Positioned After Password Input, Before Primary CTA) */}
            <View style={styles.forgotPasswordContainer}>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password' as any)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Forgot password?"
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* 4. Primary Sign In CTA Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
              style={[styles.submitButton, isLoading ? { opacity: 0.7 } : null]}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Sign In</Text>
                  <IconArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <IconShieldAlert size={14} color="rgba(255,255,255,0.3)" style={{ marginRight: 6 }} />
            <Text style={styles.footerText}>
              Need credentials? Contact your school administration.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070514',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 64,
    height: 38,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 5,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: 'rgba(20, 16, 50, 0.75)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: -8,
    marginBottom: 24,
    paddingRight: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: mobileColors.flame,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 6,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  submitButton: {
    height: 54,
    backgroundColor: mobileColors.flame,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
  },
});

export default MobileSignIn;
