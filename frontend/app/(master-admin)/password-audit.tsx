import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import { TableRowSkeleton } from '@/components/ui/skeletons';
import { getApiBaseUrl } from '@/utils/backendUrl';

const NativeDateTimePicker =
  Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;
const NativeDateTimePickerAndroid =
  Platform.OS === 'android' ? require('@react-native-community/datetimepicker').DateTimePickerAndroid : null;

type AuditOutcome = 'success' | 'failure' | 'requested';
type AuditAction = 'change_password' | 'admin_reset_password' | 'forgot_password_request' | 'reset_password';

type PasswordAuditLog = {
  id: string;
  action: AuditAction;
  actor_user_id: string | null;
  target_user_id: string | null;
  target_email: string | null;
  outcome: AuditOutcome;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

const ACTION_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Actions', value: '' },
  { label: 'Change Password', value: 'change_password' },
  { label: 'Admin Reset', value: 'admin_reset_password' },
  { label: 'Forgot Password', value: 'forgot_password_request' },
  { label: 'Reset Password', value: 'reset_password' },
];

const OUTCOME_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Outcomes', value: '' },
  { label: 'Success', value: 'success' },
  { label: 'Failure', value: 'failure' },
  { label: 'Requested', value: 'requested' },
];



const formatAction = (action: PasswordAuditLog['action']) => {
  if (action === 'change_password') return 'Change Password';
  if (action === 'admin_reset_password') return 'Admin Reset';
  if (action === 'forgot_password_request') return 'Forgot Password';
  return 'Reset Password';
};

const csvEscape = (value: unknown) => {
  if (value === null || value === undefined) return '""';
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
};

const toLocalDayKey = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDayGroupLabel = (dayKey: string) => {
  const todayKey = toLocalDayKey(new Date());
  if (dayKey === todayKey) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toLocalDayKey(yesterday);
  if (dayKey === yesterdayKey) return 'Yesterday';
  return new Date(dayKey).toLocaleDateString();
};

export default function MasterPasswordAuditPage() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<PasswordAuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total: 0, pages: 0 });
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromDateModalOpen, setFromDateModalOpen] = useState(false);
  const [toDateModalOpen, setToDateModalOpen] = useState(false);
  const [fromDateDraft, setFromDateDraft] = useState(new Date());
  const [toDateDraft, setToDateDraft] = useState(new Date());
  const [clearWindow, setClearWindow] = useState<'1h' | '5h' | '10h' | '1d' | '7d' | 'all'>('1d');
  const [clearing, setClearing] = useState(false);
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const tokens = useMemo(() => ({
    bg: isDark ? '#0D1117' : '#F6F8FA',
    card: isDark ? '#161B22' : '#FFFFFF',
    border: isDark ? '#4B5563' : '#9CA3AF',
    text: isDark ? '#E6EDF3' : '#111827',
    subtext: isDark ? '#8B949E' : '#6B7280',
    inputBg: isDark ? '#111827' : '#F3F4F6',
    primary: '#FF6B00',
  }), [isDark]);

  const groupedLogs = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: PasswordAuditLog[] }> = [];
    const map = new Map<string, PasswordAuditLog[]>();
    for (const log of logs) {
      const d = new Date(log.created_at);
      if (Number.isNaN(d.getTime())) continue;
      const key = toLocalDayKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    }
    Array.from(map.keys())
      .sort((a, b) => (a < b ? 1 : -1))
      .forEach((key) => {
        groups.push({ key, label: formatDayGroupLabel(key), items: map.get(key) || [] });
      });
    return groups;
  }, [logs]);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Toast.show({ type: 'error', text1: 'Session expired', text2: 'Please sign in again.' });
        return;
      }

      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
      });
      if (action) params.append('action', action);
      if (outcome) params.append('outcome', outcome);
      if (targetEmail.trim()) params.append('target_email', targetEmail.trim());
      if (fromDate.trim()) params.append('from', `${fromDate.trim()}T00:00:00.000Z`);
      if (toDate.trim()) params.append('to', `${toDate.trim()}T23:59:59.999Z`);

      const response = await fetch(`${getApiBaseUrl()}/master-admin/password-audit-logs?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to fetch password audit logs');
      }

      setLogs(Array.isArray(payload?.logs) ? payload.logs : []);
      setPagination(payload.pagination || { page: 1, limit: 30, total: 0, pages: 0 });
    } catch (error: any) {
      setLogs([]);
      setPagination((prev) => ({ ...prev, total: 0, pages: 0 }));
      Toast.show({ type: 'error', text1: 'Load failed', text2: error?.message || 'Could not load audit logs.' });
    } finally {
      setLoading(false);
    }
  }, [action, outcome, targetEmail, fromDate, toDate, pagination.limit]);

  const openDatePicker = useCallback((field: 'from' | 'to') => {
    const value = field === 'from' ? fromDate : toDate;
    const base = value ? new Date(value) : new Date();
    const safeBase = Number.isFinite(base.getTime()) ? base : new Date();

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const picker = document.createElement('input');
        picker.type = 'date';
        picker.value = value || new Date().toISOString().slice(0, 10);
        picker.style.position = 'fixed';
        picker.style.top = '120px';
        picker.style.left = '50%';
        picker.style.transform = 'translateX(-50%)';
        picker.style.zIndex = '99999';
        picker.style.opacity = '0.01';
        picker.style.width = '1px';
        picker.style.height = '1px';

        const handleChange = () => {
          const selected = picker.value;
          if (!selected) return;
          if (field === 'from') setFromDate(selected);
          else setToDate(selected);
        };

        const cleanup = () => {
          picker.removeEventListener('change', handleChange);
          picker.removeEventListener('blur', cleanup);
          if (picker.parentNode) picker.parentNode.removeChild(picker);
        };

        picker.addEventListener('change', handleChange);
        picker.addEventListener('blur', cleanup, { once: true });
        document.body.appendChild(picker);
        try {
          if (typeof (picker as any).showPicker === 'function') {
            (picker as any).showPicker();
          } else {
            picker.focus();
            picker.click();
          }
        } catch {
          picker.focus();
          picker.click();
        }
      }
      return;
    }

    if (Platform.OS === 'android') {
      if (!NativeDateTimePickerAndroid) {
        Toast.show({ type: 'error', text1: 'Date Picker', text2: 'Date picker is unavailable on this device' });
        return;
      }
      NativeDateTimePickerAndroid.open({
        value: safeBase,
        mode: 'date',
        display: 'calendar',
        is24Hour: true,
        onChange: (_event: any, selectedDate: Date | undefined) => {
          if (!selectedDate) return;
          const yyyy = selectedDate.getFullYear();
          const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
          const dd = String(selectedDate.getDate()).padStart(2, '0');
          const iso = `${yyyy}-${mm}-${dd}`;
          if (field === 'from') setFromDate(iso);
          else setToDate(iso);
        },
      });
      return;
    }

    if (field === 'from') {
      setFromDateDraft(safeBase);
      setFromDateModalOpen(true);
    } else {
      setToDateDraft(safeBase);
      setToDateModalOpen(true);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchLogs(1);
    // Intentionally initial-load only. Filter changes are applied via the Apply Filters button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      fetchLogs(pagination.page || 1);
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs, pagination.page]);

  const exportCsv = async () => {
    if (!logs.length) {
      Toast.show({ type: 'info', text1: 'Nothing to export', text2: 'No logs in current result set.' });
      return;
    }

    try {
      const header = [
        'id',
        'action',
        'outcome',
        'target_email',
        'actor_user_id',
        'target_user_id',
        'ip_address',
        'user_agent',
        'reason',
        'created_at',
      ];

      const lines = [header.map(csvEscape).join(',')];
      logs.forEach((log) => {
        lines.push([
          log.id,
          log.action,
          log.outcome,
          log.target_email,
          log.actor_user_id,
          log.target_user_id,
          log.ip_address,
          log.user_agent,
          log.reason,
          log.created_at,
        ].map(csvEscape).join(','));
      });

      const csvContent = lines.join('\n');

      if (await Sharing.isAvailableAsync()) {
        await Share.share({
          title: `password_audit_logs_page_${pagination.page}.csv`,
          message: csvContent,
        });
      } else {
        Toast.show({ type: 'success', text1: 'CSV generated', text2: 'Copied into share payload.' });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Export failed', text2: error?.message || 'Could not export CSV.' });
    }
  };

  const executeClearLogs = async () => {
    setClearing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Toast.show({ type: 'error', text1: 'Session expired', text2: 'Please sign in again.' });
        return;
      }

      const response = await fetch(`${getApiBaseUrl()}/master-admin/password-audit-logs/clear`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ window: clearWindow, confirm: clearWindow === 'all' }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to clear password audit logs');
      }

      Toast.show({
        type: 'success',
        text1: 'Password Audit',
        text2: `${payload?.deleted || 0} log(s) cleared for window ${clearWindow}`,
      });

      await fetchLogs(1);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Clear failed', text2: error?.message || 'Unable to clear logs.' });
    } finally {
      setClearing(false);
    }
  };

  const clearLogsByWindow = async () => {
    if (clearWindow === 'all') {
      setConfirmAllOpen(true);
      return;
    }
    await executeClearLogs();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: tokens.text, fontSize: 22, fontWeight: '800' }}>Password Audit Logs</Text>
          <Text style={{ color: tokens.subtext, marginTop: 4 }}>Live platform-wide password activity from backend audit logs.</Text>
        </View>

        <View style={{ backgroundColor: tokens.card, borderRadius: 14, borderWidth: 1, borderColor: tokens.border, padding: 12, marginBottom: 16 }}>
          <Text style={{ color: tokens.subtext, fontSize: 12, marginBottom: 8 }}>
            Retention: audit logs are auto-pruned after 5 days.
          </Text>

          <Text style={{ color: tokens.subtext, fontSize: 12, marginBottom: 8 }}>Target Email</Text>
          <TextInput
            value={targetEmail}
            onChangeText={setTargetEmail}
            placeholder="Search email"
            placeholderTextColor={tokens.subtext}
            style={{ backgroundColor: tokens.inputBg, color: tokens.text, borderRadius: 10, borderWidth: 1, borderColor: tokens.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}
          />

          <Text style={{ color: tokens.subtext, fontSize: 12, marginBottom: 8 }}>From Date</Text>
          <TouchableOpacity
            onPress={() => openDatePicker('from')}
            style={{
              backgroundColor: tokens.inputBg,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: tokens.border,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: fromDate ? tokens.text : tokens.subtext }}>
              {fromDate || 'Select date'}
            </Text>
            <MaterialCommunityIcons name="calendar-month" size={18} color={tokens.subtext} />
          </TouchableOpacity>

          <Text style={{ color: tokens.subtext, fontSize: 12, marginBottom: 8 }}>To Date</Text>
          <TouchableOpacity
            onPress={() => openDatePicker('to')}
            style={{
              backgroundColor: tokens.inputBg,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: tokens.border,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: toDate ? tokens.text : tokens.subtext }}>
              {toDate || 'Select date'}
            </Text>
            <MaterialCommunityIcons name="calendar-month" size={18} color={tokens.subtext} />
          </TouchableOpacity>

          <Text style={{ color: tokens.subtext, fontSize: 12, marginBottom: 8 }}>Action</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {ACTION_OPTIONS.map((option) => {
                const active = action === option.value;
                return (
          <TouchableOpacity
            key={option.value || 'all-actions'}
            onPress={() => setAction(option.value)}
            style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: active ? tokens.primary : tokens.border, backgroundColor: active ? tokens.primary : 'transparent' }}
          >
                    <Text style={{ color: active ? '#fff' : tokens.text, fontWeight: '600', fontSize: 12 }}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <Text style={{ color: tokens.subtext, fontSize: 12, marginBottom: 8 }}>Outcome</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {OUTCOME_OPTIONS.map((option) => {
                const active = outcome === option.value;
                return (
          <TouchableOpacity
            key={option.value || 'all-outcomes'}
            onPress={() => setOutcome(option.value)}
            style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: active ? tokens.primary : tokens.border, backgroundColor: active ? tokens.primary : 'transparent' }}
          >
                    <Text style={{ color: active ? '#fff' : tokens.text, fontWeight: '600', fontSize: 12 }}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
            <TouchableOpacity
              onPress={() => fetchLogs(1)}
              style={{ flex: 1, backgroundColor: tokens.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => fetchLogs(pagination.page || 1)}
              disabled={loading}
              style={{ borderWidth: 1, borderColor: tokens.border, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', opacity: loading ? 0.6 : 1 }}
            >
              <MaterialCommunityIcons name="refresh" size={18} color={tokens.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAutoRefresh((prev) => !prev)}
              style={{ borderWidth: 1, borderColor: autoRefresh ? tokens.primary : tokens.border, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: autoRefresh ? tokens.primary : 'transparent' }}
            >
              <Text style={{ color: autoRefresh ? '#fff' : tokens.text, fontWeight: '700', fontSize: 12 }}>Live</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={exportCsv}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: tokens.border, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name="file-delimited" size={18} color={tokens.text} />
              <Text style={{ color: tokens.text, fontWeight: '700' }}>CSV</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: tokens.border, paddingTop: 12 }}>
            <Text style={{ color: tokens.subtext, fontSize: 12, marginBottom: 8 }}>Clear Logs By Window</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['1h', '5h', '10h', '1d', '7d', 'all'] as const).map((windowOption) => {
                  const active = clearWindow === windowOption;
                  return (
                    <TouchableOpacity
                      key={windowOption}
                      onPress={() => setClearWindow(windowOption)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? tokens.primary : tokens.border,
                        backgroundColor: active ? tokens.primary : 'transparent',
                      }}
                    >
                      <Text style={{ color: active ? '#fff' : tokens.text, fontWeight: '700', fontSize: 12 }}>{windowOption.toUpperCase()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              disabled={clearing}
              onPress={clearLogsByWindow}
              style={{
                borderWidth: 1,
                borderColor: '#ef4444',
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: 'center',
                opacity: clearing ? 0.6 : 1,
              }}
            >
              <Text style={{ color: '#ef4444', fontWeight: '700' }}>
                {clearing ? 'Clearing...' : `Clear Logs (${clearWindow.toUpperCase()})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: tokens.subtext, fontSize: 12 }}>Total: {pagination.total}</Text>
          <Text style={{ color: tokens.subtext, fontSize: 12 }}>{autoRefresh ? 'Auto-refresh: 15s' : 'Auto-refresh: off'} • Page {pagination.page} of {Math.max(pagination.pages, 1)}</Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 4 }}>
            <TableRowSkeleton loading={loading} count={8} columns={4} label="Loading password audit logs..." />
          </View>
        ) : logs.length === 0 ? (
          <View style={{ backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border, borderRadius: 12, padding: 16 }}>
            <Text style={{ color: tokens.subtext }}>No audit logs found for current filters.</Text>
          </View>
        ) : (
          groupedLogs.map((group) => (
            <View key={group.key} style={{ marginBottom: 12 }}>
              <Text style={{ color: tokens.subtext, fontSize: 12, fontWeight: '800', marginBottom: 8 }}>{group.label}</Text>
              {group.items.map((log) => (
                <View key={log.id} style={{ backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border, borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: tokens.text, fontWeight: '700' }}>{formatAction(log.action)}</Text>
                    <Text style={{ color: log.outcome === 'failure' ? '#ef4444' : log.outcome === 'requested' ? '#f59e0b' : '#10b981', fontWeight: '700', fontSize: 11, textTransform: 'uppercase' }}>
                      {log.outcome}
                    </Text>
                  </View>
                  <Text style={{ color: tokens.subtext, fontSize: 12 }}>Target: {log.target_email || log.target_user_id || 'N/A'}</Text>
                  <Text style={{ color: tokens.subtext, fontSize: 12 }}>Actor: {log.actor_user_id || 'System/Anonymous'}</Text>
                  <Text style={{ color: tokens.subtext, fontSize: 12 }}>IP: {log.ip_address || 'N/A'}</Text>
                  <Text style={{ color: tokens.subtext, fontSize: 12 }}>When: {new Date(log.created_at).toLocaleTimeString()}</Text>
                  {log.reason ? <Text style={{ color: '#f59e0b', fontSize: 12, marginTop: 4 }}>Reason: {log.reason}</Text> : null}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={confirmAllOpen} transparent animationType="fade" onRequestClose={() => setConfirmAllOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border, borderRadius: 12, padding: 14 }}>
            <Text style={{ color: tokens.text, fontSize: 16, fontWeight: '800' }}>Clear all password audit logs?</Text>
            <Text style={{ color: tokens.subtext, marginTop: 8 }}>This removes all currently retained audit log entries.</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity onPress={() => setConfirmAllOpen(false)} style={{ paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 }}>
                <Text style={{ color: tokens.subtext, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setConfirmAllOpen(false);
                  await executeClearLogs();
                }}
                style={{ borderWidth: 1, borderColor: '#ef4444', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
              >
                <Text style={{ color: '#ef4444', fontWeight: '700' }}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
          <TouchableOpacity
            disabled={pagination.page <= 1 || loading}
            onPress={() => fetchLogs(Math.max(1, pagination.page - 1))}
            style={{ flex: 1, opacity: pagination.page <= 1 ? 0.5 : 1, borderWidth: 1, borderColor: tokens.border, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
          >
            <Text style={{ color: tokens.text, fontWeight: '700' }}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={pagination.page >= pagination.pages || loading || pagination.pages === 0}
            onPress={() => fetchLogs(Math.min(pagination.pages, pagination.page + 1))}
            style={{ flex: 1, opacity: pagination.page >= pagination.pages || pagination.pages === 0 ? 0.5 : 1, backgroundColor: tokens.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Next</Text>
          </TouchableOpacity>
      </View>

      {Platform.OS !== 'web' && NativeDateTimePicker && fromDateModalOpen && (
        <NativeDateTimePicker
          value={fromDateDraft}
          mode="date"
          display="default"
          onChange={(_event: any, selectedDate?: Date) => {
            setFromDateModalOpen(false);
            if (!selectedDate) return;
            const yyyy = selectedDate.getFullYear();
            const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const dd = String(selectedDate.getDate()).padStart(2, '0');
            setFromDate(`${yyyy}-${mm}-${dd}`);
          }}
        />
      )}

      {Platform.OS !== 'web' && NativeDateTimePicker && toDateModalOpen && (
        <NativeDateTimePicker
          value={toDateDraft}
          mode="date"
          display="default"
          onChange={(_event: any, selectedDate?: Date) => {
            setToDateModalOpen(false);
            if (!selectedDate) return;
            const yyyy = selectedDate.getFullYear();
            const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const dd = String(selectedDate.getDate()).padStart(2, '0');
            setToDate(`${yyyy}-${mm}-${dd}`);
          }}
        />
      )}
    </SafeAreaView>
  );
}
