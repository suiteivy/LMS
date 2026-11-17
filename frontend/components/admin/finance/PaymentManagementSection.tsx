import { ActionTooltip } from "@/components/common/ActionTooltip";
import { EmptyState } from "@/components/common/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { TableRowSkeleton } from "@/components/ui/skeletons";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/libs/supabase";
import { FinanceService } from "@/services/FinanceService";
import { Payment } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckSquare,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Receipt,
  RotateCcw,
  Search,
  Square,
  X,
} from "lucide-react-native";
import React, { useEffect, useState, useMemo } from "react";
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { InvoiceReceiptService } from "@/services/InvoiceReceiptService";

interface PaymentManagementSectionProps {
  payments?: Payment[];
  loading?: boolean;
  onPaymentSubmit?: (payment: Omit<Payment, "id">) => void | Promise<void>;
  onRefresh?: () => void;
}

type TabType = "needs_review" | "confirmed" | "flagged" | "all";

type StudentOption = { id: string; user_id: string; full_name: string; admission_number?: string };

export const PaymentManagementSection: React.FC<PaymentManagementSectionProps> = ({
  onPaymentSubmit,
  onRefresh,
}) => {
  const { isDark } = useTheme();
  const { formatAmount: formatMoney } = useCurrency();

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>("needs_review");
  const [inboxPayments, setInboxPayments] = useState<any[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethodFilter, setSelectedMethodFilter] = useState("all");

  // Multi-select for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkConfirmModalVisible, setBulkConfirmModalVisible] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Single Actions State
  const [confirmModalPayment, setConfirmModalPayment] = useState<any | null>(null);
  const [confirmedAmountInput, setConfirmedAmountInput] = useState("");
  const [confirmAdminNotes, setConfirmAdminNotes] = useState("");
  const [actionProcessing, setActionProcessing] = useState(false);

  const [flagModalPayment, setFlagModalPayment] = useState<any | null>(null);
  const [selectedFlagReasonId, setSelectedFlagReasonId] = useState("");
  const [flagAdminNotes, setFlagAdminNotes] = useState("");

  const [reverseModalPayment, setReverseModalPayment] = useState<any | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  // Dynamic Finance Settings
  const [dynamicMethods, setDynamicMethods] = useState<any[]>([]);
  const [dynamicFlagReasons, setDynamicFlagReasons] = useState<any[]>([]);

  // Manual Payment Recording Form
  const [showForm, setShowForm] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);
  const [formData, setFormData] = useState({
    student_id: "",
    student_name: "",
    amount: "",
    payment_method: "",
    reference_number: "",
    notes: "",
  });

  // Load Settings & Options
  useEffect(() => {
    loadSettings();
    fetchStudents();
  }, []);

  // Fetch inbox whenever tab or method filter changes
  useEffect(() => {
    fetchInbox();
    setSelectedIds([]);
  }, [activeTab, selectedMethodFilter]);

  const loadSettings = async () => {
    try {
      const res = await FinanceService.getFinanceSettings();
      if (res) {
        if (Array.isArray(res.payment_methods) && res.payment_methods.length > 0) {
          setDynamicMethods(res.payment_methods.filter((m: any) => m.is_active !== false));
          if (!formData.payment_method && res.payment_methods[0]) {
            setFormData((prev) => ({ ...prev, payment_method: res.payment_methods[0].code }));
          }
        }
        if (Array.isArray(res.flag_reasons) && res.flag_reasons.length > 0) {
          setDynamicFlagReasons(res.flag_reasons.filter((r: any) => r.is_active !== false));
          if (res.flag_reasons[0]) {
            setSelectedFlagReasonId(res.flag_reasons[0].id);
          }
        }
      }
    } catch (e) {
      console.warn("Could not load dynamic finance settings:", e);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("id, user_id, admission_number, users(full_name)")
        .order("id");
      if (error) throw error;
      const mapped = (data || []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        admission_number: s.admission_number,
        full_name: s.users?.full_name || "Unknown Student",
      }));
      setAllStudents(mapped);
    } catch (e) {
      console.error("Error fetching students:", e);
    }
  };

  const fetchInbox = async () => {
    try {
      setLoadingInbox(true);
      const res = await FinanceService.getPaymentsInbox({
        tab: activeTab,
        method: selectedMethodFilter !== "all" ? selectedMethodFilter : undefined,
      });

      setInboxPayments(res.data || []);
      setTotalCount(res.total || 0);

      // Also get review count for badge if not already on needs_review
      if (activeTab === "needs_review") {
        setNeedsReviewCount(res.total || (res.data || []).length);
      } else {
        const reviewCheck = await FinanceService.getPaymentsInbox({ tab: "needs_review", limit: 1 });
        setNeedsReviewCount(reviewCheck.total || 0);
      }
    } catch (e: any) {
      console.error("Fetch inbox error:", e);
      Toast.show({ type: "error", text1: "Error", text2: e?.message || "Failed to load payments inbox" });
    } finally {
      setLoadingInbox(false);
    }
  };

  // Filtered payments by search text
  const filteredPayments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return inboxPayments;
    return inboxPayments.filter((p) => {
      const studentName = p.student?.users?.full_name || p.student_name || "";
      const admNo = p.student?.admission_number || p.student_id || "";
      const ref = p.reference_number || "";
      const payer = p.payer_name || p.submitted_user?.full_name || "";
      const receiptNo = p.receipt_number || "";
      return (
        studentName.toLowerCase().includes(q) ||
        admNo.toLowerCase().includes(q) ||
        ref.toLowerCase().includes(q) ||
        payer.toLowerCase().includes(q) ||
        receiptNo.toLowerCase().includes(q)
      );
    });
  }, [inboxPayments, searchQuery]);

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPayments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPayments.map((p) => p.id));
    }
  };

  const toggleSelectPayment = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleBulkConfirm = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkProcessing(true);
      const res = await FinanceService.bulkConfirmPayments(selectedIds);
      Toast.show({
        type: "success",
        text1: "Bulk Confirmation Complete",
        text2: `Successfully confirmed ${res.confirmed_count || selectedIds.length} payments.`,
      });
      setSelectedIds([]);
      setBulkConfirmModalVisible(false);
      fetchInbox();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      Alert.alert("Bulk Confirm Error", e?.message || "Unable to complete bulk confirmation");
    } finally {
      setBulkProcessing(false);
    }
  };

  // Single Quick Confirm
  const openConfirmModal = (payment: any) => {
    setConfirmModalPayment(payment);
    setConfirmedAmountInput(String(payment.total_amount || payment.amount || 0));
    setConfirmAdminNotes("");
  };

  const submitSingleConfirm = async () => {
    if (!confirmModalPayment) return;
    try {
      setActionProcessing(true);
      const confirmedAmount = Number(confirmedAmountInput);
      await FinanceService.confirmPayment(confirmModalPayment.id, {
        confirmed_amount: !isNaN(confirmedAmount) && confirmedAmount > 0 ? confirmedAmount : undefined,
        admin_notes: confirmAdminNotes.trim() || undefined,
      });

      Toast.show({
        type: "success",
        text1: "Payment Confirmed",
        text2: `Payment of ${formatMoney(confirmedAmount || confirmModalPayment.amount)} marked as confirmed.`,
      });
      setConfirmModalPayment(null);
      fetchInbox();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      Alert.alert("Confirm Error", e?.message || "Failed to confirm payment");
    } finally {
      setActionProcessing(false);
    }
  };

  // Single Quick Flag
  const openFlagModal = (payment: any) => {
    setFlagModalPayment(payment);
    setFlagAdminNotes("");
    if (dynamicFlagReasons.length > 0 && !selectedFlagReasonId) {
      setSelectedFlagReasonId(dynamicFlagReasons[0].id);
    }
  };

  const submitSingleFlag = async () => {
    if (!flagModalPayment) return;
    try {
      setActionProcessing(true);
      const selectedReason = dynamicFlagReasons.find((r) => r.id === selectedFlagReasonId);
      await FinanceService.flagPayment(flagModalPayment.id, {
        reason_id: selectedFlagReasonId || undefined,
        reason_code: selectedReason?.code || "verification_failed",
        admin_notes: flagAdminNotes.trim() || undefined,
      });

      Toast.show({
        type: "info",
        text1: "Payment Flagged",
        text2: "Marked as not received / under query.",
      });
      setFlagModalPayment(null);
      fetchInbox();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      Alert.alert("Flag Error", e?.message || "Failed to flag payment");
    } finally {
      setActionProcessing(false);
    }
  };

  // Single Reversal
  const openReverseModal = (payment: any) => {
    setReverseModalPayment(payment);
    setReversalReason("");
  };

  const submitSingleReversal = async () => {
    if (!reverseModalPayment) return;
    if (!reversalReason.trim()) {
      Alert.alert("Reason Required", "Please provide a valid reason for canceling this confirmed payment.");
      return;
    }
    try {
      setActionProcessing(true);
      await FinanceService.reversePayment(reverseModalPayment.id, reversalReason.trim());
      Toast.show({
        type: "success",
        text1: "Payment Reversed",
        text2: "Ledger updated and official reversal recorded.",
      });
      setReverseModalPayment(null);
      fetchInbox();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      Alert.alert("Reversal Error", e?.message || "Failed to reverse payment");
    } finally {
      setActionProcessing(false);
    }
  };

  // Official Receipt Download
  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      setDownloadingReceiptId(paymentId);
      try {
        await InvoiceReceiptService.downloadPaymentReceiptPdf(paymentId);
        return;
      } catch (vectorErr) {
        console.warn("ReportLab vector receipt fallback to html:", vectorErr);
      }
      const html = await FinanceService.getAnyReceiptHtml(paymentId);
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
      } else if (Platform.OS === "web") {
        window.open(uri, "_blank", "noopener,noreferrer");
      } else {
        Alert.alert("Receipt Ready", `Receipt saved to: ${uri}`);
      }
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Receipt Error",
        text2: e?.message || "Unable to download receipt",
      });
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  // Manual Payment Submit
  const handleManualSubmit = async () => {
    const amountVal = Number(formData.amount);
    if (!formData.student_id || !formData.amount || isNaN(amountVal) || amountVal <= 0) {
      Alert.alert("Validation Error", "Please select a student and enter a valid positive amount.");
      return;
    }

    try {
      setSubmittingPayment(true);
      if (onPaymentSubmit) {
        await Promise.resolve(
          onPaymentSubmit({
            student_id: formData.student_id,
            student_name: formData.student_name,
            amount: amountVal,
            payment_date: new Date().toISOString(),
            status: "completed",
            payment_method: (formData.payment_method || "cash") as any,
            reference_number: formData.reference_number.trim(),
            notes: formData.notes.trim(),
          })
        );
      } else {
        // Direct API record
        await FinanceService.recordParentPayment({
          student_id: formData.student_id,
          total_amount: amountVal,
          payment_method: formData.payment_method || "cash",
          reference_number: formData.reference_number.trim(),
        });
      }

      Toast.show({
        type: "success",
        text1: "Payment Recorded",
        text2: `Successfully recorded payment for ${formData.student_name}`,
      });
      setShowForm(false);
      setFormData({
        student_id: "",
        student_name: "",
        amount: "",
        payment_method: dynamicMethods[0]?.code || "cash",
        reference_number: "",
        notes: "",
      });
      fetchInbox();
      if (onRefresh) onRefresh();
    } catch (e: any) {
      Alert.alert("Submission Error", e?.message || "Could not record payment.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // CSV Export
  const exportPaymentsCsv = async () => {
    try {
      const headers = [
        "Payment ID",
        "Student Name",
        "Admission ID",
        "Amount",
        "Method",
        "Reference",
        "Status",
        "Payer Name",
        "Created At",
      ];
      const rows = filteredPayments.map((p) => [
        p.id,
        p.student?.users?.full_name || p.student_name || "N/A",
        p.student?.admission_number || p.student_id || "N/A",
        p.total_amount || p.amount || 0,
        p.payment_method || "N/A",
        p.reference_number || "",
        p.status || "N/A",
        p.payer_name || p.submitted_user?.full_name || "",
        p.created_at || "",
      ]);

      const csvContent = [headers, ...rows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const filename = `payments_inbox_${new Date().toISOString().slice(0, 10)}.csv`;

      if (Platform.OS === "web") {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const csvFile = new File(Paths.cache, filename);
        if (!csvFile.exists) csvFile.create({ overwrite: true });
        csvFile.write(csvContent);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(csvFile.uri, {
            mimeType: "text/csv",
            UTI: "public.comma-separated-values-text",
          });
        } else {
          Alert.alert("Export Ready", `CSV saved to: ${csvFile.uri}`);
        }
      }
      Toast.show({ type: "success", text1: "Export complete", text2: "Inbox CSV generated." });
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Export failed", text2: e?.message });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
      case "completed":
        return { label: "Confirmed", bg: isDark ? "#064E3B" : "#D1FAE5", text: "#10B981" };
      case "submitted":
      case "under_review":
      case "pending":
        return { label: "Needs Review", bg: isDark ? "#78350F" : "#FEF3C7", text: "#F59E0B" };
      case "flagged":
      case "failed":
        return { label: "Flagged", bg: isDark ? "#7F1D1D" : "#FEE2E2", text: "#EF4444" };
      case "reversed":
        return { label: "Reversed", bg: isDark ? "#374151" : "#E5E7EB", text: "#6B7280" };
      default:
        return { label: status, bg: isDark ? "#1F2937" : "#F3F4F6", text: "#9CA3AF" };
    }
  };

  return (
    <View className="flex-1 p-4 bg-[#FFFFFF] dark:bg-[#161B22]">
      {/* Header Bar */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-2xl font-bold text-gray-800 dark:text-white">Finance</Text>
          <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
            Payments Inbox & Verification
          </Text>
        </View>
        <View className="flex-row" style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={exportPaymentsCsv}
            className="bg-[#0F766E] px-4 py-2.5 rounded-xl flex-row items-center"
          >
            <FileText size={14} color="#FFF" />
            <Text className="text-white font-bold text-[11px] uppercase tracking-widest ml-1.5">Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowForm(true)}
            className="bg-[#FF6900] px-4 py-2.5 rounded-xl flex-row items-center"
          >
            <Text className="text-white font-bold text-sm uppercase tracking-widest">+ Record Payment</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4 Tabs: Needs Review, Confirmed, Flagged, All */}
      <View className="flex-row bg-[#EAEEF2] dark:bg-[#0F141C] p-1 rounded-xl mb-4 border border-[#D0D7DE] dark:border-[#21262D]">
        {[
          { key: "needs_review" as const, label: "Needs review", badge: needsReviewCount },
          { key: "confirmed" as const, label: "Confirmed", badge: 0 },
          { key: "flagged" as const, label: "Flagged", badge: 0 },
          { key: "all" as const, label: "All", badge: 0 },
        ].map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 rounded-lg items-center justify-center flex-row ${
                isSelected ? "bg-white dark:bg-[#21262D] shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-xs font-bold uppercase tracking-wider ${
                  isSelected ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {tab.label}
              </Text>
              {tab.badge && tab.badge > 0 ? (
                <View className="bg-[#FF6900] px-1.5 py-0.5 rounded-full ml-1.5 items-center justify-center">
                  <Text className="text-white text-[10px] font-black">{tab.badge}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search & Method Filter Bar */}
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 flex-row items-center bg-[#EAEEF2] dark:bg-[#0F141C] rounded-xl px-4 py-2.5 border border-[#D0D7DE] dark:border-[#21262D]">
          <Search size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
          <TextInput
            className="flex-1 ml-2 text-gray-900 dark:text-white font-medium"
            placeholder="Search student, adm #, reference, receipt..."
            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
            </TouchableOpacity>
          ) : null}
        </View>

        {dynamicMethods.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, alignItems: "center" }}
          >
            <TouchableOpacity
              onPress={() => setSelectedMethodFilter("all")}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor:
                  selectedMethodFilter === "all"
                    ? "#FF6900"
                    : isDark
                    ? "#0F141C"
                    : "#EAEEF2",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: selectedMethodFilter === "all" ? "#FFF" : isDark ? "#9CA3AF" : "#4B5563",
                }}
              >
                All Methods
              </Text>
            </TouchableOpacity>
            {dynamicMethods.map((m) => {
              const active = selectedMethodFilter === m.code;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setSelectedMethodFilter(m.code)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: active ? "#FF6900" : isDark ? "#0F141C" : "#EAEEF2",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: active ? "#FFF" : isDark ? "#9CA3AF" : "#4B5563",
                    }}
                  >
                    {m.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Bulk Selection Bar (for Needs Review tab) */}
      {activeTab === "needs_review" && filteredPayments.length > 0 && (
        <View className="flex-row items-center justify-between bg-orange-50 dark:bg-orange-950/30 px-4 py-3 rounded-xl mb-4 border border-orange-200 dark:border-orange-900/50">
          <TouchableOpacity onPress={toggleSelectAll} className="flex-row items-center">
            {selectedIds.length === filteredPayments.length ? (
              <CheckSquare size={18} color="#FF6900" />
            ) : (
              <Square size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
            )}
            <Text className="ml-2 font-bold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              {selectedIds.length === filteredPayments.length ? "Deselect All" : "Select All"} ({filteredPayments.length})
            </Text>
          </TouchableOpacity>

          {selectedIds.length > 0 && (
            <TouchableOpacity
              onPress={() => setBulkConfirmModalVisible(true)}
              className="bg-[#10B981] px-4 py-2 rounded-lg flex-row items-center shadow-sm"
            >
              <Check size={16} color="#FFF" />
              <Text className="text-white font-bold text-xs ml-1.5 uppercase tracking-wider">
                Confirm Selected ({selectedIds.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Payments List */}
      {loadingInbox ? (
        <View className="pb-20">
          <TableRowSkeleton loading={loadingInbox} columns={5} count={6} label="Loading payments..." />
        </View>
      ) : filteredPayments.length === 0 ? (
        <EmptyState
          title={searchQuery ? "No matching payments" : "No payments in this tab"}
          message={
            searchQuery
              ? `No transactions match "${searchQuery}"`
              : activeTab === "needs_review"
              ? "All caught up! No submissions require review right now."
              : "No payments recorded in this status."
          }
          icon={Receipt}
          color="#FF6900"
          actionLabel={searchQuery ? "Clear Search" : undefined}
          onAction={searchQuery ? () => setSearchQuery("") : undefined}
        />
      ) : (
        <ScrollView className="pb-24" showsVerticalScrollIndicator={false}>
          {filteredPayments.map((item) => {
            const statusBadge = getStatusBadge(item.status);
            const isSelected = selectedIds.includes(item.id);
            const proofUrl =
              item.signed_proofs?.[0]?.signed_url ||
              item.payment_proofs?.[0]?.file_url ||
              item.proof_url;
            const amount = item.total_amount || item.amount || 0;
            const studentName = item.student?.users?.full_name || item.student_name || "Unknown Student";
            const admNumber = item.student?.admission_number || item.student_display_id || (item.student_id && !item.student_id.startsWith('s') && !item.student_id.startsWith('STU') ? item.student_id : "—");
            const isPending = ["submitted", "under_review", "pending"].includes(item.status);
            const isConfirmed = ["confirmed", "completed"].includes(item.status);
            const isFlagged = ["flagged", "failed"].includes(item.status);

            return (
              <View
                key={item.id}
                className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-2xl p-4 mb-3 border border-[#D0D7DE] dark:border-[#21262D]"
              >
                {/* Header Row */}
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center flex-1">
                    {activeTab === "needs_review" && (
                      <TouchableOpacity
                        onPress={() => toggleSelectPayment(item.id)}
                        className="mr-3 p-1"
                      >
                        {isSelected ? (
                          <CheckSquare size={20} color="#FF6900" />
                        ) : (
                          <Square size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
                        )}
                      </TouchableOpacity>
                    )}
                    <View className="flex-1">
                      <Text className="text-base font-bold text-gray-900 dark:text-white">
                        {studentName}
                      </Text>
                      <Text className="text-xs text-[#FF6900] font-semibold">
                        Adm: {admNumber}
                      </Text>
                    </View>
                  </View>

                  <View
                    className="px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: statusBadge.bg }}
                  >
                    <Text
                      className="text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: statusBadge.text }}
                    >
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Amount & Method Banner */}
                <View className="flex-row justify-between items-baseline mb-3">
                  <Text className="text-2xl font-black text-[#FF6900]">
                    {formatMoney(amount)}
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                      {item.payment_method?.replace(/_/g, " ")}
                    </Text>
                    {item.reference_number ? (
                      <Text className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-mono">
                        Ref: {item.reference_number}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Allocations Breakdown (if split or itemized) */}
                {Array.isArray(item.payment_allocations) && item.payment_allocations.length > 0 && (
                  <View className="bg-white dark:bg-[#0F141C] p-2.5 rounded-xl mb-3 border border-[#D0D7DE] dark:border-[#21262D]">
                    <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Fee Item Allocations ({item.payment_allocations.length})
                    </Text>
                    {item.payment_allocations.map((alloc: any, idx: number) => (
                      <View key={idx} className="flex-row justify-between py-0.5">
                        <Text className="text-xs text-gray-700 dark:text-gray-300">
                          {alloc.fee_types?.name || "Tuition / General Fee"}
                        </Text>
                        <Text className="text-xs font-semibold text-gray-900 dark:text-white">
                          {formatMoney(alloc.allocated_amount || alloc.amount || 0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Flags / Reason notes */}
                {isFlagged && item.payment_flags?.[0] && (
                  <View className="bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl mb-3 border border-red-200 dark:border-red-900/50">
                    <View className="flex-row items-center mb-1">
                      <AlertTriangle size={14} color="#EF4444" />
                      <Text className="text-xs font-bold text-red-600 dark:text-red-400 ml-1.5">
                        Flag Reason: {item.payment_flags[0].flag_reasons?.label || item.payment_flags[0].reason_code}
                      </Text>
                    </View>
                    {item.payment_flags[0].admin_notes ? (
                      <Text className="text-xs text-red-700 dark:text-red-300">
                        "{item.payment_flags[0].admin_notes}"
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Meta details */}
                <View className="flex-row justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                  <Text className="text-[11px] text-gray-500">
                    Submitted: {new Date(item.payment_date || item.created_at).toLocaleDateString()}
                  </Text>
                  {item.payer_name ? (
                    <Text className="text-[11px] text-gray-500">
                      Payer: {item.payer_name}
                    </Text>
                  ) : null}
                </View>

                {/* Action Buttons Row */}
                <View className="flex-row items-center gap-2 pt-2 border-t border-[#D0D7DE] dark:border-[#21262D]">
                  {/* View Proof Button */}
                  {proofUrl && (
                    <TouchableOpacity
                      onPress={() => setProofModalUrl(proofUrl)}
                      className="flex-1 bg-[#EAEEF2] dark:bg-[#0F141C] py-2.5 rounded-xl items-center justify-center flex-row border border-[#D0D7DE] dark:border-[#21262D]"
                    >
                      <Eye size={14} color={isDark ? "#FFF" : "#374151"} />
                      <Text className="text-xs font-bold text-gray-800 dark:text-gray-200 ml-1.5">
                        View Proof
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Actions for Pending/Needs Review */}
                  {isPending && (
                    <>
                      <TouchableOpacity
                        onPress={() => openFlagModal(item)}
                        className="flex-1 bg-red-50 dark:bg-red-950/20 py-2.5 rounded-xl items-center justify-center flex-row border border-red-200 dark:border-red-900/50"
                      >
                        <X size={14} color="#EF4444" />
                        <Text className="text-xs font-bold text-red-600 dark:text-red-400 ml-1.5 uppercase">
                          Flag
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => openConfirmModal(item)}
                        className="flex-1 bg-[#10B981] py-2.5 rounded-xl items-center justify-center flex-row shadow-sm"
                      >
                        <Check size={14} color="#FFF" />
                        <Text className="text-xs font-bold text-white ml-1.5 uppercase">
                          Confirm
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Actions for Confirmed: Receipt & Reversal */}
                  {isConfirmed && (
                    <>
                      <TouchableOpacity
                        onPress={() => handleDownloadReceipt(item.id)}
                        disabled={downloadingReceiptId === item.id}
                        className="flex-1 bg-[#EAEEF2] dark:bg-[#0F141C] py-2.5 rounded-xl items-center justify-center flex-row border border-[#D0D7DE] dark:border-[#21262D]"
                      >
                        {downloadingReceiptId === item.id ? (
                          <Spinner size="small" />
                        ) : (
                          <>
                            <Receipt size={14} color={isDark ? "#FFF" : "#374151"} />
                            <Text className="text-xs font-bold text-gray-800 dark:text-gray-200 ml-1.5">
                              Receipt PDF
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => openReverseModal(item)}
                        className="flex-1 bg-amber-50 dark:bg-amber-950/20 py-2.5 rounded-xl items-center justify-center flex-row border border-amber-200 dark:border-amber-900/50"
                      >
                        <RotateCcw size={14} color="#D97706" />
                        <Text className="text-xs font-bold text-amber-600 dark:text-amber-400 ml-1.5 uppercase">
                          Reverse
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* CONFIRM PAYMENT MODAL */}
      <Modal visible={!!confirmModalPayment} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="w-full max-w-lg bg-white dark:bg-[#161B22] rounded-3xl p-6 border border-[#D0D7DE] dark:border-[#21262D]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Confirm Payment
              </Text>
              <TouchableOpacity onPress={() => setConfirmModalPayment(null)}>
                <X size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>

            {confirmModalPayment && (
              <View className="mb-4">
                <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Student:{" "}
                  <Text className="font-bold text-gray-900 dark:text-white">
                    {confirmModalPayment.student?.users?.full_name || confirmModalPayment.student_name}
                  </Text>
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Method:{" "}
                  <Text className="font-bold text-gray-900 dark:text-white uppercase">
                    {confirmModalPayment.payment_method}
                  </Text>
                </Text>
                {confirmModalPayment.reference_number ? (
                  <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Reference:{" "}
                    <Text className="font-bold font-mono text-gray-900 dark:text-white">
                      {confirmModalPayment.reference_number}
                    </Text>
                  </Text>
                ) : null}

                <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Confirmed Amount ({formatMoney(0).replace(/\d|\.|\,/g, "").trim()})
                </Text>
                <TextInput
                  value={confirmedAmountInput}
                  onChangeText={setConfirmedAmountInput}
                  keyboardType="numeric"
                  className="bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-lg font-bold text-gray-900 dark:text-white mb-3"
                />

                <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Admin Verification Notes (Optional)
                </Text>
                <TextInput
                  value={confirmAdminNotes}
                  onChangeText={setConfirmAdminNotes}
                  placeholder="e.g. Verified against bank statement"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  className="bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white mb-4"
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setConfirmModalPayment(null)}
                className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 items-center"
              >
                <Text className="font-bold text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitSingleConfirm}
                disabled={actionProcessing}
                className="flex-1 py-3 rounded-xl bg-[#10B981] items-center flex-row justify-center"
              >
                {actionProcessing ? (
                  <Spinner color="#FFF" size="small" />
                ) : (
                  <Text className="font-bold text-white uppercase tracking-wider">Confirm Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FLAG PAYMENT MODAL */}
      <Modal visible={!!flagModalPayment} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="w-full max-w-lg bg-white dark:bg-[#161B22] rounded-3xl p-6 border border-[#D0D7DE] dark:border-[#21262D]">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <AlertCircle size={22} color="#EF4444" />
                <Text className="text-xl font-bold text-gray-900 dark:text-white ml-2">
                  Flag Payment
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFlagModalPayment(null)}>
                <X size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-500 mb-3">
              Mark this payment as not received or requiring correction from the parent.
            </Text>

            {dynamicFlagReasons.length > 0 && (
              <View className="mb-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Select Reason *
                </Text>
                <ScrollView style={{ maxHeight: 160 }}>
                  {dynamicFlagReasons.map((r) => {
                    const isSelected = selectedFlagReasonId === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => setSelectedFlagReasonId(r.id)}
                        className={`p-3 rounded-xl mb-1.5 flex-row items-center justify-between border ${
                          isSelected
                            ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800"
                            : "bg-[#F6F8FA] dark:bg-[#0F141C] border-[#D0D7DE] dark:border-[#21262D]"
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            isSelected ? "text-red-700 dark:text-red-400" : "text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {r.label}
                        </Text>
                        {isSelected && <Check size={16} color="#EF4444" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Instructions for Parent (Optional)
            </Text>
            <TextInput
              value={flagAdminNotes}
              onChangeText={setFlagAdminNotes}
              placeholder="e.g. Reference code ST-1234 could not be matched. Please re-upload legible slip."
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              className="bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white mb-4"
              multiline
              numberOfLines={3}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setFlagModalPayment(null)}
                className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 items-center"
              >
                <Text className="font-bold text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitSingleFlag}
                disabled={actionProcessing}
                className="flex-1 py-3 rounded-xl bg-[#EF4444] items-center flex-row justify-center"
              >
                {actionProcessing ? (
                  <Spinner color="#FFF" size="small" />
                ) : (
                  <Text className="font-bold text-white uppercase tracking-wider">Flag Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* REVERSE PAYMENT MODAL */}
      <Modal visible={!!reverseModalPayment} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="w-full max-w-lg bg-white dark:bg-[#161B22] rounded-3xl p-6 border border-[#D0D7DE] dark:border-[#21262D]">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <RotateCcw size={22} color="#D97706" />
                <Text className="text-xl font-bold text-gray-900 dark:text-white ml-2">
                  Reverse Confirmed Payment
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReverseModalPayment(null)}>
                <X size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-gray-500 mb-3">
              This will create a negative ledger adjustment reversing the credit on the student bill. An audit trail is permanently maintained.
            </Text>

            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Reversal Reason * (Mandatory)
            </Text>
            <TextInput
              value={reversalReason}
              onChangeText={setReversalReason}
              placeholder="e.g. Bank chargeback / Cheque returned unpaid / Entry error"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              className="bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white mb-4"
              multiline
              numberOfLines={3}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setReverseModalPayment(null)}
                className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 items-center"
              >
                <Text className="font-bold text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitSingleReversal}
                disabled={actionProcessing}
                className="flex-1 py-3 rounded-xl bg-[#D97706] items-center flex-row justify-center"
              >
                {actionProcessing ? (
                  <Spinner color="#FFF" size="small" />
                ) : (
                  <Text className="font-bold text-white uppercase tracking-wider">Execute Reversal</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BULK CONFIRM CONFIRMATION MODAL */}
      <Modal visible={bulkConfirmModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="w-full max-w-md bg-white dark:bg-[#161B22] rounded-3xl p-6 border border-[#D0D7DE] dark:border-[#21262D]">
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Confirm {selectedIds.length} Payments?
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              All {selectedIds.length} selected submissions will be marked as Confirmed, official receipts will be issued, and the student ledger accounts updated.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setBulkConfirmModalVisible(false)}
                className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 items-center"
              >
                <Text className="font-bold text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleBulkConfirm}
                disabled={bulkProcessing}
                className="flex-1 py-3 rounded-xl bg-[#10B981] items-center flex-row justify-center"
              >
                {bulkProcessing ? (
                  <Spinner color="#FFF" size="small" />
                ) : (
                  <Text className="font-bold text-white uppercase tracking-wider">Yes, Confirm All</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PROOF PREVIEW MODAL */}
      <Modal visible={!!proofModalUrl} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-4">
          <View className="w-full max-w-xl bg-white dark:bg-[#161B22] rounded-3xl p-5 border border-[#D0D7DE] dark:border-[#21262D]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                Payment Proof Attachment
              </Text>
              <TouchableOpacity onPress={() => setProofModalUrl(null)}>
                <X size={22} color={isDark ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>

            {proofModalUrl ? (
              <View className="items-center mb-4">
                <Image
                  source={{ uri: proofModalUrl }}
                  style={{ width: "100%", height: 350, borderRadius: 16 }}
                  resizeMode="contain"
                />
              </View>
            ) : null}

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  if (proofModalUrl) Linking.openURL(proofModalUrl);
                }}
                className="flex-1 py-3 rounded-xl bg-[#EAEEF2] dark:bg-[#0F141C] border border-[#D0D7DE] dark:border-[#21262D] items-center flex-row justify-center"
              >
                <ExternalLink size={16} color={isDark ? "#FFF" : "#374151"} />
                <Text className="text-xs font-bold text-gray-800 dark:text-gray-200 ml-2">Open Fullscreen / Link</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setProofModalUrl(null)}
                className="py-3 px-6 rounded-xl bg-gray-200 dark:bg-gray-800 items-center"
              >
                <Text className="font-bold text-gray-700 dark:text-gray-300">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MANUAL RECORD PAYMENT MODAL */}
      <Modal visible={showForm} transparent animationType="fade">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="w-full max-w-lg bg-white dark:bg-[#161B22] rounded-3xl p-6 border border-[#D0D7DE] dark:border-[#21262D]">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  Record Student Payment
                </Text>
                <TouchableOpacity onPress={() => setShowForm(false)}>
                  <X size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
                </TouchableOpacity>
              </View>

              <ScrollView className="max-h-[75vh]" showsVerticalScrollIndicator={false}>
                {/* Student Search */}
                <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Student *
                </Text>
                {formData.student_id ? (
                  <View className="flex-row items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 mb-3">
                    <View>
                      <Text className="font-bold text-emerald-800 dark:text-emerald-300">
                        {formData.student_name}
                      </Text>
                      <Text className="text-xs text-emerald-600 dark:text-emerald-400">
                        {formData.student_id}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setFormData({ ...formData, student_id: "", student_name: "" })}
                    >
                      <X size={18} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="mb-3">
                    <View className="flex-row items-center bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]">
                      <Search size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                      <TextInput
                        value={studentSearch}
                        onChangeText={(t) => {
                          setStudentSearch(t);
                          setShowStudentDropdown(true);
                        }}
                        onFocus={() => setShowStudentDropdown(true)}
                        placeholder="Search student by name or adm #..."
                        placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                        className="flex-1 ml-2 text-sm text-gray-900 dark:text-white"
                      />
                    </View>
                    {showStudentDropdown && (
                      <View className="max-h-40 bg-[#F6F8FA] dark:bg-[#0F141C] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl mt-1 overflow-hidden">
                        <FlatList
                          data={allStudents
                            .filter(
                              (s) =>
                                s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                s.id.toLowerCase().includes(studentSearch.toLowerCase())
                            )
                            .slice(0, 15)}
                          keyExtractor={(s) => s.id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              onPress={() => {
                                setFormData({
                                  ...formData,
                                  student_id: item.id,
                                  student_name: item.full_name,
                                });
                                setShowStudentDropdown(false);
                                setStudentSearch("");
                              }}
                              className="p-3 border-b border-gray-100 dark:border-gray-800"
                            >
                              <Text className="font-semibold text-gray-900 dark:text-white text-sm">
                                {item.full_name}
                              </Text>
                              <Text className="text-xs text-[#FF6900]">{item.id}</Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    )}
                  </View>
                )}

                {/* Amount */}
                <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Amount *
                </Text>
                <TextInput
                  value={formData.amount}
                  onChangeText={(t) => setFormData({ ...formData, amount: t.replace(/[^0-9.]/g, "") })}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  className="bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-lg font-bold text-gray-900 dark:text-white mb-3"
                />

                {/* Dynamic Payment Method Picker */}
                <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Payment Method
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" style={{ gap: 8 }}>
                  {dynamicMethods.map((m) => {
                    const isSelected = formData.payment_method === m.code;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => setFormData({ ...formData, payment_method: m.code })}
                        className={`px-4 py-2.5 rounded-xl border ${
                          isSelected
                            ? "bg-[#FF6900] border-[#FF6900]"
                            : "bg-[#F6F8FA] dark:bg-[#0F141C] border-[#D0D7DE] dark:border-[#21262D]"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? "text-white" : "text-gray-800 dark:text-gray-200"
                          }`}
                        >
                          {m.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Reference Number */}
                <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Reference Code / Slip #
                </Text>
                <TextInput
                  value={formData.reference_number}
                  onChangeText={(t) => setFormData({ ...formData, reference_number: t })}
                  placeholder="e.g. QX9100293 or Slip 4492"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  className="bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white mb-3 font-mono"
                />

                {/* Notes */}
                <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Notes (Optional)
                </Text>
                <TextInput
                  value={formData.notes}
                  onChangeText={(t) => setFormData({ ...formData, notes: t })}
                  placeholder="Additional remarks"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  className="bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white mb-4"
                  multiline
                  numberOfLines={2}
                />
              </ScrollView>

              <View className="flex-row gap-3 pt-3 border-t border-[#D0D7DE] dark:border-[#21262D]">
                <TouchableOpacity
                  onPress={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 items-center"
                >
                  <Text className="font-bold text-gray-700 dark:text-gray-300">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleManualSubmit}
                  disabled={submittingPayment}
                  className="flex-1 py-3 rounded-xl bg-[#10B981] items-center flex-row justify-center"
                >
                  {submittingPayment ? (
                    <Spinner color="#FFF" size="small" />
                  ) : (
                    <Text className="font-bold text-white uppercase tracking-wider">Save & Record</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default PaymentManagementSection;