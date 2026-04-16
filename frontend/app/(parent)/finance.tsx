import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ParentService } from "@/services/ParentService";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowDownLeft, ArrowUpRight, Award, CreditCard, Info, Wallet } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View, Modal, TextInput, Alert, Image } from "react-native";
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from "@/utils/supabase";
import { FinanceService } from "@/services/FinanceService";
import { X, CheckCircle2, Upload } from "lucide-react-native";
import { BlurView } from "expo-blur";


const formatCurrency = (amount: number) =>
  `KES ${Number(amount || 0).toLocaleString("en-KE")}`;

export default function StudentFinancePage() {
  const { studentId, studentName } = useLocalSearchParams<{ studentId: string; studentName?: string }>();
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [financeData, setFinanceData] = useState<any>(null);
  const [bursaries, setBursaries] = useState<any[]>([]);
  const [bursaryLoading, setBursaryLoading] = useState(false);
  const [bursariesFetched, setBursariesFetched] = useState(false);

  // Evidence Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [feeStructures, setFeeStructures] = useState<any[]>([]);
  const [selectedFeeId, setSelectedFeeId] = useState("");


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

  const fetchFeeStructures = async () => {
    try {
      const data = await FinanceService.getFeeStructures();
      setFeeStructures(data || []);
      if (data && data.length > 0) setSelectedFeeId(data[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFinanceData();
    fetchBursaries();
    fetchFeeStructures();
  }, [studentId]);


  const onRefresh = () => {
    setRefreshing(true);
    fetchFinanceData();
  };

  // When accessed directly from the tab bar without a selected student
  if (!studentId) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-navy">
        <UnifiedHeader
          title={studentName ? `${studentName}'s Finance` : "Finance"}
          subtitle="Fee Statement"
          role="Parent"
          onBack={() => router.back()}
          showNotification={false}
        />
        <View className="flex-1 items-center justify-center p-8">
          <View className="bg-white dark:bg-navy-surface p-10 rounded-[40px] border border-gray-100 dark:border-gray-800 items-center" style={{ width: '100%' }}>
            <CreditCard size={40} color="#FF6900" style={{ opacity: 0.6 }} />
            <Text className="text-gray-900 dark:text-white font-bold text-lg text-center mt-6 tracking-tight">
              Select a Child First
            </Text>
            <Text className="text-gray-400 dark:text-gray-500 text-sm text-center mt-3 leading-6">
              Go to the Home tab and tap a child&apos;s Finance card to view their fee statement.
            </Text>
            <TouchableOpacity
              onPress={() => router.replace("/(parent)" as any)}
              className="mt-8 bg-[#FF6900] px-8 py-4 rounded-2xl"
            >
              <Text className="text-white font-bold text-sm">Go to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-navy">
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
    <View className="flex-1 bg-gray-50 dark:bg-navy">
      <UnifiedHeader
        title={studentName ? `${studentName}'s Finance` : "Finance"}
        subtitle="Fee Statement"
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
          <View 
            style={{
              boxShadow: [{
                offsetX: 0,
                offsetY: 15,
                blurRadius: 30,
                color: 'rgba(0, 0, 0, 0.3)',
              }],
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 15 },
              shadowOpacity: 0.3,
              shadowRadius: 30,
              elevation: 20,
            }}
            className="bg-gray-900 p-8 rounded-[48px] mb-8"
          >
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
              <View 
                style={{
                  boxShadow: [{
                    offsetX: 0,
                    offsetY: 1,
                    blurRadius: 2,
                    color: 'rgba(0, 0, 0, 0.05)',
                  }],
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
                className="w-10 h-10 rounded-2xl items-center justify-center bg-white"
              >
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
            <TouchableOpacity 
              onPress={() => setShowUploadModal(true)}
              style={{
                boxShadow: [{
                  offsetX: 0,
                  offsetY: 1,
                  blurRadius: 2,
                  color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.05)',
                }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.4 : 0.05,
                shadowRadius: 2,
                elevation: 2,
              }}
              className="flex-row items-center bg-white dark:bg-navy-surface px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800"
            >
              <CreditCard size={14} color="#FF6900" />
              <Text className="text-gray-900 dark:text-white text-[10px] font-bold uppercase tracking-widest ml-2">Upload Evidence</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View className="bg-white dark:bg-navy-surface p-8 rounded-[40px] border border-dashed border-gray-100 dark:border-gray-800 items-center mb-8">
              <Text className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-widest italic text-center">
                No transactions recorded yet
              </Text>
            </View>
          ) : (
            transactions.map((tx: any) => (
              <View 
                key={tx.id} 
                style={{
                  boxShadow: [{
                    offsetX: 0,
                    offsetY: 1,
                    blurRadius: 2,
                    color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.05)',
                  }],
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0.4 : 0.05,
                  shadowRadius: 2,
                  elevation: 2,
                }}
                className="bg-white dark:bg-navy-surface p-5 rounded-[32px] mb-4 flex-row items-center border border-gray-50 dark:border-gray-800"
              >
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
                <View 
                  key={item.id} 
                  style={{
                    boxShadow: [{
                      offsetX: 0,
                      offsetY: 1,
                      blurRadius: 2,
                      color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.05)',
                    }],
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: isDark ? 0.4 : 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                  className="bg-white dark:bg-navy-surface rounded-[28px] mb-4 border border-gray-100 dark:border-gray-800 overflow-hidden"
                >
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
              <View className="bg-white dark:bg-navy-surface p-8 rounded-[40px] border border-dashed border-gray-100 dark:border-gray-800 items-center">
                <Award size={36} color="#E5E7EB" />
                <Text className="text-gray-400 text-sm font-bold text-center mt-4">No approved bursaries</Text>
              </View>
            )}
          </View>

        </View>
      </ScrollView>

      {/* Upload Evidence Modal */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <BlurView intensity={20} tint={isDark ? "dark" : "light"} className="absolute inset-0" />
          <View className="bg-white dark:bg-navy-surface rounded-t-[48px] p-8 pb-12 border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-gray-900 dark:text-white font-black text-2xl tracking-tighter">Submit Evidence</Text>
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Proof of Fee Payment</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowUploadModal(false)}
                className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
              >
                <X size={20} color={isDark ? "#FFF" : "#000"} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="space-y-6">
                {/* Fee Structure Selection */}
                <View>
                  <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[2px] mb-3 ml-1">Fee Category</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {feeStructures.map(fee => (
                      <TouchableOpacity
                        key={fee.id}
                        onPress={() => setSelectedFeeId(fee.id)}
                        className={`px-4 py-3 rounded-2xl border ${selectedFeeId === fee.id ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}
                      >
                        <Text className={`text-xs font-bold ${selectedFeeId === fee.id ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                          {fee.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Amount Input */}
                <View>
                  <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[2px] mb-3 ml-1">Amount Paid (KES)</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="e.g. 50000"
                    placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                    keyboardType="numeric"
                    className="bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl text-gray-900 dark:text-white font-bold"
                  />
                </View>

                {/* Reference Input */}
                <View className="mt-6">
                  <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[2px] mb-3 ml-1">Reference Number / M-PESA ID</Text>
                  <TextInput
                    value={reference}
                    onChangeText={setReference}
                    placeholder="e.g. QXJ82910XX"
                    placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                    autoCapitalize="characters"
                    className="bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl text-gray-900 dark:text-white font-bold"
                  />
                </View>

                {/* File Picker */}
                <TouchableOpacity 
                  onPress={async () => {
                    const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] });
                    if (!res.canceled) setSelectedFile(res.assets[0]);
                  }}
                  className="mt-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl p-8 items-center justify-center bg-gray-50/50 dark:bg-gray-800/20"
                >
                  {selectedFile ? (
                    <View className="items-center">
                      <CheckCircle2 size={32} color="#10B981" />
                      <Text className="text-gray-900 dark:text-white font-bold text-sm mt-3">{selectedFile.name}</Text>
                      <Text className="text-gray-400 text-[10px] mt-1">Tap to change file</Text>
                    </View>
                  ) : (
                    <View className="items-center">
                      <View className="w-12 h-12 bg-[#FF6900]/10 rounded-2xl items-center justify-center mb-3">
                        <Upload size={24} color="#FF6900" />
                      </View>
                      <Text className="text-gray-900 dark:text-white font-bold text-sm">Select Receipt / Proof</Text>
                      <Text className="text-gray-400 text-[10px] mt-1">PNG, JPG or PDF (Max 5MB)</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Submit Button */}
                <TouchableOpacity
                  disabled={isUploading || !amount || !reference || !selectedFile}
                  onPress={async () => {
                    try {
                      setIsUploading(true);
                      
                      // 1. Upload to Supabase Storage
                      const fileExt = selectedFile.name.split('.').pop();
                      const fileName = `${Date.now()}.${fileExt}`;
                      const filePath = `${studentId}/${fileName}`;

                      // Fetch the file as a blob
                      const response = await fetch(selectedFile.uri);
                      const blob = await response.blob();

                      const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('payment_proofs')
                        .upload(filePath, blob, { contentType: selectedFile.mimeType });

                      if (uploadError) throw uploadError;

                      const { data: { publicUrl } } = supabase.storage
                        .from('payment_proofs')
                        .getPublicUrl(filePath);

                      // 2. Submit to Backend
                      await FinanceService.submitEvidence({
                        student_id: studentId,
                        fee_structure_id: selectedFeeId,
                        amount: parseFloat(amount),
                        payment_method: 'bank_transfer',
                        reference_number: reference,
                        proof_url: publicUrl,
                        notes: `M-PESA/Reference: ${reference}`
                      });

                      Alert.alert("Success", "Payment evidence submitted successfully for review.");
                      setShowUploadModal(false);
                      setAmount("");
                      setReference("");
                      setSelectedFile(null);
                      fetchFinanceData();
                    } catch (e: any) {
                      console.error(e);
                      Alert.alert("Upload Failed", e.message || "An error occurred while uploading.");
                    } finally {
                      setIsUploading(false);
                    }
                  }}
                  className={`mt-10 p-5 rounded-2xl items-center justify-center ${isUploading || !amount || !reference || !selectedFile ? 'bg-gray-200 dark:bg-gray-800' : 'bg-[#FF6900]'}`}
                >
                  {isUploading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-black text-base uppercase tracking-widest">Submit for Verification</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}