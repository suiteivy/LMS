import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/services/api";
import { GradingAPI } from "@/services/GradingService";
import { showError } from "@/utils/toast";
import { getPerformanceLabel, type GradingScaleRow } from "@/utils/getPerformanceLabel";
import { router } from "expo-router";
import {
    AlertCircle,
    Award,
    BookOpen,
    ChevronDown,
    ChevronRight,
    FileText,
    Filter,
    Search,
    TrendingUp,
    User,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeacherSubjectClass {
    subject_id: string;
    subject_title: string;
    class_id: string;
    class_name: string;
}

interface Term {
    id: string;
    name: string;
    academic_year_id: string;
    is_current: boolean;
    locked_at?: string | null;
}

interface SubjectBreakdown {
    subject_name: string;
    score: number | null;
    max_score: number;
    grade: string | null;
}

interface ReportCard {
    id: string;
    student_id: string;
    student_name: string;
    admission_number: string;
    class_id: string;
    class_name: string;
    subject_id: string;
    term_id: string;
    term_name: string;
    status: "draft" | "pending_review" | "published" | "released";
    overall_average: number | null;
    gpa: number | null;
    class_rank: number | null;
    total_students: number | null;
    teacher_remarks: string | null;
    admin_remarks: string | null;
    subject_breakdown: SubjectBreakdown[];
    created_at: string;
    updated_at: string;
}

type StatusFilter = "all" | "draft" | "pending_review" | "published" | "released";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
    ReportCard["status"],
    { bg: string; text: string; label: string }
> = {
    draft: { bg: "rgba(107,114,128,0.15)", text: "#9CA3AF", label: "Draft" },
    pending_review: { bg: "rgba(234,179,8,0.15)", text: "#EAB308", label: "Pending Review" },
    published: { bg: "rgba(59,130,246,0.15)", text: "#3B82F6", label: "Published" },
    released: { bg: "rgba(34,197,94,0.15)", text: "#22C55E", label: "Released" },
};

const formatNumber = (n: number | null, fallback = "--") =>
    n !== null ? n.toFixed(1) : fallback;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const Dropdown = ({
    label,
    items,
    selectedId,
    selectedLabel,
    onSelect,
    isDark,
    accentColor,
}: {
    label: string;
    items: { id: string; label: string }[];
    selectedId: string;
    selectedLabel: string;
    onSelect: (id: string) => void;
    isDark: boolean;
    accentColor: string;
}) => {
    const [open, setOpen] = useState(false);

    return (
        <View style={{ marginBottom: 12 }}>
            <Text
                style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: isDark ? "#9CA3AF" : "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    marginBottom: 6,
                    marginLeft: 4,
                }}
            >
                {label}
            </Text>
            <TouchableOpacity
                onPress={() => setOpen((o) => !o)}
                style={{
                    backgroundColor: isDark ? "#161B22" : "#ffffff",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
                activeOpacity={0.7}
            >
                <Text
                    style={{
                        color: isDark ? "#E5E5E5" : "#111827",
                        fontWeight: "600",
                        fontSize: 14,
                        flex: 1,
                    }}
                    numberOfLines={1}
                >
                    {selectedLabel}
                </Text>
                <ChevronDown
                    size={16}
                    color={isDark ? "#9CA3AF" : "#6B7280"}
                    style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
                />
            </TouchableOpacity>

            {open && items.length > 0 && (
                <View
                    style={{
                        backgroundColor: isDark ? "#161B22" : "#ffffff",
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "#F3F4F6",
                        marginTop: 4,
                        overflow: "hidden",
                        elevation: 4,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                    }}
                >
                    {items.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            onPress={() => {
                                onSelect(item.id);
                                setOpen(false);
                            }}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 12,
                                backgroundColor:
                                    item.id === selectedId
                                        ? isDark
                                            ? "rgba(255,107,0,0.12)"
                                            : "#FFF7ED"
                                        : "transparent",
                                borderBottomWidth: 1,
                                borderBottomColor: isDark
                                    ? "rgba(255,255,255,0.05)"
                                    : "#F3F4F6",
                            }}
                        >
                            <Text
                                style={{
                                    color:
                                        item.id === selectedId
                                            ? accentColor
                                            : isDark
                                            ? "#E5E5E5"
                                            : "#111827",
                                    fontWeight: item.id === selectedId ? "700" : "500",
                                    fontSize: 13,
                                }}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const StatusPill = ({
    status,
    isDark,
}: {
    status: ReportCard["status"];
    isDark: boolean;
}) => {
    const cfg = STATUS_CONFIG[status];
    return (
        <View
            style={{
                backgroundColor: cfg.bg,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
            }}
        >
            <Text
                style={{
                    color: cfg.text,
                    fontSize: 10,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                }}
            >
                {cfg.label}
            </Text>
        </View>
    );
};

const ReportCardRow = ({
    card,
    isDark,
    accentColor,
    expanded,
    onToggle,
    gradingScales,
}: {
    card: ReportCard;
    isDark: boolean;
    accentColor: string;
    expanded: boolean;
    onToggle: () => void;
    gradingScales: GradingScaleRow[];
}) => {
    return (
        <View
            style={{
                backgroundColor: isDark ? "#161B22" : "#ffffff",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                marginBottom: 12,
                overflow: "hidden",
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            }}
        >
            {/* Main row */}
            <TouchableOpacity
                onPress={onToggle}
                activeOpacity={0.7}
                style={{ padding: 16 }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    {/* Avatar */}
                    <View
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 16,
                            backgroundColor: isDark
                                ? "rgba(255,107,0,0.12)"
                                : "#FFF7ED",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12,
                        }}
                    >
                        <Text
                            style={{
                                color: accentColor,
                                fontWeight: "800",
                                fontSize: 16,
                            }}
                        >
                            {(card.student_name || "U").charAt(0).toUpperCase()}
                        </Text>
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                color: isDark ? "#F1F1F1" : "#111827",
                                fontWeight: "700",
                                fontSize: 15,
                            }}
                            numberOfLines={1}
                        >
                            {card.student_name}
                        </Text>
                        {card.admission_number && (
                            <Text
                                style={{
                                    color: accentColor,
                                    fontSize: 10,
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    letterSpacing: 0.8,
                                    marginTop: 2,
                                }}
                            >
                                ADM: {card.admission_number}
                            </Text>
                        )}
                        <Text
                            style={{
                                color: isDark ? "#6B7280" : "#9CA3AF",
                                fontSize: 11,
                                marginTop: 2,
                            }}
                            numberOfLines={1}
                        >
                            {card.class_name}
                            {card.term_name ? ` \u2022 ${card.term_name}` : ""}
                        </Text>
                    </View>

                    {/* Stats */}
                    <View style={{ alignItems: "flex-end", marginRight: 8 }}>
                        <Text
                            style={{
                                color: isDark ? "#F1F1F1" : "#111827",
                                fontWeight: "800",
                                fontSize: 18,
                            }}
                        >
                            {formatNumber(card.overall_average)}
                        </Text>
                        {card.gpa !== null && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Text
                                    style={{
                                        color: isDark ? "#9CA3AF" : "#6B7280",
                                        fontSize: 11,
                                        fontWeight: "600",
                                    }}
                                >
                                    GPA: {card.gpa.toFixed(2)}
                                </Text>
                                {(() => {
                                    const avgPct = card.overall_average ?? 0;
                                    const perf = getPerformanceLabel(avgPct, gradingScales);
                                    return (
                                        <View
                                            style={{
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
                                                {perf.label}
                                            </Text>
                                        </View>
                                    );
                                })()}
                            </View>
                        )}
                    </View>

                    {/* Status & chevron */}
                    <View style={{ alignItems: "flex-end" }}>
                        <StatusPill status={card.status} isDark={isDark} />
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                            {card.class_rank !== null && card.total_students !== null && (
                                <View
                                    style={{
                                        backgroundColor: isDark
                                            ? "rgba(255,255,255,0.06)"
                                            : "rgba(0,0,0,0.04)",
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 10,
                                        marginRight: 6,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: isDark ? "#9CA3AF" : "#6B7280",
                                            fontSize: 9,
                                            fontWeight: "700",
                                        }}
                                    >
                                        #{card.class_rank}/{card.total_students}
                                    </Text>
                                </View>
                            )}
                            <ChevronRight
                                size={14}
                                color={isDark ? "#4B5563" : "#D1D5DB"}
                                style={{
                                    transform: [{ rotate: expanded ? "90deg" : "0deg" }],
                                }}
                            />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Expanded details */}
            {expanded && (
                <View
                    style={{
                        paddingHorizontal: 16,
                        paddingBottom: 16,
                        borderTopWidth: 1,
                        borderTopColor: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6",
                    }}
                >
                    {/* Subject breakdown */}
                    {card.subject_breakdown && card.subject_breakdown.length > 0 && (
                        <View style={{ marginTop: 14, marginBottom: 14 }}>
                            <Text
                                style={{
                                    color: isDark ? "#9CA3AF" : "#6B7280",
                                    fontSize: 10,
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                    marginBottom: 8,
                                }}
                            >
                                Subject Breakdown
                            </Text>
                            {card.subject_breakdown.map((sb, idx) => (
                                <View
                                    key={idx}
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        paddingVertical: 8,
                                        borderBottomWidth:
                                            idx < (card.subject_breakdown?.length ?? 0) - 1 ? 1 : 0,
                                        borderBottomColor: isDark
                                            ? "rgba(255,255,255,0.04)"
                                            : "#F3F4F6",
                                    }}
                                >
                                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                                        <BookOpen
                                            size={13}
                                            color={isDark ? "#6B7280" : "#9CA3AF"}
                                        />
                                        <Text
                                            style={{
                                                color: isDark ? "#E5E5E5" : "#374151",
                                                fontWeight: "600",
                                                fontSize: 13,
                                                marginLeft: 8,
                                            }}
                                        >
                                            {sb.subject_name}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                                        <Text
                                            style={{
                                                color: isDark ? "#F1F1F1" : "#111827",
                                                fontWeight: "700",
                                                fontSize: 14,
                                            }}
                                        >
                                            {sb.score !== null ? sb.score.toFixed(1) : "--"}
                                        </Text>
                                        <Text
                                            style={{
                                                color: isDark ? "#6B7280" : "#9CA3AF",
                                                fontSize: 11,
                                                fontWeight: "600",
                                                marginLeft: 2,
                                            }}
                                        >
                                            /{sb.max_score}
                                        </Text>
                                        {sb.grade && (() => {
                                            const sbPct = sb.max_score > 0 && sb.score !== null
                                                ? (sb.score / sb.max_score) * 100
                                                : 0;
                                            const sbPerf = getPerformanceLabel(sbPct, gradingScales);
                                            return (
                                                <View
                                                    style={{
                                                        backgroundColor: isDark
                                                            ? "rgba(255,107,0,0.12)"
                                                            : "#FFF7ED",
                                                        paddingHorizontal: 7,
                                                        paddingVertical: 2,
                                                        borderRadius: 8,
                                                        marginLeft: 8,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: accentColor,
                                                            fontSize: 10,
                                                            fontWeight: "800",
                                                        }}
                                                    >
                                                        {sb.grade}
                                                    </Text>
                                                </View>
                                            );
                                        })()}
                                        {sb.score !== null && sb.max_score > 0 && (() => {
                                            const sbPct = (sb.score / sb.max_score) * 100;
                                            const sbPerf = getPerformanceLabel(sbPct, gradingScales);
                                            return (
                                                <View
                                                    style={{
                                                        backgroundColor: isDark
                                                            ? "rgba(255,255,255,0.06)"
                                                            : "rgba(0,0,0,0.04)",
                                                        paddingHorizontal: 6,
                                                        paddingVertical: 2,
                                                        borderRadius: 6,
                                                        marginLeft: 6,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: isDark ? "#9CA3AF" : "#6B7280",
                                                            fontSize: 9,
                                                            fontWeight: "700",
                                                        }}
                                                    >
                                                        {sbPerf.label}
                                                    </Text>
                                                </View>
                                            );
                                        })()}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Teacher remarks (read-only) */}
                    {card.teacher_remarks ? (
                        <View
                            style={{
                                backgroundColor: isDark
                                    ? "rgba(255,255,255,0.04)"
                                    : "rgba(0,0,0,0.02)",
                                borderRadius: 16,
                                padding: 14,
                            }}
                        >
                            <Text
                                style={{
                                    color: isDark ? "#9CA3AF" : "#6B7280",
                                    fontSize: 10,
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                    marginBottom: 6,
                                }}
                            >
                                Teacher Remarks
                            </Text>
                            <Text
                                style={{
                                    color: isDark ? "#D1D5DB" : "#4B5563",
                                    fontSize: 13,
                                    lineHeight: 20,
                                }}
                            >
                                {card.teacher_remarks}
                            </Text>
                        </View>
                    ) : (
                        <View
                            style={{
                                backgroundColor: isDark
                                    ? "rgba(255,255,255,0.04)"
                                    : "rgba(0,0,0,0.02)",
                                borderRadius: 16,
                                padding: 14,
                            }}
                        >
                            <Text
                                style={{
                                    color: isDark ? "#6B7280" : "#9CA3AF",
                                    fontSize: 12,
                                    fontStyle: "italic",
                                }}
                            >
                                No teacher remarks yet.
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ReportCardsPage() {
    const { teacherId } = useAuth();
    const { isDark } = useTheme();
    const accentColor = "#FF6B00";

    // Data
    const [subjectClasses, setSubjectClasses] = useState<TeacherSubjectClass[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [reportCards, setReportCards] = useState<ReportCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [gradingScales, setGradingScales] = useState<GradingScaleRow[]>([]);

    // Filters
    const [selectedSubjectId, setSelectedSubjectId] = useState("all");
    const [selectedClassId, setSelectedClassId] = useState("all");
    const [selectedTermId, setSelectedTermId] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
    const [resolvedActiveTerm, setResolvedActiveTerm] = useState<Term | null>(null);

    // UI
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    // Derived filter options
    const uniqueSubjects = React.useMemo(() => {
        const map = new Map<string, { id: string; title: string }>();
        subjectClasses.forEach((sc) => {
            if (!map.has(sc.subject_id)) {
                map.set(sc.subject_id, { id: sc.subject_id, title: sc.subject_title });
            }
        });
        return Array.from(map.values());
    }, [subjectClasses]);

    const availableClasses = React.useMemo(() => {
        if (selectedSubjectId === "all") {
            const map = new Map<string, { id: string; name: string }>();
            subjectClasses.forEach((sc) => {
                if (!map.has(sc.class_id)) {
                    map.set(sc.class_id, { id: sc.class_id, name: sc.class_name });
                }
            });
            return Array.from(map.values());
        }
        return subjectClasses
            .filter((sc) => sc.subject_id === selectedSubjectId)
            .map((sc) => ({ id: sc.class_id, name: sc.class_name }));
    }, [subjectClasses, selectedSubjectId]);

    // ---------------------------------------------------------------------------
    // Fetching
    // ---------------------------------------------------------------------------

    const fetchSubjectClasses = useCallback(async () => {
        try {
            const res = await api.get("/teacher/subject-classes");
            const data = res.data?.data ?? res.data;
            setSubjectClasses(Array.isArray(data) ? data : []);
        } catch {
            setSubjectClasses([]);
        }
    }, []);

    const fetchTerms = useCallback(async () => {
        try {
            const termsData = await GradingAPI.getTerms();
            setTerms(Array.isArray(termsData) ? termsData : []);
            const activeTermData = await GradingAPI.getActiveTerm().catch(() => null);
            const active = activeTermData?.active_term || null;
            setResolvedActiveTerm(active);
        } catch {
            setTerms([]);
            setResolvedActiveTerm(null);
        }
    }, []);

    const fetchGradingScales = useCallback(async () => {
        try {
            const scales = await GradingAPI.getGradingScales().catch(() => []);
            setGradingScales(Array.isArray(scales) ? scales : []);
        } catch {
            setGradingScales([]);
        }
    }, []);

    const fetchReportCards = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (selectedSubjectId !== "all") params.subject_id = selectedSubjectId;
            if (selectedClassId !== "all") params.class_id = selectedClassId;
            if (selectedTermId !== "all") params.term_id = selectedTermId;
            if (selectedStatus !== "all") params.status = selectedStatus;

            const data = await GradingAPI.getReportCards(params);
            const safe = Array.isArray(data) ? data.filter((rc: any) => rc && rc.id && rc.student_id) : [];
            setReportCards(safe);
        } catch (error: any) {
            console.error("Error fetching report cards:", error);
            showError("Error", "Failed to load report cards");
            setReportCards([]);
        } finally {
            setLoading(false);
        }
    }, [selectedSubjectId, selectedClassId, selectedTermId, selectedStatus]);

    useEffect(() => {
        if (teacherId) {
            Promise.all([fetchSubjectClasses(), fetchTerms(), fetchGradingScales()]);
        }
    }, [teacherId, fetchSubjectClasses, fetchTerms, fetchGradingScales]);

    // Auto-select active term once after terms are loaded
    useEffect(() => {
        if (resolvedActiveTerm && selectedTermId === "all" && terms.length > 0) {
            setSelectedTermId(resolvedActiveTerm.id);
        }
    }, [resolvedActiveTerm, terms.length]);

    useEffect(() => {
        if (teacherId) {
            fetchReportCards();
        }
    }, [teacherId, fetchReportCards]);

    // Reset class filter when subject changes
    useEffect(() => {
        if (selectedSubjectId !== "all") {
            const classesForSubject = subjectClasses.filter(
                (sc) => sc.subject_id === selectedSubjectId
            );
            if (
                classesForSubject.length > 0 &&
                !classesForSubject.some((c) => c.class_id === selectedClassId)
            ) {
                setSelectedClassId("all");
            }
        }
    }, [selectedSubjectId, subjectClasses, selectedClassId]);

    // ---------------------------------------------------------------------------
    // Filtered list
    // ---------------------------------------------------------------------------

    const filteredCards = React.useMemo(() => {
        if (!searchQuery.trim()) return reportCards;
        const q = searchQuery.toLowerCase();
        return reportCards.filter(
            (c) =>
                c.student_name.toLowerCase().includes(q) ||
                (c.admission_number && c.admission_number.toLowerCase().includes(q)) ||
                c.class_name.toLowerCase().includes(q)
        );
    }, [reportCards, searchQuery]);

    // ---------------------------------------------------------------------------
    // Status chips
    // ---------------------------------------------------------------------------

    const statusFilters: { key: StatusFilter; label: string }[] = [
        { key: "all", label: "All" },
        { key: "draft", label: "Draft" },
        { key: "pending_review", label: "Pending" },
        { key: "published", label: "Published" },
        { key: "released", label: "Released" },
    ];

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? "#161B22" : "#f9fafb" }}>
            <UnifiedHeader
                title="Report Cards"
                subtitle="Management"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16 }}>
                    {/* ------------------------------------------------------- */}
                    {/* Filters                                                  */}
                    {/* ------------------------------------------------------- */}
                    <View
                        style={{
                            backgroundColor: isDark ? "#161B22" : "#ffffff",
                            borderRadius: 24,
                            borderWidth: 1,
                            borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                            padding: 16,
                            marginBottom: 16,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 14,
                            }}
                        >
                            <View
                                style={{
                                    backgroundColor: isDark
                                        ? "rgba(255,107,0,0.12)"
                                        : "#FFF7ED",
                                    padding: 8,
                                    borderRadius: 12,
                                    marginRight: 10,
                                }}
                            >
                                <Filter size={16} color={accentColor} />
                            </View>
                            <Text
                                style={{
                                    color: isDark ? "#F1F1F1" : "#111827",
                                    fontWeight: "700",
                                    fontSize: 15,
                                }}
                            >
                                Filters
                            </Text>
                        </View>

                        <Dropdown
                            label="Subject"
                            items={[
                                { id: "all", label: "All Subjects" },
                                ...uniqueSubjects.map((s) => ({ id: s.id, label: s.title })),
                            ]}
                            selectedId={selectedSubjectId}
                            selectedLabel={
                                selectedSubjectId === "all"
                                    ? "All Subjects"
                                    : uniqueSubjects.find((s) => s.id === selectedSubjectId)
                                          ?.title ?? "All Subjects"
                            }
                            onSelect={(id) => {
                                setSelectedSubjectId(id);
                                setSelectedClassId("all");
                            }}
                            isDark={isDark}
                            accentColor={accentColor}
                        />

                        <Dropdown
                            label="Class"
                            items={[
                                { id: "all", label: "All Classes" },
                                ...availableClasses.map((c) => ({ id: c.id, label: c.name })),
                            ]}
                            selectedId={selectedClassId}
                            selectedLabel={
                                selectedClassId === "all"
                                    ? "All Classes"
                                    : availableClasses.find((c) => c.id === selectedClassId)
                                          ?.name ?? "All Classes"
                            }
                            onSelect={setSelectedClassId}
                            isDark={isDark}
                            accentColor={accentColor}
                        />

                        <Dropdown
                            label="Term"
                            items={[
                                { id: "all", label: "All Terms" },
                                ...terms.map((t) => ({
                                    id: t.id,
                                    label: t.name + (t.is_current ? " (Current)" : ""),
                                })),
                            ]}
                            selectedId={selectedTermId}
                            selectedLabel={
                                selectedTermId === "all"
                                    ? "All Terms"
                                    : terms.find((t) => t.id === selectedTermId)?.name ??
                                      "All Terms"
                            }
                            onSelect={setSelectedTermId}
                            isDark={isDark}
                            accentColor={accentColor}
                        />

                        {/* Status filter chips */}
                        <Text
                            style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: isDark ? "#9CA3AF" : "#6B7280",
                                textTransform: "uppercase",
                                letterSpacing: 1.2,
                                marginBottom: 8,
                                marginLeft: 4,
                            }}
                        >
                            Status
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: 4 }}
                        >
                            {statusFilters.map((sf) => (
                                <TouchableOpacity
                                    key={sf.key}
                                    onPress={() => setSelectedStatus(sf.key)}
                                    style={{
                                        backgroundColor:
                                            selectedStatus === sf.key
                                                ? accentColor
                                                : isDark
                                                ? "#1A1650"
                                                : "#F9FAFB",
                                        borderRadius: 20,
                                        borderWidth: 1,
                                        borderColor:
                                            selectedStatus === sf.key
                                                ? accentColor
                                                : isDark
                                                ? "rgba(255,255,255,0.08)"
                                                : "#F3F4F6",
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        marginRight: 8,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color:
                                                selectedStatus === sf.key
                                                    ? "#ffffff"
                                                    : isDark
                                                    ? "#9CA3AF"
                                                    : "#6B7280",
                                            fontWeight: "700",
                                            fontSize: 12,
                                        }}
                                    >
                                        {sf.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                        {/* No Active Term Banner */}
                        {!resolvedActiveTerm && !loading && terms.length > 0 && (
                        <View style={{
                            backgroundColor: isDark ? '#2D1F00' : '#FFFBEB',
                            borderRadius: 14, padding: 14, marginBottom: 16,
                            borderWidth: 1, borderColor: isDark ? '#92400E' : '#FCD34D',
                            flexDirection: 'row', alignItems: 'center', gap: 10,
                        }}>
                            <AlertCircle size={18} color="#D97706" />
                            <Text style={{ color: isDark ? '#FCD34D' : '#92400E', fontSize: 13, flex: 1 }}>
                                No active term for today. Select a term to view report cards.
                            </Text>
                        </View>
                    )}

                    {/* ------------------------------------------------------- */}
                    {/* Summary Stats                                            */}
                    {/* ------------------------------------------------------- */}
                    <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                        <View
                            style={{
                                flex: 1,
                                backgroundColor: isDark ? "#161B22" : "#ffffff",
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                                padding: 14,
                            }}
                        >
                            <Text
                                style={{
                                    color: isDark ? "#6B7280" : "#9CA3AF",
                                    fontSize: 10,
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                }}
                            >
                                Total
                            </Text>
                            <Text
                                style={{
                                    color: isDark ? "#F1F1F1" : "#111827",
                                    fontWeight: "800",
                                    fontSize: 22,
                                    marginTop: 4,
                                }}
                            >
                                {filteredCards.length}
                            </Text>
                        </View>
                        <View
                            style={{
                                flex: 1,
                                backgroundColor: isDark ? "#161B22" : "#ffffff",
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                                padding: 14,
                            }}
                        >
                            <Text
                                style={{
                                    color: isDark ? "#6B7280" : "#9CA3AF",
                                    fontSize: 10,
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                }}
                            >
                                Published
                            </Text>
                            <Text
                                style={{
                                    color: "#3B82F6",
                                    fontWeight: "800",
                                    fontSize: 22,
                                    marginTop: 4,
                                }}
                            >
                                {filteredCards.filter((c) => c.status === "published").length}
                            </Text>
                        </View>
                        <View
                            style={{
                                flex: 1,
                                backgroundColor: isDark ? "#161B22" : "#ffffff",
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                                padding: 14,
                            }}
                        >
                            <Text
                                style={{
                                    color: isDark ? "#6B7280" : "#9CA3AF",
                                    fontSize: 10,
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    letterSpacing: 1,
                                }}
                            >
                                Released
                            </Text>
                            <Text
                                style={{
                                    color: "#22C55E",
                                    fontWeight: "800",
                                    fontSize: 22,
                                    marginTop: 4,
                                }}
                            >
                                {filteredCards.filter((c) => c.status === "released").length}
                            </Text>
                        </View>
                    </View>

                    {/* ------------------------------------------------------- */}
                    {/* Search                                                   */}
                    {/* ------------------------------------------------------- */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: isDark ? "#161B22" : "#ffffff",
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            marginBottom: 16,
                        }}
                    >
                        <Search size={16} color={isDark ? "#6B7280" : "#9CA3AF"} />
                        <TextInput
                            style={{
                                flex: 1,
                                marginLeft: 10,
                                color: isDark ? "#E5E5E5" : "#111827",
                                fontWeight: "500",
                                fontSize: 14,
                            }}
                            placeholder="Search by name, admission #, or class..."
                            placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <Text
                                    style={{
                                        color: accentColor,
                                        fontWeight: "700",
                                        fontSize: 12,
                                    }}
                                >
                                    Clear
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Locked Term Notice */}
                        {selectedTermId !== "all" && terms.find((t) => t.id === selectedTermId)?.locked_at ? (
                            <View style={{
                                backgroundColor: isDark ? '#3A1010' : '#FEF2F2',
                                borderRadius: 14, padding: 14, marginBottom: 16,
                                borderWidth: 1, borderColor: isDark ? '#991B1B' : '#FCA5A5',
                                flexDirection: 'row', alignItems: 'center', gap: 10,
                            }}>
                                <AlertCircle size={18} color="#DC2626" />
                                <Text style={{ color: isDark ? '#FCA5A5' : '#991B1B', fontSize: 13, flex: 1 }}>
                                    Selected term is locked. Report cards are view-only for this term.
                                </Text>
                            </View>
                        ) : null}
                    </View>

                    {/* ------------------------------------------------------- */}
                    {/* Report Card List                                         */}
                    {/* ------------------------------------------------------- */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 14,
                        }}
                    >
                        <Award size={18} color={accentColor} />
                        <Text
                            style={{
                                color: isDark ? "#F1F1F1" : "#111827",
                                fontWeight: "700",
                                fontSize: 17,
                                marginLeft: 8,
                            }}
                        >
                            Report Cards
                        </Text>
                        <Text
                            style={{
                                color: isDark ? "#6B7280" : "#9CA3AF",
                                fontSize: 12,
                                fontWeight: "600",
                                marginLeft: 8,
                            }}
                        >
                            ({filteredCards.length})
                        </Text>
                    </View>

                    {loading ? (
                        <View style={{ alignItems: "center", marginTop: 48 }}>
                            <ActivityIndicator size="large" color={accentColor} />
                            <Text
                                style={{
                                    color: isDark ? "#6B7280" : "#9CA3AF",
                                    fontSize: 13,
                                    marginTop: 12,
                                    fontWeight: "500",
                                }}
                            >
                                Loading report cards...
                            </Text>
                        </View>
                    ) : filteredCards.length === 0 ? (
                        <View
                            style={{
                                backgroundColor: isDark ? "#161B22" : "#ffffff",
                                borderRadius: 24,
                                borderWidth: 1,
                                borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                                borderStyle: "dashed",
                                padding: 48,
                                alignItems: "center",
                            }}
                        >
                            <View
                                style={{
                                    backgroundColor: isDark
                                        ? "rgba(255,107,0,0.12)"
                                        : "#FFF7ED",
                                    width: 56,
                                    height: 56,
                                    borderRadius: 20,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginBottom: 16,
                                }}
                            >
                                <FileText size={24} color={accentColor} />
                            </View>
                            <Text
                                style={{
                                    color: isDark ? "#E5E5E5" : "#111827",
                                    fontWeight: "700",
                                    fontSize: 16,
                                    marginBottom: 6,
                                }}
                            >
                                No report cards found
                            </Text>
                            <Text
                                style={{
                                    color: isDark ? "#6B7280" : "#9CA3AF",
                                    fontSize: 13,
                                    textAlign: "center",
                                    lineHeight: 20,
                                }}
                            >
                                No report cards match the selected filters.{"\n"}Try
                                adjusting the subject, class, term, or status.
                            </Text>
                        </View>
                    ) : (
                        filteredCards.map((card) => (
                            <ReportCardRow
                                key={card.id}
                                card={card}
                                isDark={isDark}
                                accentColor={accentColor}
                                expanded={expandedCardId === card.id}
                                onToggle={() =>
                                    setExpandedCardId((prev) =>
                                        prev === card.id ? null : card.id
                                    )
                                }
                                gradingScales={gradingScales}
                            />
                        ))
                    )}

                    {/* Read-only notice */}
                    {!loading && filteredCards.length > 0 && (
                        <View
                            style={{
                                backgroundColor: isDark
                                    ? "rgba(255,107,0,0.08)"
                                    : "rgba(255,107,0,0.05)",
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: isDark
                                    ? "rgba(255,107,0,0.15)"
                                    : "rgba(255,107,0,0.12)",
                                padding: 14,
                                marginTop: 8,
                                flexDirection: "row",
                                alignItems: "center",
                            }}
                        >
                            <TrendingUp size={16} color={accentColor} />
                            <Text
                                style={{
                                    color: isDark ? "#D1D5DB" : "#4B5563",
                                    fontSize: 12,
                                    marginLeft: 10,
                                    flex: 1,
                                    lineHeight: 18,
                                }}
                            >
                                You have read-only access to report cards.{"\n"}
                                Generate, publish, and release actions are managed by
                                administrators.
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
