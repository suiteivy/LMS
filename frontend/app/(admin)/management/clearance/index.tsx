import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ClearanceProcess, ClearanceService } from '@/services/ClearanceService';
import { PdfPreviewModal } from '@/components/pdf/PdfPreviewModal';
import { PdfDocumentPayload } from '@/services/PdfService';
import { api } from '@/services/api';

const REASON_CATEGORIES = [
  { key: 'graduation', label: 'Graduation / Completion', roles: ['student'], color: '#10B981' },
  { key: 'withdrawal', label: 'Voluntary Withdrawal', roles: ['student'], color: '#6366F1' },
  { key: 'transferred', label: 'Transfer to Another Institution', roles: ['student'], color: '#3B82F6' },
  { key: 'expulsion', label: 'Expulsion (Disciplinary)', roles: ['student'], color: '#EF4444' },
  { key: 'resignation', label: 'Resignation', roles: ['teacher', 'admin'], color: '#F59E0B' },
  { key: 'contract_ended', label: 'End of Contract', roles: ['teacher', 'admin'], color: '#8B5CF6' },
  { key: 'terminated', label: 'Termination', roles: ['teacher', 'admin'], color: '#DC2626' },
];

export default function AdminClearanceManagement() {
  const { isDark } = useTheme();
  const { user, institutionName, institutionLogo } = useAuth();

  const [clearances, setClearances] = useState<ClearanceProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Initiation Modal (Multi-step)
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [initiateStep, setInitiateStep] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [reasonCategory, setReasonCategory] = useState('graduation');
  const [userSearchText, setUserSearchText] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Category Checks for Initiation
  const [categoryChecks, setCategoryChecks] = useState<Record<string, any>>({});
  const [checkingCategories, setCheckingCategories] = useState(false);
  const [adminOverride, setAdminOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [reasonNotes, setReasonNotes] = useState('');
  const [forwardingInstitution, setForwardingInstitution] = useState('');
  const [allowUserContinuation, setAllowUserContinuation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Detail Modal
  const [selectedProcess, setSelectedProcess] = useState<ClearanceProcess | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // PDF Preview State
  const [pdfPayload, setPdfPayload] = useState<PdfDocumentPayload | null>(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const bg = isDark ? '#161B22' : '#F9FAFB';
  const card = isDark ? '#1C2128' : '#FFFFFF';
  const border = isDark ? '#30363D' : '#E5E7EB';
  const textPrimary = isDark ? '#F0F6FC' : '#111827';
  const textSecondary = isDark ? '#8B949E' : '#6B7280';
  const inputBg = isDark ? '#0D1117' : '#F3F4F6';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ClearanceService.listClearances({
        status: statusFilter === 'all' ? undefined : statusFilter,
        user_role: roleFilter === 'all' ? undefined : roleFilter,
        search: searchQuery.trim() || undefined,
      });
      setClearances(res.clearances || []);
    } catch (err: any) {
      console.error('Failed to load clearances:', err);
      Alert.alert('Error', 'Failed to load clearance tracking records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, roleFilter, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search users for Step 1
  const searchUsers = async (query: string) => {
    setUserSearchText(query);
    if (!query || query.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await api.get('/users/search', { params: { q: query.trim(), limit: 10 } });
      setUserSearchResults(res.data?.users || res.data || []);
    } catch {
      setUserSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleSelectUser = (u: any) => {
    if (selectedUsers.some((x) => x.id === u.id)) {
      setSelectedUsers(selectedUsers.filter((x) => x.id !== u.id));
    } else {
      setSelectedUsers([...selectedUsers, u]);
    }
  };

  // Step 1 -> Step 2 transition: validate eligibility and run category checks
  const proceedToStep2 = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one user to clear.');
      return;
    }

    setSubmitting(true);
    try {
      const check = await ClearanceService.checkEligibility(
        selectedUsers.map((u) => u.id),
        reasonCategory
      );

      const invalidItem = check.results.find((r) => !r.valid);
      if (invalidItem) {
        Alert.alert('Eligibility Blocked', invalidItem.error || 'One or more selected users are not eligible.');
        return;
      }

      // Run category checks for each user
      setCheckingCategories(true);
      const checksMap: Record<string, any> = {};
      for (const u of selectedUsers) {
        const catRes = await ClearanceService.checkCategoryStatus(u.id);
        checksMap[u.id] = catRes;
      }
      setCategoryChecks(checksMap);
      setInitiateStep(2);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Validation failed';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
      setCheckingCategories(false);
    }
  };

  // Step 2 -> Step 3 transition
  const proceedToStep3 = () => {
    // Verify if all users passed or admin override is checked
    let allClear = true;
    for (const u of selectedUsers) {
      const c = categoryChecks[u.id];
      if (c && !c.all_cleared) {
        allClear = false;
        break;
      }
    }

    if (!allClear && !adminOverride) {
      Alert.alert(
        'Outstanding Clearance Issues',
        'One or more users have outstanding library books or fee balances. To proceed, resolve the issues or enable Administrative Override with a documented rationale.'
      );
      return;
    }

    if (adminOverride && !overrideReason.trim()) {
      Alert.alert('Rationale Required', 'Please provide an override rationale before proceeding.');
      return;
    }

    setInitiateStep(3);
  };

  // Step 3 -> Step 4
  const proceedToStep4 = () => {
    setInitiateStep(4);
  };

  // Step 4: Submit Clearance Initiation & Finalize immediately if Admin
  const handleFinalizeInitiation = async () => {
    setSubmitting(true);
    try {
      const payload = {
        user_ids: selectedUsers.map((u) => u.id),
        reason_category: reasonCategory,
        reason_details: {
          notes: reasonNotes.trim() || undefined,
          forwarding_institution: forwardingInstitution.trim() || undefined,
        },
        allow_user_continuation: allowUserContinuation,
      };

      const res = await ClearanceService.initiateClearance(payload);
      const processId = res.process?.id;

      // Update step checks & finalize immediately if admin is completing the full flow
      if (processId) {
        await ClearanceService.updateStep(processId, {
          current_step: 4,
          library_cleared: true,
          finance_cleared: true,
          property_cleared: true,
          admin_override: adminOverride,
          override_reason: adminOverride ? overrideReason.trim() : undefined,
        });

        await ClearanceService.finalizeClearance(processId, {
          admin_override: adminOverride,
          override_reason: overrideReason.trim() || undefined,
        });
      }

      Alert.alert('Success', 'Clearance process finalized and archived successfully.');
      setShowInitiateModal(false);
      resetInitiateState();
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to initiate clearance';
      Alert.alert('Submission Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetInitiateState = () => {
    setInitiateStep(1);
    setSelectedUsers([]);
    setReasonCategory('graduation');
    setUserSearchText('');
    setUserSearchResults([]);
    setCategoryChecks({});
    setAdminOverride(false);
    setOverrideReason('');
    setReasonNotes('');
    setForwardingInstitution('');
    setAllowUserContinuation(false);
  };

  const handleLaunchPdfPreview = (proc: ClearanceProcess) => {
    const payload: PdfDocumentPayload = {
      documentType: 'clearance_confirmation',
      title: 'Clearance Certificate',
      fileName: `Clearance-Certificate-${proc.user?.full_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Record'}`,
      data: {
        institution_name: institutionName || 'Institutional Record',
        institution_logo: institutionLogo || null,
        process: {
          id: proc.id,
          reference_no: `CLR-${proc.id.slice(0, 8).toUpperCase()}`,
          reason_category: proc.reason_category,
          status: proc.status,
          created_at: proc.created_at,
          completed_at: proc.completed_at || proc.updated_at,
          admin_override: proc.admin_override,
          override_reason: proc.override_reason,
          library_cleared: proc.library_cleared,
          finance_cleared: proc.finance_cleared,
          property_cleared: proc.property_cleared,
        },
        user: {
          id: proc.user?.id,
          full_name: proc.user?.full_name,
          email: proc.user?.email,
          role: proc.user_role,
        },
        authorized_by: proc.completer?.full_name || (user as any)?.full_name || (user as any)?.name || 'Administrator',
      },
    };

    setPdfPayload(payload);
    setShowPdfModal(true);
  };

  const counts = useMemo(() => {
    return {
      in_progress: clearances.filter((c) => c.status === 'in_progress').length,
      completed: clearances.filter((c) => c.status === 'completed').length,
      cancelled: clearances.filter((c) => c.status === 'cancelled').length,
    };
  }, [clearances]);

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <UnifiedHeader
        title="Clearance & Leaving System"
        subtitle="End-to-end departure workflows, independent clearance checks, and certificates"
        role="admin"
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* KPI Cards & Header Action */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1, minWidth: 140, backgroundColor: card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase' }}>In Progress</Text>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#F59E0B', marginTop: 8 }}>{counts.in_progress}</Text>
          </View>

          <View style={{ flex: 1, minWidth: 140, backgroundColor: card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase' }}>Completed</Text>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#10B981', marginTop: 8 }}>{counts.completed}</Text>
          </View>

          <View style={{ flex: 1, minWidth: 140, backgroundColor: card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textSecondary, textTransform: 'uppercase' }}>Cancelled</Text>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#EF4444', marginTop: 8 }}>{counts.cancelled}</Text>
          </View>
        </View>

        {/* CTA Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 260, flexDirection: 'row', alignItems: 'center', backgroundColor: card, borderRadius: 12, borderWidth: 1, borderColor: border, paddingHorizontal: 12 }}>
            <Ionicons name="search" size={18} color={textSecondary} />
            <TextInput
              placeholder="Search by name, email, or reason..."
              placeholderTextColor={textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: textPrimary, fontSize: 14 }}
            />
          </View>

          <TouchableOpacity
            onPress={() => {
              resetInitiateState();
              setShowInitiateModal(true);
            }}
            style={{
              backgroundColor: '#FF6900',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingVertical: 12,
              paddingHorizontal: 18,
              borderRadius: 12,
              shadowColor: '#FF6900',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Initiate Clearance</Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter Tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, overflow: 'scroll' }}>
          {(['all', 'in_progress', 'completed', 'cancelled'] as const).map((st) => (
            <TouchableOpacity
              key={st}
              onPress={() => setStatusFilter(st)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 14,
                borderRadius: 20,
                backgroundColor: statusFilter === st ? '#FF6900' : card,
                borderWidth: 1,
                borderColor: statusFilter === st ? '#FF6900' : border,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: statusFilter === st ? '#FFFFFF' : textSecondary,
                  textTransform: 'capitalize',
                }}
              >
                {st.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Clearances List */}
        {loading ? (
          <ActivityIndicator size="large" color="#FF6900" style={{ marginVertical: 40 }} />
        ) : clearances.length === 0 ? (
          <View style={{ backgroundColor: card, padding: 36, borderRadius: 20, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={48} color={textSecondary} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: textPrimary, marginTop: 12 }}>No clearance records found</Text>
            <Text style={{ fontSize: 13, color: textSecondary, marginTop: 4, textAlign: 'center' }}>
              Initiate a student graduation, withdrawal, or staff departure to track the step-gated clearance process.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {clearances.map((proc) => {
              const reasonMeta = REASON_CATEGORIES.find((r) => r.key === proc.reason_category) || {
                label: proc.reason_category,
                color: '#6B7280',
              };

              const isCompleted = proc.status === 'completed';
              const isInProgress = proc.status === 'in_progress';

              return (
                <View
                  key={proc.id}
                  style={{
                    backgroundColor: card,
                    borderRadius: 18,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: border,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: `${reasonMeta.color}20`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: reasonMeta.color, fontWeight: '800', fontSize: 16 }}>
                          {proc.user?.full_name?.charAt(0).toUpperCase() || '?'}
                        </Text>
                      </View>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }}>
                            {proc.user?.full_name || 'Unknown User'}
                          </Text>
                          <View
                            style={{
                              backgroundColor: isDark ? '#30363D' : '#E5E7EB',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: textSecondary, textTransform: 'uppercase' }}>
                              {proc.user_role}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                          {proc.user?.email}
                        </Text>
                      </View>
                    </View>

                    {/* Status & Reason Badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ backgroundColor: `${reasonMeta.color}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: reasonMeta.color }}>
                          {reasonMeta.label}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: isInProgress ? '#F59E0B20' : isCompleted ? '#10B98120' : '#EF444420',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '800',
                            color: isInProgress ? '#F59E0B' : isCompleted ? '#10B981' : '#EF4444',
                            textTransform: 'uppercase',
                          }}
                        >
                          {proc.status.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Independent Category Clearance Checklist */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons
                        name={proc.library_cleared ? 'checkbox' : 'alert-circle'}
                        size={16}
                        color={proc.library_cleared ? '#10B981' : '#EF4444'}
                      />
                      <Text style={{ fontSize: 12, color: textSecondary, fontWeight: '600' }}>Library</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons
                        name={proc.finance_cleared ? 'checkbox' : 'alert-circle'}
                        size={16}
                        color={proc.finance_cleared ? '#10B981' : '#EF4444'}
                      />
                      <Text style={{ fontSize: 12, color: textSecondary, fontWeight: '600' }}>Finance</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons
                        name={proc.property_cleared ? 'checkbox' : 'alert-circle'}
                        size={16}
                        color={proc.property_cleared ? '#10B981' : '#EF4444'}
                      />
                      <Text style={{ fontSize: 12, color: textSecondary, fontWeight: '600' }}>Property</Text>
                    </View>

                    {proc.admin_override && (
                      <View style={{ backgroundColor: '#F59E0B15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#F59E0B' }}>OVERRIDDEN</Text>
                      </View>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedProcess(proc);
                        setShowDetailModal(true);
                      }}
                      style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: border }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: textPrimary }}>Step Details</Text>
                    </TouchableOpacity>

                    {isCompleted && (
                      <TouchableOpacity
                        onPress={() => handleLaunchPdfPreview(proc)}
                        style={{
                          backgroundColor: '#FF690015',
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Ionicons name="document-text" size={14} color="#FF6900" />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#FF6900' }}>Certificate PDF</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Multi-Step Initiation Modal ── */}
      <Modal visible={showInitiateModal} animationType="slide" transparent onRequestClose={() => setShowInitiateModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: card, borderRadius: 24, padding: 24, maxHeight: '90%', borderWidth: 1, borderColor: border }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>
                  Initiate Clearance — Step {initiateStep} of 4
                </Text>
                <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                  {initiateStep === 1 && 'Select User(s) and Clearance Reason'}
                  {initiateStep === 2 && 'Independent Category Checks (Library, Finance, Property)'}
                  {initiateStep === 3 && 'Reason-Specific Particulars'}
                  {initiateStep === 4 && 'Review & Finalize'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowInitiateModal(false)}>
                <Ionicons name="close" size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ── STEP 1 ── */}
              {initiateStep === 1 && (
                <View style={{ gap: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary }}>Clearance Reason Category</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {REASON_CATEGORIES.map((r) => (
                      <TouchableOpacity
                        key={r.key}
                        onPress={() => setReasonCategory(r.key)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 12,
                          backgroundColor: reasonCategory === r.key ? `${r.color}20` : inputBg,
                          borderWidth: 1.5,
                          borderColor: reasonCategory === r.key ? r.color : border,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: reasonCategory === r.key ? r.color : textPrimary }}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginTop: 8 }}>Search & Select User(s)</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: border }}>
                    <Ionicons name="search" size={18} color={textSecondary} />
                    <TextInput
                      placeholder="Search users by name or email..."
                      placeholderTextColor={textSecondary}
                      value={userSearchText}
                      onChangeText={searchUsers}
                      style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: textPrimary, fontSize: 14 }}
                    />
                    {searchingUsers && <ActivityIndicator size="small" color="#FF6900" />}
                  </View>

                  {/* Search Results */}
                  {userSearchResults.length > 0 && (
                    <View style={{ maxHeight: 180, borderRadius: 12, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
                      <ScrollView nestedScrollEnabled>
                        {userSearchResults.map((u) => {
                          const isSelected = selectedUsers.some((x) => x.id === u.id);
                          return (
                            <TouchableOpacity
                              key={u.id}
                              onPress={() => handleSelectUser(u)}
                              style={{
                                padding: 12,
                                backgroundColor: isSelected ? '#FF690015' : card,
                                borderBottomWidth: 1,
                                borderColor: border,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <View>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>{u.full_name}</Text>
                                <Text style={{ fontSize: 11, color: textSecondary }}>{u.email} • {u.role}</Text>
                              </View>
                              <Ionicons
                                name={isSelected ? 'checkbox' : 'square-outline'}
                                size={20}
                                color={isSelected ? '#FF6900' : textSecondary}
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Selected Pill List */}
                  {selectedUsers.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, marginBottom: 8 }}>
                        Selected Users ({selectedUsers.length})
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {selectedUsers.map((u) => (
                          <View
                            key={u.id}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: '#FF690015',
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: '#FF690030',
                            }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FF6900' }}>{u.full_name}</Text>
                            <TouchableOpacity onPress={() => handleSelectUser(u)}>
                              <Ionicons name="close" size={14} color="#FF6900" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* ── STEP 2: INDEPENDENT CHECKS ── */}
              {initiateStep === 2 && (
                <View style={{ gap: 16 }}>
                  {checkingCategories ? (
                    <ActivityIndicator size="large" color="#FF6900" style={{ marginVertical: 30 }} />
                  ) : (
                    selectedUsers.map((u) => {
                      const chk = categoryChecks[u.id];
                      return (
                        <View key={u.id} style={{ backgroundColor: inputBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: border }}>
                          <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary, marginBottom: 8 }}>
                            {u.full_name} ({u.role})
                          </Text>

                          {/* Library check */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Ionicons
                                name={chk?.library?.cleared ? 'checkmark-circle' : 'close-circle'}
                                size={20}
                                color={chk?.library?.cleared ? '#10B981' : '#EF4444'}
                              />
                              <Text style={{ fontSize: 13, color: textPrimary, fontWeight: '600' }}>Library Books</Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: chk?.library?.cleared ? '#10B981' : '#EF4444' }}>
                              {chk?.library?.cleared ? 'All Returned' : `${chk?.library?.unreturned_count} Book(s) Overdue`}
                            </Text>
                          </View>

                          {/* Finance check */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderColor: border }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Ionicons
                                name={chk?.finance?.cleared ? 'checkmark-circle' : 'close-circle'}
                                size={20}
                                color={chk?.finance?.cleared ? '#10B981' : '#EF4444'}
                              />
                              <Text style={{ fontSize: 13, color: textPrimary, fontWeight: '600' }}>Finance / Fee Account</Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: chk?.finance?.cleared ? '#10B981' : '#EF4444' }}>
                              {chk?.finance?.cleared ? 'Cleared (0 Balance)' : `Balance Due: ${chk?.finance?.balance}`}
                            </Text>
                          </View>

                          {/* Property check */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                              <Text style={{ fontSize: 13, color: textPrimary, fontWeight: '600' }}>Property & Equipment</Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>Cleared</Text>
                          </View>
                        </View>
                      );
                    })
                  )}

                  {/* Admin Override Section */}
                  <View style={{ backgroundColor: `${isDark ? '#2A1E0A' : '#FFFBEB'}`, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F59E0B' }}>
                    <TouchableOpacity
                      onPress={() => setAdminOverride(!adminOverride)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    >
                      <Ionicons
                        name={adminOverride ? 'checkbox' : 'square-outline'}
                        size={22}
                        color="#F59E0B"
                      />
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#B45309' }}>
                        Administrative Override
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 12, color: '#92400E', marginTop: 4 }}>
                      Check this box if clearing with pending obligations under executive authorization. Rationale is audited.
                    </Text>
                    {adminOverride && (
                      <TextInput
                        placeholder="Document authorized override rationale..."
                        placeholderTextColor="#B4530980"
                        value={overrideReason}
                        onChangeText={setOverrideReason}
                        style={{
                          backgroundColor: card,
                          borderWidth: 1,
                          borderColor: '#F59E0B',
                          borderRadius: 8,
                          padding: 10,
                          fontSize: 13,
                          color: textPrimary,
                          marginTop: 10,
                        }}
                      />
                    )}
                  </View>
                </View>
              )}

              {/* ── STEP 3: DETAILS ── */}
              {initiateStep === 3 && (
                <View style={{ gap: 16 }}>
                  {reasonCategory === 'transferred' && (
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>
                        Forwarding Institution Name
                      </Text>
                      <TextInput
                        placeholder="e.g. Alliance Academy International"
                        placeholderTextColor={textSecondary}
                        value={forwardingInstitution}
                        onChangeText={setForwardingInstitution}
                        style={{ backgroundColor: inputBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: border, color: textPrimary, fontSize: 14 }}
                      />
                    </View>
                  )}

                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 6 }}>
                      Departure Notes & Institutional Summary Details
                    </Text>
                    <TextInput
                      placeholder="Add departure commentary or administrative notes..."
                      placeholderTextColor={textSecondary}
                      value={reasonNotes}
                      onChangeText={setReasonNotes}
                      multiline
                      numberOfLines={4}
                      style={{ backgroundColor: inputBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: border, color: textPrimary, fontSize: 14, minHeight: 90, textAlignVertical: 'top' }}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={() => setAllowUserContinuation(!allowUserContinuation)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
                  >
                    <Ionicons
                      name={allowUserContinuation ? 'checkbox' : 'square-outline'}
                      size={20}
                      color="#FF6900"
                    />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary }}>
                      Allow student / parent to continue and view progress
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── STEP 4: REVIEW & CONFIRM ── */}
              {initiateStep === 4 && (
                <View style={{ gap: 16 }}>
                  <View style={{ backgroundColor: '#EF444415', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#EF444440' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="warning" size={20} color="#EF4444" />
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#DC2626' }}>
                        Irreversible Account Transition
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 4, lineHeight: 18 }}>
                      Finalizing will immediately convert students to read-and-download-only status and disable staff credentials. Active registers will update automatically.
                    </Text>
                  </View>

                  <View style={{ backgroundColor: inputBg, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: border }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: textPrimary }}>
                      Reason: {REASON_CATEGORIES.find((r) => r.key === reasonCategory)?.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>
                      Users cleared: {selectedUsers.map((u) => u.full_name).join(', ')}
                    </Text>
                    {adminOverride && (
                      <Text style={{ fontSize: 12, color: '#F59E0B', marginTop: 4, fontWeight: '700' }}>
                        Executive Override: {overrideReason}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderColor: border }}>
              {initiateStep > 1 ? (
                <TouchableOpacity
                  onPress={() => setInitiateStep(initiateStep - 1)}
                  style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: border }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary }}>Back</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}

              {initiateStep === 1 && (
                <TouchableOpacity
                  onPress={proceedToStep2}
                  disabled={submitting}
                  style={{ backgroundColor: '#FF6900', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 }}
                >
                  {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>Next: Category Checks</Text>}
                </TouchableOpacity>
              )}

              {initiateStep === 2 && (
                <TouchableOpacity
                  onPress={proceedToStep3}
                  style={{ backgroundColor: '#FF6900', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>Next: Particulars</Text>
                </TouchableOpacity>
              )}

              {initiateStep === 3 && (
                <TouchableOpacity
                  onPress={proceedToStep4}
                  style={{ backgroundColor: '#FF6900', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>Next: Review & Finalize</Text>
                </TouchableOpacity>
              )}

              {initiateStep === 4 && (
                <TouchableOpacity
                  onPress={handleFinalizeInitiation}
                  disabled={submitting}
                  style={{ backgroundColor: '#10B981', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 }}
                >
                  {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>Confirm & Finalize Departure</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Process Details Modal ── */}
      <Modal visible={showDetailModal} transparent animationType="fade" onRequestClose={() => setShowDetailModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: card, borderRadius: 20, padding: 20, maxHeight: '85%', borderWidth: 1, borderColor: border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: textPrimary }}>Clearance Audit History</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedProcess && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ gap: 12 }}>
                  <View style={{ backgroundColor: inputBg, padding: 12, borderRadius: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: textPrimary }}>{selectedProcess.user?.full_name}</Text>
                    <Text style={{ fontSize: 12, color: textSecondary }}>{selectedProcess.user?.email}</Text>
                    <Text style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>
                      Initiated by: {selectedProcess.initiated_by} • Reason: {selectedProcess.reason_category}
                    </Text>
                  </View>

                  <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary }}>Independent Gate Checklist</Text>
                  <View style={{ backgroundColor: inputBg, padding: 12, borderRadius: 12, gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: textPrimary }}>Library Returned:</Text>
                      <Text style={{ fontWeight: '700', color: selectedProcess.library_cleared ? '#10B981' : '#EF4444' }}>
                        {selectedProcess.library_cleared ? 'Cleared' : 'Blocked'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: textPrimary }}>Finance Fees:</Text>
                      <Text style={{ fontWeight: '700', color: selectedProcess.finance_cleared ? '#10B981' : '#EF4444' }}>
                        {selectedProcess.finance_cleared ? 'Cleared' : 'Blocked'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: textPrimary }}>Property & Equipment:</Text>
                      <Text style={{ fontWeight: '700', color: selectedProcess.property_cleared ? '#10B981' : '#EF4444' }}>
                        {selectedProcess.property_cleared ? 'Cleared' : 'Blocked'}
                      </Text>
                    </View>
                  </View>

                  {selectedProcess.completed_at && (
                    <View style={{ backgroundColor: '#10B98115', padding: 12, borderRadius: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>
                        Completed on {new Date(selectedProcess.completed_at).toLocaleDateString()}
                      </Text>
                      <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                        Authorized by: {selectedProcess.completer?.full_name || 'Administrator'}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Web PDF Preview Modal */}
      <PdfPreviewModal
        visible={showPdfModal}
        payload={pdfPayload}
        onClose={() => {
          setShowPdfModal(false);
          setPdfPayload(null);
        }}
      />
    </View>
  );
}
