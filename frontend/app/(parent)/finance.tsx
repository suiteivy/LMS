import { ArrowDownLeft, ArrowUpRight, Info } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";

const DUMMY_FINANCE = {
  balance: 8500,
  total_fees: 45000,
  paid_amount: 36500,
  transactions: [
    { id: "1", type: "School Fees Payment", date: "2026-02-10", amount: 15000, direction: "inflow" },
    { id: "2", type: "Term 1 Tuition Fee", date: "2026-01-15", amount: 30000, direction: "outflow" },
    { id: "3", type: "Activity Fee", date: "2026-01-15", amount: 5000, direction: "outflow" },
    { id: "4", type: "Library Bond", date: "2026-01-15", amount: 2000, direction: "outflow" },
    { id: "5", type: "Bursary Credit", date: "2026-01-20", amount: 8000, direction: "inflow" },
    { id: "6", type: "School Fees Payment", date: "2026-02-01", amount: 13500, direction: "inflow" },
    { id: "7", type: "ICT Levy", date: "2026-01-15", amount: 2500, direction: "outflow" },
    { id: "8", type: "Uniform Deposit", date: "2026-01-16", amount: 5500, direction: "outflow" },
  ],
};

const formatCurrency = (amount: number) =>
  `KES ${amount.toLocaleString("en-KE")}`;

export default function StudentFinancePage() {
  const { balance, total_fees, paid_amount, transactions } = DUMMY_FINANCE;
  const paidPct = Math.round((paid_amount / total_fees) * 100);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Financial Records</Text>
        <Text className="text-gray-500 text-sm mt-1">Ethan Kamau — Term 1, 2026 · Demo Data</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Balance Card */}
        <View className="bg-orange-500 p-6 rounded-[2.5rem] mb-4">
          <Text className="text-white text-xs font-bold uppercase mb-2">Outstanding Balance</Text>
          <Text className="text-white text-4xl font-black mb-6">{formatCurrency(balance)}</Text>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-slate-800 p-4 rounded-3xl">
              <Text className="text-white text-[10px] font-bold uppercase mb-1">Total Fees</Text>
              <Text className="text-white font-bold">{formatCurrency(total_fees)}</Text>
            </View>
            <View className="flex-1 bg-slate-800 p-4 rounded-3xl">
              <Text className="text-white text-[10px] font-bold uppercase mb-1">Paid Amount</Text>
              <Text className="text-emerald-400 font-bold">{formatCurrency(paid_amount)}</Text>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="bg-white p-5 rounded-3xl mb-4 border border-gray-100">
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600 font-semibold text-sm">Payment Progress</Text>
            <Text className="text-gray-900 font-bold text-sm">{paidPct}%</Text>
          </View>
          <View className="bg-gray-100 rounded-full h-3 overflow-hidden">
            <View style={{ width: `${paidPct}%` }} className="bg-emerald-500 h-3 rounded-full" />
          </View>
          <Text className="text-gray-400 text-xs mt-2">{formatCurrency(balance)} remaining to clear</Text>
        </View>

        {/* Status Indicator */}
        <View className="mb-6 p-4 rounded-3xl flex-row items-center bg-amber-50 border border-amber-100">
          <Info size={20} color="#D97706" />
          <Text className="ml-3 font-medium text-amber-800 flex-1">
            Payment of {formatCurrency(balance)} is due by March 1st, 2026. Contact the bursar for a payment plan.
          </Text>
        </View>

        {/* Transactions */}
        <Text className="text-lg font-bold text-gray-900 mb-4 ml-2">Transaction History</Text>
        {transactions.map((tx) => (
          <View key={tx.id} className="bg-white p-4 rounded-3xl mb-3 flex-row items-center border border-gray-100 shadow-sm">
            <View className={`p-3 rounded-2xl mr-4 ${tx.direction === "inflow" ? "bg-emerald-50" : "bg-rose-50"}`}>
              {tx.direction === "inflow"
                ? <ArrowDownLeft size={20} color="#10B981" />
                : <ArrowUpRight size={20} color="#F43F5E" />}
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 font-bold">{tx.type}</Text>
              <Text className="text-gray-400 text-xs">{new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Text>
            </View>
            <Text className={`font-black ${tx.direction === "inflow" ? "text-emerald-600" : "text-gray-900"}`}>
              {tx.direction === "inflow" ? "+" : "-"}{formatCurrency(tx.amount)}
            </Text>
          </View>
        ))}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
