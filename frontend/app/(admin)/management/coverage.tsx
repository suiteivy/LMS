import { ActionTooltip } from "@/components/common/ActionTooltip";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { DatePicker } from "@/components/common/DatePicker";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { WeekPickerModal } from "@/components/common/WeekPickerModal";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { CalendarAPI } from "@/services/CalendarService";
import { GradingAPI } from "@/services/GradingService";
import { SubjectAPI } from "@/services/SubjectService";
import { TeacherService } from "@/services/TeacherService";
import { AcademicTermItem, calculateWeeksForTerm, CalendarEventItem, InstructionalWeek } from "@/utils/academicWeekEngine";
import { router, useLocalSearchParams } from "expo-router";
import {
    AlertCircle,
    BookOpen,
    Calendar,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    Layers,
    Plus,
    RefreshCw,
    Search,
    Shield,
    ShieldCheck,
    Trash2,
    UserCheck,
    Users,
    X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';

interface CoveragePlanItem {
    id: string;
    subject_id: string;
    term: string;
    academic_year: string;
    title: string;
    description?: string;
    strand?: string;
    sub_strand?: string;
    week_start?: number;
    week_end?: number;
    duration_weeks?: number;
    status: 'draft' | 'active' | 'completed' | 'archived';
    target_completion_date?: string;
    order_index?: number;
}

interface OversightSubject {
    subject_id: string;
    subject_title: string;
    class_id: string | null;
    class_name: string | null;
    grade_level: string | number | null;
    stream: string | null;
    hod: {
        teacher_id: string;
        name: string;
        email?: string;
        avatar_url?: string | null;
    } | null;
    has_plan: boolean;
    total_topics: number;
    completed_topics: number;
    completion_rate: number;
    latest_activity: string | null;
}

export default function AdminCoveragePlanner() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'principal' || user?.role === 'head_teacher';
    const { isDark } = useTheme();
    const tier = useSubscriptionTier();
    const params = useLocalSearchParams<{ subject_id?: string; tab?: string }>();

    const [activeTab, setActiveTab] = useState<'oversight' | 'builder'>(
        params.tab === 'builder' || params.subject_id ? 'builder' : 'oversight'
    );

    // Oversight Data State
    const [oversightData, setOversightData] = useState<{
        total_subjects: number;
        subjects_with_plans: number;
        total_topics_planned: number;
        total_completed: number;
        overall_coverage_rate: number;
        subjects: OversightSubject[];
    }>({
        total_subjects: 0,
        subjects_with_plans: 0,
        total_topics_planned: 0,
        total_completed: 0,
        overall_coverage_rate: 0,
        subjects: []
    });
    const [oversightLoading, setOversightLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Builder Data State
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>(params.subject_id || "");
    const [availableTerms, setAvailableTerms] = useState<string[]>([]);
    const [termsObjects, setTermsObjects] = useState<AcademicTermItem[]>([]);
    const [selectedTerm, setSelectedTerm] = useState<string>("");
    const [academicYear, setAcademicYear] = useState<string>("");
    const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
    const [calculatedWeeks, setCalculatedWeeks] = useState<InstructionalWeek[]>([]);
    const [showStartWeekPicker, setShowStartWeekPicker] = useState<boolean>(false);
    const [showEndWeekPicker, setShowEndWeekPicker] = useState<boolean>(false);
    const [plans, setPlans] = useState<CoveragePlanItem[]>([]);
    const [builderLoading, setBuilderLoading] = useState<boolean>(false);
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [planToDelete, setPlanToDelete] = useState<CoveragePlanItem | null>(null);

    // Form fields
    const [title, setTitle] = useState("");
    const [strand, setStrand] = useState("");
    const [subStrand, setSubStrand] = useState("");
    const [description, setDescription] = useState("");
    const [weekStart, setWeekStart] = useState("1");
    const [weekEnd, setWeekEnd] = useState("2");
    const [targetDate, setTargetDate] = useState("");

    // Load oversight data
    const loadOversight = useCallback(async () => {
        setOversightLoading(true);
        try {
            const data = await TeacherService.getCoverageOversight({
                term: selectedTerm || undefined,
                academic_year: academicYear || undefined
            });
            setOversightData(data || {
                total_subjects: 0,
                subjects_with_plans: 0,
                total_topics_planned: 0,
                total_completed: 0,
                overall_coverage_rate: 0,
                subjects: []
            });
        } catch (err: any) {
            console.error("loadOversight error:", err);
            Toast.show({
                type: 'error',
                text1: 'Failed to load coverage oversight',
                text2: err.message || 'Please try again'
            });
        } finally {
            setOversightLoading(false);
        }
    }, [selectedTerm, academicYear]);

    // Initial load: academic year, terms, subjects
    useEffect(() => {
        const init = async () => {
            try {
                // 1. Fetch academic years
                let activeYearName = "";
                let activeYearId = "";
                try {
                    const years = await GradingAPI.getAcademicYears();
                    const activeYear = (years || []).find((y: any) => y.is_current) || (years || [])[0] || null;
                    if (activeYear) {
                        activeYearName = activeYear.name;
                        activeYearId = activeYear.id;
                        setAcademicYear(activeYearName);
                    } else {
                        setAcademicYear("");
                    }
                } catch (e) {
                    console.error("fetchAcademicYears error:", e);
                    setAcademicYear("");
                }

                // 2. Fetch live terms strictly from active academic year
                if (activeYearId) {
                    try {
                        const termsData = await GradingAPI.getTerms(activeYearId).catch(() => []);
                        if (Array.isArray(termsData) && termsData.length > 0) {
                            const sorted = [...termsData].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
                            setTermsObjects(sorted);
                            const termNames = sorted.map((t: any) => t.name || `Term ${t.term_number || ''}`.trim());
                            setAvailableTerms(termNames);
                            const currentTerm = sorted.find((t: any) => t.is_current) || sorted[0];
                            setSelectedTerm(currentTerm?.name || termNames[0] || "");
                        } else {
                            setTermsObjects([]);
                            setAvailableTerms([]);
                            setSelectedTerm("");
                        }
                    } catch (e) {
                        console.error("fetchTerms error:", e);
                        setTermsObjects([]);
                        setAvailableTerms([]);
                        setSelectedTerm("");
                    }
                } else {
                    setTermsObjects([]);
                    setAvailableTerms([]);
                    setSelectedTerm("");
                }

                // 3. Fetch subjects
                const subList = await SubjectAPI.getFilteredSubjects().catch(() => []);
                setSubjects(subList || []);
                if (subList && subList.length > 0 && !selectedSubjectId) {
                    setSelectedSubjectId(params.subject_id || subList[0].id);
                }
            } catch (err) {
                console.error("Init coverage planner error:", err);
            }
        };

        init();
    }, []);

    // Trigger oversight refresh when term/year ready
    useEffect(() => {
        if (activeTab === 'oversight') {
            loadOversight();
        }
    }, [activeTab, loadOversight]);

    // Recalculate weeks whenever selected term changes
    useEffect(() => {
        if (!selectedTerm || termsObjects.length === 0) {
            setCalculatedWeeks([]);
            return;
        }

        const activeTermObj = termsObjects.find(t => t.name === selectedTerm) || null;
        if (!activeTermObj || !activeTermObj.start_date || !activeTermObj.end_date) {
            setCalculatedWeeks([]);
            return;
        }

        const weeks = calculateWeeksForTerm(activeTermObj, calendarEvents);
        setCalculatedWeeks(weeks);
    }, [selectedTerm, termsObjects, calendarEvents]);

    // Load coverage plan items for selected subject
    const loadPlans = useCallback(async () => {
        if (!selectedSubjectId) return;
        setBuilderLoading(true);
        try {
            const data = await TeacherService.getCoveragePlans({
                subject_id: selectedSubjectId,
                term: selectedTerm || undefined,
                academic_year: academicYear || undefined
            });
            setPlans(Array.isArray(data) ? data : (data?.plans || []));
        } catch (err: any) {
            console.error("loadPlans error:", err);
            Toast.show({
                type: 'error',
                text1: 'Error loading plans',
                text2: err.message || 'Could not fetch coverage plans'
            });
        } finally {
            setBuilderLoading(false);
        }
    }, [selectedSubjectId, selectedTerm, academicYear]);

    useEffect(() => {
        if (activeTab === 'builder' && selectedSubjectId) {
            loadPlans();
        }
    }, [activeTab, selectedSubjectId, selectedTerm, academicYear, loadPlans]);

    // Create plan item
    const handleCreatePlan = async () => {
        if (!selectedTerm) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'No academic term available. Configure terms in Academic Setup first.' });
            return;
        }
        if (!title.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Topic title is required' });
            return;
        }
        if (!selectedSubjectId) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please select a subject' });
            return;
        }

        setSaving(true);
        try {
            await TeacherService.createCoveragePlan({
                subject_id: selectedSubjectId,
                term: selectedTerm,
                academic_year: academicYear || new Date().getFullYear().toString(),
                title: title.trim(),
                description: description.trim() || undefined,
                strand: strand.trim() || undefined,
                sub_strand: subStrand.trim() || undefined,
                week_start: parseInt(weekStart) || 1,
                week_end: parseInt(weekEnd) || 2,
                duration_weeks: (parseInt(weekEnd) || 2) - (parseInt(weekStart) || 1) + 1,
                target_completion_date: targetDate || undefined,
                status: 'active',
                order_index: plans.length
            });

            Toast.show({ type: 'success', text1: 'Success', text2: 'Coverage plan topic added' });
            setShowCreateModal(false);
            setTitle("");
            setDescription("");
            setStrand("");
            setSubStrand("");
            setTargetDate("");
            await loadPlans();
        } catch (err: any) {
            console.error("handleCreatePlan error:", err);
            Toast.show({
                type: 'error',
                text1: 'Failed to create plan',
                text2: err.message || 'Please verify inputs'
            });
        } finally {
            setSaving(false);
        }
    };

    // Delete plan item
    const confirmDeletePlan = async () => {
        if (!planToDelete) return;
        try {
            await TeacherService.deleteCoveragePlan(planToDelete.id);
            Toast.show({ type: 'success', text1: 'Deleted', text2: 'Plan topic removed' });
            setPlanToDelete(null);
            await loadPlans();
        } catch (err: any) {
            Toast.show({ type: 'error', text1: 'Delete failed', text2: err.message });
        }
    };

    const filteredSubjects = oversightData.subjects.filter(s => {
        const q = searchQuery.toLowerCase();
        return s.subject_title.toLowerCase().includes(q) ||
            (s.class_name && s.class_name.toLowerCase().includes(q)) ||
            (s.hod?.name && s.hod.name.toLowerCase().includes(q));
    });

    const activeSubject = subjects.find(s => s.id === selectedSubjectId);

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#0d1117' : '#f8fafc' }}>
            <UnifiedHeader
                title="Curriculum"
                subtitle="Coverage Planner"
                role="Admin"
                onBack={() => router.back()}
                rightActions={
                    <ActionTooltip
                        label="Coverage Oversight"
                        description="Monitor term syllabus completion rates across all academic departments."
                        learnMoreAnchor="curriculum-coverage"
                    >
                        <TouchableOpacity
                            onPress={() => activeTab === 'oversight' ? loadOversight() : loadPlans()}
                            style={{
                                padding: 8,
                                borderRadius: 10,
                                backgroundColor: isDark ? '#161b22' : '#ffffff',
                                borderWidth: 1,
                                borderColor: isDark ? '#30363d' : '#e2e8f0'
                            }}
                        >
                            <RefreshCw size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                        </TouchableOpacity>
                    </ActionTooltip>
                }
            />

            {/* Segmented Control Tabs */}
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
                <View style={{
                    flexDirection: 'row',
                    backgroundColor: isDark ? '#161b22' : '#e2e8f0',
                    borderRadius: 12,
                    padding: 3
                }}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('oversight')}
                        style={{
                            flex: 1,
                            paddingVertical: 9,
                            borderRadius: 9,
                            backgroundColor: activeTab === 'oversight' ? (isDark ? '#21262d' : '#ffffff') : 'transparent',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOpacity: activeTab === 'oversight' ? 0.05 : 0,
                            shadowRadius: 2,
                            elevation: activeTab === 'oversight' ? 1 : 0
                        }}
                    >
                        <Text style={{
                            fontSize: 13,
                            fontWeight: activeTab === 'oversight' ? '700' : '500',
                            color: activeTab === 'oversight' ? '#FF6900' : (isDark ? '#94a3b8' : '#64748b')
                        }}>
                            Department Oversight
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setActiveTab('builder')}
                        style={{
                            flex: 1,
                            paddingVertical: 9,
                            borderRadius: 9,
                            backgroundColor: activeTab === 'builder' ? (isDark ? '#21262d' : '#ffffff') : 'transparent',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOpacity: activeTab === 'builder' ? 0.05 : 0,
                            shadowRadius: 2,
                            elevation: activeTab === 'builder' ? 1 : 0
                        }}
                    >
                        <Text style={{
                            fontSize: 13,
                            fontWeight: activeTab === 'builder' ? '700' : '500',
                            color: activeTab === 'builder' ? '#FF6900' : (isDark ? '#94a3b8' : '#64748b')
                        }}>
                            Plan Builder & Management
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* TAB 1: Department Oversight */}
            {activeTab === 'oversight' && (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* KPI Summary Cards */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                        <View style={{
                            flex: 1,
                            padding: 14,
                            borderRadius: 16,
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                            borderWidth: 1,
                            borderColor: isDark ? '#30363d' : '#e2e8f0'
                        }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>
                                Total Subjects
                            </Text>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a', marginTop: 4 }}>
                                {oversightData.total_subjects}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                                {oversightData.subjects_with_plans} with active plan
                            </Text>
                        </View>

                        <View style={{
                            flex: 1,
                            padding: 14,
                            borderRadius: 16,
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                            borderWidth: 1,
                            borderColor: isDark ? '#30363d' : '#e2e8f0'
                        }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>
                                Total Topics
                            </Text>
                            <Text style={{ fontSize: 24, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a', marginTop: 4 }}>
                                {oversightData.total_topics_planned}
                            </Text>
                            <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                                {oversightData.total_completed} completed
                            </Text>
                        </View>

                        <View style={{
                            flex: 1,
                            padding: 14,
                            borderRadius: 16,
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                            borderWidth: 1,
                            borderColor: isDark ? '#30363d' : '#e2e8f0'
                        }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase' }}>
                                School Coverage
                            </Text>
                            <Text style={{
                                fontSize: 24,
                                fontWeight: 'bold',
                                color: oversightData.overall_coverage_rate >= 70 ? '#10b981' : (oversightData.overall_coverage_rate >= 40 ? '#f59e0b' : '#ef4444'),
                                marginTop: 4
                            }}>
                                {oversightData.overall_coverage_rate}%
                            </Text>
                            <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                                term progress
                            </Text>
                        </View>
                    </View>

                    {/* Term Selector & Search Bar */}
                    <View style={{
                        flexDirection: 'row',
                        gap: 8,
                        marginBottom: 16,
                        alignItems: 'center'
                    }}>
                        <View style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            height: 44,
                            borderWidth: 1,
                            borderColor: isDark ? '#30363d' : '#e2e8f0'
                        }}>
                            <Search size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                            <TextInput
                                placeholder="Search by subject, class, or HOD..."
                                placeholderTextColor={isDark ? '#6e7681' : '#94a3b8'}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                style={{
                                    flex: 1,
                                    marginLeft: 8,
                                    fontSize: 13,
                                    color: isDark ? '#f0f6fc' : '#0f172a'
                                }}
                            />
                            {searchQuery ? (
                                <TouchableOpacity onPress={() => setSearchQuery("")}>
                                    <X size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        {/* Term selector dropdown pills */}
                        {availableTerms.length > 0 ? (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 6 }}
                            >
                                {availableTerms.map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        onPress={() => setSelectedTerm(t)}
                                        style={{
                                            paddingHorizontal: 12,
                                            height: 44,
                                            justifyContent: 'center',
                                            borderRadius: 12,
                                            backgroundColor: selectedTerm === t ? '#FF6900' : (isDark ? '#161b22' : '#ffffff'),
                                            borderWidth: 1,
                                            borderColor: selectedTerm === t ? '#FF6900' : (isDark ? '#30363d' : '#e2e8f0')
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: '600',
                                            color: selectedTerm === t ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')
                                        }}>
                                            {t}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={{
                                paddingHorizontal: 12,
                                height: 44,
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: 12,
                                backgroundColor: isDark ? '#161b22' : '#f8fafc',
                                borderWidth: 1,
                                borderColor: isDark ? '#30363d' : '#e2e8f0',
                                alignSelf: 'flex-start'
                            }}>
                                <Text style={{
                                    fontSize: 12,
                                    fontWeight: '500',
                                    color: isDark ? '#8b949e' : '#64748b'
                                }}>
                                    No terms available
                                </Text>
                            </View>
                        )}
                    </View>

                    {availableTerms.length === 0 && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: isDark ? 'rgba(255,105,0,0.08)' : '#fff7ed',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,105,0,0.25)' : '#fed7aa',
                            borderRadius: 14,
                            padding: 14,
                            marginBottom: 16
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 10 }}>
                                <Calendar size={20} color="#FF6900" />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                        No Academic Periods Configured
                                    </Text>
                                    <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>
                                        {isAdmin
                                            ? "Set up terms and dates in Academic Setup to enable termly coverage tracking."
                                            : "No academic periods or terms have been configured yet. Please contact your school administrator to configure academic terms."}
                                    </Text>
                                </View>
                            </View>
                            {isAdmin && (
                                <TouchableOpacity
                                    onPress={() => router.push('/(admin)/academic-setup')}
                                    style={{
                                        backgroundColor: '#FF6900',
                                        paddingHorizontal: 12,
                                        paddingVertical: 7,
                                        borderRadius: 8
                                    }}
                                >
                                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>Setup</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Department / Subject Oversight List */}
                    <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                            Subject Progress Tracking ({filteredSubjects.length})
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/(admin)/management/roles?tab=hod' as any)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                        >
                            <Shield size={14} color="#FF6900" />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#FF6900' }}>Manage HODs</Text>
                        </TouchableOpacity>
                    </View>

                    {oversightLoading ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#FF6900" />
                            <Text style={{ color: isDark ? '#94a3b8' : '#64748b', marginTop: 12, fontSize: 13 }}>
                                Computing departmental coverage metrics...
                            </Text>
                        </View>
                    ) : filteredSubjects.length === 0 ? (
                        <View style={{
                            padding: 32,
                            borderRadius: 16,
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isDark ? '#30363d' : '#e2e8f0'
                        }}>
                            <Layers size={36} color={isDark ? '#484f58' : '#cbd5e1'} />
                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a', marginTop: 12 }}>
                                No subjects found
                            </Text>
                            <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', marginTop: 4 }}>
                                {searchQuery ? "Try refining your search filter" : "No subjects have been configured for this institution yet"}
                            </Text>
                        </View>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {filteredSubjects.map(sub => (
                                <View
                                    key={sub.subject_id}
                                    style={{
                                        backgroundColor: isDark ? '#161b22' : '#ffffff',
                                        borderRadius: 16,
                                        padding: 16,
                                        borderWidth: 1,
                                        borderColor: isDark ? '#30363d' : '#e2e8f0'
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                                    {sub.subject_title}
                                                </Text>
                                                {sub.class_name && (
                                                    <View style={{
                                                        backgroundColor: isDark ? '#21262d' : '#f1f5f9',
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                        borderRadius: 6
                                                    }}>
                                                        <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                            {sub.class_name}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* HOD Status */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
                                                <ShieldCheck size={14} color={sub.hod ? '#10b981' : (isDark ? '#6e7681' : '#94a3b8')} />
                                                {sub.hod ? (
                                                    <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                        HOD: <Text style={{ fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a' }}>{sub.hod.name}</Text>
                                                    </Text>
                                                ) : (
                                                    <TouchableOpacity
                                                        onPress={() => router.push('/(admin)/management/roles?tab=hod' as any)}
                                                        style={{ flexDirection: 'row', alignItems: 'center' }}
                                                    >
                                                        <Text style={{ fontSize: 12, color: '#f59e0b', fontStyle: 'italic' }}>
                                                            No HOD Assigned (Click to Assign)
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>

                                        {/* Coverage Badge */}
                                        <View style={{
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            borderRadius: 999,
                                            backgroundColor: sub.completion_rate >= 70 ? (isDark ? '#064e3b' : '#d1fae5') : (sub.completion_rate >= 40 ? (isDark ? '#451a03' : '#fef3c7') : (isDark ? '#450a0a' : '#fee2e2')),
                                        }}>
                                            <Text style={{
                                                fontSize: 12,
                                                fontWeight: '700',
                                                color: sub.completion_rate >= 70 ? '#10b981' : (sub.completion_rate >= 40 ? '#f59e0b' : '#ef4444')
                                            }}>
                                                {sub.completion_rate}% Done
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Progress Bar */}
                                    <View style={{ marginTop: 12 }}>
                                        <View style={{
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: isDark ? '#21262d' : '#e2e8f0',
                                            overflow: 'hidden'
                                        }}>
                                            <View style={{
                                                width: `${Math.min(100, sub.completion_rate)}%`,
                                                height: '100%',
                                                backgroundColor: sub.completion_rate >= 70 ? '#10b981' : (sub.completion_rate >= 40 ? '#f59e0b' : '#ef4444'),
                                                borderRadius: 3
                                            }} />
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                                            <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                {sub.completed_topics} of {sub.total_topics} topics completed
                                            </Text>
                                            {sub.latest_activity && (
                                                <Text style={{ fontSize: 11, color: isDark ? '#6e7681' : '#94a3b8' }}>
                                                    Last logged: {new Date(sub.latest_activity).toLocaleDateString()}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {/* Action Buttons */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8, borderTopWidth: 1, borderTopColor: isDark ? '#21262d' : '#f1f5f9', paddingTop: 10 }}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedSubjectId(sub.subject_id);
                                                setActiveTab('builder');
                                            }}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 4,
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 8,
                                                backgroundColor: isDark ? '#21262d' : '#f1f5f9'
                                            }}
                                        >
                                            <Layers size={13} color={isDark ? '#f0f6fc' : '#0f172a'} />
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                                {sub.has_plan ? "Manage Plan" : "Create Plan"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* TAB 2: Plan Builder & Management */}
            {activeTab === 'builder' && (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Subject Selector Bar */}
                    <View style={{
                        backgroundColor: isDark ? '#161b22' : '#ffffff',
                        borderRadius: 16,
                        padding: 14,
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: isDark ? '#30363d' : '#e2e8f0'
                    }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>
                            Selected Subject
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8 }}
                        >
                            {subjects.map(s => (
                                <TouchableOpacity
                                    key={s.id}
                                    onPress={() => setSelectedSubjectId(s.id)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        borderRadius: 10,
                                        backgroundColor: selectedSubjectId === s.id ? '#FF6900' : (isDark ? '#21262d' : '#f1f5f9'),
                                        borderWidth: 1,
                                        borderColor: selectedSubjectId === s.id ? '#FF6900' : (isDark ? '#30363d' : '#e2e8f0')
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 13,
                                        fontWeight: '600',
                                        color: selectedSubjectId === s.id ? '#ffffff' : (isDark ? '#f0f6fc' : '#0f172a')
                                    }}>
                                        {s.title} {s.class_id ? `(${s.classes?.display_name || s.classes?.name || 'Class'})` : ''}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Term & Year row */}
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>Term:</Text>
                            {availableTerms.length > 0 ? (
                                availableTerms.map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        onPress={() => setSelectedTerm(t)}
                                        style={{
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            borderRadius: 8,
                                            backgroundColor: selectedTerm === t ? (isDark ? '#30363d' : '#e2e8f0') : 'transparent',
                                            borderWidth: 1,
                                            borderColor: selectedTerm === t ? '#FF6900' : 'transparent'
                                        }}
                                    >
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: selectedTerm === t ? '700' : '500',
                                            color: selectedTerm === t ? '#FF6900' : (isDark ? '#94a3b8' : '#64748b')
                                        }}>
                                            {t}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={{ fontSize: 12, fontStyle: 'italic', color: isDark ? '#8b949e' : '#64748b' }}>
                                    No terms available
                                </Text>
                            )}
                            {academicYear ? (
                                <View style={{ marginLeft: 'auto', backgroundColor: isDark ? '#21262d' : '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
                                        Year: {academicYear}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>

                    {/* Action Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <View>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                {activeSubject?.title || 'Subject'} Syllabus Plan
                            </Text>
                            <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                                {availableTerms.length > 0
                                    ? `${plans.length} topics scheduled for ${selectedTerm || 'selected term'}`
                                    : 'No terms configured for this academic year'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                if (availableTerms.length === 0) {
                                    Toast.show({
                                        type: 'info',
                                        text1: 'No terms available',
                                        text2: 'Configure academic periods in Academic Setup before creating coverage plans.'
                                    });
                                    return;
                                }
                                setShowCreateModal(true);
                            }}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: '#FF6900',
                                paddingHorizontal: 14,
                                paddingVertical: 8,
                                borderRadius: 10,
                                opacity: availableTerms.length === 0 ? 0.6 : 1
                            }}
                        >
                            <Plus size={16} color="#ffffff" />
                            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>
                                Add Topic
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Plan Items List */}
                    {builderLoading ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#FF6900" />
                        </View>
                    ) : availableTerms.length === 0 ? (
                        <View style={{
                            padding: 36,
                            borderRadius: 16,
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isDark ? '#30363d' : '#e2e8f0'
                        }}>
                            <View style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                backgroundColor: isDark ? '#2a1a0a' : '#fff7ed',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 14,
                                borderWidth: 1,
                                borderColor: isDark ? '#7c2d12' : '#ffedd5'
                            }}>
                                <Calendar size={28} color="#FF6900" />
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                No Terms Available
                            </Text>
                            <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', marginTop: 6, maxWidth: 340, lineHeight: 18 }}>
                                {isAdmin
                                    ? "No academic period info has been configured yet. Set up academic years and terms in Academic Setup to begin creating curriculum coverage plans."
                                    : "No academic periods or terms have been configured for this academic year yet. Please contact your school administrator to configure academic terms."}
                            </Text>
                            {isAdmin && (
                                <TouchableOpacity
                                    onPress={() => router.push('/(admin)/academic-setup')}
                                    style={{
                                        marginTop: 18,
                                        backgroundColor: '#FF6900',
                                        paddingHorizontal: 18,
                                        paddingVertical: 10,
                                        borderRadius: 12,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6
                                    }}
                                >
                                    <Plus size={16} color="#ffffff" />
                                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                                        Configure Academic Periods
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : plans.length === 0 ? (
                        <View style={{
                            padding: 32,
                            borderRadius: 16,
                            backgroundColor: isDark ? '#161b22' : '#ffffff',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isDark ? '#30363d' : '#e2e8f0'
                        }}>
                            <BookOpen size={36} color={isDark ? '#484f58' : '#cbd5e1'} />
                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a', marginTop: 12 }}>
                                No coverage plan defined
                            </Text>
                            <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', marginTop: 4, maxWidth: 300 }}>
                                Setting up a coverage plan is optional, but allows teachers to link and track their weekly lessons in Record of Work.
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowCreateModal(true)}
                                style={{
                                    marginTop: 16,
                                    backgroundColor: '#FF6900',
                                    paddingHorizontal: 16,
                                    paddingVertical: 9,
                                    borderRadius: 10
                                }}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                                    Create First Topic
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {plans.map((item, idx) => (
                                <View
                                    key={item.id}
                                    style={{
                                        backgroundColor: isDark ? '#161b22' : '#ffffff',
                                        borderRadius: 14,
                                        padding: 16,
                                        borderWidth: 1,
                                        borderColor: isDark ? '#30363d' : '#e2e8f0'
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <View style={{
                                                    backgroundColor: '#FF6900',
                                                    width: 22,
                                                    height: 22,
                                                    borderRadius: 11,
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}>
                                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>{idx + 1}</Text>
                                                </View>
                                                <Text style={{ fontSize: 15, fontWeight: '700', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                                    {item.title}
                                                </Text>
                                            </View>

                                            {(item.strand || item.sub_strand) && (
                                                <Text style={{ fontSize: 12, color: '#3b82f6', marginTop: 4, fontWeight: '500' }}>
                                                    {[item.strand, item.sub_strand].filter(Boolean).join(" • ")}
                                                </Text>
                                            )}

                                            {item.description && (
                                                <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', marginTop: 4 }}>
                                                    {item.description}
                                                </Text>
                                            )}

                                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center' }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <Clock size={13} color={isDark ? '#94a3b8' : '#64748b'} />
                                                    <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                        Weeks {item.week_start || 1}–{item.week_end || item.week_start || 1}
                                                    </Text>
                                                </View>
                                                {item.target_completion_date && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                        <Calendar size={13} color={isDark ? '#94a3b8' : '#64748b'} />
                                                        <Text style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                                                            Target: {new Date(item.target_completion_date).toLocaleDateString()}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>

                                        <TouchableOpacity
                                            onPress={() => setPlanToDelete(item)}
                                            style={{ padding: 6 }}
                                        >
                                            <Trash2 size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Create Topic Modal */}
            <Modal
                visible={showCreateModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreateModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    <View style={{
                        backgroundColor: isDark ? '#161b22' : '#ffffff',
                        borderRadius: 20,
                        padding: 20,
                        maxHeight: '90%',
                        borderWidth: 1,
                        borderColor: isDark ? '#30363d' : '#e2e8f0'
                    }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 17, fontWeight: 'bold', color: isDark ? '#f0f6fc' : '#0f172a' }}>
                                Add Coverage Plan Topic
                            </Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <X size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Topic Title */}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                Topic Title *
                            </Text>
                            <TextInput
                                placeholder="e.g. Linear Equations and Inequalities"
                                placeholderTextColor={isDark ? '#6e7681' : '#94a3b8'}
                                value={title}
                                onChangeText={setTitle}
                                style={{
                                    height: 44,
                                    borderRadius: 10,
                                    paddingHorizontal: 12,
                                    backgroundColor: isDark ? '#0d1117' : '#f8fafc',
                                    borderWidth: 1,
                                    borderColor: isDark ? '#30363d' : '#e2e8f0',
                                    color: isDark ? '#f0f6fc' : '#0f172a',
                                    marginBottom: 14
                                }}
                            />

                            {/* Main Topic & Sub-topic */}
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                        Main Topic (Optional)
                                    </Text>
                                    <TextInput
                                        placeholder="e.g. Algebra"
                                        placeholderTextColor={isDark ? '#6e7681' : '#94a3b8'}
                                        value={strand}
                                        onChangeText={setStrand}
                                        style={{
                                            height: 44,
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            backgroundColor: isDark ? '#0d1117' : '#f8fafc',
                                            borderWidth: 1,
                                            borderColor: isDark ? '#30363d' : '#e2e8f0',
                                            color: isDark ? '#f0f6fc' : '#0f172a'
                                        }}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                        Sub-topic (Optional)
                                    </Text>
                                    <TextInput
                                        placeholder="e.g. Linear Relations"
                                        placeholderTextColor={isDark ? '#6e7681' : '#94a3b8'}
                                        value={subStrand}
                                        onChangeText={setSubStrand}
                                        style={{
                                            height: 44,
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            backgroundColor: isDark ? '#0d1117' : '#f8fafc',
                                            borderWidth: 1,
                                            borderColor: isDark ? '#30363d' : '#e2e8f0',
                                            color: isDark ? '#f0f6fc' : '#0f172a'
                                        }}
                                    />
                                </View>
                            </View>

                            {/* Week Range */}
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                        Start Week
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => calculatedWeeks.length > 0 ? setShowStartWeekPicker(true) : null}
                                        style={{
                                            height: 44,
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            backgroundColor: isDark ? '#0d1117' : '#f8fafc',
                                            borderWidth: 1,
                                            borderColor: isDark ? '#30363d' : '#e2e8f0',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Text style={{ color: isDark ? '#f0f6fc' : '#0f172a', fontSize: 13 }}>
                                            Week {weekStart}
                                        </Text>
                                        <ChevronDown size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                                    </TouchableOpacity>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                        End Week
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => calculatedWeeks.length > 0 ? setShowEndWeekPicker(true) : null}
                                        style={{
                                            height: 44,
                                            borderRadius: 10,
                                            paddingHorizontal: 12,
                                            backgroundColor: isDark ? '#0d1117' : '#f8fafc',
                                            borderWidth: 1,
                                            borderColor: isDark ? '#30363d' : '#e2e8f0',
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <Text style={{ color: isDark ? '#f0f6fc' : '#0f172a', fontSize: 13 }}>
                                            Week {weekEnd}
                                        </Text>
                                        <ChevronDown size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Target Date */}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginBottom: 6 }}>
                                Target Completion Date
                            </Text>
                            <DatePicker
                                value={targetDate}
                                onChange={setTargetDate}
                                placeholder="Select target deadline"
                            />

                            {/* Description / Objectives */}
                            <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#f0f6fc' : '#0f172a', marginTop: 14, marginBottom: 6 }}>
                                Key Learning Objectives & Description
                            </Text>
                            <TextInput
                                placeholder="Outline what students should be able to do..."
                                placeholderTextColor={isDark ? '#6e7681' : '#94a3b8'}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                                style={{
                                    height: 80,
                                    borderRadius: 10,
                                    padding: 12,
                                    backgroundColor: isDark ? '#0d1117' : '#f8fafc',
                                    borderWidth: 1,
                                    borderColor: isDark ? '#30363d' : '#e2e8f0',
                                    color: isDark ? '#f0f6fc' : '#0f172a',
                                    textAlignVertical: 'top',
                                    marginBottom: 20
                                }}
                            />

                            {/* Submit */}
                            <TouchableOpacity
                                onPress={handleCreatePlan}
                                disabled={saving}
                                style={{
                                    backgroundColor: '#FF6900',
                                    height: 48,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 8
                                }}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <>
                                        <Plus size={18} color="#ffffff" />
                                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                                            Save Coverage Topic
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Confirmation Modal for Delete */}
            <ConfirmationModal
                visible={!!planToDelete}
                title="Remove Topic"
                message={`Are you sure you want to delete "${planToDelete?.title}"? Any linked records of work will lose their coverage plan reference.`}
                confirmText="Delete Topic"
                cancelText="Cancel"
                isDestructive={true}
                onConfirm={confirmDeletePlan}
                onClose={() => setPlanToDelete(null)}
            />

            {/* Week Picker Modals */}
            <WeekPickerModal
                visible={showStartWeekPicker}
                onClose={() => setShowStartWeekPicker(false)}
                weeks={calculatedWeeks}
                selectedWeekNumber={parseInt(weekStart) || 1}
                onSelectWeek={(w) => {
                    setWeekStart(w.weekNumber.toString());
                    if (parseInt(weekEnd) < w.weekNumber) {
                        setWeekEnd(w.weekNumber.toString());
                    }
                }}
            />

            <WeekPickerModal
                visible={showEndWeekPicker}
                onClose={() => setShowEndWeekPicker(false)}
                weeks={calculatedWeeks}
                selectedWeekNumber={parseInt(weekEnd) || 2}
                onSelectWeek={(w) => setWeekEnd(w.weekNumber.toString())}
            />
        </View>
    );
}
