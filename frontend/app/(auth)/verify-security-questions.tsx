import { SettingsService } from '@/services/SettingsService';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

const securityPrompts = [
  'What is your childhood nickname?',
  'What is the name of your first school?',
  'What city were you born in?',
];

export default function VerifySecurityQuestionsScreen() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [answers, setAnswers] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);

  const update = (idx: number, value: string) => {
    const clone = [...answers];
    clone[idx] = value;
    setAnswers(clone);
  };

  const submit = async () => {
    if (!email.trim() || !newPassword.trim() || answers.some((a) => !a.trim())) {
      Toast.show({ type: 'error', text1: 'Missing details', text2: 'Fill email, all answers and a new password.' });
      return;
    }
    if (newPassword.length < 6) {
      Toast.show({ type: 'error', text1: 'Weak password', text2: 'Password must be at least 6 characters.' });
      return;
    }

    try {
      setLoading(true);
      const result = await SettingsService.verifySecurityQuestions(
        email,
        answers[0],
        answers[1],
        answers[2],
        newPassword,
      );

      if (!result.verified) {
        Toast.show({ type: 'error', text1: 'Verification failed', text2: result.message || 'Invalid answers.' });
        return;
      }

      Toast.show({ type: 'success', text1: 'Password updated', text2: 'You can now sign in with your new password.' });
      router.replace('/(auth)/signIn' as any);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed',
        text2: err?.response?.data?.error || err?.message || 'Verification failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0B2E' }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <View style={{ backgroundColor: '#13103A', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 20 }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Recover with Security Questions</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 18 }}>
            Verify your answers and set a new password.
          </Text>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="name@example.com"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.12)',
                borderWidth: 1,
                color: '#fff',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            />
          </View>

          {securityPrompts.map((prompt, idx) => (
            <View key={prompt} style={{ marginBottom: 12 }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>{prompt}</Text>
              <TextInput
                value={answers[idx]}
                onChangeText={(txt) => update(idx, txt)}
                placeholder="Enter answer"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                  color: '#fff',
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              />
            </View>
          ))}

          <View style={{ marginBottom: 10 }}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>New password</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Minimum 6 characters"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.12)',
                borderWidth: 1,
                color: '#fff',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            />
          </View>

          <TouchableOpacity
            disabled={loading}
            onPress={submit}
            style={{
              marginTop: 10,
              backgroundColor: '#FF6B00',
              borderRadius: 12,
              alignItems: 'center',
              paddingVertical: 12,
            }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Verify and reset password</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
