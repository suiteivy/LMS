import { Spinner } from '@/components/ui/Spinner';
import { TableRowSkeleton } from '@/components/ui/skeletons';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { RevenueDeductionLog, RevenueService } from '@/services/RevenueService';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface RevenueSectionProps {
  onRefresh?: () => void;
}

export const RevenueSection: React.FC<RevenueSectionProps> = ({ onRefresh }) => {
  const { isDark } = useTheme();
  const { formatAmount } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [overview, setOverview] = useState({
    gross_revenue: 0,
    total_deductions: 0,
    net_revenue: 0,
    payment_count: 0,
    deduction_count: 0,
    last_7_days: [] as any[],
  });
  const [logs, setLogs] = useState<RevenueDeductionLog[]>([]);
  const [form, setForm] = useState({ amount: '', reason: '', target: '' });

  const load = async (searchTerm?: string) => {
    try {
      setLoading(true);
      const [ov, deductionLogs] = await Promise.all([
        RevenueService.getOverview(),
        RevenueService.getDeductions(searchTerm),
      ]);
      setOverview(ov);
      setLogs(deductionLogs);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((row) =>
      String(row.reason || '').toLowerCase().includes(term) ||
      String(row.target || '').toLowerCase().includes(term) ||
      String(row.recorded_by || '').toLowerCase().includes(term)
    );
  }, [logs, search]);

  const resetForm = () => setForm({ amount: '', reason: '', target: '' });

  const onRecordUsage = async () => {
    const amount = Number(form.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Validation', 'Amount must be greater than zero.');
      return;
    }
    if (!form.reason.trim()) {
      Alert.alert('Validation', 'Reason is required.');
      return;
    }
    if (!form.target.trim()) {
      Alert.alert('Validation', 'Target is required.');
      return;
    }
    if (amount > Number(overview.net_revenue || 0)) {
      Alert.alert('Validation', 'Amount cannot exceed available net revenue.');
      return;
    }

    try {
      setSubmitting(true);
      await RevenueService.recordUsage({
        amount,
        reason: form.reason.trim(),
        target: form.target.trim(),
      });
      setShowModal(false);
      resetForm();
      await load(search);
      onRefresh?.();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to record usage');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1">
      <View className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl p-5 border border-[#D0D7DE] dark:border-[#21262D] mb-4">
        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest mb-2">Net Revenue</Text>
        <Text className="text-3xl font-black text-gray-900 dark:text-white">{formatAmount(overview.net_revenue || 0)}</Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Gross {formatAmount(overview.gross_revenue || 0)} - Deductions {formatAmount(overview.total_deductions || 0)}
        </Text>

        <TouchableOpacity
          onPress={() => setShowModal(true)}
          className="mt-4 self-start bg-[#FF6900] px-4 py-2.5 rounded-xl"
        >
          <Text className="text-white font-bold text-xs uppercase tracking-widest">Record Usage</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center bg-[#EAEEF2] dark:bg-[#0F141C] rounded-xl px-4 py-3 mb-4 border border-[#D0D7DE] dark:border-[#21262D]">
        <TextInput
          className="flex-1 text-gray-900 dark:text-white font-medium"
          placeholder="Search logs by reason, target, recorded by..."
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            load(text);
          }}
        />
      </View>

      {loading ? (
        <View className="py-2">
          <TableRowSkeleton loading={loading} columns={5} count={8} label="Loading revenue logs..." />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} className="pb-20">
          {filteredLogs.map((log) => (
            <View key={log.id} className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl p-4 mb-3 border border-[#D0D7DE] dark:border-[#21262D]">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-900 dark:text-white font-black text-base">{formatAmount(log.amount || 0)}</Text>
                <Text className="text-gray-500 dark:text-gray-400 text-xs">{new Date(log.created_at).toLocaleString()}</Text>
              </View>
              <Text className="text-gray-700 dark:text-gray-200 text-sm mb-1"><Text className="font-bold">Reason:</Text> {log.reason || 'N/A'}</Text>
              <Text className="text-gray-700 dark:text-gray-200 text-sm mb-1"><Text className="font-bold">Origin:</Text> {log.origin_label || log.origin_type || 'N/A'}</Text>
              <Text className="text-gray-700 dark:text-gray-200 text-sm mb-1"><Text className="font-bold">Target:</Text> {log.target || 'N/A'}</Text>
              <Text className="text-gray-700 dark:text-gray-200 text-sm"><Text className="font-bold">Recorded by:</Text> {log.recorded_by_label || log.recorded_by || 'N/A'}</Text>
            </View>
          ))}

          {filteredLogs.length === 0 && (
            <View className="py-16 items-center">
              <Text className="text-gray-500 dark:text-gray-400">No usage logs found.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/45 px-4">
          <View className="w-full max-w-xl bg-[#F6F8FA] dark:bg-[#161B22] rounded-3xl border border-[#D0D7DE] dark:border-[#21262D] p-5">
            <Text className="text-lg font-black text-gray-900 dark:text-white mb-4">Record Usage</Text>

            <Text className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Amount</Text>
            <TextInput
              value={form.amount}
              onChangeText={(v) => setForm((p) => ({ ...p, amount: v.replace(/[^0-9.]/g, '') }))}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              className="border border-[#D0D7DE] dark:border-[#21262D] rounded-xl px-3 py-3 text-gray-900 dark:text-white mb-3 bg-[#FFFFFF] dark:bg-[#0F141C]"
            />

            <Text className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Reason</Text>
            <TextInput
              value={form.reason}
              onChangeText={(v) => setForm((p) => ({ ...p, reason: v }))}
              placeholder="Why funds were used"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              className="border border-[#D0D7DE] dark:border-[#21262D] rounded-xl px-3 py-3 text-gray-900 dark:text-white mb-3 bg-[#FFFFFF] dark:bg-[#0F141C]"
            />

            <Text className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Target</Text>
            <TextInput
              value={form.target}
              onChangeText={(v) => setForm((p) => ({ ...p, target: v }))}
              placeholder="Who/what the funds were used for"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              className="border border-[#D0D7DE] dark:border-[#21262D] rounded-xl px-3 py-3 text-gray-900 dark:text-white mb-4 bg-[#FFFFFF] dark:bg-[#0F141C]"
            />

            <View className="flex-row" style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="flex-1 bg-gray-100 dark:bg-gray-800 py-3 rounded-xl items-center"
                disabled={submitting}
              >
                <Text className="text-gray-700 dark:text-gray-200 font-bold text-xs uppercase tracking-widest">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onRecordUsage}
                className="flex-1 bg-[#FF6900] py-3 rounded-xl items-center"
                disabled={submitting}
              >
                {submitting ? (
                  <Spinner color="#FFFFFF" size="small" />
                ) : (
                  <Text className="text-white font-bold text-xs uppercase tracking-widest">Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default RevenueSection;
