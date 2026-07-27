import { SettingsService } from '@/services/SettingsService';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';

const securityPrompts = [
  { key: 'q_childhood_nickname', prompt: 'What is your childhood nickname?' },
  { key: 'q_first_school', prompt: 'What is the name of your first school?' },
  { key: 'q_birth_city', prompt: 'What city were you born in?' },
];

export default function SecurityQuestionsSetup() {
  const { profile, isProfileLoading, refreshProfile, getRoleRedirect, isPlatformAdmin } = useAuth();
  const { isDark } = useTheme();
  const mustChangePassword = !!profile?.must_change_password;
  const [selectedQuestionKey, setSelectedQuestionKey] = useState(securityPrompts[0].key);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const colors = {
    pageBg: isDark ? '#0B1020' : '#F8FAFC',
    overlay: isDark ? 'rgba(2,6,23,0.65)' : 'rgba(15,23,42,0.15)',
    modalBg: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? '#1F2937' : '#E2E8F0',
    textPrimary: isDark ? '#F8FAFC' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    inputBg: isDark ? '#0F172A' : '#FFFFFF',
    inputBorder: isDark ? '#334155' : '#CBD5E1',
    inputText: isDark ? '#F8FAFC' : '#0F172A',
    primary: '#FF6B00',
  };
  const pickerDropdownItemColor = isDark ? '#F8FAFC' : '#0F172A';
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 20 }}>
        <View
          style={{
            alignSelf: 'center',
            width: '100%',
            maxWidth: 560,
            backgroundColor: colors.modalBg,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 12 },
            elevation: 8,
          }}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Security setup</Text>
          <Text style={{ color: colors.textSecondary, marginBottom: 18 }}>
            Save your recovery question and set a new password to continue.
          </Text>

          <ScrollView style={{ maxHeight: Platform.OS === 'web' ? 520 : undefined }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: colors.textSecondary, marginBottom: 6, fontWeight: '600' }}>Security question</Text>
              <View style={{
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                borderWidth: 1,
                borderRadius: 10,
                overflow: 'hidden',
              }}>
                <Picker
                  selectedValue={selectedQuestionKey}
                  onValueChange={(v) => setSelectedQuestionKey(String(v))}
                  style={{ color: colors.inputText, backgroundColor: colors.inputBg }}
                  dropdownIconColor={colors.textSecondary}
                >
                  {securityPrompts.map((question) => (
                    <Picker.Item key={question.key} label={question.prompt} value={question.key} color={pickerDropdownItemColor} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: colors.textSecondary, marginBottom: 6, fontWeight: '600' }}>Answer</Text>
              <TextInput
                value={selectedAnswer}
                onChangeText={setSelectedAnswer}
                placeholder="Enter answer"
                placeholderTextColor={colors.textSecondary}
                style={{
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  borderWidth: 1,
                  color: colors.inputText,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                }}
              />
            </View>

            {isPasswordSetupRequired && (
              <>
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 6, fontWeight: '600' }}>New password</Text>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholder="Minimum 6 characters"
                    placeholderTextColor={colors.textSecondary}
                    style={{
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      borderWidth: 1,
                      color: colors.inputText,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 11,
                    }}
                  />
                </View>

                <View style={{ marginBottom: 14 }}>
                  <Text style={{ color: colors.textSecondary, marginBottom: 6, fontWeight: '600' }}>Confirm password</Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="Re-enter new password"
                    placeholderTextColor={colors.textSecondary}
                    style={{
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      borderWidth: 1,
                      color: colors.inputText,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 11,
                    }}
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              disabled={loading || isProfileLoading}
              onPress={submit}
              style={{
                marginTop: 10,
                backgroundColor: colors.primary,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 48,
                paddingVertical: 12,
                paddingHorizontal: 14,
                opacity: (loading || isProfileLoading) ? 0.75 : 1,
              }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>
                    {isPasswordSetupRequired
                      ? 'Save security question and update password'
                      : 'Save security question'}
                  </Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
