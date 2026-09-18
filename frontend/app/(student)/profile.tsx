import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { PdfService } from '@/services/PdfService';
import { Ionicons } from '@expo/vector-icons';
import {
  UserCheck,
  AlertTriangle,
  FileText,
  Send,
  X,
  Shield,
  BookOpen,
  Calendar,
  Clock,
  Download,
  CheckCircle,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';
import { ViolationList } from '@/components/violations/ViolationList';

export default function StudentProfileScreen() {
  const { profile, displayId } = useAuth();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'disciplinary' | 'clearance'>('overview');

  // Credential request modal
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [requestType, setRequestType] = useState<'name_change' | 'email_reset'>('name_change');
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const bg = isDark ? '#0D1117' : '#F6F8FA';
  const card = isDark ? '#161B22' : '#FFFFFF';
  const border = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const orange = '#FF6900';

  const loadData = async () => {
    try {
      setLoading(true);
      const [profRes, reqsRes, violRes] = await Promise.all([
        api.get('/student/me/profile'),
        api.get('/auth/credential-requests/me').catch(() => ({ data: { data: [] } })),
        api.get('/violations/my').catch(() => ({ data: { data: [] } })),
      ]);

      if (profRes.data?.success) {
        setProfileData(profRes.data.data);
      }
      setMyRequests(reqsRes.data?.data || []);
      setViolations(violRes.data?.data || []);
    } catch (err: any) {
      console.error('Failed to load student profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCredentialSubmit = async () => {
    if (!requestedValue.trim()) {
      Alert.alert('Required', `Please provide the requested ${requestType === 'email_reset' ? 'email address' : 'full name'}.`);
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Required', 'Please provide a clear reason for your request.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/auth/credential-requests', {
        request_type: requestType,
        requested_value: requestedValue.trim(),
        reason: reason.trim(),
      });

      if (res.data?.success) {
        Toast.show({
          type: 'success',
          text1: 'Request Submitted',
          text2: `Your ${requestType === 'email_reset' ? 'email reset' : 'name change'} request is awaiting admin approval.`,
        });
        setRequestModalVisible(false);
        setRequestedValue('');
        setReason('');
        loadData();
      }
    } catch (err: any) {
      Alert.alert('Submission Failed', err?.response?.data?.error || 'Unable to submit credential request.');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSummaryPdf = async () => {
    try {
      setDownloadingPdf(true);
      await PdfService.downloadCompiledPdf({
        documentType: 'institutional_summary',
        data: {
          user_id: profile?.id,
          role: 'student',
          student_id: profileData?.personal?.id,
          full_name: profileData?.personal?.full_name || profile?.full_name,
          email: profileData?.personal?.email || profile?.email,
          class_name: profileData?.academic?.current_class?.name || 'Assigned Class',
          enrollment_status: profileData?.personal?.enrollment_status || 'active',
          date_generated: new Date().toLocaleDateString(),
        },
        title: 'Student Institutional Summary',
        fileName: `student-summary-${profileData?.personal?.id || 'record'}.pdf`,
      });
      Toast.show({
        type: 'success',
        text1: 'Download Complete',
        text2: 'Institutional summary PDF compiled successfully.',
      });
    } catch (err: any) {
      console.error('PDF error:', err);
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: err?.message || 'Could not compile institutional summary PDF.',
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={orange} />
        <Text style={{ color: textSecondary, marginTop: 12, fontWeight: '600', fontSize: 13 }}>
          Loading Student Profile...
        </Text>
      </View>
    );
  }

  const personal = profileData?.personal || profile;
  const academic = profileData?.academic || {};
  const clearance = profileData?.clearance;
  const fullName = personal?.full_name || `${personal?.first_name || ''} ${personal?.last_name || ''}`.trim() || 'Student';

  const pendingNameChange = myRequests.find((r: any) => r.request_type === 'name_change' && r.status === 'pending');
  const pendingEmailReset = myRequests.find((r: any) => r.request_type === 'email_reset' && r.status === 'pending');
  const recentRejected = myRequests.find((r: any) => r.status === 'rejected');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Pending Request Banners */}
      {pendingNameChange && (
        <View
          style={{
            backgroundColor: isDark ? 'rgba(255, 105, 0, 0.12)' : '#FFF7ED',
            borderColor: orange,
            borderWidth: 1,
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={20} color={orange} style={{ marginRight: 10, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: isDark ? '#FFA756' : '#9A3412', fontWeight: '800', fontSize: 13 }}>
              Name Change Request Pending Review
            </Text>
            <Text style={{ color: isDark ? '#E5E7EB' : '#7C2D12', fontSize: 12, marginTop: 2 }}>
              Requested: <Text style={{ fontWeight: '700' }}>{pendingNameChange.requested_value}</Text>
            </Text>
            <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>Reason: {pendingNameChange.reason}</Text>
          </View>
        </View>
      )}

      {pendingEmailReset && (
        <View
          style={{
            backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : '#F5F3FF',
            borderColor: '#8B5CF6',
            borderWidth: 1,
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={20} color="#8B5CF6" style={{ marginRight: 10, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: isDark ? '#C4B5FD' : '#5B21B6', fontWeight: '800', fontSize: 13 }}>
              Email Reset Request Pending Review
            </Text>
            <Text style={{ color: isDark ? '#E5E7EB' : '#4C1D95', fontSize: 12, marginTop: 2 }}>
              Requested Email: <Text style={{ fontWeight: '700' }}>{pendingEmailReset.requested_value}</Text>
            </Text>
            <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>Reason: {pendingEmailReset.reason}</Text>
          </View>
        </View>
      )}

      {recentRejected && recentRejected.admin_notes && (
        <View
          style={{
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
            borderColor: '#EF4444',
            borderWidth: 1,
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={20} color="#EF4444" style={{ marginRight: 10, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: isDark ? '#FCA5A5' : '#991B1B', fontWeight: '800', fontSize: 13 }}>
              {recentRejected.request_type === 'email_reset' ? 'Email Reset' : 'Name Change'} Request Rejected
            </Text>
            <Text style={{ color: isDark ? '#E5E7EB' : '#7F1D1D', fontSize: 12, marginTop: 2 }}>
              Administrative Reason: <Text style={{ fontWeight: '700' }}>{recentRejected.admin_notes}</Text>
            </Text>
          </View>
        </View>
      )}

      {/* Main Student Header Card */}
      <View style={{ backgroundColor: card, borderWidth: 1, borderColor: border, borderRadius: 20, padding: 20, marginBottom: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 24,
              backgroundColor: isDark ? '#0F141C' : '#F6F8FA',
              borderWidth: 1,
              borderColor: border,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Ionicons name="school" size={44} color={orange} />
          </View>

          <Text style={{ color: textPrimary, fontSize: 22, fontWeight: '900', textAlign: 'center' }}>
            {fullName}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            <View style={{ backgroundColor: orange, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                {academic.current_class?.name || 'Class Assigned'}
              </Text>
            </View>

            <View
              style={{
                backgroundColor:
                  personal.enrollment_status === 'graduated'
                    ? '#3B82F620'
                    : personal.enrollment_status === 'expelled'
                    ? '#EF444420'
                    : personal.enrollment_status === 'withdrawn'
                    ? '#6B728020'
                    : '#10B98120',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
                borderWidth: 1,
                borderColor:
                  personal.enrollment_status === 'graduated'
                    ? '#3B82F6'
                    : personal.enrollment_status === 'expelled'
                    ? '#EF4444'
                    : personal.enrollment_status === 'withdrawn'
                    ? '#6B7280'
                    : '#10B981',
              }}
            >
              <Text
                style={{
                  color:
                    personal.enrollment_status === 'graduated'
                      ? '#3B82F6'
                      : personal.enrollment_status === 'expelled'
                      ? '#EF4444'
                      : personal.enrollment_status === 'withdrawn'
                      ? '#6B7280'
                      : '#10B981',
                  fontSize: 10,
                  fontWeight: '800',
                  textTransform: 'uppercase',
                }}
              >
                {personal.enrollment_status || 'Active'}
              </Text>
            </View>

            <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600' }}>
              ID: {displayId || academic.student_id || 'N/A'}
            </Text>
          </View>

          {/* Quick Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => {
                setRequestType('name_change');
                setRequestedValue('');
                setReason('');
                setRequestModalVisible(true);
              }}
              disabled={!!pendingNameChange}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: pendingNameChange ? (isDark ? '#21262D' : '#E5E7EB') : (isDark ? 'rgba(255, 105, 0, 0.15)' : '#FFF7ED'),
                borderWidth: 1,
                borderColor: pendingNameChange ? 'transparent' : orange,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Send size={12} color={pendingNameChange ? textSecondary : orange} />
              <Text style={{ color: pendingNameChange ? textSecondary : orange, fontSize: 11, fontWeight: '700' }}>
                {pendingNameChange ? 'Name Pending' : 'Request Name Change'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setRequestType('email_reset');
                setRequestedValue('');
                setReason('');
                setRequestModalVisible(true);
              }}
              disabled={!!pendingEmailReset}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: pendingEmailReset ? (isDark ? '#21262D' : '#E5E7EB') : (isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF'),
                borderWidth: 1,
                borderColor: pendingEmailReset ? 'transparent' : '#8B5CF6',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Send size={12} color={pendingEmailReset ? textSecondary : '#8B5CF6'} />
              <Text style={{ color: pendingEmailReset ? textSecondary : '#8B5CF6', fontSize: 11, fontWeight: '700' }}>
                {pendingEmailReset ? 'Email Pending' : 'Request Email Reset'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={downloadSummaryPdf}
              disabled={downloadingPdf}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                borderWidth: 1,
                borderColor: border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Download size={12} color={textPrimary} />
              <Text style={{ color: textPrimary, fontSize: 11, fontWeight: '700' }}>
                {downloadingPdf ? 'Compiling PDF...' : 'Download Summary PDF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Info Rows */}
        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: border, paddingTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600' }}>Email</Text>
            <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '700' }}>{personal.email || 'N/A'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600' }}>Admission Number</Text>
            <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '700' }}>{academic.admission_number || 'N/A'}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600' }}>Phone</Text>
            <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '700' }}>{personal.phone || 'Not set'}</Text>
          </View>
          {personal.created_at && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600' }}>Enrolled Since</Text>
              <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '700' }}>
                {new Date(personal.created_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Navigation Sub-Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {(['overview', 'disciplinary', 'clearance'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const label =
            tab === 'overview'
              ? 'Academic Overview'
              : tab === 'disciplinary'
              ? `Disciplinary (${violations.length})`
              : 'Clearance Status';

          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderRadius: 12,
                backgroundColor: isActive ? '#FF6900' : card,
                borderWidth: 1,
                borderColor: isActive ? '#FF6900' : border,
              }}
            >
              <Text
                style={{
                  color: isActive ? '#FFFFFF' : textSecondary,
                  fontWeight: '700',
                  fontSize: 12,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <View style={{ gap: 12 }}>
          <View style={{ backgroundColor: card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <BookOpen size={16} color={orange} />
              <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>Current Class Assignment</Text>
            </View>
            <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '700' }}>
              {academic.current_class?.name || 'Assigned Class'}
            </Text>
            <Text style={{ color: textSecondary, fontSize: 12, marginTop: 4 }}>
              Status: {personal.enrollment_status === 'active' ? 'Regularly enrolled in current curriculum.' : personal.enrollment_status}
            </Text>
          </View>

          <View style={{ backgroundColor: card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Shield size={16} color="#10B981" />
              <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>Disciplinary Standing</Text>
            </View>
            <Text style={{ color: academic.active_violations_count > 0 ? '#EF4444' : '#10B981', fontSize: 15, fontWeight: '700' }}>
              {academic.active_violations_count > 0
                ? `${academic.active_violations_count} Active Disciplinary Violation(s)`
                : 'Good Academic & Behavioral Standing (0 Active Violations)'}
            </Text>
          </View>
        </View>
      )}

      {/* Tab 2: Disciplinary History */}
      {activeTab === 'disciplinary' && (
        <ViolationList
          violations={violations}
          studentId={profileData?.personal?.id}
          framing="constructive"
          onRefresh={loadData}
        />
      )}

      {/* Tab 3: Clearance Status */}
      {activeTab === 'clearance' && (
        <View style={{ gap: 12 }}>
          {clearance ? (
            <View style={{ backgroundColor: card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 15 }}>Active Clearance Process</Text>
                <View style={{ backgroundColor: clearance.status === 'completed' ? '#10B98120' : '#F59E0B20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ color: clearance.status === 'completed' ? '#10B981' : '#F59E0B', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                    {clearance.status}
                  </Text>
                </View>
              </View>

              <Text style={{ color: textSecondary, fontSize: 12, marginBottom: 12 }}>
                Reason Category: <Text style={{ color: textPrimary, fontWeight: '700' }}>{clearance.reason_category}</Text>
              </Text>

              {/* Independent Category Checks */}
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: isDark ? '#0F141C' : '#F6F8FA' }}>
                  <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '700' }}>Library Clearance</Text>
                  <Text style={{ color: clearance.library_cleared ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: 12 }}>
                    {clearance.library_cleared ? 'Cleared' : 'Pending / Unreturned Books'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: isDark ? '#0F141C' : '#F6F8FA' }}>
                  <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '700' }}>Finance Clearance</Text>
                  <Text style={{ color: clearance.finance_cleared ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: 12 }}>
                    {clearance.finance_cleared ? 'Cleared' : 'Pending / Outstanding Fees'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: isDark ? '#0F141C' : '#F6F8FA' }}>
                  <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '700' }}>Property & Equipment</Text>
                  <Text style={{ color: clearance.property_cleared ? '#10B981' : '#EF4444', fontWeight: '800', fontSize: 12 }}>
                    {clearance.property_cleared ? 'Cleared' : 'Pending Verification'}
                  </Text>
                </View>
              </View>

              {clearance.status === 'completed' && (
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await PdfService.downloadCompiledPdf({
                        documentType: 'clearance_confirmation',
                        data: clearance,
                        title: 'Official Clearance Certificate',
                        fileName: `clearance-${personal.id}.pdf`,
                      });
                    } catch (e: any) {
                      Alert.alert('Download Error', e.message);
                    }
                  }}
                  style={{
                    backgroundColor: '#10B981',
                    borderRadius: 10,
                    paddingVertical: 10,
                    alignItems: 'center',
                    marginTop: 14,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Download Clearance Confirmation PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={{ backgroundColor: card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
              <Ionicons name="document-text-outline" size={36} color={textSecondary} />
              <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 15, marginTop: 10 }}>
                No Active Clearance Process
              </Text>
              <Text style={{ color: textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center', marginBottom: 14 }}>
                If you are planning to graduate, withdraw, or transfer institutions, you may initiate clearance here.
              </Text>

              <TouchableOpacity
                onPress={() => router.push('/(student)/clearance' as any)}
                style={{
                  backgroundColor: orange,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Initiate Institution Clearance</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Credential Request Modal */}
      <Modal visible={requestModalVisible} transparent animationType="fade" onRequestClose={() => setRequestModalVisible(false)}>
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
              <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '900' }}>
                {requestType === 'email_reset' ? 'Request Email Reset' : 'Request Name Change'}
              </Text>
              <TouchableOpacity onPress={() => setRequestModalVisible(false)}>
                <X size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: isDark ? '#0F141C' : '#F6F8FA', padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1, borderColor: border }}>
              <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                {requestType === 'email_reset' ? 'Current Registered Email' : 'Current Registered Name'}
              </Text>
              <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800', marginTop: 2 }}>
                {requestType === 'email_reset' ? (personal.email || 'N/A') : fullName}
              </Text>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                {requestType === 'email_reset' ? 'New Requested Email Address *' : 'New Requested Full Name *'}
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
                  fontSize: 14,
                }}
                placeholder={requestType === 'email_reset' ? 'student.official@school.edu' : 'Enter your official name'}
                placeholderTextColor={textSecondary}
                value={requestedValue}
                onChangeText={setRequestedValue}
                keyboardType={requestType === 'email_reset' ? 'email-address' : 'default'}
                autoCapitalize={requestType === 'email_reset' ? 'none' : 'words'}
              />
            </View>

            <View style={{ marginBottom: 18 }}>
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                Reason for Request *
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
                numberOfLines={3}
                placeholder="State the reason for this administrative change..."
                placeholderTextColor={textSecondary}
                value={reason}
                onChangeText={setReason}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setRequestModalVisible(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: textSecondary, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCredentialSubmit}
                disabled={submitting}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: requestType === 'email_reset' ? '#8B5CF6' : orange,
                  alignItems: 'center',
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
