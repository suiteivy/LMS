import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { FullScreenLoader } from '@/components/common/FullScreenLoader';
import { SettingsService } from '@/services/SettingsService';

export default function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        setLoading(true);
        try {
            await SettingsService.forgotPassword(email);

            Alert.alert(
                'Check your email',
                'If an account with that email exists, we have sent a password reset link.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error: any) {
            // Still show success message to prevent email enumeration
            Alert.alert(
                'Check your email',
                'If an account with that email exists, we have sent a password reset link.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <Stack.Screen options={{ headerShown: false }} />

            <View className="p-6 pt-12 flex-1">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mb-8 w-10 h-10 items-center justify-center rounded-full bg-gray-50"
                >
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>

                <View className="mb-8">
                    <Text className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</Text>
                    <Text className="text-gray-500 text-base">
                        Don't worry! It happens. Please enter the email associated with your account.
                    </Text>
                </View>

                <View className="space-y-4">
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-1.5 ml-1">Email Address</Text>
                        <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 focus:border-blue-500 focus:bg-white transition-colors">
                            <Mail size={20} color="#9CA3AF" className="mr-3" />
                            <TextInput
                                className="flex-1 text-gray-900 text-base"
                                placeholder="Enter your email"
                                placeholderTextColor="#9CA3AF"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleReset}
                        disabled={loading}
                        className="bg-black rounded-xl py-4 items-center shadow-lg shadow-gray-200 active:bg-gray-800 mt-4"
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Send Reset Link</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
            <FullScreenLoader visible={loading} message="Sending Reset Link..." />
        </KeyboardAvoidingView >
    );
}
