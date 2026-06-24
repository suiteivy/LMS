import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';

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

const getBackendUrl = () => {
  let url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4001';
  if (Platform.OS === 'android') {
    url = url.replace('localhost', '10.0.2.2');
  }
  return url;
};

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

  const tokens = useMemo(() => ({
    bg: isDark ? '#0F0B2E' : '#f8fafc',
    card: isDark ? '#13103A' : '#ffffff',
    border: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
    text: isDark ? '#ffffff' : '#0f172a',
    subtext: isDark ? '#94a3b8' : '#64748b',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
    primary: '#FF6B00',
  }), [isDark]);

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
      if (fromDate.trim()) params.append('from', fromDate.trim());
      if (toDate.trim()) params.append('to', toDate.trim());

      const response = await fetch(`${getBackendUrl()}/api/master-admin/password-audit-logs?${params.toString()}`, {
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

      setLogs(payload.logs || []);
      setPagination(payload.pagination || { page: 1, limit: 30, total: 0, pages: 0 });
    } catch (error: any) {
      setLogs([]);
      setPagination((prev) => ({ ...prev, total: 0, pages: 0 }));
      Toast.show({ type: 'error', text1: 'Load failed', text2: error?.message || 'Could not load audit logs.' });
    } finally {
      setLoading(false);
    }
  }, [action, outcome, targetEmail, fromDate, toDate, pagination.limit]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: tokens.text, fontSize: 22, fontWeight: '800' }}>Password Audit Logs</Text>
          <Text style={{ color: tokens.subtext, marginTop: 4 }}>Filter, review, and export password activity across the platform.</Text>
        </View>

        <View style={{ backgroundColor: tokens.card, borderRadius: 14, borderWidth: 1, borderColor: tokens.border, padding: 12, marginBottom: 16 }}>
          <Text style={{ color: tokens.subtext, fontSize: 12, marginBottom: 8 }}>Target Email</Text>
          <TextInput
            value={targetEmail}
            onChangeText={setTargetEmail}
            placeholder="Search email"
            placeholderTextColor={tokens.subtext}
            style={{ backgroundColor: tokens.inputBg, color: tokens.text, borderRadius: 10, borderWidth: 1, borderColor: tokens.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}
          />

          <Text style={{ color: tokens.subtext, fontSize: 12, marginBottom: 8 }}>From (ISO date)</Text>
          <TextInput
            value={fromDate}
            onChangeText={setFromDate}
            placeholder="2026-01-01T00:00:00.000Z"
            placeholderTextColor={tokens.subtext}
            style={{ backgroundColor: tokens.inputBg, color: tokens.text, borderRadius: 10, borderWidth: 1, borderColor: tokens.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}
          />

          <Text style={{ color: tokens.subtext, fontSize: 12, marginBottom: 8 }}>To (ISO date)</Text>
          <TextInput
            value={toDate}
            onChangeText={setToDate}
            placeholder="2026-01-31T23:59:59.000Z"
            placeholderTextColor={tokens.subtext}
            style={{ backgroundColor: tokens.inputBg, color: tokens.text, borderRadius: 10, borderWidth: 1, borderColor: tokens.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}
          />

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
              onPress={exportCsv}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: tokens.border, borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' }}
            >
              <MaterialCommunityIcons name="file-delimited" size={18} color={tokens.text} />
              <Text style={{ color: tokens.text, fontWeight: '700' }}>CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: tokens.subtext, fontSize: 12 }}>Total: {pagination.total}</Text>
          <Text style={{ color: tokens.subtext, fontSize: 12 }}>Page {pagination.page} of {Math.max(pagination.pages, 1)}</Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 24 }}>
            <ActivityIndicator color={tokens.primary} />
          </View>
        ) : logs.length === 0 ? (
          <View style={{ backgroundColor: tokens.card, borderWidth: 1, borderColor: tokens.border, borderRadius: 12, padding: 16 }}>
            <Text style={{ color: tokens.subtext }}>No audit logs found for current filters.</Text>
          </View>
        ) : (
          logs.map((log) => (
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
              <Text style={{ color: tokens.subtext, fontSize: 12 }}>When: {new Date(log.created_at).toLocaleString()}</Text>
              {log.reason ? <Text style={{ color: '#f59e0b', fontSize: 12, marginTop: 4 }}>Reason: {log.reason}</Text> : null}
            </View>
          ))
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
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
      </ScrollView>
    </SafeAreaView>
  );
}
