import { SettingsService } from '@/services/SettingsService';
import { supabase } from '@/libs/supabase';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { LivingBackground } from '@/components/landing/LivingBackground';
import { GlassCard } from '@/components/ui/GlassCard';
import { showError, showInfo, showWarning } from '@/utils/toast';

const FLAME = '#FF6B00';
const GLASS_BORDER = 'rgba(255,255,255,0.09)';

type DeliveryErrorCode =
  | 'missing_token'
  | 'invalid_link'
  | 'expired_link'
  | 'handoff_failed'
  | 'unknown';

const sanitizeAuthErrorMessage = (raw: unknown, fallback: string) => {
  const text = String(raw || '').trim();
  if (!text) return fallback;
  if (/database|schema|relation|syntax|postgres|supabase|failed to fetch|network/i.test(text)) {
    return fallback;
  }
  return text;
};

export default function CredentialDeliveryScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = useMemo(() => (typeof params.token === 'string' ? params.token : ''), [params.token]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<DeliveryErrorCode>('unknown');
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [isHandingOff, setIsHandingOff] = useState(false);

  const runSecureHandoff = useCallback(async (targetToken: string, targetEmail: string, targetPassword: string) => {
    if (!targetEmail || !targetPassword) {
      setErrorCode('handoff_failed');
      setError('Missing temporary credentials required for secure setup handoff.');
      return;
    }

    try {
      setIsHandingOff(true);

      const { data: existingSession } = await supabase.auth.getSession();
      if (existingSession?.session?.user?.email?.toLowerCase() !== targetEmail.toLowerCase()) {
        await supabase.auth.signOut();
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      });

      if (signInError) {
        throw signInError;
      }

      try {
        await SettingsService.consumeCredentialDelivery(targetToken);
      } catch (consumeErr: any) {
        const status = Number(consumeErr?.response?.status || 0);
        const consumeMessage = String(consumeErr?.response?.data?.error || consumeErr?.message || '');
        const alreadyConsumed = status === 410 || /already been used/i.test(consumeMessage);
        const legacyBackendNoConsumeRoute = status === 404;
        if (!alreadyConsumed && !legacyBackendNoConsumeRoute) {
          throw consumeErr;
        }
      }

      showInfo('Link verified', 'Opening your security setup page...');
      router.replace('/(auth)/security-questions' as any);
    } catch (err: any) {
      const raw = sanitizeAuthErrorMessage(
        err?.message || err?.response?.data?.error,
        'Unable to establish secure session for setup. Please retry.',
      );
      setErrorCode('handoff_failed');
      setError(raw);
      showError('Secure handoff failed', 'We could not open your setup session automatically. Retry once.');
    } finally {
      setIsHandingOff(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setErrorCode('missing_token');
        setError('Missing one-time credential token in this link.');
        showWarning('Invalid link', 'This one-time setup link is incomplete. Request a new link from your administrator.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await SettingsService.getCredentialDelivery(token);
        const targetEmail = String(data.email || '').trim();
        const targetPassword = String(data.temporary_password || '').trim();
        setEmail(targetEmail);
        setTemporaryPassword(targetPassword);
        await runSecureHandoff(token, targetEmail, targetPassword);
      } catch (err: any) {
        const status = Number(err?.response?.status || 0);
        const raw = sanitizeAuthErrorMessage(
          err?.response?.data?.error || err?.message,
          'Unable to validate one-time credential link.',
        );
        const isExpired = status === 410 || /expired|already been used/i.test(raw);
        const isInvalid = status === 404 || /invalid/i.test(raw);

        if (isExpired) {
          setErrorCode('expired_link');
          setError('This one-time setup link has expired or was already used.');
          showWarning('Link expired', 'This one-time setup link is no longer valid. Request a fresh link from your administrator.');
        } else if (isInvalid) {
          setErrorCode('invalid_link');
          setError('This one-time setup link is invalid.');
          showWarning('Invalid link', 'The credential link is invalid. Request a new one from your administrator.');
        } else {
          setErrorCode('unknown');
          setError(raw);
          showError('Credential link error', 'We could not validate this one-time setup link. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token, runSecureHandoff]);

  return (
    <>
      <Stack.Screen options={{ title: 'Credential Delivery', headerShown: false }} />
      <LivingBackground />
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 540, alignSelf: 'center' }}>
          <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
            <GlassCard
              variant="modal"
              accentColor={FLAME}
              glowColor="rgba(255, 107, 0, 0.25)"
              borderRadius={28}
              style={{ width: '100%' }}
              contentStyle={{ padding: 32 }}
            >
              <Text style={{ color: '#ffffff', fontSize: 30, fontWeight: '800', letterSpacing: -0.4, marginBottom: 8 }}>
                Secure Setup Link
              </Text>
              <View
                style={{
                  width: 44,
                  height: 2.5,
                  backgroundColor: FLAME,
                  borderRadius: 2,
                  marginBottom: 14,
                  ...(Platform.OS === 'web' ? { boxShadow: '0 0 10px rgba(255,107,0,0.35)' } : {}),
                } as any}
              />
              <Text style={{ color: 'rgba(255,255,255,0.42)', fontSize: 13, lineHeight: 20, marginBottom: 24 }}>
                We are validating your one-time credential link and opening your security question setup directly.
              </Text>

              {(loading || isHandingOff) && (
                <View style={{ paddingVertical: 22, alignItems: 'center' }}>
                  <ActivityIndicator color={FLAME} />
                  <Text style={{ marginTop: 12, color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '600' }}>
                    {loading ? 'Validating secure link...' : 'Preparing your setup session...'}
                  </Text>
                </View>
              )}

              {!loading && !isHandingOff && !!error && (
                <View
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: errorCode === 'expired_link' || errorCode === 'invalid_link'
                      ? 'rgba(251,146,60,0.35)'
                      : 'rgba(239,68,68,0.35)',
                    backgroundColor: errorCode === 'expired_link' || errorCode === 'invalid_link'
                      ? 'rgba(255,107,0,0.12)'
                      : 'rgba(239,68,68,0.12)',
                    padding: 14,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700', marginBottom: 4 }}>
                    {errorCode === 'expired_link' ? 'Link expired'
                      : errorCode === 'invalid_link' ? 'Invalid link'
                      : errorCode === 'handoff_failed' ? 'Could not open setup'
                      : 'Unable to continue'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.74)', fontSize: 13, lineHeight: 18 }}>
                    {error}
                  </Text>
                </View>
              )}

              {!loading && !isHandingOff && errorCode === 'handoff_failed' && !!email && !!temporaryPassword && (
                <TouchableOpacity
                  onPress={() => runSecureHandoff(token, email, temporaryPassword)}
                  style={{
                    backgroundColor: FLAME,
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14, letterSpacing: 0.2 }}>
                    Retry Secure Handoff
                  </Text>
                </TouchableOpacity>
              )}

              {!loading && !isHandingOff && (
                <TouchableOpacity
                  onPress={() => router.replace('/(auth)/signIn' as any)}
                  style={{
                    borderColor: GLASS_BORDER,
                    borderWidth: 1,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    paddingVertical: 13,
                    borderRadius: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.86)', fontWeight: '700', fontSize: 14 }}>
                    Return to Sign In
                  </Text>
                </TouchableOpacity>
              )}
            </GlassCard>
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}
