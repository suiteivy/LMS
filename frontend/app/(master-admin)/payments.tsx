import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { TableRowSkeleton } from '@/components/ui/skeletons';

import { useCurrency } from '@/contexts/CurrencyContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';

type PaymentRow = {
  id: string;
  institution_id?: string | null;
  amount: number;
  type?: string | null;
  direction?: string | null;
  date?: string | null;
  method?: string | null;
  status?: string | null;
  reference_id?: string | null;
  meta?: Record<string, any> | null;
  institutions?: { name?: string | null } | null;
  users?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
};

type SummaryRow = {
  institution_id: string;
  institution_name: string;
  subscription_plan: string;
  subscription_status: string;
  expected_amount: number;
  paid_amount: number;
  balance_due: number;
  excess_amount: number;
  is_balanced: boolean;
};

const useThemeColors = (isDark: boolean) => ({
  bg: isDark ? '#0D1117' : '#F6F8FA',
  card: isDark ? '#161B22' : '#FFFFFF',
  input: isDark ? '#0F141C' : '#F3F4F6',
  border: isDark ? '#4B5563' : '#9CA3AF',
  text: isDark ? '#F0F6FC' : '#1F2328',
  sub: isDark ? '#8B949E' : '#57606A',
  primary: '#FF6900',
  success: '#1A7F37',
  danger: '#CF222E',
  warn: '#9A6700',
});

export default function MasterPaymentsPage() {
  const { isDark } = useTheme();
  const { formatAmount: formatMoney } = useCurrency();
  const c = useThemeColors(isDark);

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [query, setQuery] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    method: 'bank_transfer',
    status: 'completed',
    reference_id: '',
    date: '',
    notes: '',
  });

  const backendUrl = useMemo(() => {
    let url = (process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_URL || 'http://localhost:4001').replace(/\/api\/?$/, '');
    if (Platform.OS === 'android') url = url.replace('localhost', '10.0.2.2');
    return url;
  }, []);

  const authedFetch = async (path: string, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init?.headers as Record<string, string>),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${backendUrl}${path}`, { ...init, headers });
    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
    if (!res.ok) throw new Error(payload?.error || `Request failed (${res.status})`);
    return payload;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [payRes, summaryRes] = await Promise.all([
        authedFetch('/api/master-admin/payments'),
        authedFetch('/api/master-admin/payments/summary'),
      ]);
      setPayments(payRes?.payments || []);
      setSummary(summaryRes?.summary || []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Payments', text2: e.message || 'Failed to load payments', position: 'top' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPayments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => {
      const inst = p.institutions?.name || '';
      const fullName = `${p.users?.first_name || ''} ${p.users?.last_name || ''}`.trim();
      return (
        inst.toLowerCase().includes(q) ||
        fullName.toLowerCase().includes(q) ||
        String(p.reference_id || '').toLowerCase().includes(q) ||
        String(p.method || '').toLowerCase().includes(q)
      );
    });
  }, [payments, query]);

  const openEdit = (row: PaymentRow) => {
    setEditing(row);
    setEditForm({
      amount: String(row.amount || ''),
      method: row.method || 'bank_transfer',
      status: row.status || 'completed',
      reference_id: row.reference_id || '',
      date: (row.date || '').slice(0, 10),
      notes: String(row.meta?.notes || ''),
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing?.id) return;
    if (!editForm.amount) {
      Toast.show({ type: 'error', text1: 'Payment', text2: 'Amount is required', position: 'top' });
      return;
    }
    try {
      setEditSaving(true);
      await authedFetch(`/api/master-admin/payments/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          amount: Number(editForm.amount),
          method: editForm.method,
          status: editForm.status,
          reference_id: editForm.reference_id,
          date: editForm.date || null,
          notes: editForm.notes,
        }),
      });
      Toast.show({ type: 'success', text1: 'Payment', text2: 'Payment updated', position: 'top' });
      setEditOpen(false);
      setEditing(null);
      await loadData();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Payment', text2: e.message || 'Unable to update payment', position: 'top' });
    } finally {
      setEditSaving(false);
    }
  };

  const exportCsv = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Missing session');
      const url = `${backendUrl}/api/master-admin/payments/export`;

      if (Platform.OS === 'web') {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json?.error || 'Export failed');
        }
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `platform-payments-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      } else {
        await Linking.openURL(url);
      }

      Toast.show({ type: 'success', text1: 'Export', text2: 'Payments CSV exported', position: 'top' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Export', text2: e.message || 'CSV export failed', position: 'top' });
    }
  };

  const openReceipt = async (paymentId: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Missing session');

      const url = `${backendUrl}/api/master-admin/payments/${encodeURIComponent(paymentId)}/receipt`;
      if (Platform.OS === 'web') {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || 'Failed to open receipt');
        }
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      } else {
        await Linking.openURL(url);
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Receipt', text2: e.message || 'Unable to open receipt', position: 'top' });
    }
  };

  const formatAmount = (v: number) => formatMoney(Number(v || 0));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ color: c.text, fontSize: 23, fontWeight: '800' }}>Payments</Text>
          <Text style={{ color: c.sub, marginTop: 2 }}>Ledger, edits, export and reconciliation</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={loadData}>
            <MaterialCommunityIcons name="refresh" size={22} color={c.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={exportCsv}>
            <MaterialCommunityIcons name="file-download-outline" size={22} color={c.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 6 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search institution, user, method, reference"
          placeholderTextColor={c.sub}
          style={{
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: c.text,
            backgroundColor: c.card,
          }}
        />
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <Text style={{ color: c.text, fontWeight: '800', marginBottom: 8 }}>Institution Reconciliation</Text>
        <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.card, padding: 10 }}>
          {summary.length === 0 ? (
            <Text style={{ color: c.sub }}>No summary rows.</Text>
          ) : (
            <FlatList
              data={summary}
              keyExtractor={(i) => i.institution_id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const badge = item.balance_due > 0 ? 'Balance Due' : item.excess_amount > 0 ? 'Excess' : 'Balanced';
                const badgeColor = item.balance_due > 0 ? c.warn : item.excess_amount > 0 ? c.success : c.success;
                return (
                  <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 10, marginRight: 10, minWidth: 240, backgroundColor: c.bg }}>
                    <Text style={{ color: c.text, fontWeight: '800' }} numberOfLines={1}>{item.institution_name}</Text>
                    <Text style={{ color: c.sub, marginTop: 2 }}>{String(item.subscription_plan || '').toUpperCase()}  •  {String(item.subscription_status || '').toUpperCase()}</Text>
                    <Text style={{ color: c.sub, marginTop: 6 }}>Expected: {formatAmount(item.expected_amount)}</Text>
                    <Text style={{ color: c.sub, marginTop: 2 }}>Paid: {formatAmount(item.paid_amount)}</Text>
                    {item.balance_due > 0 && <Text style={{ color: c.warn, marginTop: 2, fontWeight: '700' }}>Balance: {formatAmount(item.balance_due)}</Text>}
                    {item.excess_amount > 0 && <Text style={{ color: c.success, marginTop: 2, fontWeight: '700' }}>Excess: {formatAmount(item.excess_amount)}</Text>}
                    <Text style={{ color: badgeColor, marginTop: 6, fontWeight: '800' }}>{badge}</Text>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 }}>
          <TableRowSkeleton loading={loading} columns={5} count={8} label="Loading payments..." />
        </View>
      ) : (
        <FlatList
          data={filteredPayments}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 }}
          renderItem={({ item }) => {
            const status = String(item.status || 'unknown').toLowerCase();
            const statusColor = status === 'completed' ? c.success : status === 'pending' ? c.warn : c.danger;
            const displayUser = `${item.users?.first_name || ''} ${item.users?.last_name || ''}`.trim() || 'System';
            return (
              <View
                style={{
                  backgroundColor: c.card,
                  borderColor: c.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: c.text, fontWeight: '800' }}>{item.institutions?.name || 'Unknown Institution'}</Text>
                    <Text style={{ color: c.sub, marginTop: 2 }}>{displayUser}</Text>
                  </View>
                  <Text style={{ color: statusColor, fontWeight: '800' }}>{String(item.status || '').toUpperCase()}</Text>
                </View>

                <Text style={{ color: c.text, fontSize: 18, fontWeight: '800', marginTop: 8 }}>{formatAmount(item.amount)}</Text>
                <Text style={{ color: c.sub, marginTop: 2 }}>
                  {String(item.method || '').toUpperCase()}  •  {String(item.date || '').slice(0, 10)}
                </Text>
                <Text style={{ color: c.sub, marginTop: 2 }}>Ref: {item.reference_id || 'N/A'}</Text>

                <View style={{ marginTop: 10, flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => openEdit(item)}>
                    <Text style={{ color: c.primary, fontWeight: '700' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openReceipt(item.id)}>
                    <Text style={{ color: c.text, fontWeight: '700' }}>Receipt</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <MaterialCommunityIcons name="cash-off" size={48} color={c.border} />
              <Text style={{ color: c.sub, marginTop: 10 }}>No payments found.</Text>
            </View>
          }
        />
      )}

      <Modal visible={editOpen} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: c.text, fontSize: 20, fontWeight: '800' }}>Edit Payment</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <MaterialCommunityIcons name="close" size={22} color={c.sub} />
              </TouchableOpacity>
            </View>

            <Label c={c} text="Amount" />
            <Input c={c} value={editForm.amount} keyboardType="numeric" onChangeText={(v) => setEditForm((p) => ({ ...p, amount: v }))} />

            <Label c={c} text="Method" />
            <View style={pickerWrap(c)}>
              <Picker selectedValue={editForm.method} onValueChange={(v) => setEditForm((p) => ({ ...p, method: v }))} style={{ color: c.text }}>
                <Picker.Item label="BANK_TRANSFER" value="bank_transfer" />
                <Picker.Item label="MOBILE_MONEY" value="mobile_money" />
                <Picker.Item label="CARD" value="card" />
                <Picker.Item label="CASH" value="cash" />
                <Picker.Item label="MANUAL" value="manual" />
              </Picker>
            </View>

            <Label c={c} text="Status" />
            <View style={pickerWrap(c)}>
              <Picker selectedValue={editForm.status} onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))} style={{ color: c.text }}>
                <Picker.Item label="COMPLETED" value="completed" />
                <Picker.Item label="PENDING" value="pending" />
                <Picker.Item label="FAILED" value="failed" />
              </Picker>
            </View>

            <Label c={c} text="Reference" />
            <Input c={c} value={editForm.reference_id} onChangeText={(v) => setEditForm((p) => ({ ...p, reference_id: v }))} />

            <Label c={c} text="Date (YYYY-MM-DD)" />
            <Input c={c} value={editForm.date} onChangeText={(v) => setEditForm((p) => ({ ...p, date: v }))} />

            <Label c={c} text="Notes" />
            <Input c={c} value={editForm.notes} onChangeText={(v) => setEditForm((p) => ({ ...p, notes: v }))} />

            <TouchableOpacity
              onPress={saveEdit}
              disabled={editSaving}
              style={{ marginTop: 14, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: editSaving ? 0.7 : 1 }}
            >
              {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Save Payment</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Label({ c, text }: { c: ReturnType<typeof useThemeColors>; text: string }) {
  return <Text style={{ color: c.sub, fontSize: 12, marginTop: 8, marginBottom: 6, fontWeight: '700' }}>{text}</Text>;
}

function Input({
  c,
  value,
  onChangeText,
  keyboardType,
}: {
  c: ReturnType<typeof useThemeColors>;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      style={{
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: c.text,
        backgroundColor: c.input,
      }}
      placeholderTextColor={c.sub}
    />
  );
}

const overlayStyle = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  padding: 16,
};

const modalCardStyle = {
  width: '100%' as const,
  maxWidth: 560,
  borderRadius: 18,
  borderWidth: 1,
  padding: 16,
};

const pickerWrap = (c: ReturnType<typeof useThemeColors>) => ({
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: 12,
  backgroundColor: c.input,
});
