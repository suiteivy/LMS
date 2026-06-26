import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { api } from "@/services/api";
import { GradingAPI } from "@/services/GradingService";
import { showError, showSuccess } from "@/utils/toast";
import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";
import { router } from "expo-router";
import {
    ChevronDown,
    Check,
    Filter,
    Plus,
    RefreshCw,
    Save,
    Search,
    Upload,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SubjectOption {
    id: string;
    title: string;
    class_id?: string;
}

interface TermOption {
    id: string;
    name: string;
    is_current?: boolean;
    start_date?: string;
    end_date?: string;
    locked_at?: string | null;
}

interface AssessmentTypeOption {
    id: string;
    title: string;
    default_max_score: number;
    weight?: number;
}

interface StudentRecord {
    student_id: string;
    student_name: string;
    student_display_id?: string;
}

interface GradeEntry {
    student_id: string;
    student_name: string;
    student_display_id?: string;
    score: string;
    maxScore: number;
    percentage: number | null;
    letterGrade: string;
    feedback: string;
    existingEntryId?: string;
    status: "new" | "updated" | "existing";
}

interface DropdownSelectorProps {
    label: string;
    value: string;
    options: { id: string; label: string }[];
    onSelect: (id: string) => void;
    loading?: boolean;
    placeholder?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeLetterGrade(percentage: number): string {
    if (percentage >= 90) return "A";
    if (percentage >= 85) return "A-";
    if (percentage >= 80) return "B+";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C+";
    if (percentage >= 50) return "C";
    if (percentage >= 40) return "D";
    return "F";
}

function computePercentage(score: string, maxScore: number): number | null {
    const num = parseFloat(score);
    if (isNaN(num) || maxScore <= 0) return null;
    return Math.min((num / maxScore) * 100, 100);
}

function letterGradeColor(letter: string): string {
    switch (letter) {
        case "A":
        case "A-":
            return "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400";
        case "B+":
        case "B":
            return "bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400";
        case "C+":
        case "C":
            return "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400";
        case "D":
            return "bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400";
        case "F":
            return "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400";
        default:
            return "bg-gray-100 dark:bg-[#161B22] text-gray-500 dark:text-gray-400";
    }
}

// ─── Dropdown Component ─────────────────────────────────────────────────────

const DropdownSelector: React.FC<DropdownSelectorProps> = ({
    label,
    value,
    options,
    onSelect,
    loading,
    placeholder = "Select...",
}) => {
    const [open, setOpen] = useState(false);

    return (
        <View className="mb-4 relative z-20">
            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider ml-1 mb-1.5">
                {label}
            </Text>
            <TouchableOpacity
                className="bg-white dark:bg-[#161B22] rounded-2xl px-4 py-3.5 border border-gray-100 dark:border-gray-800 flex-row items-center justify-between shadow-sm active:bg-gray-50 dark:active:bg-gray-900"
                onPress={() => setOpen(!open)}
                disabled={loading}
            >
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm flex-1" numberOfLines={1}>
                    {loading ? "Loading..." : value || placeholder}
                </Text>
                <ChevronDown size={16} color="#6B7280" />
            </TouchableOpacity>

            {open && (
                <View className="absolute top-[62px] left-0 right-0 bg-white dark:bg-[#161B22] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl z-30 overflow-hidden max-h-52">
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {options.length === 0 ? (
                            <View className="px-4 py-4">
                                <Text className="text-gray-400 dark:text-gray-500 text-xs text-center">No options available</Text>
                            </View>
                        ) : (
                            options.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    className={`px-4 py-3.5 border-b border-gray-50 dark:border-gray-900 flex-row items-center justify-between active:bg-gray-50 dark:active:bg-gray-900 ${
                                        value === opt.label ? "bg-orange-50 dark:bg-orange-950/20" : ""
                                    }`}
                                    onPress={() => {
                                        onSelect(opt.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm flex-1" numberOfLines={1}>
                                        {opt.label}
                                    </Text>
                                    {value === opt.label && <Check size={14} color="#FF6900" />}
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                </View>
            )}

            {open && (
                <TouchableOpacity
                    className="fixed inset-0 z-[-1]"
                    onPress={() => setOpen(false)}
                    activeOpacity={1}
                />
            )}
        </View>
    );
};

// ─── CSV Parser ─────────────────────────────────────────────────────────────

interface CsvRow {
    student_name?: string;
    student_display_id?: string;
    score: string;
    max_score?: string;
    matched_student?: StudentRecord;
    match_status: "matched" | "unmatched" | "duplicate";
}

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCsv(text: string): CsvRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_-]+/g, "_"));
    const nameIdx = header.findIndex((h) => ["student_name", "name", "student", "full_name", "learner_name"].includes(h));
    const idIdx = header.findIndex((h) => ["student_display_id", "display_id", "student_id", "id", "roll_number", "reg_no", "admission_no"].includes(h));
    const scoreIdx = header.findIndex((h) => ["score", "mark", "marks", "grade", "points", "obtained"].includes(h));
    const maxIdx = header.findIndex((h) => ["max_score", "max", "total", "full_marks", "maximum"].includes(h));

    if (scoreIdx === -1) return [];

    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length <= scoreIdx) continue;
        const score = cols[scoreIdx];
        if (!score || isNaN(Number(score))) continue;

        rows.push({
            student_name: nameIdx >= 0 ? cols[nameIdx] : undefined,
            student_display_id: idIdx >= 0 ? cols[idIdx] : undefined,
            score,
            max_score: maxIdx >= 0 ? cols[maxIdx] : undefined,
            match_status: "unmatched",
        });
    }
    return rows;
}

function matchCsvRows(rows: CsvRow[], students: StudentRecord[]): CsvRow[] {
    const matchedIds = new Set<string>();
    return rows.map((row) => {
        let match: StudentRecord | undefined;
        if (row.student_display_id) {
            match = students.find(
                (s) =>
                    s.student_display_id?.toLowerCase() === row.student_display_id!.toLowerCase() ||
                    s.student_id.toLowerCase() === row.student_display_id!.toLowerCase()
            );
        }
        if (!match && row.student_name) {
            const q = row.student_name.toLowerCase();
            match = students.find((s) => s.student_name.toLowerCase() === q);
        }
        if (!match && row.student_name && row.student_display_id) {
            match = students.find(
                (s) =>
                    s.student_name.toLowerCase().includes(row.student_name!.toLowerCase()) ||
                    row.student_name!.toLowerCase().includes(s.student_name.toLowerCase())
            );
        }

        if (match) {
            if (matchedIds.has(match.student_id)) {
                return { ...row, matched_student: match, match_status: "duplicate" };
            }
            matchedIds.add(match.student_id);
            return { ...row, matched_student: match, match_status: "matched" };
        }
        return { ...row, match_status: "unmatched" };
    });
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function GradeEntryPage() {
    const { teacherId } = useAuth();
    const tier = useSubscriptionTier();
    const openManual = (anchor?: string) => {
        router.push({ pathname: '/(teacher)/accessibility/settings', params: { manual: '1', anchor: anchor || 'grading-ops' } } as any);
    };

    // ── Filter state ──
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [terms, setTerms] = useState<TermOption[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<string>("");
    const [autoSelectedActiveTerm, setAutoSelectedActiveTerm] = useState<boolean>(false);
    const [assessmentTypes, setAssessmentTypes] = useState<AssessmentTypeOption[]>([]);
    const [selectedAssessmentTypeId, setSelectedAssessmentTypeId] = useState<string>("");

    // ── Data state ──
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingStudents, setFetchingStudents] = useState(false);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // ── Search ──
    const [searchQuery, setSearchQuery] = useState("");

    // ── Feedback modal ──
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [feedbackTarget, setFeedbackTarget] = useState<string>("");
    const [feedbackText, setFeedbackText] = useState("");

    // ── CSV Import modal ──
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [importStep, setImportStep] = useState<"pick" | "preview" | "importing" | "results">("pick");
    const [importRows, setImportRows] = useState<CsvRow[]>([]);
    const [importFileName, setImportFileName] = useState("");
    const [importResults, setImportResults] = useState<{ created: number; skipped: number; errors: { index: number; error: string; student_id?: string }[] } | null>(null);
    const [importing, setImporting] = useState(false);

    // ──────────────────────────────────────────────────────────────────────────
    // Fetch filter options
    // ──────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!teacherId) return;
        fetchSubjects();
        fetchTerms();
        fetchAssessmentTypes();
    }, [teacherId]);

    useEffect(() => {
        if (selectedSubjectId) {
            fetchClassesForSubject(selectedSubjectId);
        } else {
            setClasses([]);
            setSelectedClassId("");
        }
    }, [selectedSubjectId]);

    useEffect(() => {
        if (selectedClassId && selectedTermId) {
            fetchStudents();
        }
    }, [selectedClassId, selectedTermId]);

    const fetchSubjects = async () => {
        try {
            const { SubjectAPI } = await import("@/services/SubjectService");
            const data = await SubjectAPI.getFilteredSubjects();
            if (data && Array.isArray(data)) {
                setSubjects(data.map((s: any) => ({ id: s.id, title: s.title, class_id: s.class_id })));
            }
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    const fetchClassesForSubject = async (subjectId: string) => {
        try {
            const res = await api.get(`/teacher/subject-classes`, { params: { subject_id: subjectId } });
            const data = res.data?.data || [];
            setClasses(data.map((c: any) => ({ id: c.id, name: c.name || c.class_name || `Class ${c.id}` })));
        } catch (error) {
            console.error("Error fetching classes:", error);
            setClasses([]);
        }
    };

    const fetchTerms = async () => {
        try {
            const data = await GradingAPI.getTerms();
            if (data && Array.isArray(data)) {
                setTerms(
                    data.map((t: any) => ({
                        id: t.id,
                        name: t.name,
                        is_current: t.is_current,
                        start_date: t.start_date ?? t.startDate,
                        end_date: t.end_date ?? t.endDate,
                        locked_at: t.locked_at ?? null,
                    }))
                );
                // Auto-select active term if detected
                try {
                    const activeData = await GradingAPI.getActiveTerm();
                    if (activeData?.active_term?.id) {
                        setSelectedTermId(activeData.active_term.id);
                        setAutoSelectedActiveTerm(true);
                        return;
                    }
                } catch {}
                // Secondary fallback: date-only local detection from returned terms
                const parseDateOnly = (value: any) => {
                    if (!value) return null;
                    const str = String(value).trim();
                    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (!match) return null;
                    const y = Number(match[1]);
                    const m = Number(match[2]);
                    const d = Number(match[3]);
                    if (!y || !m || !d) return null;
                    return new Date(y, m - 1, d);
                };
                const today = new Date();
                const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const activeFromList = data.find((t: any) => {
                    const s = parseDateOnly(t.start_date ?? t.startDate);
                    const e = parseDateOnly(t.end_date ?? t.endDate);
                    return !!s && !!e && s <= todayOnly && todayOnly <= e;
                });
                if (activeFromList?.id) {
                    setSelectedTermId(activeFromList.id);
                    setAutoSelectedActiveTerm(true);
                    return;
                }
                // Fallback: select first term
                if (data.length > 0) {
                    setSelectedTermId(data[0].id);
                    setAutoSelectedActiveTerm(false);
                }
            }
        } catch (error) {
            console.error("Error fetching terms:", error);
        }
    };

    const fetchAssessmentTypes = async () => {
        try {
            const data = await GradingAPI.getAssessmentTypes();
            if (data && Array.isArray(data)) {
                setAssessmentTypes(data.map((at: any) => ({
                    id: at.id,
                    title: at.title,
                    default_max_score: at.default_max_score || 100,
                    weight: at.weight,
                })));
            }
        } catch (error) {
            console.error("Error fetching assessment types:", error);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // Fetch students for the selected class
    // ──────────────────────────────────────────────────────────────────────────

    const fetchStudents = async () => {
        if (!selectedClassId) return;
        setFetchingStudents(true);
        try {
            const res = await api.get("/teacher/list-students", { params: { class_id: selectedClassId } });
            const data = res.data?.data || [];
            setStudents(data.map((s: any) => ({
                student_id: s.id || s.student_id,
                student_name: s.full_name || s.name || s.student_name || "Unknown",
                student_display_id: s.display_id || s.student_display_id,
            })));
        } catch (error) {
            console.error("Error fetching students:", error);
            showError("Error", "Failed to load students");
            setStudents([]);
        } finally {
            setFetchingStudents(false);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // Fetch existing grade entries for the selected combination
    // ──────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (selectedClassId && selectedTermId && students.length > 0) {
            fetchExistingGrades();
        }
    }, [selectedClassId, selectedTermId, students.length]);

    const fetchExistingGrades = async () => {
        try {
            const params: any = {
                class_id: selectedClassId,
                term_id: selectedTermId,
            };
            if (selectedSubjectId) params.subject_id = selectedSubjectId;
            if (selectedAssessmentTypeId) params.assessment_type_id = selectedAssessmentTypeId;

            const data = await GradingAPI.getGradeEntries(params);
            if (!data || !Array.isArray(data)) return;

            const existingMap = new Map<string, any>();
            data.forEach((entry: any) => {
                existingMap.set(entry.student_id, entry);
            });

            const maxScore = getCurrentMaxScore();
            setGradeEntries((prev) =>
                prev.length > 0
                    ? prev.map((e) => {
                          const existing = existingMap.get(e.student_id);
                          if (existing) {
                              const pct = computePercentage(String(existing.score), e.maxScore);
                              return {
                                  ...e,
                                  score: String(existing.score ?? ""),
                                  percentage: pct,
                                  letterGrade: pct !== null ? computeLetterGrade(pct) : "--",
                                  feedback: existing.feedback || "",
                                  existingEntryId: existing.id,
                                  status: "existing" as const,
                              };
                          }
                          return e;
                      })
                    : students.map((s) => {
                          const existing = existingMap.get(s.student_id);
                          const pct = existing ? computePercentage(String(existing.score), maxScore) : null;
                          return {
                              student_id: s.student_id,
                              student_name: s.student_name,
                              student_display_id: s.student_display_id,
                              score: existing ? String(existing.score ?? "") : "",
                              maxScore,
                              percentage: pct,
                              letterGrade: pct !== null ? computeLetterGrade(pct) : "--",
                              feedback: existing?.feedback || "",
                              existingEntryId: existing?.id,
                              status: existing ? ("existing" as const) : ("new" as const),
                          };
                      })
            );
        } catch (error) {
            console.error("Error fetching existing grades:", error);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // Recompute entries when filters change
    // ──────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        const maxScore = getCurrentMaxScore();
        setGradeEntries(
            students.map((s) => ({
                student_id: s.student_id,
                student_name: s.student_name,
                student_display_id: s.student_display_id,
                score: "",
                maxScore,
                percentage: null,
                letterGrade: "--",
                feedback: "",
                status: "new" as const,
            }))
        );
    }, [students, selectedAssessmentTypeId]);

    const getCurrentMaxScore = useCallback((): number => {
        if (selectedAssessmentTypeId) {
            const at = assessmentTypes.find((a) => a.id === selectedAssessmentTypeId);
            if (at) return at.default_max_score;
        }
        return 100;
    }, [selectedAssessmentTypeId, assessmentTypes]);

    // ──────────────────────────────────────────────────────────────────────────
    // Grade editing
    // ──────────────────────────────────────────────────────────────────────────

    const updateScore = (studentId: string, newScore: string) => {
        if (isSelectedTermLocked) return;
        setGradeEntries((prev) =>
            prev.map((entry) => {
                if (entry.student_id !== studentId) return entry;
                const pct = computePercentage(newScore, entry.maxScore);
                return {
                    ...entry,
                    score: newScore,
                    percentage: pct,
                    letterGrade: pct !== null ? computeLetterGrade(pct) : "--",
                    status: entry.existingEntryId ? "updated" : "new",
                };
            })
        );
    };

    const openFeedback = (studentId: string) => {
        if (!ensureWritableTerm("Feedback updates")) return;
        const entry = gradeEntries.find((e) => e.student_id === studentId);
        setFeedbackTarget(studentId);
        setFeedbackText(entry?.feedback || "");
        setFeedbackModalVisible(true);
    };

    const saveFeedback = () => {
        if (!ensureWritableTerm("Feedback updates")) return;
        setGradeEntries((prev) =>
            prev.map((entry) =>
                entry.student_id === feedbackTarget
                    ? { ...entry, feedback: feedbackText, status: entry.existingEntryId ? "updated" : "new" }
                    : entry
            )
        );
        setFeedbackModalVisible(false);
    };

    // ──────────────────────────────────────────────────────────────────────────
    // Bulk save
    // ──────────────────────────────────────────────────────────────────────────

    const saveAllGrades = async (statusOverride?: "draft" | "final") => {
        if (!ensureWritableTerm("Grade saving")) return;
        if (!selectedClassId || !selectedTermId) {
            showError("Missing filters", "Please select a class and term first");
            return;
        }

        const gradedEntries = gradeEntries.filter((e) => e.score !== "");
        if (gradedEntries.length === 0) {
            showError("No grades", "Enter at least one score before saving");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                entries: gradedEntries.map((e) => ({
                    student_id: e.student_id,
                    subject_id: selectedSubjectId || undefined,
                    class_id: selectedClassId,
                    term_id: selectedTermId,
                    assessment_type_id: selectedAssessmentTypeId || undefined,
                    score: parseFloat(e.score),
                    max_score: e.maxScore,
                    feedback: e.feedback || undefined,
                    status: statusOverride || "draft",
                    existing_entry_id: e.existingEntryId || undefined,
                })),
            };

            await GradingAPI.bulkCreateGradeEntries(payload);

            setGradeEntries((prev) =>
                prev.map((e) => {
                    if (e.score === "") return e;
                    return { ...e, status: "existing" as const };
                })
            );

            showSuccess("Grades saved", `${gradedEntries.length} grade(s) saved as ${statusOverride || "draft"}`);
        } catch (error) {
            console.error("Error saving grades:", error);
            showError("Save failed", "Could not save grades. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // Sync operations
    // ──────────────────────────────────────────────────────────────────────────

    const syncFromAssignments = async () => {
        if (!ensureWritableTerm("Sync from assignments")) return;
        if (!selectedClassId || !selectedSubjectId) {
            showError("Missing filters", "Select a subject and class first");
            return;
        }

        setSyncing(true);
        try {
            const result = await GradingAPI.syncAssignmentGrades({
                class_id: selectedClassId,
                subject_id: selectedSubjectId,
                term_id: selectedTermId,
            });
            showSuccess("Sync complete", `Synced ${result?.synced_count || 0} assignment grade(s)`);
            if (selectedClassId && selectedTermId) {
                fetchExistingGrades();
            }
        } catch (error) {
            console.error("Error syncing assignment grades:", error);
            showError("Sync failed", "Could not sync assignment grades");
        } finally {
            setSyncing(false);
        }
    };

    const syncFromExams = async () => {
        if (!ensureWritableTerm("Sync from exams")) return;
        if (!selectedClassId || !selectedSubjectId) {
            showError("Missing filters", "Select a subject and class first");
            return;
        }

        setSyncing(true);
        try {
            const result = await GradingAPI.syncExamGrades({
                class_id: selectedClassId,
                subject_id: selectedSubjectId,
                term_id: selectedTermId,
            });
            showSuccess("Sync complete", `Synced ${result?.synced_count || 0} exam grade(s)`);
            if (selectedClassId && selectedTermId) {
                fetchExistingGrades();
            }
        } catch (error) {
            console.error("Error syncing exam grades:", error);
            showError("Sync failed", "Could not sync exam grades");
        } finally {
            setSyncing(false);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // CSV Import
    // ──────────────────────────────────────────────────────────────────────────

    const openImportModal = () => {
        if (!ensureWritableTerm("CSV import")) return;
        if (!selectedClassId || !selectedTermId || !selectedAssessmentTypeId) {
            showError("Missing filters", "Select a class, term, and assessment type before importing");
            return;
        }
        if (students.length === 0) {
            showError("No students", "Load students first by selecting a class and term");
            return;
        }
        setImportRows([]);
        setImportFileName("");
        setImportResults(null);
        setImportStep("pick");
        setImportModalVisible(true);
    };

    const pickCsvFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["text/csv", "text/comma-separated-values", "text/plain", "application/csv"],
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.length) return;

            const pickedFile = result.assets[0];
            setImportFileName(pickedFile.name);

            const expoFile = new ExpoFile(pickedFile.uri);
            const csvText = await expoFile.text();

            const parsed = parseCsv(csvText);
            if (parsed.length === 0) {
                showError("Invalid CSV", "Could not parse any grade rows. Ensure the CSV has a header row with 'student_name'/'name' and 'score' columns.");
                return;
            }

            const matched = matchCsvRows(parsed, students);
            setImportRows(matched);
            setImportStep("preview");
        } catch (error: any) {
            console.error("Error reading CSV:", error);
            showError("File error", error.message || "Could not read the selected file");
        }
    };

    const submitCsvImport = async () => {
        if (!ensureWritableTerm("CSV import")) return;
        if (!selectedClassId || !selectedSubjectId || !selectedTermId || !selectedAssessmentTypeId) {
            showError("Missing filters", "All filters must be selected");
            return;
        }

        const matchedRows = importRows.filter((r) => r.match_status === "matched" && r.matched_student);
        if (matchedRows.length === 0) {
            showError("No matches", "No students matched the CSV data");
            return;
        }

        const maxScore = getCurrentMaxScore();
        setImporting(true);
        setImportStep("importing");
        try {
            const payload = {
                class_id: selectedClassId,
                subject_id: selectedSubjectId,
                term_id: selectedTermId,
                assessment_type_id: selectedAssessmentTypeId,
                grades: matchedRows.map((r) => ({
                    student_id: r.matched_student!.student_id,
                    score: parseFloat(r.score),
                    max_score: r.max_score ? parseFloat(r.max_score) : maxScore,
                })),
            };

            const result = await GradingAPI.bulkImportGrades(payload);
            setImportResults(result);
            setImportStep("results");

            if (result?.created > 0 && selectedClassId && selectedTermId) {
                fetchExistingGrades();
            }
        } catch (error: any) {
            console.error("Error importing grades:", error);
            showError("Import failed", error.message || "Could not import grades");
            setImportStep("preview");
        } finally {
            setImporting(false);
        }
    };

    const matchedCount = importRows.filter((r) => r.match_status === "matched").length;
    const unmatchedCount = importRows.filter((r) => r.match_status === "unmatched").length;
    const duplicateCount = importRows.filter((r) => r.match_status === "duplicate").length;

    // ──────────────────────────────────────────────────────────────────────────
    // Derived data
    // ──────────────────────────────────────────────────────────────────────────

    const filteredEntries = useMemo(() => {
        if (!searchQuery) return gradeEntries;
        const q = searchQuery.toLowerCase();
        return gradeEntries.filter(
            (e) =>
                e.student_name.toLowerCase().includes(q) ||
                e.student_display_id?.toLowerCase().includes(q)
        );
    }, [gradeEntries, searchQuery]);

    const gradedCount = useMemo(() => gradeEntries.filter((e) => e.score !== "").length, [gradeEntries]);
    const totalStudents = gradeEntries.length;
    const existingCount = useMemo(() => gradeEntries.filter((e) => e.status === "existing").length, [gradeEntries]);

    const selectedTerm = useMemo(
        () => terms.find((t) => t.id === selectedTermId) || null,
        [terms, selectedTermId]
    );
    const isSelectedTermLocked = !!selectedTerm?.locked_at;

    const selectedSubjectName = subjects.find((s) => s.id === selectedSubjectId)?.title || "";
    const selectedClassName = classes.find((c) => c.id === selectedClassId)?.name || "";
    const selectedTermName = terms.find((t) => t.id === selectedTermId)?.name || "";
    const selectedAssessmentName = assessmentTypes.find((a) => a.id === selectedAssessmentTypeId)?.title || "";

    const ensureWritableTerm = (actionLabel: string): boolean => {
        if (isSelectedTermLocked) {
            showError("Term Locked", `${actionLabel} is blocked because this term is locked.`);
            return false;
        }
        return true;
    };

    // ──────────────────────────────────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────────────────────────────────

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Management"
                subtitle="Grade Entry"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                <View className="p-4 md:p-8">
                    {/* ── Summary Stats ── */}
                    <View className="flex-row items-center mb-2 px-1">
                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Grade Entry Summary</Text>
                        <HelpTooltip id="teacher.manage.grade_entry" role="teacher" tier={tier} onLearnMore={openManual} />
                    </View>
                    <View className="flex-row gap-3 mb-6">
                        <View className="flex-1 bg-[#FF6900] p-4 rounded-3xl shadow-sm">
                            <Text className="text-orange-100 text-[10px] font-bold uppercase tracking-wider">Graded</Text>
                            <Text className="text-white text-2xl font-bold mt-1">
                                {gradedCount}
                                <Text className="text-orange-200 text-sm font-medium">/{totalStudents}</Text>
                            </Text>
                        </View>
                        <View className="flex-1 bg-green-500 p-4 rounded-3xl shadow-sm">
                            <Text className="text-green-100 text-[10px] font-bold uppercase tracking-wider">Finalized</Text>
                            <Text className="text-white text-2xl font-bold mt-1">{existingCount}</Text>
                        </View>
                        <View className="flex-1 bg-gray-800 dark:bg-[#161B22] p-4 rounded-3xl shadow-sm">
                            <Text className="text-gray-300 text-[10px] font-bold uppercase tracking-wider">Pending</Text>
                            <Text className="text-white text-2xl font-bold mt-1">{totalStudents - gradedCount}</Text>
                        </View>
                    </View>

                    {/* ── Filters ── */}
                    <View className="mb-6">
                        <View className="flex-row items-center mb-3">
                            <Filter size={14} color="#FF6900" />
                            <Text className="text-gray-900 dark:text-white font-bold text-sm ml-2 tracking-tight">Filters</Text>
                            <HelpTooltip id="teacher.manage.grade_entry" role="teacher" tier={tier} onLearnMore={openManual} />
                        </View>

                        <DropdownSelector
                            label="Subject"
                            value={selectedSubjectName}
                            options={subjects.map((s) => ({ id: s.id, label: s.title }))}
                            onSelect={(id) => {
                                setSelectedSubjectId(id);
                                setSelectedClassId("");
                            }}
                        />

                        <DropdownSelector
                            label="Class"
                            value={selectedClassName}
                            options={classes.map((c) => ({ id: c.id, label: c.name }))}
                            onSelect={setSelectedClassId}
                            loading={fetchingStudents}
                            placeholder={selectedSubjectId ? "Select a class..." : "Select a subject first"}
                        />

                        <View className="flex-row gap-3">
                            <View className="flex-1">
                                <DropdownSelector
                                    label="Term"
                                    value={selectedTermName}
                                    options={terms.map((t) => ({ id: t.id, label: t.name }))}
                                    onSelect={(id) => {
                                        setSelectedTermId(id);
                                        setAutoSelectedActiveTerm(false);
                                    }}
                                />
                                {autoSelectedActiveTerm && selectedTermId ? (
                                    <View className="mt-2 self-start rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1 border border-emerald-200 dark:border-emerald-700">
                                        <Text className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                            Active term auto-selected
                                        </Text>
                                    </View>
                                ) : null}
                                {isSelectedTermLocked ? (
                                    <View className="mt-2 self-start rounded-full bg-red-100 dark:bg-red-900/40 px-3 py-1 border border-red-200 dark:border-red-700">
                                        <Text className="text-[10px] font-semibold text-red-700 dark:text-red-300">
                                            Locked term: editing disabled
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            <View className="flex-1">
                                <DropdownSelector
                                    label="Assessment Type"
                                    value={selectedAssessmentName}
                                    options={assessmentTypes.map((a) => ({ id: a.id, label: a.title }))}
                                    onSelect={setSelectedAssessmentTypeId}
                                    placeholder="All types"
                                />
                            </View>
                        </View>
                    </View>

                    {/* ── Sync Buttons ── */}
                    {selectedSubjectId && selectedClassId && (
                        <View className="flex-row items-center mb-2 px-1">
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Data Sync</Text>
                            <HelpTooltip id="teacher.manage.grade_entry" role="teacher" tier={tier} onLearnMore={openManual} />
                        </View>
                    )}
                    {selectedSubjectId && selectedClassId && (
                        <View className="flex-row gap-3 mb-6">
                            <TouchableOpacity
                                className={`flex-1 bg-white dark:bg-[#161B22] py-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 flex-row items-center justify-center shadow-sm active:bg-gray-50 dark:active:bg-gray-900 ${(syncing || isSelectedTermLocked) ? "opacity-50" : ""}`}
                                onPress={syncFromAssignments}
                                disabled={syncing || isSelectedTermLocked}
                            >
                                {syncing ? (
                                    <ActivityIndicator size="small" color="#FF6900" />
                                ) : (
                                    <RefreshCw size={14} color="#FF6900" />
                                )}
                                <Text className="text-gray-700 dark:text-gray-200 font-bold text-xs ml-2">Sync Assignments</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className={`flex-1 bg-white dark:bg-[#161B22] py-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 flex-row items-center justify-center shadow-sm active:bg-gray-50 dark:active:bg-gray-900 ${(syncing || isSelectedTermLocked) ? "opacity-50" : ""}`}
                                onPress={syncFromExams}
                                disabled={syncing || isSelectedTermLocked}
                            >
                                {syncing ? (
                                    <ActivityIndicator size="small" color="#FF6900" />
                                ) : (
                                    <RefreshCw size={14} color="#FF6900" />
                                )}
                                <Text className="text-gray-700 dark:text-gray-200 font-bold text-xs ml-2">Sync Exams</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Import CSV Button ── */}
                    {selectedClassId && selectedTermId && selectedAssessmentTypeId && (
                        <View className="flex-row items-center mb-2 px-1">
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Bulk Import</Text>
                            <HelpTooltip id="teacher.manage.grade_entry" role="teacher" tier={tier} onLearnMore={openManual} />
                        </View>
                    )}
                    {selectedClassId && selectedTermId && selectedAssessmentTypeId && (
                        <TouchableOpacity
                            className={`bg-white dark:bg-[#161B22] py-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 flex-row items-center justify-center shadow-sm mb-6 active:bg-gray-50 dark:active:bg-gray-900 ${isSelectedTermLocked ? "opacity-50" : ""}`}
                            onPress={openImportModal}
                            disabled={isSelectedTermLocked}
                        >
                            <Upload size={14} color="#FF6900" />
                            <Text className="text-[#FF6900] font-bold text-xs ml-2">Import Grades from CSV</Text>
                        </TouchableOpacity>
                    )}

                    {/* ── Search ── */}
                    {gradeEntries.length > 0 && (
                        <View className="flex-row items-center bg-white dark:bg-[#161B22] rounded-2xl px-4 py-3 mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                            <Search size={18} color="#9CA3AF" />
                            <TextInput
                                className="flex-1 ml-3 text-gray-900 dark:text-gray-100 font-medium"
                                placeholder="Search students..."
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery("")}>
                                    <X size={16} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* ── Grade Table ── */}
                    {!selectedClassId || !selectedTermId ? (
                        <View className="bg-white dark:bg-[#161B22] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center tracking-tight">
                                Select a subject, class, and term to begin grading.
                            </Text>
                        </View>
                    ) : fetchingStudents ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : filteredEntries.length === 0 ? (
                        <View className="bg-white dark:bg-[#161B22] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center tracking-tight">
                                {searchQuery ? "No students match your search." : "No students found for this class."}
                            </Text>
                        </View>
                    ) : (
                        <View>
                            {/* Table Header */}
                            <View className="flex-row bg-gray-100 dark:bg-[#161B22] rounded-t-2xl px-4 py-3 items-center">
                                <Text className="w-[120px] text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Student</Text>
                                <Text className="w-[70px] text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider text-center">Score</Text>
                                <Text className="w-[45px] text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider text-center">%</Text>
                                <Text className="w-[40px] text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider text-center">Grade</Text>
                                <View className="flex-1" />
                                <Text className="w-[36px] text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider text-center">Note</Text>
                            </View>

                            {/* Student Rows */}
                            <ScrollView
                                horizontal={false}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled
                                style={{ maxHeight: 520 }}
                            >
                                {filteredEntries.map((entry, index) => {
                                    const isUngraded = entry.score === "";
                                    const isExisting = entry.status === "existing";

                                    return (
                                        <View
                                            key={entry.student_id}
                                            className={`flex-row items-center px-4 py-3 border-b border-gray-50 dark:border-gray-900 ${
                                                index % 2 === 0
                                                    ? "bg-white dark:bg-[#161B22]"
                                                    : "bg-gray-50/50 dark:bg-[#161616]/50"
                                            } ${isUngraded ? "opacity-70" : ""}`}
                                        >
                                            {/* Student Name */}
                                            <View className="w-[120px] flex-row items-center">
                                                <View className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/30 items-center justify-center mr-2">
                                                    <Text className="text-[#FF6900] font-bold text-[10px]">
                                                        {entry.student_name.charAt(0)}
                                                    </Text>
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-gray-900 dark:text-gray-100 font-bold text-xs" numberOfLines={1}>
                                                        {entry.student_name}
                                                    </Text>
                                                    {isExisting && (
                                                        <Text className="text-green-600 dark:text-green-400 text-[8px] font-bold uppercase tracking-wider">
                                                            Graded
                                                        </Text>
                                                    )}
                                                </View>
                                            </View>

                                            {/* Score Input */}
                                            <View className="w-[70px]">
                                                <TextInput
                                                    className="bg-gray-100 dark:bg-[#161B22] rounded-xl px-2 py-2 text-gray-900 dark:text-white font-bold text-xs text-center border border-gray-200 dark:border-gray-700"
                                                    placeholder={`/${entry.maxScore}`}
                                                    placeholderTextColor="#9CA3AF"
                                                    keyboardType="numeric"
                                                    value={entry.score}
                                                    onChangeText={(val) => updateScore(entry.student_id, val)}
                                                    editable={!isSelectedTermLocked}
                                                />
                                            </View>

                                            {/* Percentage */}
                                            <View className="w-[45px] items-center">
                                                <Text className="text-gray-500 dark:text-gray-400 font-bold text-[10px]">
                                                    {entry.percentage !== null ? `${Math.round(entry.percentage)}%` : "--"}
                                                </Text>
                                            </View>

                                            {/* Letter Grade */}
                                            <View className="w-[40px] items-center">
                                                {entry.letterGrade !== "--" ? (
                                                    <View className={`px-1.5 py-0.5 rounded-md ${letterGradeColor(entry.letterGrade)}`}>
                                                        <Text className="text-[8px] font-bold">{entry.letterGrade}</Text>
                                                    </View>
                                                ) : (
                                                    <Text className="text-gray-300 dark:text-gray-600 text-[10px]">--</Text>
                                                )}
                                            </View>

                                            <View className="flex-1" />

                                            {/* Feedback Button */}
                                            <TouchableOpacity
                                                className="w-[36px] h-[36px] rounded-xl items-center justify-center bg-gray-100 dark:bg-[#161B22] active:bg-gray-200 dark:active:bg-gray-700"
                                                onPress={() => openFeedback(entry.student_id)}
                                                disabled={isSelectedTermLocked}
                                            >
                                                <Text className={`text-[10px] font-bold ${entry.feedback ? "text-[#FF6900]" : "text-gray-400"}`}>
                                                    {entry.feedback ? "✓" : "+"}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* ── Sticky Bottom Actions ── */}
            {gradeEntries.length > 0 && (
                <View className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-[#161B22] border-t border-gray-100 dark:border-gray-800 px-4 py-4 pb-8">
                    <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center">
                            <Text className="text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                                {gradedCount}/{totalStudents} graded
                            </Text>
                            <HelpTooltip id="teacher.manage.grade_entry" role="teacher" tier={tier} onLearnMore={openManual} />
                        </View>
                        <Text className="text-gray-500 dark:text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                            {existingCount} saved
                        </Text>
                    </View>

                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className={`flex-1 bg-gray-100 dark:bg-[#161B22] py-4 rounded-2xl items-center active:bg-gray-200 dark:active:bg-gray-700 ${(saving || isSelectedTermLocked) ? "opacity-50" : ""}`}
                            onPress={() => saveAllGrades("draft")}
                            disabled={saving || isSelectedTermLocked}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="#FF6900" />
                            ) : (
                                <Text className="text-gray-700 dark:text-gray-200 font-bold text-xs">Save Draft</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            className={`flex-[2] bg-[#FF6900] py-4 rounded-2xl items-center shadow-lg active:bg-orange-600 ${(saving || isSelectedTermLocked) ? "opacity-50" : ""}`}
                            onPress={() => saveAllGrades("final")}
                            disabled={saving || isSelectedTermLocked}
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <View className="flex-row items-center">
                                    <Save size={16} color="white" />
                                    <Text className="text-white font-bold text-sm ml-2">Save All Grades</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ── CSV Import Modal ── */}
            <Modal visible={importModalVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white dark:bg-[#161B22] rounded-t-[40px] p-8 pb-12 border-t border-gray-100 dark:border-gray-800 max-h-[85%]">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {importStep === "pick" && "Import Grades from CSV"}
                                {importStep === "preview" && "Preview Import"}
                                {importStep === "importing" && "Importing..."}
                                {importStep === "results" && "Import Results"}
                            </Text>
                            <TouchableOpacity
                                className="w-10 h-10 bg-gray-50 dark:bg-[#161B22] rounded-full items-center justify-center"
                                onPress={() => setImportModalVisible(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Step 1: Pick file */}
                        {importStep === "pick" && (
                            <View>
                                <Text className="text-gray-500 dark:text-gray-400 text-xs mb-4">
                                    Upload a CSV file with columns: student_name (or name) + score.
                                    Optionally include max_score.
                                </Text>
                                <TouchableOpacity
                                    className="bg-gray-50 dark:bg-[#161B22] rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-12 items-center justify-center active:bg-gray-100 dark:active:bg-gray-800"
                                    onPress={pickCsvFile}
                                >
                                    <Upload size={28} color="#FF6900" />
                                    <Text className="text-gray-700 dark:text-gray-200 font-semibold text-sm mt-3">Choose CSV File</Text>
                                    <Text className="text-gray-400 dark:text-gray-500 text-xs mt-1">.csv, .txt files accepted</Text>
                                </TouchableOpacity>
                                <View className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mt-4 border border-blue-100 dark:border-blue-800">
                                    <Text className="text-blue-700 dark:text-blue-300 text-xs font-bold mb-2">Expected CSV Format:</Text>
                                    <Text className="text-blue-600 dark:text-blue-400 text-xs font-mono leading-5">
                                        student_name,score{"\n"}
                                        John Smith,85{"\n"}
                                        Jane Doe,92
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Step 2: Preview */}
                        {importStep === "preview" && (
                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                                {/* Summary */}
                                <View className="flex-row gap-3 mb-4">
                                    <View className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 border border-green-100 dark:border-green-800">
                                        <Text className="text-green-700 dark:text-green-300 text-lg font-bold text-center">{matchedCount}</Text>
                                        <Text className="text-green-500 dark:text-green-400 text-xs text-center">Matched</Text>
                                    </View>
                                    <View className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-2xl p-3 border border-red-100 dark:border-red-800">
                                        <Text className="text-red-700 dark:text-red-300 text-lg font-bold text-center">{unmatchedCount}</Text>
                                        <Text className="text-red-500 dark:text-red-400 text-xs text-center">Unmatched</Text>
                                    </View>
                                    {duplicateCount > 0 && (
                                        <View className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-3 border border-yellow-100 dark:border-yellow-800">
                                            <Text className="text-yellow-700 dark:text-yellow-300 text-lg font-bold text-center">{duplicateCount}</Text>
                                            <Text className="text-yellow-500 dark:text-yellow-400 text-xs text-center">Duplicates</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Rows */}
                                {importRows.map((row, idx) => (
                                    <View
                                        key={idx}
                                        className={`rounded-2xl p-4 mb-3 border ${
                                            row.match_status === "matched"
                                                ? "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800"
                                                : row.match_status === "duplicate"
                                                ? "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-800"
                                                : "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800"
                                        }`}
                                    >
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-1">
                                                <Text className="text-gray-900 dark:text-white font-semibold text-sm">
                                                    {row.student_name || row.student_display_id || "Unknown"}
                                                </Text>
                                                {row.match_status === "matched" && row.matched_student && (
                                                    <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                                                        → {row.matched_student.student_name}
                                                    </Text>
                                                )}
                                                {row.match_status === "duplicate" && (
                                                    <Text className="text-yellow-600 dark:text-yellow-400 text-xs mt-0.5">
                                                        Duplicate entry
                                                    </Text>
                                                )}
                                                {row.match_status === "unmatched" && (
                                                    <Text className="text-red-500 dark:text-red-400 text-xs mt-0.5">
                                                        No matching student found
                                                    </Text>
                                                )}
                                            </View>
                                            <View className="flex-row items-center">
                                                <Text className="text-gray-900 dark:text-white font-bold text-sm">
                                                    {row.score}
                                                </Text>
                                                <Text className="text-gray-400 dark:text-gray-500 text-xs ml-1">
                                                    /{row.max_score || getCurrentMaxScore()}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}

                                {/* Actions */}
                                <View className="flex-row gap-3 mt-4">
                                    <TouchableOpacity
                                        className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] py-4 rounded-2xl items-center border border-gray-100 dark:border-gray-800 active:bg-gray-100 dark:active:bg-gray-800"
                                        onPress={() => setImportStep("pick")}
                                    >
                                        <Text className="text-gray-700 dark:text-gray-200 font-semibold text-sm">Back</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className={`flex-1 py-4 rounded-2xl items-center shadow-sm active:bg-orange-600 ${
                                            matchedCount === 0 ? "bg-gray-300" : "bg-[#FF6900]"
                                        }`}
                                        onPress={submitCsvImport}
                                        disabled={matchedCount === 0}
                                    >
                                        <Text className="text-white font-bold text-sm">
                                            Import {matchedCount} Grade{matchedCount !== 1 ? "s" : ""}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}

                        {/* Step 3: Importing */}
                        {importStep === "importing" && (
                            <View className="items-center py-12">
                                <ActivityIndicator size="large" color="#FF6900" />
                                <Text className="text-gray-500 dark:text-gray-400 text-sm mt-4">
                                    Importing grades...
                                </Text>
                            </View>
                        )}

                        {/* Step 4: Results */}
                        {importStep === "results" && importResults && (
                            <View>
                                <View className="flex-row gap-3 mb-4">
                                    <View className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 border border-green-100 dark:border-green-800">
                                        <Text className="text-green-700 dark:text-green-300 text-lg font-bold text-center">{importResults.created}</Text>
                                        <Text className="text-green-500 dark:text-green-400 text-xs text-center">Created</Text>
                                    </View>
                                    <View className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-3 border border-yellow-100 dark:border-yellow-800">
                                        <Text className="text-yellow-700 dark:text-yellow-300 text-lg font-bold text-center">{importResults.skipped}</Text>
                                        <Text className="text-yellow-500 dark:text-yellow-400 text-xs text-center">Skipped</Text>
                                    </View>
                                    {importResults.errors.length > 0 && (
                                        <View className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-2xl p-3 border border-red-100 dark:border-red-800">
                                            <Text className="text-red-700 dark:text-red-300 text-lg font-bold text-center">{importResults.errors.length}</Text>
                                            <Text className="text-red-500 dark:text-red-400 text-xs text-center">Errors</Text>
                                        </View>
                                    )}
                                </View>

                                {importResults.errors.length > 0 && (
                                    <View className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 mb-4 border border-red-100 dark:border-red-800">
                                        <Text className="text-red-700 dark:text-red-300 font-bold text-xs mb-2">Errors:</Text>
                                        {importResults.errors.slice(0, 5).map((err, i) => (
                                            <Text key={i} className="text-red-600 dark:text-red-400 text-xs mb-1">
                                                Row {err.index + 1}: {err.error}
                                            </Text>
                                        ))}
                                        {importResults.errors.length > 5 && (
                                            <Text className="text-red-500 dark:text-red-400 text-xs">
                                                ...and {importResults.errors.length - 5} more
                                            </Text>
                                        )}
                                    </View>
                                )}

                                <TouchableOpacity
                                    className="bg-[#FF6900] py-5 rounded-2xl items-center shadow-lg active:bg-orange-600"
                                    onPress={() => setImportModalVisible(false)}
                                >
                                    <Text className="text-white font-bold text-lg">Done</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── Feedback Modal ── */}
            <Modal visible={feedbackModalVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white dark:bg-[#161B22] rounded-t-[40px] p-8 pb-12 border-t border-gray-100 dark:border-gray-800">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Feedback</Text>
                            <TouchableOpacity
                                className="w-10 h-10 bg-gray-50 dark:bg-[#161B22] rounded-full items-center justify-center"
                                onPress={() => setFeedbackModalVisible(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <Text className="text-gray-400 dark:text-gray-500 text-xs mb-4" numberOfLines={1}>
                            {gradeEntries.find((e) => e.student_id === feedbackTarget)?.student_name}
                        </Text>

                        <TextInput
                            className="bg-gray-50 dark:bg-[#161B22] rounded-2xl px-5 py-4 text-gray-900 dark:text-white h-36 border border-gray-100 dark:border-gray-800"
                            placeholder="Write feedback for this student..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            textAlignVertical="top"
                            value={feedbackText}
                            onChangeText={setFeedbackText}
                        />

                        <TouchableOpacity
                            className="bg-[#FF6900] py-5 rounded-2xl items-center mt-6 shadow-lg active:bg-orange-600"
                            onPress={saveFeedback}
                        >
                            <Text className="text-white font-bold text-lg">Save Feedback</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
