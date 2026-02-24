import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useCurrency } from "@/contexts/CurrencyContext";
import { TeacherAPI } from "@/services/TeacherService";
import { format } from 'date-fns';
import { router } from "expo-router";
import { Calendar, ChevronRight, DollarSign, Download, TrendingUp, Wallet } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface Payment {
    id: string;
    description: string;
    amount: number;
    date: string;
    status: "completed" | "pending" | "processing" | "paid" | "failed";
}

const PaymentRow = ({ payment }: { payment: Payment }) => {
    const { convertUSDToKES, formatKES, formatUSD } = useCurrency();

    const getStatusStyle = (status: string) => {
        if (status === "completed" || status === "paid") return "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900";
        if (status === "pending" || status === "processing") return "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900";
        return "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900";
    };

    return (
        <View className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 mb-3 flex-row items-center shadow-sm">
            <View className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/20 items-center justify-center mr-4">
                <DollarSign size={20} color="#FF6900" />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 dark:text-white font-bold text-base leading-tight">{payment.description}</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">{payment.date}</Text>
            </View>
            <View className="items-end">
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-lg">{formatKES(convertUSDToKES(payment.amount))}</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold">{formatUSD(payment.amount)}</Text>
                <View className={`px-2 py-0.5 rounded-full mt-1.5 border ${getStatusStyle(payment.status).split(' ')[0]} ${getStatusStyle(payment.status).split(' ')[2]}`}>
                    <Text className={`text-[8px] font-bold uppercase tracking-widest ${getStatusStyle(payment.status).split(' ')[1]}`}>
                        {payment.status}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default function EarningsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const { convertUSDToKES, formatKES, formatUSD } = useCurrency();

    useEffect(() => {
        fetchEarnings();
    }, []);

    const fetchEarnings = async () => {
        try {
            setLoading(true);
            const data = await TeacherAPI.getEarnings();
            const mapped: Payment[] = data.map((p: any) => ({
                id: p.id,
                description: p.reference_number || "Salary Payout",
                amount: p.amount,
                date: format(new Date(p.created_at), 'MMM d, yyyy'),
                status: p.status === 'paid' ? 'completed' : p.status
            }));
            setPayments(mapped);
        } catch (error) {
            console.error("Error fetching earnings:", error);
        } finally {
            setLoading(false);
        }
    };

    const totalEarnings = payments.filter(p => p.status === "completed").reduce((acc, p) => acc + p.amount, 0);
    const pendingAmount = payments.filter(p => p.status === "pending").reduce((acc, p) => acc + p.amount, 0);

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Management"
                subtitle="Earnings & Payouts"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View className="p-4 md:p-8">
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-6 px-2">
                        <View>
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">Financial Overview</Text>
                        </View>
                        <TouchableOpacity className="w-10 h-10 bg-white dark:bg-[#1a1a1a] rounded-2xl items-center justify-center border border-gray-100 dark:border-gray-800 shadow-sm active:bg-gray-50 dark:active:bg-gray-900">
                            <Download size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : (
                        <>
                            {/* Wallet Card */}
                            <View className="bg-gray-900 dark:bg-[#1a1a1a] p-8 rounded-[40px] mb-8 shadow-2xl relative overflow-hidden border border-transparent dark:border-gray-800">
                                <View className="absolute -right-10 -top-10 bg-white/5 w-40 h-40 rounded-full" />
                                <View className="flex-row justify-between items-start mb-10">
                                    <View>
                                        <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px]">Total Balance</Text>
                                        <Text className="text-white text-4xl font-bold mt-2 tracking-tight">
                                            {formatKES(convertUSDToKES(totalEarnings))}
                                        </Text>
                                        <Text className="text-white/60 text-xs font-bold mt-1 tracking-widest">
                                            ≈ {formatUSD(totalEarnings)}
                                        </Text>
                                    </View>
                                    <View className="bg-white/10 p-4 rounded-3xl border border-white/10">
                                        <Wallet size={28} color="white" />
                                    </View>
                                </View>

                                <View className="flex-row gap-8 pt-8 border-t border-white/10">
                                    <View>
                                        <Text className="text-white/40 text-[8px] font-bold uppercase tracking-wider">Received</Text>
                                        <Text className="text-white font-bold text-lg mt-1">{formatKES(convertUSDToKES(totalEarnings))}</Text>
                                    </View>
                                    <View>
                                        <Text className="text-white/40 text-[8px] font-bold uppercase tracking-wider">Pending</Text>
                                        <Text className="text-white font-bold text-lg mt-1">{formatKES(convertUSDToKES(pendingAmount))}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Quick Stats Grid */}
                            <View className="flex-row gap-4 mb-8">
                                <View className="flex-1 bg-white dark:bg-[#1a1a1a] p-5 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                                    <View className="absolute -right-4 -bottom-4 bg-orange-50/50 dark:bg-orange-950/20 w-16 h-16 rounded-full" />
                                    <TrendingUp size={20} color="#FF6900" />
                                    <Text className="text-gray-900 dark:text-white text-2xl font-bold mt-6">{payments.length}</Text>
                                    <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">Payouts</Text>
                                </View>
                                <View className="flex-1 bg-white dark:bg-[#1a1a1a] p-5 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                                    <View className="absolute -right-4 -bottom-4 bg-gray-50/50 dark:bg-gray-800/20 w-16 h-16 rounded-full" />
                                    <Calendar size={20} color="#111827" />
                                    <Text className="text-gray-900 dark:text-white text-2xl font-bold mt-6">{payments.filter(p => p.status === 'completed').length}</Text>
                                    <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">Verified</Text>
                                </View>
                            </View>

                            {/* Payment History */}
                            <View className="flex-row justify-between items-center mb-6 px-2">
                                <Text className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Payout History</Text>
                                <TouchableOpacity>
                                    <Text className="text-[#FF6900] text-xs font-bold uppercase tracking-widest underline">View All</Text>
                                </TouchableOpacity>
                            </View>

                            {payments.length === 0 ? (
                                <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                                    <DollarSign size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">No history found</Text>
                                </View>
                            ) : (
                                payments.map((payment) => (
                                    <PaymentRow key={payment.id} payment={payment} />
                                ))
                            )}

                            {/* Status Card */}
                            <TouchableOpacity className="bg-orange-50 dark:bg-orange-950/20 p-6 rounded-[40px] mt-8 flex-row items-center border border-orange-100 dark:border-orange-900 shadow-sm active:bg-orange-100 dark:active:bg-orange-900">
                                <View className="flex-1">
                                    <Text className="text-[#FF6900] font-bold text-lg tracking-tight">Next Payout Status</Text>
                                    <Text className="text-[#FF6900]/60 dark:text-[#FF6900]/40 text-xs font-bold mt-1">Check scheduled date in portal</Text>
                                </View>
                                <ChevronRight size={24} color="#FF6900" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
