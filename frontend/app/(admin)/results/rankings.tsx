import { ActionTooltip } from "@/components/common/ActionTooltip";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/services/api";
import { resolveAvatarUri } from "@/utils/avatar";
import { router } from "expo-router";
import {
    ArrowUpDown,
    Award,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Filter,
    Medal,
    RefreshCw,
    Search,
    TrendingUp,
    Trophy,
    UserCircle,
    Users,
    X
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import Toast from "react-native-toast-message";

interface StudentRank {
    rank: number;
    student_id: string;
    full_name: string;
    admission_number?: string;
    email: string;
    avatar_url: string | null;
    grade_level: string | null;
    class_id?: string | null;
    graded_tasks: number;
    average_score: number;
    cbc_band?: string;
    cbc_label?: string;
    grade?: string;
    grade_label?: string;
}

interface RankingsResponse {
    scope_mode: string;
    total_students: number;
    cbc_distribution?: Record<string, number>;
    grade_distribution?: Record<string, number>;
    grading_scale?: any[];
    rankings: StudentRank[];
}

export default function AdminStudentRankingsScreen() {
    const { isDark } = useTheme();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [data, setData] = useState<RankingsResponse | null>(null);

    // Filters
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("all");
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
    const [selectedBand, setSelectedBand] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [evaluationWindow, setEvaluationWindow] = useState<'term' | 'cumulative'>('term');

    const bg = isDark ? "#0D1117" : "#F6F8FA";
    const card = isDark ? "#161B22" : "#FFFFFF";
    const border = isDark ? "#21262D" : "#D0D7DE";
    const textPrimary = isDark ? "#F9FAFB" : "#111827";
    const textSecondary = isDark ? "#9CA3AF" : "#6B7280";
    const orange = "#FF6900";

    // Load filter options (classes, subjects)
    useEffect(() => {
        const loadFilterOptions = async () => {
            try {
                const [classesRes, subjectsRes] = await Promise.all([
                    api.get('/classes').catch(() => ({ data: [] })),
                    api.get('/subjects').catch(() => ({ data: [] }))
                ]);
                setClasses(Array.isArray(classesRes.data) ? classesRes.data : (classesRes.data?.data || []));
                setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : (subjectsRes.data?.data || []));
            } catch (err) {
                console.error("Failed to load filter options:", err);
            }
        };
        loadFilterOptions();
    }, []);

    // Fetch rankings
    const fetchRankings = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (selectedClassId && selectedClassId !== 'all') params.class_id = selectedClassId;
            if (selectedSubjectId && selectedSubjectId !== 'all') params.subject_id = selectedSubjectId;

            const res = await api.get("/teacher/rankings", { params });
            if (res.data) {
                setData(res.data);
            }
        } catch (err: any) {
            console.error("Failed to load rankings:", err);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load student rankings' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedClassId, selectedSubjectId]);

    useEffect(() => {
        fetchRankings();
    }, [fetchRankings]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRankings();
    };

    // Derived distribution items
    const distributionItems = useMemo(() => {
        const dist = data?.grade_distribution || data?.cbc_distribution || {};
        if (data?.grading_scale && Array.isArray(data.grading_scale) && data.grading_scale.length > 0) {
            return data.grading_scale.map((d: any) => ({
                key: d.letter_grade || d.name,
                label: d.letter_grade || d.name,
                description: d.description || d.name,
                count: dist[d.letter_grade || d.name] || 0,
            }));
        }
        const distKeys = Object.keys(dist);
        if (distKeys.length > 0) {
            return distKeys.map((k) => ({
                key: k,
                label: k,
                description: k,
                count: dist[k] || 0,
            }));
        }
        return [];
    }, [data]);

    // Filtered rankings
    const filteredRankings = useMemo(() => {
        if (!data?.rankings) return [];
        return data.rankings.filter((st) => {
            if (selectedBand) {
                const b = st.cbc_band || st.grade;
                if (b !== selectedBand) return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesName = st.full_name.toLowerCase().includes(q);
                const matchesAdm = st.admission_number?.toLowerCase().includes(q);
                if (!matchesName && !matchesAdm) return false;
            }
            return true;
        });
    }, [data?.rankings, selectedBand, searchQuery]);

    // Top 3 Podium Students
    const topThree = useMemo(() => {
        if (!data?.rankings) return [];
        return data.rankings.slice(0, 3);
    }, [data?.rankings]);

    // Mean score
    const cohortMean = useMemo(() => {
        if (!data?.rankings || data.rankings.length === 0) return 0;
        const total = data.rankings.reduce((sum, s) => sum + s.average_score, 0);
        return Math.round(total / data.rankings.length);
    }, [data?.rankings]);

    const getRankColor = (rank: number) => {
        switch (rank) {
            case 1:
                return "#F59E0B"; // Gold
            case 2:
                return "#94A3B8"; // Silver
            case 3:
                return "#B45309"; // Bronze
            default:
                return textSecondary;
        }
    };

    const getBandColor = (band?: string) => {
        switch (band) {
            case "EE":
            case "A":
                return "#10B981";
            case "ME":
            case "B":
                return "#3B82F6";
            case "AE":
            case "C":
                return "#F59E0B";
            case "BE":
            case "D":
            case "E":
                return "#EF4444";
            default:
                return textSecondary;
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <UnifiedHeader
                title="Student"
                subtitle="Rankings & Leaderboards"
                role="Admin"
                onBack={() => router.back()}
                rightActions={
                    <ActionTooltip
                        label="Student Rankings"
                        description="Unrestricted institutional performance leaderboard computed from graded assessment submissions."
                        learnMoreAnchor="student-rankings"
                    >
                        <TouchableOpacity
                            onPress={fetchRankings}
                            style={{
                                padding: 8,
                                borderRadius: 10,
                                backgroundColor: card,
                                borderWidth: 1,
                                borderColor: border
                            }}
                        >
                            <RefreshCw size={18} color={textSecondary} />
                        </TouchableOpacity>
                    </ActionTooltip>
                }
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={orange} />
                }
            >
                {/* ═══ Filter & Scope Bar ═══ */}
                <View style={{
                    backgroundColor: card,
                    borderRadius: 16,
                    padding: 14,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: border
                }}>
                    {/* Evaluation Window Toggle */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>
                            Evaluation Window
                        </Text>
                        <View style={{
                            flexDirection: 'row',
                            backgroundColor: isDark ? '#21262D' : '#F1F5F9',
                            borderRadius: 8,
                            padding: 2
                        }}>
                            <TouchableOpacity
                                onPress={() => setEvaluationWindow('term')}
                                style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    backgroundColor: evaluationWindow === 'term' ? orange : 'transparent'
                                }}
                            >
                                <Text style={{
                                    fontSize: 11,
                                    fontWeight: '700',
                                    color: evaluationWindow === 'term' ? '#FFFFFF' : textSecondary
                                }}>
                                    Current Term
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setEvaluationWindow('cumulative')}
                                style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6,
                                    backgroundColor: evaluationWindow === 'cumulative' ? orange : 'transparent'
                                }}
                            >
                                <Text style={{
                                    fontSize: 11,
                                    fontWeight: '700',
                                    color: evaluationWindow === 'cumulative' ? '#FFFFFF' : textSecondary
                                }}>
                                    Cumulative Year
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Class & Subject Filter Pickers */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {/* Class Filter */}
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary, marginBottom: 4 }}>
                                Class / Stream
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                                <TouchableOpacity
                                    onPress={() => setSelectedClassId('all')}
                                    style={{
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        borderRadius: 8,
                                        backgroundColor: selectedClassId === 'all' ? orange : (isDark ? '#21262D' : '#F1F5F9'),
                                        borderWidth: 1,
                                        borderColor: selectedClassId === 'all' ? orange : border
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: selectedClassId === 'all' ? '#FFFFFF' : textPrimary }}>
                                        All Classes
                                    </Text>
                                </TouchableOpacity>
                                {classes.map(c => (
                                    <TouchableOpacity
                                        key={c.id}
                                        onPress={() => setSelectedClassId(c.id)}
                                        style={{
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            borderRadius: 8,
                                            backgroundColor: selectedClassId === c.id ? orange : (isDark ? '#21262D' : '#F1F5F9'),
                                            borderWidth: 1,
                                            borderColor: selectedClassId === c.id ? orange : border
                                        }}
                                    >
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: selectedClassId === c.id ? '#FFFFFF' : textPrimary }}>
                                            {c.name || `Grade ${c.grade_level || ''}`}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>

                    {/* Subject Filter */}
                    <View style={{ marginTop: 10 }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary, marginBottom: 4 }}>
                            Subject Scope
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                            <TouchableOpacity
                                onPress={() => setSelectedSubjectId('all')}
                                style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    backgroundColor: selectedSubjectId === 'all' ? orange : (isDark ? '#21262D' : '#F1F5F9'),
                                    borderWidth: 1,
                                    borderColor: selectedSubjectId === 'all' ? orange : border
                                }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '600', color: selectedSubjectId === 'all' ? '#FFFFFF' : textPrimary }}>
                                    All Subjects (Overall Average)
                                </Text>
                            </TouchableOpacity>
                            {subjects.map(s => (
                                <TouchableOpacity
                                    key={s.id}
                                    onPress={() => setSelectedSubjectId(s.id)}
                                    style={{
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        borderRadius: 8,
                                        backgroundColor: selectedSubjectId === s.id ? orange : (isDark ? '#21262D' : '#F1F5F9'),
                                        borderWidth: 1,
                                        borderColor: selectedSubjectId === s.id ? orange : border
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: selectedSubjectId === s.id ? '#FFFFFF' : textPrimary }}>
                                        {s.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {/* ═══ KPI Summary Cards ═══ */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <View style={{
                        flex: 1,
                        padding: 14,
                        borderRadius: 16,
                        backgroundColor: card,
                        borderWidth: 1,
                        borderColor: border
                    }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary, textTransform: 'uppercase' }}>
                            Total Ranked
                        </Text>
                        <Text style={{ fontSize: 22, fontWeight: 'bold', color: textPrimary, marginTop: 4 }}>
                            {data?.total_students || 0}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#10B981', marginTop: 2 }}>
                            students evaluated
                        </Text>
                    </View>

                    <View style={{
                        flex: 1,
                        padding: 14,
                        borderRadius: 16,
                        backgroundColor: card,
                        borderWidth: 1,
                        borderColor: border
                    }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary, textTransform: 'uppercase' }}>
                            Cohort Mean
                        </Text>
                        <Text style={{ fontSize: 22, fontWeight: 'bold', color: textPrimary, marginTop: 4 }}>
                            {cohortMean}%
                        </Text>
                        <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                            average score
                        </Text>
                    </View>

                    <View style={{
                        flex: 1,
                        padding: 14,
                        borderRadius: 16,
                        backgroundColor: card,
                        borderWidth: 1,
                        borderColor: border
                    }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: textSecondary, textTransform: 'uppercase' }}>
                            Top Score
                        </Text>
                        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#F59E0B', marginTop: 4 }}>
                            {data?.rankings?.[0]?.average_score || 0}%
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                            {data?.rankings?.[0]?.full_name?.split(' ')[0] || "None"}
                        </Text>
                    </View>
                </View>

                {/* ═══ Distribution Badges ═══ */}
                <View style={{ marginBottom: 16 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => setSelectedBand(null)}
                            style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 10,
                                backgroundColor: selectedBand === null ? orange : card,
                                borderWidth: 1,
                                borderColor: selectedBand === null ? orange : border,
                            }}
                        >
                            <Text style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color: selectedBand === null ? "#FFFFFF" : textPrimary,
                            }}>
                                All Bands ({data?.total_students || 0})
                            </Text>
                        </TouchableOpacity>

                        {distributionItems.map((item) => {
                            const isSelected = selectedBand === item.key;
                            const bColor = getBandColor(item.key);
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    onPress={() => setSelectedBand(isSelected ? null : item.key)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 10,
                                        backgroundColor: isSelected ? bColor : card,
                                        borderWidth: 1,
                                        borderColor: isSelected ? bColor : border,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <View style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: isSelected ? "#FFFFFF" : bColor,
                                    }} />
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: "700",
                                        color: isSelected ? "#FFFFFF" : textPrimary,
                                    }}>
                                        {item.label}: {item.count}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* ═══ Podium (Top 3) ═══ */}
                {!selectedBand && !searchQuery && topThree.length >= 3 && (
                    <View style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "flex-end",
                        marginBottom: 20,
                        paddingHorizontal: 8,
                        gap: 8,
                    }}>
                        {/* 2nd Place */}
                        <View style={{
                            flex: 1,
                            backgroundColor: card,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: border,
                            padding: 12,
                            alignItems: "center",
                            height: 150,
                            justifyContent: "space-between",
                        }}>
                            <View style={{
                                width: 26,
                                height: 26,
                                borderRadius: 13,
                                backgroundColor: "#94A3B8",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 12 }}>2</Text>
                            </View>
                            <View style={{ alignItems: "center" }}>
                                <Text numberOfLines={1} style={{ fontWeight: "700", fontSize: 13, color: textPrimary }}>
                                    {topThree[1].full_name}
                                </Text>
                                <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                                    {topThree[1].admission_number || "Student"}
                                </Text>
                            </View>
                            <Text style={{ fontWeight: "800", fontSize: 16, color: "#3B82F6" }}>
                                {topThree[1].average_score}%
                            </Text>
                        </View>

                        {/* 1st Place */}
                        <View style={{
                            flex: 1.15,
                            backgroundColor: card,
                            borderRadius: 16,
                            borderWidth: 2,
                            borderColor: "#F59E0B",
                            padding: 12,
                            alignItems: "center",
                            height: 175,
                            justifyContent: "space-between",
                            shadowColor: "#F59E0B",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.15,
                            shadowRadius: 8,
                            elevation: 4,
                        }}>
                            <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: "#F59E0B",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                <Trophy size={18} color="#FFF" />
                            </View>
                            <View style={{ alignItems: "center" }}>
                                <Text numberOfLines={1} style={{ fontWeight: "800", fontSize: 14, color: textPrimary }}>
                                    {topThree[0].full_name}
                                </Text>
                                <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                                    {topThree[0].admission_number || "Student"}
                                </Text>
                            </View>
                            <Text style={{ fontWeight: "900", fontSize: 20, color: "#F59E0B" }}>
                                {topThree[0].average_score}%
                            </Text>
                        </View>

                        {/* 3rd Place */}
                        <View style={{
                            flex: 1,
                            backgroundColor: card,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: border,
                            padding: 12,
                            alignItems: "center",
                            height: 135,
                            justifyContent: "space-between",
                        }}>
                            <View style={{
                                width: 26,
                                height: 26,
                                borderRadius: 13,
                                backgroundColor: "#B45309",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 12 }}>3</Text>
                            </View>
                            <View style={{ alignItems: "center" }}>
                                <Text numberOfLines={1} style={{ fontWeight: "700", fontSize: 13, color: textPrimary }}>
                                    {topThree[2].full_name}
                                </Text>
                                <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                                    {topThree[2].admission_number || "Student"}
                                </Text>
                            </View>
                            <Text style={{ fontWeight: "800", fontSize: 16, color: "#B45309" }}>
                                {topThree[2].average_score}%
                            </Text>
                        </View>
                    </View>
                )}

                {/* ═══ Search & Header ═══ */}
                <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: card,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    height: 44,
                    borderWidth: 1,
                    borderColor: border,
                    marginBottom: 16,
                }}>
                    <Search size={16} color={textSecondary} />
                    <TextInput
                        placeholder="Search student by name or admission number..."
                        placeholderTextColor={textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={{
                            flex: 1,
                            marginLeft: 8,
                            fontSize: 13,
                            color: textPrimary,
                        }}
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <X size={16} color={textSecondary} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* ═══ Student List ═══ */}
                {loading ? (
                    <View style={{ padding: 40, alignItems: "center" }}>
                        <ActivityIndicator size="large" color={orange} />
                        <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13 }}>
                            Computing institutional rankings...
                        </Text>
                    </View>
                ) : filteredRankings.length === 0 ? (
                    <View style={{
                        padding: 32,
                        borderRadius: 16,
                        backgroundColor: card,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: border,
                    }}>
                        <Award size={36} color={textSecondary} />
                        <Text style={{ fontSize: 15, fontWeight: "bold", color: textPrimary, marginTop: 12 }}>
                            No student rankings found
                        </Text>
                        <Text style={{ fontSize: 13, color: textSecondary, textAlign: "center", marginTop: 4 }}>
                            {searchQuery ? "Try changing your search term" : "No graded assessments recorded for this filter criteria"}
                        </Text>
                    </View>
                ) : (
                    <View style={{ gap: 8 }}>
                        {filteredRankings.map((st) => {
                            const isPodium = st.rank <= 3;
                            const rColor = getRankColor(st.rank);
                            const band = st.cbc_band || st.grade;
                            const bColor = getBandColor(band);

                            return (
                                <View
                                    key={st.student_id}
                                    style={{
                                        backgroundColor: card,
                                        borderRadius: 14,
                                        padding: 14,
                                        borderWidth: 1,
                                        borderColor: isPodium ? `${rColor}50` : border,
                                        flexDirection: "row",
                                        alignItems: "center",
                                    }}
                                >
                                    {/* Rank Badge */}
                                    <View style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 16,
                                        backgroundColor: isPodium ? `${rColor}20` : (isDark ? "#21262D" : "#F1F5F9"),
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginRight: 12,
                                    }}>
                                        <Text style={{
                                            fontWeight: "800",
                                            fontSize: 13,
                                            color: rColor,
                                        }}>
                                            #{st.rank}
                                        </Text>
                                    </View>

                                    {/* Avatar */}
                                    {st.avatar_url ? (
                                        <Image
                                            source={{ uri: resolveAvatarUri(st.avatar_url) || undefined }}
                                            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
                                        />
                                    ) : (
                                        <View style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                            backgroundColor: isDark ? "#21262D" : "#F1F5F9",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginRight: 12,
                                        }}>
                                            <UserCircle size={24} color={textSecondary} />
                                        </View>
                                    )}

                                    {/* Student Info */}
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: "700", fontSize: 14, color: textPrimary }}>
                                            {st.full_name}
                                        </Text>
                                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                                            {st.admission_number ? (
                                                <Text style={{ fontSize: 11, color: textSecondary }}>
                                                    Adm: {st.admission_number}
                                                </Text>
                                            ) : null}
                                            <Text style={{ fontSize: 11, color: textSecondary }}>
                                                {st.graded_tasks} tasks graded
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Score & Band */}
                                    <View style={{ alignItems: "flex-end" }}>
                                        <Text style={{
                                            fontWeight: "800",
                                            fontSize: 16,
                                            color: st.average_score >= 70 ? "#10B981" : (st.average_score >= 50 ? "#3B82F6" : "#EF4444"),
                                        }}>
                                            {st.average_score}%
                                        </Text>
                                        {band ? (
                                            <View style={{
                                                marginTop: 4,
                                                paddingHorizontal: 8,
                                                paddingVertical: 2,
                                                borderRadius: 6,
                                                backgroundColor: `${bColor}15`,
                                                borderWidth: 1,
                                                borderColor: `${bColor}30`,
                                            }}>
                                                <Text style={{ fontSize: 10, fontWeight: "700", color: bColor }}>
                                                    {band}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
