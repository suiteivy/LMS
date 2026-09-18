import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  StudentViolation,
  ViolationService,
  ViolationSeverity,
  ViolationStatus,
} from '@/services/ViolationService';
import { PdfPreviewModal } from '@/components/pdf/PdfPreviewModal';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

interface ViolationListProps {
  violations: StudentViolation[];
  studentId?: string;
  canResolve?: boolean;
  onRefresh?: () => void;
  framing?: 'administrative' | 'constructive';
}

export function ViolationList({
  violations,
  studentId,
  canResolve = false,
  onRefresh,
  framing = 'administrative',
}: ViolationListProps) {
  const { isDark } = useTheme();

  // Resolution Modal State
  const [selectedViolation, setSelectedViolation] = useState<StudentViolation | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<ViolationStatus>('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  // PDF Preview State
  const [previewPdfId, setPreviewPdfId] = useState<string | null>(null);

  const card = isDark ? '#161B22' : '#FFFFFF';
  const border = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

  const getSeverityBadge = (severity: ViolationSeverity) => {
    switch (severity) {
      case 'critical':
        return { bg: 'rgba(124, 58, 237, 0.15)', text: '#7C3AED', label: 'CRITICAL' };
      case 'major':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', label: 'MAJOR' };
      case 'moderate':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', label: 'MODERATE' };
      default:
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', label: 'MINOR' };
    }
  };

  const getStatusBadge = (status: ViolationStatus) => {
    switch (status) {
      case 'resolved':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', label: 'Resolved' };
      case 'expunged':
        return { bg: 'rgba(107, 114, 128, 0.15)', text: '#6B7280', label: 'Expunged' };
      case 'appealed':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', label: 'Appealed' };
      default:
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', label: 'Active' };
    }
  };

  const handleResolveSubmit = async () => {
    if (!selectedViolation) return;
    setResolving(true);
    try {
      await ViolationService.resolveViolation(selectedViolation.id, {
        status: resolutionStatus,
        resolution_notes: resolutionNotes.trim(),
      });
      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: `Infraction updated to ${resolutionStatus}.`,
      });
      setSelectedViolation(null);
      setResolutionNotes('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update infraction status.');
    } finally {
      setResolving(false);
    }
  };

  if (!violations || violations.length === 0) {
    return (
      <View
        style={{
          backgroundColor: card,
          borderRadius: 16,
          padding: 24,
          borderWidth: 1,
          borderColor: border,
          alignItems: 'center',
        }}
      >
        <ShieldCheck size={36} color="#10B981" />
        <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 15, marginTop: 10 }}>
          {framing === 'constructive' ? 'Exemplary Conduct Record' : 'No Disciplinary Records'}
        </Text>
        <Text style={{ color: textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
          {framing === 'constructive'
            ? 'This student maintains a clean disciplinary standing with zero recorded infractions.'
            : 'No active or historical violations have been recorded for this student.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {/* Header bar with summary download */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>
          {framing === 'constructive' ? 'Behavioral & Conduct Log' : 'Disciplinary Incidents'} ({violations.length})
        </Text>

        {studentId && (
          <TouchableOpacity
            onPress={() => setPreviewPdfId(studentId)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: isDark ? '#1C2128' : '#F3F4F6',
              borderWidth: 1,
              borderColor: border,
            }}
          >
            <Download size={13} color={textPrimary} />
            <Text style={{ color: textPrimary, fontSize: 11, fontWeight: '700' }}>
              Summary PDF
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Violations Cards */}
      {violations.map((v) => {
        const sev = getSeverityBadge(v.severity);
        const stat = getStatusBadge(v.status);

        return (
          <View
            key={v.id}
            style={{
              backgroundColor: card,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: border,
              gap: 10,
            }}
          >
            {/* Header: Title + Badges */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '800' }}>
                  {v.title}
                </Text>
                <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                  Recorded on {new Date(v.created_at).toLocaleDateString()} by {v.recorded_by_user?.full_name || 'Staff'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: sev.bg }}>
                  <Text style={{ color: sev.text, fontSize: 10, fontWeight: '800' }}>{sev.label}</Text>
                </View>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: stat.bg }}>
                  <Text style={{ color: stat.text, fontSize: 10, fontWeight: '800' }}>{stat.label}</Text>
                </View>
              </View>
            </View>

            {/* Action Taken */}
            <View
              style={{
                backgroundColor: isDark ? '#0D1117' : '#F9FAFB',
                borderRadius: 8,
                padding: 10,
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                Action Enforced
              </Text>
              <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                {v.action_taken.replace('_', ' ').toUpperCase()}
                {v.suspension_start_date && ` (${v.suspension_start_date} to ${v.suspension_end_date || 'TBD'})`}
              </Text>
              {v.description && (
                <Text style={{ color: textSecondary, fontSize: 12, marginTop: 4, lineHeight: 16 }}>
                  {v.description}
                </Text>
              )}
            </View>

            {/* Resolution Details */}
            {v.resolution_notes && (
              <View style={{ paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: '#10B981', marginLeft: 4 }}>
                <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800' }}>
                  Resolution Notes ({v.resolved_by_user?.full_name || 'Administration'}):
                </Text>
                <Text style={{ color: textPrimary, fontSize: 12, marginTop: 2 }}>
                  {v.resolution_notes}
                </Text>
              </View>
            )}

            {/* Actions: Admin/Teacher Resolution & Individual PDF */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              {canResolve && v.status === 'active' && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedViolation(v);
                    setResolutionStatus('resolved');
                    setResolutionNotes(v.resolution_notes || '');
                  }}
                  style={{
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#10B981',
                  }}
                >
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>Resolve / Expunge</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setPreviewPdfId(v.id)}
                style={{
                  paddingVertical: 5,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: isDark ? '#21262D' : '#F3F4F6',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Eye size={12} color={textPrimary} />
                <Text style={{ color: textPrimary, fontSize: 11, fontWeight: '700' }}>View PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Resolution Modal */}
      <Modal visible={!!selectedViolation} transparent animationType="fade" onRequestClose={() => setSelectedViolation(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View
            style={{
              backgroundColor: card,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: border,
              width: '100%',
              maxWidth: 460,
              padding: 22,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '900' }}>
                Resolve Disciplinary Infraction
              </Text>
              <TouchableOpacity onPress={() => setSelectedViolation(null)}>
                <X size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ gap: 6 }}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                  Target Resolution Status
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['resolved', 'appealed', 'expunged'] as const).map((st) => {
                    const isSelected = resolutionStatus === st;
                    return (
                      <TouchableOpacity
                        key={st}
                        onPress={() => setResolutionStatus(st)}
                        style={{
                          paddingVertical: 8,
                          paddingHorizontal: 14,
                          borderRadius: 8,
                          backgroundColor: isSelected ? '#10B981' : isDark ? '#1C2128' : '#F3F4F6',
                          borderWidth: 1,
                          borderColor: isSelected ? '#10B981' : border,
                        }}
                      >
                        <Text style={{ color: isSelected ? '#FFFFFF' : textPrimary, fontSize: 12, fontWeight: '800', textTransform: 'capitalize' }}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>
                  Resolution Notes & Remarks
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
                  placeholder="Record behavioral counseling completion, apology, or expungement rationale..."
                  placeholderTextColor={textSecondary}
                  value={resolutionNotes}
                  onChangeText={setResolutionNotes}
                />
              </View>

              <TouchableOpacity
                onPress={handleResolveSubmit}
                disabled={resolving}
                style={{
                  backgroundColor: '#10B981',
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginTop: 6,
                }}
              >
                {resolving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                    Save Resolution
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PDF Preview Modal */}
      {previewPdfId && (
        <PdfPreviewModal
          visible={!!previewPdfId}
          onClose={() => setPreviewPdfId(null)}
          documentType="violation_summary"
          entityId={previewPdfId}
          title="Disciplinary Violation Summary"
          fileName={`violation-summary-${previewPdfId}.pdf`}
        />
      )}
    </View>
  );
}
