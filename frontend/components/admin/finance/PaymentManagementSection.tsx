import { EmptyState } from "@/components/common/EmptyState";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/libs/supabase";
import { Payment } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { Receipt } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import { FinanceService } from "@/services/FinanceService";
import { Check, X, ExternalLink, Clock } from "lucide-react-native";
import { BlurView } from "expo-blur";
import Toast from 'react-native-toast-message';


interface PaymentManagementSectionProps {
  payments: Payment[];
  loading: boolean;
  onPaymentSubmit: (payment: Omit<Payment, "id">) => void;
  onRefresh?: () => void;
}

type StudentOption = { id: string; user_id: string; full_name: string };

const PaymentManagementSection: React.FC<
  PaymentManagementSectionProps
> = ({ payments, loading, onPaymentSubmit, onRefresh }) => {
  const { isDark } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    student_id: "",
    student_name: "",
    amount: "",
    payment_method: "cash" as Payment["payment_method"],
    reference_number: "",
    notes: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'review'>('list');
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");


  // Student search in payment form
  const [studentSearch, setStudentSearch] = useState("");
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  useEffect(() => {
    if (viewMode === 'review') {
      fetchPendingPayments();
    }
  }, [viewMode]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, user_id, users(full_name)')
        .order('id');
      
      if (error) throw error;
      
      const mapped = (data || []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        full_name: s.users?.full_name || 'Unknown'
      }));
      setAllStudents(mapped);
    } catch (e) {
      console.error('Error fetching students:', e);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      setLoadingPending(true);
      const data = await FinanceService.getPendingPayments();
      setPendingPayments(data || []);
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch pending payments' });
    } finally {
      setLoadingPending(false);
    }
  };

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    try {
      setReviewingId(id);
      await FinanceService.confirmPaymentEvidence(id, action, adminNotes);
      Toast.show({ 
        type: 'success', 
        text1: 'Action Completed', 
        text2: `Payment ${action}d successfully` 
      });
      setAdminNotes("");
      fetchPendingPayments();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to process payment");
    } finally {
      setReviewingId(null);
    }
  };


  const filteredStudents = allStudents.filter(
    (s) =>
      s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const selectStudent = (student: StudentOption) => {
    setFormData({ ...formData, student_id: student.id, student_name: student.full_name });
    setStudentSearch("");
    setShowStudentDropdown(false);
  };

  const filteredPayments = payments.filter((p) =>
    p.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.student_display_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.reference_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      student_id: "",
      student_name: "",
      amount: "",
      payment_method: "cash" as Payment["payment_method"],
      reference_number: "",
      notes: "",
    });
    setStudentSearch("");
    setShowStudentDropdown(false);
  };

  const handleSubmit = () => {
    if (!formData.student_id || !formData.student_name || !formData.amount) {
      Alert.alert("Error", "Please fill in all required fields including Student");
      return;
    }

    const payment: Omit<Payment, "id"> = {
      amount: parseFloat(formData.amount),
      payment_date: new Date().toISOString(),
      status: "completed",
      student_id: formData.student_id,
      student_name: " ", // Set to empty string or fetch if available
      payment_method: formData.payment_method,
      reference_number: formData.reference_number,
      notes: formData.notes,
    };

    onPaymentSubmit(payment);
    resetForm();
    setShowForm(false);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  const getStatusColor = (status: Payment["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400";
      case "failed":
        return "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200";
    }
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <View
      className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-800"
      style={{ backgroundColor: isDark ? "#1a1a1a" : "#FFFFFF", borderColor: isDark ? "#333" : "#D0E8E6" }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View>
          <Text className="text-lg font-semibold text-black" style={{ color: isDark ? "#fff" : "#2C3E50" }}>
            {item.student_name}
          </Text>
          {item.student_display_id && (
            <Text className="text-xs text-[#FF6B00] font-medium">
              ID: {item.student_display_id}
            </Text>
          )}
        </View>
        <View
          className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}
          style={{
            backgroundColor:
              item.status === "completed"
                ? "#A1EBE5"
                : item.status === "pending"
                  ? "#F1FFF8"
                  : "#FFFFFF",
          }}
        >
          <Text
            className="text-xs font-medium capitalize"
            style={{
              color:
                item.status === "completed"
                  ? (isDark ? "#2DD4BF" : "#128C7E")
                  : item.status === "pending"
                    ? (isDark ? "#4FD1C5" : "#16A085")
                    : (isDark ? "#fff" : "#2C3E50"),
            }}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View className="space-y-1">
        <Text className="text-2xl font-bold mb-2" style={{ color: "#FF6B00" }}>
          {formatAmount(item.amount)}
        </Text>
        
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600 dark:text-gray-400">Method:</Text>
          <Text className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
            {item.payment_method ? item.payment_method.replace("_", " ") : ""}
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600 dark:text-gray-400">Date:</Text>
          <Text className="text-sm text-gray-900 dark:text-gray-200">
            {new Date(item.payment_date).toLocaleDateString()}
          </Text>
        </View>

        {item.reference_number && (
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600 dark:text-gray-400">Reference:</Text>
            <Text className="text-sm text-gray-900 dark:text-gray-200">
              {item.reference_number}
            </Text>
          </View>
        )}

        {item.notes && (
          <View className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
            <Text className="text-sm text-gray-700 dark:text-gray-300">{item.notes}</Text>
          </View>
        )}
      </View>
    </View>
  );
  return (
    <View className="flex-1 p-4 bg-white dark:bg-[#0F0B2E]">
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-2xl font-bold text-gray-800 dark:text-white">Finance</Text>
          <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Management Hub</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowForm(true)}
          className="bg-[#FF6B00] px-4 py-2.5 rounded-xl shadow-sm"
        >
          <Text className="text-white font-bold text-xs uppercase tracking-widest">Record Payment</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View className="flex-row bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-6">
        <TouchableOpacity 
          onPress={() => setViewMode('list')}
          className={`flex-1 py-3 rounded-xl items-center justify-center ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
        >
          <Text className={`text-xs font-bold uppercase tracking-widest ${viewMode === 'list' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setViewMode('review')}
          className={`flex-1 py-3 rounded-xl items-center justify-center flex-row ${viewMode === 'review' ? 'bg-white dark:bg-gray-700 shadow-sm' : ''}`}
        >
          <Text className={`text-xs font-bold uppercase tracking-widest ${viewMode === 'review' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>Review Proofs</Text>
          {pendingPayments.length > 0 && (
            <View className="bg-[#FF6B00] w-5 h-5 rounded-full items-center justify-center ml-2 border border-white dark:border-gray-900">
              <Text className="text-white text-[9px] font-black">{pendingPayments.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {viewMode === 'list' ? (
        <>
          {/* Search Bar */}
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 mb-6">
            <Ionicons name="search" size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
            <TextInput
              className="flex-1 ml-2 text-gray-900 dark:text-white font-medium"
              placeholder="Search by student name, ID or reference..."
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500 dark:text-gray-400">Loading payments...</Text>
        </View>
      ) : (
        <View className="pb-20">
          {filteredPayments.length > 0 ? (
            filteredPayments.map((item) => (
              <View key={item.id}>
                {renderPaymentItem({ item })}
              </View>
            ))
          ) : (
            <EmptyState
              title={searchQuery ? "No matching payments" : "No payments recorded"}
              message={searchQuery
                ? `We couldn't find any payments matching "${searchQuery}"`
                : "No payments have been recorded in the system yet."
              }
              icon={Receipt}
              color="#FF6B00"
              actionLabel={searchQuery ? "Clear Search" : "Record Payment"}
              onAction={() => searchQuery ? setSearchQuery("") : setShowForm(true)}
            />
          )}
        </View>
       )}
      </>
     ) : (
        <ScrollView className="pb-20">
          {loadingPending ? (
            <View className="py-20 items-center">
              <ActivityIndicator color="#FF6B00" />
              <Text className="text-gray-400 text-xs mt-4 font-bold uppercase tracking-widest">Scanning evidence bucket...</Text>
            </View>
          ) : pendingPayments.length === 0 ? (
            <EmptyState
              title="All caught up!"
              message="No pending payment evidence documents require review."
              icon={Clock}
              color="#FF6B00"
            />
          ) : (
            pendingPayments.map((item) => (
              <View 
                key={item.id} 
                className="bg-white dark:bg-gray-900 rounded-[32px] p-6 mb-6 border border-gray-100 dark:border-gray-800"
              >
                <View className="flex-row justify-between items-start mb-6">
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-black text-xl tracking-tighter">
                      {item.students?.users?.full_name || "Unknown Student"}
                    </Text>
                    <Text className="text-[#FF6B00] text-[10px] font-black uppercase tracking-widest mt-1">
                      {item.payment_method.replace('_', ' ')} • {item.reference_number}
                    </Text>
                  </View>
                  <View className="bg-orange-50 dark:bg-orange-950/30 px-3 py-1 rounded-full border border-orange-100 dark:border-orange-900">
                    <Text className="text-orange-700 dark:text-orange-400 text-[10px] font-black uppercase">Pending Approval</Text>
                  </View>
                </View>

                <View className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl mb-6">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-400 text-[10px] font-bold uppercase">Requested Credit</Text>
                    <Text className="text-gray-400 text-[10px] font-bold uppercase">Submitted On</Text>
                  </View>
                  <View className="flex-row justify-between items-end">
                    <Text className="text-gray-900 dark:text-white font-black text-3xl tracking-tighter">{formatAmount(item.amount)}</Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold mb-1">
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {item.proof_url && (
                  <TouchableOpacity 
                    onPress={() => {
                        // In a real app, open a viewer modal or handle external link
                        Alert.alert("Proof Document", "Review payment receipt carefully before approval.", [
                            { text: "Open URL", onPress: () => { /* Linking.openURL(item.proof_url) */ }},
                            { text: "Close", style: "cancel" }
                        ]);
                    }}
                    className="flex-row items-center justify-center bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl mb-6 border border-gray-200 dark:border-gray-700"
                  >
                    <ExternalLink size={16} color={isDark ? "#9CA3AF" : "#4B5563"} />
                    <Text className="ml-2 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase tracking-widest">View Attachment</Text>
                  </TouchableOpacity>
                )}

                <View className="flex-row gap-4">
                  <TouchableOpacity
                    disabled={!!reviewingId}
                    onPress={() => handleReview(item.id, 'reject')}
                    className="flex-1 bg-red-50 dark:bg-red-950/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/50 items-center flex-row justify-center"
                  >
                    <X size={18} color="#EF4444" />
                    <Text className="ml-2 text-red-600 dark:text-red-400 font-black text-[10px] uppercase tracking-widest">Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!!reviewingId}
                    onPress={() => handleReview(item.id, 'approve')}
                    className="flex-2 bg-[#10B981] p-4 rounded-2xl items-center flex-row justify-center shadow-lg shadow-emerald-500/20"
                  >
                    <Check size={18} color="white" />
                    <Text className="ml-2 text-white font-black text-[10px] uppercase tracking-widest">Approve & Credit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Payment Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white dark:bg-[#0F0B2E]">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
            <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
              <Text className="text-blue-600 dark:text-blue-400 text-lg">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">Record Payment</Text>
            <TouchableOpacity onPress={handleSubmit}>
              <Text className="text-sm border border-[#10B981] dark:border-green-500 px-3 py-2 rounded-full font-semibold text-[#10B981] dark:text-green-500">
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
            <View className="space-y-4">

              {/* Student Search */}
              <View style={{ zIndex: 10 }}>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Student *
                </Text>

                {/* Selected student display */}
                {formData.student_id ? (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: isDark ? '#1a2e1a' : '#f0fdf4',
                    borderWidth: 1, borderColor: isDark ? '#166534' : '#86efac',
                    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                  }}>
                    <View>
                      <Text style={{ fontWeight: '700', fontSize: 15, color: isDark ? '#bbf7d0' : '#166534' }}>
                        {formData.student_name}
                      </Text>
                      <Text style={{ fontSize: 11, color: isDark ? '#4ade80' : '#15803d', fontWeight: '600', marginTop: 2 }}>
                        {formData.student_id}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => {
                      setFormData({ ...formData, student_id: "", student_name: "" });
                      setShowStudentDropdown(true);
                    }}>
                      <Ionicons name="close-circle" size={22} color={isDark ? '#4ade80' : '#16a34a'} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <View style={{
                      flexDirection: 'row', alignItems: 'center',
                      borderWidth: 1, borderColor: isDark ? '#374151' : '#d1d5db',
                      borderRadius: 12, paddingHorizontal: 12, paddingVertical: 3,
                      backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                    }}>
                      <Ionicons name="search" size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
                      <TextInput
                        value={studentSearch}
                        onChangeText={(text) => {
                          setStudentSearch(text);
                          setShowStudentDropdown(true);
                        }}
                        onFocus={() => setShowStudentDropdown(true)}
                        placeholder="Search by name or ID..."
                        placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                        style={{
                          flex: 1, marginLeft: 8, fontSize: 15,
                          color: isDark ? '#fff' : '#111827',
                          paddingVertical: 10,
                        }}
                      />
                    </View>

                    {/* Dropdown results */}
                    {showStudentDropdown && (
                      <View style={{
                        marginTop: 4, borderWidth: 1,
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        borderRadius: 12, overflow: 'hidden',
                        backgroundColor: isDark ? '#13103A' : '#ffffff',
                        maxHeight: 200,
                      }}>
                        {filteredStudents.length === 0 ? (
                          <View style={{ padding: 16, alignItems: 'center' }}>
                            <Text style={{ color: isDark ? '#6B7280' : '#9CA3AF', fontSize: 13 }}>
                              {studentSearch ? 'No students found' : 'Type to search students...'}
                            </Text>
                          </View>
                        ) : (
                          <FlatList
                            data={filteredStudents.slice(0, 20)}
                            keyExtractor={(item) => item.id}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            style={{ maxHeight: 200 }}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                onPress={() => selectStudent(item)}
                                style={{
                                  flexDirection: 'row', alignItems: 'center',
                                  paddingHorizontal: 14, paddingVertical: 12,
                                  borderBottomWidth: 1,
                                  borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
                                }}
                              >
                                <View style={{
                                  width: 36, height: 36, borderRadius: 10,
                                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
                                  alignItems: 'center', justifyContent: 'center', marginRight: 12,
                                }}>
                                  <Ionicons name="person" size={16} color="#FF6B00" />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontWeight: '600', fontSize: 14, color: isDark ? '#f1f1f1' : '#111827' }}>
                                    {item.full_name}
                                  </Text>
                                  <Text style={{ fontSize: 11, color: '#FF6B00', fontWeight: '500', marginTop: 1 }}>
                                    {item.id}
                                  </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={isDark ? '#6B7280' : '#9CA3AF'} />
                              </TouchableOpacity>
                            )}
                          />
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (KES) *
                </Text>
                <TextInput
                  value={formData.amount}
                  onChangeText={(text) =>
                    setFormData({ ...formData, amount: text })
                  }
                  placeholder="0.00"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  keyboardType="numeric"
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a]"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </Text>
                <View className="border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#1a1a1a]">
                  <Picker
                    selectedValue={formData.payment_method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, payment_method: value })
                    }
                    dropdownIconColor={isDark ? "#fff" : "#000"}
                    style={{ color: isDark ? "#fff" : "#000" }}
                  >
                    <Picker.Item label="Please select a payment method" value="" color={isDark ? "#fff" : "#000"} />
                    <Picker.Item label="Cash" value="cash" color={isDark ? "#fff" : "#000"} />
                    <Picker.Item label="Bank" value="bank" color={isDark ? "#fff" : "#000"} />
                    <Picker.Item label="MPesa" value="mpesa" color={isDark ? "#fff" : "#000"} />
                    <Picker.Item label="Bank Transfer (Other)" value="bank_transfer" color={isDark ? "#fff" : "#000"} />
                    <Picker.Item label="Mobile Money (Other)" value="mobile_money" color={isDark ? "#fff" : "#000"} />
                    <Picker.Item label="Card" value="card" color={isDark ? "#fff" : "#000"} />
                  </Picker>
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reference Number
                </Text>
                <TextInput
                  value={formData.reference_number}
                  onChangeText={(text) =>
                    setFormData({ ...formData, reference_number: text })
                  }
                  placeholder="Transaction reference (optional)"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a]"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </Text>
                <TextInput
                  value={formData.notes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, notes: text })
                  }
                  placeholder="Additional notes (optional)"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  multiline
                  numberOfLines={3}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a]"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};


export { PaymentManagementSection };
export default PaymentManagementSection;
