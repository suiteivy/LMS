import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { BursaryService } from '@/services/BursaryService';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function BursaryDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { isDark } = useTheme();
    const [bursary, setBursary] = useState<any>(null);
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const surface = isDark ? '#1e1e1e' : '#ffffff';
    const border = isDark ? '#2c2c2c' : '#f3f4f6';
    const textPrimary = isDark ? '#f1f1f1' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';
    const statsBg = isDark ? '#242424' : '#f9fafb';

    useEffect(() => { if (id) fetchDetails(); }, [id]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const data = await BursaryService.getBursaryDetails(id);
            setBursary(data);
            setApplications(data.applications || []);
        } catch (error: any) {
            Alert.alert('Error', error.message);
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleApplicationStatus = async (appId: string, newStatus: 'approved' | 'rejected') => {
        try {
            await BursaryService.updateApplicationStatus(appId, newStatus);
            Alert.alert('Success', `Application ${newStatus}`);
            fetchDetails();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#121212' : '#f9fafb' }}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    const isOpen = bursary?.status === 'open';

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f9fafb' }}>
            <UnifiedHeader
                title="Finance"
                subtitle="Bursary Details"
                role="Admin"
                onBack={() => router.back()}
            />

            <ScrollView style={{ flex: 1, padding: 16 }}>
                {/* Bursary Info Card */}
                {bursary && (
                    <View style={{ backgroundColor: surface, padding: 24, borderRadius: 20, borderWidth: 1, borderColor: border, marginBottom: 24 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 22, fontWeight: 'bold', color: textPrimary }}>{bursary.title}</Text>
                                <Text style={{ fontSize: 28, fontWeight: '900', color: '#FF6B00', marginTop: 6 }}>{formatCurrency(bursary.amount)}</Text>
                            </View>
                            <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: isOpen ? (isDark ? '#052e16' : '#dcfce7') : (isDark ? '#1f2937' : '#fee2e2') }}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', color: isOpen ? '#10b981' : (isDark ? '#9ca3af' : '#b91c1c') }}>
                                    {bursary.status}
                                </Text>
                            </View>
                        </View>

                        <Text style={{ color: textSecondary, marginTop: 12, lineHeight: 22, fontSize: 14 }}>{bursary.description}</Text>

                        <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: border, flexDirection: 'row', gap: 24 }}>
                            <View>
                                <Text style={{ fontSize: 10, color: textSecondary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>Deadline</Text>
                                <Text style={{ color: textPrimary, fontWeight: '500', marginTop: 2 }}>{format(new Date(bursary.deadline), 'MMM dd, yyyy')}</Text>
                            </View>
                            <View>
                                <Text style={{ fontSize: 10, color: textSecondary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>Applications</Text>
                                <Text style={{ color: textPrimary, fontWeight: '500', marginTop: 2 }}>{applications.length}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Applications */}
                <Text style={{ fontSize: 17, fontWeight: 'bold', color: textPrimary, marginBottom: 16, paddingHorizontal: 4 }}>Student Applications</Text>

                {applications.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 40, backgroundColor: surface, borderRadius: 16, borderWidth: 1, borderColor: border }}>
                        <Text style={{ color: textSecondary }}>No applications yet</Text>
                    </View>
                ) : (
                    applications.map((app) => {
                        const statusColor = app.status === 'approved' ? '#10b981' : app.status === 'rejected' ? '#ef4444' : '#f59e0b';
                        const statusBg = app.status === 'approved'
                            ? (isDark ? '#052e16' : '#dcfce7')
                            : app.status === 'rejected'
                                ? (isDark ? 'rgba(239,68,68,0.12)' : '#fee2e2')
                                : (isDark ? '#3d2000' : '#fef9c3');

                        return (
                            <View key={app.id} style={{ backgroundColor: surface, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: border }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <View>
                                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: textPrimary }}>{app.student?.user?.full_name}</Text>
                                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 1 }}>{app.student?.user?.email}</Text>
                                    </View>
                                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: statusBg, alignSelf: 'flex-start' }}>
                                        <Text style={{ fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', color: statusColor }}>{app.status}</Text>
                                    </View>
                                </View>

                                {app.justification && (
                                    <View style={{ backgroundColor: statsBg, padding: 10, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: border }}>
                                        <Text style={{ color: textSecondary, fontSize: 13, fontStyle: 'italic' }}>"{app.justification}"</Text>
                                    </View>
                                )}

                                {app.status === 'pending' && (
                                    <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end', gap: 10 }}>
                                        <TouchableOpacity
                                            onPress={() => handleApplicationStatus(app.id, 'rejected')}
                                            style={{ backgroundColor: isDark ? '#242424' : '#f3f4f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: border }}
                                        >
                                            <Text style={{ color: textSecondary, fontWeight: 'bold', fontSize: 12 }}>Reject</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleApplicationStatus(app.id, 'approved')}
                                            style={{ backgroundColor: '#FF6B00', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 }}
                                        >
                                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Approve</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}