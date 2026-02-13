import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PaymentManagementSection } from '@/components/admin/finance/PaymentManagementSection';
import { BursariesList } from '@/components/admin/finance/BursariesList';
import { TeacherPayoutSection } from '@/components/admin/finance/TeacherPayoutSection';
import { FeeStructureSection } from '@/components/admin/finance/FeeStructureSection';
import { FinanceService } from '@/services/FinanceService';
import { Payment, TeacherPayout, FeeStructure } from '@/types/types';

export default function FinanceDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'payments' | 'bursaries' | 'payouts' | 'fees'>('payments');
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
            await FinanceService.updateFeeStructure(feeData);
            fetchAllData();
        } catch (error) {
            console.error('Error updating fee structure:', error);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchAllData().finally(() => setRefreshing(false));
    }, []);

    return (
        <View className="flex-1 bg-gray-50">
            <View className="max-w-7xl mx-auto w-full flex-1">
                {/* Header */}
                <View className="px-6 py-4 bg-white border-b border-gray-100">
                    <Text className="text-2xl font-bold text-gray-900">Finance</Text>
                    <Text className="text-gray-500 text-sm">Manage school finances and bursaries</Text>
                </View>

                {/* Tabs */}
                <View className="flex-row px-4 py-2 bg-white">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('payments')}
                            className={`mr-4 px-4 py-2 rounded-full border ${activeTab === 'payments' ? 'bg-[#FF6B00] border-[#FF6B00]' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={activeTab === 'payments' ? 'text-white font-medium' : 'text-gray-600 font-medium'}>Payments</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('bursaries')}
                            className={`mr-4 px-4 py-2 rounded-full border ${activeTab === 'bursaries' ? 'bg-[#FF6B00] border-[#FF6B00]' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={activeTab === 'bursaries' ? 'text-white font-medium' : 'text-gray-600 font-medium'}>Bursaries</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('payouts')}
                            className={`mr-4 px-4 py-2 rounded-full border ${activeTab === 'payouts' ? 'bg-[#FF6B00] border-[#FF6B00]' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={activeTab === 'payouts' ? 'text-white font-medium' : 'text-gray-600 font-medium'}>Payouts</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('fees')}
                            className={`mr-4 px-4 py-2 rounded-full border ${activeTab === 'fees' ? 'bg-[#FF6B00] border-[#FF6B00]' : 'bg-white border-gray-200'}`}
                        >
                            <Text className={activeTab === 'fees' ? 'text-white font-medium' : 'text-gray-600 font-medium'}>Fee Structure</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Content */}
                <ScrollView
                    className="flex-1 px-4 py-4"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                >
                    {activeTab === 'payments' && <PaymentManagementSection payments={payments} loading={loading} onPaymentSubmit={handlePaymentSubmit} onRefresh={onRefresh} />}
                    {activeTab === 'bursaries' && <BursariesList />}
                    {activeTab === 'payouts' && <TeacherPayoutSection payouts={payouts} loading={loading} onPayoutProcess={handlePayoutProcess} onRefresh={onRefresh} />}
                    {activeTab === 'fees' && <FeeStructureSection feeStructures={feeStructures} loading={loading} onFeeStructureUpdate={handleFeeStructureUpdate} onRefresh={onRefresh} />}
                </ScrollView>

                {/* Floating Action Button for Bursary Creation */}
                {activeTab === 'bursaries' && (
                    <View className="absolute bottom-6 right-6 flex-row items-end gap-3">
                        <TouchableOpacity
                            className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-lg border border-gray-100"
                            onPress={() => router.push('/(admin)/finance/bursaries/reports')}
                        >
                            <Ionicons name="stats-chart" size={24} color="#FF6B00" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-14 h-14 bg-[#FF6B00] rounded-full items-center justify-center shadow-lg"
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
