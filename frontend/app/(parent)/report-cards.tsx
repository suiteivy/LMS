import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocalSearchParams, router } from 'expo-router';
import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { showError } from '@/utils/toast';
import { GradingAPI } from '@/services/GradingService';
import { ParentService } from '@/services/ParentService';
import { usePrint } from '@/hooks/usePrint';
import { getPerformanceLabel, type GradingScaleRow } from '@/utils/getPerformanceLabel';
import {
  AlertCircle,
  Award,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Calendar,
  GraduationCap,
  User,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportCardStatus = 'draft' | 'pending_review' | 'published' | 'released';

interface SubjectBreakdown {
  subject_id: string;
  subject_name: string;
  average: number;
  letter_grade: string;
  gpa_points: number;
  assessment_type_breakdown: {
    type: string;
    weight: number;
    average: number;
  }[];
}

interface TeacherRemarks {
  teacher_id: string;
  teacher_name: string;
  subject_id?: string;
  subject_name?: string;
  remarks: string;
  date: string;
}

interface ReportCard {
  id: string;
  academic_year: string;
  term_id: string;
  term_name: string;
  status: ReportCardStatus;
  overall_average: number;
  gpa: number;
  class_rank: number;
  total_students: number;
  subjects: SubjectBreakdown[];
  teacher_remarks: TeacherRemarks[];
  created_at: string;
  released_at?: string;
}

const normalizeReportCards = (cards: any[]): ReportCard[] => {
  return (Array.isArray(cards) ? cards : []).map((c: any) => ({
    id: c.id,
    academic_year: c.academic_year || c.academicYear || '',
    term_id: c.term_id,
    term_name: c.term_name || c.termName || 'Term',
    status: c.status,
    overall_average: c.overall_average ?? c.average_percentage ?? 0,
    gpa: c.gpa ?? 0,
    class_rank: c.class_rank ?? c.rank_in_class ?? 0,
    total_students: c.total_students ?? c.total_students_in_class ?? 0,
    subjects: Array.isArray(c.subjects)
      ? c.subjects
      : Array.isArray(c.subject_breakdown)
      ? c.subject_breakdown.map((s: any) => ({
          subject_id: s.subject_id || s.subject_name || 'subject',
          subject_name: s.subject_name || 'Subject',
          average: s.score != null && s.max_score ? (Number(s.score) / Number(s.max_score)) * 100 : 0,
          letter_grade: s.grade || 'N/A',
          gpa_points: 0,
          assessment_type_breakdown: [],
        }))
      : [],
    teacher_remarks: c.teacher_remarks
      ? [
          {
            teacher_id: 'teacher',
            teacher_name: 'Class Teacher',
            remarks: c.teacher_remarks,
            date: c.updated_at || c.created_at || '',
          },
        ]
      : [],
    created_at: c.created_at,
    released_at: c.released_at,
  }));
};

interface Term {
  id: string;
  name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  locked_at?: string | null;
}

interface Child {
  id: string;
  users?: { full_name?: string };
  class_id?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ReportCardStatus,
  { label: string; color: string; bg: string }
> = {
  draft: { label: 'Draft', color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)' },
  pending_review: {
    label: 'Pending Review',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.15)',
  },
  published: {
    label: 'Published',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.15)',
  },
  released: {
    label: 'Released',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.15)',
  },
};

const getLetterGradeColor = (grade: string): string => {
  switch (grade) {
    case 'A+':
    case 'A':
      return '#10B981';
    case 'B+':
    case 'B':
      return '#3B82F6';
    case 'C+':
    case 'C':
      return '#F59E0B';
    case 'D+':
    case 'D':
      return '#F97316';
    case 'F':
      return '#EF4444';
    default:
      return '#9CA3AF';
  }
};

const getGpaBarColor = (gpa: number): string => {
  if (gpa >= 3.5) return '#10B981';
  if (gpa >= 3.0) return '#3B82F6';
  if (gpa >= 2.5) return '#F59E0B';
  if (gpa >= 2.0) return '#F97316';
  return '#EF4444';
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ParentReportCardsScreen() {
  const { isDark } = useTheme();
  const { printHtml } = usePrint();
  const params = useLocalSearchParams<{
    studentId?: string;
    studentName?: string;
  }>();

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [resolvedActiveTerm, setResolvedActiveTerm] = useState<Term | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [gradingScales, setGradingScales] = useState<GradingScaleRow[]>([]);

  const selectedTermObj = selectedTerm
    ? terms.find((t) => t.id === selectedTerm) || null
    : null;

  // Fetch linked children
  const fetchChildren = useCallback(async () => {
    try {
      const students = await ParentService.getLinkedStudents();
      setChildren(students);
      if (students.length > 0) {
        // Pre-select child from navigation params
        const preSelected = params.studentId
          ? students.find((s: Child) => s.id === params.studentId)
          : null;
        setSelectedChild(preSelected || students[0]);
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to load children');
    }
  }, [params.studentId]);

  // Fetch report cards for selected child
  const fetchReportCards = useCallback(async () => {
    if (!selectedChild) return;
    try {
      setLoading(true);
      const params2: any = { student_id: selectedChild.id };
      if (selectedTerm) params2.term_id = selectedTerm;

      const [cards, termsData, scalesData] = await Promise.all([
        GradingAPI.getReportCards(params2),
        GradingAPI.getTerms(),
        GradingAPI.getGradingScales().catch(() => []),
      ]);
      setReportCards(normalizeReportCards(cards));
      setTerms(termsData);
      setGradingScales(Array.isArray(scalesData) ? scalesData : []);
      setResolvedActiveTerm(null);
    } catch (err: any) {
      showError(err?.message || 'Failed to load report cards');
    } finally {
      setLoading(false);
    }
  }, [selectedChild, selectedTerm]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  useEffect(() => {
    fetchReportCards();
  }, [fetchReportCards]);

  const handleToggleExpand = (id: string) => {
    setExpandedCard((prev) => (prev === id ? null : id));
  };

  const handleDownloadPDF = async (card: ReportCard) => {
    try {
      setDownloadingId(card.id);
      const payload = await GradingAPI.exportReportCardPDF({ report_card_id: card.id });
      const html = payload?.html;
      if (!html) {
        throw new Error('Failed to generate report card preview');
      }
      await printHtml(html);
    } catch (err: any) {
      showError(err?.message || 'Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  // ─── Styles ───────────────────────────────────────────────────────────────

  const styles = createStyles(isDark);

  // ─── Render ───────────────────────────────────────────────────────────────

  const childName =
    selectedChild?.users?.full_name || params.studentName || 'Child';

  return (
    <View style={styles.container}>
      <UnifiedHeader
        title="Report Cards"
        subtitle={childName ? `Viewing: ${childName}` : undefined}
        role="Parent/Guardian"
        onBack={() => router.back()}
      />

      {/* Child Selector */}
      {children.length > 1 && (
        <View style={styles.childSelectorWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childSelectorScroll}
          >
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[
                  styles.childPill,
                  selectedChild?.id === child.id && styles.childPillActive,
                ]}
                onPress={() => setSelectedChild(child)}
                activeOpacity={0.7}
              >
                <User
                  size={12}
                  color={
                    selectedChild?.id === child.id
                      ? '#fff'
                      : isDark
                      ? '#9CA3AF'
                      : '#6B7280'
                  }
                />
                <Text
                  style={[
                    styles.childPillText,
                    selectedChild?.id === child.id &&
                      styles.childPillTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {child.users?.full_name || 'Child'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Term Selector */}
      <View style={styles.termSelectorWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.termSelectorScroll}
        >
          <TouchableOpacity
            style={[
              styles.termPill,
              selectedTerm === null && styles.termPillActive,
            ]}
            onPress={() => setSelectedTerm(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.termPillText,
                selectedTerm === null && styles.termPillTextActive,
              ]}
            >
              All Terms
            </Text>
          </TouchableOpacity>
          {terms.map((term) => (
            <TouchableOpacity
              key={term.id}
              style={[
                styles.termPill,
                selectedTerm === term.id && styles.termPillActive,
              ]}
              onPress={() => setSelectedTerm(term.id)}
              activeOpacity={0.7}
            >
              <Calendar
                size={12}
                color={
                  selectedTerm === term.id
                    ? '#fff'
                    : isDark
                    ? '#9CA3AF'
                    : '#6B7280'
                }
              />
              <Text
                style={[
                  styles.termPillText,
                  selectedTerm === term.id && styles.termPillTextActive,
                ]}
              >
                {term.name}{term.locked_at ? ' (Locked)' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* No Active Term Banner */}
      {!resolvedActiveTerm && !loading && terms.length > 0 && (
        <View style={{
          backgroundColor: isDark ? '#2D1F00' : '#FFFBEB',
          borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 12,
          borderWidth: 1, borderColor: isDark ? '#92400E' : '#FCD34D',
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <AlertCircle size={18} color="#D97706" />
          <Text style={{ color: isDark ? '#FCD34D' : '#92400E', fontSize: 13, flex: 1 }}>
            No active term for today. Showing all available report cards.
          </Text>
        </View>
      )}

      {/* Locked Term Notice */}
      {selectedTermObj?.locked_at ? (
        <View style={{
          backgroundColor: isDark ? '#3A1010' : '#FEF2F2',
          borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 12,
          borderWidth: 1, borderColor: isDark ? '#991B1B' : '#FCA5A5',
          flexDirection: 'row', alignItems: 'center', gap: 10,
        }}>
          <AlertCircle size={18} color="#DC2626" />
          <Text style={{ color: isDark ? '#FCA5A5' : '#991B1B', fontSize: 13, flex: 1 }}>
            Selected term is locked. Report cards remain view-only for this term.
          </Text>
        </View>
      ) : null}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading report cards…</Text>
        </View>
      ) : reportCards.length === 0 ? (
        <View style={styles.emptyWrap}>
          <FileText size={48} color={isDark ? '#3B3660' : '#D1D5DB'} />
          <Text style={styles.emptyTitle}>No report cards available yet</Text>
          <Text style={styles.emptySubtitle}>
            {childName}'s report cards will appear here once published by the
            school.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {reportCards.map((card) => {
            const statusCfg = STATUS_CONFIG[card.status] || STATUS_CONFIG.draft;
            const isExpanded = expandedCard === card.id;
            const isDownloading = downloadingId === card.id;

            // Only show released or published cards to parents
            if (card.status !== 'released' && card.status !== 'published') {
              return null;
            }

            return (
              <View key={card.id} style={styles.card}>
                {/* Card Top */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <GraduationCap size={18} color="#FF6B00" />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={styles.cardYear}>{card.academic_year}</Text>
                      <Text style={styles.cardTerm}>{card.term_name}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusCfg.bg },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: statusCfg.color }]}
                    >
                      {statusCfg.label}
                    </Text>
                  </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                  {/* Average */}
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>Average</Text>
                    <Text style={styles.statValue}>
                      {card.overall_average != null
                        ? card.overall_average.toFixed(1)
                        : '—'}
                      <Text style={styles.statUnit}>%</Text>
                    </Text>
                  </View>

                  <View style={styles.statDivider} />

                  {/* GPA */}
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>GPA</Text>
                    <View style={styles.gpaRow}>
                      <View
                        style={[
                          styles.gpaBar,
                          {
                            backgroundColor: isDark ? '#1E1A47' : '#E5E7EB',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.gpaBarFill,
                            {
                              width: `${Math.min((card.gpa / 4) * 100, 100)}%`,
                              backgroundColor: getGpaBarColor(card.gpa),
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.gpaValue,
                          { color: getGpaBarColor(card.gpa) },
                        ]}
                      >
                        {card.gpa != null ? card.gpa.toFixed(2) : '—'}
                      </Text>
                      {card.gpa != null && (
                        <View
                          style={{
                            marginLeft: 6,
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : "rgba(0,0,0,0.04)",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: isDark ? "#9CA3AF" : "#6B7280",
                              fontSize: 9,
                              fontWeight: "700",
                            }}
                          >
                            {getPerformanceLabel(card.overall_average ?? 0, gradingScales).label}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.statDivider} />

                  {/* Rank */}
                  <View style={styles.statBlock}>
                    <Text style={styles.statLabel}>Rank</Text>
                    <View style={styles.rankRow}>
                      <Award size={14} color="#FF6B00" />
                      <Text style={styles.rankValue}>
                        {card.class_rank != null ? `#${card.class_rank}` : '—'}
                        {card.total_students != null && (
                          <Text style={styles.rankUnit}>
                            /{card.total_students}
                          </Text>
                        )}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Expand / Details Toggle */}
                <TouchableOpacity
                  style={styles.expandToggle}
                  onPress={() => handleToggleExpand(card.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.expandToggleLeft}>
                    <BookOpen size={14} color="#FF6B00" />
                    <Text style={styles.expandToggleText}>
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp
                      size={16}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  ) : (
                    <ChevronDown
                      size={16}
                      color={isDark ? '#9CA3AF' : '#6B7280'}
                    />
                  )}
                </TouchableOpacity>

                {/* Expanded Section */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    {/* Subject Breakdown */}
                    <Text style={styles.sectionTitle}>Subject Breakdown</Text>
                    {card.subjects && card.subjects.length > 0 ? (
                      card.subjects.map((subj, idx) => (
                        <View
                          key={subj.subject_id || idx}
                          style={styles.subjectRow}
                        >
                          <View style={styles.subjectHeader}>
                            <View style={styles.subjectNameWrap}>
                              <View
                                style={[
                                  styles.subjectDot,
                                  {
                                    backgroundColor: getLetterGradeColor(
                                      subj.letter_grade
                                    ),
                                  },
                                ]}
                              />
                              <Text
                                style={styles.subjectName}
                                numberOfLines={1}
                              >
                                {subj.subject_name}
                              </Text>
                            </View>
                            <View style={styles.subjectGrades}>
                              <Text style={styles.subjectAvg}>
                                {subj.average != null
                                  ? `${subj.average.toFixed(1)}%`
                                  : '—'}
                              </Text>
                              <View
                                style={[
                                  styles.letterBadge,
                                  {
                                    backgroundColor: getLetterGradeColor(
                                      subj.letter_grade
                                    ),
                                  },
                                ]}
                              >
                                <Text style={styles.letterText}>
                                  {subj.letter_grade || '—'}
                                </Text>
                              </View>
                              <Text style={styles.gpaPoints}>
                                {subj.gpa_points != null
                                  ? `${subj.gpa_points.toFixed(2)} pts`
                                  : '—'}
                              </Text>
                            </View>
                            {subj.average != null && (
                              <View
                                style={{
                                  marginLeft: 6,
                                  backgroundColor: isDark
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.04)",
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: isDark
                                    ? "rgba(255,255,255,0.08)"
                                    : "rgba(0,0,0,0.06)",
                                }}
                              >
                                <Text
                                  style={{
                                    color: isDark ? "#9CA3AF" : "#6B7280",
                                    fontSize: 9,
                                    fontWeight: "700",
                                  }}
                                >
                                  {getPerformanceLabel(subj.average, gradingScales).label}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Assessment Type Breakdown */}
                          {subj.assessment_type_breakdown &&
                            subj.assessment_type_breakdown.length > 0 && (
                              <View style={styles.assessmentBreakdown}>
                                {subj.assessment_type_breakdown.map(
                                  (assess, aIdx) => (
                                    <View
                                      key={aIdx}
                                      style={styles.assessmentPill}
                                    >
                                      <Text style={styles.assessmentType}>
                                        {assess.type}
                                      </Text>
                                      <Text style={styles.assessmentAvg}>
                                        {assess.average != null
                                          ? `${assess.average.toFixed(1)}%`
                                          : '—'}
                                      </Text>
                                      <Text style={styles.assessmentWeight}>
                                        ({assess.weight != null ? `${assess.weight}%` : '—'})
                                      </Text>
                                    </View>
                                  )
                                )}
                              </View>
                            )}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noDataText}>
                        No subject data available.
                      </Text>
                    )}

                    {/* Teacher Remarks */}
                    {card.teacher_remarks &&
                      card.teacher_remarks.length > 0 && (
                        <>
                          <Text
                            style={[styles.sectionTitle, { marginTop: 16 }]}
                          >
                            Teacher Remarks
                          </Text>
                          {card.teacher_remarks.map((remark, rIdx) => (
                            <View key={rIdx} style={styles.remarkCard}>
                              <View style={styles.remarkHeader}>
                                <Text style={styles.remarkTeacher}>
                                  {remark.teacher_name}
                                </Text>
                                {remark.subject_name && (
                                  <Text style={styles.remarkSubject}>
                                    — {remark.subject_name}
                                  </Text>
                                )}
                              </View>
                              <Text style={styles.remarkText}>
                                {remark.remarks}
                              </Text>
                              <Text style={styles.remarkDate}>
                                {remark.date}
                              </Text>
                            </View>
                          ))}
                        </>
                      )}

                    {/* Download Button */}
                    <TouchableOpacity
                      style={styles.downloadBtn}
                      onPress={() => handleDownloadPDF(card)}
                      disabled={isDownloading}
                      activeOpacity={0.7}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Download size={16} color="#fff" />
                      )}
                      <Text style={styles.downloadBtnText}>
                        {isDownloading ? 'Generating…' : 'Download PDF'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0F0B2E' : '#f9fafb',
    },

    // ── Child Selector ────────────────────────────────────────────────
    childSelectorWrap: {
      paddingTop: 4,
      paddingBottom: 4,
    },
    childSelectorScroll: {
      paddingHorizontal: 16,
      gap: 8,
    },
    childPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#13103A' : '#ffffff',
      borderWidth: 1,
      borderColor: isDark ? '#2A2456' : '#E5E7EB',
    },
    childPillActive: {
      backgroundColor: '#FF6B00',
      borderColor: '#FF6B00',
    },
    childPillText: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? '#9CA3AF' : '#6B7280',
      maxWidth: 120,
    },
    childPillTextActive: {
      color: '#ffffff',
    },

    // ── Term Selector ──────────────────────────────────────────────────
    termSelectorWrap: {
      paddingTop: 4,
      paddingBottom: 8,
    },
    termSelectorScroll: {
      paddingHorizontal: 16,
      gap: 8,
    },
    termPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: isDark ? '#13103A' : '#ffffff',
      borderWidth: 1,
      borderColor: isDark ? '#2A2456' : '#E5E7EB',
    },
    termPillActive: {
      backgroundColor: '#FF6B00',
      borderColor: '#FF6B00',
    },
    termPillText: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    termPillTextActive: {
      color: '#ffffff',
    },

    // ── Loading / Empty ────────────────────────────────────────────────
    loadingWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      fontSize: 14,
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    emptyWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: isDark ? '#E5E7EB' : '#374151',
      marginTop: 4,
    },
    emptySubtitle: {
      fontSize: 13,
      color: isDark ? '#6B7280' : '#9CA3AF',
      textAlign: 'center',
      lineHeight: 20,
    },

    // ── List ───────────────────────────────────────────────────────────
    listScroll: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 4,
    },

    // ── Card ───────────────────────────────────────────────────────────
    card: {
      backgroundColor: isDark ? '#13103A' : '#ffffff',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    cardYear: {
      fontSize: 15,
      fontWeight: '700',
      color: isDark ? '#F3F4F6' : '#111827',
    },
    cardTerm: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginTop: 1,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'capitalize',
    },

    // ── Stats Row ──────────────────────────────────────────────────────
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#0D0A24' : '#F9FAFB',
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    statBlock: {
      flex: 1,
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: isDark ? '#6B7280' : '#9CA3AF',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#F3F4F6' : '#111827',
    },
    statUnit: {
      fontSize: 12,
      fontWeight: '400',
      color: isDark ? '#9CA3AF' : '#6B7280',
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: isDark ? '#2A2456' : '#E5E7EB',
      marginHorizontal: 8,
    },

    // ── GPA ────────────────────────────────────────────────────────────
    gpaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      width: '100%',
    },
    gpaBar: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    gpaBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    gpaValue: {
      fontSize: 15,
      fontWeight: '700',
    },

    // ── Rank ───────────────────────────────────────────────────────────
    rankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rankValue: {
      fontSize: 15,
      fontWeight: '700',
      color: isDark ? '#F3F4F6' : '#111827',
    },
    rankUnit: {
      fontSize: 12,
      fontWeight: '400',
      color: isDark ? '#9CA3AF' : '#6B7280',
    },

    // ── Expand Toggle ──────────────────────────────────────────────────
    expandToggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#1E1A47' : '#F3F4F6',
    },
    expandToggleLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    expandToggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FF6B00',
    },

    // ── Expanded Section ───────────────────────────────────────────────
    expandedSection: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#1E1A47' : '#F3F4F6',
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#E5E7EB' : '#374151',
      marginBottom: 10,
    },

    // ── Subject Row ────────────────────────────────────────────────────
    subjectRow: {
      marginBottom: 10,
    },
    subjectHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    subjectNameWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 8,
    },
    subjectDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    subjectName: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#E5E7EB' : '#374151',
      flex: 1,
    },
    subjectGrades: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    subjectAvg: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#D1D5DB' : '#4B5563',
    },
    letterBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    letterText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
    },
    gpaPoints: {
      fontSize: 11,
      fontWeight: '500',
      color: isDark ? '#9CA3AF' : '#6B7280',
      minWidth: 42,
      textAlign: 'right',
    },

    // ── Assessment Breakdown ───────────────────────────────────────────
    assessmentBreakdown: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 6,
      marginLeft: 16,
    },
    assessmentPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? '#1E1A47' : '#F3F4F6',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    assessmentType: {
      fontSize: 10,
      fontWeight: '600',
      color: isDark ? '#9CA3AF' : '#6B7280',
      textTransform: 'capitalize',
    },
    assessmentAvg: {
      fontSize: 10,
      fontWeight: '700',
      color: isDark ? '#D1D5DB' : '#374151',
    },
    assessmentWeight: {
      fontSize: 10,
      color: isDark ? '#6B7280' : '#9CA3AF',
    },

    // ── Remarks ────────────────────────────────────────────────────────
    remarkCard: {
      backgroundColor: isDark ? '#1A1645' : '#FEF3C7',
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#F59E0B',
    },
    remarkHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    remarkTeacher: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#F3F4F6' : '#374151',
    },
    remarkSubject: {
      fontSize: 12,
      color: isDark ? '#9CA3AF' : '#6B7280',
      marginLeft: 4,
    },
    remarkText: {
      fontSize: 13,
      lineHeight: 20,
      color: isDark ? '#D1D5DB' : '#4B5563',
    },
    remarkDate: {
      fontSize: 11,
      color: isDark ? '#6B7280' : '#9CA3AF',
      marginTop: 6,
    },

    // ── Download Button ────────────────────────────────────────────────
    downloadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#FF6B00',
      borderRadius: 12,
      paddingVertical: 12,
      marginTop: 14,
    },
    downloadBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#ffffff',
    },

    // ── No Data ────────────────────────────────────────────────────────
    noDataText: {
      fontSize: 13,
      color: isDark ? '#6B7280' : '#9CA3AF',
      fontStyle: 'italic',
      paddingVertical: 8,
    },
  });
}
