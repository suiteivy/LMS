import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { useParentStudentContext } from "@/hooks/useParentStudentContext";
import { ParentService } from "@/services/ParentService";
import { FinanceService } from "@/services/FinanceService";
import { formatClassLabel } from "@/utils/classLabel";
import { setParentSelectedChild } from "@/utils/parentSelectedChild";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowDownLeft, Download, Eye, FileText, Plus, Receipt, Wallet, AlertCircle, CheckCircle } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PdfPreviewModal } from "@/components/pdf/PdfPreviewModal";
import { InvoiceReceiptService, StudentFeeInvoice } from "@/services/InvoiceReceiptService";
import { RecordPaymentModal } from "@/components/parent/finance/RecordPaymentModal";
import { ChooseOptionalFeesModal } from "@/components/parent/finance/ChooseOptionalFeesModal";

type LinkedStudent = {
  id: string;
  class_id?: string | null;
  class_name?: string | null;
  grade_level?: string | number | null;
  form_level?: string | number | null;
  admission_number?: string;
  users?: {
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
};

function displayStudentName(student?: LinkedStudent | null) {
  if (!student) return "Student";
  const user = student.users || {};
  if (user.full_name) return user.full_name;
  const joined = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return joined || "Student";
}

function displayClassLabel(student?: LinkedStudent | null) {
  if (!student) return "Unassigned";
  if (student.class_name) return student.class_name;
  const fallback = formatClassLabel({
    grade_level: student.grade_level,
    form_level: student.form_level,
  });
  return fallback || "Unassigned";
}

export default function ParentFinancePage() {
  const params = useLocalSearchParams<{ studentId?: string; studentName?: string; classId?: string }>();
  const context = useParentStudentContext(params as any, { persistWhenParamPresent: false });

  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null);
  const [familyOverview, setFamilyOverview] = useState<any | null>(null);
  const [parentSubmissions, setParentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showOptionalModal, setShowOptionalModal] = useState(false);
  const [previewPayload, setPreviewPayload] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handlePreviewFeeStructure = () => {
    if (!selectedStudent?.id) return;
    setPreviewPayload({
      documentType: 'fee_structure',
      title: `${selectedName} — Fee Structure`,
      fileName: `fee-structure-${selectedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`,
      data: {
        student_id: selectedStudent.id,
      },
    });
  };

  const handlePreviewAccountStatement = () => {
    if (!selectedStudent?.id) return;
    setPreviewPayload({
      documentType: 'account_statement',
      title: `${selectedName} — Statement of Account`,
      fileName: `account-statement-${selectedName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`,
      data: {
        student_id: selectedStudent.id,
      },
    });
  };

  const { formatAmount } = useCurrency();
  const { isDark } = useTheme();
  const tier = useSubscriptionTier();

  const selectedName = useMemo(() => displayStudentName(selectedStudent), [selectedStudent]);
  const selectedClassLabel = useMemo(() => displayClassLabel(selectedStudent), [selectedStudent]);

  // Current child's summary from family overview
  const currentChildSummary = useMemo(() => {
    if (!familyOverview?.children || !selectedStudent?.id) return null;
    return familyOverview.children.find((c: any) => c.student_id === selectedStudent.id) || null;
  }, [familyOverview, selectedStudent?.id]);

  const outstandingBalance = currentChildSummary ? Number(currentChildSummary.balance_due || 0) : 0;
  const totalBilled = currentChildSummary ? Number(currentChildSummary.total_billed || 0) : 0;
  const totalPaid = currentChildSummary ? Number(currentChildSummary.total_paid || 0) : 0;
  const pendingAmount = currentChildSummary ? Number(currentChildSummary.pending_amount || 0) : 0;
  const creditAmount = currentChildSummary ? Number(currentChildSummary.credit_amount || 0) : 0;

  const paidPercentage = totalBilled > 0 ? Math.min(100, Math.round((totalPaid / totalBilled) * 100)) : 0;

  const handleDownloadOfficialReceipt = async (receiptId: string, receiptNumber: string) => {
    try {
      setActionLoadingId(`rcp-prev-${receiptId}`);
      const res = await FinanceService.getOfficialReceiptBase64(receiptId);
      setPreviewPayload({
        documentType: 'payment_receipt',
        data: {},
        title: `Official Receipt ${receiptNumber}`,
        fileName: res.filename,
        pdfBase64: res.base64,
      });
    } catch (err: any) {
      console.error('Receipt preview error:', err);
      Alert.alert('Preview Error', err?.response?.data?.error || 'Failed to preview official receipt PDF.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [students, overview, history] = await Promise.all([
        ParentService.getLinkedStudents(),
        FinanceService.getParentOverview().catch(() => null),
        FinanceService.getParentPaymentHistory().catch(() => [])
      ]);

      const validStudents = students || [];
      setLinkedStudents(validStudents);
      setFamilyOverview(overview);
      setParentSubmissions(history || []);

      if (validStudents.length > 0 && !selectedStudent) {
        const matched = context.studentId
          ? validStudents.find((s: LinkedStudent) => s.id === context.studentId)
          : validStudents[0];
        const initial = matched || validStudents[0];
        setSelectedStudent(initial);
        await setParentSelectedChild({
          studentId: initial.id,
          studentName: displayStudentName(initial),
          classId: initial.class_id || "",
        });
      }
    } catch (error) {
      console.error("Error loading parent finance:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  useEffect(() => {
    if (!context.ready) return;
    loadData();
  }, [context.ready, context.studentId]);

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-4 md:p-8">
        <ListItemSkeleton loading={loading} count={4} label="Loading finance records..." />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
      <UnifiedHeader
        title="Finance"
        subtitle={selectedName === "Student" ? "Student Financials" : `${selectedName}'s Financials`}
        role="Parent/Guardian"
        onBack={() => router.back()}
        rightActions={
          <TouchableOpacity
            onPress={() => setShowRecordModal(true)}
            className="bg-[#FF6900] px-3.5 py-2 rounded-2xl flex-row items-center gap-1 shadow-sm"
          >
            <Plus size={15} color="white" />
            <Text className="text-white text-xs font-black">Record Payment</Text>
          </TouchableOpacity>
        }
      />

      <SubscriptionGate
        feature="finance"
        fallback={
          <View className="flex-1 items-center justify-center px-8">
            <View className="bg-white dark:bg-[#161B22] rounded-3xl border border-gray-100 dark:border-gray-800 p-6 w-full max-w-xl">
              <Text className="text-gray-900 dark:text-white text-lg font-bold mb-2">Finance Locked</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-sm">
                Finance access is not enabled for your institution. Contact your school administrator to enable it.
              </Text>
            </View>
          </View>
        }
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} />}
        >
          <View className="p-4 md:p-8">
            {/* Child Selector */}
            {linkedStudents.length > 1 && (
              <View className="mb-5">
                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3 px-2">
                  Select Child
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {linkedStudents.map((student) => {
                    const active = student.id === selectedStudent?.id;
                    return (
                      <TouchableOpacity
                        key={student.id}
                        onPress={() => setSelectedStudent(student)}
                        className={`mr-3 px-5 py-2.5 rounded-2xl border ${
                          active
                            ? "bg-[#FF6900] border-[#FF6900]"
                            : "bg-white dark:bg-[#161B22] border-gray-100 dark:border-gray-800"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${active ? "text-white" : "text-gray-700 dark:text-gray-200"}`}
                        >
                          {displayStudentName(student)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {linkedStudents.length === 0 ? (
              <View className="bg-white dark:bg-[#161B22] p-8 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 items-center">
                <Text className="text-gray-500 dark:text-gray-400 text-sm font-medium text-center">
                  No students are linked to this parent account.
                </Text>
              </View>
            ) : (
              <>
                {/* Viewing Badge */}
                <View className="px-2 mb-4 flex-row items-center justify-between">
                  <View className="self-start bg-white dark:bg-[#161B22] border border-gray-100 dark:border-gray-800 rounded-full px-3 py-1.5">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      Viewing: <Text className="text-gray-900 dark:text-white">{selectedName}</Text> · {selectedClassLabel}
                    </Text>
                  </View>

                  {familyOverview && linkedStudents.length > 1 && (
                    <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold">
                      Family Total: <Text className="text-gray-900 dark:text-white font-extrabold">{formatAmount(familyOverview.total_balance)}</Text>
                    </Text>
                  )}
                </View>

                {/* Main Account Card */}
                <View className="bg-white dark:bg-[#161B22] p-8 rounded-[40px] mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                  <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight">Finance Overview</Text>
                    <HelpTooltip
                      id="parent.finance.overview"
                      role="parent"
                      tier={tier}
                      onLearnMore={(a) => router.push({ pathname: '/(parent)/accessibility/settings', params: { manual: '1', anchor: a || 'parent-workflow' } } as any)}
                    />
                  </View>
                  <View className="flex-row justify-between items-center mb-6">
                    <View>
                      <Text className="text-gray-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Outstanding Balance</Text>
                      <Text className="text-gray-900 dark:text-white text-5xl font-black tracking-tighter">
                        {formatAmount(outstandingBalance)}
                      </Text>
                    </View>
                    <View className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/10 items-center justify-center border border-gray-200 dark:border-white/20">
                      <Wallet size={26} color={isDark ? "white" : "#FF6900"} />
                    </View>
                  </View>

                  <View className="flex-row pt-6 border-t border-gray-100 dark:border-white/10">
                    <View className="flex-1">
                      <Text className="text-gray-400 dark:text-white/40 text-[8px] font-bold uppercase tracking-widest mb-1">Total Billed</Text>
                      <Text className="text-gray-900 dark:text-white font-bold text-base">{formatAmount(totalBilled)}</Text>
                    </View>
                    <View className="flex-1 border-l border-gray-100 dark:border-white/10 pl-4">
                      <Text className="text-gray-400 dark:text-white/40 text-[8px] font-bold uppercase tracking-widest mb-1">Confirmed Paid</Text>
                      <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-base">{formatAmount(totalPaid)}</Text>
                    </View>
                    <View className="flex-1 border-l border-gray-100 dark:border-white/10 pl-4">
                      <Text className="text-gray-400 dark:text-white/40 text-[8px] font-bold uppercase tracking-widest mb-1">Awaiting Review</Text>
                      <Text className="text-amber-600 dark:text-amber-400 font-bold text-base">{formatAmount(pendingAmount)}</Text>
                    </View>
                  </View>

                  {/* Payment Progress Bar */}
                  <View className="mt-6 pt-5 border-t border-gray-100 dark:border-white/10">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-gray-500 dark:text-white/60 text-[10px] font-bold uppercase tracking-widest">Payment Clearance</Text>
                      <Text className="text-gray-900 dark:text-white font-black text-xs">{paidPercentage}%</Text>
                    </View>
                    <View className="h-2.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                      <View className="h-full bg-[#FF6900]" style={{ width: `${paidPercentage}%` }} />
                    </View>
                  </View>

                  {/* Primary Call to Action */}
                  <TouchableOpacity
                    onPress={() => setShowRecordModal(true)}
                    className="mt-6 bg-[#FF6900] py-3.5 rounded-2xl flex-row items-center justify-center gap-2"
                  >
                    <Plus size={18} color="white" />
                    <Text className="text-white text-sm font-extrabold tracking-tight">Record a New Payment</Text>
                  </TouchableOpacity>
                </View>

                {/* Official Documents & Optional Services Card */}
                <View className="bg-white dark:bg-[#161B22] p-6 rounded-[32px] mb-6 border border-gray-100 dark:border-gray-800 shadow-sm gap-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <FileText size={18} color="#FF6900" />
                      <Text className="text-gray-900 dark:text-white font-bold text-base">Fee Services & Official Documents</Text>
                    </View>
                    {currentChildSummary?.held_funds_balance ? (
                      <View className="bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                        <Text className="text-[10px] font-black text-indigo-700 dark:text-indigo-400">
                          Held Funds: {formatAmount(currentChildSummary.held_funds_balance)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text className="text-gray-500 dark:text-gray-400 text-xs">
                    Choose optional school services (transport, meals, activities) or download official vector PDF statements.
                  </Text>

                  <View className="flex-row flex-wrap gap-2.5">
                    <TouchableOpacity
                      onPress={() => setShowOptionalModal(true)}
                      className="flex-1 min-w-[140px] bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 p-3 rounded-2xl flex-row items-center justify-center gap-2"
                    >
                      <Plus size={16} color="#FF6900" />
                      <Text className="text-[#FF6900] text-xs font-black">Choose Optional Fees</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handlePreviewFeeStructure}
                      className="flex-1 min-w-[140px] bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3 rounded-2xl flex-row items-center justify-center gap-2"
                    >
                      <Download size={16} color={isDark ? '#FFFFFF' : '#111827'} />
                      <Text className="text-gray-900 dark:text-white text-xs font-black">Fee Structure PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handlePreviewAccountStatement}
                      className="flex-1 min-w-[140px] bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3 rounded-2xl flex-row items-center justify-center gap-2"
                    >
                      <Download size={16} color={isDark ? '#FFFFFF' : '#111827'} />
                      <Text className="text-gray-900 dark:text-white text-xs font-black">Account Statement</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submissions & Payment History Section */}
                <View className="mb-8">
                  <View className="px-1 mb-3 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Receipt size={18} color="#FF6900" />
                      <Text className="text-gray-900 dark:text-white font-bold text-lg">Payment Submissions & Receipts</Text>
                    </View>
                    <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold">
                      {parentSubmissions.length} record{parentSubmissions.length === 1 ? '' : 's'}
                    </Text>
                  </View>

                  {parentSubmissions.length === 0 ? (
                    <View className="bg-white dark:bg-[#161B22] rounded-3xl border border-gray-100 dark:border-gray-800 p-6 items-center">
                      <Text className="text-gray-500 dark:text-gray-400 text-sm">
                        No payment submissions recorded yet. Tap "Record Payment" above to submit receipt proof.
                      </Text>
                    </View>
                  ) : (
                    parentSubmissions.map((payment) => {
                      const isConfirmed = payment.status === 'confirmed' || payment.status === 'completed';
                      const isFlagged = payment.status === 'flagged' || payment.status === 'failed';
                      const isUnderReview = !isConfirmed && !isFlagged;

                      const statusBadgeBg = isConfirmed
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : isFlagged
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';

                      const statusLabel = isConfirmed
                        ? 'Confirmed'
                        : isFlagged
                        ? 'Not Received'
                        : 'Awaiting Confirmation';

                      const officialReceipt = payment.receipt;

                      return (
                        <View
                          key={payment.id}
                          className="bg-white dark:bg-[#161B22] rounded-3xl border border-gray-100 dark:border-gray-800 p-5 mb-3.5 shadow-sm"
                        >
                          <View className="flex-row justify-between items-start mb-2.5">
                            <View className="flex-1 mr-3">
                              <View className="flex-row items-center gap-2 flex-wrap">
                                <Text className="text-gray-900 dark:text-white font-extrabold text-sm">
                                  Ref: {payment.reference_number || 'N/A'}
                                </Text>
                                <View className={`px-2.5 py-0.5 rounded-full border ${statusBadgeBg}`}>
                                  <Text className="text-[10px] font-black uppercase tracking-wider">
                                    {statusLabel}
                                  </Text>
                                </View>
                              </View>
                              <Text className="text-gray-400 dark:text-gray-500 text-xs mt-1 font-medium">
                                {payment.payment_method?.toUpperCase()} · {new Date(payment.payment_date || payment.created_at).toLocaleDateString()}
                              </Text>
                            </View>
                            <Text className="text-gray-900 dark:text-white font-black text-lg">
                              {formatAmount(payment.total_amount || payment.amount)}
                            </Text>
                          </View>

                          {/* Itemized Allocations */}
                          {(payment.payment_allocations || []).length > 0 && (
                            <View className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl mb-3">
                              <Text className="text-gray-400 dark:text-gray-500 text-[9px] font-bold uppercase tracking-wider mb-1.5">
                                Breakdown
                              </Text>
                              {payment.payment_allocations.map((alloc: any) => (
                                <View key={alloc.id} className="flex-row justify-between py-0.5">
                                  <Text className="text-gray-700 dark:text-gray-300 text-xs">
                                    {alloc.fee_types?.name || alloc.notes || 'School Fees'}
                                  </Text>
                                  <Text className="text-gray-900 dark:text-white text-xs font-bold">
                                    {formatAmount(alloc.amount)}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* Flag Note / Instruction */}
                          {isFlagged && payment.admin_notes && (
                            <View className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 rounded-2xl mb-3 flex-row items-start gap-2">
                              <AlertCircle size={16} color="#E11D48" style={{ marginTop: 2 }} />
                              <View className="flex-1">
                                <Text className="text-rose-900 dark:text-rose-200 text-xs font-bold">Accounts Note:</Text>
                                <Text className="text-rose-800 dark:text-rose-300 text-xs mt-0.5">{payment.admin_notes}</Text>
                              </View>
                            </View>
                          )}

                          {/* Action Buttons */}
                          <View className="flex-row justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                            {officialReceipt ? (
                              <TouchableOpacity
                                onPress={() => handleDownloadOfficialReceipt(officialReceipt.id, officialReceipt.receipt_number)}
                                disabled={actionLoadingId === `rcp-prev-${officialReceipt.id}`}
                                className="flex-row items-center bg-[#FF6900] px-4 py-2 rounded-xl gap-1.5"
                              >
                                {actionLoadingId === `rcp-prev-${officialReceipt.id}` ? (
                                  <ActivityIndicator size="small" color="white" />
                                ) : (
                                  <Download size={14} color="white" />
                                )}
                                <Text className="text-white text-xs font-extrabold">Download Official Receipt</Text>
                              </TouchableOpacity>
                            ) : null}

                            {isFlagged ? (
                              <TouchableOpacity
                                onPress={() => setShowRecordModal(true)}
                                className="flex-row items-center bg-rose-600 px-4 py-2 rounded-xl gap-1.5"
                              >
                                <Plus size={14} color="white" />
                                <Text className="text-white text-xs font-extrabold">Update & Re-submit</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SubscriptionGate>

      {/* Record Payment Wizard Modal */}
      <RecordPaymentModal
        visible={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        onSuccess={() => onRefresh()}
        linkedStudents={linkedStudents}
        preselectedStudentId={selectedStudent?.id}
      />

      {/* Choose Optional Fees Modal */}
      {selectedStudent && (
        <ChooseOptionalFeesModal
          visible={showOptionalModal}
          studentId={selectedStudent.id}
          studentName={selectedName}
          onClose={() => setShowOptionalModal(false)}
          onSaved={() => onRefresh()}
        />
      )}

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        visible={!!previewPayload}
        payload={previewPayload}
        onClose={() => setPreviewPayload(null)}
      />
    </View>
  );
}
