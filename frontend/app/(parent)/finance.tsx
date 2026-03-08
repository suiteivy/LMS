import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ParentService } from "@/services/ParentService";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowDownLeft, ArrowUpRight, Award, CreditCard, Info, Wallet } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";

const formatCurrency = (amount: number) =>
  `KES ${Number(amount || 0).toLocaleString("en-KE")}`;

export default function StudentFinancePage() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [financeData, setFinanceData] = useState<any>(null);
  const [bursaries, setBursaries] = useState<any[]>([]);
  const [bursaryLoading, setBursaryLoading] = useState(false);
  const [bursariesFetched, setBursariesFetched] = useState(false);

  const fetchFinanceData = async () => {
    if (!studentId) return;
    try {
      const data = await ParentService.getStudentFinance(studentId);
      setFinanceData(data);
    } catch (error) {
      console.error("Error fetching finance data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBursaries = async () => {
    if (!studentId || bursariesFetched) return;
    try {
      setBursaryLoading(true);
      const data = await ParentService.getStudentBursaries(studentId);
      setBursaries(data);
      setBursariesFetched(true);
    } catch (err) {
      console.error('Error fetching bursaries:', err);
    } finally {
      setBursaryLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
    fetchBursaries();
  }, [studentId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFinanceData();
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }

  const {
    balance = 0,
    total_fees = 0,
    paid_amount = 0,
    transactions = []
  } = financeData || {};

  const paidPct = total_fees > 0 ? Math.round((paid_amount / total_fees) * 100) : 0;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <UnifiedHeader
        title="Intelligence"
        subtitle="Finance"
        role="Parent"
        onBack={() => router.back()}
        showNotification={false}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
        }
      >
        <View className="p-4 md:p-8">

          {/* Balance Hero */}
          <View className="bg-gray-900 p-8 rounded-[48px] shadow-2xl mb-8">
            <View className="flex-row justify-between items-center mb-8">
              <View className="flex-1 mr-4">
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Portfolio Balance</Text>
                <Text className="text-white text-5xl font-black tracking-tighter" adjustsFontSizeToFit numberOfLines={1}>
                  {formatCurrency(balance)}
                </Text>
                <View className="bg-[#FF6900]/20 self-start px-3 py-1 rounded-full mt-2">
                  <Text className="text-[#FF6900] text-[10px] font-bold tracking-widest uppercase">{paidPct}% Liquidated</Text>
                </View>
              </View>
              <View className="w-16 h-16 rounded-full bg-white/5 items-center justify-center border border-white/10">
                <Wallet size={32} color="white" />
              </View>
            </View>

            {/* Progress Visual */}
            <View className="bg-white/5 p-6 rounded-[32px] border border-white/5 mb-8">
              <View className="flex-row justify-between mb-3 px-1">
                <Text className="text-white/40 text-[8px] font-bold uppercase tracking-widest">Fee Progress</Text>
                <Text className="text-emerald-400 text-[8px] font-bold uppercase tracking-widest">Active Standing</Text>
              </View>
              <View className="bg-white/10 rounded-full h-2 overflow-hidden">
                <View style={{ width: `${paidPct}%` }} className="bg-[#FF6900] h-2 rounded-full" />
              </View>
            </View>

            <View className="flex-row gap-4 pt-8 border-t border-white/10">
              <View className="flex-1">
                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest mb-1">Total Obligation</Text>
                <Text className="text-white font-bold text-base">{formatCurrency(total_fees)}</Text>
              </View>
              <View className="flex-1 border-l border-white/10 pl-4">
                <Text className="text-white/30 text-[8px] font-bold uppercase tracking-widest mb-1">Total Clear</Text>
                <Text className="text-emerald-400 font-bold text-base">{formatCurrency(paid_amount)}</Text>
              </View>
            </View>
          </View>

          {/* Status Feedback */}
          {Number(balance) > 0 && (
            <View className="p-6 rounded-[32px] mb-8 flex-row items-center border border-orange-100 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30">
              <View className="w-10 h-10 rounded-2xl items-center justify-center bg-white shadow-sm">
                <Info size={20} color="#FF6900" />
              </View>
              <Text className="flex-1 ml-4 text-sm font-medium leading-tight text-gray-900 dark:text-gray-100">
                Outstanding balance of {formatCurrency(balance)}. Please contact the finance office for payment options.
              </Text>
            </View>
          )}

          {/* Transaction Ledger */}
          <View className="px-2 flex-row justify-between items-center mb-6">
            <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight">Financial Statements</Text>
            <TouchableOpacity className="flex-row items-center bg-white dark:bg-[#1a1a1a] px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <CreditCard size={14} color="#FF6900" />
              <Text className="text-gray-900 dark:text-white text-[10px] font-bold uppercase tracking-widest ml-2">Pay Now</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[40px] border border-dashed border-gray-100 dark:border-gray-800 items-center mb-8">
              <Text className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest italic text-center">
                No transactions recorded yet
              </Text>
            </View>
          ) : (
            transactions.map((tx: any) => (
              <View key={tx.id} className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] mb-4 flex-row items-center border border-gray-50 dark:border-gray-800 shadow-sm">
                <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${tx.direction === "inflow" ? "bg-green-50" : "bg-red-50"}`}>
                  {tx.direction === "inflow"
                    ? <ArrowDownLeft size={20} color="#10B981" />
                    : <ArrowUpRight size={20} color="#F43F5E" />}
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">
                    {tx.type || tx.description || "Transaction"}
                  </Text>
                  <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                    {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </Text>
                </View>
                <Text className={`font-bold text-base ${tx.direction === "inflow" ? "text-green-600" : "text-gray-900 dark:text-white"}`}>
                  {tx.direction === "inflow" ? "+" : "-"}{formatCurrency(tx.amount).replace("KES ", "")}
                </Text>
              </View>
            ))
          )}

          {/* ── Bursaries Section ── */}
          <View className="mt-8">
            <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight mb-5 px-2">Bursaries</Text>
            {bursaryLoading ? (
              <ActivityIndicator size="small" color="#FF6900" />
            ) : bursaries.length > 0 ? (
              bursaries.map((item: any) => (
                <View key={item.id} className="bg-white dark:bg-[#1a1a1a] rounded-[28px] mb-4 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                  <View className="h-1.5 bg-emerald-500" />
                  <View className="p-5">
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="text-gray-900 dark:text-white font-bold text-sm flex-1 mr-3">{item.bursary?.title}</Text>
                      <View className="bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <Text className="text-emerald-700 dark:text-emerald-400 text-[9px] font-extrabold uppercase tracking-wider">Approved</Text>
                      </View>
                    </View>

                    {item.bursary?.description && (
                      <Text className="text-gray-500 dark:text-gray-400 text-xs mb-3 leading-5">{item.bursary.description}</Text>
                    )}

                    <View className="bg-gray-900 rounded-2xl p-4 flex-row justify-between items-center">
                      <View>
                        <Text className="text-white/40 text-[9px] font-bold uppercase tracking-widest mb-1">Amount Awarded</Text>
                        <Text className="text-white text-2xl font-black">{formatCurrency(item.amount_awarded || item.bursary?.amount || 0)}</Text>
                      </View>
                      <View className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 items-center justify-center">
                        <Award size={22} color="#10B981" />
                      </View>
                    </View>

                    {(item.bursary?.deadline || item.notes) && (
                      <View className="flex-row gap-2 flex-wrap mt-3">
                        {item.bursary?.deadline && (
                          <View className="bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl flex-row items-center gap-1">
                            <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Deadline:</Text>
                            <Text className="text-xs font-bold text-gray-900 dark:text-white">
                              {new Date(item.bursary.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                          </View>
                        )}
                        {item.notes && (
                          <View className="bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-xl">
                            <Text className="text-xs text-blue-700 dark:text-blue-400 font-medium">{item.notes}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View className="bg-white dark:bg-[#1a1a1a] p-8 rounded-[40px] border border-dashed border-gray-100 dark:border-gray-800 items-center">
                <Award size={36} color="#E5E7EB" />
                <Text className="text-gray-400 text-sm font-bold text-center mt-4">No approved bursaries</Text>
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </View>
  );
}