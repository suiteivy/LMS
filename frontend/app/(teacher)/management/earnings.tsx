import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { ArrowLeft, Wallet, TrendingUp, Calendar, Download, ChevronDown, DollarSign, ChevronRight } from 'lucide-react-native';
import { router } from "expo-router";

interface Payment {
    id: string;
    description: string;
    amount: number;
    date: string;
    status: "completed" | "pending" | "processing";
}

const PaymentRow = ({ payment }: { payment: Payment }) => {
    const getStatusStyle = (status: string) => {
        if (status === "completed") return "bg-green-50 text-green-600";
        if (status === "pending") return "bg-yellow-50 text-yellow-600";
        return "bg-blue-50 text-blue-600";
    };

    return (
        <View className="bg-white p-4 rounded-xl border border-gray-100 mb-2 flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                <DollarSign size={18} color="#22c55e" />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-semibold">{payment.description}</Text>
                <Text className="text-gray-400 text-xs">{payment.date}</Text>
            </View>
            <View className="items-end">
                <Text className="text-gray-900 font-bold">${payment.amount.toLocaleString()}</Text>
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

    const payments: Payment[] = [
        { id: "1", description: "Subject: Mathematics", amount: 450, date: "Feb 5, 2026", status: "completed" },
        { id: "2", description: "Subject: Computer Science", amount: 680, date: "Feb 1, 2026", status: "completed" },
        { id: "3", description: "Subject: Writing Workshop", amount: 320, date: "Jan 28, 2026", status: "completed" },
        { id: "4", description: "Bonus: High Performance", amount: 150, date: "Jan 25, 2026", status: "completed" },
        { id: "5", description: "Subject: Digital Literacy", amount: 280, date: "Jan 20, 2026", status: "completed" },
        { id: "6", description: "Pending: February Payout", amount: 520, date: "Feb 28, 2026", status: "pending" },
    ];

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

                        {/* Total Earnings Card */}
                        <View className="bg-gradient-to-r bg-green-600 p-6 rounded-3xl mb-6">
                            <View className="flex-row justify-between items-start mb-4">
                                <View>
                                    <Text className="text-green-100 text-sm">Total Earnings</Text>
                                    <Text className="text-white text-4xl font-black mt-1">
                                        ${totalEarnings.toLocaleString()}
                                    </Text>
                                </View>
                                <View className="bg-white/20 p-3 rounded-2xl">
                                    <Wallet size={28} color="white" />
                                </View>
                            </View>
                            <View className="flex-row">
                                <View className="flex-1 border-r border-white/20 pr-4">
                                    <Text className="text-green-100 text-xs">This Month</Text>
                                    <Text className="text-white font-bold text-lg">$1,130</Text>
                                </View>
                                <View className="flex-1 pl-4">
                                    <Text className="text-green-100 text-xs">Pending</Text>
                                    <Text className="text-white font-bold text-lg">${pendingAmount}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Quick Stats */}
                        <View className="flex-row gap-3 mb-6">
                            <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
                                <TrendingUp size={20} color="#22c55e" />
                                <Text className="text-gray-900 text-xl font-bold mt-2">+18%</Text>
                                <Text className="text-gray-400 text-xs">vs last month</Text>
                            </View>
                            <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-100">
                                <Calendar size={20} color="#3b82f6" />
                                <Text className="text-gray-900 text-xl font-bold mt-2">12</Text>
                                <Text className="text-gray-400 text-xs">Payments</Text>
                            </View>
                        </View>

                        {/* Period Selector */}
                        <TouchableOpacity className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-100 flex-row items-center justify-between">
                            <Text className="text-gray-700 font-medium">{selectedPeriod}</Text>
                            <ChevronDown size={16} color="#6B7280" />
                        </TouchableOpacity>

                        {/* Payment History */}
                        <Text className="text-lg font-bold text-gray-900 mb-3">Payment History</Text>
                        {payments.map((payment) => (
                            <PaymentRow key={payment.id} payment={payment} />
                        ))}

                        {/* Payout Info */}
                        <TouchableOpacity className="bg-blue-50 p-4 rounded-2xl mt-4 flex-row items-center">
                            <View className="flex-1">
                                <Text className="text-blue-800 font-bold">Next Payout</Text>
                                <Text className="text-blue-600 text-sm">February 28, 2026</Text>
                            </View>
                            <Text className="text-blue-800 font-bold text-lg mr-2">${pendingAmount}</Text>
                            <ChevronRight size={18} color="#3b82f6" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </>
    );
}
