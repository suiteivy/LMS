import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { PdfPreviewModal } from '@/components/pdf/PdfPreviewModal';
import { RecordViolationModal } from '@/components/violations/RecordViolationModal';
import { ViolationList } from '@/components/violations/ViolationList';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  GraduationCap,
  Library,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react-native';

export default function MasterRecordScreen() {
  const { id: idParam } = useLocalSearchParams();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const router = useRouter();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [recordData, setRecordData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'conduct' | 'clearance' | 'guardians'>('overview');

  // Modals
  const [previewPdfVisible, setPreviewPdfVisible] = useState(false);
  const [showRecordViolation, setShowRecordViolation] = useState(false);

  const bg = isDark ? '#0D1117' : '#F6F8FA';
  const card = isDark ? '#161B22' : '#FFFFFF';
  const border = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#F9FAFB' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const orange = '#FF6900';

  const fetchMasterRecord = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${id}/master-record`);
      if (res.data?.success) {
        setRecordData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load master record:', err);
      Alert.alert('Error', err?.response?.data?.error || 'Unable to retrieve master record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchMasterRecord();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={orange} />
        <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13, fontWeight: '600' }}>
          Compiling master institutional record...
        </Text>
      </View>
    );
  }

  if (!recordData || !recordData.user) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <XCircle size={44} color="#EF4444" />
        <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '800', marginTop: 12 }}>
          Master Record Not Found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 16,
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 10,
            backgroundColor: orange,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { user, academic, attendance, disciplinary, clearance, finance, guardians, access_level } = recordData;

  const enrollmentStatus = academic?.enrollment_status || (user.is_active ? 'active' : 'inactive');

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'graduated':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' };
      case 'expelled':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444' };
      case 'withdrawn':
      case 'transferred':
      case 'inactive':
        return { bg: 'rgba(107, 114, 128, 0.15)', text: '#6B7280' };
      default:
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981' };
    }
  };

  const statusStyle = getStatusColor(enrollmentStatus);

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
            Institutional Master Record
          </Text>
          <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '500' }}>
            Permanent Academic, Conduct, Clearance & Audit Dossier
          </Text>
        </View>

        {/* PDF Export Button */}
        <TouchableOpacity
          onPress={() => setPreviewPdfVisible(true)}
          style={{
            backgroundColor: isDark ? '#1C2128' : '#F3F4F6',
            borderWidth: 1,
            borderColor: border,
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Download size={14} color={orange} />
          <Text style={{ color: orange, fontSize: 12, fontWeight: '800' }}>
            Export Summary PDF
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60, maxWidth: 1000, alignSelf: 'center', width: '100%' }}>
        {/* User Hero Banner */}
        <View
          style={{
            backgroundColor: card,
            borderRadius: 20,
            padding: 22,
            borderWidth: 1,
            borderColor: border,
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: orange,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900' }}>
                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: textPrimary, fontSize: 20, fontWeight: '900' }}>
                    {user.full_name}
                  </Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: statusStyle.bg }}>
                    <Text style={{ color: statusStyle.text, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                      {enrollmentStatus}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: textSecondary, fontSize: 13, marginTop: 2 }}>
                  Role: <Text style={{ color: textPrimary, fontWeight: '700', textTransform: 'capitalize' }}>{user.role}</Text>
                  {academic?.admission_number && ` • Admission: ${academic.admission_number}`}
                  {academic?.current_class && ` • Class: ${academic.current_class.name}`}
                </Text>
                <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                  Registered Email: {user.email} • ID: {user.id}
                </Text>
              </View>
            </View>

            {/* Quick Metrics */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {attendance && (
                <View style={{ backgroundColor: isDark ? '#0F141C' : '#F6F8FA', padding: 12, borderRadius: 12, alignItems: 'center', minWidth: 80, borderWidth: 1, borderColor: border }}>
                  <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Attendance</Text>
                  <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '900', marginTop: 2 }}>{attendance.attendance_rate}</Text>
                </View>
              )}
              {finance && (
                <View style={{ backgroundColor: isDark ? '#0F141C' : '#F6F8FA', padding: 12, borderRadius: 12, alignItems: 'center', minWidth: 80, borderWidth: 1, borderColor: border }}>
                  <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Fee Balance</Text>
                  <Text style={{ color: Number(finance.fee_balance) > 0 ? '#EF4444' : '#10B981', fontSize: 16, fontWeight: '900', marginTop: 2 }}>
                    ${Number(finance.fee_balance).toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={{ backgroundColor: isDark ? '#0F141C' : '#F6F8FA', padding: 12, borderRadius: 12, alignItems: 'center', minWidth: 80, borderWidth: 1, borderColor: border }}>
                <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Violations</Text>
                <Text style={{ color: disciplinary.length > 0 ? '#EF4444' : '#10B981', fontSize: 16, fontWeight: '900', marginTop: 2 }}>
                  {disciplinary.length}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section Tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {[
            { key: 'overview', label: 'Academic Dossier' },
            { key: 'attendance', label: `Attendance (${attendance?.total_records || 0})` },
            { key: 'conduct', label: `Disciplinary (${disciplinary?.length || 0})` },
            { key: 'clearance', label: `Clearance (${clearance?.length || 0})` },
            ...(guardians?.length > 0 ? [{ key: 'guardians', label: `Guardians (${guardians.length})` }] : []),
          ].map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor: isSelected ? orange : isDark ? '#161B22' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isSelected ? orange : border,
                }}
              >
                <Text style={{ color: isSelected ? '#FFFFFF' : textPrimary, fontSize: 12, fontWeight: '800' }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TAB 1: ACADEMIC OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={{ gap: 16 }}>
            {user.role === 'student' && academic && (
              <View style={{ backgroundColor: card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: border, gap: 12 }}>
                <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '800' }}>Enrollment & Class Level</Text>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: border }}>
                    <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600' }}>Current Class</Text>
                    <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '800' }}>{academic.current_class?.name || 'N/A'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: border }}>
                    <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600' }}>Grade Level</Text>
                    <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '800' }}>{academic.current_class?.grade_level || 'N/A'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: border }}>
                    <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600' }}>Final Graduating Level</Text>
                    <Text style={{ color: academic.current_class?.is_final_level ? '#10B981' : textSecondary, fontSize: 13, fontWeight: '800' }}>
                      {academic.current_class?.is_final_level ? 'YES (Eligible for Graduation Clearance)' : 'NO'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                    <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600' }}>Official Enrollment Status</Text>
                    <Text style={{ color: statusStyle.text, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' }}>
                      {academic.enrollment_status}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {user.role === 'teacher' && academic && (
              <View style={{ backgroundColor: card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: border, gap: 12 }}>
                <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '800' }}>Faculty Appointments & Subjects</Text>
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: border }}>
                    <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600' }}>Class Teacher Assignment</Text>
                    <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '800' }}>{academic.assigned_class?.name || 'None'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                    <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '600' }}>Specialization</Text>
                    <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '800' }}>{academic.specialization || 'General Faculty'}</Text>
                  </View>
                </View>

                {academic.subjects_taught && academic.subjects_taught.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>
                      Subjects Instructed
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {academic.subjects_taught.map((subj: any) => (
                        <View key={subj.id} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: isDark ? '#0F141C' : '#F6F8FA', borderWidth: 1, borderColor: border }}>
                          <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '700' }}>
                            {subj.title} ({subj.class?.name || 'All'})
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <View style={{ gap: 16 }}>
            {attendance ? (
              <>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  <View style={{ flex: 1, minWidth: 120, backgroundColor: card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
                    <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700' }}>Present</Text>
                    <Text style={{ color: '#10B981', fontSize: 20, fontWeight: '900', marginTop: 4 }}>{attendance.present}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 120, backgroundColor: card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
                    <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700' }}>Late</Text>
                    <Text style={{ color: '#F59E0B', fontSize: 20, fontWeight: '900', marginTop: 4 }}>{attendance.late}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 120, backgroundColor: card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
                    <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700' }}>Absent</Text>
                    <Text style={{ color: '#EF4444', fontSize: 20, fontWeight: '900', marginTop: 4 }}>{attendance.absent}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 120, backgroundColor: card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
                    <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700' }}>Rate</Text>
                    <Text style={{ color: orange, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{attendance.attendance_rate}</Text>
                  </View>
                </View>

                {attendance.recent_logs && attendance.recent_logs.length > 0 && (
                  <View style={{ backgroundColor: card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: border }}>
                    <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 12 }}>Recent Attendance Records</Text>
                    {attendance.recent_logs.map((log: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: idx < attendance.recent_logs.length - 1 ? 1 : 0, borderBottomColor: border }}>
                        <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '600' }}>{log.date} - {log.subjects?.title || 'Daily Session'}</Text>
                        <Text style={{ color: log.status === 'present' ? '#10B981' : log.status === 'late' ? '#F59E0B' : '#EF4444', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
                          {log.status}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={{ backgroundColor: card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
                <Clock size={36} color={textSecondary} />
                <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800', marginTop: 10 }}>No Attendance Data</Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 3: CONDUCT & DISCIPLINARY */}
        {activeTab === 'conduct' && (
          <View style={{ gap: 16 }}>
            {user.role === 'student' && academic && (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <TouchableOpacity
                  onPress={() => setShowRecordViolation(true)}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    borderWidth: 1,
                    borderColor: '#EF4444',
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ShieldAlert size={14} color="#EF4444" />
                  <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '800' }}>
                    Record New Infraction
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <ViolationList
              violations={disciplinary}
              studentId={academic?.student_id}
              canResolve={access_level === 'admin' || access_level === 'class_teacher'}
              onRefresh={fetchMasterRecord}
            />
          </View>
        )}

        {/* TAB 4: CLEARANCE & DEPARTURE */}
        {activeTab === 'clearance' && (
          <View style={{ gap: 16 }}>
            {clearance && clearance.length > 0 ? (
              clearance.map((c: any) => (
                <View key={c.id} style={{ backgroundColor: card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: border, gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '900' }}>
                      Clearance Process ({c.reason_category?.toUpperCase()})
                    </Text>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: c.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 105, 0, 0.15)' }}>
                      <Text style={{ color: c.status === 'completed' ? '#10B981' : orange, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                        {c.status}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <View style={{ flex: 1, minWidth: 100, padding: 10, borderRadius: 8, backgroundColor: isDark ? '#0F141C' : '#F6F8FA', borderWidth: 1, borderColor: border }}>
                      <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '700' }}>Library</Text>
                      <Text style={{ color: c.library_cleared ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '800', marginTop: 2 }}>
                        {c.library_cleared ? 'Cleared' : 'Pending'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 100, padding: 10, borderRadius: 8, backgroundColor: isDark ? '#0F141C' : '#F6F8FA', borderWidth: 1, borderColor: border }}>
                      <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '700' }}>Finance</Text>
                      <Text style={{ color: c.finance_cleared ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '800', marginTop: 2 }}>
                        {c.finance_cleared ? 'Cleared' : 'Pending'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 100, padding: 10, borderRadius: 8, backgroundColor: isDark ? '#0F141C' : '#F6F8FA', borderWidth: 1, borderColor: border }}>
                      <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '700' }}>Property</Text>
                      <Text style={{ color: c.property_cleared ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '800', marginTop: 2 }}>
                        {c.property_cleared ? 'Cleared' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: textSecondary, fontSize: 11 }}>
                    Initiated: {new Date(c.created_at).toLocaleDateString()} by {c.initiator?.full_name || c.initiated_by}
                    {c.completed_at && ` • Completed: ${new Date(c.completed_at).toLocaleDateString()}`}
                  </Text>
                </View>
              ))
            ) : (
              <View style={{ backgroundColor: card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: border, alignItems: 'center' }}>
                <FileCheck size={36} color={textSecondary} />
                <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800', marginTop: 10 }}>No Clearance Records</Text>
                <Text style={{ color: textSecondary, fontSize: 12, marginTop: 4 }}>This user has never undertaken a departure clearance process.</Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 5: GUARDIANS */}
        {activeTab === 'guardians' && guardians && guardians.length > 0 && (
          <View style={{ gap: 12 }}>
            {guardians.map((g: any) => (
              <View key={g.id} style={{ backgroundColor: card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '800' }}>{g.parent?.full_name || 'Guardian'}</Text>
                  <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2, textTransform: 'capitalize' }}>Relationship: {g.relationship || 'Guardian'}</Text>
                  <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>Email: {g.parent?.email || 'N/A'}</Text>
                </View>
                {g.parent?.phone && (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: isDark ? '#0F141C' : '#F6F8FA', borderWidth: 1, borderColor: border }}>
                    <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '700' }}>{g.parent.phone}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Institutional Summary PDF Preview Modal */}
      <PdfPreviewModal
        visible={previewPdfVisible}
        onClose={() => setPreviewPdfVisible(false)}
        documentType="institutional_summary"
        entityId={id}
        title="Institutional Master Record Summary"
        fileName={`institutional-summary-${id}.pdf`}
      />

      {/* Record Violation Modal */}
      {academic && (
        <RecordViolationModal
          visible={showRecordViolation}
          onClose={() => setShowRecordViolation(false)}
          studentId={academic.student_id}
          studentName={user.full_name}
          onSuccess={fetchMasterRecord}
        />
      )}
    </View>
  );
}
