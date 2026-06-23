import { NotificationsHub } from '@/components/NotificationsHub';
import { useTheme } from '@/contexts/ThemeContext';
import { AdminNotificationOpsAPI, type DeliveryStatus, type NotificationDeliveryAttempt } from '@/services/AdminNotificationOpsService';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function NotificationsScreen() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');
    const [attempts, setAttempts] = useState<NotificationDeliveryAttempt[]>([]);

    const tokens = useMemo(() => ({
        card: isDark ? '#13103A' : '#FFFFFF',
        border: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
        text: isDark ? '#F9FAFB' : '#111827',
        muted: isDark ? '#9CA3AF' : '#6B7280',
        bg: isDark ? '#0F0B2E' : '#F9FAFB',
    }), [isDark]);

    const loadAttempts = async () => {
        setLoading(true);
        try {
            const data = await AdminNotificationOpsAPI.getDeliveryAttempts(statusFilter === 'all' ? undefined : statusFilter, 100);
            setAttempts(data || []);
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to load delivery attempts.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAttempts();
    }, [statusFilter]);

    const runRetryNow = async () => {
        setRetrying(true);
        try {
            const result = await AdminNotificationOpsAPI.runRetryNow(100);
            await loadAttempts();
            Alert.alert('Retry complete', `Processed: ${result.processed}\nDelivered: ${result.delivered}\nFailed: ${result.failed}`);
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Retry worker failed.');
        } finally {
            setRetrying(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: tokens.bg }}>
            <NotificationsHub />
            <View style={{ borderTopWidth: 1, borderTopColor: tokens.border, padding: 12, backgroundColor: tokens.bg }}>
                <Text style={{ color: tokens.text, fontWeight: '700', marginBottom: 8 }}>Delivery Ops (Admin)</Text>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    {(['all', 'retry_scheduled', 'delivered', 'failed'] as const).map((status) => (
                        <TouchableOpacity
                            key={status}
                            onPress={() => setStatusFilter(status)}
                            style={{
                                paddingHorizontal: 10,
                                paddingVertical: 7,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: tokens.border,
                                backgroundColor: statusFilter === status ? '#FF6B00' : tokens.card,
                            }}
                        >
                            <Text style={{ color: statusFilter === status ? '#FFF' : tokens.text, fontSize: 11, fontWeight: '700' }}>{status}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    <TouchableOpacity
                        onPress={loadAttempts}
                        disabled={loading}
                        style={{ flex: 1, backgroundColor: tokens.card, borderColor: tokens.border, borderWidth: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}
                    >
                        <Text style={{ color: tokens.text, fontWeight: '700', fontSize: 12 }}>{loading ? 'Loading...' : 'Refresh Attempts'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={runRetryNow}
                        disabled={retrying}
                        style={{ flex: 1, backgroundColor: '#059669', borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}
                    >
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>{retrying ? 'Retrying...' : 'Run Retry Now'}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 220 }}>
                    {loading ? (
                        <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                            <ActivityIndicator color="#FF6B00" />
                        </View>
                    ) : attempts.length === 0 ? (
                        <Text style={{ color: tokens.muted, fontSize: 12 }}>No delivery attempts found.</Text>
                    ) : (
                        attempts.map((a) => (
                            <View key={a.id} style={{ backgroundColor: tokens.card, borderColor: tokens.border, borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 6 }}>
                                <Text style={{ color: tokens.text, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>{a.title}</Text>
                                <Text style={{ color: tokens.muted, fontSize: 11 }} numberOfLines={1}>{a.recipient_user_id || 'unknown recipient'} · {a.status}</Text>
                                <Text style={{ color: tokens.muted, fontSize: 10 }} numberOfLines={1}>Attempt {a.attempt_number}/{a.max_retries}</Text>
                                {a.error_message ? <Text style={{ color: '#EF4444', fontSize: 10 }} numberOfLines={1}>{a.error_message}</Text> : null}
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </View>
    );
}
