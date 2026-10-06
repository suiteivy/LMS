// (admin)/timetable/index.tsx — Mobile-Optimized & Theme-Aware Timetable Builder
import { ActionTooltip } from "@/components/common/ActionTooltip";
import { GradingAPI } from "@/services/GradingService";
import { Spinner } from "@/components/ui/Spinner";
import { TimetableScheduleSkeleton } from "@/components/ui/skeletons";
import { supabase } from "@/libs/supabase";
import { ClassAPI, ClassItem as ClassData } from "@/services/ClassService";
import { SubjectAPI, SubjectData } from "@/services/SubjectService";
import { CreateTimetableDto, TimetableAPI, TimetableEntry } from "@/services/TimetableService";
import { showError, showSuccess } from "@/utils/toast";
import { formatClassLabel } from "@/utils/classLabel";
import { useRouter } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { downloadTimetablePdf } from "@/utils/timetablePdfGenerator";
import { CalendarAPI, CancelledDateInfo } from "@/services/CalendarService";
import {
    AlertOctagon,
    AlertTriangle,
    Bell,
    BookOpen,
    Calendar,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Clock,
    Download,
    Edit3,
    GraduationCap,
    Info,
    Layers,
    MapPin,
    Plus,
    RefreshCw,
    Search,
    Shield,
    Sparkles,
    Trash2,
    User,
    Users,
    X,
    Zap
} from "lucide-react-native";
import { AutoGenerateModal } from "@/components/timetable/AutoGenerateModal";
import { ManualBuilderModal } from "@/components/timetable/ManualBuilderModal";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Colour palette for subject cards (cycles)
const SUBJECT_COLORS = [
    "#FF6900", "#3B82F6", "#22C55E", "#F59E0B", "#A78BFA", "#F87171", "#10B981", "#06B6D4", "#EC4899"
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ConflictSeverity = "error" | "warning" | "info";
type ConflictType =
    | "room_clash"
    | "teacher_double_book"
    | "class_double_book"
    | "back_to_back"
    | "room_unavailable"
    | "capacity_mismatch";

interface Conflict {
    id: string;
    type: ConflictType;
    severity: ConflictSeverity;
    day: string;
    message: string;
    detail: string;
    affectedEntryIds: string[];
    affectedTeacherUserIds: string[];
    affectedClassIds: string[];
}

// ─── Conflict Detection Engine ────────────────────────────────────────────────

const toMinutes = (t: string): number => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
};

const overlaps = (s1: number, e1: number, s2: number, e2: number) => s1 < e2 && s2 < e1;

const localDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

function detectConflicts(entries: TimetableEntry[]): Conflict[] {
    const conflicts: Conflict[] = [];
    let idSeq = 0;
    const nextId = () => `c${++idSeq}`;

    const byDay: Record<string, TimetableEntry[]> = {};
    for (const e of entries) {
        if (!byDay[e.day_of_week]) byDay[e.day_of_week] = [];
        byDay[e.day_of_week].push(e);
    }

    for (const [day, slots] of Object.entries(byDay)) {
        const sorted = [...slots].sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));

        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                const a = sorted[i];
                const b = sorted[j];
                const as_ = toMinutes(a.start_time), ae = toMinutes(a.end_time);
                const bs = toMinutes(b.start_time), be = toMinutes(b.end_time);
                if (!overlaps(as_, ae, bs, be)) continue;

                const aTeacher = a.teachers?.full_name || a.subjects?.teachers?.users?.full_name || "Unknown teacher";
                const bTeacher = b.teachers?.full_name || b.subjects?.teachers?.users?.full_name || "Unknown teacher";
                const aTeacherId = a.teacher_id || (a.subjects as any)?.teacher_id || "";
                const bTeacherId = b.teacher_id || (b.subjects as any)?.teacher_id || "";
                const aSub = a.subjects?.title ?? a.subject_name ?? "Unknown";
                const bSub = b.subjects?.title ?? b.subject_name ?? "Unknown";

                // Teacher double-booking (institution-wide)
                if (aTeacherId && bTeacherId && aTeacherId === bTeacherId && a.id !== b.id) {
                    conflicts.push({
                        id: nextId(), type: "teacher_double_book", severity: "error", day,
                        message: `${aTeacher} has two classes simultaneously on ${day}`,
                        detail: `Teaching "${aSub}" and "${bSub}" at overlapping times (${a.start_time.slice(0, 5)}–${a.end_time.slice(0, 5)}).`,
                        affectedEntryIds: [a.id, b.id],
                        affectedTeacherUserIds: [aTeacherId],
                        affectedClassIds: [a.class_id, b.class_id],
                    });
                }

                // Class double-booking
                if (a.class_id === b.class_id && a.id !== b.id) {
                    conflicts.push({
                        id: nextId(), type: "class_double_book", severity: "error", day,
                        message: `Class has overlapping subjects on ${day}`,
                        detail: `"${aSub}" and "${bSub}" overlap — students cannot attend two subjects simultaneously.`,
                        affectedEntryIds: [a.id, b.id],
                        affectedTeacherUserIds: [aTeacherId, bTeacherId].filter(Boolean),
                        affectedClassIds: [a.class_id],
                    });
                }
            }
        }

        // Back-to-back detection (≥3 consecutive sessions with <15 min gaps)
        const teacherSlots: Record<string, TimetableEntry[]> = {};
        for (const s of sorted) {
            const tid = (s.subjects as any)?.teacher_id ?? s.teacher_id ?? "__unknown__";
            if (!teacherSlots[tid]) teacherSlots[tid] = [];
            teacherSlots[tid].push(s);
        }
        for (const [, slotsForTeacher] of Object.entries(teacherSlots)) {
            if (slotsForTeacher.length < 3) continue;
            let streak = 1;
            for (let k = 1; k < slotsForTeacher.length; k++) {
                const gap = toMinutes(slotsForTeacher[k].start_time) - toMinutes(slotsForTeacher[k - 1].end_time);
                if (gap < 15) {
                    streak++;
                    if (streak === 3) {
                        const tName =
                            slotsForTeacher[k].teachers?.full_name ||
                            slotsForTeacher[k].subjects?.teachers?.users?.full_name ||
                            "A teacher";
                        conflicts.push({
                            id: nextId(), type: "back_to_back", severity: "warning", day,
                            message: `${tName} has 3+ consecutive sessions on ${day}`,
                            detail: `${streak} sessions with less than 15 min between them. Consider adding a break.`,
                            affectedEntryIds: slotsForTeacher.slice(k - 2, k + 1).map(s => s.id),
                            affectedTeacherUserIds: [],
                            affectedClassIds: slotsForTeacher.slice(k - 2, k + 1).map(s => s.class_id),
                        });
                    }
                } else { streak = 1; }
            }
        }
    }
    return conflicts;
}

// ─── Notification Dispatch ────────────────────────────────────────────────────

async function sendConflictNotifications(
    conflicts: Conflict[],
    institutionType: string | null,
    institutionId: string | null
) {
    if (!institutionId || conflicts.length === 0) return 0;
    const teacherUserIds = [...new Set(conflicts.flatMap(c => c.affectedTeacherUserIds).filter(Boolean))];
    const classIds = [...new Set(conflicts.flatMap(c => c.affectedClassIds).filter(Boolean))];

    const { data: teacherRows } = await supabase.from("teachers").select("user_id").in("id", teacherUserIds);
    const teacherUids = (teacherRows ?? []).map((t: any) => t.user_id as string);

    const { data: adminRows } = await supabase.from("users").select("id").eq("institution_id", institutionId).eq("role", "admin");
    const adminUids = (adminRows ?? []).map((a: any) => a.id as string);

    let studentUids: string[] = [];
    if (institutionType === "tertiary" && classIds.length > 0) {
        const { data: subjRows } = await supabase.from("subjects").select("id").in("class_id", classIds);
        if (subjRows?.length) {
            const { data: enrollRows } = await supabase.from("enrollments").select("student_id").in("subject_id", subjRows.map((s: any) => s.id));
            if (enrollRows?.length) {
                const studentIds = [...new Set((enrollRows ?? []).map((e: any) => e.student_id as string))];
                const { data: stuUserRows } = await supabase.from("students").select("user_id").in("id", studentIds);
                studentUids = (stuUserRows ?? []).map((s: any) => s.user_id as string);
            }
        }
    }

    const recipientSet = new Set<string>([...teacherUids, ...adminUids, ...studentUids]);
    const errorCount = conflicts.filter(c => c.severity === "error").length;
    const warnCount = conflicts.filter(c => c.severity === "warning").length;
    const summary = [
        errorCount > 0 ? `${errorCount} conflict${errorCount > 1 ? "s" : ""}` : null,
        warnCount > 0 ? `${warnCount} warning${warnCount > 1 ? "s" : ""}` : null,
    ].filter(Boolean).join(", ");

    const rows = [...recipientSet].map(uid => ({
        user_id: uid,
        title: "⚠️ Timetable Conflict Detected",
        message: `${summary} found in the class timetable. Please review and resolve.`,
        type: "warning" as const,
        is_read: false,
        created_at: new Date().toISOString(),
    }));
    if (rows.length === 0) return 0;
    const { error } = await (supabase.from("notifications") as any).insert(rows);
    if (error) throw error;
    return rows.length;
}

// ─── ConflictPanel ────────────────────────────────────────────────────────────

function ConflictPanel({ conflicts, onSendAll, sending, institutionType, colors, styles }: {
    conflicts: Conflict[];
    onSendAll: () => void;
    sending: boolean;
    institutionType: string | null;
    colors: any;
    styles: any;
}) {
    const [expanded, setExpanded] = useState(false);
    const errors = conflicts.filter(c => c.severity === "error").length;
    const warnings = conflicts.filter(c => c.severity === "warning").length;
    const isTertiary = institutionType === "tertiary";

    const typeMeta: Record<ConflictType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
        room_clash: { label: "Room Clash", color: colors.red, bg: colors.redDim, icon: <MapPin size={12} color={colors.red} /> },
        teacher_double_book: { label: "Teacher Conflict", color: colors.red, bg: colors.redDim, icon: <User size={12} color={colors.red} /> },
        class_double_book: { label: "Class Double-Book", color: colors.red, bg: colors.redDim, icon: <BookOpen size={12} color={colors.red} /> },
        back_to_back: { label: "Back-to-Back", color: colors.amber, bg: colors.amberDim, icon: <Clock size={12} color={colors.amber} /> },
        room_unavailable: { label: "Room Unavailable", color: colors.amber, bg: colors.amberDim, icon: <MapPin size={12} color={colors.amber} /> },
        capacity_mismatch: { label: "Capacity Mismatch", color: colors.blue, bg: colors.blueDim, icon: <Info size={12} color={colors.blue} /> },
    };

    if (conflicts.length === 0) {
        return null;
    }

    return (
        <View style={styles.conflictPanel}>
            <TouchableOpacity style={styles.conflictHeader} onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
                <View style={styles.conflictHeaderLeft}>
                    <View style={styles.conflictIconBox}>
                        <Shield size={16} color={colors.red} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.conflictTitle}>
                             {conflicts.length} Schedule Conflict{conflicts.length > 1 ? "s" : ""}
                        </Text>
                        <Text style={styles.conflictSub}>
                            {errors} error{errors !== 1 ? "s" : ""}, {warnings} warning{warnings !== 1 ? "s" : ""}
                        </Text>
                    </View>
                    {errors > 0 && (
                        <View style={[styles.badge, { backgroundColor: colors.red }]}>
                            <Text style={styles.badgeText}>{errors} ERR</Text>
                        </View>
                    )}
                    {warnings > 0 && (
                        <View style={[styles.badge, { backgroundColor: colors.amber }]}>
                            <Text style={styles.badgeText}>{warnings} WARN</Text>
                        </View>
                    )}
                </View>
                {expanded ? <ChevronUp size={18} color={colors.textSub} /> : <ChevronDown size={18} color={colors.textSub} />}
            </TouchableOpacity>

            {expanded && (
                <>
                    <View style={styles.divider} />
                    <View style={{ maxHeight: 280 }}>
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            {conflicts.map((c, idx) => {
                                const meta = typeMeta[c.type] || {
                                    label: "Conflict",
                                    color: colors.red,
                                    bg: colors.redDim,
                                    icon: <AlertTriangle size={12} color={colors.red} />
                                };
                                return (
                                    <View key={c.id} style={[styles.conflictItem, idx < conflicts.length - 1 && styles.conflictItemBorder]}>
                                        <View style={[styles.conflictItemStrip, { backgroundColor: meta.color }]} />
                                        <View style={{ flex: 1, paddingLeft: 10 }}>
                                            <View style={styles.conflictItemRow}>
                                                <View style={[styles.typePill, { backgroundColor: meta.bg }]}>
                                                    {meta.icon}
                                                    <Text style={[styles.typePillText, { color: meta.color }]}>{meta.label}</Text>
                                                </View>
                                                <Text style={styles.conflictDay}>{c.day.slice(0, 3).toUpperCase()}</Text>
                                            </View>
                                            <Text style={styles.conflictMsg}>{c.message}</Text>
                                            <Text style={styles.conflictDetail}>{c.detail}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.conflictFooter}>
                        <ActionTooltip
                            label="Broadcast Clash Notice"
                            description="Send urgent alerts to affected teacher, class heads, and staff regarding scheduling collisions."
                            learnMoreAnchor="timetable-builder"
                        >
                            <TouchableOpacity
                                style={[styles.alertBtn, sending && { opacity: 0.5 }]}
                                onPress={onSendAll}
                                disabled={sending}
                                accessibilityState={{ disabled: sending, busy: sending }}
                                activeOpacity={0.8}
                            >
                                {sending ? (
                                    <Spinner color="#fff" size="small" label="Sending conflict alerts" />
                                ) : (
                                    <>
                                        <Bell size={14} color="#fff" />
                                        <Text style={styles.alertBtnText}>Alert Affected Stakeholders</Text>
                                        <Zap size={12} color="#fff" />
                                    </>
                                )}
                            </TouchableOpacity>
                        </ActionTooltip>
                        <Text style={styles.conflictFooterNote}>
                            Notifies affected {isTertiary ? "teachers, admins & student delegates" : "teachers & administrative staff"}
                        </Text>
                    </View>
                </>
            )}
        </View>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TimetableBuilder() {
    const router = useRouter();
    const { isDark } = useTheme();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const isMobile = width < 768;

    // Derive theme-based palette
    const colors = useMemo(() => {
        return {
            bg: isDark ? "#0F141C" : "#F6F8FA",
            surface: isDark ? "#161B22" : "#FFFFFF",
            surface2: isDark ? "#21262D" : "#F0F3F6",
            border: isDark ? "#30363D" : "#D0D7DE",
            borderLight: isDark ? "rgba(255,255,255,0.08)" : "#E1E4E8",
            text: isDark ? "#F0F6FC" : "#111827",
            textSub: isDark ? "#8B949E" : "#4B5563",
            textMuted: isDark ? "#6E7681" : "#9CA3AF",
            accent: "#FF6900",
            accentDim: "rgba(255,105,0,0.14)",
            accentBorder: "rgba(255,105,0,0.35)",
            red: "#EF4444",
            redDim: "rgba(239,68,68,0.14)",
            amber: "#F59E0B",
            amberDim: "rgba(245,158,11,0.14)",
            blue: "#3B82F6",
            blueDim: "rgba(59,130,246,0.14)",
            green: "#10B981",
            greenDim: "rgba(16,185,129,0.14)",
            pill: isDark ? "#10B981" : "#059669",
        };
    }, [isDark]);

    const styles = useMemo(() => getStyles(colors, isMobile), [colors, isMobile]) as any;

    const { institutionName, institutionLogo } = useAuth();

    // Data state
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchingTimetable, setFetchingTimetable] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [allEntries, setAllEntries] = useState<TimetableEntry[]>([]);
    const [conflicts, setConflicts] = useState<Conflict[]>([]);
    const [sendingAlerts, setSendingAlerts] = useState(false);
    const [institutionType, setInstitutionType] = useState<string | null>(null);
    const [institutionId, setInstitutionId] = useState<string | null>(null);
    const [cancelledDates, setCancelledDates] = useState<CancelledDateInfo[]>([]);
    const [activeTerm, setActiveTerm] = useState<{ id: string; name: string; start_date?: string; end_date?: string } | null>(null);

    // Determine current day of week (Monday–Sunday)
    const getInitialDay = () => {
        const d = new Date().getDay();
        return DAYS[d === 0 ? 6 : d - 1];
    };

    // UI state
    const [selectedDay, setSelectedDay] = useState<string>(getInitialDay());
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [isAutoModalVisible, setIsAutoModalVisible] = useState(false);
    const [isClassPickerVisible, setIsClassPickerVisible] = useState(false);
    const [classSearchText, setClassSearchText] = useState("");
    const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
    const [publishing, setPublishing] = useState(false);

    // Derived
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const daySlots = timetable
        .filter(t => t.day_of_week === selectedDay)
        .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
    const conflictingIds = new Set(conflicts.flatMap(c => c.affectedEntryIds));
    const draftCount = timetable.filter(t => t.is_draft).length;

    // Assigned unique teachers count across this timetable schedule
    const uniqueteachersCount = useMemo(() => {
        const teacherIds = new Set<string>();
        timetable.forEach(t => {
            if (t.teacher_id) teacherIds.add(t.teacher_id);
            else if (t.subjects?.teacher_id) teacherIds.add(t.subjects.teacher_id);
        });
        return teacherIds.size;
    }, [timetable]);

    // Active unique subjects count across this timetable schedule
    const uniqueSubjectsCount = useMemo(() => {
        const subjectIds = new Set<string>();
        timetable.forEach(t => {
            if (t.subject_id) subjectIds.add(t.subject_id);
        });
        return subjectIds.size;
    }, [timetable]);

    // Day slot count map for badge indicators on Day tabs
    const daySlotCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        DAYS.forEach(d => { counts[d] = 0; });
        timetable.forEach(t => {
            if (counts[t.day_of_week] !== undefined) {
                counts[t.day_of_week]++;
            }
        });
        return counts;
    }, [timetable]);

    // Filtered classes for class picker modal search
    const filteredPickerClasses = useMemo(() => {
        if (!classSearchText.trim()) return classes;
        const q = classSearchText.toLowerCase();
        return classes.filter(c => {
            const label = formatClassLabel(c).toLowerCase();
            const name = (c.name || "").toLowerCase();
            const stream = (c.stream || "").toLowerCase();
            return label.includes(q) || name.includes(q) || stream.includes(q);
        });
    }, [classes, classSearchText]);

    const conflictsForSelectedClass = useMemo(() => {
        if (!selectedClassId) return [];
        return conflicts.filter(c => c.affectedClassIds.includes(selectedClassId));
    }, [conflicts, selectedClassId]);

    const handlePublishTimetable = async () => {
        const classLabel = selectedClass ? formatClassLabel(selectedClass) : "this class";
        Alert.alert(
            "Publish Timetable",
            `Publish ${draftCount} draft timetable slots for ${classLabel}? They will become live and visible to students and parents.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Publish Now",
                    style: "default",
                    onPress: async () => {
                        try {
                            setPublishing(true);
                            const res = await TimetableAPI.publishTimetable(selectedClassId ? [selectedClassId] : null);
                            showSuccess("Published", `Made ${res.published_count} slots active!`);
                            await handleRefresh();
                        } catch (e: any) {
                            showError("Publish Error", e.message || "Failed to publish drafts.");
                        } finally {
                            setPublishing(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDownloadPdf = async () => {
        const classTitle = selectedClass ? formatClassLabel(selectedClass) : "Class";
        try {
            setDownloadingPdf(true);
            const activeDayIndex = DAYS.indexOf(selectedDay as any);
            const weekAnchor = new Date();
            const dow = weekAnchor.getDay();
            const diffToMon = dow === 0 ? -6 : 1 - dow;
            weekAnchor.setDate(weekAnchor.getDate() + diffToMon + Math.max(activeDayIndex, 0));

            const termDateStr = activeTerm?.start_date && activeTerm?.end_date
                ? ` (${new Date(activeTerm.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(activeTerm.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`
                : '';
            const termSubtitle = activeTerm?.name
                ? `${activeTerm.name}${termDateStr} • ${institutionName || 'School Timetable'}`
                : `Academic Schedule • ${institutionName || 'School Timetable'}`;

            await downloadTimetablePdf({
                title: `${classTitle} Timetable`,
                subtitle: termSubtitle,
                institutionName,
                institutionLogo,
                entries: timetable,
                cancelledDates,
                referenceDate: weekAnchor,
                fileName: `${classTitle}-timetable-${activeTerm?.name ? activeTerm.name.replace(/\s+/g, '_') + '-' : ''}${localDateKey(weekAnchor)}`,
            });
            showSuccess("PDF Ready", "Timetable PDF generated successfully.");
        } catch (error) {
            showError("Export failed", "Failed to generate timetable PDF.");
        } finally {
            setDownloadingPdf(false);
        }
    };

    // ── Data fetching ─────────────────────────────────────────────────────────

    const fetchAllEntries = useCallback(async () => {
        if (!institutionId) return;
        try {
            const { data } = await supabase
                .from("timetables")
                .select(`*, subjects(id, title, category, class_id, teacher_id, teachers(id, user_id, users(full_name)))`)
                .eq("institution_id", institutionId);
            const entries = (data ?? []) as unknown as TimetableEntry[];
            setAllEntries(entries);
            setConflicts(detectConflicts(entries));
        } catch (e) {
            console.error("fetchAllEntries:", e);
        }
    }, [institutionId]);

    const handleRefresh = async () => {
        try {
            const classList = await ClassAPI.getClasses();
            setClasses(classList);
            if (!selectedClassId && classList.length > 0) {
                setSelectedClassId(classList[0].id);
            }
        } catch (e) {
            console.error("handleRefresh getClasses:", e);
        }
        await fetchAllEntries();
        if (selectedClassId) {
            await fetchClassTimetable(selectedClassId);
            await fetchClassSubjects(selectedClassId);
        }
    };

    const handlePullRefresh = async () => {
        setRefreshing(true);
        try {
            await handleRefresh();
        } finally {
            setRefreshing(false);
        }
    };

    // Live Updates for Timetable changes
    useRealtimeQuery('timetables', () => {
        fetchAllEntries();
        if (selectedClassId) {
            fetchClassTimetable(selectedClassId);
        }
    });

    // Keep subject picker labels and slot subject titles fresh
    useRealtimeQuery('subjects', () => {
        fetchAllEntries();
        if (selectedClassId) {
            fetchClassSubjects(selectedClassId);
        }
    });

    useEffect(() => {
        const loadInstitution = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const { data: user } = await (supabase.from("users") as any).select("institution_id").eq("id", session.user.id).single();
            if (user?.institution_id) {
                setInstitutionId(user.institution_id);
                const { data: inst } = await (supabase.from("institutions") as any).select("type").eq("id", user.institution_id).single();
                setInstitutionType(inst?.type ?? null);
            }
        };
        loadInstitution();
        GradingAPI.getActiveTerm().then(setActiveTerm).catch(() => {});
        CalendarAPI.getCancelledDates().then(setCancelledDates).catch(() => {});
        (async () => {
            try {
                setLoading(true);
                const classList = await ClassAPI.getClasses();
                setClasses(classList);
                if (classList.length > 0) {
                    setSelectedClassId(classList[0].id);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, []);

    useEffect(() => { if (institutionId) fetchAllEntries(); }, [institutionId, fetchAllEntries]);

    useEffect(() => {
        if (selectedClassId) {
            fetchClassTimetable(selectedClassId);
            fetchClassSubjects(selectedClassId);
        } else {
            setTimetable([]);
        }
    }, [selectedClassId]);

    const fetchClassTimetable = async (classId: string) => {
        try {
            setFetchingTimetable(true);
            const data = await TimetableAPI.getClassTimetable(classId);
            setTimetable(data || []);
        } catch (e) { console.error(e); }
        finally { setFetchingTimetable(false); }
    };

    const fetchClassSubjects = async (classId: string) => {
        try {
            const data = await SubjectAPI.getSubjectsByClass(classId);
            setSubjects(data || []);
        } catch (e) { console.error(e); }
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────

    const openAdd = () => {
        setEditingEntry(null);
        setIsAddModalVisible(true);
    };

    const openEdit = (entry: TimetableEntry) => {
        setEditingEntry(entry);
        setIsAddModalVisible(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert("Delete Entry", "Remove this slot from the timetable?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive",
                onPress: async () => {
                    try {
                        await TimetableAPI.deleteEntry(id);
                        showSuccess("Deleted", "Entry removed.");
                        if (selectedClassId) await fetchClassTimetable(selectedClassId);
                        await fetchAllEntries();
                    } catch (e) { }
                },
            },
        ]);
    };

    const handleSendAlerts = async () => {
        if (!conflicts.length) return;
        setSendingAlerts(true);
        try {
            const count = await sendConflictNotifications(conflicts, institutionType, institutionId);
            Alert.alert("Alerts Sent ✓", `${count} notification${count !== 1 ? "s" : ""} delivered.`);
        } catch (e) {
            Alert.alert("Error", "Failed to send some notifications.");
        } finally { setSendingAlerts(false); }
    };

    // ── Slot card colour cycling ──────────────────────────────────────────────

    const subjectColorMap = useRef<Record<string, string>>({}).current;
    const getSubjectColor = (subjectId: string) => {
        if (!subjectColorMap[subjectId]) {
            const idx = Object.keys(subjectColorMap).length % SUBJECT_COLORS.length;
            subjectColorMap[subjectId] = SUBJECT_COLORS[idx];
        }
        return subjectColorMap[subjectId];
    };

    // ── Loading screen ────────────────────────────────────────────────────────

    if (loading) {
        return (
            <View style={styles.root}>
                <UnifiedHeader
                    title="Timetable"
                    subtitle="Weekly class schedules"
                    role="Admin"
                    onBack={() => router.back()}
                    showNotification={true}
                />
                <TimetableScheduleSkeleton />
            </View>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <View style={styles.root}>
            {/* ── Header ── */}
            <UnifiedHeader
                title="Management"
                subtitle="Timetable Builder"
                role="Admin"
                onBack={() => router.back()}
                rightActions={
                    <View style={styles.headerRightActions}>
                        {/* Auto-Builder quick button on desktop */}
                        {!isMobile && (
                            <ActionTooltip
                                label="Auto Timetable Builder"
                                description="Run MILP constraint optimization to generate an optimal timetable."
                                learnMoreAnchor="timetable-builder"
                            >
                                <TouchableOpacity
                                    onPress={() => setIsAutoModalVisible(true)}
                                    style={styles.headerAutoBtn}
                                    accessibilityRole="button"
                                    accessibilityLabel="Automatic Timetable Builder"
                                >
                                    <Sparkles size={15} color="#EA580C" />
                                    <Text style={styles.headerAutoBtnText}>Auto-Builder</Text>
                                </TouchableOpacity>
                            </ActionTooltip>
                        )}

                        {selectedClassId && (
                            <ActionTooltip
                                label="Export PDF"
                                description="Generate and download printable classroom timetable schedule."
                                learnMoreAnchor="timetable-builder"
                            >
                                <TouchableOpacity
                                    onPress={handleDownloadPdf}
                                    disabled={downloadingPdf}
                                    style={styles.headerIconBtn}
                                    accessibilityRole="button"
                                    accessibilityLabel="Download Timetable PDF"
                                >
                                    <Download size={16} color={colors.accent} />
                                    {!isMobile && (
                                        <Text style={styles.headerBtnText}>
                                            {downloadingPdf ? 'Exporting...' : 'PDF'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </ActionTooltip>
                        )}

                        <ActionTooltip
                            label="Refresh Timetable"
                            description="Reload class periods, room allocations, and clash detection checks."
                            learnMoreAnchor="timetable-builder"
                        >
                            <TouchableOpacity onPress={handleRefresh} style={styles.headerIconBtn} accessibilityRole="button" accessibilityLabel="Refresh timetable">
                                <RefreshCw size={16} color={colors.textSub} />
                            </TouchableOpacity>
                        </ActionTooltip>
                    </View>
                }
            />

            {/* ── Main Fluid Scroll Area ── */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.mainScrollContent, { paddingBottom: insets.bottom + 90 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handlePullRefresh}
                        colors={[colors.accent]}
                        tintColor={colors.accent}
                    />
                }
            >
                {/* ── TOP PANEL: Comprehensive Hero & Control Center ── */}
                <View style={styles.topPanel}>
                    {/* Active Class & Switcher Bar */}
                    <View style={styles.topPanelHeader}>
                        <View style={styles.topPanelClassBox}>
                            <View style={styles.topPanelClassIcon}>
                                <GraduationCap size={22} color={colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.topPanelOverline}>ACTIVE COHORT SCHEDULE</Text>
                                <Text style={styles.topPanelClassTitle} numberOfLines={1}>
                                    {selectedClass ? formatClassLabel(selectedClass) : "No Class Selected"}
                                </Text>
                            </View>
                        </View>

                        <ActionTooltip
                            label="Select Cohort"
                            description="Choose a grade, class, or stream to view and organize its weekly lesson periods."
                            learnMoreAnchor="timetable-builder"
                        >
                            <TouchableOpacity
                                style={styles.changeClassBtn}
                                onPress={() => setIsClassPickerVisible(true)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                accessibilityLabel="Switch active class"
                            >
                                <Text style={styles.changeClassBtnText}>Select Class</Text>
                                <ChevronDown size={14} color={colors.text} />
                            </TouchableOpacity>
                        </ActionTooltip>
                    </View>

                    {/* 4-Stat KPI Grid */}
                    <View style={styles.kpiGrid}>
                        {/* 1. Today's Sessions */}
                        <View style={styles.kpiCard}>
                            <View style={styles.kpiTop}>
                                <Text style={styles.kpiLabel}>{selectedDay.slice(0, 3)} SESSIONS</Text>
                                <Clock size={14} color={colors.accent} />
                            </View>
                            <Text style={styles.kpiValue}>{daySlots.length}</Text>
                            <Text style={styles.kpiSub}>
                                {daySlots.length === 1 ? 'Period today' : 'Periods today'}
                            </Text>
                        </View>

                        {/* 2. Total Week Slots */}
                        <View style={styles.kpiCard}>
                            <View style={styles.kpiTop}>
                                <Text style={styles.kpiLabel}>WEEKLY TOTAL</Text>
                                <Calendar size={14} color={colors.blue} />
                            </View>
                            <Text style={styles.kpiValue}>{timetable.length}</Text>
                            <Text style={styles.kpiSub}>
                                {Object.values(daySlotCounts).filter(c => c > 0).length} active days
                            </Text>
                        </View>

                        {/* 3. Assigned teachers */}
                        <View style={styles.kpiCard}>
                            <View style={styles.kpiTop}>
                                <Text style={styles.kpiLabel}>teacherS</Text>
                                <Users size={14} color={colors.accent} />
                            </View>
                            <Text style={styles.kpiValue}>{uniqueteachersCount}</Text>
                            <Text style={styles.kpiSub}>
                                {uniqueteachersCount === 1 ? 'Assigned teacher' : 'Assigned teachers'}
                            </Text>
                        </View>

                        {/* 4. Active Subjects */}
                        <View style={styles.kpiCard}>
                            <View style={styles.kpiTop}>
                                <Text style={styles.kpiLabel}>SUBJECTS</Text>
                                <BookOpen size={14} color={colors.blue} />
                            </View>
                            <Text style={styles.kpiValue}>{uniqueSubjectsCount}</Text>
                            <Text style={styles.kpiSub}>
                                {uniqueSubjectsCount === 1 ? 'Distinct subject' : 'Distinct subjects'}
                            </Text>
                        </View>
                    </View>

                    {/* Top Panel Actions Row */}
                    <View style={styles.topActionRow}>
                        <ActionTooltip
                            label="Constraint Solver Builder"
                            description="Automatically generate an optimal, clash-free master schedule for classes and teachers across the academic term."
                            learnMoreAnchor="timetable-builder"
                        >
                            <TouchableOpacity
                                onPress={() => setIsAutoModalVisible(true)}
                                style={styles.autoBuilderPrimaryBtn}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel="Run Auto Timetable Builder"
                            >
                                <Sparkles size={15} color="#fff" />
                                <Text style={styles.autoBuilderPrimaryBtnText}>Auto-Builder</Text>
                            </TouchableOpacity>
                        </ActionTooltip>

                        <ActionTooltip
                            label="Add Timetable Slot"
                            description="Manually create a new teaching period, subject session, or break for this class."
                            learnMoreAnchor="timetable-builder"
                        >
                            <TouchableOpacity
                                onPress={openAdd}
                                style={styles.addSlotBtn}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel="Add New Period Slot"
                            >
                                <Plus size={15} color={colors.text} />
                                <Text style={styles.addSlotBtnText}>Add Slot</Text>
                            </TouchableOpacity>
                        </ActionTooltip>

                        {selectedClassId && (
                            <ActionTooltip
                                label="Export Term Schedule"
                                description="Compile and download a printable A4 landscape grid of this cohort's timetable."
                                learnMoreAnchor="timetable-builder"
                            >
                                <TouchableOpacity
                                    onPress={handleDownloadPdf}
                                    disabled={downloadingPdf}
                                    style={styles.exportPdfBtn}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Export Classroom PDF"
                                >
                                    <Download size={15} color={colors.accent} />
                                    <Text style={styles.exportPdfBtnText}>
                                        {downloadingPdf ? 'Exporting...' : 'PDF'}
                                    </Text>
                                </TouchableOpacity>
                            </ActionTooltip>
                        )}

                        {selectedClassId && draftCount > 0 && (
                            <ActionTooltip
                                label="Publish Live Schedule"
                                description="Make draft lesson periods official and visible to students, teachers, and guardians."
                                learnMoreAnchor="timetable-builder"
                            >
                                <TouchableOpacity
                                    onPress={handlePublishTimetable}
                                    disabled={publishing}
                                    style={styles.publishPillBtn}
                                    activeOpacity={0.8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Publish Drafts Live"
                                >
                                    <Check size={14} color="#fff" />
                                    <Text style={styles.publishPillBtnText}>Publish Live ({draftCount})</Text>
                                </TouchableOpacity>
                            </ActionTooltip>
                        )}
                    </View>
                </View>

                {/* ── Class Chips Horizontal Bar ── */}
                <ActionTooltip targetId="admin.timetable.cohort_card">
                    <View style={styles.chipBar}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                            {classes.map((cls) => {
                                const active = cls.id === selectedClassId;
                                return (
                                    <TouchableOpacity
                                        key={cls.id}
                                        style={[styles.chip, active && styles.chipActive]}
                                        onPress={() => setSelectedClassId(cls.id)}
                                        activeOpacity={0.7}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Select class ${formatClassLabel(cls)}`}
                                    >
                                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{formatClassLabel(cls)}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </ActionTooltip>

                {/* ── Draft Banner (if any) ── */}
                {selectedClassId && draftCount > 0 && (
                    <View style={styles.draftBanner}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={styles.draftBadgeIcon}>
                                <Sparkles size={18} color="#F59E0B" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.draftBannerTitle}>
                                    Draft Timetable Active ({draftCount} slot{draftCount !== 1 ? 's' : ''})
                                </Text>
                                <Text style={styles.draftBannerSub}>
                                    Generated schedule awaiting verification. Publish to make visible to learners.
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.publishBtn, publishing && { opacity: 0.6 }]}
                            onPress={handlePublishTimetable}
                            disabled={publishing}
                        >
                            {publishing ? (
                                <Spinner size="small" color="#fff" />
                            ) : (
                                <Text style={styles.publishBtnText}>Publish Live</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── Conflict Zone (Available to all tiers, conditional on actual clashes) ── */}
                {selectedClassId && (conflictsForSelectedClass.length > 0 || (conflicts.length > 0 && !selectedClassId)) && (
                    <View style={styles.conflictZone}>
                        <ConflictPanel
                            conflicts={conflictsForSelectedClass.length > 0 ? conflictsForSelectedClass : conflicts}
                            onSendAll={handleSendAlerts}
                            sending={sendingAlerts}
                            institutionType={institutionType}
                            colors={colors}
                            styles={styles}
                        />
                    </View>
                )}

                {/* ── Day Tab Bar ── */}
                {selectedClassId && (
                    <View style={styles.dayBarWrap}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayBarScroll}>
                            {DAYS.map((day, idx) => {
                                const active = day === selectedDay;
                                const isToday = day === getInitialDay();
                                const count = daySlotCounts[day] || 0;
                                const hasConflict = conflicts.some(c => c.day === day && c.affectedEntryIds.some(eid =>
                                    timetable.some(t => t.id === eid)
                                ));
                                return (
                                    <ActionTooltip
                                        key={day}
                                        label={`${day} Schedule`}
                                        description={`View timetable periods for ${day} (${count} scheduled).`}
                                        learnMoreAnchor="timetable-builder"
                                    >
                                        <TouchableOpacity
                                            style={[styles.dayTab, active && styles.dayTabActive]}
                                            onPress={() => setSelectedDay(day)}
                                            activeOpacity={0.7}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Select ${day}, ${count} slots`}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>
                                                    {DAY_SHORT[idx]}
                                                </Text>
                                                {isToday && (
                                                    <View style={[styles.todayDot, active && { backgroundColor: '#fff' }]} />
                                                )}
                                            </View>
                                            <View style={[styles.dayBadge, active && styles.dayBadgeActive]}>
                                                <Text style={[styles.dayBadgeText, active && styles.dayBadgeTextActive]}>
                                                    {count}
                                                </Text>
                                            </View>
                                            {hasConflict && <View style={styles.dayDot} />}
                                        </TouchableOpacity>
                                    </ActionTooltip>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* ── Cancelled-Day Notice (Calendar sync) ── */}
                {selectedClassId && (() => {
                    const activeDayIndex = DAYS.indexOf(selectedDay as any);
                    const ws = new Date();
                    const dow = ws.getDay();
                    const diffToMon = (dow === 0 ? -6 : 1 - dow);
                    ws.setDate(ws.getDate() + diffToMon + activeDayIndex);
                    const dateStr = localDateKey(ws);
                    const cancelled = cancelledDates.find(c => c.event_date === dateStr);
                    if (!cancelled) return null;
                    return (
                        <View style={styles.cancelledBanner}>
                            <View style={styles.cancelledIconBox}>
                                <AlertTriangle size={18} color="#EF4444" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cancelledTitle}>Classes Cancelled: {cancelled.title}</Text>
                                <Text style={styles.cancelledSub}>Academic sessions are officially suspended on this date.</Text>
                            </View>
                        </View>
                    );
                })()}

                {/* ── Day Header & Session Cards ── */}
                {!selectedClassId ? (
                    <View style={styles.emptyState}>
                        <Calendar size={56} color={colors.border} />
                        <Text style={styles.emptyTitle}>No Class Selected</Text>
                        <Text style={styles.emptySub}>Choose a class above or use the selector to view and build its timetable schedule.</Text>
                        <TouchableOpacity
                            style={styles.emptySelectBtn}
                            onPress={() => setIsClassPickerVisible(true)}
                        >
                            <Text style={styles.emptySelectBtnText}>Browse Classes</Text>
                        </TouchableOpacity>
                    </View>
                ) : fetchingTimetable ? (
                    <TimetableScheduleSkeleton />
                ) : (
                    <View style={styles.slotList}>
                        <View style={styles.dayHeader}>
                            <View style={styles.dayHeaderLeft}>
                                <Calendar size={16} color={colors.accent} />
                                <Text style={styles.dayHeaderText}>{selectedDay}</Text>
                                {selectedDay === getInitialDay() && (
                                    <View style={styles.todayPill}>
                                        <Text style={styles.todayPillText}>TODAY</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.daySlotCount}>{daySlots.length} period{daySlots.length !== 1 ? "s" : ""}</Text>
                        </View>

                        {daySlots.length === 0 ? (
                            <View style={styles.emptyDay}>
                                <Clock size={40} color={colors.border} />
                                <Text style={styles.emptyDayText}>No scheduled periods for {selectedDay}</Text>
                                <Text style={styles.emptyDaySub}>Add a period slot manually or run the AI constraint Auto-Builder.</Text>
                                <View style={styles.emptyDayActions}>
                                    <TouchableOpacity style={styles.emptyDayAddBtn} onPress={openAdd} activeOpacity={0.8}>
                                        <Plus size={15} color="#fff" />
                                        <Text style={styles.emptyDayAddBtnText}>Add Period Slot</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.emptyDayAutoBtn} onPress={() => setIsAutoModalVisible(true)} activeOpacity={0.8}>
                                        <Sparkles size={15} color={colors.accent} />
                                        <Text style={styles.emptyDayAutoBtnText}>Run Auto-Builder</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            daySlots.map((slot, idx) => {
                                const hasConflict = conflictingIds.has(slot.id);
                                const color = getSubjectColor(slot.subject_id);
                                const teacherName =
                                    slot.teachers?.full_name ||
                                    slot.subjects?.teachers?.users?.full_name ||
                                    slot.teacher_name ||
                                    "teacher TBD";
                                const cohortLabel = slot.room_number || (selectedClass ? formatClassLabel(selectedClass) : "Cohort");

                                return (
                                    <ActionTooltip key={slot.id} targetId="admin.timetable.grid_card">
                                        <View
                                            style={[styles.slotCard, hasConflict && styles.slotCardConflict]}
                                        >
                                        {/* Colored indicator bar */}
                                        <View style={[styles.slotStrip, { backgroundColor: hasConflict ? colors.red : color }]} />

                                        {/* Top Timing & Badges Row */}
                                        <View style={styles.slotHeaderRow}>
                                            <View style={styles.timePill}>
                                                <Clock size={12} color={colors.accent} />
                                                <Text style={styles.timePillText}>
                                                    {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                                                </Text>
                                            </View>

                                            <View style={styles.badgeRow}>
                                                {slot.subjects?.category && (
                                                    <View style={styles.categoryBadge}>
                                                        <Text style={styles.categoryBadgeText}>{slot.subjects.category.toUpperCase()}</Text>
                                                    </View>
                                                )}
                                                {slot.is_draft && (
                                                    <View style={styles.draftBadge}>
                                                        <Text style={styles.draftBadgeText}>DRAFT</Text>
                                                    </View>
                                                )}
                                                {hasConflict && (
                                                    <View style={styles.conflictBadge}>
                                                        <AlertOctagon size={10} color={colors.red} />
                                                        <Text style={styles.conflictBadgeText}>CLASH</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        {/* Subject Title */}
                                        <View style={styles.slotBody}>
                                            <Text style={styles.slotSubject} numberOfLines={2}>
                                                {slot.subjects?.title ?? slot.subject_name ?? "Subject Session"}
                                            </Text>

                                            {/* Meta row: Room & Teacher */}
                                            <View style={styles.slotMetaRow}>
                                                <View style={styles.metaChip}>
                                                    <MapPin size={11} color={colors.textSub} />
                                                    <Text style={styles.metaChipText}>{cohortLabel}</Text>
                                                </View>
                                                <View style={styles.metaChip}>
                                                    <User size={11} color={color} />
                                                    <Text style={[styles.metaChipText, { color, fontWeight: '700' }]}>
                                                        {teacherName}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Action buttons (min touch target 44px friendly) */}
                                        <View style={styles.slotActionsRow}>
                                            <ActionTooltip label="Edit Slot" description="Modify subject, teacher, time period or room." learnMoreAnchor="timetable-builder">
                                                <TouchableOpacity
                                                    style={styles.slotActionBtn}
                                                    onPress={() => openEdit(slot)}
                                                    activeOpacity={0.7}
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Edit period slot"
                                                >
                                                    <Edit3 size={14} color={colors.textSub} />
                                                    <Text style={styles.slotActionBtnText}>Edit</Text>
                                                </TouchableOpacity>
                                            </ActionTooltip>

                                            <ActionTooltip label="Delete Slot" description="Permanently remove this session from the schedule." learnMoreAnchor="timetable-builder">
                                                <TouchableOpacity
                                                    style={[styles.slotActionBtn, styles.deleteActionBtn]}
                                                    onPress={() => handleDelete(slot.id)}
                                                    activeOpacity={0.7}
                                                    accessibilityRole="button"
                                                    accessibilityLabel="Delete period slot"
                                                >
                                                    <Trash2 size={14} color={colors.red} />
                                                    <Text style={[styles.slotActionBtnText, { color: colors.red }]}>Delete</Text>
                                                </TouchableOpacity>
                                            </ActionTooltip>
                                        </View>
                                        </View>
                                    </ActionTooltip>
                                );
                            })
                        )}
                    </View>
                )}
            </ScrollView>

            {/* ── Floating Action Button (FAB) ── */}
            {selectedClassId && (
                <ActionTooltip label="Add Period Slot" description="Create a new scheduled timetable lesson for this cohort." learnMoreAnchor="timetable-builder">
                    <TouchableOpacity
                        style={[styles.fab, { bottom: insets.bottom + (isMobile ? 76 : 28) }]}
                        onPress={openAdd}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Add New Period Slot"
                    >
                        <Plus size={26} color="#fff" />
                    </TouchableOpacity>
                </ActionTooltip>
            )}

            {/* ── Class Picker Modal ── */}
            <Modal
                visible={isClassPickerVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsClassPickerVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <GraduationCap size={20} color={colors.accent} />
                                <Text style={styles.modalTitle}>Select Class Cohort</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setIsClassPickerVisible(false)}
                                style={styles.modalCloseBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Close class picker"
                            >
                                <X size={18} color={colors.textSub} />
                            </TouchableOpacity>
                        </View>

                        {/* Search Bar */}
                        <View style={styles.modalSearchWrap}>
                            <Search size={16} color={colors.textSub} />
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="Search by grade, stream, or name..."
                                placeholderTextColor={colors.textMuted}
                                value={classSearchText}
                                onChangeText={setClassSearchText}
                                clearButtonMode="while-editing"
                            />
                            {classSearchText.length > 0 && (
                                <TouchableOpacity onPress={() => setClassSearchText("")}>
                                    <X size={14} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Class List */}
                        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                            {filteredPickerClasses.map((cls) => {
                                const isSelected = cls.id === selectedClassId;
                                return (
                                    <TouchableOpacity
                                        key={cls.id}
                                        style={[styles.classListItem, isSelected && styles.classListItemActive]}
                                        onPress={() => {
                                            setSelectedClassId(cls.id);
                                            setIsClassPickerVisible(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.classListName, isSelected && { color: colors.accent, fontWeight: '800' }]}>
                                                {formatClassLabel(cls)}
                                            </Text>
                                            <Text style={styles.classListSub}>
                                                Stream: {cls.stream || "Standard"} • Capacity: {cls.capacity || "Default"}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <CheckCircle2 size={18} color={colors.accent} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                            {filteredPickerClasses.length === 0 && (
                                <View style={{ padding: 24, alignItems: 'center' }}>
                                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>No matching classes found</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Manual Builder Modal ── */}
            <ManualBuilderModal
                visible={isAddModalVisible}
                onClose={() => setIsAddModalVisible(false)}
                onSaveSuccess={async () => {
                    if (selectedClassId) await fetchClassTimetable(selectedClassId);
                    await fetchAllEntries();
                }}
                editingEntry={editingEntry}
                selectedClassId={selectedClassId}
                selectedClassName={selectedClass ? formatClassLabel(selectedClass) : "Class"}
                subjects={subjects}
                days={DAYS}
            />

            {/* ── Auto-Generate Modal ── */}
            <AutoGenerateModal
                visible={isAutoModalVisible}
                onClose={() => setIsAutoModalVisible(false)}
                onGenerated={async () => {
                    await handleRefresh();
                }}
                selectedClassId={selectedClassId}
                selectedClassName={selectedClass ? formatClassLabel(selectedClass) : undefined}
            />
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function getStyles(colors: any, isMobile: boolean) {
    return StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.bg },
        centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },

        // Header Actions
        headerRightActions: {
            flexDirection: "row",
            alignItems: "center",
            gap: isMobile ? 6 : 8,
        },
        headerAutoBtn: {
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 12,
            gap: 6,
            backgroundColor: "rgba(234, 88, 12, 0.12)",
            borderWidth: 1,
            borderColor: "#EA580C",
        },
        headerAutoBtnText: {
            fontSize: 12,
            fontWeight: "700",
            color: "#EA580C",
        },
        headerIconBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: isMobile ? 8 : 12,
            paddingVertical: 7,
            borderRadius: 12,
            backgroundColor: colors.surface2,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 34,
            justifyContent: "center",
        },
        headerBtnText: {
            fontSize: 12,
            fontWeight: "700",
            color: colors.accent,
        },

        // Main Scroll
        mainScrollContent: {
            paddingTop: 8,
        },

        // ── Top Panel ─────────────────────────────────────────────────────────
        topPanel: {
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 12,
            padding: 16,
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
        },
        topPanelHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            gap: 8,
        },
        topPanelClassBox: {
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            flex: 1,
        },
        topPanelClassIcon: {
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: colors.accentDim,
            alignItems: "center",
            justifyContent: "center",
        },
        topPanelOverline: {
            fontSize: 9,
            fontWeight: "800",
            color: colors.accent,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            marginBottom: 2,
        },
        topPanelClassTitle: {
            fontSize: isMobile ? 17 : 20,
            fontWeight: "900",
            color: colors.text,
            letterSpacing: -0.4,
        },
        changeClassBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: colors.surface2,
            borderWidth: 1,
            borderColor: colors.border,
        },
        changeClassBtnText: {
            fontSize: 12,
            fontWeight: "700",
            color: colors.text,
        },

        // Top Panel KPI Grid
        kpiGrid: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 16,
        },
        kpiCard: {
            flex: 1,
            minWidth: isMobile ? "46%" : "22%",
            backgroundColor: colors.surface2,
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        kpiTop: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
        },
        kpiLabel: {
            fontSize: 9,
            fontWeight: "800",
            color: colors.textMuted,
            letterSpacing: 0.8,
            textTransform: "uppercase",
        },
        kpiValue: {
            fontSize: 20,
            fontWeight: "900",
            color: colors.text,
            letterSpacing: -0.5,
        },
        kpiSub: {
            fontSize: 10,
            fontWeight: "600",
            color: colors.textSub,
            marginTop: 2,
        },

        // Top Action Row
        topActionRow: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
        },
        autoBuilderPrimaryBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.accent,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderRadius: 12,
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 3,
        },
        autoBuilderPrimaryBtnText: {
            fontSize: 12,
            fontWeight: "800",
            color: "#fff",
        },
        addSlotBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.surface2,
            paddingHorizontal: 13,
            paddingVertical: 9,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        addSlotBtnText: {
            fontSize: 12,
            fontWeight: "700",
            color: colors.text,
        },
        exportPdfBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.surface2,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        exportPdfBtnText: {
            fontSize: 12,
            fontWeight: "700",
            color: colors.accent,
        },
        publishPillBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: "#D97706",
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 12,
        },
        publishPillBtnText: {
            fontSize: 12,
            fontWeight: "800",
            color: "#fff",
        },

        // Class chips
        chipBar: {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            paddingVertical: 8,
            marginBottom: 8,
        },
        chipScroll: { paddingHorizontal: 16, gap: 8, flexDirection: "row" },
        chip: {
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 20,
            backgroundColor: colors.surface2,
            borderWidth: 1,
            borderColor: colors.border,
        },
        chipActive: {
            backgroundColor: colors.accent,
            borderColor: colors.accent,
        },
        chipText: {
            fontSize: 12,
            fontWeight: "700",
            color: colors.textSub,
        },
        chipTextActive: {
            color: "#fff",
        },

        // Draft mode banner
        draftBanner: {
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            marginHorizontal: 16,
            marginTop: 6,
            marginBottom: 10,
            padding: 14,
            borderRadius: 14,
            backgroundColor: "rgba(245,158,11,0.12)",
            borderWidth: 1,
            borderColor: "rgba(245,158,11,0.3)",
            gap: 12,
        },
        draftBadgeIcon: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: "rgba(245,158,11,0.2)",
            alignItems: "center",
            justifyContent: "center",
        },
        draftBannerTitle: {
            fontWeight: "800",
            color: "#B45309",
            fontSize: 13,
        },
        draftBannerSub: {
            color: "#92400E",
            fontSize: 11,
            marginTop: 2,
            lineHeight: 15,
        },
        publishBtn: {
            backgroundColor: "#D97706",
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: isMobile ? "stretch" : "auto",
        },
        publishBtnText: {
            color: "#fff",
            fontWeight: "800",
            fontSize: 12,
        },

        // Conflict zone
        conflictZone: {
            paddingHorizontal: 16,
            marginBottom: 10,
        },
        conflictPanel: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
        },
        conflictHeader: {
            flexDirection: "row",
            alignItems: "center",
            padding: 14,
        },
        conflictHeaderLeft: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
        },
        conflictIconBox: {
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: colors.redDim,
            justifyContent: "center",
            alignItems: "center",
        },
        conflictTitle: {
            fontSize: 13,
            fontWeight: "800",
            color: colors.text,
        },
        conflictSub: {
            fontSize: 10,
            fontWeight: "600",
            color: colors.textSub,
            marginTop: 1,
        },
        badge: {
            paddingHorizontal: 7,
            paddingVertical: 2.5,
            borderRadius: 6,
        },
        badgeText: {
            fontSize: 9,
            fontWeight: "900",
            color: "#fff",
        },
        divider: {
            height: 1,
            backgroundColor: colors.border,
        },
        conflictItem: {
            flexDirection: "row",
            alignItems: "flex-start",
            paddingVertical: 12,
            paddingRight: 14,
        },
        conflictItemBorder: {
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
        },
        conflictItemStrip: {
            width: 3.5,
            borderRadius: 2,
            alignSelf: "stretch",
            marginLeft: 14,
        },
        conflictItemRow: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 4,
            gap: 6,
        },
        typePill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 7,
            paddingVertical: 2.5,
            borderRadius: 6,
        },
        typePillText: {
            fontSize: 9,
            fontWeight: "800",
            textTransform: "uppercase",
        },
        conflictDay: {
            fontSize: 9,
            fontWeight: "800",
            color: colors.textMuted,
            marginLeft: "auto",
        },
        conflictMsg: {
            fontSize: 12,
            fontWeight: "700",
            color: colors.text,
            marginBottom: 3,
        },
        conflictDetail: {
            fontSize: 11,
            color: colors.textSub,
            lineHeight: 16,
        },
        conflictFooter: {
            padding: 12,
        },
        alertBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: colors.red,
            borderRadius: 12,
            paddingVertical: 12,
        },
        alertBtnText: {
            fontSize: 13,
            fontWeight: "800",
            color: "#fff",
        },
        conflictFooterNote: {
            fontSize: 10,
            color: colors.textMuted,
            textAlign: "center",
            marginTop: 6,
        },

        // Clean banner
        cleanBanner: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.greenDim,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: "rgba(16,185,129,0.25)",
        },
        cleanBannerText: {
            fontSize: 12,
            fontWeight: "700",
            color: colors.green,
            flex: 1,
        },

        // Upgrade nudge
        upgradeNudge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "rgba(167,139,250,0.1)",
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: "rgba(167,139,250,0.25)",
        },
        upgradeIconBox: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: "rgba(167,139,250,0.18)",
            justifyContent: "center",
            alignItems: "center",
        },
        upgradeTitle: {
            fontSize: 13,
            fontWeight: "800",
            color: "#A78BFA",
        },
        upgradeSub: {
            fontSize: 11,
            color: colors.textSub,
            marginTop: 2,
            lineHeight: 15,
        },
        proBadge: {
            backgroundColor: "#7C3AED",
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
        },
        proBadgeText: {
            fontSize: 9,
            fontWeight: "900",
            color: "#fff",
            letterSpacing: 1,
        },

        // Day bar
        dayBarWrap: {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            paddingVertical: 8,
            marginBottom: 8,
        },
        dayBarScroll: {
            paddingHorizontal: 16,
            gap: 8,
            flexDirection: "row",
        },
        dayTab: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 14,
            backgroundColor: colors.surface2,
            alignItems: "center",
            position: "relative",
            minWidth: 54,
            borderWidth: 1,
            borderColor: colors.border,
        },
        dayTabActive: {
            backgroundColor: colors.accent,
            borderColor: colors.accent,
        },
        dayTabText: {
            fontSize: 11,
            fontWeight: "800",
            color: colors.textSub,
            textTransform: "uppercase",
        },
        dayTabTextActive: {
            color: "#fff",
        },
        todayDot: {
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.accent,
        },
        dayBadge: {
            marginTop: 4,
            paddingHorizontal: 6,
            paddingVertical: 1.5,
            borderRadius: 8,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
        },
        dayBadgeActive: {
            backgroundColor: "rgba(255,255,255,0.25)",
        },
        dayBadgeText: {
            fontSize: 10,
            fontWeight: "800",
            color: colors.textSub,
        },
        dayBadgeTextActive: {
            color: "#fff",
        },
        dayDot: {
            position: "absolute",
            top: 4,
            right: 4,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.red,
        },

        // Cancelled Banner
        cancelledBanner: {
            marginHorizontal: 16,
            marginBottom: 10,
            padding: 14,
            borderRadius: 14,
            backgroundColor: "rgba(239,68,68,0.1)",
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.3)",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
        },
        cancelledIconBox: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: "rgba(239,68,68,0.2)",
            alignItems: "center",
            justifyContent: "center",
        },
        cancelledTitle: {
            color: "#EF4444",
            fontWeight: "800",
            fontSize: 13,
        },
        cancelledSub: {
            color: "rgba(239,68,68,0.75)",
            fontSize: 11,
            marginTop: 2,
        },

        // Slot list
        slotList: {
            paddingHorizontal: 16,
            paddingTop: 8,
        },
        slotLoadingBox: {
            padding: 40,
            alignItems: "center",
            justifyContent: "center",
        },
        dayHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
        },
        dayHeaderLeft: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
        },
        dayHeaderText: {
            fontSize: 16,
            fontWeight: "900",
            color: colors.text,
        },
        todayPill: {
            backgroundColor: colors.accentDim,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
        },
        todayPillText: {
            fontSize: 9,
            fontWeight: "800",
            color: colors.accent,
            letterSpacing: 0.5,
        },
        daySlotCount: {
            fontSize: 11,
            color: colors.textMuted,
            fontWeight: "700",
        },

        // Slot Card
        slotCard: {
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 12,
            overflow: "hidden",
            padding: 14,
            paddingLeft: 18,
            position: "relative",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04,
            shadowRadius: 5,
            elevation: 1,
        },
        slotCardConflict: {
            borderColor: "rgba(239,68,68,0.4)",
            backgroundColor: "rgba(239,68,68,0.04)",
        },
        slotStrip: {
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 5,
        },
        slotHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
        },
        timePill: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.surface2,
            paddingHorizontal: 8,
            paddingVertical: 3.5,
            borderRadius: 8,
        },
        timePillText: {
            fontSize: 11,
            fontWeight: "800",
            color: colors.accent,
        },
        badgeRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
        },
        categoryBadge: {
            paddingHorizontal: 6,
            paddingVertical: 2.5,
            borderRadius: 6,
            backgroundColor: "rgba(59,130,246,0.12)",
            borderWidth: 1,
            borderColor: "rgba(59,130,246,0.25)",
        },
        categoryBadgeText: {
            fontSize: 8,
            fontWeight: "900",
            color: "#3B82F6",
            letterSpacing: 0.5,
        },
        draftBadge: {
            paddingHorizontal: 5,
            paddingVertical: 2,
            borderRadius: 5,
            backgroundColor: "rgba(245,158,11,0.15)",
            borderWidth: 1,
            borderColor: "rgba(245,158,11,0.3)",
        },
        draftBadgeText: {
            fontSize: 8,
            fontWeight: "900",
            color: "#B45309",
        },
        conflictBadge: {
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            backgroundColor: colors.redDim,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.3)",
        },
        conflictBadgeText: {
            fontSize: 8,
            fontWeight: "900",
            color: colors.red,
        },
        slotBody: {
            marginBottom: 10,
        },
        slotSubject: {
            fontSize: 16,
            fontWeight: "800",
            color: colors.text,
            letterSpacing: -0.2,
            marginBottom: 6,
        },
        slotMetaRow: {
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
        },
        metaChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: colors.surface2,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
        },
        metaChipText: {
            fontSize: 11,
            fontWeight: "600",
            color: colors.textSub,
        },
        slotActionsRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
            paddingTop: 10,
        },
        slotActionBtn: {
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: colors.surface2,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 36,
        },
        deleteActionBtn: {
            backgroundColor: colors.redDim,
            borderColor: "rgba(239,68,68,0.3)",
        },
        slotActionBtnText: {
            fontSize: 11,
            fontWeight: "700",
            color: colors.textSub,
        },

        // Empty states
        emptyState: {
            padding: 36,
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
        },
        emptyTitle: {
            fontSize: 18,
            fontWeight: "900",
            color: colors.text,
        },
        emptySub: {
            fontSize: 13,
            color: colors.textMuted,
            textAlign: "center",
            lineHeight: 18,
            paddingHorizontal: 20,
        },
        emptySelectBtn: {
            backgroundColor: colors.accent,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 12,
            marginTop: 8,
        },
        emptySelectBtnText: {
            color: "#fff",
            fontWeight: "800",
            fontSize: 13,
        },
        emptyDay: {
            alignItems: "center",
            padding: 32,
            backgroundColor: colors.surface,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: "dashed",
            gap: 8,
            marginTop: 4,
        },
        emptyDayText: {
            fontSize: 14,
            color: colors.text,
            fontWeight: "800",
            marginTop: 4,
        },
        emptyDaySub: {
            fontSize: 11,
            color: colors.textSub,
            textAlign: "center",
            marginBottom: 6,
        },
        emptyDayActions: {
            flexDirection: isMobile ? "column" : "row",
            gap: 8,
            width: isMobile ? "100%" : "auto",
        },
        emptyDayAddBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: colors.accent,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
        },
        emptyDayAddBtnText: {
            fontSize: 12,
            fontWeight: "800",
            color: "#fff",
        },
        emptyDayAutoBtn: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            backgroundColor: colors.surface2,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        emptyDayAutoBtnText: {
            fontSize: 12,
            fontWeight: "700",
            color: colors.accent,
        },

        // Floating Action Button
        fab: {
            position: "absolute",
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.accent,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: colors.accent,
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
        },

        // Class Picker Modal Sheet
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
        },
        modalSheet: {
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: 24,
            maxHeight: "85%",
            borderTopWidth: 1,
            borderColor: colors.border,
        },
        modalHeader: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        modalTitle: {
            fontSize: 17,
            fontWeight: "800",
            color: colors.text,
        },
        modalCloseBtn: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.surface2,
            alignItems: "center",
            justifyContent: "center",
        },
        modalSearchWrap: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.surface2,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 9,
            marginHorizontal: 18,
            marginVertical: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        modalSearchInput: {
            flex: 1,
            fontSize: 13,
            color: colors.text,
            padding: 0,
        },
        classListItem: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
        },
        classListItemActive: {
            backgroundColor: colors.accentDim,
        },
        classListName: {
            fontSize: 14,
            fontWeight: "700",
            color: colors.text,
        },
        classListSub: {
            fontSize: 11,
            color: colors.textSub,
            marginTop: 2,
        },
    });
}
