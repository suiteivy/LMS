import { BursariesList } from '@/components/admin/finance/BursariesList';
import { FeeStructureSection } from '@/components/admin/finance/FeeStructureSection';
import { PaymentManagementSection } from '@/components/admin/finance/PaymentManagementSection';
import { TeacherPayoutSection } from '@/components/admin/finance/TeacherPayoutSection';
import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { FinanceService } from '@/services/FinanceService';
import { FeeStructure, Payment, TeacherPayout } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const TABS = [
    { key: 'payments', label: 'Payments' },
    { key: 'bursaries', label: 'Bursaries' },
    { key: 'payouts', label: 'Payouts' },
    { key: 'fees', label: 'Fee Structure' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function FinanceDashboard() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState<TabKey>('payments');
    const [refreshing, setRefreshing] = useState(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [payouts, setPayouts] = useState<TeacherPayout[]>([]);
    const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [paymentsData, payoutsData, feesData] = await Promise.all([
                FinanceService.getPayments('all'),
                FinanceService.getTeacherPayouts('all'),
                FinanceService.getFeeStructures()
            ]);

            const transformedPayments = (paymentsData as any[])?.map(p => ({
                ...p,
                student_name: p.student?.user?.full_name,
                student_display_id: p.student?.id
            })) || [];

            const transformedPayouts = (payoutsData as any[])?.map(p => ({
                ...p,
                teacher_name: p.teacher?.user?.full_name,
                teacher_display_id: p.teacher?.id
            })) || [];

            setPayments(transformedPayments);
            setPayouts(transformedPayouts);
            setFeeStructures(feesData || []);
        } catch (error) {
            console.error('Error fetching finance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentSubmit = async (paymentData: Omit<Payment, "id">) => {
        try {
            await FinanceService.recordPayment(paymentData);
            fetchAllData();
        } catch (error) {
            console.error('Error recording payment:', error);
        }
    };

    const handlePayoutProcess = async (payoutId: string) => {
        try {
            await FinanceService.processPayout(payoutId);
            fetchAllData();
        } catch (error) {
            console.error('Error processing payout:', error);
        }
    };

    const handleFeeStructureUpdate = async (feeData: Partial<FeeStructure>) => {
        try {
            if (feeData.id) {
                await FinanceService.updateFeeStructure(feeData.id, feeData);
                fetchAllData();
            }
        } catch (error) {
            console.error('Error updating fee structure:', error);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchAllData().finally(() => setRefreshing(false));
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#f9fafb' }}>
            <UnifiedHeader
                title="Management"
                subtitle="Finance"
                role="Admin"
                showNotification={false}
            />
            <View style={{ maxWidth: 1280, width: '100%', flex: 1, alignSelf: 'center' }}>

                {/* Tabs */}
                <View style={{
                    backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? '#2c2c2c' : '#f3f4f6',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {TABS.map(({ key, label }) => {
                            const isActive = activeTab === key;
                            return (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => setActiveTab(key)}
                                    style={{
                                        marginRight: 12,
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        backgroundColor: isActive ? '#FF6B00' : 'transparent',
                                        borderColor: isActive ? '#FF6B00' : (isDark ? '#2c2c2c' : '#e5e7eb'),
                                    }}
                                >
                                    <Text style={{
                                        fontWeight: '600',
                                        color: isActive ? '#ffffff' : (isDark ? '#9ca3af' : '#6b7280'),
                                    }}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Content */}
                <ScrollView
                    style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#FF6B00"
                            colors={["#FF6B00"]}
                        />
                    }
                >
                    {activeTab === 'payments' && <PaymentManagementSection payments={payments} loading={loading} onPaymentSubmit={handlePaymentSubmit} onRefresh={onRefresh} />}
                    {activeTab === 'bursaries' && <BursariesList />}
                    {activeTab === 'payouts' && <TeacherPayoutSection payouts={payouts} loading={loading} onPayoutProcess={handlePayoutProcess} onRefresh={onRefresh} />}
                    {activeTab === 'fees' && <FeeStructureSection feeStructures={feeStructures} loading={loading} onFeeStructureUpdate={handleFeeStructureUpdate} onRefresh={onRefresh} />}
                </ScrollView>

                {/* FAB for Bursaries */}
                {activeTab === 'bursaries' && (
                    <View style={{ position: 'absolute', bottom: 24, right: 24, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                        <TouchableOpacity
                            style={{
                                width: 48, height: 48,
                                backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                borderRadius: 24,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderWidth: 1,
                                borderColor: isDark ? '#2c2c2c' : '#f3f4f6',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: isDark ? 0.4 : 0.1,
                                shadowRadius: 8,
                                elevation: 6,
                            }}
                            onPress={() => router.push('/(admin)/finance/bursaries/reports')}
                        >
                            <Ionicons name="stats-chart" size={22} color="#FF6B00" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                width: 56, height: 56,
                                backgroundColor: '#FF6B00',
                                borderRadius: 28,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: '#FF6B00',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.4,
                                shadowRadius: 8,
                                elevation: 8,
                            }}
                            onPress={() => router.push('/(admin)/finance/bursaries/create')}
                        >
                            <Ionicons name="add" size={30} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}