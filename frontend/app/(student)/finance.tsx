import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { ChevronLeft, Wallet, Receipt, ArrowUpRight, ArrowDownLeft, Info } from "lucide-react-native";
import { StudentService } from "@/services/StudentService";
import { formatCurrency } from "@/utils/currency";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";

export default function StudentFinancePage() {
    const { studentId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [financeData, setFinanceData] = useState<any>(null);
    const [kesRate, setKesRate] = useState<number>(129); // Default fallback

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await StudentService.getFinance();
            setFinanceData(data);

            // Fetch Exchange Rate
            const { data: exchangeData } = await (supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'exchange_rates')
                .single() as any);

            if (exchangeData && exchangeData.value && exchangeData.value.KES) {
                setKesRate(exchangeData.value.KES);
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to load financial records");
        } finally {
            setLoading(false);
        }
    };

    const formatKES = (usdAmount: number) => {
        const ksh = Math.round(usdAmount * kesRate);
        return `${ksh.toLocaleString()} KSh`;
    };

    const formatUSD = (usdAmount: number) => {
        return `$${usdAmount.toFixed(2)} USD`;
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
                <Text className="text-2xl font-bold text-gray-900">My Finance</Text>
                <Text className="text-gray-500 text-sm mt-1">Fees and payment history</Text>
            </View>

            <ScrollView className="flex-1 px-6 pt-6">
                {/* Balance Card */}
                <View className="bg-slate-900 p-6 rounded-[2.5rem] mb-6">
                    <Text className="text-slate-400 text-xs font-bold uppercase mb-2">My Outstanding Balance</Text>
                    <View className="mb-6">
                        <Text className="text-white text-4xl font-black">
                            {formatKES(financeData?.balance || 0)}
                        </Text>
                        {financeData?.balance > 0 && (
                            <Text className="text-slate-400 text-sm font-medium mt-1">
                                {formatUSD(financeData?.balance)}
                            </Text>
                        )}
                    </View>

                    <View className="flex-row gap-3">
                        <View className="flex-1 bg-slate-800 p-4 rounded-3xl">
                            <Text className="text-slate-500 text-[10px] font-bold uppercase mb-1">Total Fees</Text>
                            <Text className="text-white font-bold">{formatKES(financeData?.total_fees || 0)}</Text>
                            <Text className="text-slate-500 text-[8px]">{formatUSD(financeData?.total_fees || 0)}</Text>
                        </View>
                        <View className="flex-1 bg-slate-800 p-4 rounded-3xl">
                            <Text className="text-slate-500 text-[10px] font-bold uppercase mb-1">Paid Amount</Text>
                            <Text className="text-emerald-400 font-bold">{formatKES(financeData?.paid_amount || 0)}</Text>
                            <Text className="text-slate-500 text-[8px]">{formatUSD(financeData?.paid_amount || 0)}</Text>
                        </View>
                    </View>
                </View>

                {/* Status Indicator */}
                <View className={`mb-6 p-4 rounded-3xl flex-row items-center ${financeData?.balance > 0 ? 'bg-amber-50 border border-amber-100' : 'bg-emerald-50 border border-emerald-100'}`}>
                    <Info size={20} color={financeData?.balance > 0 ? "#D97706" : "#059669"} />
                    <Text className={`ml-3 font-medium ${financeData?.balance > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                        {financeData?.balance > 0
                            ? `Balance of ${formatKES(financeData?.balance)} (${formatUSD(financeData?.balance)}) is due for this term.`
                            : "Your fees for this term are fully cleared. Great job!"}
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
                                <Text className="text-gray-900 font-bold">{tx.type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Text>
                                <Text className="text-gray-400 text-xs">{new Date(tx.date).toLocaleDateString()}</Text>
                            </View>
                            <View className="items-end">
                                <Text className={`font-black ${tx.direction === 'inflow' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                    {tx.direction === 'inflow' ? '+' : '-'}{formatKES(tx.amount)}
                                </Text>
                                <Text className="text-[10px] text-gray-400">
                                    {formatUSD(tx.amount)}
                                </Text>
                            </View>
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
