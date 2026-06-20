// (admin)/timetable/index.tsx   Theme-aware Timetable Builder
import { SubscriptionGate } from "@/components/shared/SubscriptionComponents";
import { supabase } from "@/libs/supabase";
import { ClassAPI, ClassItem as ClassData } from "@/services/ClassService";
import { SubjectAPI, SubjectData } from "@/services/SubjectService";
import { CreateTimetableDto, TimetableAPI, TimetableEntry } from "@/services/TimetableService";
import { showError, showSuccess } from "@/utils/toast";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useRealtimeQuery } from "@/hooks/useRealtimeQuery";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import {
    AlertOctagon,
    Bell,
    BookOpen,
    Calendar,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronUp,
    Clock,
    Edit3,
    Info,
    MapPin,
    Plus,
    RefreshCw,
    Shield,
    Trash2,
    User,
    X,
    Zap
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Colour palette for subject cards (cycles)
const SUBJECT_COLORS = [
    "#FF6900", "#3B82F6", "#22C55E", "#F59E0B", "#A78BFA", "#F87171", "#10B981",
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
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
};

const overlaps = (s1: number, e1: number, s2: number, e2: number) => s1 < e2 && s2 < e1;

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

                const aTeacher = a.subjects?.teachers?.users?.full_name ?? "Unknown teacher";
                const bTeacher = b.subjects?.teachers?.users?.full_name ?? "Unknown teacher";
                const aTeacherId = (a.subjects as any)?.teacher_id ?? "";
                const bTeacherId = (b.subjects as any)?.teacher_id ?? "";
                const aSub = a.subjects?.title ?? "Unknown";
                const bSub = b.subjects?.title ?? "Unknown";

                if (a.room_number && b.room_number &&
                    a.room_number.trim().toLowerCase() === b.room_number.trim().toLowerCase() &&
                    a.class_id !== b.class_id) {
                    conflicts.push({
                        id: nextId(), type: "room_clash", severity: "error", day,
                        message: `Room ${a.room_number} double-booked on ${day}`,
                        detail: `"${aSub}" and "${bSub}" both use Room ${a.room_number} at overlapping times.`,
                        affectedEntryIds: [a.id, b.id],
                        affectedTeacherUserIds: [aTeacherId, bTeacherId].filter(Boolean),
                        affectedClassIds: [a.class_id, b.class_id],
                    });
                }

                if (aTeacherId && bTeacherId && aTeacherId === bTeacherId && a.class_id !== b.class_id) {
                    conflicts.push({
                        id: nextId(), type: "teacher_double_book", severity: "error", day,
                        message: `${aTeacher} has two classes simultaneously on ${day}`,
                        detail: `Teaching "${aSub}" and "${bSub}" at overlapping times.`,
                        affectedEntryIds: [a.id, b.id],
                        affectedTeacherUserIds: [aTeacherId],
                        affectedClassIds: [a.class_id, b.class_id],
                    });
                }

                if (a.class_id === b.class_id) {
                    conflicts.push({
                        id: nextId(), type: "class_double_book", severity: "error", day,
                        message: `Class has overlapping subjects on ${day}`,
                        detail: `"${aSub}" and "${bSub}" overlap - students can't be in two places at once.`,
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
            const tid = (s.subjects as any)?.teacher_id ?? "__unknown__";
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
                        const tName = slotsForTeacher[k].subjects?.teachers?.users?.full_name ?? "A teacher";
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
    const [expanded, setExpanded] = useState(true);
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
        return (
            <View style={styles.cleanBanner}>
                <Check size={16} color={colors.green} />
                <Text style={styles.cleanBannerText}>No conflicts - schedule looks clean ✓</Text>
            </View>
        );
    }

    return (
        <View style={styles.conflictPanel}>
            <TouchableOpacity style={styles.conflictHeader} onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
                <View style={styles.conflictHeaderLeft}>
                    <View style={styles.conflictIconBox}>
                        <Shield size={14} color={colors.red} />
                    </View>
                    <Text style={styles.conflictTitle}>
                        {conflicts.length} Conflict{conflicts.length > 1 ? "s" : ""} Detected
                    </Text>
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
                {expanded ? <ChevronUp size={16} color={colors.textSub} /> : <ChevronDown size={16} color={colors.textSub} />}
            </TouchableOpacity>

            {expanded && (
                <>
                    <View style={styles.divider} />
                    <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                        {conflicts.map((c, idx) => {
                            const meta = typeMeta[c.type];
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
                    <View style={styles.divider} />
                    <View style={styles.conflictFooter}>
                        <TouchableOpacity
                            style={[styles.alertBtn, sending && { opacity: 0.5 }]}
                            onPress={onSendAll}
                            disabled={sending}
                            activeOpacity={0.8}
                        >
                            {sending ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Bell size={14} color="#fff" />
                                    <Text style={styles.alertBtnText}>Alert All Stakeholders</Text>
                                    <Zap size={12} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>
                        <Text style={styles.conflictFooterNote}>
                            Notifies affected {isTertiary ? "teachers, admins & class reps" : "teachers & admins"}
                        </Text>
                    </View>
                </>
            )}
        </View>
    );
}

function ConflictUpgradeNudge({ styles }: { styles: any }) {
    return (
        <View style={styles.upgradeNudge}>
            <View style={styles.upgradeIconBox}>
                <Shield size={18} color="#A78BFA" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.upgradeTitle}>Smart Conflict Detection</Text>
                <Text style={styles.upgradeSub}>Upgrade to <Text style={{ fontWeight: "900" }}>Pro</Text> to detect room clashes, teacher double-bookings & send alerts.</Text>
            </View>
            <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>
        </View>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TimetableBuilder() {
    const router = useRouter();
    const { isDark } = useTheme();

    // Derive theme-based palette
    const colors = React.useMemo(() => {
        return {
            bg: isDark ? "#0F0B2E" : "#f9fafb",
            surface: isDark ? "#13103A" : "#ffffff",
            surface2: isDark ? "#1A1650" : "#f3f4f6",
            border: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
            borderLight: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6",
            text: isDark ? "#ffffff" : "#111827",
            textSub: isDark ? "rgba(255,255,255,0.6)" : "#4b5563",
            textMuted: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af",
            accent: "#FF6900",
            accentDim: "rgba(255,105,0,0.15)",
            red: "#EF4444",
            redDim: "rgba(239,68,68,0.15)",
            amber: "#F59E0B",
            amberDim: "rgba(245,158,11,0.15)",
            blue: "#3B82F6",
            blueDim: "rgba(59,130,246,0.12)",
            green: "#22C55E",
            greenDim: "rgba(34,197,94,0.12)",
            pill: isDark ? "#10B981" : "#059669",
        };
    }, [isDark]);

    const styles = React.useMemo(() => getStyles(colors), [colors]);

    // Data state
    const [loading, setLoading] = useState(true);
    const [fetchingTimetable, setFetchingTimetable] = useState(false);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [allEntries, setAllEntries] = useState<TimetableEntry[]>([]);
    const [conflicts, setConflicts] = useState<Conflict[]>([]);
    const [sendingAlerts, setSendingAlerts] = useState(false);
    const [institutionType, setInstitutionType] = useState<string | null>(null);
    const [institutionId, setInstitutionId] = useState<string | null>(null);

    // UI state
    const [selectedDay, setSelectedDay] = useState<string>("Monday");
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [newSlot, setNewSlot] = useState<Partial<CreateTimetableDto>>({
        day_of_week: "Monday",
        start_time: "08:00",
        end_time: "09:00",
        room_number: "",
    });

    // Derived
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const daySlots = timetable
        .filter(t => t.day_of_week === selectedDay)
        .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
    const conflictingIds = new Set(conflicts.flatMap(c => c.affectedEntryIds));

    // ── Data fetching ─────────────────────────────────────────────────────────

    const fetchAllEntries = useCallback(async () => {
        if (!institutionId) return;
        try {
            const { data } = await supabase
                .from("timetables")
                .select(`*, subjects(id, title, class_id, teacher_id, teachers(id, user_id, users(full_name)))`)
                .eq("institution_id", institutionId);
            const entries = (data ?? []) as unknown as TimetableEntry[];
            setAllEntries(entries);
            setConflicts(detectConflicts(entries));
        } catch (e) {
            console.error("fetchAllEntries:", e);
        }
    }, [institutionId]);

    // Live Updates for Timetable changes
    useRealtimeQuery('timetables', () => {
        fetchAllEntries();
        if (selectedClassId) {
            fetchClassTimetable(selectedClassId);
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
        (async () => {
            try {
                setLoading(true);
                const classList = await ClassAPI.getClasses();
                setClasses(classList);
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
            setTimetable(data);
        } catch (e) { console.error(e); }
        finally { setFetchingTimetable(false); }
    };

    const fetchClassSubjects = async (classId: string) => {
        try {
            const data = await SubjectAPI.getSubjectsByClass(classId);
            setSubjects(data);
        } catch (e) { console.error(e); }
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────

    const openAdd = () => {
        setEditingEntry(null);
        setNewSlot({ day_of_week: selectedDay as any, start_time: "08:00", end_time: "09:00", room_number: "" });
        setIsAddModalVisible(true);
    };

    const openEdit = (entry: TimetableEntry) => {
        setEditingEntry(entry);
        setNewSlot({
            day_of_week: entry.day_of_week,
            start_time: entry.start_time.slice(0, 5),
            end_time: entry.end_time.slice(0, 5),
            room_number: entry.room_number ?? "",
            subject_id: entry.subject_id,
        });
        setIsAddModalVisible(true);
    };

    const handleSave = async () => {
        if (!newSlot.subject_id || !newSlot.day_of_week || !newSlot.start_time || !newSlot.end_time) {
            showError("Validation", "Please fill all required fields.");
            return;
        }
        const startMin = toMinutes(newSlot.start_time!);
        const endMin = toMinutes(newSlot.end_time!);
        if (endMin <= startMin) {
            showError("Invalid Time", "End time must be after start time.");
            return;
        }
        try {
            setSaving(true);
            if (editingEntry) {
                await TimetableAPI.updateEntry(editingEntry.id, newSlot as Partial<CreateTimetableDto>);
                showSuccess("Updated", "Schedule entry updated.");
            } else {
                await TimetableAPI.createEntry({ ...newSlot, class_id: selectedClassId } as CreateTimetableDto);
                showSuccess("Created", "Schedule entry added.");
            }
            setIsAddModalVisible(false);
            await fetchClassTimetable(selectedClassId);
            await fetchAllEntries();
        } catch (e) {
            // handled by interceptor
        } finally {
            setSaving(false);
        }
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
                        await fetchClassTimetable(selectedClassId);
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
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.accent} />
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
                    <TouchableOpacity onPress={fetchAllEntries} style={styles.iconBtn}>
                        <RefreshCw size={18} color={colors.textSub} />
                    </TouchableOpacity>
                }
            />

            {/* ── Class Chips ── */}
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
                            >
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>{cls.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* ── Conflict Panel (Pro-gated) ── */}
            {selectedClassId && (
                <View style={styles.conflictZone}>
                    <SubscriptionGate minPlan="pro" fallback={<ConflictUpgradeNudge styles={styles} />}>
                        <ConflictPanel
                            conflicts={conflicts}
                            onSendAll={handleSendAlerts}
                            sending={sendingAlerts}
                            institutionType={institutionType}
                            colors={colors}
                            styles={styles}
                        />
                    </SubscriptionGate>
                </View>
            )}

            {/* ── Day Tab Bar ── */}
            {selectedClassId && (
                <View style={styles.dayBarWrap}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayBarScroll}>
                        {DAYS.map((day, idx) => {
                            const active = day === selectedDay;
                            const hasConflict = conflicts.some(c => c.day === day && c.affectedEntryIds.some(eid =>
                                timetable.some(t => t.id === eid)
                            ));
                            return (
                                <TouchableOpacity
                                    key={day}
                                    style={[styles.dayTab, active && styles.dayTabActive]}
                                    onPress={() => setSelectedDay(day)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.dayTabText, active && styles.dayTabTextActive]}>
                                        {DAY_SHORT[idx]}
                                    </Text>
                                    {hasConflict && <View style={styles.dayDot} />}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* ── Main Content ── */}
            {!selectedClassId ? (
                <View style={styles.emptyState}>
                    <Calendar size={60} color={colors.border} />
                    <Text style={styles.emptyTitle}>No Class Selected</Text>
                    <Text style={styles.emptySub}>Choose a class above to view and build its timetable</Text>
                </View>
            ) : fetchingTimetable ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={colors.accent} />
                </View>
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.slotList}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Day header */}
                    <View style={styles.dayHeader}>
                        <Calendar size={15} color={colors.accent} />
                        <Text style={styles.dayHeaderText}>{selectedDay}</Text>
                        <View style={styles.dayHeaderLine} />
                        <Text style={styles.daySlotCount}>{daySlots.length} slot{daySlots.length !== 1 ? "s" : ""}</Text>
                    </View>

                    {daySlots.length === 0 ? (
                        <View style={styles.emptyDay}>
                            <Clock size={36} color={colors.border} />
                            <Text style={styles.emptyDayText}>No sessions for {selectedDay}</Text>
                            <TouchableOpacity style={styles.emptyDayBtn} onPress={openAdd}>
                                <Plus size={14} color={colors.accent} />
                                <Text style={styles.emptyDayBtnText}>Add slot</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        daySlots.map((slot, idx) => {
                            const hasConflict = conflictingIds.has(slot.id);
                            const color = getSubjectColor(slot.subject_id);
                            return (
                                <View
                                    key={slot.id}
                                    style={[styles.slotCard, hasConflict && styles.slotCardConflict]}
                                >
                                    <View style={[styles.slotStrip, { backgroundColor: hasConflict ? colors.red : color }]} />
                                    <View style={{ flex: 1, paddingLeft: 12 }}>
                                        <View style={styles.slotTopRow}>
                                            <Text style={styles.slotSubject} numberOfLines={1}>
                                                {slot.subjects?.title ?? "Unknown Subject"}
                                            </Text>
                                            {hasConflict && (
                                                <View style={styles.conflictBadge}>
                                                    <AlertOctagon size={10} color={colors.red} />
                                                    <Text style={styles.conflictBadgeText}>CONFLICT</Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.slotMeta}>
                                            <Clock size={11} color={colors.textSub} />
                                            <Text style={styles.slotMetaText}>
                                                {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                                            </Text>
                                            {slot.room_number ? (
                                                <>
                                                    <Text style={styles.slotMetaDot}>·</Text>
                                                    <MapPin size={11} color={colors.textSub} />
                                                    <Text style={styles.slotMetaText}>Room {slot.room_number}</Text>
                                                </>
                                            ) : null}
                                        </View>

                                        <View style={styles.slotTeacherRow}>
                                            <User size={11} color={color} />
                                            <Text style={[styles.slotTeacher, { color }]}>
                                                {slot.subjects?.teachers?.users?.full_name ?? "No teacher assigned"}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.slotActions}>
                                        <TouchableOpacity style={styles.slotActionBtn} onPress={() => openEdit(slot)}>
                                            <Edit3 size={15} color={colors.textSub} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.slotActionBtn, styles.deleteBtn]} onPress={() => handleDelete(slot.id)}>
                                            <Trash2 size={15} color={colors.red} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            {/* ── FAB ── */}
            {selectedClassId && (
                <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
                    <Plus size={24} color="#fff" />
                </TouchableOpacity>
            )}

            {/* ── Add / Edit Modal ── */}
            <Modal visible={isAddModalVisible} animationType="slide" transparent onRequestClose={() => setIsAddModalVisible(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>{editingEntry ? "Edit Slot" : "Add Schedule Slot"}</Text>
                                <Text style={styles.modalSub}>
                                    {selectedClass?.name ?? "Selected class"} · Conflicts checked on save
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setIsAddModalVisible(false)}>
                                <X size={20} color={colors.textSub} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                            <Text style={styles.formLabel}>Day of Week</Text>
                            <View style={styles.pickerWrap}>
                                <Picker
                                    selectedValue={newSlot.day_of_week}
                                    onValueChange={(v) => setNewSlot({ ...newSlot, day_of_week: v as any })}
                                    style={{ color: colors.text }}
                                    dropdownIconColor={colors.textSub}
                                    itemStyle={{ color: colors.text }}
                                >
                                    {DAYS.map(day => <Picker.Item key={day} label={day} value={day} color={colors.text} />)}
                                </Picker>
                            </View>

                            <Text style={styles.formLabel}>Subject</Text>
                            <View style={styles.pickerWrap}>
                                <Picker
                                    selectedValue={newSlot.subject_id}
                                    onValueChange={(v) => setNewSlot({ ...newSlot, subject_id: v })}
                                    style={{ color: colors.text }}
                                    dropdownIconColor={colors.textSub}
                                    itemStyle={{ color: colors.text }}
                                >
                                    <Picker.Item label="Select subject..." value="" color={colors.textMuted} />
                                    {subjects.map(s => <Picker.Item key={s.id} label={s.title} value={s.id} color={colors.text} />)}
                                </Picker>
                            </View>

                            <View style={styles.timeRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.formLabel}>Start Time</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="08:00"
                                        placeholderTextColor={colors.textMuted}
                                        value={newSlot.start_time}
                                        onChangeText={(v) => setNewSlot({ ...newSlot, start_time: v })}
                                    />
                                </View>
                                <View style={styles.timeSeparator}>
                                    <Text style={styles.timeSepText}>→</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.formLabel}>End Time</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="09:00"
                                        placeholderTextColor={colors.textMuted}
                                        value={newSlot.end_time}
                                        onChangeText={(v) => setNewSlot({ ...newSlot, end_time: v })}
                                    />
                                </View>
                            </View>

                            <Text style={styles.formLabel}>Room <Text style={styles.optional}>(optional)</Text></Text>
                            <TextInput
                                style={[styles.input, { marginBottom: 24 }]}
                                placeholder="e.g. Room 101, Lab A, Lecture Hall 2"
                                placeholderTextColor={colors.textMuted}
                                value={newSlot.room_number ?? ""}
                                onChangeText={(v) => setNewSlot({ ...newSlot, room_number: v })}
                            />

                            <TouchableOpacity
                                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                                onPress={handleSave}
                                disabled={saving}
                                activeOpacity={0.85}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Check size={16} color="#fff" />
                                        <Text style={styles.saveBtnText}>{editingEntry ? "Save Changes" : "Create Entry"}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function getStyles(colors: any) {
    return StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.bg },
        centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },

        // Header
        header: {
            flexDirection: "row", alignItems: "center", paddingTop: 56, paddingBottom: 14,
            paddingHorizontal: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
        },
        backBtn: { marginRight: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, justifyContent: "center", alignItems: "center" },
        headerTitle: { fontSize: 20, fontWeight: "900", color: colors.text, letterSpacing: -0.5 },
        headerSub: { fontSize: 12, color: colors.textSub, marginTop: 2 },
        iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, justifyContent: "center", alignItems: "center" },

        // Class chips
        chipBar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
        chipScroll: { paddingHorizontal: 16, gap: 8, flexDirection: "row" },
        chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
        chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
        chipText: { fontSize: 13, fontWeight: "700", color: colors.textSub },
        chipTextActive: { color: "#fff" },

        // Conflict zone
        conflictZone: { paddingHorizontal: 14, paddingTop: 12 },

        // Conflict panel
        conflictPanel: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 4 },
        conflictHeader: { flexDirection: "row", alignItems: "center", padding: 12 },
        conflictHeaderLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
        conflictIconBox: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.redDim, justifyContent: "center", alignItems: "center" },
        conflictTitle: { fontSize: 13, fontWeight: "800", color: colors.text, flex: 1 },
        badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
        badgeText: { fontSize: 9, fontWeight: "900", color: "#fff" },
        divider: { height: 1, backgroundColor: colors.border },
        conflictItem: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 10, paddingRight: 14 },
        conflictItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
        conflictItemStrip: { width: 3, borderRadius: 2, alignSelf: "stretch", marginLeft: 12 },
        conflictItemRow: { flexDirection: "row", alignItems: "center", marginBottom: 3, gap: 6 },
        typePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
        typePillText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
        conflictDay: { fontSize: 9, fontWeight: "700", color: colors.textMuted, marginLeft: "auto" },
        conflictMsg: { fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 2 },
        conflictDetail: { fontSize: 11, color: colors.textSub, lineHeight: 16 },
        conflictFooter: { padding: 12 },
        alertBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.red, borderRadius: 12, paddingVertical: 12 },
        alertBtnText: { fontSize: 13, fontWeight: "900", color: "#fff" },
        conflictFooterNote: { fontSize: 10, color: colors.textMuted, textAlign: "center", marginTop: 6 },

        // Clean banner
        cleanBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.greenDim, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "rgba(63,185,80,0.25)", marginBottom: 4 },
        cleanBannerText: { fontSize: 13, fontWeight: "700", color: colors.green, flex: 1 },

        // Upgrade nudge
        upgradeNudge: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(167,139,250,0.1)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(167,139,250,0.2)", marginBottom: 4 },
        upgradeIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(167,139,250,0.15)", justifyContent: "center", alignItems: "center" },
        upgradeTitle: { fontSize: 13, fontWeight: "800", color: "#A78BFA" },
        upgradeSub: { fontSize: 11, color: colors.textSub, marginTop: 2 },
        proBadge: { backgroundColor: "#7C3AED", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
        proBadgeText: { fontSize: 9, fontWeight: "900", color: "#fff", letterSpacing: 1 },

        // Day bar
        dayBarWrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 8 },
        dayBarScroll: { paddingHorizontal: 14, gap: 6, flexDirection: "row" },
        dayTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface2, alignItems: "center", position: "relative" },
        dayTabActive: { backgroundColor: colors.accentDim, borderWidth: 1, borderColor: "rgba(255,105,0,0.4)" },
        dayTabText: { fontSize: 13, fontWeight: "700", color: colors.textSub },
        dayTabTextActive: { color: colors.accent },
        dayDot: { position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.red },

        // Slot list
        slotList: { paddingHorizontal: 14, paddingTop: 14 },
        dayHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 8 },
        dayHeaderText: { fontSize: 16, fontWeight: "900", color: colors.text },
        dayHeaderLine: { flex: 1, height: 1, backgroundColor: colors.border },
        daySlotCount: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },

        // Slot card
        slotCard: {
            flexDirection: "row", alignItems: "center", backgroundColor: colors.surface,
            borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 10, overflow: "hidden",
            paddingVertical: 12, paddingRight: 10,
        },
        slotCardConflict: { borderColor: "rgba(248,81,73,0.4)", backgroundColor: "rgba(248,81,73,0.05)" },
        slotStrip: { width: 4, alignSelf: "stretch", borderRadius: 2 },
        slotTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 5, gap: 8 },
        slotSubject: { fontSize: 15, fontWeight: "800", color: colors.text, flex: 1 },
        slotMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
        slotMetaText: { fontSize: 11, color: colors.textSub },
        slotMetaDot: { fontSize: 11, color: colors.textMuted },
        slotTeacherRow: { flexDirection: "row", alignItems: "center", gap: 4 },
        slotTeacher: { fontSize: 11, fontWeight: "600" },
        conflictBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.redDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "rgba(248,81,73,0.3)" },
        conflictBadgeText: { fontSize: 8, fontWeight: "900", color: colors.red },
        slotActions: { flexDirection: "column", gap: 6, marginLeft: 8 },
        slotActionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surface2, justifyContent: "center", alignItems: "center" },
        deleteBtn: { backgroundColor: colors.redDim },

        // Empty states
        emptyState: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
        emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.textSub },
        emptySub: { fontSize: 13, color: colors.textMuted, textAlign: "center", paddingHorizontal: 40 },
        emptyDay: { alignItems: "center", paddingTop: 40, gap: 10 },
        emptyDayText: { fontSize: 14, color: colors.textSub, fontWeight: "600" },
        emptyDayBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.accentDim, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,105,0,0.3)" },
        emptyDayBtnText: { fontSize: 13, fontWeight: "700", color: colors.accent },

        // FAB
        fab: {
            position: "absolute", bottom: 28, right: 20,
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: colors.accent, justifyContent: "center", alignItems: "center",
            shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
            boxShadow: [{
                offsetX: 0,
                offsetY: 4,
                blurRadius: 12,
                color: 'rgba(255, 105, 0, 0.4)',
            }],
            elevation: 8,
        },

        // Modal
        modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
        modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 36, maxHeight: "90%" },
        modalHandle: { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginTop: 10 },
        modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
        modalTitle: { fontSize: 20, fontWeight: "900", color: colors.text },
        modalSub: { fontSize: 12, color: colors.textSub, marginTop: 3 },
        modalCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface2, justifyContent: "center", alignItems: "center" },
        modalBody: { paddingHorizontal: 20, paddingTop: 18 },

        // Form
        formLabel: { fontSize: 11, fontWeight: "700", color: colors.textSub, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
        optional: { fontWeight: "400", color: colors.textMuted, textTransform: "none" },
        pickerWrap: { backgroundColor: colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 16, overflow: "hidden" },
        input: { backgroundColor: colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 16 },
        timeRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
        timeSeparator: { paddingBottom: 14 },
        timeSepText: { fontSize: 18, color: colors.textMuted, fontWeight: "300" },
        saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16 },
        saveBtnText: { fontSize: 16, fontWeight: "900", color: "#fff" },
    });
}
