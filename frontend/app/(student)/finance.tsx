import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { StudentService } from "@/services/StudentService";
import { router } from "expo-router";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Info, Receipt, Wallet } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function StudentFinancePage() {
    const { studentId, isDemo } = useAuth();
    const [loading, setLoading] = useState(true);
    const [financeData, setFinanceData] = useState<any>(null);
    const [kesRate, setKesRate] = useState<number>(129);

    useEffect(() => {
        fetchData();
    }, [isDemo]);

    const fetchData = async () => {
        try {
            setLoading(true);

            if (isDemo) {
                // High-quality mock data for Demo Mode
                setFinanceData({
                    balance: 450.00,
                    total_fees: 1650.00,
                    paid_amount: 1200.00,
                    transactions: [
                        { id: 'tx-1', type: 'fee_payment', direction: 'inflow', amount: 600.00, date: new Date().toISOString() },
                        { id: 'tx-2', type: 'tuition_charge', direction: 'outflow', amount: 1050.00, date: new Date(Date.now() - 30 * 86400000).toISOString() },
                        { id: 'tx-3', type: 'fee_payment', direction: 'inflow', amount: 600.00, date: new Date(Date.now() - 60 * 86400000).toISOString() }
                    ]
                });
                setLoading(false);
                return;
            }

            const data = await StudentService.getFinance();
            setFinanceData(data);
            const { data: exchangeData } = await (supabase.from('system_settings').select('value').eq('key', 'exchange_rates').single() as any);
            if (exchangeData?.value?.KES) setKesRate(exchangeData.value.KES);
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

    const formatUSD = (usdAmount: number) => `$${usdAmount.toFixed(2)} USD`;

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
                <ActivityIndicator size="large" color="#FF6900" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <UnifiedHeader
                title="Intelligence"
                subtitle="Finances"
                role="Student"
                onBack={() => router.back()}
            />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                <View className="p-4 md:p-8 bg-gray-50 dark:bg-black">
                    {/* Balance Hero */}
                    <View className="bg-gray-900 p-8 rounded-[48px] shadow-2xl mb-8">
                        <View className="flex-row justify-between items-center mb-6">
                            <View>
                                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Total Outstanding</Text>
                                <Text className="text-white text-5xl font-black tracking-tighter">
                                    {formatKES(financeData?.balance || 0)}
                                </Text>
                                {financeData?.balance > 0 && (
                                    <View className="bg-[#FF6900]/20 self-start px-3 py-1 rounded-full mt-2">
                                        <Text className="text-[#FF6900] text-[10px] font-bold tracking-widest uppercase">
                                            {formatUSD(financeData?.balance)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View className="w-16 h-16 rounded-full bg-white/5 items-center justify-center border border-white/10">
                                <Wallet size={32} color="white" />
                            </View>
                        </View>

                        <View className="flex-row gap-4 pt-8 border-t border-white/10">
                            <View className="flex-1">
                                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest mb-1">Fee Obligation</Text>
                                <Text className="text-white font-bold text-base">{formatKES(financeData?.total_fees || 0)}</Text>
                            </View>
                            <View className="flex-1 border-l border-white/10 pl-4">
                                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest mb-1">Liquidiated</Text>
                                <Text className="text-emerald-400 font-bold text-base">{formatKES(financeData?.paid_amount || 0)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Status Info */}
                    <View className={`p-6 rounded-[32px] mb-8 flex-row items-center border ${financeData?.balance > 0 ? 'bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900' : 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900'}`}>
                        <View className={`w-10 h-10 rounded-2xl items-center justify-center ${financeData?.balance > 0 ? 'bg-white shadow-sm' : 'bg-green-500 shadow-lg'}`}>
                            <Info size={20} color={financeData?.balance > 0 ? "#FF6900" : "white"} />
                        </View>
                        <Text className={`flex-1 ml-4 text-sm font-medium leading-tight ${financeData?.balance > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-green-900 dark:text-green-200'}`}>
                            {financeData?.balance > 0
                                ? `A balance of ${formatKES(financeData?.balance)} is currently due.`
                                : "Academic financial records are fully cleared for this term."}
                        </Text>
                    </View>

                    {/* Transaction History */}
                    <View className="px-2 flex-row justify-between items-center mb-6">
                        <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">Ledger Statements</Text>
                        <TouchableOpacity className="flex-row items-center bg-white dark:bg-[#1a1a1a] px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <CreditCard size={14} color="#FF6900" />
                            <Text className="text-gray-900 dark:text-white text-[10px] font-bold uppercase tracking-widest ml-2">Pay Fees</Text>
                        </TouchableOpacity>
                    </View>

                    {financeData?.transactions?.length > 0 ? (
                        financeData.transactions.map((tx: any) => (
                            <View key={tx.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] mb-4 flex-row items-center border border-gray-50 dark:border-gray-800 shadow-sm">
                                <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${tx.direction === 'inflow' ? 'bg-green-50' : 'bg-red-50'}`}>
                                    {tx.direction === 'inflow' ? <ArrowDownLeft size={20} color="#16a34a" /> : <ArrowUpRight size={20} color="#dc2626" />}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">{tx.type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Text>
                                    <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">{new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                                </View>
                                <View className="items-end">
                                    <Text className={`font-bold text-base ${tx.direction === 'inflow' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                                        {tx.direction === 'inflow' ? '+' : '-'}{formatKES(tx.amount)}
                                    </Text>
                                    <Text className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{formatUSD(tx.amount)}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View className="bg-white dark:bg-[#1a1a1a] p-20 rounded-[48px] items-center border border-gray-100 dark:border-gray-700 border-dashed mt-4">
                            <Receipt size={48} color="#E5E7EB" />
                            <Text className="text-gray-400 font-bold text-center mt-6">Void Transaction Hub</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
