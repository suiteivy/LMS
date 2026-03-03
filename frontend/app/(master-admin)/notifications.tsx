import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Platform, ScrollView, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/libs/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

export default function MasterNotifications() {
    const { isDark } = useTheme();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [target, setTarget] = useState('all_admins');

    const themeColors = {
        bg: isDark ? '#0F0B2E' : '#f8fafc',
        card: isDark ? '#13103A' : '#ffffff',
        text: isDark ? '#ffffff' : '#0f172a',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
        primary: '#FF6B00',
        input: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'
    };

    const dispatchNotification = async () => {
        if (!title.trim() || !message.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please provide both title and message' });
            return;
        }

        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            let backendUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4001";
            if (Platform.OS === 'android') {
                backendUrl = backendUrl.replace('localhost', '10.0.2.2');
            }

            const res = await fetch(`${backendUrl}/api/master-admin/notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, message, target })
            });

            const data = await res.json();
            if (res.ok) {
                Toast.show({ type: 'success', text1: 'Dispatched', text2: `Sent to ${data.count} admins successfully` });
                setTitle('');
                setMessage('');
            } else {
                Toast.show({ type: 'error', text1: 'Error', text2: data.error });
            }
        } catch (err) {
            console.error(err);
            Toast.show({ type: 'error', text1: 'Error', text2: "Failed to dispatch notifications" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={20}>
                <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 }}>
                    {/* Header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                        <View style={{ backgroundColor: `${themeColors.primary}20`, padding: 8, borderRadius: 10 }}>
                            <MaterialCommunityIcons name="bullhorn-variant-outline" size={24} color={themeColors.primary} />
                        </View>
                        <View>
                            <Text style={{ fontSize: 24, fontWeight: '800', color: themeColors.text }}>Global Notices</Text>
                            <Text style={{ fontSize: 14, color: themeColors.subtext, marginTop: 2 }}>Broadcast updates to institutions</Text>
                        </View>
                    </View>

                    <View style={{ backgroundColor: themeColors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: themeColors.border }}>

                        <Text style={{ color: themeColors.text, fontWeight: '700', marginBottom: 8 }}>Target Audience</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: target === 'all_admins' ? `${themeColors.primary}20` : themeColors.input, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: target === 'all_admins' ? themeColors.primary : 'transparent' }}
                                onPress={() => setTarget('all_admins')}
                            >
                                <Text style={{ color: target === 'all_admins' ? themeColors.primary : themeColors.subtext, fontWeight: '600' }}>All Admins</Text>
                            </TouchableOpacity>
                            {/* Stub for specific institutions if needed */}
                            <TouchableOpacity
                                style={{ flex: 1, backgroundColor: target !== 'all_admins' ? `${themeColors.primary}20` : themeColors.input, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: target !== 'all_admins' ? themeColors.primary : 'transparent', opacity: 0.5 }}
                                disabled
                            >
                                <Text style={{ color: themeColors.subtext, fontWeight: '600' }}>Specific (Coming Soon)</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: themeColors.text, fontWeight: '700', marginBottom: 8 }}>Notice Title</Text>
                        <TextInput
                            style={{
                                backgroundColor: themeColors.input,
                                color: themeColors.text,
                                borderRadius: 12,
                                padding: 16,
                                fontSize: 16,
                                marginBottom: 20,
                                borderWidth: 1,
                                borderColor: themeColors.border
                            }}
                            placeholder="e.g. Major Platform Update v2.0"
                            placeholderTextColor={themeColors.subtext}
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={{ color: themeColors.text, fontWeight: '700', marginBottom: 8 }}>Message Format</Text>
                        <TextInput
                            style={{
                                backgroundColor: themeColors.input,
                                color: themeColors.text,
                                borderRadius: 12,
                                padding: 16,
                                fontSize: 16,
                                minHeight: 120,
                                textAlignVertical: 'top',
                                marginBottom: 28,
                                borderWidth: 1,
                                borderColor: themeColors.border
                            }}
                            placeholder="Write your announcement here..."
                            placeholderTextColor={themeColors.subtext}
                            value={message}
                            onChangeText={setMessage}
                            multiline
                        />

                        <TouchableOpacity
                            onPress={dispatchNotification}
                            disabled={loading}
                            style={{
                                backgroundColor: themeColors.primary,
                                height: 56,
                                borderRadius: 14,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="send" size={20} color="#fff" />
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Dispatch Notice</Text>
                                </>
                            )}
                        </TouchableOpacity>

                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
