import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { SettingsService } from '@/services/SettingsService';
import Toast from 'react-native-toast-message';

interface ChangePasswordModalProps {
    visible: boolean;
    onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ visible, onClose }) => {
    const { isDark } = useTheme();
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const tokens = {
        bg: isDark ? "#0F0B2E" : "#ffffff",
        surface: isDark ? "#13103A" : "#ffffff",
        border: isDark ? "rgba(255,255,255,0.05)" : "#e2e8f0",
        textPrimary: isDark ? "#ffffff" : "#0f172a",
        textSecondary: isDark ? "#94a3b8" : "#64748b",
        inputBg: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
        inputBorder: isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0",
        primary: "#FF6B00",
    };

    const handlePasswordChange = async () => {
        if (!currentPassword) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter your current password' });
            return;
        }

        if (newPassword.length < 6) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'New password must be at least 6 characters' });
            return;
        }

        if (newPassword !== confirmPassword) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'New passwords do not match' });
            return;
        }

        setLoading(true);
        try {
            await SettingsService.changePassword(currentPassword, newPassword);
            Toast.show({ type: 'success', text1: 'Success', text2: 'Password updated successfully' });
            handleClose();
        } catch (error: any) {
            console.error('[ChangePassword] Failed:', error);
            Toast.show({ 
                type: 'error', 
                text1: 'Update Failed', 
                text2: error.response?.data?.error || error.message || 'Could not update password' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!profile?.email) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'User email not found' });
            return;
        }

        Alert.alert(
            "Reset Password?",
            `We will send a password reset link to ${profile.email}. You will be logged out to complete this security process.`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Reset Now", 
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await SettingsService.forgotPassword(profile.email);
                            Toast.show({ 
                                type: 'success', 
                                text1: 'Link Sent', 
                                text2: 'Please check your email to reset your password.' 
                            });
                            onClose();
                            // The user will likely need to re-authenticate or be logged out depending on backend logic
                        } catch (error: any) {
                            Toast.show({ 
                                type: 'error', 
                                text1: 'Error', 
                                text2: error.message || 'Failed to send reset link' 
                            });
                        } finally {
                            setLoading(false);
                        }
                    } 
                }
            ]
        );
    };

    const handleClose = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ 
                        backgroundColor: tokens.surface, 
                        borderTopLeftRadius: 32, 
                        borderTopRightRadius: 32, 
                        padding: 24,
                        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                        borderWidth: 1,
                        borderColor: tokens.border
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <View>
                                <Text style={{ fontSize: 24, fontWeight: '800', color: tokens.textPrimary, letterSpacing: -0.5 }}>Security</Text>
                                <Text style={{ fontSize: 13, color: tokens.textSecondary, fontWeight: '500', marginTop: 2 }}>Update your account password</Text>
                            </View>
                            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tokens.inputBg, alignItems: 'center', justifyContent: 'center' }}>
                                    <MaterialCommunityIcons name="close" size={20} color={tokens.textSecondary} style={{ textAlign: 'center' }} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ marginBottom: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={{ color: tokens.textPrimary, fontWeight: '700', fontSize: 14 }}>Current Password</Text>
                                    <TouchableOpacity onPress={handleForgotPassword}>
                                        <Text style={{ color: tokens.primary, fontSize: 12, fontWeight: '700' }}>Forgot?</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    backgroundColor: tokens.inputBg, 
                                    borderRadius: 16, 
                                    borderWidth: 1, 
                                    borderColor: tokens.inputBorder,
                                    paddingHorizontal: 16
                                }}>
                                    <MaterialCommunityIcons name="lock-outline" size={20} color={tokens.textSecondary} />
                                    <TextInput
                                        style={{ flex: 1, color: tokens.textPrimary, paddingVertical: 14, paddingHorizontal: 12, fontWeight: '500' }}
                                        secureTextEntry
                                        placeholder="Enter current password"
                                        placeholderTextColor={tokens.textSecondary}
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                    />
                                </View>
                            </View>

                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ color: tokens.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 8 }}>New Password</Text>
                                <View style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    backgroundColor: tokens.inputBg, 
                                    borderRadius: 16, 
                                    borderWidth: 1, 
                                    borderColor: tokens.inputBorder,
                                    paddingHorizontal: 16
                                }}>
                                    <MaterialCommunityIcons name="lock-plus-outline" size={20} color={tokens.textSecondary} />
                                    <TextInput
                                        style={{ flex: 1, color: tokens.textPrimary, paddingVertical: 14, paddingHorizontal: 12, fontWeight: '500' }}
                                        secureTextEntry
                                        placeholder="Min. 6 characters"
                                        placeholderTextColor={tokens.textSecondary}
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                    />
                                </View>
                            </View>

                            <View style={{ marginBottom: 32 }}>
                                <Text style={{ color: tokens.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 8 }}>Confirm New Password</Text>
                                <View style={{ 
                                    flexDirection: 'row', 
                                    alignItems: 'center', 
                                    backgroundColor: tokens.inputBg, 
                                    borderRadius: 16, 
                                    borderWidth: 1, 
                                    borderColor: tokens.inputBorder,
                                    paddingHorizontal: 16
                                }}>
                                    <MaterialCommunityIcons name="check-decagram-outline" size={20} color={tokens.textSecondary} />
                                    <TextInput
                                        style={{ flex: 1, color: tokens.textPrimary, paddingVertical: 14, paddingHorizontal: 12, fontWeight: '500' }}
                                        secureTextEntry
                                        placeholder="Repeat new password"
                                        placeholderTextColor={tokens.textSecondary}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handlePasswordChange}
                                disabled={loading}
                                activeOpacity={0.8}
                                style={{ 
                                    backgroundColor: tokens.primary, 
                                    paddingVertical: 16, 
                                    borderRadius: 18, 
                                    alignItems: 'center', 
                                    flexDirection: 'row', 
                                    justifyContent: 'center', 
                                    shadowColor: tokens.primary,
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 8,
                                    elevation: 4
                                }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>Confirm Change</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

