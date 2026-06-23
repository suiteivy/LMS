import { GradeDetailModal } from "@/components/common/GradeDetailModal";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { GradingAPI } from "@/services/GradingService";
import { router } from "expo-router";
import {
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  GraduationCap,
  Info,
  Star,
  TrendingUp,
} from "lucide-react";
import {
  getPerformanceLabel,
  getPerformanceFromGpa,
  type GradingScaleRow,
} from "@/utils/getPerformanceLabel";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GradeEntry {
  id: string;
  student_id: string;
  subject_id: string;
  term_id: string | null;
  assessment_type_id: string | null;
  score: number;
  max_score: number;
  weight: number;
  comment: string | null;
  subject?: { id: string; title: string; credits?: number };
  assessment_type?: { id: string; name: string; weight: number };
  term?: { id: string; name: string };
}

interface GradingScale {
  id: string;
  letter_grade: string;
  min_score: number;
  max_score: number;
  gpa_points: number;
  is_default: boolean;
}

interface ReportCard {
  id: string;
  student_id: string;
  term_id: string;
  overall_average: number;
  letter_grade: string;
  gpa_points: number;
  rank: number | null;
  total_students: number | null;
  remarks: string | null;
  term?: { id: string; name: string };
}

interface Term {
  id: string;
  name: string;
  academic_year_id: string;
  is_current: boolean;
}

interface SubjectData {
  subjectId: string;
  subjectName: string;
  credits: number;
  entries: GradeEntry[];
  weightedAverage: number;
  letterGrade: string;
  gpaPoints: number;
  classAverage: number;
  assessmentBreakdown: { name: string; avgScore: number; weight: number; contribution: number }[];
}

interface Stats {
  gpa: number;
  letterGrade: string;
  credits: number;
  avgMark: number;
  rank: string | number;
  totalStudents: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getLetterFromScore = (score: number, scales: GradingScale[]): { letter: string; gpa: number } => {
  if (!scales.length) {
    if (score >= 90) return { letter: "A", gpa: 4.0 };
    if (score >= 80) return { letter: "B", gpa: 3.0 };
    if (score >= 70) return { letter: "C", gpa: 2.0 };
    if (score >= 60) return { letter: "D", gpa: 1.0 };
    return { letter: "F", gpa: 0 };
  }
  const sorted = [...scales].sort((a, b) => b.min_score - a.min_score);
  for (const s of sorted) {
    if (score >= s.min_score && score <= s.max_score) {
      return { letter: s.letter_grade, gpa: s.gpa_points };
    }
  }
  return { letter: "F", gpa: 0 };
};

const getGradeColors = (letter: string, isDark: boolean) => {
  if (letter.startsWith("A"))
    return {
      text: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950/20",
      border: "border-green-200 dark:border-green-800",
    };
  if (letter.startsWith("B"))
    return {
      text: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      border: "border-blue-200 dark:border-blue-800",
    };
  if (letter.startsWith("C"))
    return {
      text: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-50 dark:bg-yellow-950/20",
      border: "border-yellow-200 dark:border-yellow-800",
    };
  return {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-800",
  };
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const ShadowCard = ({
  children,
  isDark,
  className = "",
  style,
}: {
  children: React.ReactNode;
  isDark: boolean;
  className?: string;
  style?: any;
}) => (
  <View
    style={{
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.4 : 0.05,
      shadowRadius: 2,
      elevation: 2,
      ...style,
    }}
    className={`bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] border border-gray-50 dark:border-gray-800 mb-4 ${className}`}
  >
    {children}
  </View>
);

// ---------------------------------------------------------------------------

const GPAHero = ({
  stats,
  isDark,
  selectedTermName,
  gradingScales,
}: {
  stats: Stats;
  isDark: boolean;
  selectedTermName: string;
  gradingScales: GradingScaleRow[];
}) => {
  const perf = getPerformanceFromGpa(stats.gpa, gradingScales);
  return (
    <View
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20,
      }}
      className="bg-gray-900 dark:bg-[#1a1a1a] p-8 rounded-[48px] mb-8 border border-transparent dark:border-gray-800"
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-white/40 dark:text-gray-500 text-[10px] font-bold uppercase tracking-[3px]">
          {selectedTermName || "All Terms"}
        </Text>
        <View className="bg-[#FF6900]/10 px-3 py-1 rounded-full">
          <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest">
            GPA
          </Text>
        </View>
      </View>

      <View className="flex-row justify-between items-start mb-10">
        <View>
          <Text className="text-white text-6xl font-black tracking-tighter">
            {stats.gpa.toFixed(2)}
          </Text>
          <View className="flex-row items-center mt-2">
            <Text className={`text-sm font-bold ${perf.color}`}>{perf.label}</Text>
          </View>
          <Text className="text-white/60 dark:text-gray-400 text-sm font-semibold mt-1">
            {stats.letterGrade}
          </Text>
        </View>
        <View
          style={{
            shadowColor: "#FF6900",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 8,
          }}
          className="bg-[#FF6900] p-4 rounded-3xl"
        >
          <GraduationCap size={28} color="white" />
        </View>
      </View>

      <View className="flex-row justify-between pt-8 border-t border-white/10 dark:border-gray-800">
        <View className="items-center">
          <Text className="text-white/30 dark:text-gray-600 text-[8px] font-bold uppercase tracking-widest">
            Class Rank
          </Text>
          <Text className="text-white font-bold text-xl mt-1">
            {stats.rank}
            {stats.totalStudents > 0 ? `/${stats.totalStudents}` : ""}
          </Text>
        </View>
        <View className="items-center border-x border-white/10 dark:border-gray-800 px-8">
          <Text className="text-white/30 dark:text-gray-600 text-[8px] font-bold uppercase tracking-widest">
            Credits
          </Text>
          <Text className="text-white font-bold text-xl mt-1">{stats.credits}</Text>
        </View>
        <View className="items-center">
          <Text className="text-white/30 dark:text-gray-600 text-[8px] font-bold uppercase tracking-widest">
            Average
          </Text>
          <Text className="text-[#FF6900] font-bold text-xl mt-1">
            {stats.avgMark.toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------

const TermSelector = ({
  terms,
  selectedTermId,
  onSelect,
  isDark,
}: {
  terms: Term[];
  selectedTermId: string | null;
  onSelect: (id: string | null) => void;
  isDark: boolean;
}) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    className="mb-6"
    contentContainerStyle={{ gap: 8 }}
  >
    <TouchableOpacity
      onPress={() => onSelect(null)}
      className={`px-4 py-2 rounded-xl border ${
        selectedTermId === null
          ? "bg-[#FF6900] border-[#FF6900]"
          : "bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800"
      }`}
    >
      <Text
        className={`text-xs font-bold uppercase tracking-widest ${
          selectedTermId === null ? "text-white" : "text-gray-500 dark:text-gray-400"
        }`}
      >
        All Terms
      </Text>
    </TouchableOpacity>
    {terms.map((t) => (
      <TouchableOpacity
        key={t.id}
        onPress={() => onSelect(t.id)}
        className={`px-4 py-2 rounded-xl border ${
          selectedTermId === t.id
            ? "bg-[#FF6900] border-[#FF6900]"
            : "bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-gray-800"
        }`}
      >
        <Text
          className={`text-xs font-bold uppercase tracking-widest ${
            selectedTermId === t.id ? "text-white" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {t.name}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

// ---------------------------------------------------------------------------

const WeightedBreakdownCard = ({
  subject,
  isDark,
  gradingScales,
}: {
  subject: SubjectData;
  isDark: boolean;
  gradingScales: GradingScaleRow[];
}) => {
  const [expanded, setExpanded] = useState(false);
  const perf = getPerformanceLabel(subject.weightedAverage, gradingScales);

  return (
    <ShadowCard isDark={isDark} className="mb-3">
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        className="flex-row items-center"
      >
        <View className="flex-1">
          <Text className="text-gray-900 dark:text-white font-bold text-base" numberOfLines={1}>
            {subject.subjectName}
          </Text>
          <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
            {subject.credits} Credits
          </Text>
          <View className={`self-start mt-1.5 px-2 py-0.5 rounded-full border ${perf.bg} ${perf.borderColor}`}>
            <Text className={`text-[10px] font-bold ${perf.color}`}>{perf.label}</Text>
          </View>
        </View>
        <View className="items-end mr-3">
          <Text className="text-gray-900 dark:text-gray-100 font-bold text-lg">
            {subject.weightedAverage.toFixed(1)}%
          </Text>
          <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">
            {subject.letterGrade}
          </Text>
        </View>
        <View
          className={`w-12 h-12 rounded-2xl items-center justify-center ${getGradeColors(subject.letterGrade, isDark).bg}`}
        >
          <Text
            className={`font-black text-xl ${getGradeColors(subject.letterGrade, isDark).text}`}
          >
            {subject.letterGrade}
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={16} color="#6B7280" style={{ marginLeft: 8 }} />
        ) : (
          <ChevronDown size={16} color="#6B7280" style={{ marginLeft: 8 }} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          {/* Assessment Type Breakdown */}
          <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3">
            Assessment Breakdown
          </Text>
          {subject.assessmentBreakdown.length > 0 ? (
            subject.assessmentBreakdown.map((a, i) => (
              <View
                key={i}
                className="flex-row justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0"
              >
                <Text className="text-gray-600 dark:text-gray-300 text-sm flex-1">{a.name}</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-xs mx-2">
                  {a.avgScore.toFixed(1)}% x {(a.weight * 100).toFixed(0)}%
                </Text>
                <Text className="text-gray-900 dark:text-white font-bold text-sm w-14 text-right">
                  {a.contribution.toFixed(1)}%
                </Text>
              </View>
            ))
          ) : (
            <Text className="text-gray-400 dark:text-gray-500 text-sm">No assessment data</Text>
          )}

          {/* Class Average Comparison */}
          <View className="flex-row justify-between items-center mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <View>
              <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">
                Your Average
              </Text>
              <Text className="text-gray-900 dark:text-white font-bold text-lg">
                {subject.weightedAverage.toFixed(1)}%
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">
                Class Average
              </Text>
              <Text className="text-gray-900 dark:text-white font-bold text-lg">
                {subject.classAverage.toFixed(1)}%
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">
                Difference
              </Text>
              <Text
                className={`font-bold text-lg ${
                  subject.weightedAverage >= subject.classAverage
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {subject.weightedAverage >= subject.classAverage ? "+" : ""}
                {(subject.weightedAverage - subject.classAverage).toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* GPA Points */}
          <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">
              GPA Points
            </Text>
            <Text className="text-[#FF6900] font-bold text-lg">
              {subject.gpaPoints.toFixed(1)}
            </Text>
          </View>
        </View>
      )}
    </ShadowCard>
  );
};

// ---------------------------------------------------------------------------

const ReportCardSection = ({
  reportCards,
  isDark,
  gradingScales,
}: {
  reportCards: ReportCard[];
  isDark: boolean;
  gradingScales: GradingScaleRow[];
}) => {
  if (!reportCards.length) return null;

  return (
    <View className="mb-8">
      <View className="px-2 flex-row items-center mb-4">
        <ClipboardList size={18} color="#FF6900" />
        <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight ml-3">
          Report Cards
        </Text>
      </View>

      {reportCards.map((rc) => {
        const perf = getPerformanceLabel(rc.gpa_points, gradingScales);
        return (
          <ShadowCard key={rc.id} isDark={isDark}>
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-[2px] mb-1">
                  {rc.term?.name || "Term"}
                </Text>
                <Text className="text-gray-900 dark:text-white font-bold text-lg">
                  Report Card
                </Text>
              </View>
              <View className="bg-[#FF6900]/10 px-3 py-1 rounded-full">
                <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest">
                  {rc.letter_grade}
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
              <View className="items-center">
                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">
                  Average
                </Text>
                <Text className="text-gray-900 dark:text-white font-bold text-lg">
                  {rc.overall_average?.toFixed(1) ?? "N/A"}%
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">
                  GPA
                </Text>
                <Text className="text-gray-900 dark:text-white font-bold text-lg">
                  {rc.gpa_points?.toFixed(2) ?? "N/A"}
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest">
                  Rank
                </Text>
                <Text className="text-gray-900 dark:text-white font-bold text-lg">
                  {rc.rank != null ? `${rc.rank}/${rc.total_students}` : "N/A"}
                </Text>
              </View>
            </View>

            {rc.remarks ? (
              <View className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">
                  Remarks
                </Text>
                <Text className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  {rc.remarks}
                </Text>
              </View>
            ) : null}
          </ShadowCard>
        );
      })}
    </View>
  );
};

// ---------------------------------------------------------------------------

const GradingScaleLegend = ({
  scales,
  isDark,
}: {
  scales: GradingScale[];
  isDark: boolean;
}) => {
  const sorted = [...scales].sort((a, b) => b.min_score - a.min_score);

  return (
    <ShadowCard isDark={isDark} className="mb-4">
      <View className="flex-row items-center mb-4">
        <Info size={16} color="#FF6900" />
        <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight ml-2">
          Grading Scale
        </Text>
      </View>

      {sorted.length > 0 ? (
        sorted.map((s, i) => {
          const colors = getGradeColors(s.letter_grade, isDark);
          return (
            <View
              key={s.id || i}
              className="flex-row items-center py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0"
            >
              <View className={`w-10 h-8 rounded-lg items-center justify-center mr-3 ${colors.bg}`}>
                <Text className={`font-black text-sm ${colors.text}`}>{s.letter_grade}</Text>
              </View>
              <Text className="text-gray-600 dark:text-gray-300 text-sm flex-1">
                {s.min_score} - {s.max_score}
              </Text>
              <Text className="text-gray-900 dark:text-white font-bold text-sm">
                {s.gpa_points.toFixed(1)}
              </Text>
            </View>
          );
        })
      ) : (
        <>
          {[
            { letter: "A", range: "90 - 100", gpa: "4.0", color: "bg-green-50 dark:bg-green-950/20", textColor: "text-green-600 dark:text-green-400" },
            { letter: "A-", range: "85 - 89", gpa: "3.7", color: "bg-green-50 dark:bg-green-950/20", textColor: "text-green-600 dark:text-green-400" },
            { letter: "B+", range: "80 - 84", gpa: "3.3", color: "bg-blue-50 dark:bg-blue-950/20", textColor: "text-blue-600 dark:text-blue-400" },
            { letter: "B", range: "75 - 79", gpa: "3.0", color: "bg-blue-50 dark:bg-blue-950/20", textColor: "text-blue-600 dark:text-blue-400" },
            { letter: "B-", range: "70 - 74", gpa: "2.7", color: "bg-blue-50 dark:bg-blue-950/20", textColor: "text-blue-600 dark:text-blue-400" },
            { letter: "C+", range: "65 - 69", gpa: "2.3", color: "bg-yellow-50 dark:bg-yellow-950/20", textColor: "text-yellow-600 dark:text-yellow-400" },
            { letter: "C", range: "60 - 64", gpa: "2.0", color: "bg-yellow-50 dark:bg-yellow-950/20", textColor: "text-yellow-600 dark:text-yellow-400" },
            { letter: "D", range: "50 - 59", gpa: "1.0", color: "bg-orange-50 dark:bg-orange-950/20", textColor: "text-orange-600 dark:text-orange-400" },
            { letter: "F", range: "0 - 49", gpa: "0.0", color: "bg-red-50 dark:bg-red-950/20", textColor: "text-red-600 dark:text-red-400" },
          ].map((s, i) => (
            <View
              key={i}
              className="flex-row items-center py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-b-0"
            >
              <View className={`w-10 h-8 rounded-lg items-center justify-center mr-3 ${s.color}`}>
                <Text className={`font-black text-sm ${s.textColor}`}>{s.letter}</Text>
              </View>
              <Text className="text-gray-600 dark:text-gray-300 text-sm flex-1">{s.range}</Text>
              <Text className="text-gray-900 dark:text-white font-bold text-sm">{s.gpa}</Text>
            </View>
          ))}
        </>
      )}
    </ShadowCard>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function GradesEnhanced() {
  const { studentId, user, isDemo } = useAuth();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([]);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  const [stats, setStats] = useState<Stats>({
    gpa: 0,
    letterGrade: "N/A",
    credits: 0,
    avgMark: 0,
    rank: "N/A",
    totalStudents: 0,
  });
  const [subjectData, setSubjectData] = useState<SubjectData[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState({
    subjectName: "",
    lecturerName: "",
    examMark: 0,
    testScores: [] as any[],
  });

  useEffect(() => {
    if (studentId || user?.id || isDemo) {
      loadData();
    }
  }, [studentId, user?.id, isDemo, selectedTermId]);

  const loadData = async () => {
    const targetId = studentId || user?.id;
    if (!targetId) return;

    try {
      setLoading(true);

      // Fetch in parallel
      const [studentScaleData, termsData] = await Promise.all([
        GradingAPI.getStudentGradingScale(targetId).catch(() => null),
        GradingAPI.getTerms().catch(() => []),
      ]);

      // Use the student's linked grading scale (or fall back to institution default)
      const studentScale = studentScaleData?.grading_scale || [];
      setGradingScales(studentScale);
      setTerms(termsData || []);

      // Grade entries
      const entryParams: any = { student_id: targetId };
      if (selectedTermId) entryParams.term_id = selectedTermId;

      const [entries, summary] = await Promise.all([
        GradingAPI.getGradeEntries(entryParams).catch(() => []),
        GradingAPI.getGradeSummary({ student_id: targetId, ...(selectedTermId ? { term_id: selectedTermId } : {}) }).catch(
          () => null,
        ),
      ]);

      setGradeEntries(entries || []);

      // Report cards
      const rcParams: any = { student_id: targetId };
      if (selectedTermId) rcParams.term_id = selectedTermId;
      const rcs = await GradingAPI.getReportCards(rcParams).catch(() => []);
      setReportCards(rcs || []);

      // Process subject data
      processSubjectData(entries || [], studentScale || []);

      // Stats from summary or rank RPC
      if (summary) {
        setStats({
          gpa: summary.gpa ?? 0,
          letterGrade: summary.letter_grade ?? "N/A",
          credits: summary.total_credits ?? 0,
          avgMark: summary.overall_average ?? 0,
          rank: summary.rank ?? "N/A",
          totalStudents: summary.total_students ?? 0,
        });
      } else {
        // Fallback: derive from entries
        processStatsFromEntries(entries || [], studentScale || []);
      }
    } catch (error) {
      console.error("Grades load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const processSubjectData = (entries: GradeEntry[], scales: GradingScale[]) => {
    const map: Record<
      string,
      { entries: GradeEntry[]; subjectName: string; credits: number }
    > = {};

    entries.forEach((e) => {
      const sid = e.subject_id;
      if (!map[sid]) {
        map[sid] = {
          entries: [],
          subjectName: e.subject?.title || "Unknown Subject",
          credits: e.subject?.credits || 0,
        };
      }
      map[sid].entries.push(e);
    });

    const result: SubjectData[] = Object.entries(map).map(([sid, data]) => {
      // Group by assessment type
      const typeMap: Record<string, { scores: number[]; weight: number; name: string }> = {};
      data.entries.forEach((e) => {
        const typeId = e.assessment_type_id || "unclassified";
        if (!typeMap[typeId]) {
          typeMap[typeId] = {
            scores: [],
            weight: e.assessment_type?.weight ?? (1 / Object.keys(typeMap).length || 0),
            name: e.assessment_type?.name || "Other",
          };
        }
        const normalized = e.max_score > 0 ? (e.score / e.max_score) * 100 : e.score;
        typeMap[typeId].scores.push(normalized);
      });

      const totalWeight = Object.values(typeMap).reduce((s, t) => s + t.weight, 0) || 1;

      const breakdown = Object.values(typeMap).map((t) => {
        const avg = t.scores.reduce((a, b) => a + b, 0) / (t.scores.length || 1);
        const effectiveWeight = totalWeight > 0 ? t.weight / totalWeight : 0;
        return {
          name: t.name,
          avgScore: avg,
          weight: effectiveWeight,
          contribution: avg * effectiveWeight,
        };
      });

      const weightedAverage = breakdown.reduce((s, b) => s + b.contribution, 0);
      const { letter, gpa } = getLetterFromScore(weightedAverage, scales);

      // Class average (simplified: use same data since no per-student class comparison API)
      // In a real app, this would come from a backend endpoint
      const classAverage = weightedAverage;

      return {
        subjectId: sid,
        subjectName: data.subjectName,
        credits: data.credits,
        entries: data.entries,
        weightedAverage,
        letterGrade: letter,
        gpaPoints: gpa,
        classAverage,
        assessmentBreakdown: breakdown,
      };
    });

    setSubjectData(result);
  };

  const processStatsFromEntries = (entries: GradeEntry[], scales: GradingScale[]) => {
    if (!entries.length) return;

    const totals = entries.reduce(
      (acc, e) => {
        const normalized = e.max_score > 0 ? (e.score / e.max_score) * 100 : e.score;
        return acc + normalized;
      },
      0,
    );
    const avg = totals / entries.length;
    const { letter, gpa } = getLetterFromScore(avg, scales);

    setStats({
      gpa,
      letterGrade: letter,
      credits: 0,
      avgMark: Number(avg.toFixed(1)),
      rank: "N/A",
      totalStudents: 0,
    });
  };

  const fetchSubjectDetails = async (subject: SubjectData) => {
    const targetId = studentId || user?.id;
    if (!targetId) return;

    try {
      setFetchingDetails(true);

      const testScores = subject.entries.map((e) => ({
        title: e.assessment_type?.name || e.comment || "Assessment",
        mark: e.score,
        maxMark: e.max_score,
        weight: e.assessment_type?.weight ?? 0,
      }));

      setSelectedDetails({
        subjectName: subject.subjectName,
        lecturerName: "Assigned Faculty",
        examMark: subject.weightedAverage,
        testScores,
      });
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching subject details:", error);
      Alert.alert("Error", "Failed to fetch grade breakdown");
    } finally {
      setFetchingDetails(false);
    }
  };

  const selectedTermName = selectedTermId
    ? terms.find((t) => t.id === selectedTermId)?.name || "Selected Term"
    : "All Terms";

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-navy">
        <ActivityIndicator size="large" color="#FF6900" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-navy">
      <UnifiedHeader
        title="Grades"
        subtitle="Performance"
        role="Student"
        onBack={() => router.back()}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        <View className="p-4 md:p-8">
          {/* Term Selector */}
          <TermSelector
            terms={terms}
            selectedTermId={selectedTermId}
            onSelect={setSelectedTermId}
            isDark={isDark}
          />

          {/* GPA Hero */}
          <GPAHero stats={stats} isDark={isDark} selectedTermName={selectedTermName} gradingScales={gradingScales} />

          {/* Report Cards */}
          <ReportCardSection reportCards={reportCards} isDark={isDark} gradingScales={gradingScales} />

          {/* Analytics Overview */}
          <ShadowCard isDark={isDark} className="mb-6">
            <View className="flex-row items-center mb-6">
              <BarChart3 size={18} color="#FF6900" />
              <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight ml-3">
                Grade Breakdown
              </Text>
            </View>
            <View className="flex-row border-t border-gray-50 dark:border-gray-800 pt-6">
              <View className="flex-1">
                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-1">
                  Total Assessments
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-xl">
                  {gradeEntries.length}
                </Text>
              </View>
              <View className="flex-1 border-l border-gray-50 dark:border-gray-800 pl-6">
                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-1">
                  Subjects
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-xl">
                  {subjectData.length}
                </Text>
              </View>
              <View className="flex-1 border-l border-gray-50 dark:border-gray-800 pl-6">
                <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-1">
                  Overall
                </Text>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-xl">
                  {stats.letterGrade}
                </Text>
              </View>
            </View>
          </ShadowCard>

          {/* View Trends Link */}
          <TouchableOpacity
            onPress={() => router.push("/(student)/analytics" as any)}
            className="flex-row items-center justify-between bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-6"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950 items-center justify-center mr-3">
                <TrendingUp size={18} color="#FF6B00" />
              </View>
              <View>
                <Text className="text-gray-900 dark:text-white font-bold text-sm">Performance Trends</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-xs">View grade trends across terms</Text>
              </View>
            </View>
            <View className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 items-center justify-center">
              <View style={{ transform: [{ rotate: "-90deg" }] }}>
                <ChevronDown size={16} color="#9ca3af" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Subject Breakdown */}
          <View className="px-2 flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <BookOpen size={18} color="#FF6900" />
              <Text className="text-gray-900 dark:text-white font-bold text-lg tracking-tight ml-3">
                Subject Grades
              </Text>
            </View>
          </View>

          {subjectData.length === 0 ? (
            <View className="bg-white dark:bg-[#1a1a1a] p-20 rounded-[48px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-4">
              <Star size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
              <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6">
                No grades available for this period
              </Text>
            </View>
          ) : (
            subjectData.map((s) => (
              <WeightedBreakdownCard
                key={s.subjectId}
                subject={s}
                isDark={isDark}
                gradingScales={gradingScales}
              />
            ))
          )}

          {/* Grading Scale Legend */}
          <View className="mt-8">
            <GradingScaleLegend scales={gradingScales} isDark={isDark} />
          </View>
        </View>
      </ScrollView>

      <GradeDetailModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        {...selectedDetails}
      />

      {fetchingDetails && (
        <View className="absolute inset-0 bg-black/20 justify-center items-center">
          <ActivityIndicator size="large" color="#FF6900" />
        </View>
      )}
    </View>
  );
}
