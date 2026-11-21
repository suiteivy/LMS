import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import SmartReportsService, { DossierResponse } from '@/services/SmartReportsService';
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal';
import { showError, showSuccess } from '@/utils/toast';

export interface RecordsDossierModalProps {
  visible: boolean;
  onClose: () => void;
  defaultPersonType?: 'student' | 'staff' | 'parent';
  defaultPersonId?: string;
  defaultPersonName?: string;
}

export const RecordsDossierModal: React.FC<RecordsDossierModalProps> = ({
  visible,
  onClose,
  defaultPersonType = 'student',
  defaultPersonId = '',
  defaultPersonName = '',
}) => {
  const { isDark } = useTheme();

  const [personType, setPersonType] = useState<'student' | 'staff' | 'parent'>(defaultPersonType);
  const [personId, setPersonId] = useState<string>(defaultPersonId);
  const [personName, setPersonName] = useState<string>(defaultPersonName);

  // Period
  const [periodRange, setPeriodRange] = useState<string>('All Available Retained Records');

  // Included Sections
  const [includeAcademics, setIncludeAcademics] = useState(true);
  const [includeAttendance, setIncludeAttendance] = useState(true);
  const [includeFinance, setIncludeFinance] = useState(true);
  const [includeDocuments, setIncludeDocuments] = useState(true);

  // Justification Reason
  const [justification, setJustification] = useState('Official administrative records audit');

  // Loading & Output
  const [compiling, setCompiling] = useState(false);
  const [dossierResult, setDossierResult] = useState<DossierResponse | null>(null);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);

  const handleGenerate = async () => {
    if (!personId && !personName) {
      showError('Please enter the target person identifier or name');
      return;
    }
    if (!justification.trim()) {
      showError('A stated justification reason is required for dossier compilation');
      return;
    }

    const sections: string[] = [];
    if (includeAcademics) sections.push('academics');
    if (includeAttendance) sections.push('attendance');
    if (includeFinance) sections.push('finance');
    if (includeDocuments) sections.push('documents');

    setCompiling(true);
    try {
      const res = await SmartReportsService.generateDossier({
        targetPersonType: personType,
        targetPersonId: personId || '00000000-0000-0000-0000-000000000000',
        periodSpec: { type: 'all' },
        includedSections: sections,
        justificationReason: justification.trim(),
      });
      setDossierResult(res);
      setPdfModalVisible(true);
      showSuccess(`Cumulative dossier compiled for ${res.personName}`);
    } catch (err: any) {
      showError(err.message || 'Failed to compile records dossier');
    } finally {
      setCompiling(false);
    }
  };

  if (!visible) return null;

  const bgModal = isDark ? '#161B22' : '#FFFFFF';
  const textTitle = isDark ? '#F0F6FC' : '#1F2937';
  const textSub = isDark ? '#8B949E' : '#6B7280';
  const borderColor = isDark ? '#30363D' : '#E5E7EB';
  const inputBg = isDark ? '#0D1117' : '#F9FAFB';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View style={{ width: '100%', maxWidth: 640, maxHeight: '90%', backgroundColor: bgModal, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: textTitle }}>Compile Records Dossier</Text>
              <Text style={{ fontSize: 12, color: textSub, marginTop: 2 }}>
                Cumulative official record with multi-year period coverage & access transparency
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Ionicons name="close" size={22} color={textSub} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Person Type */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: textTitle, marginBottom: 8 }}>Individual Category:</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {(['student', 'staff', 'parent'] as const).map((pt) => {
                const active = personType === pt;
                return (
                  <TouchableOpacity
                    key={pt}
                    onPress={() => setPersonType(pt)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: active ? '#FF6900' : inputBg,
                      borderWidth: 1,
                      borderColor: active ? '#FF6900' : borderColor,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFF' : textTitle }}>
                      {pt.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Person Identifier / Name */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: textTitle, marginBottom: 4 }}>
                Target Person Identifier / Name:
              </Text>
              <TextInput
                value={personName || personId}
                onChangeText={(val) => {
                  setPersonName(val);
                  setPersonId(val);
                }}
                placeholder="Enter Name, Admission Number, or Staff ID"
                placeholderTextColor="#9CA3AF"
                style={{
                  height: 40,
                  backgroundColor: inputBg,
                  borderWidth: 1,
                  borderColor,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  color: textTitle,
                  fontSize: 13,
                }}
              />
            </View>

            {/* Sections Checklist */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: textTitle, marginBottom: 8 }}>
              Sections to Include (Role-Gated):
            </Text>
            <View style={{ backgroundColor: inputBg, borderRadius: 8, borderWidth: 1, borderColor, padding: 12, gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Academic Results & Official Marks', state: includeAcademics, set: setIncludeAcademics },
                { label: 'Attendance Records & Absence History', state: includeAttendance, set: setIncludeAttendance },
                { label: 'Financial Ledger & Fee Statements', state: includeFinance, set: setIncludeFinance },
                { label: 'Issued Letters & Administrative Certificates', state: includeDocuments, set: setIncludeDocuments },
              ].map((sec, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => sec.set(!sec.state)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <Ionicons name={sec.state ? 'checkbox' : 'square-outline'} size={18} color="#FF6900" />
                  <Text style={{ fontSize: 13, color: textTitle }}>{sec.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Justification Reason */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: textTitle, marginBottom: 4 }}>
                Audit Justification (Required for Governance):
              </Text>
              <TextInput
                value={justification}
                onChangeText={setJustification}
                placeholder="State official reason for compiling cumulative records..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
                style={{
                  height: 60,
                  backgroundColor: inputBg,
                  borderWidth: 1,
                  borderColor,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  color: textTitle,
                  fontSize: 13,
                }}
              />
            </View>

            <View style={{ backgroundColor: isDark ? '#2D1B00' : '#FFFBEB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B' }}>
              <Text style={{ fontSize: 11, color: isDark ? '#FDE68A' : '#92400E' }}>
                🛡️ <Text style={{ fontWeight: '700' }}>Access Transparency:</Text> Any sections or sensitive fields outside your active role permissions will be omitted and explicitly stamped as "Not included due to your role permissions" to prevent false completeness or indirect data leaks.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: borderColor, backgroundColor: inputBg }}>
            <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: textTitle }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={compiling}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: '#FF6900',
              }}
            >
              {compiling ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="document-text" size={16} color="#FFF" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>Compile Dossier PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* PDF Viewer */}
      <PdfPreviewModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        documentType="records_dossier"
        title={dossierResult?.fileName || 'Cumulative Dossier'}
        fileName={dossierResult?.fileName || 'dossier.pdf'}
        data={{ pdfBase64: dossierResult?.base64Pdf || '' }}
      />
    </Modal>
  );
};
