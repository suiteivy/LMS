import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ClearanceService, ClearanceProcess, CategoryStatusResult } from '@/services/ClearanceService';
import { PdfPreviewModal } from '@/components/pdf/PdfPreviewModal';
import {
  ArrowLeft,
  Briefcase,
  Building,
  CheckCircle,
  Eye,
  FileCheck,
  HelpCircle,
  Library,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

export default function TeacherClearanceScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [activeProcess, setActiveProcess] = useState<ClearanceProcess | null>(null);
  const [categoryStatus, setCategoryStatus] = useState<CategoryStatusResult | null>(null);

  // Form State
  const [reasonCategory, setReasonCategory] = useState<'resignation' | 'retirement' | 'contract_end' | 'relocation' | 'other'>('resignation');
  const [expectedDate, setExpectedDate] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // PDF Preview State
  const [previewVisible, setPreviewVisible] = useState(false);

  const bg = isDark ? '#0D1117' : '#F6F8FA';
  const card = isDark ? '#161B22' : '#FFFFFF';
  const border = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const blue = '#2563EB';

  const loadData = async () => {
    try {
      setLoading(true);
      const activeRes = await ClearanceService.getActiveClearance();

      if (activeRes?.active && activeRes.clearance) {
        setActiveProcess(activeRes.clearance);
        if (user?.id) {
          const catRes = await ClearanceService.checkCategoryStatus(user.id).catch(() => null);
          if (catRes) setCategoryStatus(catRes);
        }
      } else {
        setActiveProcess(null);
      }
    } catch (err: any) {
      console.error('Error loading teacher clearance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const handleInitiate = async () => {
    setSubmitting(true);
    try {
      const res = await ClearanceService.initiateClearance({
        user_ids: [user?.id || ''],
        reason_category: reasonCategory,
        reason_details: {
          expected_date: expectedDate.trim() || new Date().toISOString().split('T')[0],
          notes: handoverNotes.trim(),
        },
        allow_user_continuation: true,
      });

      if (res.resumed) {
        Toast.show({
          type: 'info',
          text1: 'Clearance Resumed',
          text2: 'An existing active staff clearance process was resumed.',
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Departure Initiated',
          text2: 'Your staff clearance process has been submitted to administration.',
        });
      }

      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || err.message || 'Failed to initiate departure clearance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelProcess = async () => {
    if (!activeProcess) return;

    Alert.alert(
      'Cancel Clearance',
      'Are you sure you want to withdraw your staff clearance request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await ClearanceService.cancelClearance(activeProcess.id, 'Withdrawn by staff member');
              Toast.show({
                type: 'success',
                text1: 'Clearance Withdrawn',
                text2: 'Your staff clearance request has been cancelled.',
              });
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to cancel.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={blue} />
        <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13, fontWeight: '600' }}>
          Loading staff clearance status...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: Platform.OS === 'ios' ? 56 : 24,
          paddingBottom: 16,
          backgroundColor: card,
          borderBottomWidth: 1,
          borderBottomColor: border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            padding: 8,
            borderRadius: 10,
            backgroundColor: isDark ? '#21262D' : '#F3F4F6',
          }}
        >
          <ArrowLeft size={18} color={textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '900' }}>
            Faculty Departure & Clearance
          </Text>
          <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '500' }}>
            Official handover, department sign-offs, and service records
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, maxWidth: 900, alignSelf: 'center', width: '100%' }}>
        {activeProcess ? (
          /* ACTIVE PROCESS VIEW */
          <View style={{ gap: 20 }}>
            {/* Status Card */}
            <View style={{ backgroundColor: card, borderRadius: 18, padding: 22, borderWidth: 1, borderColor: border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '900' }}>
                      Staff Departure in Progress
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                        borderRadius: 12,
                        backgroundColor:
                          activeProcess.status === 'completed'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(37, 99, 235, 0.15)',
                      }}
                    >
                      <Text
                        style={{
                          color: activeProcess.status === 'completed' ? '#10B981' : blue,
                          fontSize: 11,
                          fontWeight: '800',
                          textTransform: 'uppercase',
                        }}
                      >
                        {activeProcess.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: textSecondary, fontSize: 12, marginTop: 4 }}>
                    Departure Category: <Text style={{ color: textPrimary, fontWeight: '700' }}>{activeProcess.reason_category.toUpperCase()}</Text>
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                    Initiated: {new Date(activeProcess.created_at).toLocaleDateString()}
                  </Text>
                </View>

                {activeProcess.status === 'in_progress' && (
                  <TouchableOpacity
                    onPress={handleCancelProcess}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#EF4444',
                    }}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>Withdraw Request</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Account Transition Notice */}
              <View
                style={{
                  marginTop: 18,
                  padding: 12,
                  borderRadius: 10,
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
                  borderWidth: 1,
                  borderColor: isDark ? '#B91C1C55' : '#FCA5A5',
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <ShieldAlert size={18} color="#EF4444" />
                <Text style={{ color: textPrimary, fontSize: 12, flex: 1, lineHeight: 17 }}>
                  <Text style={{ fontWeight: '800' }}>Notice: </Text>
                  Upon final admin approval, your active staff account will transition to inactive and system access will conclude.
                </Text>
              </View>
            </View>

            {/* Department Checks */}
            <View style={{ gap: 12 }}>
              <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '800' }}>
                Handover & Department Sign-Offs
              </Text>

              {/* Library Card */}
              <View style={{ backgroundColor: card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: activeProcess.library_cleared ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Library size={22} color={activeProcess.library_cleared ? '#10B981' : '#EF4444'} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>Library Loans</Text>
                    <Text style={{ color: activeProcess.library_cleared ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: 12 }}>
                      {activeProcess.library_cleared ? 'CLEARED' : 'PENDING RETURNS'}
                    </Text>
                  </View>
                  <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                    Return of reference texts, curricula materials, and library resources.
                  </Text>
                </View>
              </View>

              {/* Finance / Payroll Card */}
              <View style={{ backgroundColor: card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: activeProcess.finance_cleared ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={22} color={activeProcess.finance_cleared ? '#10B981' : '#EF4444'} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>Bursary & Accounts</Text>
                    <Text style={{ color: activeProcess.finance_cleared ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: 12 }}>
                      {activeProcess.finance_cleared ? 'CLEARED' : 'PENDING SETTLEMENT'}
                    </Text>
                  </View>
                  <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                    Final expense claims, salary reconciliations, and staff loan accounts.
                  </Text>
                </View>
              </View>

              {/* Facilities / IT Handover Card */}
              <View style={{ backgroundColor: card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: activeProcess.property_cleared ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={22} color={activeProcess.property_cleared ? '#10B981' : '#EF4444'} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>IT & Institutional Property</Text>
                    <Text style={{ color: activeProcess.property_cleared ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: 12 }}>
                      {activeProcess.property_cleared ? 'CLEARED' : 'PENDING HANDOVER'}
                    </Text>
                  </View>
                  <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                    Laptop, office keys, laboratory items, and academic assessment grade sheets.
                  </Text>
                </View>
              </View>
            </View>

            {/* Completed Certificate */}
            {activeProcess.status === 'completed' && (
              <View
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: '#10B981',
                  alignItems: 'center',
                }}
              >
                <FileCheck size={36} color="#10B981" />
                <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '900', marginTop: 8 }}>
                  Faculty Clearance Completed
                </Text>
                <Text style={{ color: textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
                  All department handovers have been officially verified. Your institutional service clearance confirmation certificate is available below.
                </Text>

                <TouchableOpacity
                  onPress={() => setPreviewVisible(true)}
                  style={{
                    backgroundColor: '#10B981',
                    borderRadius: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Eye size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                    Preview & Download Clearance Letter
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* INITIATION FORM */
          <View style={{ gap: 20 }}>
            {/* Info Card */}
            <View
              style={{
                backgroundColor: isDark ? '#1C2128' : '#EFF6FF',
                borderRadius: 16,
                padding: 18,
                borderWidth: 1,
                borderColor: isDark ? '#388BFD33' : '#BFDBFE',
              }}
            >
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <HelpCircle size={20} color={blue} />
                <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>
                  Faculty Handover & Clearance Protocol
                </Text>
              </View>
              <Text style={{ color: textSecondary, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
                Initiating departure notifies academic administration, the bursary, and IT facilities to begin orderly handovers of classroom materials, grading submissions, and institutional equipment.
              </Text>
            </View>

            {/* Departure Reason Selection */}
            <View style={{ backgroundColor: card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: border, gap: 16 }}>
              <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '800' }}>
                1. Nature of Departure
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { key: 'resignation', label: 'Resignation' },
                  { key: 'contract_end', label: 'End of Contract' },
                  { key: 'retirement', label: 'Retirement' },
                  { key: 'relocation', label: 'Relocation' },
                  { key: 'other', label: 'Other' },
                ].map((item) => {
                  const isSelected = reasonCategory === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setReasonCategory(item.key as any)}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 12,
                        backgroundColor: isSelected ? blue : (isDark ? '#1C2128' : '#F9FAFB'),
                        borderWidth: 1,
                        borderColor: isSelected ? blue : border,
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : textPrimary,
                          fontSize: 12,
                          fontWeight: '800',
                        }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Expected Date */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                  Expected Effective Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isDark ? '#0D1117' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: textPrimary,
                    fontSize: 13,
                  }}
                  placeholder={new Date().toISOString().split('T')[0]}
                  placeholderTextColor={textSecondary}
                  value={expectedDate}
                  onChangeText={setExpectedDate}
                />
              </View>

              {/* Handover & Notes */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                  Handover Plan & Department Notes
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isDark ? '#0D1117' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: textPrimary,
                    fontSize: 13,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                  multiline
                  placeholder="Detail class coverage, examination mark handovers, and property status..."
                  placeholderTextColor={textSecondary}
                  value={handoverNotes}
                  onChangeText={setHandoverNotes}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleInitiate}
                disabled={submitting}
                style={{
                  backgroundColor: blue,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginTop: 6,
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '900' }}>
                    Submit Departure Request
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Official PDF Preview Modal */}
      {activeProcess && (
        <PdfPreviewModal
          visible={previewVisible}
          onClose={() => setPreviewVisible(false)}
          documentType="clearance_confirmation"
          entityId={activeProcess.id}
          title="Faculty Clearance Certificate"
          fileName={`faculty-clearance-${user?.id}.pdf`}
        />
      )}
    </View>
  );
}
