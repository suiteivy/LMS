import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { ClassService, ClassStudent } from "@/services/ClassService";
import { TimetableAPI, TimetableEntry } from "@/services/TimetableService";
import {
    BookOpen,
    Calendar,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    Lock,
    MapPin,
    School,
    Users,
    X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassItem {
    id: string;
    name: string;
    student_count?: number;
    teacher_id?: string | null;
    institution_id?: string | null;
    created_at?: string;
}

// Matches the DB `attendance.status` enum exactly (no 'pending' in DB)
type AttendanceStatus = "present" | "absent" | "late" | "excused" | "unmarked";

interface StudentRow extends ClassStudent {
    status: AttendanceStatus;
}

interface HistorySession {
    date: string;
    present: number;
    absent: number;
    late: number;
    students: { name: string; email: string; status: AttendanceStatus }[];
    expanded: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

const isoDate = (d: Date) => d.toISOString().split("T")[0];

// 12-hour time formatter
const fmt12 = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

// Map JS getDay() index → timetable day_of_week string
const JS_DAY_TO_TT: TimetableEntry["day_of_week"][] = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

const statusColor: Record<AttendanceStatus, string> = {
    present: "#22c55e",
    absent: "#ef4444",
    late: "#f59e0b",
    excused: "#8b5cf6",
    unmarked: "#9CA3AF",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const TabPill = ({
    label,
    active,
    onPress,
    icon,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    icon: React.ReactNode;
}) => (
    <TouchableOpacity
        onPress={onPress}
        className={`flex-1 flex-row items-center justify-center py-3 rounded-2xl gap-2 ${active ? "bg-[#FF6900] shadow-md" : "bg-gray-100 dark:bg-[#1a1a1a]"
            }`}
    >
        {icon}
        <Text className={`font-bold text-sm ${active ? "text-white" : "text-gray-500 dark:text-gray-400"}`}>
            {label}
        </Text>
    </TouchableOpacity>
);

const StatusBtn = ({
    status,
    current,
    locked,
    onPress,
}: {
    status: AttendanceStatus;
    current: AttendanceStatus;
    locked: boolean;
    onPress: () => void;
}) => {
    const icons: Record<AttendanceStatus, React.ReactNode> = {
        present: <Check size={16} color={current === "present" ? "white" : "#9CA3AF"} />,
        absent: <X size={16} color={current === "absent" ? "white" : "#9CA3AF"} />,
        late: <Clock size={14} color={current === "late" ? "white" : "#9CA3AF"} />,
        excused: <Check size={14} color={current === "excused" ? "white" : "#8b5cf6"} />,
        unmarked: null,
    };

    const activeBg: Record<AttendanceStatus, string> = {
        present: "bg-green-500",
        absent: "bg-red-500",
        late: "bg-amber-400",
        excused: "bg-violet-500",
        unmarked: "bg-gray-200",
    };

    const isActive = current === status;

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={locked}
            className={`w-9 h-9 rounded-xl items-center justify-center ${isActive
                ? activeBg[status]
                : "bg-gray-100 dark:bg-[#242424] border border-gray-200 dark:border-gray-700"
                } ${locked ? "opacity-60" : ""}`}
        >
            {icons[status]}
        </TouchableOpacity>
    );
};

// ─── Daily Tab ────────────────────────────────────────────────────────────────

const DailyTab = ({ classId, className: cName }: { classId: string; className: string }) => {
    const [date, setDate] = useState(new Date());
    const [rows, setRows] = useState<StudentRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [locked, setLocked] = useState(false);
    // Timetable / schedule
    const [schedule, setSchedule] = useState<TimetableEntry[]>([]);
    const [schedLoading, setSchedLoading] = useState(true);

    // Fetch class timetable once on mount
    useEffect(() => {
        TimetableAPI.getClassTimetable(classId)
            .then(setSchedule)
            .catch((e) => console.error("timetable fetch:", e))
            .finally(() => setSchedLoading(false));
    }, [classId]);

    // Derive schedule entries for the selected day
    const todayName = JS_DAY_TO_TT[date.getDay()];
    const sessionsToday = schedule.filter((e) => e.day_of_week === todayName);
    const hasClass = sessionsToday.length > 0;

    const shiftDay = (n: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + n);
        setDate(d);
    };

    const loadData = useCallback(async () => {
        if (!hasClass) {
            // No lesson today — clear roll-call without hitting DB
            setRows([]);
            setLocked(false);
            return;
        }
        setLoading(true);
        try {
            const students = await ClassService.getClassStudents(classId);
            const dateStr = isoDate(date);

            const { data: existing } = await supabase
                .from("attendance")
                .select("student_id, status")
                .eq("class_id", classId)
                .eq("date", dateStr);

            const existingMap: Record<string, AttendanceStatus> = {};
            (existing ?? []).forEach((r: any) => {
                existingMap[r.student_id] = r.status as AttendanceStatus;
            });

            setLocked((existing ?? []).length > 0);

            setRows(
                students.map((s) => ({
                    ...s,
                    status: existingMap[s.student_id] ?? "unmarked",
                }))
            );
        } catch (e) {
            console.error("DailyTab loadData:", e);
        } finally {
            setLoading(false);
        }
    }, [classId, date, hasClass]);

    useEffect(() => { loadData(); }, [loadData]);

    const mark = (student_id: string, status: AttendanceStatus) => {
        if (locked) return;
        setRows((prev) => prev.map((r) => (r.student_id === student_id ? { ...r, status } : r)));
    };

    const save = async () => {
        const unmarked = rows.filter((r) => r.status === "unmarked");
        if (unmarked.length > 0) {
            Alert.alert(
                "Incomplete",
                `${unmarked.length} student(s) not yet marked. Please mark all students before saving.`
            );
            return;
        }

        setSaving(true);
        try {
            const dateStr = isoDate(date);
            const records = rows
                .filter((r) => r.status !== "unmarked")
                .map((r) => ({
                    student_id: r.student_id,
                    class_id: classId,
                    date: dateStr,
                    status: r.status as "present" | "absent" | "late" | "excused",
                }));

            const { error } = await supabase
                .from("attendance")
                .upsert(records, { onConflict: "student_id,class_id,date" });

            if (error) throw error;

            setLocked(true);
            Alert.alert("Saved & Locked", "Attendance has been saved and is now read-only for this date.");
        } catch (e) {
            console.error("save attendance:", e);
            Alert.alert("Error", "Failed to save attendance. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const presentCount = rows.filter((r) => r.status === "present").length;
    const absentCount = rows.filter((r) => r.status === "absent").length;
    const lateCount = rows.filter((r) => r.status === "late").length;
    const unmarkedCount = rows.filter((r) => r.status === "unmarked").length;

    return (
        <View className="flex-1">
            {/* Date navigator */}
            <View className="flex-row items-center justify-between bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-4 py-3 mb-4 border border-gray-100 dark:border-gray-800">
                <TouchableOpacity onPress={() => shiftDay(-1)} className="p-1">
                    <ChevronLeft size={20} color="#6B7280" />
                </TouchableOpacity>
                <View className="items-center">
                    <View className="flex-row items-center gap-1.5">
                        <Calendar size={13} color="#FF6900" />
                        <Text className="text-gray-900 dark:text-white font-bold text-sm">{fmt(date)}</Text>
                    </View>
                    {locked && (
                        <View className="flex-row items-center gap-1 mt-1">
                            <Lock size={10} color="#FF6900" />
                            <Text className="text-[10px] font-bold text-[#FF6900] uppercase tracking-widest">Locked</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={() => shiftDay(1)} className="p-1">
                    <ChevronRight size={20} color="#6B7280" />
                </TouchableOpacity>
            </View>

            {/* Schedule loading spinner */}
            {schedLoading ? (
                <ActivityIndicator size="small" color="#FF6900" className="my-6" />
            ) : !hasClass ? (
                /* ── No class today ── */
                <View className="flex-1 py-8">
                    <View className="bg-gray-50 dark:bg-[#1a1a1a] border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-10 items-center">
                        <School size={44} color="#D1D5DB" />
                        <Text className="text-gray-700 dark:text-gray-300 font-black text-base mt-4 text-center">
                            No class on {todayName}
                        </Text>
                        <Text className="text-gray-400 dark:text-gray-500 text-xs text-center mt-2 leading-5">
                            This class has no scheduled session today.{"\n"}Navigate to a scheduled day to take attendance.
                        </Text>
                        {/* Hint: show which days are scheduled */}
                        {schedule.length > 0 && (
                            <View className="flex-row flex-wrap gap-2 mt-5 justify-center">
                                {[...new Set(schedule.map((s) => s.day_of_week))].map((day) => (
                                    <View
                                        key={day}
                                        className="bg-orange-50 dark:bg-orange-950/30 px-3 py-1.5 rounded-xl border border-orange-100 dark:border-orange-900/30"
                                    >
                                        <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest">
                                            {day.slice(0, 3)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                /* ── Class is scheduled today ── */
                <View className="flex-1">
                    {/* Lesson banner(s) */}
                    {sessionsToday.map((session) => (
                        <View
                            key={session.id}
                            className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-3"
                        >
                            <View className="bg-[#FF6900]/10 p-2 rounded-xl">
                                <BookOpen size={14} color="#FF6900" />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-gray-900 dark:text-white font-bold text-sm"
                                    numberOfLines={1}
                                >
                                    {session.subjects?.title ?? "Lesson"}
                                </Text>
                                <View className="flex-row items-center gap-3 mt-0.5">
                                    <View className="flex-row items-center gap-1">
                                        <Clock size={10} color="#9CA3AF" />
                                        <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold">
                                            {fmt12(session.start_time)} – {fmt12(session.end_time)}
                                        </Text>
                                    </View>
                                    {session.room_number && (
                                        <View className="flex-row items-center gap-1">
                                            <MapPin size={10} color="#9CA3AF" />
                                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold">
                                                Room {session.room_number}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    ))}

                    {/* Summary pills */}
                    {rows.length > 0 && (
                        <View className="flex-row gap-2 mb-4">
                            {[
                                { label: "Present", val: presentCount, color: "bg-green-50 dark:bg-green-950/30", text: "text-green-600" },
                                { label: "Absent", val: absentCount, color: "bg-red-50 dark:bg-red-950/30", text: "text-red-500" },
                                { label: "Late", val: lateCount, color: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-500" },
                                ...(!locked ? [{ label: "Unmarked", val: unmarkedCount, color: "bg-gray-50 dark:bg-[#1a1a1a]", text: "text-gray-400" }] : []),
                            ].map((p) => (
                                <View
                                    key={p.label}
                                    className={`flex-1 ${p.color} rounded-2xl py-3 items-center border border-gray-100 dark:border-gray-800`}
                                >
                                    <Text className={`${p.text} text-xl font-black`}>{p.val}</Text>
                                    <Text className={`${p.text} text-[9px] font-bold uppercase tracking-widest`}>{p.label}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Student roll-call */}
                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : rows.length === 0 ? (
                        <View className="items-center py-12">
                            <Users size={40} color="#D1D5DB" />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold mt-3">No students enrolled</Text>
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            {rows.map((r) => (
                                <View
                                    key={r.student_id}
                                    className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-2.5 flex-row items-center"
                                >
                                    <View
                                        className="w-11 h-11 rounded-xl items-center justify-center mr-3"
                                        style={{ backgroundColor: `${statusColor[r.status]}22` }}
                                    >
                                        <Text style={{ color: statusColor[r.status] }} className="font-black text-base">
                                            {r.full_name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>

                                    <View className="flex-1">
                                        <Text className="text-gray-900 dark:text-white font-bold text-sm" numberOfLines={1}>
                                            {r.full_name}
                                        </Text>
                                        <Text className="text-gray-400 dark:text-gray-500 text-[10px]">{r.email}</Text>
                                    </View>

                                    <View className="flex-row gap-1.5">
                                        {(["present", "absent", "late"] as AttendanceStatus[]).map((s) => (
                                            <StatusBtn
                                                key={s}
                                                status={s}
                                                current={r.status}
                                                locked={locked}
                                                onPress={() => mark(r.student_id, s)}
                                            />
                                        ))}
                                    </View>
                                </View>
                            ))}

                            {/* Save / Locked CTA */}
                            {locked ? (
                                <View className="flex-row items-center justify-center gap-2 py-4 mt-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                                    <Lock size={14} color="#FF6900" />
                                    <Text className="text-[#FF6900] font-bold text-sm">
                                        Attendance locked for this date
                                    </Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    onPress={save}
                                    disabled={saving}
                                    className={`bg-[#FF6900] py-4 rounded-2xl items-center mt-4 shadow-lg ${saving ? "opacity-60" : "active:bg-orange-600"}`}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-white font-bold text-base">Save & Lock Attendance</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    )}
                </View>
            )}
        </View>
    );
};

// ─── By Class Tab (History) ───────────────────────────────────────────────────

const ByClassTab = ({ classId }: { classId: string }) => {
    const [sessions, setSessions] = useState<HistorySession[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("attendance")
                    .select(`
                        date,
                        status,
                        student:students(
                            id,
                            user:users(full_name, email)
                        )
                    `)
                    .eq("class_id", classId)
                    .order("date", { ascending: false });

                if (error) throw error;

                const byDate: Record<string, HistorySession> = {};
                (data ?? []).forEach((row: any) => {
                    const d: string = row.date;
                    if (!byDate[d]) {
                        byDate[d] = { date: d, present: 0, absent: 0, late: 0, students: [], expanded: false };
                    }
                    const st = row.status as AttendanceStatus;
                    if (st === "present") byDate[d].present++;
                    else if (st === "absent") byDate[d].absent++;
                    else if (st === "late") byDate[d].late++;

                    byDate[d].students.push({
                        name: row.student?.user?.full_name ?? "Unknown",
                        email: row.student?.user?.email ?? "",
                        status: st,
                    });
                });

                setSessions(Object.values(byDate));
            } catch (e) {
                console.error("ByClassTab:", e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [classId]);

    const toggle = (idx: number) => {
        setSessions((prev: HistorySession[]) =>
            prev.map((s: HistorySession, i: number) => (i === idx ? { ...s, expanded: !s.expanded } : s))
        );
    };

    const statusIcon = (s: AttendanceStatus) => {
        if (s === "present") return <Check size={12} color="#22c55e" />;
        if (s === "absent") return <X size={12} color="#ef4444" />;
        if (s === "late") return <Clock size={11} color="#f59e0b" />;
        return null;
    };

    if (loading) return <ActivityIndicator size="large" color="#FF6900" className="mt-10" />;

    if (sessions.length === 0) {
        return (
            <View className="items-center py-16">
                <BookOpen size={44} color="#D1D5DB" />
                <Text className="text-gray-400 dark:text-gray-500 font-bold mt-4 text-center">
                    No attendance sessions recorded yet.{"\n"}Start with the Daily tab.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {sessions.map((session: HistorySession, idx: number) => {
                const d = new Date(session.date + "T00:00:00");
                return (
                    <View
                        key={session.date}
                        className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 mb-3 overflow-hidden"
                    >
                        <TouchableOpacity
                            onPress={() => toggle(idx)}
                            className="flex-row items-center px-4 py-4"
                        >
                            <View className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/30 items-center justify-center mr-3">
                                <Lock size={14} color="#FF6900" />
                            </View>

                            <View className="flex-1">
                                <Text className="text-gray-900 dark:text-white font-bold text-sm">{fmt(d)}</Text>
                                <Text className="text-gray-400 dark:text-gray-500 text-[10px] mt-0.5">
                                    {session.students.length} students recorded
                                </Text>
                            </View>

                            <View className="flex-row gap-3 mr-3">
                                <Text className="text-green-500 font-black text-sm">{session.present}P</Text>
                                <Text className="text-red-400 font-black text-sm">{session.absent}A</Text>
                                <Text className="text-amber-400 font-black text-sm">{session.late}L</Text>
                            </View>

                            {session.expanded ? (
                                <ChevronUp size={18} color="#9CA3AF" />
                            ) : (
                                <ChevronDown size={18} color="#9CA3AF" />
                            )}
                        </TouchableOpacity>

                        {session.expanded && (
                            <View className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4 pt-2">
                                {session.students.map((st: { name: string; email: string; status: AttendanceStatus }, i: number) => (
                                    <View
                                        key={i}
                                        className={`flex-row items-center py-2.5 ${i < session.students.length - 1
                                            ? "border-b border-gray-50 dark:border-gray-800"
                                            : ""
                                            }`}
                                    >
                                        <View
                                            className="w-7 h-7 rounded-lg items-center justify-center mr-3"
                                            style={{ backgroundColor: `${statusColor[st.status]}22` }}
                                        >
                                            <Text style={{ color: statusColor[st.status] }} className="font-black text-xs">
                                                {st.name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text
                                            className="flex-1 text-gray-800 dark:text-gray-200 font-semibold text-sm"
                                            numberOfLines={1}
                                        >
                                            {st.name}
                                        </Text>
                                        <View
                                            className="flex-row items-center gap-1 px-2 py-1 rounded-lg"
                                            style={{ backgroundColor: `${statusColor[st.status]}22` }}
                                        >
                                            {statusIcon(st.status)}
                                            <Text
                                                style={{ color: statusColor[st.status] }}
                                                className="text-[10px] font-bold uppercase"
                                            >
                                                {st.status}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );
};

// ─── Attendance Modal ─────────────────────────────────────────────────────────

const ClassAttendanceModal = ({
    cls,
    onClose,
}: {
    cls: ClassItem;
    onClose: () => void;
}) => {
    const [tab, setTab] = useState<"daily" | "history">("daily");

    return (
        <Modal visible animationType="slide" transparent onRequestClose={onClose}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={onClose}
                className="flex-1 bg-black/50 justify-end"
            >
                <TouchableOpacity
                    activeOpacity={1}
                    className="bg-white dark:bg-[#121212] rounded-t-[36px] border-t border-gray-100 dark:border-gray-800"
                    style={{ height: "90%" }}
                >
                    {/* Drag handle */}
                    <View className="items-center pt-3 pb-1">
                        <View className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    </View>

                    {/* Header */}
                    <View className="flex-row items-center px-6 pt-4 pb-5">
                        <View className="bg-orange-50 dark:bg-orange-950/30 p-2.5 rounded-2xl mr-3">
                            <Users size={20} color="#FF6900" />
                        </View>
                        <View className="flex-1">
                            <Text
                                className="text-gray-900 dark:text-white font-black text-lg tracking-tight"
                                numberOfLines={1}
                            >
                                {cls.name}
                            </Text>
                            <Text className="text-gray-400 dark:text-gray-500 text-xs font-medium">
                                {cls.student_count ?? 0} students enrolled
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            className="w-9 h-9 bg-gray-100 dark:bg-[#1a1a1a] rounded-full items-center justify-center"
                        >
                            <X size={18} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Tab pills */}
                    <View className="flex-row gap-2 px-6 mb-5">
                        <TabPill
                            label="Daily Roll-Call"
                            active={tab === "daily"}
                            onPress={() => setTab("daily")}
                            icon={<Calendar size={14} color={tab === "daily" ? "white" : "#9CA3AF"} />}
                        />
                        <TabPill
                            label="Attendance Log"
                            active={tab === "history"}
                            onPress={() => setTab("history")}
                            icon={<BookOpen size={14} color={tab === "history" ? "white" : "#9CA3AF"} />}
                        />
                    </View>

                    {/* Content */}
                    <View className="flex-1 px-6">
                        {tab === "daily" ? (
                            <DailyTab classId={cls.id} className={cls.name} />
                        ) : (
                            <ByClassTab classId={cls.id} />
                        )}
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TeacherClasses() {
    const { teacherId } = useAuth();
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

    useEffect(() => {
        if (teacherId) fetchClasses();
    }, [teacherId]);

    const fetchClasses = async () => {
        if (!teacherId) return;
        try {
            // Teachers are linked to classes through subjects (subjects.teacher_id → subjects.class_id)
            const { data: subjectData, error: subjectError } = await supabase
                .from('subjects')
                .select('class_id')
                .eq('teacher_id', teacherId);

            if (subjectError) throw subjectError;

            // Deduplicate class IDs
            const classIds = [...new Set((subjectData ?? []).map((s: any) => s.class_id).filter(Boolean))];

            if (classIds.length === 0) {
                setClasses([]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('classes')
                .select('*')
                .in('id', classIds);

            if (error) throw error;

            const typedData = data as ClassItem[];

            const classesWithCounts = await Promise.all(
                typedData.map(async (cls) => {
                    const { count } = await supabase
                        .from('students')
                        .select('id', { count: 'exact', head: true })
                        .eq('class_id', cls.id);
                    return { ...cls, student_count: count || 0 };
                })
            );

            setClasses(classesWithCounts);
        } catch (error) {
            console.error("Error fetching classes:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white dark:bg-black">
            <UnifiedHeader title="Management" subtitle="My Classes" role="Teacher" />

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View className="p-4 md:p-8">
                    <View className="mb-6 px-2">
                        <Text className="text-gray-400 dark:text-gray-500 font-semibold text-xs uppercase tracking-widest">
                            {classes.length} {classes.length === 1 ? 'class' : 'classes'} assigned
                        </Text>
                    </View>

                    {loading ? (
                        <View className="items-center justify-center p-8">
                            <ActivityIndicator size="large" color="#FF6900" />
                        </View>
                    ) : (
                        <View>
                            {classes.length === 0 ? (
                                <View className="bg-white dark:bg-[#1a1a1a] p-10 rounded-3xl items-center border border-gray-100 dark:border-gray-800 border-dashed">
                                    <School size={48} color="#9CA3AF" />
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold mt-4 text-center">
                                        No classes assigned yet.
                                    </Text>
                                </View>
                            ) : (
                                classes.map((cls) => (
                                    <TouchableOpacity
                                        key={cls.id}
                                        onPress={() => setSelectedClass(cls)}
                                        className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-3 shadow-sm flex-row items-center active:bg-gray-50 dark:active:bg-gray-900"
                                    >
                                        <View className="bg-orange-50 p-3 rounded-2xl mr-4">
                                            <Users size={24} color="#FF6900" />
                                        </View>

                                        <View className="flex-1">
                                            <Text className="text-gray-900 dark:text-white font-bold text-lg">
                                                {cls.name}
                                            </Text>
                                            <Text className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                                                {cls.student_count} Students
                                            </Text>
                                        </View>

                                        <View className="items-center gap-1">
                                            <View className="bg-[#FF6900]/10 px-3 py-1 rounded-xl">
                                                <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest">
                                                    Attendance
                                                </Text>
                                            </View>
                                            <ChevronRight size={18} color="#9CA3AF" />
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Attendance Modal */}
            {selectedClass && (
                <ClassAttendanceModal
                    cls={selectedClass}
                    onClose={() => setSelectedClass(null)}
                />
            )}
        </View>
    );
}
