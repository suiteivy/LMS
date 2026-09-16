import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/services/api";
import { GradingAPI } from "@/services/GradingService";
import { ClassAPI } from "@/services/ClassService";
import { formatClassLabel } from "@/utils/classLabel";
import { showError, showFetchError, showSuccess } from "@/utils/toast";
import { getPerformanceLabel, type GradingScaleRow } from "@/utils/getPerformanceLabel";
import { useTeacherRoleMode } from "@/hooks/useTeacherRoleMode";
import { usePrint } from "@/hooks/usePrint";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { router } from "expo-router";
import {
    AlertCircle,
    Award,
    BookOpen,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Download,
    Edit3,
    ExternalLink,
    FileText,
    Filter,
    History,
    Layers,
    Lock,
    RefreshCw,
    Search,
    Shield,
    Sparkles,
    TrendingUp,
    User,
} from "lucide-react-native";
import { StudentHistoryModal } from "@/components/results/StudentHistoryModal";
import React, { useCallback, useEffect, useState } from "react";
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
    academic_year_id?: string;
    is_current?: boolean;
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
type TabMode = "class_cards" | "assessment_selection";

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
    n !== null && !isNaN(n) ? n.toFixed(1) : fallback;

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
    disabled = false,
    emptyMessage,
}: {
    label: string;
    items: { id: string; label: string }[];
    selectedId: string;
    selectedLabel: string;
    onSelect: (id: string) => void;
    isDark: boolean;
    accentColor: string;
    disabled?: boolean;
    emptyMessage?: string;
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
                onPress={() => !disabled && setOpen((o) => !o)}
                disabled={disabled}
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
                    opacity: disabled ? 0.5 : 1,
                }}
                activeOpacity={0.7}
            >
                <Text
                    style={{
                        color: disabled ? (isDark ? "#6B7280" : "#9CA3AF") : (isDark ? "#E5E5E5" : "#111827"),
                        fontWeight: "600",
                        fontSize: 14,
                        flex: 1,
                    }}
                    numberOfLines={1}
                >
                    {items.length === 0 && emptyMessage ? emptyMessage : selectedLabel}
                </Text>
                {!disabled && (
                    <ChevronDown
                        size={16}
                        color={isDark ? "#9CA3AF" : "#6B7280"}
                        style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
                    />
                )}
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
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
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
    onDownloadPDF,
    isDownloading,
    onEditRemarks,
    onViewStudentRecord,
    onRegenerate,
    isRegenerating,
    onViewHistory,
}: {
    card: ReportCard;
    isDark: boolean;
    accentColor: string;
    expanded: boolean;
    onToggle: () => void;
    gradingScales: GradingScaleRow[];
    onDownloadPDF?: (card: ReportCard) => void;
    isDownloading?: boolean;
    onEditRemarks?: (card: ReportCard) => void;
    onViewStudentRecord?: (studentId: string) => void;
    onRegenerate?: (card: ReportCard) => void;
    isRegenerating?: boolean;
    onViewHistory?: (card: ReportCard) => void;
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
                            {formatNumber(card.overall_average)}%
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
                    {card.subject_breakdown && card.subject_breakdown.length > 0 ? (
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
                                Subject Performance Breakdown
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
                                        {sb.grade && (
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
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={{ color: isDark ? "#6B7280" : "#9CA3AF", fontSize: 12, marginVertical: 12, fontStyle: "italic" }}>
                            No individual subject records compiled yet. Click regenerate to recalculate.
                        </Text>
                    )}

                    {/* Teacher remarks */}
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
                                No teacher remarks recorded yet.
                            </Text>
                        </View>
                    )}

                    {/* Action buttons */}
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                        <TouchableOpacity
                            onPress={() => onDownloadPDF?.(card)}
                            disabled={isDownloading}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: isDark ? "rgba(255,107,0,0.15)" : "#FFF7ED",
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: isDark ? "rgba(255,107,0,0.3)" : "#FED7AA",
                            }}
                        >
                            {isDownloading ? (
                                <ActivityIndicator size="small" color={accentColor} style={{ marginRight: 6 }} />
                            ) : (
                                <Download size={13} color={accentColor} style={{ marginRight: 6 }} />
                            )}
                            <Text style={{ color: accentColor, fontWeight: "700", fontSize: 11 }}>
                                {isDownloading ? "Generating PDF..." : "Download PDF"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => onEditRemarks?.(card)}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: isDark ? "#21262D" : "#F3F4F6",
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 12,
                            }}
                        >
                            <Edit3 size={13} color={isDark ? "#E5E7EB" : "#374151"} style={{ marginRight: 6 }} />
                            <Text style={{ color: isDark ? "#E5E7EB" : "#374151", fontWeight: "700", fontSize: 11 }}>
                                {card.teacher_remarks ? "Edit Remarks" : "Add Remarks"}
                            </Text>
                        </TouchableOpacity>

                        {onRegenerate && (
                            <TouchableOpacity
                                onPress={() => onRegenerate(card)}
                                disabled={isRegenerating}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    backgroundColor: isDark ? "#21262D" : "#F3F4F6",
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 12,
                                }}
                            >
                                {isRegenerating ? (
                                    <ActivityIndicator size="small" color={accentColor} style={{ marginRight: 6 }} />
                                ) : (
                                    <RefreshCw size={13} color={isDark ? "#9CA3AF" : "#6B7280"} style={{ marginRight: 6 }} />
                                )}
                                <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontWeight: "700", fontSize: 11 }}>
                                    Regenerate Card
                                </Text>
                            </TouchableOpacity>
                        )}

                        {onViewHistory && (
                            <TouchableOpacity
                                onPress={() => onViewHistory(card)}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    backgroundColor: isDark ? "#21262D" : "#F3F4F6",
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 12,
                                }}
                            >
                                <History size={13} color="#FF6900" style={{ marginRight: 6 }} />
                                <Text style={{ color: "#FF6900", fontWeight: "700", fontSize: 11 }}>
                                    Past Cards
                                </Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={() => onViewStudentRecord?.(card.student_id)}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: isDark ? "#21262D" : "#F3F4F6",
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 12,
                            }}
                        >
                            <ExternalLink size={13} color={isDark ? "#9CA3AF" : "#6B7280"} style={{ marginRight: 6 }} />
                            <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontWeight: "700", fontSize: 11 }}>
                                Student Record
                            </Text>
                        </TouchableOpacity>
                    </View>
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
    const { mode, isClassTeacher } = useTeacherRoleMode();
    const { printHtml } = usePrint();
    const tier = useSubscriptionTier();
    const accentColor = "#FF6B00";

    // Active tab
    const [activeTab, setActiveTab] = useState<TabMode>("class_cards");

    // Common Data
    const [subjectClasses, setSubjectClasses] = useState<TeacherSubjectClass[]>([]);
    const [designatedClasses, setDesignatedClasses] = useState<{ id: string; name: string }[]>([]);
    const [classesLoading, setClassesLoading] = useState(true);
    const [terms, setTerms] = useState<Term[]>([]);
    const [resolvedActiveTerm, setResolvedActiveTerm] = useState<Term | null>(null);
    const [gradingScales, setGradingScales] = useState<GradingScaleRow[]>([]);

    // Class Report Cards State
    const [reportCards, setReportCards] = useState<ReportCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedTermId, setSelectedTermId] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
    const [downloadingCardId, setDownloadingCardId] = useState<string | null>(null);
    const [regeneratingCardId, setRegeneratingCardId] = useState<string | null>(null);
    const [editingCard, setEditingCard] = useState<ReportCard | null>(null);
    const [remarksInput, setRemarksInput] = useState("");
    const [savingRemarks, setSavingRemarks] = useState(false);
    const [generatingClass, setGeneratingClass] = useState(false);
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

    // Subject Assessment Selection State (Part D)
    const [selectedSubjSubjectId, setSelectedSubjSubjectId] = useState("");
    const [selectedSubjClassId, setSelectedSubjClassId] = useState("");
    const [selectedSubjTermId, setSelectedSubjTermId] = useState("");
    const [subjectAssessments, setSubjectAssessments] = useState<{
        exams: any[];
        assignments: any[];
        weights: { exam_weight: number; continuous_assessment_weight: number };
    } | null>(null);
    const [loadingAssessments, setLoadingAssessments] = useState(false);
    const [savingSelections, setSavingSelections] = useState(false);
    const [toggledSelections, setToggledSelections] = useState<Record<string, boolean>>({});

    // History Modal State
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
    const [historyStudentName, setHistoryStudentName] = useState<string>("");

    // Derived subject options
    const uniqueSubjects = React.useMemo(() => {
        const map = new Map<string, { id: string; title: string }>();
        subjectClasses.forEach((sc) => {
            if (sc && sc.subject_id && !map.has(sc.subject_id)) {
                map.set(sc.subject_id, { id: sc.subject_id, title: sc.subject_title || "Untitled Subject" });
            }
        });
        return Array.from(map.values());
    }, [subjectClasses]);

    // Derived classes for currently selected subject in Assessment Selection
    const classesForSelectedSubject = React.useMemo(() => {
        if (!selectedSubjSubjectId) return [];
        return subjectClasses
            .filter((sc) => sc.subject_id === selectedSubjSubjectId)
            .map((sc) => ({ id: sc.class_id, label: sc.class_name }));
    }, [subjectClasses, selectedSubjSubjectId]);

    // ---------------------------------------------------------------------------
    // Fetching
    // ---------------------------------------------------------------------------

    const fetchDesignatedClasses = useCallback(async () => {
        if (!teacherId) return;
        setClassesLoading(true);
        try {
            const data = await ClassAPI.getClasses({ teacher_id: teacherId } as any);
            const myClasses = (Array.isArray(data) ? data : [])
                .filter((c: any) => c.teacher_id === teacherId)
                .map((c: any) => ({
                    id: c.id,
                    name: c.display_name || formatClassLabel(c) || c.name || "Class",
                }));
            setDesignatedClasses(myClasses);
            if (myClasses.length > 0) {
                setSelectedClassId(myClasses[0].id);
            } else {
                setSelectedClassId("");
            }
        } catch (e) {
            console.error("Error fetching designated classes:", e);
            setDesignatedClasses([]);
            setSelectedClassId("");
        } finally {
            setClassesLoading(false);
        }
    }, [teacherId]);

    const fetchSubjectClasses = useCallback(async () => {
        try {
            const res = await api.get("/teacher/subject-classes");
            const data = res.data?.data ?? res.data;
            const list = Array.isArray(data) ? data : [];
            setSubjectClasses(list);
            if (list.length > 0) {
                setSelectedSubjSubjectId(list[0].subject_id);
                setSelectedSubjClassId(list[0].class_id);
            }
        } catch {
            setSubjectClasses([]);
        }
    }, []);

    const fetchTerms = useCallback(async () => {
        try {
            const termsData = await GradingAPI.getTerms();
            const termList = Array.isArray(termsData) ? termsData : [];
            setTerms(termList);
            const activeTermData = await GradingAPI.getActiveTerm().catch(() => null);
            const active = activeTermData?.active_term || null;
            setResolvedActiveTerm(active);
            if (active?.id) {
                setSelectedTermId(active.id);
                setSelectedSubjTermId(active.id);
            } else if (termList.length > 0) {
                setSelectedTermId(termList[0].id);
                setSelectedSubjTermId(termList[0].id);
            }
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
        if (!selectedClassId || selectedClassId === "all") {
            setReportCards([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const params: Record<string, string> = {
                class_id: selectedClassId,
            };
            if (selectedTermId !== "all") params.term_id = selectedTermId;
            if (selectedStatus !== "all") params.status = selectedStatus;

            const data = await GradingAPI.getReportCards(params);
            const safe = Array.isArray(data) ? data.filter((rc: any) => rc && rc.id && rc.student_id) : [];
            setReportCards(safe);
        } catch (error: any) {
            console.error("Error fetching report cards:", error);
            showFetchError("report cards", error);
            setReportCards([]);
        } finally {
            setLoading(false);
        }
    }, [selectedClassId, selectedTermId, selectedStatus]);

    // Fetch assessments for Subject Teacher Selection
    const fetchSubjectAssessments = useCallback(async () => {
        if (!selectedSubjSubjectId || !selectedSubjClassId) {
            setSubjectAssessments(null);
            return;
        }

        setLoadingAssessments(true);
        try {
            const data = await GradingAPI.getSubjectAssessments({
                subject_id: selectedSubjSubjectId,
                class_id: selectedSubjClassId,
                term_id: selectedSubjTermId || undefined,
            });

            setSubjectAssessments(data);
            const initialMap: Record<string, boolean> = {};
            (data?.assignments || []).forEach((a: any) => {
                initialMap[a.id] = a.is_included !== false;
            });
            setToggledSelections(initialMap);
        } catch (err: any) {
            console.error("Error fetching subject assessments:", err);
            setSubjectAssessments(null);
        } finally {
            setLoadingAssessments(false);
        }
    }, [selectedSubjSubjectId, selectedSubjClassId, selectedSubjTermId]);

    useEffect(() => {
        if (activeTab === "assessment_selection") {
            fetchSubjectAssessments();
        }
    }, [activeTab, fetchSubjectAssessments]);

    // Initial load
    useEffect(() => {
        if (teacherId) {
            Promise.all([
                fetchDesignatedClasses(),
                fetchSubjectClasses(),
                fetchTerms(),
                fetchGradingScales(),
            ]);
        }
    }, [teacherId, fetchDesignatedClasses, fetchSubjectClasses, fetchTerms, fetchGradingScales]);

    // Determine initial tab mode based on role
    useEffect(() => {
        if (!classesLoading) {
            if (!isClassTeacher || designatedClasses.length === 0) {
                setActiveTab("assessment_selection");
            } else {
                setActiveTab("class_cards");
            }
        }
    }, [isClassTeacher, designatedClasses.length, classesLoading]);

    useEffect(() => {
        if (teacherId && activeTab === "class_cards") {
            fetchReportCards();
        }
    }, [teacherId, activeTab, fetchReportCards]);

    // ---------------------------------------------------------------------------
    // Actions
    // ---------------------------------------------------------------------------

    const handleDownloadPDF = async (card: ReportCard) => {
        try {
            setDownloadingCardId(card.id);
            const payload = await GradingAPI.exportReportCardPDF({ report_card_id: card.id });
            const html = payload?.html;
            if (!html) throw new Error("Failed to generate report card preview");
            await printHtml(html);
        } catch (err: any) {
            showError(err?.message || "Failed to generate report card PDF");
        } finally {
            setDownloadingCardId(null);
        }
    };

    const handleRegenerateSingle = (card: ReportCard) => {
        const targetTerm = terms.find((t) => t.id === card.term_id);
        if (targetTerm?.locked_at) {
            showError("Term Locked", "Report cards cannot be regenerated after the term grading deadline has passed.");
            return;
        }

        Alert.alert(
            "Confirm Regeneration",
            `Are you sure you want to recalculate and regenerate the report card for ${card.student_name}? Any unfinalized draft values will be updated with current gradebook scores.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Regenerate",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setRegeneratingCardId(card.id);
                            await GradingAPI.regenerateReportCards({
                                student_id: card.student_id,
                                class_id: card.class_id,
                                term_id: card.term_id,
                            });
                            showSuccess("Report Card Updated", `Recompiled report card for ${card.student_name}.`);
                            await fetchReportCards();
                        } catch (err: any) {
                            showError(err?.message || "Failed to regenerate student report card");
                        } finally {
                            setRegeneratingCardId(null);
                        }
                    },
                },
            ]
        );
    };

    const handleOpenEditRemarks = (card: ReportCard) => {
        setEditingCard(card);
        setRemarksInput(card.teacher_remarks || "");
    };

    const handleSaveRemarks = async () => {
        if (!editingCard) return;
        setSavingRemarks(true);
        try {
            await GradingAPI.updateReportCardRemarks(editingCard.id, { teacher_remarks: remarksInput.trim() });
            setReportCards((prev) =>
                prev.map((c) => (c.id === editingCard.id ? { ...c, teacher_remarks: remarksInput.trim() } : c))
            );
            showSuccess("Remarks Updated", "Teacher remarks have been recorded.");
            setEditingCard(null);
        } catch (err: any) {
            showError(err?.message || "Failed to update remarks");
        } finally {
            setSavingRemarks(false);
        }
    };

    const handleGenerateClassCards = () => {
        if (!selectedClassId || selectedClassId === "all") {
            showError("Select a Class", "Please select a specific designated class to compile report cards.");
            return;
        }
        const effectiveTermId = selectedTermId !== "all" ? selectedTermId : resolvedActiveTerm?.id;
        if (!effectiveTermId) {
            showError("Select a Term", "Please select a term before compiling report cards.");
            return;
        }
        const targetTerm = terms.find((t) => t.id === effectiveTermId);
        if (targetTerm?.locked_at) {
            showError("Term Locked", "Report cards cannot be compiled or regenerated after the term grading deadline has passed.");
            return;
        }

        Alert.alert(
            "Compile Class Report Cards",
            "This will generate draft report cards for all students in your assigned class using current assessment marks. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Compile Cards",
                    onPress: async () => {
                        setGeneratingClass(true);
                        try {
                            await GradingAPI.generateClassReportCards({
                                class_id: selectedClassId,
                                term_id: effectiveTermId,
                            });
                            showSuccess("Report Cards Generated", "Class report cards have been compiled into draft status.");
                            fetchReportCards();
                        } catch (err: any) {
                            showError(err?.message || "Failed to generate class report cards");
                        } finally {
                            setGeneratingClass(false);
                        }
                    },
                },
            ]
        );
    };

    const handleSaveAssessmentSelections = async () => {
        if (!selectedSubjSubjectId || !selectedSubjClassId || !selectedSubjTermId) return;
        setSavingSelections(true);
        try {
            const payload = Object.entries(toggledSelections).map(([assessment_id, is_included]) => ({
                assessment_id,
                type: "assignment",
                is_included,
            }));

            await GradingAPI.updateSubjectAssessmentSelection({
                subject_id: selectedSubjSubjectId,
                class_id: selectedSubjClassId,
                term_id: selectedSubjTermId,
                selections: payload,
            });

            showSuccess("Selections Saved", "Subject assessment compilation preferences have been updated.");
            await fetchSubjectAssessments();
        } catch (err: any) {
            showError(err?.message || "Failed to save assessment selections");
        } finally {
            setSavingSelections(false);
        }
    };

    // Filtered report cards
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

    const statusFilters: { key: StatusFilter; label: string }[] = [
        { key: "all", label: "All" },
        { key: "draft", label: "Draft" },
        { key: "pending_review", label: "Pending" },
        { key: "published", label: "Published" },
        { key: "released", label: "Released" },
    ];

    // Validation checks for action buttons (Rule A1)
    const canGenerateClass = Boolean(
        selectedClassId &&
        selectedClassId !== "all" &&
        (selectedTermId !== "all" || resolvedActiveTerm?.id) &&
        terms.length > 0 &&
        !generatingClass
    );

    const canSaveRemarks = Boolean(
        remarksInput.trim().length > 0 &&
        remarksInput.trim() !== (editingCard?.teacher_remarks || "").trim() &&
        !savingRemarks
    );

    const canSaveAssessmentSelections = Boolean(
        selectedSubjSubjectId &&
        selectedSubjClassId &&
        selectedSubjTermId &&
        !savingSelections
    );

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? "#161B22" : "#f9fafb" }}>
            <UnifiedHeader
                title="Report Cards"
                subtitle="Academic Evaluation"
                role="Teacher"
                fallbackPath="/(teacher)/management"
                rightActions={
                    <HelpTooltip
                        id="teacher.manage.report_cards"
                        role="teacher"
                        tier={tier}
                        onLearnMore={(anchor) =>
                            router.push({
                                pathname: "/(teacher)/accessibility/settings" as any,
                                params: { manual: "1", anchor: anchor || "reports-ops" },
                            } as any)
                        }
                    />
                }
            />

            {/* Mode Switcher Tabs */}
            <View
                style={{
                    flexDirection: "row",
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 4,
                    backgroundColor: isDark ? "#161B22" : "#ffffff",
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
                    gap: 8,
                }}
            >
                {designatedClasses.length > 0 && isClassTeacher && (
                    <TouchableOpacity
                        onPress={() => setActiveTab("class_cards")}
                        style={{
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            borderRadius: 14,
                            backgroundColor: activeTab === "class_cards" ? accentColor : "transparent",
                            borderWidth: activeTab === "class_cards" ? 0 : 1,
                            borderColor: isDark ? "#30363D" : "#E5E7EB",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                        }}
                    >
                        <Award size={15} color={activeTab === "class_cards" ? "#FFFFFF" : isDark ? "#9CA3AF" : "#6B7280"} />
                        <Text
                            style={{
                                color: activeTab === "class_cards" ? "#FFFFFF" : isDark ? "#9CA3AF" : "#6B7280",
                                fontWeight: "700",
                                fontSize: 13,
                            }}
                        >
                            Class Report Cards
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    onPress={() => setActiveTab("assessment_selection")}
                    style={{
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 14,
                        backgroundColor: activeTab === "assessment_selection" ? accentColor : "transparent",
                        borderWidth: activeTab === "assessment_selection" ? 0 : 1,
                        borderColor: isDark ? "#30363D" : "#E5E7EB",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                    }}
                >
                    <Layers size={15} color={activeTab === "assessment_selection" ? "#FFFFFF" : isDark ? "#9CA3AF" : "#6B7280"} />
                    <Text
                        style={{
                            color: activeTab === "assessment_selection" ? "#FFFFFF" : isDark ? "#9CA3AF" : "#6B7280",
                            fontWeight: "700",
                            fontSize: 13,
                        }}
                    >
                        Subject Assessment Contribution
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ padding: 16 }}>
                    {classesLoading ? (
                        <View style={{ paddingVertical: 50, alignItems: "center", justifyContent: "center" }}>
                            <ActivityIndicator size="large" color={accentColor} />
                            <Text style={{ fontSize: 13, color: isDark ? "#9CA3AF" : "#6B7280", marginTop: 12 }}>
                                Resolving institutional scopes...
                            </Text>
                        </View>
                    ) : activeTab === "assessment_selection" ? (
                        /* ========================================================================= */
                        /* PART D: Subject Teacher Assessment Selection View                          */
                        /* ========================================================================= */
                        <View>
                            {/* Selection Controls */}
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
                                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                                    <View
                                        style={{
                                            backgroundColor: isDark ? "rgba(255,107,0,0.12)" : "#FFF7ED",
                                            padding: 8,
                                            borderRadius: 12,
                                            marginRight: 10,
                                        }}
                                    >
                                        <Filter size={16} color={accentColor} />
                                    </View>
                                    <View>
                                        <Text style={{ color: isDark ? "#F1F1F1" : "#111827", fontWeight: "700", fontSize: 15 }}>
                                            Subject Teacher Compilation Scope
                                        </Text>
                                        <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 12 }}>
                                            Select which coursework assessments compile into report cards for your subject.
                                        </Text>
                                    </View>
                                </View>

                                <Dropdown
                                    label="Subject"
                                    items={uniqueSubjects.map((s) => ({ id: s.id, label: s.title }))}
                                    selectedId={selectedSubjSubjectId}
                                    selectedLabel={uniqueSubjects.find((s) => s.id === selectedSubjSubjectId)?.title || "Select Subject"}
                                    onSelect={(id) => {
                                        setSelectedSubjSubjectId(id);
                                        const classes = subjectClasses.filter((sc) => sc.subject_id === id);
                                        if (classes.length > 0) setSelectedSubjClassId(classes[0].class_id);
                                    }}
                                    isDark={isDark}
                                    accentColor={accentColor}
                                    emptyMessage="No subjects assigned"
                                    disabled={uniqueSubjects.length === 0}
                                />

                                <Dropdown
                                    label="Class"
                                    items={classesForSelectedSubject}
                                    selectedId={selectedSubjClassId}
                                    selectedLabel={classesForSelectedSubject.find((c) => c.id === selectedSubjClassId)?.label || "Select Class"}
                                    onSelect={setSelectedSubjClassId}
                                    isDark={isDark}
                                    accentColor={accentColor}
                                    emptyMessage="No classes assigned for this subject"
                                    disabled={classesForSelectedSubject.length === 0}
                                />

                                <Dropdown
                                    label="Term"
                                    items={terms.map((t) => ({ id: t.id, label: t.name + (t.is_current ? " (Current)" : "") }))}
                                    selectedId={selectedSubjTermId}
                                    selectedLabel={terms.find((t) => t.id === selectedSubjTermId)?.name || "Select Term"}
                                    onSelect={setSelectedSubjTermId}
                                    isDark={isDark}
                                    accentColor={accentColor}
                                    emptyMessage="No terms configured in system"
                                    disabled={terms.length === 0}
                                />
                            </View>

                            {/* Weighting Ratio Info Banner */}
                            {subjectAssessments?.weights && (
                                <View
                                    style={{
                                        backgroundColor: isDark ? "rgba(255,107,0,0.08)" : "#FFF7ED",
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: isDark ? "rgba(255,107,0,0.2)" : "#FED7AA",
                                        padding: 14,
                                        marginBottom: 16,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 12,
                                    }}
                                >
                                    <Shield size={20} color={accentColor} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: isDark ? "#FFFFFF" : "#111827", fontWeight: "700", fontSize: 13 }}>
                                            Institution Split: {subjectAssessments.weights.exam_weight}% Exam / {subjectAssessments.weights.continuous_assessment_weight}% Coursework
                                        </Text>
                                        <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 11, marginTop: 2, lineHeight: 16 }}>
                                            Exam results are mandatory and cannot be excluded. Selected continuous assessments will share the {subjectAssessments.weights.continuous_assessment_weight}% coursework allocation.
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {loadingAssessments ? (
                                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                                    <ActivityIndicator size="large" color={accentColor} />
                                    <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 13, marginTop: 8 }}>
                                        Loading subject assessments and exams...
                                    </Text>
                                </View>
                            ) : (
                                <View>
                                    {/* Mandatory Exams Section */}
                                    <View style={{ marginBottom: 20 }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 }}>
                                            <Lock size={16} color={accentColor} />
                                            <Text style={{ color: isDark ? "#FFFFFF" : "#111827", fontWeight: "800", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.8 }}>
                                                Mandatory Academic Examinations
                                            </Text>
                                        </View>

                                        {(subjectAssessments?.exams || []).length > 0 ? (
                                            subjectAssessments!.exams.map((exam) => (
                                                <View
                                                    key={exam.id}
                                                    style={{
                                                        backgroundColor: isDark ? "#161B22" : "#ffffff",
                                                        borderRadius: 18,
                                                        padding: 16,
                                                        borderWidth: 1.5,
                                                        borderColor: isDark ? "#30363D" : "#E5E7EB",
                                                        marginBottom: 10,
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                    }}
                                                >
                                                    <View style={{ flex: 1, marginRight: 12 }}>
                                                        <Text style={{ color: isDark ? "#FFFFFF" : "#111827", fontWeight: "700", fontSize: 14 }}>
                                                            {exam.title}
                                                        </Text>
                                                        <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 12, marginTop: 2 }}>
                                                            Max Mark: {exam.max_score} pts &bull; Exam Results Module
                                                        </Text>
                                                    </View>
                                                    <View
                                                        style={{
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "#DCFCE7",
                                                            paddingHorizontal: 10,
                                                            paddingVertical: 5,
                                                            borderRadius: 12,
                                                            gap: 5,
                                                        }}
                                                    >
                                                        <Lock size={12} color="#16A34A" />
                                                        <Text style={{ color: "#16A34A", fontSize: 11, fontWeight: "700" }}>
                                                            Mandatory (Locked)
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))
                                        ) : (
                                            <View style={{ backgroundColor: isDark ? "#161B22" : "#ffffff", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? "#30363D" : "#E5E7EB" }}>
                                                <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 13, fontStyle: "italic" }}>
                                                    No examinations scheduled for this subject and term. Continuous assessment will represent 100% of the report card score.
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Continuous Assessment Coursework Section */}
                                    <View style={{ marginBottom: 24 }}>
                                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 }}>
                                            <Layers size={16} color={accentColor} />
                                            <Text style={{ color: isDark ? "#FFFFFF" : "#111827", fontWeight: "800", fontSize: 14, textTransform: "uppercase", letterSpacing: 0.8 }}>
                                                Continuous Coursework Assessments
                                            </Text>
                                        </View>

                                        {(subjectAssessments?.assignments || []).length > 0 ? (
                                            subjectAssessments!.assignments.map((assign) => {
                                                const isIncluded = toggledSelections[assign.id] ?? true;
                                                return (
                                                    <TouchableOpacity
                                                        key={assign.id}
                                                        onPress={() => {
                                                            setToggledSelections((prev) => ({
                                                                ...prev,
                                                                [assign.id]: !isIncluded,
                                                            }));
                                                        }}
                                                        activeOpacity={0.7}
                                                        style={{
                                                            backgroundColor: isDark ? "#161B22" : "#ffffff",
                                                            borderRadius: 18,
                                                            padding: 16,
                                                            borderWidth: 1.5,
                                                            borderColor: isIncluded
                                                                ? accentColor
                                                                : isDark
                                                                ? "#30363D"
                                                                : "#E5E7EB",
                                                            marginBottom: 10,
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                        }}
                                                    >
                                                        <View style={{ flex: 1, marginRight: 12 }}>
                                                            <Text style={{ color: isDark ? "#FFFFFF" : "#111827", fontWeight: "700", fontSize: 14 }}>
                                                                {assign.title}
                                                            </Text>
                                                            <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 12, marginTop: 2 }}>
                                                                Points: {assign.max_score} pts {assign.weight ? `\u2022 Weight: ${assign.weight}%` : ""}
                                                            </Text>
                                                        </View>
                                                        <View
                                                            style={{
                                                                width: 24,
                                                                height: 24,
                                                                borderRadius: 8,
                                                                borderWidth: 2,
                                                                borderColor: isIncluded ? accentColor : isDark ? "#6B7280" : "#D1D5DB",
                                                                backgroundColor: isIncluded ? accentColor : "transparent",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                            }}
                                                        >
                                                            {isIncluded && <Check size={14} color="#FFFFFF" />}
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        ) : (
                                            <View style={{ backgroundColor: isDark ? "#161B22" : "#ffffff", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? "#30363D" : "#E5E7EB" }}>
                                                <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 13, fontStyle: "italic" }}>
                                                    No coursework assignments found for this subject and class.
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Save Selection Button (Rule A1) */}
                                    <TouchableOpacity
                                        onPress={handleSaveAssessmentSelections}
                                        disabled={!canSaveAssessmentSelections}
                                        style={{
                                            backgroundColor: canSaveAssessmentSelections ? accentColor : isDark ? "#21262D" : "#E5E7EB",
                                            paddingVertical: 14,
                                            paddingHorizontal: 20,
                                            borderRadius: 16,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 8,
                                        }}
                                    >
                                        {savingSelections ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <CheckCircle2 size={18} color={canSaveAssessmentSelections ? "#FFFFFF" : isDark ? "#6B7280" : "#9CA3AF"} />
                                        )}
                                        <Text
                                            style={{
                                                color: canSaveAssessmentSelections ? "#FFFFFF" : isDark ? "#6B7280" : "#9CA3AF",
                                                fontWeight: "700",
                                                fontSize: 14,
                                            }}
                                        >
                                            {savingSelections ? "Saving Selection..." : "Save Assessment Selection"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ) : (
                        /* ========================================================================= */
                        /* PART C: Class Teacher Report Card Generation & Review View                */
                        /* ========================================================================= */
                        <>
                            {designatedClasses.length === 0 ? (
                                <View
                                    style={{
                                        backgroundColor: isDark ? "#161B22" : "#ffffff",
                                        borderRadius: 24,
                                        borderWidth: 1,
                                        borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                                        padding: 32,
                                        alignItems: "center",
                                        marginTop: 16,
                                    }}
                                >
                                    <Award size={40} color={accentColor} />
                                    <Text style={{ fontSize: 18, fontWeight: "800", color: isDark ? "#FFFFFF" : "#111827", textAlign: "center", marginTop: 12 }}>
                                        No Designated Class Assigned
                                    </Text>
                                    <Text style={{ fontSize: 13, color: isDark ? "#9CA3AF" : "#6B7280", textAlign: "center", lineHeight: 20, marginTop: 8, maxWidth: 360 }}>
                                        You are currently not designated as a Class Teacher for any homeroom class. Use the Subject Assessment Contribution tab to manage evaluations for subjects you teach.
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {/* Class Filters */}
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
                                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                                            <View
                                                style={{
                                                    backgroundColor: isDark ? "rgba(255,107,0,0.12)" : "#FFF7ED",
                                                    padding: 8,
                                                    borderRadius: 12,
                                                    marginRight: 10,
                                                }}
                                            >
                                                <Filter size={16} color={accentColor} />
                                            </View>
                                            <Text style={{ color: isDark ? "#F1F1F1" : "#111827", fontWeight: "700", fontSize: 15 }}>
                                                Class Teacher Filters
                                            </Text>
                                        </View>

                                        <Dropdown
                                            label="Class"
                                            items={designatedClasses.map((c) => ({ id: c.id, label: c.name }))}
                                            selectedId={selectedClassId}
                                            selectedLabel={designatedClasses.find((c) => c.id === selectedClassId)?.name || "Select Designated Class"}
                                            onSelect={setSelectedClassId}
                                            isDark={isDark}
                                            accentColor={accentColor}
                                            emptyMessage="No assigned classes"
                                        />

                                        <Dropdown
                                            label="Term"
                                            items={[
                                                { id: "all", label: "All Terms" },
                                                ...terms.map((t) => ({ id: t.id, label: t.name + (t.is_current ? " (Current)" : "") })),
                                            ]}
                                            selectedId={selectedTermId}
                                            selectedLabel={selectedTermId === "all" ? "All Terms" : terms.find((t) => t.id === selectedTermId)?.name || "Select Term"}
                                            onSelect={setSelectedTermId}
                                            isDark={isDark}
                                            accentColor={accentColor}
                                            emptyMessage="No terms configured in system"
                                            disabled={terms.length === 0}
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
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                                            {statusFilters.map((sf) => (
                                                <TouchableOpacity
                                                    key={sf.key}
                                                    onPress={() => setSelectedStatus(sf.key)}
                                                    style={{
                                                        backgroundColor: selectedStatus === sf.key ? accentColor : isDark ? "#1A1650" : "#F9FAFB",
                                                        borderRadius: 20,
                                                        borderWidth: 1,
                                                        borderColor: selectedStatus === sf.key ? accentColor : isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                                                        paddingHorizontal: 16,
                                                        paddingVertical: 8,
                                                        marginRight: 8,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: selectedStatus === sf.key ? "#ffffff" : isDark ? "#9CA3AF" : "#6B7280",
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

                                    {/* Action Button: Generate / Compile Class Report Cards */}
                                    <View style={{ marginBottom: 16 }}>
                                        <TouchableOpacity
                                            onPress={handleGenerateClassCards}
                                            disabled={!canGenerateClass}
                                            style={{
                                                backgroundColor: canGenerateClass ? accentColor : isDark ? "#21262D" : "#E5E7EB",
                                                paddingVertical: 14,
                                                paddingHorizontal: 16,
                                                borderRadius: 16,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 8,
                                            }}
                                        >
                                            {generatingClass ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <Sparkles size={16} color={canGenerateClass ? "#FFFFFF" : isDark ? "#6B7280" : "#9CA3AF"} />
                                            )}
                                            <Text
                                                style={{
                                                    color: canGenerateClass ? "#FFFFFF" : isDark ? "#6B7280" : "#9CA3AF",
                                                    fontWeight: "700",
                                                    fontSize: 13,
                                                }}
                                            >
                                                {generatingClass
                                                    ? "Compiling Class Report Cards..."
                                                    : !selectedClassId
                                                    ? "Select a Designated Class First"
                                                    : terms.length === 0
                                                    ? "Terms Not Configured in System"
                                                    : "Generate / Compile Class Report Cards"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Search Input */}
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
                                            placeholder="Search by student name or admission #..."
                                            placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />
                                        {searchQuery.length > 0 && (
                                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                                <Text style={{ color: accentColor, fontWeight: "700", fontSize: 12 }}>
                                                    Clear
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Report Cards List */}
                                    {loading ? (
                                        <View style={{ paddingVertical: 30 }}>
                                            <ListItemSkeleton count={3} />
                                        </View>
                                    ) : filteredCards.length === 0 ? (
                                        <View
                                            style={{
                                                backgroundColor: isDark ? "#161B22" : "#ffffff",
                                                borderRadius: 24,
                                                borderWidth: 1,
                                                borderColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6",
                                                padding: 32,
                                                alignItems: "center",
                                            }}
                                        >
                                            <FileText size={32} color={accentColor} />
                                            <Text style={{ color: isDark ? "#E5E5E5" : "#111827", fontWeight: "700", fontSize: 16, marginTop: 10 }}>
                                                No report cards found
                                            </Text>
                                            <Text style={{ color: isDark ? "#6B7280" : "#9CA3AF", fontSize: 13, textAlign: "center", marginTop: 6, maxWidth: 300 }}>
                                                No compiled cards match the current selection. Click "Generate / Compile Class Report Cards" above to compile grades from exams and assessments.
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
                                                onToggle={() => setExpandedCardId((prev) => (prev === card.id ? null : card.id))}
                                                gradingScales={gradingScales}
                                                onDownloadPDF={handleDownloadPDF}
                                                isDownloading={downloadingCardId === card.id}
                                                onEditRemarks={handleOpenEditRemarks}
                                                onRegenerate={handleRegenerateSingle}
                                                isRegenerating={regeneratingCardId === card.id}
                                                onViewStudentRecord={() => router.push("/(teacher)/students" as any)}
                                                onViewHistory={(c) => {
                                                    setHistoryStudentId(c.student_id);
                                                    setHistoryStudentName(c.student_name);
                                                    setHistoryModalVisible(true);
                                                }}
                                            />
                                        ))
                                    )}
                                </>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Remarks Modal */}
            <Modal visible={!!editingCard} transparent animationType="fade" onRequestClose={() => setEditingCard(null)}>
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
                    <View
                        style={{
                            backgroundColor: isDark ? "#161B22" : "#ffffff",
                            borderRadius: 24,
                            padding: 24,
                            width: "100%",
                            maxWidth: 480,
                            borderWidth: 1,
                            borderColor: isDark ? "#30363D" : "#E5E7EB",
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: "800", color: isDark ? "#FFFFFF" : "#111827", marginBottom: 4 }}>
                            Edit Teacher Remarks
                        </Text>
                        <Text style={{ fontSize: 13, color: isDark ? "#9CA3AF" : "#6B7280", marginBottom: 16 }}>
                            {editingCard?.student_name}
                        </Text>
                        <TextInput
                            multiline
                            numberOfLines={4}
                            value={remarksInput}
                            onChangeText={setRemarksInput}
                            placeholder="Enter learner development remarks and evaluations..."
                            placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                            style={{
                                backgroundColor: isDark ? "#0D1117" : "#F9FAFB",
                                color: isDark ? "#FFFFFF" : "#111827",
                                borderWidth: 1,
                                borderColor: isDark ? "#30363D" : "#D1D5DB",
                                borderRadius: 16,
                                padding: 14,
                                height: 120,
                                textAlignVertical: "top",
                                fontSize: 14,
                                marginBottom: 16,
                            }}
                        />
                        <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10 }}>
                            <TouchableOpacity
                                onPress={() => setEditingCard(null)}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    backgroundColor: isDark ? "#21262D" : "#E5E7EB",
                                }}
                            >
                                <Text style={{ color: isDark ? "#E5E7EB" : "#374151", fontWeight: "700" }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveRemarks}
                                disabled={!canSaveRemarks}
                                style={{
                                    paddingHorizontal: 18,
                                    paddingVertical: 10,
                                    borderRadius: 12,
                                    backgroundColor: canSaveRemarks ? accentColor : isDark ? "#21262D" : "#D1D5DB",
                                    flexDirection: "row",
                                    alignItems: "center",
                                }}
                            >
                                {savingRemarks && <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />}
                                <Text style={{ color: canSaveRemarks ? "#FFFFFF" : isDark ? "#6B7280" : "#9CA3AF", fontWeight: "700" }}>
                                    {savingRemarks ? "Saving..." : "Save Remarks"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Student History Modal */}
            <StudentHistoryModal
                visible={historyModalVisible}
                onClose={() => setHistoryModalVisible(false)}
                studentId={historyStudentId}
                studentName={historyStudentName}
            />
        </View>
    );
}
