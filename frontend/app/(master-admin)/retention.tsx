import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import SmartReportsService, {
  RetentionPolicy,
  LegalHold,
  RestoreRequest,
} from '@/services/SmartReportsService';
import { showError, showSuccess } from '@/utils/toast';

export default function MasterAdminRetentionPage() {
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'policies' | 'holds' | 'restore'>('policies');
  const [loading, setLoading] = useState(true);

  // Data
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [legalHolds, setLegalHolds] = useState<LegalHold[]>([]);
  const [restoreRequests, setRestoreRequests] = useState<RestoreRequest[]>([]);

  // Policy Edit Modal
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
  const [editYears, setEditYears] = useState<string>('7');
  const [editAction, setEditAction] = useState<'archive' | 'anonymize' | 'delete'>('archive');
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Place Hold Modal
  const [placeHoldModal, setPlaceHoldModal] = useState(false);
  const [holdTitle, setHoldTitle] = useState('');
  const [holdEntityType, setHoldEntityType] = useState('data_class');
  const [holdReason, setHoldReason] = useState('');
  const [savingHold, setSavingHold] = useState(false);

  const tokens = useMemo(
    () => ({
      bg: isDark ? '#0D1117' : '#F6F8FA',
      card: isDark ? '#161B22' : '#FFFFFF',
      border: isDark ? '#30363D' : '#E5E7EB',
      text: isDark ? '#E6EDF3' : '#111827',
      subtext: isDark ? '#8B949E' : '#6B7280',
      inputBg: isDark ? '#111827' : '#F3F4F6',
    }),
    [isDark]
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pol, holds, rests] = await Promise.all([
        SmartReportsService.getRetentionPolicies(),
        SmartReportsService.getLegalHolds(),
        SmartReportsService.getRestoreRequests(),
      ]);
      setPolicies(pol);
      setLegalHolds(holds);
      setRestoreRequests(rests);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch retention compliance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePolicy = async () => {
    if (!editingPolicy) return;
    setSavingPolicy(true);
    try {
      await SmartReportsService.updateRetentionPolicy({
        ...editingPolicy,
        retention_years: parseInt(editYears, 10) || 7,
        action_on_expiry: editAction,
      });
      showSuccess('Retention policy updated');
      setEditingPolicy(null);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to update policy');
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleCreateHold = async () => {
    if (!holdTitle.trim() || !holdReason.trim()) {
      showError('Title and reason are required');
      return;
    }
    setSavingHold(true);
    try {
      await SmartReportsService.createLegalHold({
        title: holdTitle.trim(),
        target_entity_type: holdEntityType,
        reason: holdReason.trim(),
      });
      showSuccess('Legal hold successfully placed');
      setPlaceHoldModal(false);
      setHoldTitle('');
      setHoldReason('');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to place legal hold');
    } finally {
      setSavingHold(false);
    }
  };

  const handleReleaseHold = async (id: string) => {
    try {
      await SmartReportsService.releaseLegalHold(id);
      showSuccess('Legal hold released');
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to release legal hold');
    }
  };

  const handleRestoreAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await SmartReportsService.handleRestoreRequest(id, action);
      showSuccess(`Restore request ${action}d`);
      fetchData();
    } catch (err: any) {
      showError(err.message || 'Failed to process request');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, backgroundColor: tokens.card, borderBottomWidth: 1, borderBottomColor: tokens.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: tokens.text }}>Records Retention & Compliance Center</Text>
          <Text style={{ fontSize: 12, color: tokens.subtext, marginTop: 2 }}>
            Platform statutory retention policies, immutable legal holds, and data restoration workflows
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setPlaceHoldModal(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DC2626', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
        >
          <Ionicons name="shield-checkmark" size={16} color="#FFF" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Place Legal Hold</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: tokens.card, borderBottomWidth: 1, borderBottomColor: tokens.border, paddingHorizontal: 20 }}>
        {[
          { key: 'policies', label: 'Retention Policies', count: policies.length },
          { key: 'holds', label: 'Active Legal Holds', count: legalHolds.filter((h) => h.is_active).length },
          { key: 'restore', label: 'Restore Requests', count: restoreRequests.filter((r) => r.status === 'pending').length },
        ].map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setActiveTab(t.key as any)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: 2,
                borderBottomColor: active ? '#FF6900' : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: active ? '700' : '500', color: active ? '#FF6900' : tokens.subtext }}>
                {t.label}
              </Text>
              <View style={{ backgroundColor: active ? '#FF6900' : tokens.border, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: active ? '#FFF' : tokens.text }}>{t.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#FF6900" />
            <Text style={{ color: tokens.subtext, marginTop: 10, fontSize: 13 }}>Loading Governance Data...</Text>
          </View>
        ) : (
          <>
            {/* TAB 1: POLICIES */}
            {activeTab === 'policies' && (
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 13, color: tokens.subtext }}>
                  Statutory data retention lifecycles compliant with the Kenya Basic Education Act and Data Protection Act (DPA):
                </Text>
                {policies.map((p, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: tokens.card,
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: tokens.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.text }}>
                        {p.data_class.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                      <Text style={{ fontSize: 12, color: tokens.subtext, marginTop: 4 }}>
                        Legal Basis: {p.legal_basis}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981' }}>
                          ⏳ Retention: {p.retention_years} Years
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#6366F1' }}>
                          ⚡ Action on Expiry: {p.action_on_expiry.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingPolicy(p);
                        setEditYears(String(p.retention_years));
                        setEditAction(p.action_on_expiry);
                      }}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: tokens.border }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#FF6900' }}>Edit Policy</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* TAB 2: LEGAL HOLDS */}
            {activeTab === 'holds' && (
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 13, color: tokens.subtext }}>
                  Active legal holds suspend automated archival and purge cycles across affected institutions or data classes:
                </Text>
                {legalHolds.length === 0 ? (
                  <View style={{ backgroundColor: tokens.card, padding: 30, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: tokens.border }}>
                    <Ionicons name="shield-checkmark" size={32} color="#10B981" />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.text, marginTop: 8 }}>No Active Legal Holds</Text>
                    <Text style={{ fontSize: 12, color: tokens.subtext, marginTop: 4 }}>All institutions are operating under normal retention schedules.</Text>
                  </View>
                ) : (
                  legalHolds.map((h) => (
                    <View
                      key={h.id}
                      style={{
                        backgroundColor: tokens.card,
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: h.is_active ? '#DC2626' : tokens.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.text }}>{h.title}</Text>
                        <View style={{ backgroundColor: h.is_active ? '#FEE2E2' : tokens.inputBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: h.is_active ? '#DC2626' : tokens.subtext }}>
                            {h.is_active ? 'ACTIVE HOLD' : 'RELEASED'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: tokens.subtext, marginTop: 6 }}>Reason: {h.reason}</Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                        Target: {h.target_entity_type.toUpperCase()} | Created: {new Date(h.created_at).toLocaleDateString()}
                      </Text>
                      {h.is_active && (
                        <TouchableOpacity
                          onPress={() => handleReleaseHold(h.id)}
                          style={{ alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#DC2626' }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#DC2626' }}>Release Hold</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 3: RESTORE REQUESTS */}
            {activeTab === 'restore' && (
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 13, color: tokens.subtext }}>
                  Audit requests from institution administrators to temporarily restore archived records:
                </Text>
                {restoreRequests.length === 0 ? (
                  <View style={{ backgroundColor: tokens.card, padding: 30, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: tokens.border }}>
                    <Ionicons name="archive-outline" size={32} color={tokens.subtext} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: tokens.text, marginTop: 8 }}>No Pending Restore Requests</Text>
                  </View>
                ) : (
                  restoreRequests.map((r) => (
                    <View
                      key={r.id}
                      style={{
                        backgroundColor: tokens.card,
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: tokens.border,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.text }}>
                          Data Class: {r.data_class.toUpperCase()} (Period: {r.target_period})
                        </Text>
                        <View style={{ backgroundColor: r.status === 'pending' ? '#FEF3C7' : r.status === 'approved' ? '#D1FAE5' : '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: r.status === 'pending' ? '#B45309' : r.status === 'approved' ? '#047857' : '#B91C1C' }}>
                            {r.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: tokens.subtext, marginTop: 6 }}>Justification: {r.justification}</Text>
                      {r.status === 'pending' && (
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                          <TouchableOpacity
                            onPress={() => handleRestoreAction(r.id, 'approve')}
                            style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>Approve (30-day lease)</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleRestoreAction(r.id, 'reject')}
                            style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Policy Edit Modal */}
      <Modal visible={!!editingPolicy} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 460, backgroundColor: tokens.card, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: tokens.border }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.text, marginBottom: 12 }}>
              Edit Retention: {editingPolicy?.data_class.toUpperCase()}
            </Text>

            <Text style={{ fontSize: 12, color: tokens.subtext, marginBottom: 4 }}>Retention Period (Years):</Text>
            <TextInput
              value={editYears}
              onChangeText={setEditYears}
              keyboardType="numeric"
              style={{ height: 38, backgroundColor: tokens.inputBg, borderWidth: 1, borderColor: tokens.border, borderRadius: 6, paddingHorizontal: 10, color: tokens.text, marginBottom: 14 }}
            />

            <Text style={{ fontSize: 12, color: tokens.subtext, marginBottom: 4 }}>Action on Expiry:</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              {(['archive', 'anonymize', 'delete'] as const).map((act) => (
                <TouchableOpacity
                  key={act}
                  onPress={() => setEditAction(act)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: editAction === act ? '#FF6900' : tokens.inputBg, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: editAction === act ? '#FFF' : tokens.text }}>
                    {act.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setEditingPolicy(null)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: tokens.border }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSavePolicy} disabled={savingPolicy} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#FF6900' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Save Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Place Hold Modal */}
      <Modal visible={placeHoldModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 480, backgroundColor: tokens.card, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: tokens.border }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: tokens.text, marginBottom: 12 }}>Place Statutory Legal Hold</Text>

            <Text style={{ fontSize: 12, color: tokens.subtext, marginBottom: 4 }}>Hold Title:</Text>
            <TextInput
              value={holdTitle}
              onChangeText={setHoldTitle}
              placeholder="e.g. High Court Discovery Order Ref #402"
              placeholderTextColor="#9CA3AF"
              style={{ height: 38, backgroundColor: tokens.inputBg, borderWidth: 1, borderColor: tokens.border, borderRadius: 6, paddingHorizontal: 10, color: tokens.text, marginBottom: 12 }}
            />

            <Text style={{ fontSize: 12, color: tokens.subtext, marginBottom: 4 }}>Reason & Legal Directive:</Text>
            <TextInput
              value={holdReason}
              onChangeText={setHoldReason}
              placeholder="Mandatory legal basis to suspend record disposal..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              style={{ height: 60, backgroundColor: tokens.inputBg, borderWidth: 1, borderColor: tokens.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, color: tokens.text, marginBottom: 18 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setPlaceHoldModal(false)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: tokens.border }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: tokens.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateHold} disabled={savingHold} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, backgroundColor: '#DC2626' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Activate Legal Hold</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
