import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { useParentStudentContext } from "@/hooks/useParentStudentContext";
import { ParentService } from "@/services/ParentService";
import { formatClassLabel } from "@/utils/classLabel";
import { setParentSelectedChild } from "@/utils/parentSelectedChild";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowDownLeft, Wallet } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type LinkedStudent = {
  id: string;
  class_id?: string | null;
  class_name?: string | null;
  grade_level?: string | number | null;
  form_level?: string | number | null;
  users?: {
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
};

type FinancePayload = {
  balance: number;
  total_fees: number;
  paid_amount: number;
  pending_amount: number;
  paid_percentage: number;
  fee_structures: Array<{
    id: string;
    title: string;
    amount: number;
    academic_year?: string;
    term?: string;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    description?: string;
    date?: string;
    amount: number;
    status?: string;
  }>;
};

function formatCurrency(amount: number) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

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
  const [finance, setFinance] = useState<FinancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const selectedName = useMemo(() => displayStudentName(selectedStudent), [selectedStudent]);
  const selectedClassLabel = useMemo(() => displayClassLabel(selectedStudent), [selectedStudent]);
  const paidPercentage = Math.max(0, Math.min(100, Number(finance?.paid_percentage || 0)));

  const fetchLinkedStudents = async () => {
    const students = (await ParentService.getLinkedStudents()) || [];
    setLinkedStudents(students);

    if (students.length === 0) {
      setSelectedStudent(null);
      setFinance(null);
      return;
    }

    const matched = context.studentId
      ? students.find((s: LinkedStudent) => s.id === context.studentId)
      : null;
    const initial = matched || students[0];
    setSelectedStudent(initial);
    await setParentSelectedChild({
      studentId: initial.id,
      studentName: displayStudentName(initial),
      classId: initial.class_id || "",
    });
  };

  const fetchFinance = async (studentId: string) => {
    const payload = await ParentService.getStudentFinance(studentId);
    setFinance(payload || null);
  };

  const loadPage = async () => {
    try {
      setLoading(true);
      await fetchLinkedStudents();
    } catch (error) {
      console.error("Error loading parent finance:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPage();
  };

  useEffect(() => {
    if (!context.ready) return;
    loadPage();
  }, [context.ready, context.studentId]);

  useEffect(() => {
    const syncAndFetch = async () => {
      if (!selectedStudent?.id) return;
      await setParentSelectedChild({
        studentId: selectedStudent.id,
        studentName: displayStudentName(selectedStudent),
        classId: selectedStudent.class_id || "",
      });
      await fetchFinance(selectedStudent.id);
    };

    syncAndFetch().catch((error) => {
      console.error("Error fetching finance data:", error);
    });
  }, [selectedStudent?.id]);

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-navy">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-navy">
      <UnifiedHeader
        title="Finance"
        subtitle={selectedName === "Student" ? "Student Financials" : `${selectedName}'s Financials`}
        role="Parent/Guardian"
        onBack={() => router.back()}
      />

      <SubscriptionGate
        feature="finance"
        fallback={
          <View className="flex-1 items-center justify-center px-8">
            <View className="bg-white dark:bg-navy-surface rounded-3xl border border-gray-100 dark:border-gray-800 p-6 w-full max-w-xl">
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
                            : "bg-white dark:bg-navy-surface border-gray-100 dark:border-gray-800"
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
              <View className="bg-white dark:bg-navy-surface p-8 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 items-center">
                <Text className="text-gray-500 dark:text-gray-400 text-sm font-medium text-center">
                  No students are linked to this parent account.
                </Text>
              </View>
            ) : (
              <>
                <View className="px-2 mb-4">
                  <View className="self-start bg-white dark:bg-navy-surface border border-gray-100 dark:border-gray-800 rounded-full px-3 py-1.5">
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      Viewing: <Text className="text-gray-900 dark:text-white">{selectedName}</Text> · {selectedClassLabel}
                    </Text>
                  </View>
                </View>

                <View className="bg-gray-900 p-8 rounded-[40px] mb-6">
                  <View className="flex-row justify-between items-center mb-6">
                    <View>
                      <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[3px] mb-2">Outstanding Balance</Text>
                      <Text className="text-white text-5xl font-black tracking-tighter">
                        {formatCurrency(finance?.balance || 0)}
                      </Text>
                    </View>
                    <View className="w-14 h-14 rounded-full bg-white/10 items-center justify-center border border-white/20">
                      <Wallet size={26} color="white" />
                    </View>
                  </View>

                  <View className="flex-row pt-6 border-t border-white/10">
                    <View className="flex-1">
                      <Text className="text-white/40 text-[8px] font-bold uppercase tracking-widest mb-1">Total Fees</Text>
                      <Text className="text-white font-bold text-base">{formatCurrency(finance?.total_fees || 0)}</Text>
                    </View>
                    <View className="flex-1 border-l border-white/10 pl-4">
                      <Text className="text-white/40 text-[8px] font-bold uppercase tracking-widest mb-1">Paid</Text>
                      <Text className="text-emerald-400 font-bold text-base">{formatCurrency(finance?.paid_amount || 0)}</Text>
                    </View>
                    <View className="flex-1 border-l border-white/10 pl-4">
                      <Text className="text-white/40 text-[8px] font-bold uppercase tracking-widest mb-1">Pending</Text>
                      <Text className="text-amber-400 font-bold text-base">{formatCurrency(finance?.pending_amount || 0)}</Text>
                    </View>
                  </View>

                  <View className="mt-6 pt-5 border-t border-white/10">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Payment Progress</Text>
                      <Text className="text-white font-black text-xs">{paidPercentage}%</Text>
                    </View>
                    <View className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                      <View
                        className="h-full bg-[#FF6900]"
                        style={{ width: `${paidPercentage}%` }}
                      />
                    </View>
                    <View className="flex-row justify-between mt-2">
                      <Text className="text-white/50 text-[10px] font-semibold">
                        Paid {formatCurrency(finance?.paid_amount || 0)}
                      </Text>
                      <Text className="text-white/50 text-[10px] font-semibold">
                        Remaining {formatCurrency(finance?.balance || 0)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="mb-6">
                  <Text className="text-gray-900 dark:text-white font-bold text-lg px-1 mb-3">Current Fee Structures</Text>
                  {(finance?.fee_structures || []).length === 0 ? (
                    <View className="bg-white dark:bg-navy-surface rounded-3xl border border-gray-100 dark:border-gray-800 p-5">
                      <Text className="text-gray-500 dark:text-gray-400 text-sm">No fee structures for the active period.</Text>
                    </View>
                  ) : (
                    finance?.fee_structures?.map((fee) => (
                      <View
                        key={fee.id}
                        className="bg-white dark:bg-navy-surface rounded-3xl border border-gray-100 dark:border-gray-800 p-5 mb-3"
                      >
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1 mr-3">
                            <Text className="text-gray-900 dark:text-white font-bold text-sm">{fee.title || "Fee item"}</Text>
                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                              {fee.term || "Term"} {fee.academic_year || ""}
                            </Text>
                          </View>
                          <Text className="text-gray-900 dark:text-white font-black text-base">{formatCurrency(fee.amount || 0)}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                <View>
                  <Text className="text-gray-900 dark:text-white font-bold text-lg px-1 mb-3">Recent Transactions</Text>
                  {(finance?.transactions || []).length === 0 ? (
                    <View className="bg-white dark:bg-navy-surface rounded-3xl border border-gray-100 dark:border-gray-800 p-5">
                      <Text className="text-gray-500 dark:text-gray-400 text-sm">No transactions found for this student.</Text>
                    </View>
                  ) : (
                    finance?.transactions?.map((tx) => (
                      <View
                        key={tx.id}
                        className="bg-white dark:bg-navy-surface rounded-3xl border border-gray-100 dark:border-gray-800 p-5 mb-3 flex-row items-center"
                      >
                        <View className="w-10 h-10 rounded-2xl items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 mr-3">
                          <ArrowDownLeft size={18} color="#10B981" />
                        </View>
                        <View className="flex-1 mr-2">
                          <Text className="text-gray-900 dark:text-white font-semibold text-sm">
                            {tx.description || tx.type || "Payment"}
                          </Text>
                          <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                            {tx.date ? new Date(tx.date).toLocaleDateString() : "Unknown date"}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-gray-900 dark:text-white font-black text-sm">{formatCurrency(tx.amount || 0)}</Text>
                          <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                            {tx.status || "completed"}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SubscriptionGate>
    </View>
  );
}
