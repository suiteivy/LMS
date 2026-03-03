import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MasterSupport() {
    const { isDark } = useTheme();

    // Dummy state since tickets table isn't fully implemented yet
    const [loading] = useState(false);
    const [tickets] = useState([
        { id: 1, title: 'API Sync Issue via LMS Gateway', inst: 'Greenwood High', status: 'Open', priority: 'High', date: '2026-03-01' },
        { id: 2, title: 'Billing limit reached incorrectly', inst: 'St. Marys Academy', status: 'Pending', priority: 'Medium', date: '2026-03-02' }
    ]);

    const themeColors = {
        bg: isDark ? '#0F0B2E' : '#f8fafc',
        card: isDark ? '#13103A' : '#ffffff',
        text: isDark ? '#ffffff' : '#0f172a',
        subtext: isDark ? '#94a3b8' : '#64748b',
        border: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
        primary: '#FF6B00'
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return '#ef4444';
            case 'Pending': return '#f59e0b';
            case 'Resolved': return '#10b981';
            default: return themeColors.subtext;
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }} edges={['top', 'left', 'right']}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                    <View style={{ backgroundColor: `${themeColors.primary}20`, padding: 8, borderRadius: 10 }}>
                        <MaterialCommunityIcons name="headphones" size={24} color={themeColors.primary} />
                    </View>
                    <View>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: themeColors.text }}>App Support</Text>
                        <Text style={{ fontSize: 14, color: themeColors.subtext, marginTop: 2 }}>Institution Complaints & Inquiries</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={themeColors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text, marginBottom: 12 }}>Active Support Tickets</Text>

                        {tickets.map(t => (
                            <TouchableOpacity key={t.id} style={{
                                backgroundColor: themeColors.card,
                                padding: 16,
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: themeColors.border,
                                marginBottom: 12
                            }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: themeColors.text, flex: 1 }}>{t.title}</Text>
                                    <View style={{ backgroundColor: `${getStatusColor(t.status)}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 12 }}>
                                        <Text style={{ color: getStatusColor(t.status), fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>{t.status}</Text>
                                    </View>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <MaterialCommunityIcons name="domain" size={14} color={themeColors.subtext} />
                                        <Text style={{ color: themeColors.subtext, fontSize: 13 }}>{t.inst}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <MaterialCommunityIcons name="calendar" size={14} color={themeColors.subtext} />
                                        <Text style={{ color: themeColors.subtext, fontSize: 13 }}>{t.date}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}

                        <View style={{ marginTop: 24, backgroundColor: `${themeColors.primary}10`, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: `${themeColors.primary}30` }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <MaterialCommunityIcons name="information" size={20} color={themeColors.primary} />
                                <Text style={{ color: themeColors.text, fontWeight: '700', fontSize: 15 }}>Integration Note</Text>
                            </View>
                            <Text style={{ color: themeColors.subtext, lineHeight: 20 }}>
                                This module is currently running in trial mode. For a complete Help Desk integration, mapping to an external service like Zendesk or Intercom is recommended.
                            </Text>
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
