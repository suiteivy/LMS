import { ActionTooltip } from "@/components/common/ActionTooltip";
import { DatePicker } from "@/components/common/DatePicker";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { WeekPickerModal } from "@/components/common/WeekPickerModal";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarAPI } from "@/services/CalendarService";
import { GradingAPI } from "@/services/GradingService";
import { SubjectAPI } from "@/services/SubjectService";
import { TeacherService } from "@/services/TeacherService";
import { AcademicTermItem, calculateWeeksForTerm, CalendarEventItem, InstructionalWeek } from "@/utils/academicWeekEngine";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { router } from "expo-router";
import {
    AlertCircle,
    BookOpen,
    Calendar,
    CalendarDays,
    CheckCircle2,
    Clock,
    Layers,
    Plus,
    ShieldCheck,
    Trash2,
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

export default function ContentCoveragePage() {
    const { teacherId, isDemo, user } = useAuth();
    const tier = useSubscriptionTier();
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'principal' || user?.role === 'head_teacher';
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [availableTerms, setAvailableTerms] = useState<string[]>([]);
    const [termsObjects, setTermsObjects] = useState<AcademicTermItem[]>([]);
    const [selectedTerm, setSelectedTerm] = useState<string>("");
    const [academicYear, setAcademicYear] = useState<string>("");
    const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
    const [calculatedWeeks, setCalculatedWeeks] = useState<InstructionalWeek[]>([]);
    const [showStartWeekPicker, setShowStartWeekPicker] = useState<boolean>(false);
    const [showEndWeekPicker, setShowEndWeekPicker] = useState<boolean>(false);
    const [isHOD, setIsHOD] = useState<boolean>(false);
    const canWrite = isAdmin || isHOD;
    const [plans, setPlans] = useState<CoveragePlanItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    // Form state
    const [title, setTitle] = useState("");
    const [strand, setStrand] = useState("");
    const [subStrand, setSubStrand] = useState("");
    const [description, setDescription] = useState("");
    const [weekStart, setWeekStart] = useState("1");
    const [weekEnd, setWeekEnd] = useState("2");
    const [targetDate, setTargetDate] = useState("");

    const fetchSubjectsAndHOD = useCallback(async () => {
        try {
            const list = await SubjectAPI.getFilteredSubjects();
            setSubjects(list || []);
            if (list && list.length > 0 && !selectedSubjectId) {
                setSelectedSubjectId(list[0].id);
            }

            if (!isDemo) {
                // 1. Fetch active academic year
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

                // 2. Fetch live terms scoped to institution & active year
                if (activeYearId) {
                    try {
                        const termsData = await GradingAPI.getTerms(activeYearId).catch(() => []);
                        if (Array.isArray(termsData) && termsData.length > 0) {
                            const sorted = [...termsData].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
                            setTermsObjects(sorted);
                            const termNames = sorted.map((t: any) => t.name || `Term ${t.term_number || ''}`.trim());
                            setAvailableTerms(termNames);
                            const currentTerm = sorted.find((t: any) => t.is_current) || sorted[0];
                            setSelectedTerm(prev => (prev && termNames.includes(prev) ? prev : (currentTerm?.name || termNames[0])));
                        } else {
                            // Explicit empty state - NO fallback to fabricated terms
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

                // 3. Fetch calendar events for non-instructional day detection
                try {
                    const evs = await CalendarAPI.getEvents().catch(() => []);
                    setCalendarEvents(evs || []);
                } catch {
                    setCalendarEvents([]);
                }

                const hodList = await TeacherService.getHODSubjects().catch(() => []);
                const hodIds = new Set((hodList || []).map((s: any) => s.id));
                if (selectedSubjectId) {
                    setIsHOD(hodIds.has(selectedSubjectId));
                }
            } else {
                setTermsObjects([]);
                setAvailableTerms([]);
                setSelectedTerm("");
                setAcademicYear("");
                setIsHOD(true);
            }
        } catch (err) {
            console.error("fetchSubjectsAndHOD error:", err);
        }
    }, [isDemo, selectedSubjectId]);

    // Recalculate instructional weeks for selected term
    useEffect(() => {
        if (!selectedTerm || termsObjects.length === 0) {
            setCalculatedWeeks([]);
            return;
        }
        const currentTermObj = termsObjects.find(t => t.name === selectedTerm);
        if (currentTermObj) {
            const weeks = calculateWeeksForTerm(currentTermObj, calendarEvents);
            setCalculatedWeeks(weeks);
        } else {
            setCalculatedWeeks([]);
        }
    }, [selectedTerm, termsObjects, calendarEvents]);

    const fetchCoveragePlans = useCallback(async () => {
        if (!selectedSubjectId) return;
        try {
            setLoading(true);
            if (isDemo) {
                setPlans([
                    {
                        id: 'demo-1',
                        subject_id: selectedSubjectId,
                        term: selectedTerm,
                        academic_year: academicYear,
                        title: 'Numbers & Place Value Operations',
                        strand: 'Numbers',
                        sub_strand: 'Whole Numbers',
                        week_start: 1,
                        week_end: 3,
                        duration_weeks: 3,
                        status: 'completed',
                        target_completion_date: '2026-02-15'
                    },
                    {
                        id: 'demo-2',
                        subject_id: selectedSubjectId,
                        term: selectedTerm,
                        academic_year: academicYear,
                        title: 'Fractions, Decimals & Percentages',
                        strand: 'Numbers',
                        sub_strand: 'Fractions',
                        week_start: 4,
                        week_end: 6,
                        duration_weeks: 3,
                        status: 'active',
                        target_completion_date: '2026-03-08'
                    },
                    {
                        id: 'demo-3',
                        subject_id: selectedSubjectId,
                        term: selectedTerm,
                        academic_year: academicYear,
                        title: 'Linear Equations & Inequalities',
                        strand: 'Algebra',
                        sub_strand: 'Equations',
                        week_start: 7,
                        week_end: 10,
                        duration_weeks: 4,
                        status: 'active',
                        target_completion_date: '2026-04-05'
                    }
                ]);
                setIsHOD(true);
                return;
            }

            const res = await TeacherService.getCoveragePlans({
                subject_id: selectedSubjectId,
                term: selectedTerm,
                academic_year: academicYear,
            });

            setPlans(res?.plans || []);
            setIsHOD(Boolean(res?.is_hod));
        } catch (err) {
            console.error("fetchCoveragePlans error:", err);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not load content coverage plans.'
            });
        } finally {
            setLoading(false);
        }
    }, [selectedSubjectId, selectedTerm, academicYear, isDemo]);

    useEffect(() => {
        fetchSubjectsAndHOD();
    }, [fetchSubjectsAndHOD]);

    useEffect(() => {
        if (selectedSubjectId) {
            fetchCoveragePlans();
        }
    }, [selectedSubjectId, selectedTerm, academicYear, fetchCoveragePlans]);

    const handleCreatePlanItem = async () => {
        if (!selectedTerm) {
            Toast.show({
                type: 'error',
                text1: 'Academic Period Required',
                text2: 'Please configure academic terms before creating coverage plan items.'
            });
            return;
        }

        if (!title.trim() || !selectedSubjectId) {
            Toast.show({
                type: 'error',
                text1: 'Required Field',
                text2: 'Please enter a title for the coverage item.'
            });
            return;
        }

        try {
            setSaving(true);
            if (isDemo) {
                const newItem: CoveragePlanItem = {
                    id: Math.random().toString(),
                    subject_id: selectedSubjectId,
                    term: selectedTerm,
                    academic_year: academicYear,
                    title: title.trim(),
                    strand: strand.trim() || undefined,
                    sub_strand: subStrand.trim() || undefined,
                    description: description.trim() || undefined,
                    week_start: parseInt(weekStart) || 1,
                    week_end: parseInt(weekEnd) || 2,
                    duration_weeks: (parseInt(weekEnd) || 2) - (parseInt(weekStart) || 1) + 1,
                    status: 'active',
                    target_completion_date: targetDate || undefined
                };
                setPlans(prev => [...prev, newItem]);
                setShowCreateModal(false);
                resetForm();
                Toast.show({
                    type: 'success',
                    text1: 'Plan Saved',
                    text2: 'Coverage item added successfully.'
                });
                return;
            }

            await TeacherService.createCoveragePlan({
                subject_id: selectedSubjectId,
                term: selectedTerm,
                academic_year: academicYear,
                title: title.trim(),
                strand: strand.trim() || null,
                sub_strand: subStrand.trim() || null,
                description: description.trim() || null,
                week_start: parseInt(weekStart) || 1,
                week_end: parseInt(weekEnd) || 2,
                target_completion_date: targetDate || null,
                status: 'active'
            });

            setShowCreateModal(false);
            resetForm();
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Coverage plan item created.'
            });
            fetchCoveragePlans();
        } catch (err) {
            console.error("handleCreatePlanItem error:", err);
            Toast.show({
                type: 'error',
                text1: 'Save Failed',
                text2: 'Could not create coverage plan item.'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (item: CoveragePlanItem) => {
        const nextStatus = item.status === 'completed' ? 'active' : 'completed';
        try {
            if (isDemo) {
                setPlans(prev => prev.map(p => p.id === item.id ? { ...p, status: nextStatus } : p));
                Toast.show({
                    type: 'success',
                    text1: 'Status Updated',
                    text2: `Item marked as ${nextStatus}.`
                });
                return;
            }

            await TeacherService.updateCoveragePlan(item.id, { status: nextStatus });
            setPlans(prev => prev.map(p => p.id === item.id ? { ...p, status: nextStatus } : p));
            Toast.show({
                type: 'success',
                text1: 'Updated',
                text2: `Item marked as ${nextStatus}.`
            });
        } catch (err) {
            console.error("handleToggleStatus error:", err);
            Toast.show({
                type: 'error',
                text1: 'Update Failed',
                text2: 'Unable to update item status.'
            });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            if (isDemo) {
                setPlans(prev => prev.filter(p => p.id !== id));
                Toast.show({
                    type: 'success',
                    text1: 'Deleted',
                    text2: 'Coverage item removed.'
                });
                return;
            }

            await TeacherService.deleteCoveragePlan(id);
            setPlans(prev => prev.filter(p => p.id !== id));
            Toast.show({
                type: 'success',
                text1: 'Deleted',
                text2: 'Coverage item removed.'
            });
        } catch (err) {
            console.error("handleDelete error:", err);
            Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: 'Unable to delete item.'
            });
        }
    };

    const resetForm = () => {
        setTitle("");
        setStrand("");
        setSubStrand("");
        setDescription("");
        setWeekStart("1");
        setWeekEnd("2");
        setTargetDate("");
    };

    const completedCount = plans.filter(p => p.status === 'completed').length;
    const progressPercent = plans.length > 0 ? Math.round((completedCount / plans.length) * 100) : 0;

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Curriculum"
                subtitle="Coverage Planner"
                role="Teacher"
                fallbackPath="/(teacher)/management"
                rightActions={
                    <HelpTooltip
                        id="teacher.manage.coverage"
                        role="teacher"
                        tier={tier}
                        onLearnMore={(anchor) =>
                            router.push({
                                pathname: "/(teacher)/accessibility/settings" as any,
                                params: { manual: "1", anchor: anchor || "coverage-planner" },
                            } as any)
                        }
                    />
                }
            />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                <View className="p-4 md:p-8">
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-6 px-1">
                        <View>
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                                Curriculum Syllabus Timeline
                            </Text>
                            <Text className="text-gray-900 dark:text-white font-bold text-2xl tracking-tight mt-0.5">
                                Content Coverage
                            </Text>
                        </View>
                        {canWrite && availableTerms.length > 0 && (
                            <ActionTooltip text="Add new curriculum coverage topic">
                                <TouchableOpacity
                                    onPress={() => setShowCreateModal(true)}
                                    className="flex-row items-center bg-[#FF6900] px-4 py-2.5 rounded-xl shadow-sm active:bg-orange-600"
                                >
                                    <Plus size={16} color="white" />
                                    <Text className="text-white font-bold text-xs ml-1.5 uppercase tracking-wider">Add Item</Text>
                                </TouchableOpacity>
                            </ActionTooltip>
                        )}
                    </View>

                    {/* Empty State when no academic periods are configured */}
                    {availableTerms.length === 0 ? (
                        <View className="bg-white dark:bg-[#161B22] p-8 md:p-12 rounded-[32px] items-center border border-dashed border-gray-300 dark:border-gray-800 my-4 shadow-sm">
                            <View className="w-16 h-16 rounded-3xl bg-orange-50 dark:bg-orange-950/40 items-center justify-center mb-4 border border-orange-200 dark:border-orange-800/40">
                                <Calendar size={32} color="#FF6900" />
                            </View>
                            <Text className="text-gray-900 dark:text-white font-bold text-lg text-center tracking-tight">
                                No Terms Available
                            </Text>
                            <Text className="text-gray-500 dark:text-gray-400 text-xs text-center mt-2 max-w-md leading-relaxed">
                                {isAdmin
                                    ? "No academic periods or terms have been configured for this academic year yet — add terms and dates in Academic Setup to begin."
                                    : "No academic periods or terms have been configured for this academic year yet — please contact your school administrator to configure academic terms."}
                            </Text>
                            {isAdmin && (
                                <ActionTooltip text="Open Academic Setup to create academic years and terms">
                                    <TouchableOpacity
                                        onPress={() => router.push('/(admin)/academic-setup')}
                                        className="mt-6 flex-row items-center bg-[#FF6900] px-5 py-3 rounded-xl shadow-sm active:bg-orange-600"
                                    >
                                        <Plus size={16} color="white" />
                                        <Text className="text-white font-bold text-xs ml-2 uppercase tracking-wider">
                                            Configure Academic Periods
                                        </Text>
                                    </TouchableOpacity>
                                </ActionTooltip>
                            )}
                        </View>
                    ) : (
                        <>
                            {/* Term Selector */}
                            <View className="flex-row bg-white dark:bg-[#0D1117] p-1 rounded-2xl border border-gray-200 dark:border-gray-800 mb-5">
                                {availableTerms.map((termOption) => (
                                    <ActionTooltip key={termOption} text={`View coverage for ${termOption}`}>
                                        <TouchableOpacity
                                            onPress={() => setSelectedTerm(termOption)}
                                            className={`flex-1 py-2.5 rounded-xl items-center justify-center ${selectedTerm === termOption ? 'bg-[#FF6900] shadow-sm' : 'bg-transparent'}`}
                                        >
                                            <Text className={`font-bold text-xs uppercase tracking-wider ${selectedTerm === termOption ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {termOption}
                                            </Text>
                                        </TouchableOpacity>
                                    </ActionTooltip>
                                ))}
                            </View>

                            {/* Subject Pill Selector */}
                            <View className="mb-6">
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest mb-2.5 px-1">
                                    Select Subject
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                    {subjects.map((s) => (
                                        <ActionTooltip key={s.id} text={`Select ${s.title}`}>
                                            <TouchableOpacity
                                                onPress={() => setSelectedSubjectId(s.id)}
                                                className={`mr-3 px-4 py-2.5 rounded-2xl border flex-row items-center ${selectedSubjectId === s.id ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-800'}`}
                                            >
                                                <BookOpen size={14} color={selectedSubjectId === s.id ? 'white' : '#6B7280'} />
                                                <Text className={`font-bold text-xs ml-2 ${selectedSubjectId === s.id ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {s.title}
                                                </Text>
                                            </TouchableOpacity>
                                        </ActionTooltip>
                                    ))}
                                </ScrollView>
                            </View>

                    {/* HOD Authority & Progress Banner */}
                    <View className="bg-white dark:bg-[#161B22] p-5 rounded-[28px] border border-gray-200 dark:border-gray-800 mb-6 shadow-sm">
                        <View className="flex-row items-center justify-between mb-4">
                            <View className="flex-row items-center">
                                <View className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 items-center justify-center mr-3 border border-orange-200 dark:border-orange-800/40">
                                    <ShieldCheck size={20} color="#FF6900" />
                                </View>
                                <View>
                                    <Text className="text-gray-900 dark:text-white font-bold text-sm tracking-tight">
                                        {isAdmin ? "Administrative Authority" : (isHOD ? "Subject Head (HOD) Access" : "Faculty Subject View")}
                                    </Text>
                                    <Text className="text-gray-400 dark:text-gray-500 text-[11px] font-medium">
                                        {canWrite ? "You have full planning and modification authority for this subject" : "View termly coverage schedule & track lesson completion"}
                                    </Text>
                                </View>
                            </View>
                            {canWrite && (
                                <View className="bg-[#FF6900]/10 px-2.5 py-1 rounded-full border border-[#FF6900]/20">
                                    <Text className="text-[#FF6900] text-[9px] font-bold uppercase tracking-wider">{isAdmin ? 'ADMIN' : 'HOD'}</Text>
                                </View>
                            )}
                        </View>

                        {/* Progress Bar */}
                        <View className="mt-1">
                            <View className="flex-row justify-between items-center mb-1.5">
                                <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold">
                                    Term Progress: {completedCount}/{plans.length} items covered
                                </Text>
                                <Text className="text-[#FF6900] text-xs font-bold">{progressPercent}%</Text>
                            </View>
                            <View className="w-full h-2.5 bg-gray-100 dark:bg-[#0D1117] rounded-full overflow-hidden">
                                <View
                                    style={{ width: `${progressPercent}%` }}
                                    className="h-full bg-[#FF6900] rounded-full"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Coverage Items List */}
                    <View className="px-1 mb-3">
                        <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                            Planned Topics & Learning Units ({plans.length})
                        </Text>
                    </View>

                    {loading ? (
                        <ListItemSkeleton loading={loading} count={4} label="Loading coverage plans..." />
                    ) : plans.length === 0 ? (
                        <View className="bg-white dark:bg-[#161B22] p-12 rounded-[32px] items-center border border-dashed border-gray-200 dark:border-gray-800">
                            <Layers size={44} color="#D1D5DB" />
                            <Text className="text-gray-900 dark:text-white font-bold text-base mt-4 tracking-tight">
                                No Coverage Plan Set
                            </Text>
                            <Text className="text-gray-400 dark:text-gray-500 text-xs text-center mt-1 max-w-xs font-medium">
                                {canWrite
                                    ? "Define termly curriculum topics, units and weekly lesson durations for this subject."
                                    : "No curriculum coverage plans have been configured for this subject yet."}
                            </Text>
                            {canWrite && (
                                <TouchableOpacity
                                    onPress={() => setShowCreateModal(true)}
                                    className="mt-5 bg-[#FF6900] px-5 py-2.5 rounded-xl shadow-sm active:bg-orange-600"
                                >
                                    <Text className="text-white font-bold text-xs uppercase tracking-wider">Set Up Plan</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        plans.map((item) => (
                            <View
                                key={item.id}
                                className="bg-white dark:bg-[#161B22] p-5 rounded-[28px] border border-gray-200 dark:border-gray-800 mb-4 shadow-sm"
                            >
                                <View className="flex-row justify-between items-start mb-3">
                                    <View className="flex-row items-center gap-2 flex-wrap flex-1 mr-2">
                                        <View className="bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-800/40">
                                            <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-wider">
                                                Weeks {item.week_start}–{item.week_end}
                                            </Text>
                                        </View>
                                        {item.strand && (
                                            <View className="bg-gray-100 dark:bg-[#0D1117] px-2.5 py-1 rounded-lg">
                                                <Text className="text-gray-600 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                                                    Topic Area: {item.strand}
                                                </Text>
                                            </View>
                                        )}
                                        {item.sub_strand && (
                                            <View className="bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg">
                                                <Text className="text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                                                    {item.sub_strand}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    <View className="flex-row items-center gap-2">
                                        <ActionTooltip text={item.status === 'completed' ? 'Reopen topic to active status' : 'Mark topic as completed'}>
                                            <TouchableOpacity
                                                onPress={() => handleToggleStatus(item)}
                                                className={`px-3 py-1 rounded-full border ${item.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-600' : 'bg-gray-50 dark:bg-gray-900 border-gray-200'}`}
                                            >
                                                <Text className={`text-[10px] font-bold uppercase tracking-widest ${item.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
                                                    {item.status}
                                                </Text>
                                            </TouchableOpacity>
                                        </ActionTooltip>

                                        {canWrite && (
                                            <ActionTooltip text="Delete coverage item">
                                                <TouchableOpacity
                                                    onPress={() => handleDelete(item.id)}
                                                    className="p-1.5 text-gray-400 active:opacity-60"
                                                >
                                                    <Trash2 size={16} color="#EF4444" />
                                                </TouchableOpacity>
                                            </ActionTooltip>
                                        )}
                                    </View>
                                </View>

                                <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight mb-1">
                                    {item.title}
                                </Text>
                                {item.description ? (
                                    <Text className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-3 leading-relaxed">
                                        {item.description}
                                    </Text>
                                ) : null}

                                <View className="flex-row items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                                    <View className="flex-row items-center">
                                        <Clock size={13} color="#9CA3AF" />
                                        <Text className="text-gray-400 text-[11px] font-medium ml-1.5">
                                            {item.duration_weeks || 1} {item.duration_weeks === 1 ? 'week' : 'weeks'} allocated
                                        </Text>
                                    </View>
                                    {item.target_completion_date && (
                                        <View className="flex-row items-center">
                                            <Calendar size={13} color="#9CA3AF" />
                                            <Text className="text-gray-400 text-[11px] font-medium ml-1.5">
                                                Target: {item.target_completion_date}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))
                    )}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Create Item Modal */}
            <Modal visible={showCreateModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white dark:bg-[#161B22] rounded-t-[36px] p-6 pb-12 border-t border-gray-200 dark:border-gray-800 max-h-[90%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <View>
                                <Text className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    Add Coverage Topic
                                </Text>
                                <Text className="text-gray-400 text-xs font-medium mt-0.5">
                                    Termly Syllabus Unit for {selectedTerm}
                                </Text>
                            </View>
                            <ActionTooltip text="Close modal">
                                <TouchableOpacity
                                    className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#0D1117] items-center justify-center"
                                    onPress={() => setShowCreateModal(false)}
                                >
                                    <X size={18} color="#6B7280" />
                                </TouchableOpacity>
                            </ActionTooltip>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Title */}
                            <View className="mb-4">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                    Topic Title *
                                </Text>
                                <TextInput
                                    className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3.5 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm"
                                    placeholder="e.g. Living Things & Ecosystems"
                                    placeholderTextColor="#9CA3AF"
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            {/* Topic Area & Sub-area */}
                            <View className="flex-row gap-3 mb-4">
                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                        Topic Area
                                    </Text>
                                    <TextInput
                                        className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm"
                                        placeholder="e.g. Science & Tech"
                                        placeholderTextColor="#9CA3AF"
                                        value={strand}
                                        onChangeText={setStrand}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                        Topic / Sub-area
                                    </Text>
                                    <TextInput
                                        className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm"
                                        placeholder="e.g. Plant Biology"
                                        placeholderTextColor="#9CA3AF"
                                        value={subStrand}
                                        onChangeText={setSubStrand}
                                    />
                                </View>
                            </View>

                            {/* Weeks */}
                            <View className="flex-row gap-3 mb-4">
                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                        Start Week *
                                    </Text>
                                    <ActionTooltip text="Choose start instructional week">
                                        <TouchableOpacity
                                            onPress={() => setShowStartWeekPicker(true)}
                                            className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 flex-row items-center justify-between"
                                        >
                                            <Text className="text-gray-900 dark:text-white font-medium text-sm">
                                                {calculatedWeeks.find(w => w.weekNumber === parseInt(weekStart))?.label || `Week ${weekStart}`}
                                            </Text>
                                            <Calendar size={14} color="#6B7280" />
                                        </TouchableOpacity>
                                    </ActionTooltip>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                        End Week *
                                    </Text>
                                    <ActionTooltip text="Choose end instructional week">
                                        <TouchableOpacity
                                            onPress={() => setShowEndWeekPicker(true)}
                                            className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 flex-row items-center justify-between"
                                        >
                                            <Text className="text-gray-900 dark:text-white font-medium text-sm">
                                                {calculatedWeeks.find(w => w.weekNumber === parseInt(weekEnd))?.label || `Week ${weekEnd}`}
                                            </Text>
                                            <Calendar size={14} color="#6B7280" />
                                        </TouchableOpacity>
                                    </ActionTooltip>
                                </View>
                            </View>

                            {/* Target Date with DatePicker */}
                            <View className="mb-4">
                                <DatePicker
                                    label="Target Completion Date"
                                    value={targetDate}
                                    onChange={(selected) => setTargetDate(selected)}
                                    placeholder="Select completion date"
                                />
                            </View>

                            {/* Description */}
                            <View className="mb-6">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                    Learning Objectives & Notes
                                </Text>
                                <TextInput
                                    className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm"
                                    placeholder="Key competencies, activities, and curriculum references..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    numberOfLines={3}
                                    style={{ height: 80, textAlignVertical: 'top' }}
                                    value={description}
                                    onChangeText={setDescription}
                                />
                            </View>

                            {(() => {
                                const canSave = !!title.trim() && !!selectedSubjectId && !!selectedTerm && !saving;
                                return (
                                    <ActionTooltip text={canSave ? "Save coverage plan item" : "Fill required fields to save"}>
                                        <TouchableOpacity
                                            onPress={handleCreatePlanItem}
                                            disabled={!canSave}
                                            style={{ opacity: canSave ? 1 : 0.5 }}
                                            className="bg-[#FF6900] py-4 rounded-xl items-center shadow-md active:bg-orange-600 mb-6"
                                            accessibilityState={{ disabled: !canSave, busy: saving }}
                                        >
                                            {saving ? (
                                                <ActivityIndicator size="small" color="white" />
                                            ) : (
                                                <Text className="text-white font-bold text-base">Save Coverage Item</Text>
                                            )}
                                        </TouchableOpacity>
                                    </ActionTooltip>
                                );
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Start Week Picker Modal */}
            <WeekPickerModal
                visible={showStartWeekPicker}
                onClose={() => setShowStartWeekPicker(false)}
                weeks={calculatedWeeks}
                selectedWeekNumber={parseInt(weekStart)}
                onSelectWeek={(w) => setWeekStart(String(w.weekNumber))}
                title="Select Start Week"
                subtitle={`Instructional week for ${selectedTerm}`}
            />

            {/* End Week Picker Modal */}
            <WeekPickerModal
                visible={showEndWeekPicker}
                onClose={() => setShowEndWeekPicker(false)}
                weeks={calculatedWeeks}
                selectedWeekNumber={parseInt(weekEnd)}
                onSelectWeek={(w) => setWeekEnd(String(w.weekNumber))}
                title="Select End Week"
                subtitle={`Instructional week for ${selectedTerm}`}
            />
        </View>
    );
}
