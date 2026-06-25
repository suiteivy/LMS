import { SettingsService } from '@/services/SettingsService';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CredentialDeliveryScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = useMemo(() => (typeof params.token === 'string' ? params.token : ''), [params.token]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('Missing credential token');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await SettingsService.getCredentialDelivery(token);
        setEmail(data.email);
        setTemporaryPassword(data.temporary_password);
      } catch (err: any) {
        setError(err?.response?.data?.error || err?.message || 'Unable to load credentials');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0B2E' }}>
      <Stack.Screen options={{ title: 'Credential Delivery', headerShown: false }} />
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <View
          style={{
            backgroundColor: '#13103A',
            borderRadius: 18,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            padding: 20,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
            One-time credentials
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 18 }}>
            This page can be opened once. Save these credentials now and require password change immediately after login.
          </Text>

          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color="#FF6B00" />
            </View>
          ) : error ? (
            <Text style={{ color: '#fca5a5', fontWeight: '600' }}>{error}</Text>
          ) : (
            <>
              <View style={{ marginBottom: 14 }}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>Email</Text>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{email}</Text>
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>Temporary password</Text>
                <Text style={{ color: '#fff', fontWeight: '700', letterSpacing: 0.3 }}>{temporaryPassword}</Text>
              </View>

              <TouchableOpacity
                onPress={() => router.replace('/(auth)/signIn' as any)}
                style={{
                  backgroundColor: '#FF6B00',
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Go to sign in</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
