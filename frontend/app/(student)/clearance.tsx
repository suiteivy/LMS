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
import { api } from '@/services/api';
import { ClearanceService, ClearanceProcess, CategoryStatusResult } from '@/services/ClearanceService';
import { PdfPreviewModal } from '@/components/pdf/PdfPreviewModal';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  HelpCircle,
  Library,
  ShieldCheck,
  Users,
  Wallet,
  XCircle,
  AlertTriangle,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

export default function StudentClearanceScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [activeProcess, setActiveProcess] = useState<ClearanceProcess | null>(null);
  const [categoryStatus, setCategoryStatus] = useState<CategoryStatusResult | null>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  // Form State
  const [reasonCategory, setReasonCategory] = useState<'transfer' | 'relocation' | 'graduation' | 'other'>('transfer');
  const [targetSchool, setTargetSchool] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [reasonNotes, setReasonNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // PDF Preview State
  const [previewVisible, setPreviewVisible] = useState(false);

  const bg = isDark ? '#0D1117' : '#F6F8FA';
  const card = isDark ? '#161B22' : '#FFFFFF';
  const border = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const orange = '#FF6900';

  const loadData = async () => {
    try {
      setLoading(true);
      const [profRes, activeRes] = await Promise.all([
        api.get('/student/me/profile').catch(() => ({ data: { data: null } })),
        ClearanceService.getActiveClearance(),
      ]);

      if (profRes.data?.data) {
        setStudentProfile(profRes.data.data);
      }

      if (activeRes?.active && activeRes.clearance) {
        setActiveProcess(activeRes.clearance);
        // Load live department checks
        if (user?.id) {
          const catRes = await ClearanceService.checkCategoryStatus(user.id).catch(() => null);
          if (catRes) setCategoryStatus(catRes);
        }
      } else {
        setActiveProcess(null);
      }
    } catch (err: any) {
      console.error('Error loading clearance info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const isFinalLevel = Boolean(
    studentProfile?.academic?.current_class?.is_final_level ?? false
  );

  const handleInitiate = async () => {
    if (reasonCategory === 'graduation' && !isFinalLevel) {
      Alert.alert(
        'Graduation Ineligible',
        'Graduation clearance is strictly restricted to students in final graduating classes. Your current class is not marked as a graduating level.'
      );
      return;
    }

    if (reasonCategory === 'transfer' && !targetSchool.trim()) {
      Alert.alert('Required Field', 'Please enter the destination or transfer school name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await ClearanceService.initiateClearance({
        user_ids: [user?.id || ''],
        reason_category: reasonCategory,
        reason_details: {
          target_school: targetSchool.trim(),
          expected_date: expectedDate.trim() || new Date().toISOString().split('T')[0],
          notes: reasonNotes.trim(),
        },
        allow_user_continuation: true,
      });

      if (res.resumed) {
        Toast.show({
          type: 'info',
          text1: 'Clearance Resumed',
          text2: 'An existing active clearance request was found and loaded.',
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Clearance Initiated',
          text2: 'Your institution clearance request has been successfully registered.',
        });
      }

      await loadData();
    } catch (err: any) {
      Alert.alert(
        'Clearance Error',
        err?.response?.data?.error || err.message || 'Failed to start clearance process.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelProcess = async () => {
    if (!activeProcess) return;

    Alert.alert(
      'Cancel Clearance',
      'Are you sure you want to cancel your ongoing clearance process?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await ClearanceService.cancelClearance(activeProcess.id, 'Cancelled by student');
              Toast.show({
                type: 'success',
                text1: 'Clearance Cancelled',
                text2: 'Your clearance process has been withdrawn.',
              });
              loadData();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to cancel clearance.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={orange} />
        <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13, fontWeight: '600' }}>
          Loading clearance status...
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
            Student Clearance & Leaving
          </Text>
          <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '500' }}>
            Official institutional departure and records sign-off
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, maxWidth: 900, alignSelf: 'center', width: '100%' }}>
        {activeProcess ? (
          /* ACTIVE PROCESS VIEW */
          <View style={{ gap: 20 }}>
            {/* Status Hero Card */}
            <View
              style={{
                backgroundColor: card,
                borderRadius: 18,
                padding: 22,
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '900' }}>
                      Clearance in Progress
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                        borderRadius: 12,
                        backgroundColor:
                          activeProcess.status === 'completed'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(255, 105, 0, 0.15)',
                      }}
                    >
                      <Text
                        style={{
                          color: activeProcess.status === 'completed' ? '#10B981' : orange,
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
                    Reason: <Text style={{ color: textPrimary, fontWeight: '700' }}>{activeProcess.reason_category.toUpperCase()}</Text>
                    {activeProcess.reason_details?.target_school && ` • Target: ${activeProcess.reason_details.target_school}`}
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                    Initiated: {new Date(activeProcess.created_at).toLocaleDateString()} by {activeProcess.initiated_by}
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
                    <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>Cancel Request</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Progress Steps Timeline */}
              <View style={{ flexDirection: 'row', marginTop: 24, justifyContent: 'space-between', alignItems: 'center' }}>
                {[
                  { step: 1, label: 'Initiated', done: true },
                  {
                    step: 2,
                    label: 'Department Checks',
                    done: activeProcess.library_cleared && activeProcess.finance_cleared && activeProcess.property_cleared,
                  },
                  { step: 3, label: 'Admin Approval', done: activeProcess.status === 'completed' },
                  { step: 4, label: 'Finalized', done: activeProcess.status === 'completed' },
                ].map((s, idx, arr) => (
                  <React.Fragment key={s.step}>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 14,
                          backgroundColor: s.done ? '#10B981' : isDark ? '#21262D' : '#E5E7EB',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {s.done ? (
                          <CheckCircle size={16} color="#FFFFFF" />
                        ) : (
                          <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '800' }}>{s.step}</Text>
                        )}
                      </View>
                      <Text
                        style={{
                          color: s.done ? textPrimary : textSecondary,
                          fontSize: 10,
                          fontWeight: '700',
                          marginTop: 6,
                          textAlign: 'center',
                        }}
                      >
                        {s.label}
                      </Text>
                    </View>
                    {idx < arr.length - 1 && (
                      <View
                        style={{
                          height: 2,
                          flex: 1,
                          backgroundColor: arr[idx + 1].done ? '#10B981' : isDark ? '#21262D' : '#E5E7EB',
                          marginTop: -18,
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>

            {/* Department Clearance Verifications */}
            <View style={{ gap: 12 }}>
              <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '800' }}>
                Department Verification Status
              </Text>

              {/* Library Clearance Card */}
              <View
                style={{
                  backgroundColor: card,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: activeProcess.library_cleared ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Library size={22} color={activeProcess.library_cleared ? '#10B981' : '#EF4444'} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>Library Clearance</Text>
                    <Text
                      style={{
                        color: activeProcess.library_cleared ? '#10B981' : '#EF4444',
                        fontWeight: '800',
                        fontSize: 12,
                      }}
                    >
                      {activeProcess.library_cleared ? 'CLEARED' : 'PENDING BOOKS'}
                    </Text>
                  </View>
                  <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                    {categoryStatus?.library
                      ? categoryStatus.library.unreturned_count > 0
                        ? `${categoryStatus.library.unreturned_count} book(s) currently unreturned`
                        : 'All borrowed books returned'
                      : activeProcess.library_cleared
                      ? 'No outstanding book loans'
                      : 'Outstanding library loans must be returned to the librarian.'}
                  </Text>
                  {activeProcess.library_notes && (
                    <Text style={{ color: textSecondary, fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>
                      Librarian Notes: {activeProcess.library_notes}
                    </Text>
                  )}
                </View>
              </View>

              {/* Finance Clearance Card */}
              <View
                style={{
                  backgroundColor: card,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: activeProcess.finance_cleared ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Wallet size={22} color={activeProcess.finance_cleared ? '#10B981' : '#EF4444'} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>Bursary & Finance</Text>
                    <Text
                      style={{
                        color: activeProcess.finance_cleared ? '#10B981' : '#EF4444',
                        fontWeight: '800',
                        fontSize: 12,
                      }}
                    >
                      {activeProcess.finance_cleared ? 'CLEARED' : 'OUTSTANDING BALANCE'}
                    </Text>
                  </View>
                  <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                    {categoryStatus?.finance
                      ? categoryStatus.finance.balance > 0
                        ? `Outstanding balance of $${categoryStatus.finance.balance.toFixed(2)}`
                        : 'Zero outstanding tuition / dues balance'
                      : activeProcess.finance_cleared
                      ? 'All accounts settled'
                      : 'Fee balances must be reconciled with the Bursar.'}
                  </Text>
                  {activeProcess.finance_notes && (
                    <Text style={{ color: textSecondary, fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>
                      Finance Notes: {activeProcess.finance_notes}
                    </Text>
                  )}
                </View>
              </View>

              {/* Property & Equipment Card */}
              <View
                style={{
                  backgroundColor: card,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: activeProcess.property_cleared ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={22} color={activeProcess.property_cleared ? '#10B981' : '#EF4444'} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>Property & Facilities</Text>
                    <Text
                      style={{
                        color: activeProcess.property_cleared ? '#10B981' : '#EF4444',
                        fontWeight: '800',
                        fontSize: 12,
                      }}
                    >
                      {activeProcess.property_cleared ? 'CLEARED' : 'PENDING RETURN'}
                    </Text>
                  </View>
                  <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                    Handover of lab materials, lockers, sports gear, and institutional items.
                  </Text>
                  {activeProcess.property_notes && (
                    <Text style={{ color: textSecondary, fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>
                      Facilities Notes: {activeProcess.property_notes}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Final Certificate Action */}
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
                  Clearance Officially Completed
                </Text>
                <Text style={{ color: textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
                  All institutional obligations have been settled and approved by administration. You can now view and download your official clearance confirmation certificate.
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
                    Preview & Download Certificate
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* INITIATION FORM */
          <View style={{ gap: 20 }}>
            {/* Information Notice */}
            <View
              style={{
                backgroundColor: isDark ? '#1C2128' : '#F0F9FF',
                borderRadius: 16,
                padding: 18,
                borderWidth: 1,
                borderColor: isDark ? '#388BFD33' : '#BAE6FD',
              }}
            >
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <HelpCircle size={20} color="#0284C7" />
                <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>
                  Institutional Departure Protocol
                </Text>
              </View>
              <Text style={{ color: textSecondary, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
                Initiating a clearance process registers your intent to transfer, graduate, or withdraw. This coordinates independent verifications with the Library, Bursary/Finance, and Facilities before your final records and transfer certificates are compiled.
              </Text>
            </View>

            {/* Current Class Context Card */}
            {studentProfile && (
              <View
                style={{
                  backgroundColor: card,
                  borderRadius: 14,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: border,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                    Current Enrolled Level
                  </Text>
                  <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '900', marginTop: 2 }}>
                    {studentProfile.academic?.current_class?.name || 'Assigned Class'}
                  </Text>
                </View>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    backgroundColor: isFinalLevel ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                  }}
                >
                  <Text
                    style={{
                      color: isFinalLevel ? '#10B981' : textSecondary,
                      fontSize: 11,
                      fontWeight: '800',
                    }}
                  >
                    {isFinalLevel ? 'Graduating Final Level' : 'Non-Graduating Level'}
                  </Text>
                </View>
              </View>
            )}

            {/* Reason Selection */}
            <View style={{ backgroundColor: card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: border, gap: 16 }}>
              <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '800' }}>
                1. Select Reason for Departure
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { key: 'transfer', label: 'School Transfer' },
                  { key: 'relocation', label: 'Family Relocation' },
                  { key: 'graduation', label: 'Graduation', requiresFinal: true },
                  { key: 'other', label: 'Other Withdrawal' },
                ].map((item) => {
                  const isSelected = reasonCategory === item.key;
                  const isBlocked = item.requiresFinal && !isFinalLevel;

                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => {
                        if (isBlocked) {
                          Alert.alert(
                            'Graduation Option Restricted',
                            'Graduation clearance is only permissible if you are enrolled in a recognized graduating final level.'
                          );
                          return;
                        }
                        setReasonCategory(item.key as any);
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 12,
                        backgroundColor: isSelected
                          ? orange
                          : isBlocked
                          ? (isDark ? '#21262D' : '#F3F4F6')
                          : (isDark ? '#1C2128' : '#F9FAFB'),
                        borderWidth: 1,
                        borderColor: isSelected ? orange : border,
                        opacity: isBlocked ? 0.5 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : isBlocked ? textSecondary : textPrimary,
                          fontSize: 12,
                          fontWeight: '800',
                        }}
                      >
                        {item.label} {isBlocked && '(Locked)'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {reasonCategory === 'graduation' && !isFinalLevel && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 8 }}>
                  <AlertTriangle size={16} color="#EF4444" />
                  <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>
                    Your current level is not configured as a graduating class.
                  </Text>
                </View>
              )}

              {/* Destination School Name */}
              {(reasonCategory === 'transfer' || reasonCategory === 'relocation') && (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                    Destination / Transfer School *
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
                    placeholder="Enter new school or institution name"
                    placeholderTextColor={textSecondary}
                    value={targetSchool}
                    onChangeText={setTargetSchool}
                  />
                </View>
              )}

              {/* Expected Date */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                  Expected Departure Date (YYYY-MM-DD)
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

              {/* Notes */}
              <View style={{ gap: 6 }}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                  Additional Details / Notes
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
                  placeholder="Provide any relevant context for administration..."
                  placeholderTextColor={textSecondary}
                  value={reasonNotes}
                  onChangeText={setReasonNotes}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleInitiate}
                disabled={submitting}
                style={{
                  backgroundColor: orange,
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
                    Submit Clearance Request
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
          title="Official Clearance Certificate"
          fileName={`clearance-certificate-${user?.id}.pdf`}
        />
      )}
    </View>
  );
}
