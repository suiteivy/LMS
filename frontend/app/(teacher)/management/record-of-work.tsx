import { ActionTooltip } from "@/components/common/ActionTooltip";
import { DatePicker } from "@/components/common/DatePicker";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { WeekPickerModal } from "@/components/common/WeekPickerModal";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarAPI } from "@/services/CalendarService";
import { ClassAPI } from "@/services/ClassService";
import { GradingAPI } from "@/services/GradingService";
import { SubjectAPI } from "@/services/SubjectService";
import { TeacherService } from "@/services/TeacherService";
import {
    AcademicTermItem,
    calculateWeeksForYear,
    CalendarEventItem,
    createDefaultFallbackWeeks,
    findWeekForDate,
    InstructionalWeek
} from "@/utils/academicWeekEngine";
import { router } from "expo-router";
import {
    AlertTriangle,
    BookOpen,
    Calendar,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    FileEdit,
    GraduationCap,
    Link2,
    MessageSquare,
    PenTool,
    Plus,
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

interface RecordOfWorkItem {
    id: string;
    subject_id: string;
    class_id?: string;
    coverage_plan_id?: string;
    coverage_plan?: { id: string; title: string; strand?: string; sub_strand?: string };
    class?: { id: string; name?: string; display_name?: string; grade_level?: number; stream?: string };
    week_number: number;
    lesson_number: number;
    duration_minutes?: number;
    date: string;
    topic: string;
    sub_topic?: string;
    learning_objectives?: string;
    activities_references?: string;
    status: 'planned' | 'in_progress' | 'completed' | 'deferred';
    is_completed: boolean;
    completed_at?: string;
    remarks?: string;
    admin_notes?: string;
}

export default function RecordOfWorkPage() {
    const { teacherId, isDemo, user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'principal' || user?.role === 'head_teacher';
    const [subjects, setSubjects] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [records, setRecords] = useState<RecordOfWorkItem[]>([]);
    const [coveragePlans, setCoveragePlans] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Academic Period & Week Engine State
    const [termsObjects, setTermsObjects] = useState<AcademicTermItem[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
    const [calculatedWeeks, setCalculatedWeeks] = useState<InstructionalWeek[]>([]);
    const [showWeekPickerModal, setShowWeekPickerModal] = useState<boolean>(false);
    const [academicYear, setAcademicYear] = useState<string>("");

    // Create Modal
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    // Form
    const [formWeek, setFormWeek] = useState("1");
    const [formLesson, setFormLesson] = useState("1");
    const [formDuration, setFormDuration] = useState("40");
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [cancellationNotice, setCancellationNotice] = useState<{ is_cancelled: boolean; event_name?: string | null } | null>(null);
    const [formTopic, setFormTopic] = useState("");
    const [formSubTopic, setFormSubTopic] = useState("");
    const [formObjectives, setFormObjectives] = useState("");
    const [formActivities, setFormActivities] = useState("");
    const [formCoveragePlanId, setFormCoveragePlanId] = useState<string>("");
    const [formRemarks, setFormRemarks] = useState("");

    // Reflection Modal
    const [reflectionModalItem, setReflectionModalItem] = useState<RecordOfWorkItem | null>(null);
    const [reflectionText, setReflectionText] = useState("");

    const handleDateChange = async (newDate: string) => {
        setFormDate(newDate);
        if (!newDate) return;

        // Instant matching using client-side calculated academic weeks
        const matchingWeek = findWeekForDate(newDate, calculatedWeeks);
        if (matchingWeek) {
            setFormWeek(String(matchingWeek.weekNumber));
            const isBreak = matchingWeek.status === 'non_instructional' || matchingWeek.isBreak;
            const isPartial = matchingWeek.status === 'partial' || matchingWeek.isPartial;
            const reasons = (matchingWeek.holidayReasons && matchingWeek.holidayReasons.length > 0)
                ? matchingWeek.holidayReasons.join(', ')
                : (matchingWeek.events && matchingWeek.events.length > 0)
                ? matchingWeek.events.map(e => e.title).join(', ')
                : '';

            if (isBreak) {
                setCancellationNotice({
                    is_cancelled: true,
                    event_name: reasons || "School Break / Holiday"
                });
            } else if (isPartial) {
                const dayEvents = calendarEvents.filter(e => {
                    const eStart = (e.event_date || e.start_date || '').split('T')[0];
                    const eEnd = (e.end_date || eStart).split('T')[0];
                    return newDate >= eStart && newDate <= eEnd;
                });
                if (dayEvents.length > 0) {
                    setCancellationNotice({
                        is_cancelled: true,
                        event_name: dayEvents.map(e => e.title || e.name).filter(Boolean).join(', ')
                    });
                } else {
                    setCancellationNotice(null);
                }
            } else {
                setCancellationNotice(null);
            }
        }

        try {
            const info = await TeacherService.detectLessonDateInfo(newDate);
            if (info) {
                if (!matchingWeek && info.week_number) {
                    setFormWeek(String(info.week_number));
                }
                if (info.is_cancelled) {
                    setCancellationNotice({
                        is_cancelled: true,
                        event_name: info.cancellation_event || "Holiday / School Event (Classes Cancelled)"
                    });
                }
            }
        } catch {
            // Graceful fallback
        }
    };

    const fetchFilters = useCallback(async () => {
        try {
            const [subjList, allClsList] = await Promise.all([
                SubjectAPI.getFilteredSubjects().catch(() => []),
                ClassAPI.getClasses().catch(() => [])
            ]);

            setSubjects(subjList || []);

            let scopedClasses: any[] = [];
            if (isAdmin) {
                scopedClasses = allClsList || [];
            } else {
                // Scope to classes from taught subjects
                const classIds = new Set<string>();
                (subjList || []).forEach((s: any) => {
                    if (s.class_id) classIds.add(s.class_id);
                    if (Array.isArray(s.class_ids)) s.class_ids.forEach((id: string) => classIds.add(id));
                    if (s.classes) {
                        if (Array.isArray(s.classes)) s.classes.forEach((c: any) => classIds.add(c.id));
                        else if (s.classes.id) classIds.add(s.classes.id);
                    }
                });
                scopedClasses = (allClsList || []).filter((c: any) => classIds.has(c.id));
                if (scopedClasses.length === 0) {
                    scopedClasses = allClsList || [];
                }
            }
            setClasses(scopedClasses);

            if (subjList && subjList.length > 0 && !selectedSubjectId) {
                setSelectedSubjectId(subjList[0].id);
            }

            if (!isDemo) {
                let activeYearId = "";
                try {
                    const years = await GradingAPI.getAcademicYears();
                    const activeYear = (years || []).find((y: any) => y.is_current) || (years || [])[0] || null;
                    if (activeYear) {
                        setAcademicYear(activeYear.name);
                        activeYearId = activeYear.id;
                    }
                } catch (e) {
                    console.error("fetchAcademicYears error in record-of-work:", e);
                }

                let termsList: AcademicTermItem[] = [];
                try {
                    const termsData = await GradingAPI.getTerms(activeYearId || undefined).catch(() => []);
                    if (Array.isArray(termsData) && termsData.length > 0) {
                        termsList = [...termsData].sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
                        setTermsObjects(termsList);
                    } else {
                        setTermsObjects([]);
                    }
                } catch (e) {
                    console.error("fetchTerms error in record-of-work:", e);
                    setTermsObjects([]);
                }

                let eventsList: CalendarEventItem[] = [];
                try {
                    const evs = await CalendarAPI.getEvents().catch(() => []);
                    eventsList = evs || [];
                    setCalendarEvents(eventsList);
                } catch {
                    setCalendarEvents([]);
                }

                if (termsList.length > 0) {
                    const weeks = calculateWeeksForYear(termsList, eventsList);
                    setCalculatedWeeks(weeks);
                } else {
                    setCalculatedWeeks([]);
                }
            }
        } catch (err) {
            console.error("fetchFilters error:", err);
        }
    }, [selectedSubjectId, isAdmin, isDemo]);

    const fetchRecords = useCallback(async () => {
        if (!selectedSubjectId) return;
        try {
            setLoading(true);
            if (isDemo) {
                setRecords([
                    {
                        id: 'row-1',
                        subject_id: selectedSubjectId,
                        class_id: selectedClassId || 'class-1',
                        week_number: 1,
                        lesson_number: 1,
                        date: '2026-01-12',
                        topic: 'Place Value up to 1,000,000',
                        sub_topic: 'Reading & Writing large numbers in words',
                        learning_objectives: 'By end of lesson, learner can express 6-digit values in expanded form.',
                        activities_references: 'Pupils Book page 4-6, number charts.',
                        status: 'completed',
                        is_completed: true,
                        completed_at: '2026-01-12T10:00:00Z',
                        remarks: 'Learners demonstrated 85% mastery. Remedial needed for 3 students.'
                    },
                    {
                        id: 'row-2',
                        subject_id: selectedSubjectId,
                        class_id: selectedClassId || 'class-1',
                        week_number: 1,
                        lesson_number: 2,
                        date: '2026-01-14',
                        topic: 'Rounding Off to Nearest Thousand',
                        sub_topic: 'Estimation and approximation techniques',
                        learning_objectives: 'Learner can approximate values up to nearest 10,000.',
                        activities_references: 'Group activities using price lists.',
                        status: 'completed',
                        is_completed: true,
                        completed_at: '2026-01-14T11:30:00Z',
                        remarks: 'Well executed, active learner participation.'
                    },
                    {
                        id: 'row-3',
                        subject_id: selectedSubjectId,
                        class_id: selectedClassId || 'class-1',
                        week_number: 2,
                        lesson_number: 1,
                        date: '2026-01-19',
                        topic: 'Operations on Fractions',
                        sub_topic: 'Addition of unlike fractions',
                        learning_objectives: 'Identify LCM to compute sums of unlike fractions.',
                        activities_references: 'Fractions strips & textbook pg 12.',
                        status: 'planned',
                        is_completed: false
                    }
                ]);
                return;
            }

            const [recordsData, plansData] = await Promise.all([
                TeacherService.getRecordOfWork({
                    subject_id: selectedSubjectId,
                    class_id: selectedClassId || undefined,
                    week_number: selectedWeek || undefined,
                }),
                TeacherService.getCoveragePlans({ subject_id: selectedSubjectId }).catch(() => ({ plans: [] }))
            ]);

            setRecords(recordsData || []);
            setCoveragePlans(plansData?.plans || []);
        } catch (err) {
            console.error("fetchRecords error:", err);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load record of work.'
            });
        } finally {
            setLoading(false);
        }
    }, [selectedSubjectId, selectedClassId, selectedWeek, isDemo]);

    useEffect(() => {
        fetchFilters();
    }, [fetchFilters]);

    useEffect(() => {
        if (selectedSubjectId) {
            fetchRecords();
        }
    }, [selectedSubjectId, selectedClassId, selectedWeek, fetchRecords]);

    const handleCreateEntry = async () => {
        if (!formTopic.trim() || !selectedSubjectId || !formWeek) {
            Toast.show({
                type: 'error',
                text1: 'Required Field',
                text2: 'Please fill in the topic and week number.'
            });
            return;
        }

        try {
            setSaving(true);
            let finalRemarks = formRemarks.trim();
            if (cancellationNotice?.is_cancelled) {
                const cancelText = `[Lesson on Cancelled Date / Event: ${cancellationNotice.event_name}]`;
                if (!finalRemarks.includes(cancelText)) {
                    finalRemarks = finalRemarks ? `${finalRemarks} - ${cancelText}` : cancelText;
                }
            }

            if (isDemo) {
                const newRec: RecordOfWorkItem = {
                    id: Math.random().toString(),
                    subject_id: selectedSubjectId,
                    class_id: selectedClassId || undefined,
                    week_number: parseInt(formWeek) || 1,
                    lesson_number: parseInt(formLesson) || 1,
                    duration_minutes: parseInt(formDuration) || 40,
                    date: formDate,
                    topic: formTopic.trim(),
                    sub_topic: formSubTopic.trim() || undefined,
                    learning_objectives: formObjectives.trim() || undefined,
                    activities_references: formActivities.trim() || undefined,
                    coverage_plan_id: formCoveragePlanId || undefined,
                    status: 'planned',
                    is_completed: false,
                    remarks: finalRemarks || undefined
                };
                setRecords(prev => [...prev, newRec]);
                setShowCreateModal(false);
                resetForm();
                Toast.show({
                    type: 'success',
                    text1: 'Created',
                    text2: 'Lesson entry added to record of work.'
                });
                return;
            }

            await TeacherService.createRecordOfWork({
                subject_id: selectedSubjectId,
                class_id: selectedClassId || null,
                week_number: parseInt(formWeek) || 1,
                lesson_number: parseInt(formLesson) || 1,
                duration_minutes: parseInt(formDuration) || 40,
                date: formDate,
                topic: formTopic.trim(),
                sub_topic: formSubTopic.trim() || null,
                learning_objectives: formObjectives.trim() || null,
                activities_references: formActivities.trim() || null,
                coverage_plan_id: formCoveragePlanId || null,
                remarks: finalRemarks || null,
                status: 'planned'
            });

            setShowCreateModal(false);
            resetForm();
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Lesson entry saved.'
            });
            fetchRecords();
        } catch (err) {
            console.error("handleCreateEntry error:", err);
            Toast.show({
                type: 'error',
                text1: 'Save Failed',
                text2: 'Could not create record of work entry.'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleComplete = async (item: RecordOfWorkItem) => {
        if (!item.is_completed) {
            // Open reflection modal before finalizing
            setReflectionModalItem(item);
            setReflectionText(item.remarks || "");
            return;
        }

        // Unmarking
        try {
            if (isDemo) {
                setRecords(prev => prev.map(r => r.id === item.id ? { ...r, is_completed: false, status: 'planned' } : r));
                Toast.show({ type: 'success', text1: 'Status Updated', text2: 'Lesson marked as planned.' });
                return;
            }

            await TeacherService.updateRecordOfWork(item.id, { is_completed: false, status: 'planned' });
            setRecords(prev => prev.map(r => r.id === item.id ? { ...r, is_completed: false, status: 'planned' } : r));
            Toast.show({ type: 'success', text1: 'Status Updated', text2: 'Lesson marked as planned.' });
        } catch (err) {
            console.error("handleToggleComplete error:", err);
            Toast.show({ type: 'error', text1: 'Update Failed', text2: 'Could not update completion status.' });
        }
    };

    const handleSaveReflection = async () => {
        if (!reflectionModalItem) return;
        try {
            if (isDemo) {
                setRecords(prev => prev.map(r => r.id === reflectionModalItem.id ? {
                    ...r,
                    is_completed: true,
                    status: 'completed',
                    remarks: reflectionText.trim() || undefined,
                    completed_at: new Date().toISOString()
                } : r));
                setReflectionModalItem(null);
                Toast.show({ type: 'success', text1: 'Lesson Completed', text2: 'Taught status and reflection recorded.' });
                return;
            }

            await TeacherService.updateRecordOfWork(reflectionModalItem.id, {
                is_completed: true,
                status: 'completed',
                remarks: reflectionText.trim() || null
            });

            setRecords(prev => prev.map(r => r.id === reflectionModalItem.id ? {
                ...r,
                is_completed: true,
                status: 'completed',
                remarks: reflectionText.trim() || undefined,
                completed_at: new Date().toISOString()
            } : r));
            setReflectionModalItem(null);
            Toast.show({ type: 'success', text1: 'Lesson Completed', text2: 'Taught status and reflection recorded.' });
        } catch (err) {
            console.error("handleSaveReflection error:", err);
            Toast.show({ type: 'error', text1: 'Save Failed', text2: 'Could not save reflection.' });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            if (isDemo) {
                setRecords(prev => prev.filter(r => r.id !== id));
                Toast.show({ type: 'success', text1: 'Deleted', text2: 'Record removed.' });
                return;
            }

            await TeacherService.deleteRecordOfWork(id);
            setRecords(prev => prev.filter(r => r.id !== id));
            Toast.show({ type: 'success', text1: 'Deleted', text2: 'Record removed.' });
        } catch (err) {
            console.error("handleDelete error:", err);
            Toast.show({ type: 'error', text1: 'Delete Failed', text2: 'Could not delete record.' });
        }
    };

    const resetForm = () => {
        setFormWeek("1");
        setFormLesson("1");
        setFormDuration("40");
        setFormDate(new Date().toISOString().split('T')[0]);
        setCancellationNotice(null);
        setFormTopic("");
        setFormSubTopic("");
        setFormObjectives("");
        setFormActivities("");
        setFormCoveragePlanId("");
        setFormRemarks("");
    };

    const completedLessons = records.filter(r => r.is_completed).length;
    const completionPercent = records.length > 0 ? Math.round((completedLessons / records.length) * 100) : 0;

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Academic"
                subtitle="Record of Work"
                role="Teacher"
                fallbackPath="/(teacher)/management"
            />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                <View className="p-4 md:p-8">
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-6 px-1">
                        <View>
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                                Lesson-by-Lesson Log
                            </Text>
                            <Text className="text-gray-900 dark:text-white font-bold text-2xl tracking-tight mt-0.5">
                                Record of Work
                            </Text>
                        </View>
                        <ActionTooltip text="Log a new taught or planned lesson">
                            <TouchableOpacity
                                onPress={() => setShowCreateModal(true)}
                                className="flex-row items-center bg-[#FF6900] px-4 py-2.5 rounded-xl shadow-sm active:bg-orange-600"
                            >
                                <Plus size={16} color="white" />
                                <Text className="text-white font-bold text-xs ml-1.5 uppercase tracking-wider">Add Lesson</Text>
                            </TouchableOpacity>
                        </ActionTooltip>
                    </View>

                    {/* Empty State when no academic periods are configured */}
                    {termsObjects.length === 0 && !isDemo ? (
                        <View className="bg-white dark:bg-[#161B22] p-8 md:p-12 rounded-[32px] items-center border border-dashed border-gray-300 dark:border-gray-800 my-4 shadow-sm">
                            <View className="w-16 h-16 rounded-3xl bg-orange-50 dark:bg-orange-950/40 items-center justify-center mb-4 border border-orange-200 dark:border-orange-800/40">
                                <Calendar size={32} color="#FF6900" />
                            </View>
                            <Text className="text-gray-900 dark:text-white font-bold text-lg text-center tracking-tight">
                                {isAdmin ? "No Academic Periods Configured" : "Academic Periods Not Configured"}
                            </Text>
                            <Text className="text-gray-500 dark:text-gray-400 text-xs text-center mt-2 max-w-md leading-relaxed">
                                {isAdmin
                                    ? "Academic periods haven't been set up for this year yet — add terms and dates in Academic Setup to begin."
                                    : "Academic periods haven't been set up for this year yet — contact your school admin to add terms and dates."}
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
                            {/* Subject Selector */}
                            <View className="mb-4">
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest mb-2 px-1">
                                    Subject
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                    {subjects.map((s) => (
                                        <ActionTooltip key={s.id} text={`Select ${s.title}`}>
                                            <TouchableOpacity
                                                onPress={() => setSelectedSubjectId(s.id)}
                                                className={`mr-3 px-4 py-2 rounded-2xl border flex-row items-center ${selectedSubjectId === s.id ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-800'}`}
                                            >
                                                <BookOpen size={13} color={selectedSubjectId === s.id ? 'white' : '#6B7280'} />
                                                <Text className={`font-bold text-xs ml-2 ${selectedSubjectId === s.id ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {s.title}
                                                </Text>
                                            </TouchableOpacity>
                                        </ActionTooltip>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Class Selector */}
                            {classes.length > 0 && (
                                <View className="mb-5">
                                    <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest mb-2 px-1">
                                        Class / Stream
                                    </Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                        <ActionTooltip text="Show lessons for all assigned classes">
                                            <TouchableOpacity
                                                onPress={() => setSelectedClassId("")}
                                                className={`mr-3 px-3.5 py-1.5 rounded-xl border ${selectedClassId === "" ? 'bg-gray-900 dark:bg-white border-transparent' : 'bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-800'}`}
                                            >
                                                <Text className={`font-bold text-xs ${selectedClassId === "" ? 'text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400'}`}>
                                                    All Classes
                                                </Text>
                                            </TouchableOpacity>
                                        </ActionTooltip>
                                        {classes.map((c) => (
                                            <ActionTooltip key={c.id} text={`Filter by ${c.display_name || c.name || `Grade ${c.grade_level}`}`}>
                                                <TouchableOpacity
                                                    onPress={() => setSelectedClassId(c.id)}
                                                    className={`mr-3 px-3.5 py-1.5 rounded-xl border flex-row items-center ${selectedClassId === c.id ? 'bg-gray-900 dark:bg-white border-transparent' : 'bg-white dark:bg-[#161B22] border-gray-200 dark:border-gray-800'}`}
                                                >
                                                    <GraduationCap size={13} color={selectedClassId === c.id ? (selectedClassId ? 'white' : '#111') : '#6B7280'} />
                                                    <Text className={`font-bold text-xs ml-1.5 ${selectedClassId === c.id ? 'text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400'}`}>
                                                        {c.display_name || c.name || `Grade ${c.grade_level}`}
                                                    </Text>
                                                </TouchableOpacity>
                                            </ActionTooltip>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Progress Summary Card */}
                            <View className="bg-white dark:bg-[#161B22] p-5 rounded-[28px] border border-gray-200 dark:border-gray-800 mb-6 shadow-sm">
                                <View className="flex-row items-center justify-between mb-3">
                                    <View>
                                        <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-widest">
                                            Teaching Progress
                                        </Text>
                                        <Text className="text-gray-900 dark:text-white font-bold text-xl tracking-tight mt-0.5">
                                            {completedLessons} of {records.length} Lessons Taught
                                        </Text>
                                    </View>
                                    <View className="bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                                        <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                                            {completionPercent}% Covered
                                        </Text>
                                    </View>
                                </View>
                                <View className="w-full h-2 bg-gray-100 dark:bg-[#0D1117] rounded-full overflow-hidden">
                                    <View style={{ width: `${completionPercent}%` }} className="h-full bg-emerald-500 rounded-full" />
                                </View>
                            </View>

                            {/* Week Filter Pills (Driven by Academic Week Engine) */}
                            <View className="mb-4">
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                    <ActionTooltip text="Show lessons from all instructional weeks">
                                        <TouchableOpacity
                                            onPress={() => setSelectedWeek(null)}
                                            className={`mr-2 px-3 py-1.5 rounded-xl ${selectedWeek === null ? 'bg-[#FF6900]' : 'bg-gray-200 dark:bg-[#0D1117]'}`}
                                        >
                                            <Text className={`text-xs font-bold ${selectedWeek === null ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                All Weeks
                                            </Text>
                                        </TouchableOpacity>
                                    </ActionTooltip>
                                    {(calculatedWeeks.length > 0
                                        ? calculatedWeeks
                                        : createDefaultFallbackWeeks(14)
                                    ).map((wk) => {
                                        const isSelected = selectedWeek === wk.weekNumber;
                                        const isBreak = wk.status === 'non_instructional' || Boolean(wk.isBreak);
                                        const isPartial = wk.status === 'partial' || Boolean(wk.isPartial);
                                        const reasons = (wk.holidayReasons && wk.holidayReasons.length > 0)
                                            ? wk.holidayReasons.join(', ')
                                            : (wk.events && wk.events.length > 0)
                                            ? wk.events.map(e => e.title).join(', ')
                                            : '';
                                        const tooltipText = isBreak
                                            ? `Week ${wk.weekNumber} (${wk.termName}) - Break / Recess${reasons ? ` (${reasons})` : ''}`
                                            : isPartial
                                            ? `Week ${wk.weekNumber} (${wk.termName}) - Partial: ${wk.instructionalDays} teaching days${reasons ? ` (${reasons})` : ''}`
                                            : wk.startDate && wk.endDate
                                            ? `Week ${wk.weekNumber} (${wk.termName}) - ${wk.startDate} to ${wk.endDate}`
                                            : `Week ${wk.weekNumber}`;
                                        return (
                                            <ActionTooltip key={wk.weekNumber} text={tooltipText}>
                                                <TouchableOpacity
                                                    onPress={() => setSelectedWeek(wk.weekNumber)}
                                                    className={`mr-2 px-3 py-1.5 rounded-xl flex-row items-center ${isSelected ? 'bg-[#FF6900]' : 'bg-gray-200 dark:bg-[#0D1117]'}`}
                                                >
                                                    <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                                        Wk {wk.weekNumber}
                                                    </Text>
                                                    {isPartial && (
                                                        <View className={`ml-1.5 w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
                                                    )}
                                                    {isBreak && (
                                                        <View className={`ml-1.5 w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'}`} />
                                                    )}
                                                </TouchableOpacity>
                                            </ActionTooltip>
                                        );
                                    })}
                                </ScrollView>
                            </View>

                            {/* Record Cards */}
                            {loading ? (
                                <ListItemSkeleton loading={loading} count={4} label="Loading record of work..." />
                            ) : records.length === 0 ? (
                                <View className="bg-white dark:bg-[#161B22] p-12 rounded-[32px] items-center border border-dashed border-gray-200 dark:border-gray-800">
                                    <BookOpen size={44} color="#D1D5DB" />
                                    <Text className="text-gray-900 dark:text-white font-bold text-base mt-4 tracking-tight">
                                        No Lesson Records Yet
                                    </Text>
                                    <Text className="text-gray-400 dark:text-gray-500 text-xs text-center mt-1 max-w-xs font-medium">
                                        Start recording lessons taught, learner comprehension reflections, and references.
                                    </Text>
                                    <ActionTooltip text="Log your first lesson plan">
                                        <TouchableOpacity
                                            onPress={() => setShowCreateModal(true)}
                                            className="mt-5 bg-[#FF6900] px-5 py-2.5 rounded-xl shadow-sm active:bg-orange-600"
                                        >
                                            <Text className="text-white font-bold text-xs uppercase tracking-wider">Log First Lesson</Text>
                                        </TouchableOpacity>
                                    </ActionTooltip>
                                </View>
                            ) : (
                                records.map((item) => (
                                    <View
                                        key={item.id}
                                        className={`bg-white dark:bg-[#161B22] p-5 rounded-[28px] border mb-4 shadow-sm ${item.is_completed ? 'border-emerald-200 dark:border-emerald-900/40' : 'border-gray-200 dark:border-gray-800'}`}
                                    >
                                        {/* Top Tag Row */}
                                        <View className="flex-row justify-between items-start mb-3">
                                            <View className="flex-row items-center gap-2 flex-wrap flex-1 mr-2">
                                                <View className="bg-orange-50 dark:bg-orange-950/40 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-800/40">
                                                    <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-wider">
                                                        Week {item.week_number} • Lesson {item.lesson_number}
                                                    </Text>
                                                </View>
                                                <View className="flex-row items-center bg-gray-100 dark:bg-[#0D1117] px-2.5 py-1 rounded-lg">
                                                    <Calendar size={11} color="#6B7280" />
                                                    <Text className="text-gray-600 dark:text-gray-400 text-[10px] font-bold ml-1">
                                                        {item.date}
                                                    </Text>
                                                </View>
                                                {item.duration_minutes ? (
                                                    <View className="flex-row items-center bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg">
                                                        <Clock size={11} color="#D97706" />
                                                        <Text className="text-amber-700 dark:text-amber-400 text-[10px] font-bold ml-1">
                                                            {item.duration_minutes}m
                                                        </Text>
                                                    </View>
                                                ) : null}
                                                {item.coverage_plan ? (
                                                    <View className="flex-row items-center bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg">
                                                        <Link2 size={11} color="#2563EB" />
                                                        <Text className="text-blue-600 dark:text-blue-400 text-[10px] font-bold ml-1" numberOfLines={1}>
                                                            Plan: {item.coverage_plan.title}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <View className="flex-row items-center bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg">
                                                        <PenTool size={11} color="#7C3AED" />
                                                        <Text className="text-purple-700 dark:text-purple-400 text-[10px] font-bold ml-1">
                                                            Teacher Lesson
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <ActionTooltip text="Delete this lesson record">
                                                <TouchableOpacity
                                                    onPress={() => handleDelete(item.id)}
                                                    className="p-1 text-gray-400 active:opacity-60"
                                                >
                                                    <Trash2 size={15} color="#EF4444" />
                                                </TouchableOpacity>
                                            </ActionTooltip>
                                        </View>

                                        {/* Topic & Sub-Topic */}
                                        <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight mb-0.5">
                                            {item.topic}
                                        </Text>
                                        {item.sub_topic ? (
                                            <Text className="text-gray-500 dark:text-gray-400 text-xs font-semibold mb-2">
                                                Sub-topic: {item.sub_topic}
                                            </Text>
                                        ) : null}

                                        {/* Objectives & References */}
                                        {item.learning_objectives ? (
                                            <View className="bg-[#F6F8FA] dark:bg-[#0D1117] p-3 rounded-xl mb-2.5 border border-gray-100 dark:border-gray-800">
                                                <Text className="text-gray-400 dark:text-gray-500 text-[9px] font-bold uppercase tracking-wider mb-1">
                                                    Learning Objectives
                                                </Text>
                                                <Text className="text-gray-700 dark:text-gray-300 text-xs font-medium leading-relaxed">
                                                    {item.learning_objectives}
                                                </Text>
                                            </View>
                                        ) : null}

                                        {item.activities_references ? (
                                            <Text className="text-gray-400 dark:text-gray-500 text-[11px] font-medium mb-3">
                                                Ref / Materials: {item.activities_references}
                                            </Text>
                                        ) : null}

                                        {/* Teacher Reflection */}
                                        {item.remarks ? (
                                            <View className="bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl mb-3 border border-amber-200/50 dark:border-amber-800/30">
                                                <View className="flex-row items-center mb-1">
                                                    <MessageSquare size={12} color="#D97706" />
                                                    <Text className="text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider ml-1.5">
                                                        Teacher Reflection & Remarks
                                                    </Text>
                                                </View>
                                                <Text className="text-amber-900 dark:text-amber-200 text-xs font-medium">
                                                    {item.remarks}
                                                </Text>
                                            </View>
                                        ) : null}

                                        {/* Bottom Checkbox Row */}
                                        <View className="flex-row items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                                            <ActionTooltip text={item.is_completed ? "Lesson taught and verified" : "Mark this lesson as taught"}>
                                                <TouchableOpacity
                                                    onPress={() => handleToggleComplete(item)}
                                                    className={`flex-row items-center px-4 py-2 rounded-xl border ${item.is_completed ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300' : 'bg-[#FF6900] border-[#FF6900]'}`}
                                                >
                                                    {item.is_completed ? (
                                                        <>
                                                            <Check size={14} color="#059669" />
                                                            <Text className="text-emerald-700 dark:text-emerald-300 font-bold text-xs ml-1.5">
                                                                Taught & Verified
                                                            </Text>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 size={14} color="white" />
                                                            <Text className="text-white font-bold text-xs ml-1.5">
                                                                Mark as Taught
                                                            </Text>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            </ActionTooltip>

                                            {item.is_completed && (
                                                <ActionTooltip text="Edit teacher reflection & remarks">
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setReflectionModalItem(item);
                                                            setReflectionText(item.remarks || "");
                                                        }}
                                                        className="flex-row items-center px-3 py-1.5 bg-gray-100 dark:bg-[#0D1117] rounded-xl"
                                                    >
                                                        <FileEdit size={13} color="#6B7280" />
                                                        <Text className="text-gray-600 dark:text-gray-400 text-xs font-bold ml-1.5">
                                                            Edit Reflection
                                                        </Text>
                                                    </TouchableOpacity>
                                                </ActionTooltip>
                                            )}
                                        </View>
                                    </View>
                                ))
                            )}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Create Lesson Modal */}
            <Modal visible={showCreateModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white dark:bg-[#161B22] rounded-t-[36px] p-6 pb-12 border-t border-gray-200 dark:border-gray-800 max-h-[90%]">
                        <View className="flex-row justify-between items-center mb-6">
                            <View>
                                <Text className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    New Lesson Entry
                                </Text>
                                <Text className="text-gray-400 text-xs font-medium mt-0.5">
                                    Log lesson plan into your record of work
                                </Text>
                            </View>
                            <TouchableOpacity
                                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#0D1117] items-center justify-center"
                                onPress={() => setShowCreateModal(false)}
                            >
                                <X size={18} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Link to Coverage Plan Item */}
                            {coveragePlans.length > 0 && (
                                <View className="mb-4">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                        Link to Coverage Plan (Optional)
                                    </Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                        <TouchableOpacity
                                            onPress={() => setFormCoveragePlanId("")}
                                            className={`mr-2 px-3 py-2 rounded-xl border ${formCoveragePlanId === "" ? 'bg-orange-50 border-[#FF6900]' : 'bg-gray-50 dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                                        >
                                            <Text className={`text-xs font-bold ${formCoveragePlanId === "" ? 'text-[#FF6900]' : 'text-gray-500'}`}>
                                                Custom / Unlinked
                                            </Text>
                                        </TouchableOpacity>
                                        {coveragePlans.map((p) => (
                                            <TouchableOpacity
                                                key={p.id}
                                                onPress={() => {
                                                    setFormCoveragePlanId(p.id);
                                                    if (!formTopic) setFormTopic(p.title);
                                                    if (!formSubTopic && p.sub_strand) setFormSubTopic(p.sub_strand);
                                                }}
                                                className={`mr-2 px-3 py-2 rounded-xl border ${formCoveragePlanId === p.id ? 'bg-orange-50 border-[#FF6900]' : 'bg-gray-50 dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                                            >
                                                <Text className={`text-xs font-bold ${formCoveragePlanId === p.id ? 'text-[#FF6900]' : 'text-gray-600 dark:text-gray-400'}`}>
                                                    {p.title}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Topic */}
                            <View className="mb-4">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                    Lesson Topic *
                                </Text>
                                <TextInput
                                    className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm"
                                    placeholder="e.g. Addition of fractions with unlike denominators"
                                    placeholderTextColor="#9CA3AF"
                                    value={formTopic}
                                    onChangeText={setFormTopic}
                                />
                            </View>

                            {/* Sub-Topic */}
                            <View className="mb-4">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                    Sub-Topic
                                </Text>
                                <TextInput
                                    className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm"
                                    placeholder="e.g. Lowest Common Multiple application"
                                    placeholderTextColor="#9CA3AF"
                                    value={formSubTopic}
                                    onChangeText={setFormSubTopic}
                                />
                            </View>

                            {/* Week, Lesson Number & Duration */}
                            <View className="flex-row gap-3 mb-4">
                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                        Instructional Week *
                                    </Text>
                                    <ActionTooltip text="Select calculated instructional week from academic calendar">
                                        <TouchableOpacity
                                            onPress={() => setShowWeekPickerModal(true)}
                                            className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-3 py-3 border border-gray-200 dark:border-gray-800 flex-row items-center justify-between"
                                        >
                                            <View className="flex-row items-center flex-1 mr-1">
                                                <CalendarDays size={13} color="#FF6900" />
                                                <Text className="text-gray-900 dark:text-white font-bold text-xs ml-1.5" numberOfLines={1}>
                                                    {formWeek ? `Week ${formWeek}` : "Select"}
                                                </Text>
                                            </View>
                                            <View className="bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 rounded">
                                                <Text className="text-[#FF6900] text-[9px] font-bold">Pick</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </ActionTooltip>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                        Lesson
                                    </Text>
                                    <TextInput
                                        className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm"
                                        placeholder="1"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        value={formLesson}
                                        onChangeText={setFormLesson}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                        Duration (Min)
                                    </Text>
                                    <TextInput
                                        className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm"
                                        placeholder="40"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        value={formDuration}
                                        onChangeText={setFormDuration}
                                    />
                                </View>
                            </View>

                            {/* Cancellation / Holiday Warning */}
                            {cancellationNotice?.is_cancelled && (
                                <View className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-xl border border-amber-300 dark:border-amber-800/60 mb-4 flex-row items-center">
                                    <AlertTriangle size={18} color="#D97706" />
                                    <View className="ml-2.5 flex-1">
                                        <Text className="text-amber-800 dark:text-amber-300 font-bold text-xs">
                                            Classes Cancelled on this Date
                                        </Text>
                                        <Text className="text-amber-700 dark:text-amber-400 text-[11px] mt-0.5">
                                            {cancellationNotice.event_name} (Logged automatically into remarks)
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Date */}
                            <View className="mb-4">
                                <DatePicker
                                    label="Lesson Date"
                                    value={formDate}
                                    onChange={handleDateChange}
                                    placeholder="Select lesson date"
                                />
                            </View>

                            {/* Learning Objectives */}
                            <View className="mb-4">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                    Learning Objectives
                                </Text>
                                <TextInput
                                    className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm"
                                    placeholder="By the end of the lesson, the learner should be able to..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    numberOfLines={2}
                                    style={{ height: 60, textAlignVertical: 'top' }}
                                    value={formObjectives}
                                    onChangeText={setFormObjectives}
                                />
                            </View>

                            {/* References / Materials */}
                            <View className="mb-4">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                                    Learning Materials / References
                                </Text>
                                <TextInput
                                    className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm"
                                    placeholder="e.g. Grade 5 Math Textbook pg 45, fraction strips"
                                    placeholderTextColor="#9CA3AF"
                                    value={formActivities}
                                    onChangeText={setFormActivities}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleCreateEntry}
                                disabled={saving}
                                className="bg-[#FF6900] py-4 rounded-xl items-center shadow-md active:bg-orange-600 mb-6"
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-base">Save Lesson Plan</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Reflection Modal */}
            <Modal visible={Boolean(reflectionModalItem)} animationType="fade" transparent>
                <View className="flex-1 bg-black/60 justify-center p-6">
                    <View className="bg-white dark:bg-[#161B22] rounded-[32px] p-6 border border-gray-200 dark:border-gray-800 shadow-xl">
                        <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            Teacher Reflection & Remarks
                        </Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-xs mb-4">
                            Record how learners grasped the concept, challenges faced, or remedial actions planned.
                        </Text>

                        <TextInput
                            className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl p-4 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-sm mb-5"
                            placeholder="e.g. 80% of learners achieved objective. Remedial required on question 4..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            numberOfLines={4}
                            style={{ height: 100, textAlignVertical: 'top' }}
                            value={reflectionText}
                            onChangeText={setReflectionText}
                        />

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                onPress={() => setReflectionModalItem(null)}
                                className="flex-1 py-3 bg-gray-100 dark:bg-[#0D1117] rounded-xl items-center"
                            >
                                <Text className="text-gray-600 dark:text-gray-400 font-bold text-sm">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveReflection}
                                className="flex-1 py-3 bg-[#FF6900] rounded-xl items-center shadow-sm"
                            >
                                <Text className="text-white font-bold text-sm">Confirm & Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Week Picker Modal for constrained instructional week selection */}
            <WeekPickerModal
                visible={showWeekPickerModal}
                title="Select Instructional Week"
                subtitle="Derived from active academic year, terms, and non-instructional events"
                weeks={calculatedWeeks.length > 0 ? calculatedWeeks : createDefaultFallbackWeeks(14)}
                selectedWeekNumber={formWeek ? parseInt(formWeek, 10) : undefined}
                onSelectWeek={(wk) => {
                    setFormWeek(String(wk.weekNumber));
                    if (wk.startDate) {
                        handleDateChange(wk.startDate);
                    }
                    const isBreak = wk.status === 'non_instructional' || Boolean(wk.isBreak);
                    const isPartial = wk.status === 'partial' || Boolean(wk.isPartial);
                    const reasons = (wk.holidayReasons && wk.holidayReasons.length > 0)
                        ? wk.holidayReasons.join(', ')
                        : (wk.events && wk.events.length > 0)
                        ? wk.events.map(e => e.title).join(', ')
                        : '';
                    if (isPartial || isBreak) {
                        setCancellationNotice({
                            is_cancelled: Boolean(isBreak),
                            event_name: reasons
                                ? reasons
                                : (isBreak ? "School Recess / Holiday" : "Partial instructional week")
                        });
                    }
                }}
                onClose={() => setShowWeekPickerModal(false)}
            />
        </View>
    );
}
