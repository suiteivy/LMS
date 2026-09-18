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
import { ParentService } from '@/services/ParentService';
import { ClearanceService, ClearanceProcess, CategoryStatusResult } from '@/services/ClearanceService';
import { PdfPreviewModal } from '@/components/pdf/PdfPreviewModal';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Eye,
  FileCheck,
  HelpCircle,
  Library,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

export default function ParentClearanceScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [activeProcess, setActiveProcess] = useState<ClearanceProcess | null>(null);
  const [categoryStatus, setCategoryStatus] = useState<CategoryStatusResult | null>(null);

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
  const emerald = '#059669';

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await ParentService.getLinkedStudents();
      const list = Array.isArray(res) ? res : res?.data || [];
      setChildren(list);
      if (list.length > 0 && !selectedChild) {
        setSelectedChild(list[0]);
      }
    } catch (err) {
      console.error('Failed to load children:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  const loadChildClearance = async (childUserId: string) => {
    try {
      const activeRes = await ClearanceService.getActiveClearance(childUserId);
      if (activeRes?.active && activeRes.clearance) {
        setActiveProcess(activeRes.clearance);
        const catRes = await ClearanceService.checkCategoryStatus(childUserId).catch(() => null);
        if (catRes) setCategoryStatus(catRes);
      } else {
        setActiveProcess(null);
        setCategoryStatus(null);
      }
    } catch (err) {
      console.error('Failed to check child clearance:', err);
    }
  };

  useEffect(() => {
    const childUserId = selectedChild?.user_id || selectedChild?.user?.id || selectedChild?.id;
    if (childUserId) {
      loadChildClearance(childUserId);
    }
  }, [selectedChild]);

  const isFinalLevel = Boolean(
    selectedChild?.class?.is_final_level ?? false
  );

  const handleInitiate = async () => {
    const childUserId = selectedChild?.user_id || selectedChild?.user?.id || selectedChild?.id;
    if (!childUserId) {
      Alert.alert('Error', 'Please select a valid child.');
      return;
    }

    if (reasonCategory === 'graduation' && !isFinalLevel) {
      Alert.alert(
        'Graduation Restricted',
        'Graduation clearance is strictly limited to students in final graduating classes. This student is currently in a non-final class level.'
      );
      return;
    }

    if (reasonCategory === 'transfer' && !targetSchool.trim()) {
      Alert.alert('Required', 'Please specify the destination or transfer school name.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await ClearanceService.initiateClearance({
        user_ids: [childUserId],
        reason_category: reasonCategory,
        reason_details: {
          target_school: targetSchool.trim(),
          expected_date: expectedDate.trim() || new Date().toISOString().split('T')[0],
          notes: reasonNotes.trim(),
          parent_initiator_id: user?.id,
        },
        allow_user_continuation: true,
      });

      if (res.resumed) {
        Toast.show({
          type: 'info',
          text1: 'Clearance Resumed',
          text2: 'An existing active clearance request for your child was loaded.',
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Clearance Request Submitted',
          text2: 'Your clearance request is now being processed by school administration.',
        });
      }

      await loadChildClearance(childUserId);
    } catch (err: any) {
      Alert.alert('Submission Error', err?.response?.data?.error || err.message || 'Failed to submit clearance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelProcess = async () => {
    if (!activeProcess) return;

    Alert.alert(
      'Cancel Clearance Request',
      'Are you sure you want to withdraw this clearance request for your child?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              await ClearanceService.cancelClearance(activeProcess.id, 'Withdrawn by parent');
              Toast.show({
                type: 'success',
                text1: 'Clearance Cancelled',
                text2: 'Clearance request withdrawn successfully.',
              });
              const childUserId = selectedChild?.user_id || selectedChild?.user?.id || selectedChild?.id;
              if (childUserId) loadChildClearance(childUserId);
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
        <ActivityIndicator size="large" color={emerald} />
        <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13, fontWeight: '600' }}>
          Loading clearance overview...
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
            Coordinate departure records, school handovers, and transfer letters
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, maxWidth: 900, alignSelf: 'center', width: '100%' }}>
        {/* Child Selector */}
        {children.length > 1 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8 }}>
              Select Child:
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {children.map((c) => {
                const isSelected = selectedChild?.id === c.id;
                const name = c.first_name ? `${c.first_name} ${c.last_name || ''}` : c.name || 'Child';
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setSelectedChild(c)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      backgroundColor: isSelected ? emerald : (isDark ? '#1C2128' : '#F3F4F6'),
                      borderWidth: 1,
                      borderColor: isSelected ? emerald : border,
                    }}
                  >
                    <Text style={{ color: isSelected ? '#FFFFFF' : textPrimary, fontSize: 12, fontWeight: '800' }}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {selectedChild && (
          <View style={{ gap: 20 }}>
            {/* Child Header Card */}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    backgroundColor: isDark ? '#21262D' : '#E5E7EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User size={20} color={textPrimary} />
                </View>
                <View>
                  <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '900' }}>
                    {selectedChild.first_name ? `${selectedChild.first_name} ${selectedChild.last_name || ''}` : selectedChild.name || 'Student'}
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: 12 }}>
                    Class: {selectedChild.class?.name || 'Assigned Class'}
                  </Text>
                </View>
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
                  {isFinalLevel ? 'Graduating Final Class' : 'Non-Graduating Class'}
                </Text>
              </View>
            </View>

            {activeProcess ? (
              /* ACTIVE CLEARANCE PROCESS */
              <View style={{ gap: 20 }}>
                {/* Status Hero Card */}
                <View style={{ backgroundColor: card, borderRadius: 18, padding: 22, borderWidth: 1, borderColor: border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '900' }}>
                          Clearance Status
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                            borderRadius: 12,
                            backgroundColor:
                              activeProcess.status === 'completed'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(5, 150, 105, 0.15)',
                          }}
                        >
                          <Text
                            style={{
                              color: activeProcess.status === 'completed' ? '#10B981' : emerald,
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
                        <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700' }}>Cancel Request</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Steps Timeline */}
                  <View style={{ flexDirection: 'row', marginTop: 24, justifyContent: 'space-between', alignItems: 'center' }}>
                    {[
                      { step: 1, label: 'Initiated', done: true },
                      {
                        step: 2,
                        label: 'Dept Checks',
                        done: activeProcess.library_cleared && activeProcess.finance_cleared && activeProcess.property_cleared,
                      },
                      { step: 3, label: 'Admin Review', done: activeProcess.status === 'completed' },
                      { step: 4, label: 'Certificate', done: activeProcess.status === 'completed' },
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
                          <Text style={{ color: s.done ? textPrimary : textSecondary, fontSize: 10, fontWeight: '700', marginTop: 6, textAlign: 'center' }}>
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

                {/* Live Department Checks */}
                <View style={{ gap: 12 }}>
                  <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '800' }}>
                    Department Clearance Requirements
                  </Text>

                  {/* Library Card */}
                  <View style={{ backgroundColor: card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: activeProcess.library_cleared ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Library size={22} color={activeProcess.library_cleared ? '#10B981' : '#EF4444'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>Library Clearance</Text>
                        <Text style={{ color: activeProcess.library_cleared ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: 12 }}>
                          {activeProcess.library_cleared ? 'CLEARED' : 'PENDING BOOKS'}
                        </Text>
                      </View>
                      <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                        {categoryStatus?.library && categoryStatus.library.unreturned_count > 0
                          ? `${categoryStatus.library.unreturned_count} book(s) must be returned to the library.`
                          : activeProcess.library_cleared
                          ? 'No active book loans.'
                          : 'Student must return all loaned books to the library.'}
                      </Text>
                    </View>
                  </View>

                  {/* Finance Card */}
                  <View style={{ backgroundColor: card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: activeProcess.finance_cleared ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Wallet size={22} color={activeProcess.finance_cleared ? '#10B981' : '#EF4444'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>Bursary & Tuition Balance</Text>
                        <Text style={{ color: activeProcess.finance_cleared ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: 12 }}>
                          {activeProcess.finance_cleared ? 'CLEARED' : 'OUTSTANDING DUES'}
                        </Text>
                      </View>
                      <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                        {categoryStatus?.finance && categoryStatus.finance.balance > 0
                          ? `Outstanding tuition / fee balance: $${categoryStatus.finance.balance.toFixed(2)}`
                          : activeProcess.finance_cleared
                          ? 'All tuition and student balances are cleared.'
                          : 'Outstanding balances must be settled with the bursar.'}
                      </Text>
                    </View>
                  </View>

                  {/* Property Card */}
                  <View style={{ backgroundColor: card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: activeProcess.property_cleared ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck size={22} color={activeProcess.property_cleared ? '#10B981' : '#EF4444'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>Facilities & Equipment</Text>
                        <Text style={{ color: activeProcess.property_cleared ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: 12 }}>
                          {activeProcess.property_cleared ? 'CLEARED' : 'PENDING RETURN'}
                        </Text>
                      </View>
                      <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                        Return of school locker keys, sports uniforms, and lab equipment.
                      </Text>
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
                      All requirements have been signed off. You can preview and download your child's official clearance certificate.
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
                {/* Info Card */}
                <View
                  style={{
                    backgroundColor: isDark ? '#1C2128' : '#ECFDF5',
                    borderRadius: 16,
                    padding: 18,
                    borderWidth: 1,
                    borderColor: isDark ? '#05966933' : '#A7F3D0',
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <HelpCircle size={20} color={emerald} />
                    <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>
                      Parent-Initiated Clearance & Leaving
                    </Text>
                  </View>
                  <Text style={{ color: textSecondary, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
                    If you are relocating, transferring schools, or your child is graduating, submit a clearance request here to ensure seamless record transfer and settlement of accounts.
                  </Text>
                </View>

                {/* Form */}
                <View style={{ backgroundColor: card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: border, gap: 16 }}>
                  <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '800' }}>
                    1. Reason for Clearance
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
                                'Graduation Unavailable',
                                'This student is not enrolled in a recognized final graduating class.'
                              );
                              return;
                            }
                            setReasonCategory(item.key as any);
                          }}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            borderRadius: 12,
                            backgroundColor: isSelected ? emerald : isBlocked ? (isDark ? '#21262D' : '#F3F4F6') : (isDark ? '#1C2128' : '#F9FAFB'),
                            borderWidth: 1,
                            borderColor: isSelected ? emerald : border,
                            opacity: isBlocked ? 0.5 : 1,
                          }}
                        >
                          <Text style={{ color: isSelected ? '#FFFFFF' : isBlocked ? textSecondary : textPrimary, fontSize: 12, fontWeight: '800' }}>
                            {item.label} {isBlocked && '(Locked)'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Destination School */}
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
                        placeholder="Enter destination institution name"
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
                      Parent Notes / Transfer Reason
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
                      placeholder="Add any specific requests or remarks for the school..."
                      placeholderTextColor={textSecondary}
                      value={reasonNotes}
                      onChangeText={setReasonNotes}
                    />
                  </View>

                  {/* Submit */}
                  <TouchableOpacity
                    onPress={handleInitiate}
                    disabled={submitting}
                    style={{
                      backgroundColor: emerald,
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
          title="Child Clearance Certificate"
          fileName={`child-clearance-${selectedChild?.id}.pdf`}
        />
      )}
    </View>
  );
}
