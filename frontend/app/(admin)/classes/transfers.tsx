import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { ClassService, ClassTransfer } from '@/services/ClassService';
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    XCircle,
    User,
    AlertCircle,
    Check,
    X,
    RotateCcw,
} from 'lucide-react-native';

export default function AdminClassTransfersScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [transfers, setTransfers] = useState<ClassTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

    // Reject Modal state
    const [rejectingTransfer, setRejectingTransfer] = useState<ClassTransfer | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const surface = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? '#21262D' : '#E5E7EB';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const cardBg = isDark ? '#161B22' : '#FFFFFF';

    const loadTransfers = useCallback(async () => {
        try {
            const data = await ClassService.getTransfers(statusFilter === 'all' ? undefined : statusFilter);
            setTransfers(data || []);
        } catch (error: any) {
            console.error('Failed to load class transfers:', error);
            Alert.alert('Error', 'Failed to load transfer requests');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        setLoading(true);
        loadTransfers();
    }, [loadTransfers]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadTransfers();
    };

    const handleApprove = async (transfer: ClassTransfer) => {
        Alert.alert(
            'Confirm Approval',
            `Approve class transfer for ${transfer.student?.user?.full_name || 'student'} to ${transfer.to_class?.display_name || transfer.to_class?.name || 'new class'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve & Transfer',
                    style: 'default',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const res = await ClassService.approveTransfer(transfer.id);
                            Alert.alert('Success', res?.message || 'Transfer completed successfully');
                            loadTransfers();
                        } catch (error: any) {
                            console.error('Approve error:', error);
                            const msg = error?.response?.data?.error || error?.message || 'Failed to approve transfer';
                            Alert.alert('Error', msg);
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleConfirmReject = async () => {
        if (!rejectingTransfer) return;
        setActionLoading(true);
        try {
            const res = await ClassService.rejectTransfer(rejectingTransfer.id, rejectionReason.trim() || undefined);
            Alert.alert('Rejected', res?.message || 'Transfer request rejected');
            setRejectingTransfer(null);
            setRejectionReason('');
            loadTransfers();
        } catch (error: any) {
            console.error('Reject error:', error);
            const msg = error?.response?.data?.error || error?.message || 'Failed to reject transfer';
            Alert.alert('Error', msg);
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0D1117' : '#F9FAFB' }}>
            <UnifiedHeader
                title="Class Transfers"
                subtitle="Approval Queue & History"
                role="Admin"
                onBack={() => router.back()}
                showNotification={false}
            />

            {/* Status Filter Tabs */}
            <View
                style={{
                    flexDirection: 'row',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: surface,
                    borderBottomWidth: 1,
                    borderColor: border,
                    gap: 8,
                }}
            >
                {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => {
                    const isActive = statusFilter === tab;
                    return (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setStatusFilter(tab)}
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 12,
                                backgroundColor: isActive
                                    ? '#FF6900'
                                    : isDark ? '#21262D' : '#F3F4F6',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 13,
                                    fontWeight: '700',
                                    textTransform: 'capitalize',
                                    color: isActive ? '#FFFFFF' : textSecondary,
                                }}
                            >
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#FF6900" />
                    <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13 }}>
                        Loading transfers...
                    </Text>
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1, padding: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                >
                    {transfers.map((t) => {
                        const isPending = t.status === 'pending';
                        const isApproved = t.status === 'approved';
                        const isRejected = t.status === 'rejected';

                        return (
                            <View
                                key={t.id}
                                style={{
                                    backgroundColor: cardBg,
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 14,
                                    borderWidth: 1,
                                    borderColor: border,
                                }}
                            >
                                {/* Header: Student & Status Badge */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>
                                            {t.student?.user?.full_name || 'Unknown Student'}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                                            Admission: {t.student?.admission_number || t.student_id}
                                        </Text>
                                    </View>

                                    <View
                                        style={{
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            borderRadius: 8,
                                            backgroundColor: isApproved
                                                ? 'rgba(16, 185, 129, 0.15)'
                                                : isRejected
                                                ? 'rgba(239, 68, 68, 0.15)'
                                                : 'rgba(255, 105, 0, 0.15)',
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                fontWeight: '800',
                                                textTransform: 'uppercase',
                                                color: isApproved
                                                    ? '#10b981'
                                                    : isRejected
                                                    ? '#ef4444'
                                                    : '#FF6900',
                                            }}
                                        >
                                            {t.status}
                                        </Text>
                                    </View>
                                </View>

                                {/* Transfer Route: From -> To */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        marginVertical: 12,
                                        padding: 10,
                                        borderRadius: 12,
                                        backgroundColor: isDark ? '#0D1117' : '#F9FAFB',
                                        borderWidth: 1,
                                        borderColor: border,
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 10, color: textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>
                                            From
                                        </Text>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary, marginTop: 2 }}>
                                            {t.from_class?.display_name || t.from_class?.name || 'Unassigned'}
                                        </Text>
                                    </View>

                                    <View style={{ paddingHorizontal: 10 }}>
                                        <ArrowRight size={18} color="#FF6900" />
                                    </View>

                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={{ fontSize: 10, color: textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>
                                            To
                                        </Text>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FF6900', marginTop: 2 }}>
                                            {t.to_class?.display_name || t.to_class?.name || 'Destination'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Reason if provided */}
                                {t.reason ? (
                                    <View style={{ marginBottom: 10 }}>
                                        <Text style={{ fontSize: 11, color: textSecondary, fontWeight: '700' }}>Reason:</Text>
                                        <Text style={{ fontSize: 13, color: textPrimary, marginTop: 2 }}>{t.reason}</Text>
                                    </View>
                                ) : null}

                                {/* Rejection reason if rejected */}
                                {isRejected && t.rejection_reason ? (
                                    <View style={{ marginBottom: 10, padding: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)' }}>
                                        <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '700' }}>Rejection Reason:</Text>
                                        <Text style={{ fontSize: 13, color: '#ef4444', marginTop: 2 }}>{t.rejection_reason}</Text>
                                    </View>
                                ) : null}

                                {/* Audit footer */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderColor: border }}>
                                    <Text style={{ fontSize: 11, color: textSecondary }}>
                                        By: {t.requester?.full_name || 'Staff'} ({t.requester?.role || 'user'})
                                    </Text>
                                    <Text style={{ fontSize: 11, color: textSecondary }}>
                                        {formatDate(t.created_at)}
                                    </Text>
                                </View>

                                {t.approver && (
                                    <Text style={{ fontSize: 11, color: '#10b981', marginTop: 4, fontWeight: '600' }}>
                                        Approved by {t.approver.full_name}
                                    </Text>
                                )}

                                {/* Admin Action Buttons (for pending) */}
                                {isPending && (
                                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                                        <TouchableOpacity
                                            onPress={() => setRejectingTransfer(t)}
                                            style={{
                                                flex: 1,
                                                paddingVertical: 10,
                                                borderRadius: 10,
                                                borderWidth: 1,
                                                borderColor: '#ef4444',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>
                                                Reject
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => handleApprove(t)}
                                            style={{
                                                flex: 1,
                                                paddingVertical: 10,
                                                borderRadius: 10,
                                                backgroundColor: '#10b981',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                                                Approve
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })}

                    {transfers.length === 0 && (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <AlertCircle size={44} color={textSecondary} strokeWidth={1.5} />
                            <Text style={{ color: textSecondary, marginTop: 14, textAlign: 'center', fontSize: 14 }}>
                                No {statusFilter === 'all' ? '' : statusFilter} transfer requests found.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Rejection Modal */}
            <Modal
                visible={!!rejectingTransfer}
                transparent
                animationType="fade"
                onRequestClose={() => setRejectingTransfer(null)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: border }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary, marginBottom: 4 }}>
                            Reject Transfer Request
                        </Text>
                        <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 14 }}>
                            Reject transfer for {rejectingTransfer?.student?.user?.full_name}?
                        </Text>

                        <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>
                            Reason for rejection (optional):
                        </Text>
                        <TextInput
                            multiline
                            numberOfLines={3}
                            placeholder="e.g., Destination class stream full, or wrong grade level..."
                            placeholderTextColor={textSecondary}
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                            style={{
                                backgroundColor: isDark ? '#0D1117' : '#F9FAFB',
                                borderWidth: 1,
                                borderColor: border,
                                borderRadius: 12,
                                padding: 12,
                                color: textPrimary,
                                minHeight: 70,
                                textAlignVertical: 'top',
                                marginBottom: 18,
                            }}
                        />

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    setRejectingTransfer(null);
                                    setRejectionReason('');
                                }}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    borderWidth: 1,
                                    borderColor: border,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: textPrimary, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleConfirmReject}
                                disabled={actionLoading}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: '#ef4444',
                                    alignItems: 'center',
                                    opacity: actionLoading ? 0.6 : 1,
                                }}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Confirm Reject</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
