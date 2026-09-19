import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Clock,
  BookOpen,
  ArrowLeft,
  Sparkles,
} from 'lucide-react-native';
import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { ListItemSkeleton } from '@/components/ui/skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { TranscriptService, AvailablePeriodYear } from '@/services/TranscriptService';
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal';
import { PdfService, PdfDocumentPayload } from '@/services/PdfService';
import { showFetchError, showSuccess } from '@/utils/toast';

export default function StudentTranscriptsScreen() {
  const { user, studentId } = useAuth();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [academicYears, setAcademicYears] = useState<AvailablePeriodYear[]>([]);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

  // Quick stats/preview for Overall Transcript
  const [overallData, setOverallData] = useState<any | null>(null);
  const [loadingOverall, setLoadingOverall] = useState(false);

  // PDF Preview & Download state
  const [previewPayload, setPreviewPayload] = useState<PdfDocumentPayload | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [compilingDocKey, setCompilingDocKey] = useState<string | null>(null);

  const fetchPeriodsAndSummary = async () => {
    try {
      setLoading(true);
      const periodsRes = await TranscriptService.getAvailablePeriods();
      const years = periodsRes?.academic_years || [];
      setAcademicYears(years);

      // Auto-expand current academic year or first year
      const initialExpanded: Record<string, boolean> = {};
      years.forEach((yr, idx) => {
        if (yr.is_current || idx === 0) {
          initialExpanded[yr.id] = true;
        }
      });
      setExpandedYears(initialExpanded);

      // Fetch quick overall transcript summary
      try {
        setLoadingOverall(true);
        const overall = await TranscriptService.getTranscriptData({
          classification: 'overall',
        });
        setOverallData(overall);
      } catch (e) {
        console.warn('Unable to load initial overall preview summary:', e);
      } finally {
        setLoadingOverall(false);
      }
    } catch (error) {
      console.error('Error fetching transcript periods:', error);
      showFetchError('academic periods', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPeriodsAndSummary();
  }, [studentId, user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPeriodsAndSummary();
  };

  const toggleYear = (yearId: string) => {
    setExpandedYears((prev) => ({
      ...prev,
      [yearId]: !prev[yearId],
    }));
  };

  const handlePreview = async (
    classification: 'term' | 'year' | 'overall',
    periodId?: string,
    titleLabel?: string
  ) => {
    const docKey = `${classification}-${periodId || 'all'}`;
    setCompilingDocKey(docKey);
    try {
      const res = await TranscriptService.compileTranscriptPdfBase64({
        classification,
        period_id: periodId,
      });

      const title = titleLabel || (
        classification === 'overall'
          ? 'Cumulative Academic Transcript'
          : classification === 'year'
          ? 'Academic Year Report'
          : 'Term Progress Report'
      );

      const studentName = res.transcript_data?.student?.full_name?.replace(/[^a-zA-Z0-9]+/g, '_') || 'Student';
      const fileName = `Transcript_${classification.toUpperCase()}_${studentName}_${new Date().toISOString().slice(0, 10)}.pdf`;

      setPreviewPayload({
        documentType: 'academic_transcript',
        data: res.transcript_data || {},
        title,
        fileName,
        pdfBase64: res.base64,
      });
      setPreviewVisible(true);
    } catch (error: any) {
      console.error('Error preparing PDF preview:', error);
      Alert.alert('Preview Error', error?.response?.data?.error || error.message || 'Failed to compile vector PDF preview.');
    } finally {
      setCompilingDocKey(null);
    }
  };

  const handleDownloadDirect = async (
    classification: 'term' | 'year' | 'overall',
    periodId?: string,
    titleLabel?: string
  ) => {
    const docKey = `${classification}-${periodId || 'all'}-dl`;
    setCompilingDocKey(docKey);
    try {
      const res = await TranscriptService.compileTranscriptPdfBase64({
        classification,
        period_id: periodId,
      });

      const studentName = res.transcript_data?.student?.full_name?.replace(/[^a-zA-Z0-9]+/g, '_') || 'Student';
      const fileName = `Transcript_${classification.toUpperCase()}_${studentName}_${new Date().toISOString().slice(0, 10)}.pdf`;

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
      <View className="flex-1 bg-[#F6F8FA] dark:bg-[#0D1117] p-4 md:p-8">
        <ListItemSkeleton loading={loading} count={4} label="Loading academic records & transcripts..." />
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
        title="Transcripts & Records"
        subtitle="Official Reports"
        role="Student"
        onBack={() => router.back()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6900']} />
        }
      >
        {/* Tier 1: Prominent Cumulative Overall Transcript Card */}
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
          {/* Header pill & Live snapshot indicator */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2 bg-orange-50 dark:bg-[#2A1B14] px-3 py-1 rounded-full border border-orange-200 dark:border-orange-900/50">
              <Sparkles size={13} color="#FF6900" />
              <Text className="text-[#FF6900] text-[11px] font-bold uppercase tracking-wider">
                Overall Cumulative Record
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
              <Text className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Official Cumulative Transcript
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Complete institutional running academic history, aggregating coursework across all enrolled academic years and terms. Includes official watermark and vector security seal.
              </Text>
            </View>
            <View className="w-12 h-12 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 items-center justify-center">
              <GraduationCap size={26} color="#FF6900" />
            </View>
          </View>

          {/* Quick Metrics Summary if overall data loaded */}
          {overallData?.summary && (
            <View className="bg-gray-50 dark:bg-[#0D1117] rounded-xl p-4 mb-5 border border-gray-100 dark:border-gray-800">
              {overallData.summary.is_descriptor ? (
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                    Performance Summary
                  </Text>
                  <Text className="text-base font-bold text-gray-900 dark:text-white mb-2">
                    {overallData.summary.dominant_label || 'Performance Summary'}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {(overallData.summary.distribution || []).map((item: any, i: number) => (
                      <View
                        key={i}
                        className="bg-white dark:bg-[#161B22] px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <Text className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
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
                    <Text className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                      {overallData.summary.overall_gpa !== null ? overallData.summary.overall_gpa : 'N/A'}
                    </Text>
                  </View>
                  <View className="w-[1px] h-8 bg-gray-200 dark:bg-gray-800" />
                  <View className="items-center flex-1">
                    <Text className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      Average Mark
                    </Text>
                    <Text className="text-xl font-black text-[#FF6900] mt-0.5">
                      {overallData.summary.overall_average !== null ? `${overallData.summary.overall_average}%` : 'N/A'}
                    </Text>
                  </View>
                  <View className="w-[1px] h-8 bg-gray-200 dark:bg-gray-800" />
                  <View className="items-center flex-1">
                    <Text className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      Subjects Recorded
                    </Text>
                    <Text className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                      {overallData.summary.total_subjects_counted || 0}
                    </Text>
                  </View>
                </View>
              )}

              {/* Pending Coursework Alert if present */}
              {overallData?.pending_subjects && overallData.pending_subjects.length > 0 && (
                <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                  <AlertCircle size={14} color="#D97706" />
                  <Text className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    {overallData.pending_subjects.length} course(s) pending evaluation or in-progress
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons: Preview & Direct Download */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => handlePreview('overall', undefined, 'Cumulative Academic Transcript')}
              disabled={compilingDocKey === 'overall-all'}
              className="flex-1 bg-gray-100 dark:bg-[#21262D] py-3.5 px-4 rounded-xl flex-row items-center justify-center gap-2 active:opacity-80"
            >
              {compilingDocKey === 'overall-all' ? (
                <ActivityIndicator size="small" color="#FF6900" />
              ) : (
                <>
                  <Eye size={16} color={isDark ? '#FFFFFF' : '#111827'} />
                  <Text className="text-xs font-bold text-gray-900 dark:text-white">
                    Preview Vector PDF
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDownloadDirect('overall', undefined, 'Cumulative Academic Transcript')}
              disabled={compilingDocKey === 'overall-all-dl'}
              className="flex-1 bg-[#FF6900] py-3.5 px-4 rounded-xl flex-row items-center justify-center gap-2 active:opacity-90"
            >
              {compilingDocKey === 'overall-all-dl' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Download size={16} color="#FFFFFF" />
                  <Text className="text-xs font-bold text-white">
                    Download PDF
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Title: Academic Years & Terms */}
        <View className="mb-4">
          <Text className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            Academic Periods History
          </Text>
          <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
            Select a specific academic year or individual term report
          </Text>
        </View>

        {academicYears.length === 0 ? (
          <View className="bg-white dark:bg-[#161B22] p-8 rounded-xl items-center justify-center border border-[#D0D7DE] dark:border-[#21262D]">
            <BookOpen size={40} color={isDark ? '#484F58' : '#D0D7DE'} />
            <Text className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-3 text-center">
              No academic periods or enrollment records found.
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
                {/* Academic Year Accordion Header */}
                <TouchableOpacity
                  onPress={() => toggleYear(year.id)}
                  className="p-5 flex-row items-center justify-between active:bg-gray-50 dark:active:bg-[#1C2128]"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#21262D] items-center justify-center">
                      <Calendar size={18} color="#FF6900" />
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
                        {year.terms?.length || 0} Term(s) Recorded
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp size={20} color={isDark ? '#8B949E' : '#6E7781'} />
                    ) : (
                      <ChevronDown size={20} color={isDark ? '#8B949E' : '#6E7781'} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Expanded Content */}
                {isExpanded && (
                  <View className="border-t border-[#D0D7DE] dark:border-[#21262D] p-4 bg-gray-50/50 dark:bg-[#0D1117]/50">
                    {/* Full Year Consolidated Report Card */}
                    <View className="bg-white dark:bg-[#161B22] p-4 rounded-xl border border-orange-200 dark:border-orange-950/60 mb-4">
                      <View className="flex-row items-start justify-between mb-3">
                        <View className="flex-1 pr-2">
                          <View className="flex-row items-center gap-1.5 mb-1">
                            <Award size={14} color="#FF6900" />
                            <Text className="text-xs font-bold text-gray-900 dark:text-white">
                              Full Academic Year Report ({year.name})
                            </Text>
                          </View>
                          <Text className="text-[11px] text-gray-500 dark:text-gray-400">
                            Multi-term aggregated record across all terms in this academic year.
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() =>
                            handlePreview('year', year.id, `Academic Year Report - ${year.name}`)
                          }
                          disabled={compilingDocKey === `year-${year.id}`}
                          className="flex-1 bg-gray-100 dark:bg-[#21262D] py-2.5 px-3 rounded-lg flex-row items-center justify-center gap-1.5 active:opacity-80"
                        >
                          {compilingDocKey === `year-${year.id}` ? (
                            <ActivityIndicator size="small" color="#FF6900" />
                          ) : (
                            <>
                              <Eye size={14} color={isDark ? '#FFFFFF' : '#111827'} />
                              <Text className="text-xs font-bold text-gray-900 dark:text-white">
                                Preview
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            handleDownloadDirect('year', year.id, `Academic Year Report - ${year.name}`)
                          }
                          disabled={compilingDocKey === `year-${year.id}-dl`}
                          className="flex-1 bg-gray-900 dark:bg-white py-2.5 px-3 rounded-lg flex-row items-center justify-center gap-1.5 active:opacity-90"
                        >
                          {compilingDocKey === `year-${year.id}-dl` ? (
                            <ActivityIndicator size="small" color="#FF6900" />
                          ) : (
                            <>
                              <Download size={14} color={isDark ? '#111827' : '#FFFFFF'} />
                              <Text className="text-xs font-bold text-white dark:text-gray-900">
                                Download
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Individual Terms List */}
                    <Text className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2.5 ml-1">
                      Terms in {year.name}
                    </Text>

                    {(!year.terms || year.terms.length === 0) ? (
                      <Text className="text-xs text-gray-400 dark:text-gray-500 italic ml-1">
                        No individual terms found for this year.
                      </Text>
                    ) : (
                      year.terms.map((term) => (
                        <View
                          key={term.id}
                          className="bg-white dark:bg-[#161B22] p-3.5 rounded-lg border border-[#D0D7DE] dark:border-[#21262D] mb-2 flex-row items-center justify-between"
                        >
                          <View className="flex-1 pr-3">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-sm font-bold text-gray-900 dark:text-white">
                                {term.name}
                              </Text>
                              {term.is_current && (
                                <View className="bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                  <Text className="text-[9px] font-bold text-blue-700 dark:text-blue-400 uppercase">
                                    Active Term
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              Term Progress & Assessment Report
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-1.5">
                            <TouchableOpacity
                              onPress={() =>
                                handlePreview('term', term.id, `${term.name} Report (${year.name})`)
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
                                handleDownloadDirect('term', term.id, `${term.name} Report (${year.name})`)
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
      </ScrollView>

      {/* PDF Vector Preview Modal */}
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
