import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ViolationService, ViolationSeverity, ViolationActionTaken } from '@/services/ViolationService';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

interface RecordViolationModalProps {
  visible: boolean;
  onClose: () => void;
  studentId: string;
  studentName?: string;
  onSuccess?: () => void;
}

export function RecordViolationModal({
  visible,
  onClose,
  studentId,
  studentName,
  onSuccess,
}: RecordViolationModalProps) {
  const { isDark } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<ViolationSeverity>('minor');
  const [actionTaken, setActionTaken] = useState<ViolationActionTaken>('verbal_warning');
  const [suspensionStart, setSuspensionStart] = useState('');
  const [suspensionEnd, setSuspensionEnd] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const card = isDark ? '#161B22' : '#FFFFFF';
  const border = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const red = '#EF4444';

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSeverity('minor');
    setActionTaken('verbal_warning');
    setSuspensionStart('');
    setSuspensionEnd('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a violation title or infraction summary.');
      return;
    }

    if (actionTaken === 'suspension' && (!suspensionStart || !suspensionEnd)) {
      Alert.alert('Required Dates', 'Please provide start and end dates for suspension.');
      return;
    }

    if (actionTaken === 'expulsion') {
      Alert.alert(
        'Confirm Expulsion Action',
        `Recording an expulsion will immediately update ${studentName || 'this student'}'s official enrollment status to 'Expelled' and revoke login privileges. Are you sure?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Expel & Record', style: 'destructive', onPress: executeSubmission },
        ]
      );
      return;
    }

    await executeSubmission();
  };

  const executeSubmission = async () => {
    setSubmitting(true);
    try {
      await ViolationService.recordViolation({
        student_id: studentId,
        title: title.trim(),
        description: description.trim(),
        severity,
        action_taken: actionTaken,
        suspension_start_date: actionTaken === 'suspension' ? suspensionStart : undefined,
        suspension_end_date: actionTaken === 'suspension' ? suspensionEnd : undefined,
      });

      Toast.show({
        type: 'success',
        text1: 'Violation Recorded',
        text2: `Disciplinary action recorded for ${studentName || 'student'}.`,
      });

      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || err.message || 'Failed to record violation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View
          style={{
            backgroundColor: card,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: border,
            width: '100%',
            maxWidth: 540,
            maxHeight: '90%',
            padding: 22,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View>
              <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '900' }}>
                Record Disciplinary Infraction
              </Text>
              <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                Student: <Text style={{ color: textPrimary, fontWeight: '700' }}>{studentName || studentId}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ gap: 14 }}>
            {/* Infraction Title */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                Infraction Title *
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
                placeholder="e.g., Exam Malpractice, Defiance, Unauthorized Exit"
                placeholderTextColor={textSecondary}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Severity Picker */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                Severity Classification *
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {(
                  [
                    { key: 'minor', label: 'Minor', color: '#3B82F6' },
                    { key: 'moderate', label: 'Moderate', color: '#F59E0B' },
                    { key: 'major', label: 'Major', color: '#EF4444' },
                    { key: 'critical', label: 'Critical', color: '#7C3AED' },
                  ] as const
                ).map((s) => {
                  const isSelected = severity === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      onPress={() => setSeverity(s.key)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        backgroundColor: isSelected ? s.color : isDark ? '#1C2128' : '#F3F4F6',
                        borderWidth: 1,
                        borderColor: isSelected ? s.color : border,
                      }}
                    >
                      <Text style={{ color: isSelected ? '#FFFFFF' : textPrimary, fontSize: 12, fontWeight: '800' }}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Action Taken */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                Disciplinary Action Taken *
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {(
                  [
                    { key: 'verbal_warning', label: 'Verbal Warning' },
                    { key: 'written_warning', label: 'Written Warning' },
                    { key: 'detention', label: 'Detention' },
                    { key: 'parent_conference', label: 'Parent Conference' },
                    { key: 'counseling', label: 'Counseling' },
                    { key: 'community_service', label: 'Community Service' },
                    { key: 'suspension', label: 'Suspension' },
                    { key: 'expulsion', label: 'Expulsion', isDanger: true },
                    { key: 'other', label: 'Other' },
                  ] as const
                ).map((a) => {
                  const isSelected = actionTaken === a.key;
                  return (
                    <TouchableOpacity
                      key={a.key}
                      onPress={() => setActionTaken(a.key)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: isSelected
                          ? (a as any).isDanger
                            ? red
                            : '#2563EB'
                          : isDark
                          ? '#1C2128'
                          : '#F3F4F6',
                        borderWidth: 1,
                        borderColor: isSelected ? ((a as any).isDanger ? red : '#2563EB') : border,
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#FFFFFF' : (a as any).isDanger ? red : textPrimary,
                          fontSize: 11,
                          fontWeight: '800',
                        }}
                      >
                        {a.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Expulsion Warning Banner */}
            {actionTaken === 'expulsion' && (
              <View
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: red,
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'center',
                }}
              >
                <ShieldAlert size={22} color={red} />
                <Text style={{ color: red, fontSize: 11, fontWeight: '700', flex: 1, lineHeight: 16 }}>
                  CRITICAL: Expulsion will immediately set student's enrollment status to 'Expelled' and disable their portal login credentials.
                </Text>
              </View>
            )}

            {/* Suspension Dates */}
            {actionTaken === 'suspension' && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700' }}>
                    Start Date (YYYY-MM-DD)
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: isDark ? '#0D1117' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: border,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      color: textPrimary,
                      fontSize: 12,
                    }}
                    placeholder={new Date().toISOString().split('T')[0]}
                    placeholderTextColor={textSecondary}
                    value={suspensionStart}
                    onChangeText={setSuspensionStart}
                  />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700' }}>
                    End Date (YYYY-MM-DD)
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: isDark ? '#0D1117' : '#FFFFFF',
                      borderWidth: 1,
                      borderColor: border,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      color: textPrimary,
                      fontSize: 12,
                    }}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={textSecondary}
                    value={suspensionEnd}
                    onChangeText={setSuspensionEnd}
                  />
                </View>
              </View>
            )}

            {/* Incident Description */}
            <View style={{ gap: 6 }}>
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                Incident Description & Investigation Findings
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
                placeholder="Detail the circumstances, location, witnesses, and statements..."
                placeholderTextColor={textSecondary}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                backgroundColor: actionTaken === 'expulsion' ? red : '#2563EB',
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
                marginTop: 6,
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>
                  {actionTaken === 'expulsion' ? 'Record & Finalize Expulsion' : 'Record Infraction'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
