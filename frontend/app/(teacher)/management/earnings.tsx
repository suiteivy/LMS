import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { ArrowLeft, Wallet, TrendingUp, Calendar, Download, ChevronDown, DollarSign, ChevronRight } from 'lucide-react-native';
import { router } from "expo-router";
import { TeacherAPI } from "@/services/TeacherService";
import { format } from 'date-fns';
import { useCurrency } from "@/contexts/CurrencyContext";

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
        if (status === "completed" || status === "paid") return "bg-green-50 text-green-600";
        if (status === "pending" || status === "processing") return "bg-yellow-50 text-yellow-600";
        return "bg-red-50 text-red-600";
    };

    return (
        <View className="bg-white p-4 rounded-xl border border-gray-100 mb-2 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                <DollarSign size={18} color="#FF6B00" />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-semibold">{payment.description}</Text>
                <Text className="text-gray-400 text-xs">{payment.date}</Text>
            </View>
            <View className="items-end">
                <Text className="text-gray-900 font-bold">{formatKES(convertUSDToKES(payment.amount))}</Text>
                <Text className="text-gray-400 text-[10px]">{formatUSD(payment.amount)}</Text>
                <View className={`px-2 py-0.5 rounded-full mt-1 ${getStatusStyle(payment.status)}`}>
                    <Text className={`text-xs font-medium ${getStatusStyle(payment.status).split(' ')[1]}`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default function EarningsPage() {
    const [selectedPeriod, setSelectedPeriod] = useState("This Month");
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
            // Map backend payouts to UI Payment interface
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
        <>
            <StatusBar barStyle="dark-content" />
            <View className="flex-1 bg-gray-50">
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <View className="p-4">
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-6">
                            <View className="flex-row items-center">
                                <TouchableOpacity className="p-2 mr-2" onPress={() => router.back()}>
                                    <ArrowLeft size={24} color="#374151" />
                                </TouchableOpacity>
                                <Text className="text-2xl font-bold text-gray-900">Earnings</Text>
                            </View>
                            <TouchableOpacity className="p-2 bg-white rounded-xl border border-gray-100">
                                <Download size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color="#FF6B00" className="mt-20" />
                        ) : (
                            <>
                                {/* Total Earnings Card */}
                                <View className="bg-teacherOrange p-6 rounded-3xl mb-6">
                                    <View className="flex-row justify-between items-start mb-4">
                                        <View>
                                            <Text className="text-white text-sm">Total Earnings</Text>
                                            <Text className="text-white text-4xl font-black mt-1">
                                                {formatKES(convertUSDToKES(totalEarnings))}
                                            </Text>
                                            <Text className="text-white/80 text-xs font-medium">
                                                ≈ {formatUSD(totalEarnings)}
                                            </Text>
                                        </View>
                                        <View className="bg-white/20 p-3 rounded-2xl">
                                            <Wallet size={28} color="white" />
                                        </View>
                                    </View>
                                    <View className="flex-row">
                                        <View className="flex-1 border-r border-white/20 pr-4">
                                            <Text className="text-white text-xs">Total Paid</Text>
                                            <Text className="text-white font-bold text-lg">{formatKES(convertUSDToKES(totalEarnings))}</Text>
                                        </View>
                                        <View className="flex-1 pl-4">
                                            <Text className="text-white text-xs">Pending</Text>
                                            <Text className="text-white font-bold text-lg">{formatKES(convertUSDToKES(pendingAmount))}</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Quick Stats */}
                                <View className="flex-row gap-3 mb-6">
                                    <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
                                        <TrendingUp size={20} color="#FF6B00" />
                                        <Text className="text-gray-900 text-xl font-bold mt-2">Payouts</Text>
                                        <Text className="text-gray-400 text-xs">{payments.length} total</Text>
                                    </View>
                                    <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
                                        <Calendar size={20} color="#1a1a1a" />
                                        <Text className="text-gray-900 text-xl font-bold mt-2">{payments.filter(p => p.status === 'completed').length}</Text>
                                        <Text className="text-gray-400 text-xs">Successful</Text>
                                    </View>
                                </View>

                                {/* Period Selector */}
                                <TouchableOpacity className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-100 flex-row items-center justify-between">
                                    <Text className="text-gray-700 font-medium">{selectedPeriod}</Text>
                                    <ChevronDown size={16} color="#6B7280" />
                                </TouchableOpacity>

                                {/* Payment History */}
                                <Text className="text-lg font-bold text-gray-900 mb-3">Payment History</Text>
                                {payments.length === 0 ? (
                                    <View className="py-10 items-center">
                                        <Text className="text-gray-400">No payout history found</Text>
                                    </View>
                                ) : (
                                    payments.map((payment) => (
                                        <PaymentRow key={payment.id} payment={payment} />
                                    ))
                                )}

                                {/* Payout Info */}
                                <TouchableOpacity className="bg-orange-50 p-4 rounded-2xl mt-4 flex-row items-center">
                                    <View className="flex-1">
                                        <Text className="text-teacherOrange font-bold">Payout Status</Text>
                                        <Text className="text-teacherOrange text-sm">Check admin for next scheduled date</Text>
                                    </View>
                                    <View className="items-end mr-2">
                                        <Text className="text-teacherOrange font-bold text-lg">{formatKES(convertUSDToKES(pendingAmount))}</Text>
                                        <Text className="text-teacherOrange/70 text-[10px]">{formatUSD(pendingAmount)}</Text>
                                    </View>
                                    <ChevronRight size={18} color="#FF6B00" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
