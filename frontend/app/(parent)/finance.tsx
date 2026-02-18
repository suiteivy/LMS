import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { ChevronLeft, Wallet, Receipt, ArrowUpRight, ArrowDownLeft, Info } from "lucide-react-native";
import { ParentService } from "@/services/ParentService";
import { formatCurrency } from "@/utils/currency";

export default function StudentFinancePage() {
    const { studentId } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [financeData, setFinanceData] = useState<any>(null);

    useEffect(() => {
        if (studentId) {
            fetchData();
        }
    }, [studentId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await ParentService.getStudentFinance(studentId as string);
            setFinanceData(data);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load financial records");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
                <TouchableOpacity onPress={() => router.back()} className="bg-gray-100 p-2 rounded-full w-10 mb-4">
                    <ChevronLeft size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-2xl font-bold text-gray-900">Financial Records</Text>
                <Text className="text-gray-500 text-sm mt-1">Fees, payments, and bursaries</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">
                {/* Balance Card */}
                <View className="bg-slate-900 p-6 rounded-[2.5rem] mb-6">
                    <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Total Outstanding Balance</Text>
                    <Text className="text-white text-4xl font-black mb-6">
                        {formatCurrency(financeData?.balance || 0)}
                    </Text>

                    <View className="flex-row gap-3">
                        <View className="flex-1 bg-slate-800 p-4 rounded-3xl">
                            <Text className="text-slate-500 text-[10px] font-bold uppercase mb-1">Total Fees</Text>
                            <Text className="text-white font-bold">{formatCurrency(financeData?.total_fees || 0)}</Text>
                        </View>
                        <View className="flex-1 bg-slate-800 p-4 rounded-3xl">
                            <Text className="text-slate-500 text-[10px] font-bold uppercase mb-1">Paid Amount</Text>
                            <Text className="text-emerald-400 font-bold">{formatCurrency(financeData?.paid_amount || 0)}</Text>
                        </View>
                    </View>
                </View>

                {/* Status Indicator */}
                <View className={`mb-6 p-4 rounded-3xl flex-row items-center ${financeData?.balance > 0 ? 'bg-amber-50 border border-amber-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                    <Info size={20} color={financeData?.balance > 0 ? "#D97706" : "#059669"} />
                    <Text className={`ml-3 font-medium ${financeData?.balance > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                        {financeData?.balance > 0
                            ? `Payment of ${formatCurrency(financeData?.balance)} is due for this term.`
                            : "Your fees for this term are fully cleared. Thank you!"}
                    </Text>
                </View>

                {/* Transactions */}
                <Text className="text-lg font-bold text-gray-900 mb-4 ml-2">Recent Transactions</Text>
                {financeData?.transactions?.length > 0 ? (
                    financeData.transactions.map((tx: any) => (
                        <View key={tx.id} className="bg-white p-4 rounded-3xl mb-3 flex-row items-center border border-gray-100 shadow-xs">
                            <View className={`p-3 rounded-2xl mr-4 ${tx.direction === 'inflow' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                {tx.direction === 'inflow' ? (
                                    <ArrowDownLeft size={20} color="#10B981" />
                                ) : (
                                    <ArrowUpRight size={20} color="#F43F5E" />
                                )}
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-900 font-bold">{tx.type.replace('_', ' ')}</Text>
                                <Text className="text-gray-400 text-xs">{new Date(tx.date).toLocaleDateString()}</Text>
                            </View>
                            <Text className={`font-black ${tx.direction === 'inflow' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                {tx.direction === 'inflow' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </Text>
                        </View>
                    ))
                ) : (
                    <View className="bg-gray-100 p-10 rounded-[40px] items-center">
                        <Receipt size={48} color="#9CA3AF" />
                        <Text className="text-gray-400 mt-4 text-center">No transactions found.</Text>
                    </View>
                )}

                <View className="h-20" />
            </ScrollView>
        </View>
    );
}
