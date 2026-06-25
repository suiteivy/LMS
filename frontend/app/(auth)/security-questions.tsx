import { SettingsService } from '@/services/SettingsService';
import { useAuth } from '@/contexts/AuthContext';
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

export default function SecurityQuestionsSetup() {
  const { profile } = useAuth();
  const mustChangePassword = !!(profile as any)?.must_change_password;
  const [answers, setAnswers] = useState(['', '', '']);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (idx: number, value: string) => {
    const clone = [...answers];
    clone[idx] = value;
    setAnswers(clone);
  };

  const submit = async () => {
    if (answers.some((a) => !a.trim())) {
      Toast.show({ type: 'error', text1: 'Missing answers', text2: 'Please answer all security questions.' });
      return;
    }

    if (mustChangePassword) {
      if (!currentPassword || !newPassword) {
        Toast.show({ type: 'error', text1: 'Missing password fields', text2: 'Enter your current and new password.' });
        return;
      }
      if (newPassword.length < 6) {
        Toast.show({ type: 'error', text1: 'Weak password', text2: 'New password must be at least 6 characters.' });
        return;
      }
    }

    try {
      setLoading(true);
      await SettingsService.setupSecurityQuestions(answers[0], answers[1], answers[2]);

      if (mustChangePassword) {
        await SettingsService.changePassword(currentPassword, newPassword);
      }

      Toast.show({ type: 'success', text1: 'Saved', text2: 'Security questions updated.' });
      router.replace('/(auth)/signIn' as any);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Failed', text2: err?.response?.data?.error || err?.message || 'Failed to save security questions' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F0B2E' }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <View style={{ backgroundColor: '#13103A', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 20 }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Security Questions</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 18 }}>
            Set your recovery answers now. Answers are stored as hashes.
          </Text>

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

          {mustChangePassword && (
            <>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 6 }}>Current password</Text>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  placeholder="Your temporary/current password"
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

              <View style={{ marginBottom: 12 }}>
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
            </>
          )}

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
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Save Security Questions</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
