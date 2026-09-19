import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Award,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Clock,
  Sparkles,
  BookOpen,
  User,
  AlertCircle,
} from 'lucide-react-native';
import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { ListItemSkeleton } from '@/components/ui/skeletons';
import { useTheme } from '@/contexts/ThemeContext';
import { formatClassLabel } from '@/utils/classLabel';
import { ParentService } from '@/services/ParentService';
import { TranscriptService, AvailablePeriodYear } from '@/services/TranscriptService';
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal';
import { PdfService, PdfDocumentPayload } from '@/services/PdfService';
import { useParentStudentContext } from '@/hooks/useParentStudentContext';
import { setParentSelectedChild } from '@/utils/parentSelectedChild';
import { showFetchError, showSuccess } from '@/utils/toast';

export default function ParentReportsScreen() {
  const params = useLocalSearchParams<{ studentId?: string; studentName?: string; classId?: string }>();
  const { studentId: resolvedStudentId, studentName: resolvedName, ready } = useParentStudentContext(params as any);
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'transcripts' | 'report_cards'>('transcripts');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Linked children
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [classLabel, setClassLabel] = useState<string>('');

  // Transcripts 3-tier state
  const [academicYears, setAcademicYears] = useState<AvailablePeriodYear[]>([]);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});
  const [overallData, setOverallData] = useState<any | null>(null);

  // Published report cards list
  const [publishedReports, setPublishedReports] = useState<any[]>([]);

  // PDF Preview & Download state
  const [previewPayload, setPreviewPayload] = useState<PdfDocumentPayload | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [compilingDocKey, setCompilingDocKey] = useState<string | null>(null);

  const fetchAllData = async () => {
    if (!resolvedStudentId) return;
    try {
      setLoading(true);

      const [studentsRes, periodsRes, overallRes, reportsRes] = await Promise.allSettled([
        ParentService.getLinkedStudents(),
        TranscriptService.getAvailablePeriods(resolvedStudentId),
        TranscriptService.getTranscriptData({
          student_id: resolvedStudentId,
          classification: 'overall',
        }),
        ParentService.getStudentReports(resolvedStudentId),
      ]);

      if (studentsRes.status === 'fulfilled') {
        const studentsList = Array.isArray(studentsRes.value)
          ? studentsRes.value
          : studentsRes.value?.data || [];
        setLinkedStudents(studentsList);

        const matched = studentsList.find((s: any) => s.id === resolvedStudentId);
        const resolvedCls = matched?.class_name || formatClassLabel({
          grade_level: matched?.grade_level,
          form_level: matched?.form_level,
        });
        setClassLabel(resolvedCls || 'Unassigned');
      }

      if (periodsRes.status === 'fulfilled') {
        const years = periodsRes.value?.academic_years || [];
        setAcademicYears(years);

        const initialExpanded: Record<string, boolean> = {};
        years.forEach((yr, idx) => {
          if (yr.is_current || idx === 0) initialExpanded[yr.id] = true;
        });
        setExpandedYears(initialExpanded);
      } else {
        setAcademicYears([]);
      }

      if (overallRes.status === 'fulfilled') {
        setOverallData(overallRes.value);
      } else {
        setOverallData(null);
      }

      if (reportsRes.status === 'fulfilled') {
        const repList = Array.isArray(reportsRes.value)
          ? reportsRes.value
          : reportsRes.value?.data || [];
        setPublishedReports(repList);
      } else {
        setPublishedReports([]);
      }
    } catch (error) {
      console.error('Error fetching parent academic data:', error);
      showFetchError('academic reports', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!ready || !resolvedStudentId) return;
    fetchAllData();
  }, [ready, resolvedStudentId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleSelectChild = async (child: any) => {
    if (child.id === resolvedStudentId) return;
    await setParentSelectedChild({
      studentId: child.id,
      studentName: child.full_name || child.name,
      classId: child.class_id,
    });
    router.replace({
      pathname: '/(parent)/reports' as any,
      params: {
        studentId: child.id,
        studentName: child.full_name || child.name,
        classId: child.class_id,
      },
    });
  };

  const toggleYear = (yearId: string) => {
    setExpandedYears((prev) => ({
      ...prev,
      [yearId]: !prev[yearId],
    }));
  };

  const handlePreviewTranscript = async (
    classification: 'term' | 'year' | 'overall',
    periodId?: string,
    titleLabel?: string
  ) => {
    const docKey = `${classification}-${periodId || 'all'}`;
    setCompilingDocKey(docKey);
    try {
      const res = await TranscriptService.compileTranscriptPdfBase64({
        student_id: resolvedStudentId,
        classification,
        period_id: periodId,
      });

      const title = titleLabel || (
        classification === 'overall'
          ? `Cumulative Transcript — ${resolvedName || 'Student'}`
          : classification === 'year'
          ? `Academic Year Report — ${resolvedName || 'Student'}`
          : `Term Progress Report — ${resolvedName || 'Student'}`
      );

      const safeName = (resolvedName || 'Student').replace(/[^a-zA-Z0-9]+/g, '_');
      const fileName = `Transcript_${classification.toUpperCase()}_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;

      setPreviewPayload({
        documentType: 'academic_transcript',
        data: res.transcript_data || {},
        title,
        fileName,
        pdfBase64: res.base64,
      });
      setPreviewVisible(true);
    } catch (error: any) {
      console.error('Error preparing transcript preview:', error);
      Alert.alert('Preview Error', error?.response?.data?.error || error.message || 'Failed to compile vector PDF preview.');
    } finally {
      setCompilingDocKey(null);
    }
  };

  const handleDownloadTranscript = async (
    classification: 'term' | 'year' | 'overall',
    periodId?: string,
    titleLabel?: string
  ) => {
    const docKey = `${classification}-${periodId || 'all'}-dl`;
    setCompilingDocKey(docKey);
    try {
      const res = await TranscriptService.compileTranscriptPdfBase64({
        student_id: resolvedStudentId,
        classification,
        period_id: periodId,
      });

      const safeName = (resolvedName || 'Student').replace(/[^a-zA-Z0-9]+/g, '_');
      const fileName = `Transcript_${classification.toUpperCase()}_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;

      await PdfService.downloadCompiledPdf({
        documentType: 'academic_transcript',
        data: res.transcript_data || {},
        title: titleLabel || 'Official Academic Transcript',
        fileName,
        pdfBase64: res.base64,
      });

      showSuccess('Transcript Downloaded', 'Transcript downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading transcript:', error);
      Alert.alert('Download Error', error?.response?.data?.error || error.message || 'Failed to download academic transcript.');
    } finally {
      setCompilingDocKey(null);
    }
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-[#FFFFFF] dark:bg-[#0D1117] p-5">
        <ListItemSkeleton loading={loading} count={4} label="Loading student records & transcripts..." />
      </View>
    );
  }

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View className="flex-1 bg-[#F6F8FA] dark:bg-[#0D1117]">
      <UnifiedHeader
        title="Academic Records"
        subtitle={resolvedName || 'Student Progress'}
        role="Parent/Guardian"
        onBack={() => router.back()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6900']} />
        }
      >
        {/* Child Selector Switcher (if multiple linked students) */}
        {linkedStudents.length > 1 && (
          <View className="mb-4">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2 ml-1">
              Linked Students ({linkedStudents.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
              {linkedStudents.map((child: any) => {
                const isSelected = child.id === resolvedStudentId;
                const childName = child.full_name || child.name || 'Child';
                return (
                  <TouchableOpacity
                    key={child.id}
                    onPress={() => handleSelectChild(child)}
                    className={`flex-row items-center gap-2 px-4 py-2 rounded-full border ${
                      isSelected
                        ? 'bg-[#FF6900] border-[#FF6900]'
                        : 'bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    <User size={13} color={isSelected ? '#FFFFFF' : isDark ? '#9CA3AF' : '#6B7280'} />
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {childName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Viewing Context Banner */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="bg-white dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1">
            <Text className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
              Student: <Text className="text-gray-900 dark:text-white font-extrabold">{resolvedName || 'Student'}</Text> · {classLabel}
            </Text>
          </View>
        </View>

        {/* Tab Navigation: Transcripts vs Published Report Cards */}
        <View className="flex-row bg-gray-200 dark:bg-[#161B22] p-1 rounded-xl mb-6">
          <TouchableOpacity
            onPress={() => setActiveTab('transcripts')}
            className={`flex-1 py-2.5 rounded-lg items-center justify-center flex-row gap-1.5 ${
              activeTab === 'transcripts'
                ? 'bg-white dark:bg-[#21262D] shadow-sm'
                : 'bg-transparent'
            }`}
          >
            <GraduationCap
              size={15}
              color={activeTab === 'transcripts' ? '#FF6900' : isDark ? '#8B949E' : '#6E7781'}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === 'transcripts'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Official Transcripts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('report_cards')}
            className={`flex-1 py-2.5 rounded-lg items-center justify-center flex-row gap-1.5 ${
              activeTab === 'report_cards'
                ? 'bg-white dark:bg-[#21262D] shadow-sm'
                : 'bg-transparent'
            }`}
          >
            <FileText
              size={15}
              color={activeTab === 'report_cards' ? '#FF6900' : isDark ? '#8B949E' : '#6E7781'}
            />
            <Text
              className={`text-xs font-bold ${
                activeTab === 'report_cards'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Report Cards ({publishedReports.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'transcripts' ? (
          <>
            {/* Cumulative Overall Transcript Card */}
            <View
              style={{
                boxShadow: [
                  {
                    offsetX: 0,
                    offsetY: 8,
                    blurRadius: 24,
                    color: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ],
              }}
              className="bg-white dark:bg-[#161B22] rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] p-6 mb-8 overflow-hidden"
            >
              {/* Header badge & timestamp */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-2 bg-orange-50 dark:bg-[#2A1B14] px-3 py-1 rounded-full border border-orange-200 dark:border-orange-900/50">
                  <Sparkles size={13} color="#FF6900" />
                  <Text className="text-[#FF6900] text-[11px] font-bold uppercase tracking-wider">
                    Cumulative Running Record
                  </Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Clock size={12} color={isDark ? '#8B949E' : '#6E7781'} />
                  <Text className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    Live as of {currentDateStr}
                  </Text>
                </View>
              </View>

              {/* Title & Description */}
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1 pr-4">
                  <Text className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                    Complete Academic Transcript
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Official cumulative academic record across all enrolled academic terms. Includes institutional watermark and verification signature block.
                  </Text>
                </View>
                <View className="w-11 h-11 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 items-center justify-center">
                  <GraduationCap size={24} color="#FF6900" />
                </View>
              </View>

              {/* Overall Summary Box */}
              {overallData?.summary && (
                <View className="bg-gray-50 dark:bg-[#0D1117] rounded-xl p-4 mb-5 border border-gray-100 dark:border-gray-800">
                  {overallData.summary.is_descriptor ? (
                    <View>
                      <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1.5">
                        Performance Summary
                      </Text>
                      <Text className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                        {overallData.summary.dominant_label || 'Performance Summary'}
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {(overallData.summary.distribution || []).map((item: any, i: number) => (
                          <View
                            key={i}
                            className="bg-white dark:bg-[#161B22] px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700"
                          >
                            <Text className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                              {item.level || item.name || item.short_code}: <Text className="font-bold text-[#FF6900]">{item.count}</Text>
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View className="flex-row items-center justify-between">
                      <View className="items-center flex-1">
                        <Text className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                          Overall GPA
                        </Text>
                        <Text className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                          {overallData.summary.overall_gpa !== null ? overallData.summary.overall_gpa : 'N/A'}
                        </Text>
                      </View>
                      <View className="w-[1px] h-7 bg-gray-200 dark:bg-gray-800" />
                      <View className="items-center flex-1">
                        <Text className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                          Weighted Avg
                        </Text>
                        <Text className="text-lg font-black text-[#FF6900] mt-0.5">
                          {overallData.summary.overall_average !== null ? `${overallData.summary.overall_average}%` : 'N/A'}
                        </Text>
                      </View>
                      <View className="w-[1px] h-7 bg-gray-200 dark:bg-gray-800" />
                      <View className="items-center flex-1">
                        <Text className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                          Subjects Counted
                        </Text>
                        <Text className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                          {overallData.summary.total_subjects_counted || 0}
                        </Text>
                      </View>
                    </View>
                  )}

                  {overallData?.pending_subjects && overallData.pending_subjects.length > 0 && (
                    <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                      <AlertCircle size={13} color="#D97706" />
                      <Text className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                        {overallData.pending_subjects.length} course(s) currently pending or in-progress
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() =>
                    handlePreviewTranscript('overall', undefined, `Cumulative Transcript — ${resolvedName}`)
                  }
                  disabled={compilingDocKey === 'overall-all'}
                  className="flex-1 bg-gray-100 dark:bg-[#21262D] py-3 px-4 rounded-xl flex-row items-center justify-center gap-2 active:opacity-80"
                >
                  {compilingDocKey === 'overall-all' ? (
                    <ActivityIndicator size="small" color="#FF6900" />
                  ) : (
                    <>
                      <Eye size={15} color={isDark ? '#FFFFFF' : '#111827'} />
                      <Text className="text-xs font-bold text-gray-900 dark:text-white">
                        Preview PDF
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleDownloadTranscript('overall', undefined, `Cumulative Transcript — ${resolvedName}`)
                  }
                  disabled={compilingDocKey === 'overall-all-dl'}
                  className="flex-1 bg-[#FF6900] py-3 px-4 rounded-xl flex-row items-center justify-center gap-2 active:opacity-90"
                >
                  {compilingDocKey === 'overall-all-dl' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Download size={15} color="#FFFFFF" />
                      <Text className="text-xs font-bold text-white">
                        Download PDF
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Academic Years & Terms Accordion */}
            <View className="mb-4">
              <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Academic History & Terms
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Download consolidated annual reports or individual term progress sheets
              </Text>
            </View>

            {academicYears.length === 0 ? (
              <View className="bg-white dark:bg-[#161B22] p-8 rounded-xl items-center justify-center border border-[#D0D7DE] dark:border-[#21262D]">
                <BookOpen size={36} color={isDark ? '#484F58' : '#D0D7DE'} />
                <Text className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-3 text-center">
                  No academic periods recorded for this student.
                </Text>
              </View>
            ) : (
              academicYears.map((year) => {
                const isExpanded = !!expandedYears[year.id];
                return (
                  <View
                    key={year.id}
                    className="bg-white dark:bg-[#161B22] rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-4 overflow-hidden"
                  >
                    <TouchableOpacity
                      onPress={() => toggleYear(year.id)}
                      className="p-4 flex-row items-center justify-between active:bg-gray-50 dark:active:bg-[#1C2128]"
                    >
                      <View className="flex-row items-center gap-3">
                        <View className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#21262D] items-center justify-center">
                          <Calendar size={17} color="#FF6900" />
                        </View>
                        <View>
                          <View className="flex-row items-center gap-2">
                            <Text className="text-base font-bold text-gray-900 dark:text-white">
                              {year.name}
                            </Text>
                            {year.is_current && (
                              <View className="bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                                <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                                  Current Year
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {year.terms?.length || 0} Term(s) Enrolled
                          </Text>
                        </View>
                      </View>

                      {isExpanded ? (
                        <ChevronUp size={18} color={isDark ? '#8B949E' : '#6E7781'} />
                      ) : (
                        <ChevronDown size={18} color={isDark ? '#8B949E' : '#6E7781'} />
                      )}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View className="border-t border-[#D0D7DE] dark:border-[#21262D] p-4 bg-gray-50/50 dark:bg-[#0D1117]/50">
                        {/* Consolidated Year Report */}
                        <View className="bg-white dark:bg-[#161B22] p-3.5 rounded-xl border border-orange-200 dark:border-orange-950/60 mb-3.5">
                          <View className="flex-row items-center gap-1.5 mb-1">
                            <Award size={14} color="#FF6900" />
                            <Text className="text-xs font-bold text-gray-900 dark:text-white">
                              Consolidated Year Report ({year.name})
                            </Text>
                          </View>
                          <Text className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                            Full academic year evaluation across all terms in {year.name}.
                          </Text>

                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              onPress={() =>
                                handlePreviewTranscript('year', year.id, `Academic Year Report (${year.name}) — ${resolvedName}`)
                              }
                              disabled={compilingDocKey === `year-${year.id}`}
                              className="flex-1 bg-gray-100 dark:bg-[#21262D] py-2 px-3 rounded-lg flex-row items-center justify-center gap-1.5 active:opacity-80"
                            >
                              {compilingDocKey === `year-${year.id}` ? (
                                <ActivityIndicator size="small" color="#FF6900" />
                              ) : (
                                <>
                                  <Eye size={13} color={isDark ? '#FFFFFF' : '#111827'} />
                                  <Text className="text-xs font-bold text-gray-900 dark:text-white">
                                    Preview
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() =>
                                handleDownloadTranscript('year', year.id, `Academic Year Report (${year.name}) — ${resolvedName}`)
                              }
                              disabled={compilingDocKey === `year-${year.id}-dl`}
                              className="flex-1 bg-gray-900 dark:bg-white py-2 px-3 rounded-lg flex-row items-center justify-center gap-1.5 active:opacity-90"
                            >
                              {compilingDocKey === `year-${year.id}-dl` ? (
                                <ActivityIndicator size="small" color="#FF6900" />
                              ) : (
                                <>
                                  <Download size={13} color={isDark ? '#111827' : '#FFFFFF'} />
                                  <Text className="text-xs font-bold text-white dark:text-gray-900">
                                    Download
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Terms List */}
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 ml-1">
                          Terms in {year.name}
                        </Text>

                        {(!year.terms || year.terms.length === 0) ? (
                          <Text className="text-xs text-gray-400 dark:text-gray-500 italic ml-1">
                            No terms found for this year.
                          </Text>
                        ) : (
                          year.terms.map((term) => (
                            <View
                              key={term.id}
                              className="bg-white dark:bg-[#161B22] p-3 rounded-lg border border-[#D0D7DE] dark:border-[#21262D] mb-2 flex-row items-center justify-between"
                            >
                              <View className="flex-1 pr-3">
                                <View className="flex-row items-center gap-2">
                                  <Text className="text-sm font-bold text-gray-900 dark:text-white">
                                    {term.name}
                                  </Text>
                                  {term.is_current && (
                                    <View className="bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                      <Text className="text-[9px] font-bold text-blue-700 dark:text-blue-400 uppercase">
                                        Active
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                  Term Progress Report
                                </Text>
                              </View>

                              <View className="flex-row items-center gap-1.5">
                                <TouchableOpacity
                                  onPress={() =>
                                    handlePreviewTranscript('term', term.id, `${term.name} Report (${year.name}) — ${resolvedName}`)
                                  }
                                  disabled={compilingDocKey === `term-${term.id}`}
                                  className="p-2 rounded-lg bg-gray-100 dark:bg-[#21262D] active:opacity-75"
                                  accessibilityLabel={`Preview ${term.name} PDF`}
                                >
                                  {compilingDocKey === `term-${term.id}` ? (
                                    <ActivityIndicator size="small" color="#FF6900" />
                                  ) : (
                                    <Eye size={15} color={isDark ? '#E6EDF3' : '#24292F'} />
                                  )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() =>
                                    handleDownloadTranscript('term', term.id, `${term.name} Report (${year.name}) — ${resolvedName}`)
                                  }
                                  disabled={compilingDocKey === `term-${term.id}-dl`}
                                  className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 active:opacity-75"
                                  accessibilityLabel={`Download ${term.name} PDF`}
                                >
                                  {compilingDocKey === `term-${term.id}-dl` ? (
                                    <ActivityIndicator size="small" color="#FF6900" />
                                  ) : (
                                    <Download size={15} color="#FF6900" />
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        ) : (
          /* Tab 2: Published Report Cards List */
          <View>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/(parent)/report-cards' as any,
                  params: {
                    studentId: resolvedStudentId,
                    studentName: resolvedName,
                    classId: params.classId,
                  },
                })
              }
              className="bg-[#FF6900] rounded-xl py-3 px-4 mb-4 flex-row items-center justify-center gap-2 active:opacity-90"
            >
              <FileText size={16} color="#FFFFFF" />
              <Text className="text-white font-bold text-xs">Open Report Cards Vault</Text>
            </TouchableOpacity>

            {publishedReports.length === 0 ? (
              <View className="py-16 items-center">
                <FileText size={44} color={isDark ? '#374151' : '#D1D5DB'} />
                <Text className="text-gray-500 dark:text-gray-400 mt-3 text-center text-sm font-medium">
                  No published report cards found for this student.
                </Text>
              </View>
            ) : (
              publishedReports.map((report) => (
                <ParentPublishedReportCard key={report.id} report={report} isDark={isDark} />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Vector PDF Preview Modal */}
      <PdfPreviewModal
        visible={previewVisible}
        payload={previewPayload}
        onClose={() => {
          setPreviewVisible(false);
          setPreviewPayload(null);
        }}
      />
    </View>
  );
}

function ParentPublishedReportCard({ report, isDark }: { report: any; isDark: boolean }) {
  const data = report.data || {};
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={{
        boxShadow: [
          {
            offsetX: 0,
            offsetY: 2,
            blurRadius: 10,
            color: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.05)',
          },
        ],
      }}
      className="bg-[#FFFFFF] dark:bg-[#161B22] rounded-xl p-5 mb-4 border border-[#D0D7DE] dark:border-[#21262D]"
    >
      <View className="flex-row justify-between items-start mb-3">
        <View>
          <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest mb-1">
            {report.report_type ? report.report_type.replace(/-/g, ' ') : 'Report Card'}
          </Text>
          <Text className="text-gray-900 dark:text-white text-lg font-bold">
            {report.term} {report.academic_year}
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between border-t border-b border-[#D0D7DE] dark:border-[#21262D] py-3 mb-3">
        <View className="items-center flex-1">
          <Text className="text-gray-500 dark:text-gray-400 text-[8px] font-bold uppercase mb-0.5">
            GPA
          </Text>
          <Text className="text-gray-900 dark:text-white font-black text-base">
            {data.gpa || 'N/A'}
          </Text>
        </View>
        <View className="items-center flex-1 border-l border-r border-[#D0D7DE] dark:border-[#21262D]">
          <Text className="text-gray-500 dark:text-gray-400 text-[8px] font-bold uppercase mb-0.5">
            Position
          </Text>
          <Text className="text-gray-900 dark:text-white font-black text-base">
            {data.position || 'N/A'}/{data.total_students || '-'}
          </Text>
        </View>
        <View className="items-center flex-1">
          <Text className="text-gray-500 dark:text-gray-400 text-[8px] font-bold uppercase mb-0.5">
            Attendance
          </Text>
          <Text className="text-gray-900 dark:text-white font-black text-base">
            {data.attendance || 'N/A'}
          </Text>
        </View>
      </View>

      {data.comments && (
        <View className="bg-orange-50/30 dark:bg-[#0D1117] p-3 rounded-lg mb-3 border border-orange-100 dark:border-gray-800">
          <Text className="text-[#FF6900] text-[8px] font-bold uppercase tracking-widest mb-1">
            Remarks
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 text-xs italic">
            {data.comments}
          </Text>
        </View>
      )}

      {expanded && data.subjects && data.subjects.length > 0 && (
        <View className="mb-3">
          <Text className="text-[#FF6900] text-[8px] font-bold uppercase tracking-widest mb-2">
            Subject Breakdown
          </Text>
          {data.subjects.map((subject: any, index: number) => (
            <View
              key={index}
              className="flex-row justify-between items-center py-2 border-b border-[#D0D7DE] dark:border-[#21262D]"
            >
              <View className="flex-1">
                <Text className="text-gray-900 dark:text-white text-xs font-semibold">
                  {subject.title}
                </Text>
                {subject.remarks && (
                  <Text className="text-gray-500 dark:text-gray-400 text-[11px]">
                    {subject.remarks}
                  </Text>
                )}
              </View>
              <View className="items-center ml-4">
                <Text
                  className="font-bold text-sm"
                  style={{
                    color:
                      subject.grade >= 80 ? '#22c55e' : subject.grade >= 60 ? '#FF6900' : '#ef4444',
                  }}
                >
                  {subject.grade}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        className="flex-row justify-between items-center bg-gray-900 dark:bg-white p-3 rounded-lg"
        onPress={() => setExpanded(!expanded)}
      >
        <Text className="text-white dark:text-gray-900 font-bold text-xs">
          {expanded ? 'Hide Details' : 'View Full Breakdown'}
        </Text>
        <ChevronRight
          size={14}
          color={isDark ? '#1e293b' : 'white'}
          style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
        />
      </TouchableOpacity>
    </View>
  );
}
