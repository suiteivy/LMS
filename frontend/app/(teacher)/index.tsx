import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ListItemSkeleton, TeacherDashboardSkeleton } from "@/components/ui/skeletons";
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from "@/contexts/ThemeContext";
import { TeacherAPI } from "@/services/TeacherService";
import { CacheService } from "@/services/CacheService";
import { CalendarAPI } from "@/services/CalendarService";
import { downloadTimetablePdf } from "@/utils/timetablePdfGenerator";
import { router } from "expo-router";
import { ArrowRight, BookOpen, Calendar, Check, Clock, ClipboardList, Download, GraduationCap, MessageSquare, School, Users, LogOut } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View, StatusBar } from 'react-native';
import { SubscriptionBanner, SubscriptionGate } from '@/components/shared/SubscriptionComponents';
import { formatClassLabel } from '@/utils/classLabel';
import { useTeacherRoleMode } from '@/hooks/useTeacherRoleMode';
import { showError, showFetchError, showSuccess } from '@/utils/toast';
import { TeacherAttendanceAPI, StaffPresenceItem } from '@/services/TeacherAttendanceService';

const localDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Define Interface for the QuickAction props
interface QuickActionProps {
    icon: any;
    label: string;
    color: string;
    onPress?: () => void;
    badge?: React.ReactNode;
}

const QuickAction = ({ icon: Icon, label, color, onPress, badge }: QuickActionProps) => {
    const { isDark } = useTheme();
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                minHeight: 135, 
                justifyContent: 'center', 
                alignItems: 'center',
                boxShadow: [{
                    offsetX: 0,
                    offsetY: 1,
                    blurRadius: 1.5,
                    color: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.08)',
                }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.3 : 0.08,
                shadowRadius: 1.5,
                elevation: 1,
            }}
            className="bg-white dark:bg-[#161B22] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 items-center mb-4 active:bg-gray-50 dark:active:bg-gray-900"
        >
            <View style={{ backgroundColor: `${color}15` }} className="p-3 rounded-2xl mb-2">
                <Icon size={24} color={color} />
            </View>
            <Text className="text-gray-800 dark:text-gray-200 font-bold text-center">{label}</Text>
            <View className="mt-1 h-5 items-center justify-center">
                {badge && 
                (<View className="mt-1 h-5 items-center justify-center">
                    {badge}
                </View>)}
            </View>
        </TouchableOpacity>
    );
};

export default function TeacherHome() {
    const { profile, teacherId, institutionName, institutionLogo, isInitializing, session, isDemo, logout } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [downloadingEmbeddedPdf, setDownloadingEmbeddedPdf] = useState(false);
    const { isDark } = useTheme();

    // Switcher/Role state
    const { mode, setMode, syncRoles, canToggle, isSubjectTeacher, isClassTeacher, isHOD, isLibrarian, isFinanceAdmin } = useTeacherRoleMode();
    const [roles, setRoles] = useState<string[]>([]);
    const [classTeacherOf, setClassTeacherOf] = useState<any[]>([]);
    const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
    const [selectedSubjectTitle, setSelectedSubjectTitle] = useState<string>('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [staffPresence, setStaffPresence] = useState<StaffPresenceItem[]>([]);
    const [checkingIn, setCheckingIn] = useState(false);
    const hydratedFromCacheRef = useRef(false);

    const cacheKey = profile?.id ? `teacher_dashboard_${profile.id}_${mode}` : null;

    useEffect(() => {
        hydratedFromCacheRef.current = false;
    }, [cacheKey]);

    const fetchDashboardData = useCallback(async () => {
        if (!isDemo && (isInitializing || !session)) return;

        // Try to hydrate from cache first to avoid blank screen
        if (cacheKey && !hydratedFromCacheRef.current) {
            hydratedFromCacheRef.current = true;
            const cached = await CacheService.get<any>(cacheKey, { allowStale: true });
            if (cached.data) {
                setStats(cached.data.stats || null);
                setSchedule(cached.data.schedule || []);
                const cachedRoles = cached.data.roles || [];
                setRoles(cachedRoles);
                syncRoles(cachedRoles);
                setClassTeacherOf(cached.data.classTeacherOf || []);
                setAssignedSubjects(cached.data.assignedSubjects || []);
                setLoading(false);
            }
        }

        try {
            setLoading(true);
            if (isDemo) {
                // High-quality mock data for Teacher Demo Mode
                setStats({
                    studentsCount: mode === 'class' ? 32 : 42,
                    subjectsCount: mode === 'class' ? 8 : 4
                });
                setSchedule([
                    {
                        id: 'demo-1',
                        start_time: '08:00:00',
                        end_time: '09:30:00',
                        subjects: { title: 'Advanced Mathematics' },
                        classes: { name: 'Grade 12A' },
                        room_number: 'Lecture Hall A'
                    },
                    {
                        id: 'demo-2',
                        start_time: '10:00:00',
                        end_time: '11:30:00',
                        subjects: { title: 'Theoretical Physics' },
                        classes: { name: 'Grade 12B' },
                        room_number: 'Science Lab 2'
                    },
                    {
                        id: 'demo-3',
                        start_time: '13:30:00',
                        end_time: '15:00:00',
                        subjects: { title: 'Software Engineering' },
                        classes: { name: 'Computer Sc 1' },
                        room_number: 'CS Lab 101'
                    }
                ]);

                const mockRoles = ['Subject Teacher', 'Class Teacher', 'Head of Department'];
                const mockCT = [{ id: 'class-demo-1', grade_level: 12, class_type: 'Grade', stream: 'A' }];
                const mockAssigned = [
                    {
                        id: "subj-demo-1",
                        title: "Advanced Mathematics",
                        class: { id: "class-demo-1", grade_level: 12, class_type: 'Grade', stream: 'A' },
                        timetable: [
                            { day_of_week: "Monday", start_time: "08:00:00", end_time: "09:30:00", room_number: "Lecture Hall A" },
                            { day_of_week: "Wednesday", start_time: "08:00:00", end_time: "09:30:00", room_number: "Lecture Hall A" }
                        ]
                    },
                    {
                        id: "subj-demo-2",
                        title: "Theoretical Physics",
                        class: { id: "class-demo-2", grade_level: 12, class_type: 'Grade', stream: 'B' },
                        timetable: [
                            { day_of_week: "Tuesday", start_time: "10:00:00", end_time: "11:30:00", room_number: "Science Lab 2" }
                        ]
                    },
                    {
                        id: "subj-demo-3",
                        title: "Advanced Mathematics",
                        class: { id: "class-demo-2", grade_level: 12, class_type: 'Grade', stream: 'B' },
                        timetable: [
                            { day_of_week: "Thursday", start_time: "08:00:00", end_time: "09:30:00", room_number: "Lecture Hall B" }
                        ]
                    }
                ];

                const mockStaff: StaffPresenceItem[] = [
                    {
                        teacher_id: profile?.id || 'demo-me',
                        name: profile?.full_name || 'Dr. Sarah Jenkins',
                        first_name: 'Sarah',
                        last_name: 'Jenkins',
                        department: 'Mathematics',
                        position: 'Senior Teacher',
                        status: 'present',
                        confirmation_status: 'confirmed',
                        check_in_time: '07:45 AM'
                    },
                    {
                        teacher_id: 'demo-t2',
                        name: 'Mr. James Mwangi',
                        first_name: 'James',
                        last_name: 'Mwangi',
                        department: 'Sciences',
                        position: 'Class Teacher',
                        status: 'present',
                        confirmation_status: 'unconfirmed',
                        check_in_time: '08:10 AM'
                    },
                    {
                        teacher_id: 'demo-t3',
                        name: 'Ms. Grace Wanjiku',
                        first_name: 'Grace',
                        last_name: 'Wanjiku',
                        department: 'Languages',
                        position: 'Head of Department',
                        status: 'present',
                        confirmation_status: 'confirmed',
                        check_in_time: '07:55 AM'
                    },
                    {
                        teacher_id: 'demo-t4',
                        name: 'Mr. Peter Omondi',
                        first_name: 'Peter',
                        last_name: 'Omondi',
                        department: 'Humanities',
                        position: 'Teacher',
                        status: 'late',
                        confirmation_status: 'unconfirmed',
                        check_in_time: '08:40 AM'
                    }
                ];
                setStaffPresence(mockStaff);

                setRoles(mockRoles);
                syncRoles(mockRoles);
                setClassTeacherOf(mockCT);
                setAssignedSubjects(mockAssigned);

                // Initialize switcher selectors
                setSelectedSubjectTitle("Advanced Mathematics");
                setSelectedClassId("class-demo-1");
                return;
            }

            const data = await TeacherAPI.getDashboardStats();
            setStats(data.stats);
            setSchedule(data.schedule);
            const fetchedRoles = data.roles || [];
            setRoles(fetchedRoles);
            syncRoles(fetchedRoles);
            setClassTeacherOf(data.classTeacherOf || []);
            
            // If Class Teacher but not Subject Teacher, default to class mode
            if (!fetchedRoles.includes('Subject Teacher') && fetchedRoles.includes('Class Teacher')) {
                setMode('class');
            }
            
            const fetchedSubjects = data.assignedSubjects || [];
            setAssignedSubjects(fetchedSubjects);
            
            if (fetchedSubjects.length > 0) {
                const initialSubject = fetchedSubjects[0];
                setSelectedSubjectTitle(initialSubject.title);
                if (initialSubject.class) {
                    setSelectedClassId(initialSubject.class.id);
                }
            }

            try {
                const presenceData = await TeacherAttendanceAPI.getStaffPresence();
                setStaffPresence(presenceData || []);
            } catch {
                // Non-blocking staff presence
            }

            if (cacheKey) {
                CacheService.set(cacheKey, {
                    stats: data.stats,
                    schedule: data.schedule,
                    roles: fetchedRoles,
                    classTeacherOf: data.classTeacherOf || [],
                    assignedSubjects: fetchedSubjects,
                }, 10 * 60 * 1000);
            }
        } catch (error: any) {
            if (!error?.isAuthError) {
                console.error("Error fetching dashboard data:", error?.message || error);
            }
            showFetchError("dashboard data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isDemo, isInitializing, session, cacheKey, syncRoles, setMode, mode]);

    const handleSelfCheckIn = async () => {
        try {
            setCheckingIn(true);
            if (isDemo) {
                setStaffPresence(prev => [
                    {
                        teacher_id: profile?.id || 'demo-me',
                        name: profile?.full_name || 'Teacher',
                        first_name: '',
                        last_name: '',
                        position: 'Teacher',
                        status: 'present',
                        confirmation_status: 'unconfirmed',
                        check_in_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    },
                    ...prev.filter(p => p.teacher_id !== (profile?.id || 'demo-me'))
                ]);
                showSuccess('Checked In', 'Your presence today has been recorded (Self-Reported).');
                return;
            }

            await TeacherAttendanceAPI.selfCheckIn({ status: 'present' });
            showSuccess('Checked In', 'Your presence today has been recorded (Self-Reported).');
            const presenceData = await TeacherAttendanceAPI.getStaffPresence();
            setStaffPresence(presenceData || []);
        } catch (err: any) {
            showError('Check-in failed', err?.message || 'Could not record attendance');
        } finally {
            setCheckingIn(false);
        }
    };

    const isSelfPresent = staffPresence.some(
        s => (s.teacher_id === teacherId || s.teacher_id === profile?.id || s.name === profile?.full_name) && (s.status === 'present' || s.status === 'late')
    );

    useEffect(() => {
        if (isInitializing) return;

        if (isDemo || session) {
            fetchDashboardData();
        } else {
            setLoading(false);
        }
    }, [isInitializing, session, isDemo, fetchDashboardData, mode]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
    };

    const handleSelectSubject = (title: string) => {
        setSelectedSubjectTitle(title);
        const classesForSub = assignedSubjects.filter(s => s.title === title).map(s => s.class).filter(Boolean);
        if (classesForSub.length > 0) {
            setSelectedClassId(classesForSub[0].id);
        } else {
            setSelectedClassId('');
        }
    };

    const uniqueSubjectTitles = Array.from(new Set(assignedSubjects.map(s => s.title)));
    const activeAssignment = assignedSubjects.find(s => s.title === selectedSubjectTitle && s.class?.id === selectedClassId);

    const buildPdfEntriesFromAssignedSubjects = useCallback((subjects: any[]) => {
        const allEntries: any[] = [];
        const seen = new Set<string>();

        (subjects || []).forEach((assignment) => {
            if (!Array.isArray(assignment?.timetable)) return;
            const className = assignment.class ? formatClassLabel(assignment.class) : 'Class';

            assignment.timetable.forEach((slot: any, idx: number) => {
                const dedupeKey = [
                    assignment.id || 'subject',
                    assignment.class?.id || 'class',
                    slot.day_of_week,
                    slot.start_time,
                    slot.end_time,
                    slot.room_number || '',
                ].join('|');

                if (seen.has(dedupeKey)) return;
                seen.add(dedupeKey);

                allEntries.push({
                    id: `${assignment.id || 'subject'}-${assignment.class?.id || 'class'}-${idx}`,
                    class_id: assignment.class?.id || 'class',
                    subject_id: assignment.id || 'subject',
                    day_of_week: slot.day_of_week,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    room_number: slot.room_number || null,
                    institution_id: '',
                    subjects: {
                        title: assignment.title || 'Subject',
                        teacher_id: '',
                        teachers: {
                            users: {
                                first_name: '',
                                last_name: '',
                                full_name: profile?.full_name || '',
                            },
                        },
                    },
                    classes: {
                        name: className,
                        display_name: className,
                    },
                });
            });
        });

        return allEntries;
    }, [profile?.full_name]);

    const handleDownloadTeacherTimetablePdf = useCallback(async () => {
        const entries = buildPdfEntriesFromAssignedSubjects(assignedSubjects);
        if (!entries.length) {
            showError('No schedule', 'No timetable entries available for this view.');
            return;
        }

        try {
            setDownloadingEmbeddedPdf(true);
            const cancelledDates = await CalendarAPI.getCancelledDates().catch(() => []);
            await downloadTimetablePdf({
                title: 'Teacher Teaching Schedule',
                subtitle: profile?.full_name ? `Schedule for ${profile.full_name}` : `${institutionName || 'Teacher Schedule'}`,
                institutionName,
                institutionLogo,
                entries,
                cancelledDates,
                fileName: `${profile?.full_name || 'teacher'}-teaching-schedule-${localDateKey(new Date())}`,
            });
            showSuccess('PDF Ready', 'Timetable PDF generated successfully.');
        } catch {
            showError('Export failed', 'Failed to generate timetable PDF.');
        } finally {
            setDownloadingEmbeddedPdf(false);
        }
    }, [assignedSubjects, buildPdfEntriesFromAssignedSubjects, institutionLogo, institutionName, profile?.full_name]);

    const quickActions = useMemo(() => {
        if (mode === 'class') {
            return [
                {
                    key: 'classes',
                    icon: School,
                    label: 'Classes',
                    color: '#8b5cf6',
                    route: '/(teacher)/classes',
                    gated: true,
                },
                {
                    key: 'attendance',
                    icon: Calendar,
                    label: 'Attendance',
                    color: '#16a34a',
                    route: '/(teacher)/management/attendance',
                    gated: false,
                },
                {
                    key: 'reports',
                    icon: GraduationCap,
                    label: 'Report Cards',
                    color: '#f59e0b',
                    route: '/(teacher)/management/report-cards',
                    gated: false,
                },
                {
                    key: 'messages',
                    icon: MessageSquare,
                    label: 'Messages',
                    color: '#0891b2',
                    route: '/(teacher)/management/messages',
                    gated: true,
                },
            ];
        }

        if (mode === 'hod') {
            return [
                {
                    key: 'coverage',
                    icon: BookOpen,
                    label: 'Dept Coverage',
                    color: '#FF6900',
                    route: '/(teacher)/management/coverage',
                    gated: false,
                },
                {
                    key: 'exams',
                    icon: GraduationCap,
                    label: 'Manage Exams',
                    color: '#8b5cf6',
                    route: '/(teacher)/management/exams',
                    gated: false,
                },
                {
                    key: 'record-of-work',
                    icon: Calendar,
                    label: 'Record of Work',
                    color: '#16a34a',
                    route: '/(teacher)/management/record-of-work',
                    gated: false,
                },
                {
                    key: 'messages',
                    icon: MessageSquare,
                    label: 'Messages',
                    color: '#0891b2',
                    route: '/(teacher)/management/messages',
                    gated: true,
                },
            ];
        }

        if (mode === 'librarian') {
            return [
                {
                    key: 'library',
                    icon: BookOpen,
                    label: 'Library Desk',
                    color: '#FF6900',
                    route: '/(teacher)/management/library',
                    gated: false,
                },
                {
                    key: 'catalog',
                    icon: School,
                    label: 'Catalog',
                    color: '#8b5cf6',
                    route: '/(teacher)/library',
                    gated: false,
                },
                {
                    key: 'announcements',
                    icon: ArrowRight,
                    label: 'Announcements',
                    color: '#f43f5e',
                    route: '/(teacher)/management/announcements',
                    gated: false,
                },
                {
                    key: 'messages',
                    icon: MessageSquare,
                    label: 'Messages',
                    color: '#0891b2',
                    route: '/(teacher)/management/messages',
                    gated: true,
                },
            ];
        }

        if (mode === 'finance') {
            return [
                {
                    key: 'fees',
                    icon: GraduationCap,
                    label: 'Fee Summary',
                    color: '#16a34a',
                    route: '/(teacher)/management/fees',
                    gated: false,
                },
                {
                    key: 'classes',
                    icon: School,
                    label: 'Classes',
                    color: '#8b5cf6',
                    route: '/(teacher)/classes',
                    gated: true,
                },
                {
                    key: 'announcements',
                    icon: ArrowRight,
                    label: 'Announcements',
                    color: '#f43f5e',
                    route: '/(teacher)/management/announcements',
                    gated: false,
                },
                {
                    key: 'messages',
                    icon: MessageSquare,
                    label: 'Messages',
                    color: '#0891b2',
                    route: '/(teacher)/management/messages',
                    gated: true,
                },
                {
                    key: 'clearance',
                    icon: LogOut,
                    label: 'Clearance',
                    color: '#f59e0b',
                    route: '/(teacher)/clearance',
                    gated: false,
                },
            ];
        }

        return [
            {
                key: 'grades',
                icon: GraduationCap,
                label: 'Grade Entry',
                color: isDark ? '#ff6900' : '#1a1a1a',
                route: '/(teacher)/management/grade-entry',
                gated: false,
            },
            {
                key: 'assignments',
                icon: ClipboardList,
                label: 'Assignments',
                color: '#8b5cf6',
                route: '/(teacher)/management/assignments',
                gated: true,
            },
            {
                key: 'coverage',
                icon: BookOpen,
                label: 'Coverage',
                color: '#f43f5e',
                route: '/(teacher)/management/coverage',
                gated: false,
            },
            {
                key: 'messages',
                icon: MessageSquare,
                label: 'Messages',
                color: '#0891b2',
                route: '/(teacher)/management/messages',
                gated: true,
            },
            {
                key: 'clearance',
                icon: LogOut,
                label: 'Clearance',
                color: '#f59e0b',
                route: '/(teacher)/clearance',
                gated: false,
            },
        ];
    }, [mode, isDark]);

    const teacherRoleLabel = useMemo(() => {
        const heldRoles: string[] = [];
        if (isSubjectTeacher) heldRoles.push('Subject Teacher');
        if (isClassTeacher) heldRoles.push('Class Teacher');
        if (isHOD) heldRoles.push('Head of Department');
        return heldRoles.length > 0 ? heldRoles.join(' · ') : 'Teacher';
    }, [isSubjectTeacher, isClassTeacher, isHOD]);

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <SubscriptionBanner />
            <UnifiedHeader
                title="Welcome back,"
                subtitle={profile?.full_name || 'Teacher Portal'}
                role={teacherRoleLabel}
                showNotification={true}
            />

            {loading && !stats ? (
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <TeacherDashboardSkeleton loading={true} label="Loading teacher dashboard..." />
                </ScrollView>
            ) : (
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100, padding: 24, paddingTop: 10 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
                }
            >
                <View>
                    {/* Log out link & Role Badges */}
                    <View className="flex-row justify-between items-center mb-6 px-2 flex-wrap gap-2">
                        <View className="flex-row gap-1.5 flex-wrap">
                            {roles.map(r => (
                                <View key={r} className="bg-orange-500/10 px-3 py-1 rounded-xl border border-orange-500/20">
                                    <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-wider">{r}</Text>
                                </View>
                            ))}
                        </View>
                        <TouchableOpacity
                            onPress={async () => {
                                await logout();
                                router.replace("/(auth)/signIn");
                            }}
                            style={{
                                boxShadow: [{
                                    offsetX: 0,
                                    offsetY: 1,
                                    blurRadius: 2,
                                    color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.05)',
                                }],
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: isDark ? 0.4 : 0.05,
                                shadowRadius: 2,
                                elevation: 1,
                            }}
                            className="flex-row items-center bg-white dark:bg-[#161B22] px-4 py-2 rounded-2xl border border-gray-100 dark:border-gray-800"
                        >
                            <LogOut size={14} color="#ef4444" />
                            <Text className="ml-2 text-red-600 font-bold text-[10px] uppercase tracking-widest">Logout</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- 2. Quick Status Cards --- */}
                    <View className="flex-row gap-4 mb-8">
                        <View 
                            style={{
                                boxShadow: [{
                                    offsetX: 0,
                                    offsetY: 8,
                                    blurRadius: 12,
                                    color: 'rgba(255, 105, 0, 0.3)',
                                }],
                                shadowColor: "#FF6900",
                                shadowOffset: { width: 0, height: 8 },
                                shadowOpacity: 0.3,
                                shadowRadius: 12,
                                elevation: 12,
                            }}
                            className="flex-1 bg-[#FF6900] p-6 rounded-3xl"
                        >
                            <View className="bg-white/20 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                                <Users size={20} color="white" />
                            </View>
                            <Text className="text-white text-3xl font-bold">{stats?.studentsCount || 0}</Text>
                            <Text className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                                {mode === 'class' ? 'Class Students' : 'Students Taught'}
                            </Text>
                        </View>
                        <View 
                            style={{
                                boxShadow: [{
                                    offsetX: 0,
                                    offsetY: 1,
                                    blurRadius: 2,
                                    color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.08)',
                                }],
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: isDark ? 0.4 : 0.08,
                                shadowRadius: 2,
                                elevation: 2,
                            }}
                            className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-6 rounded-3xl border border-gray-100 dark:border-gray-800"
                        >
                            <View className="bg-orange-50 dark:bg-orange-950/30 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                                <Clock size={20} color="#FF6900" />
                            </View>
                            <Text className="text-gray-900 dark:text-white text-3xl font-bold">
                                {stats?.subjectsCount || 0}
                            </Text>
                            <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                {mode === 'class' ? 'Class Subjects' : 'Active Subjects'}
                            </Text>
                        </View>
                    </View>

                    {/* --- 3. Switcher Card (Subjects / Classes / CT Mode) --- */}
                    <View className="bg-white dark:bg-[#161B22] rounded-[32px] border border-gray-100 dark:border-gray-800 p-5 mb-8 shadow-sm">
                        {/* Mode Selector - Tabs */}
                        {canToggle && (
                            <View className="flex-row bg-gray-100 dark:bg-[#0D1117] rounded-2xl p-1 mb-5 gap-1 flex-wrap">
                                {isSubjectTeacher && (
                                    <TouchableOpacity 
                                        onPress={() => setMode('subject')}
                                        className={`flex-1 min-w-[70px] py-2.5 px-2 rounded-xl items-center justify-center ${mode === 'subject' ? 'bg-[#FF6900] shadow-sm' : 'bg-transparent'}`}
                                    >
                                        <Text numberOfLines={1} className={`font-bold text-[11px] uppercase tracking-wider ${mode === 'subject' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                            Subject
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {isClassTeacher && (
                                    <TouchableOpacity 
                                        onPress={() => setMode('class')}
                                        className={`flex-1 min-w-[70px] py-2.5 px-2 rounded-xl items-center justify-center ${mode === 'class' ? 'bg-[#FF6900] shadow-sm' : 'bg-transparent'}`}
                                    >
                                        <Text numberOfLines={1} className={`font-bold text-[11px] uppercase tracking-wider ${mode === 'class' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                            Class
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {isHOD && (
                                    <TouchableOpacity 
                                        onPress={() => setMode('hod')}
                                        className={`flex-1 min-w-[70px] py-2.5 px-2 rounded-xl items-center justify-center ${mode === 'hod' ? 'bg-[#FF6900] shadow-sm' : 'bg-transparent'}`}
                                    >
                                        <Text numberOfLines={1} className={`font-bold text-[11px] uppercase tracking-wider ${mode === 'hod' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                            HOD
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {isLibrarian && (
                                    <TouchableOpacity 
                                        onPress={() => setMode('librarian')}
                                        className={`flex-1 min-w-[70px] py-2.5 px-2 rounded-xl items-center justify-center ${mode === 'librarian' ? 'bg-[#FF6900] shadow-sm' : 'bg-transparent'}`}
                                    >
                                        <Text numberOfLines={1} className={`font-bold text-[11px] uppercase tracking-wider ${mode === 'librarian' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                            Library
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {isFinanceAdmin && (
                                    <TouchableOpacity 
                                        onPress={() => setMode('finance')}
                                        className={`flex-1 min-w-[70px] py-2.5 px-2 rounded-xl items-center justify-center ${mode === 'finance' ? 'bg-[#FF6900] shadow-sm' : 'bg-transparent'}`}
                                    >
                                        <Text numberOfLines={1} className={`font-bold text-[11px] uppercase tracking-wider ${mode === 'finance' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                            Finance
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {mode === 'subject' ? (
                            <View>
                                {/* Subject Selector Pills */}
                                <Text className="text-gray-400 dark:text-gray-550 text-[10px] font-bold uppercase tracking-wider mb-2">My Subjects</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
                                    {uniqueSubjectTitles.map((title) => (
                                        <TouchableOpacity
                                            key={title}
                                            onPress={() => handleSelectSubject(title)}
                                            className={`px-4 py-2 rounded-xl mr-2 border ${
                                                selectedSubjectTitle === title 
                                                    ? 'bg-orange-50 dark:bg-[#FF6900]/10 border-[#FF6900]' 
                                                    : 'bg-gray-50 dark:bg-[#161B22] border-gray-100 dark:border-gray-800'
                                            }`}
                                        >
                                            <Text className={`text-xs font-bold ${selectedSubjectTitle === title ? 'text-[#FF6900]' : 'text-gray-750 dark:text-gray-300'}`}>
                                                {title}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Class Selector Pills */}
                                {selectedSubjectTitle ? (
                                    <>
                                        <Text className="text-gray-400 dark:text-gray-550 text-[10px] font-bold uppercase tracking-wider mb-2">Classes Taught</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
                                            {assignedSubjects
                                                .filter(s => s.title === selectedSubjectTitle)
                                                .map(s => s.class)
                                                .filter(Boolean)
                                                .map((cls) => (
                                                    <TouchableOpacity
                                                        key={cls.id}
                                                        onPress={() => setSelectedClassId(cls.id)}
                                                        className={`px-4 py-2 rounded-xl mr-2 border ${
                                                            selectedClassId === cls.id 
                                                                ? 'bg-orange-50 dark:bg-[#FF6900]/10 border-[#FF6900]' 
                                                                : 'bg-gray-50 dark:bg-[#161B22] border-gray-100 dark:border-gray-800'
                                                        }`}
                                                    >
                                                        <Text className={`text-xs font-bold ${selectedClassId === cls.id ? 'text-[#FF6900]' : 'text-gray-750 dark:text-gray-300'}`}>
                                                            {formatClassLabel(cls)}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))
                                            }
                                        </ScrollView>
                                    </>
                                ) : null}

                                {/* Timetable slots */}
                                <View className="mt-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                                    <View className="flex-row items-center justify-between mb-3">
                                        <Text className="text-gray-400 dark:text-gray-550 text-[10px] font-bold uppercase tracking-wider">Weekly Timetable Schedule</Text>
                                        <TouchableOpacity
                                            onPress={handleDownloadTeacherTimetablePdf}
                                            disabled={downloadingEmbeddedPdf}
                                            className="px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50"
                                            accessibilityRole="button"
                                            accessibilityLabel="Download embedded timetable PDF"
                                        >
                                            <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-widest">
                                                {downloadingEmbeddedPdf ? 'Exporting...' : 'PDF'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    {activeAssignment?.timetable && activeAssignment.timetable.length > 0 ? (
                                        activeAssignment.timetable.map((slot: any, idx: number) => (
                                            <View key={idx} className="flex-row items-center gap-3 bg-gray-50 dark:bg-[#161B22] border border-gray-100 dark:border-gray-800 p-3 rounded-2xl mb-2">
                                                <View className="bg-orange-500/10 p-2 rounded-xl">
                                                    <Clock size={14} color="#FF6900" />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-gray-900 dark:text-white font-bold text-xs">{slot.day_of_week}</Text>
                                                    <Text className="text-gray-450 dark:text-gray-500 text-[10px]">{slot.start_time} - {slot.end_time}</Text>
                                                </View>
                                                {slot.room_number && (
                                                    <View className="bg-gray-100 dark:bg-[#161B22] px-2 py-1 rounded-lg">
                                                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-semibold">Room {slot.room_number}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        ))
                                    ) : (
                                        <View className="items-center justify-center py-6 bg-gray-50 dark:bg-[#161B22] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                            <Text className="text-gray-400 dark:text-gray-500 text-xs font-semibold">No timetable slots scheduled</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ) : mode === 'class' ? (
                            /* Class Teacher Dashboard Mode */
                            <View>
                                <Text className="text-gray-400 dark:text-gray-550 text-[10px] font-bold uppercase tracking-wider mb-2">Designated Classes</Text>
                                {classTeacherOf && classTeacherOf.length > 0 ? (
                                    classTeacherOf.map((cls) => (
                                        <View key={cls.id} className="bg-orange-50/20 dark:bg-orange-950/10 border border-orange-100/20 dark:border-gray-800 p-4 rounded-3xl mb-3">
                                            <View className="flex-row items-center gap-3 mb-3">
                                                <View className="bg-orange-500/10 p-2 rounded-xl">
                                                    <School size={16} color="#FF6900" />
                                                </View>
                                                <View>
                                                    <Text className="text-gray-900 dark:text-white font-black text-sm">{formatClassLabel(cls)}</Text>
                                                    <Text className="text-gray-450 dark:text-gray-500 text-[10px]">Class Teacher Designated Scoping</Text>
                                                </View>
                                            </View>
                                            
                                            <View className="flex-row gap-2 mt-2">
                                                <TouchableOpacity 
                                                    onPress={() => router.push("/(teacher)/classes" as any)}
                                                    className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 py-2.5 rounded-xl items-center active:bg-[#F6F8FA] dark:active:bg-gray-900"
                                                >
                                                    <Text className="text-gray-700 dark:text-gray-200 font-bold text-xs">Roster</Text>
                                                </TouchableOpacity>
                                                
                                                <TouchableOpacity 
                                                    onPress={() => router.push("/(teacher)/management/attendance" as any)}
                                                    className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 py-2.5 rounded-xl items-center active:bg-[#F6F8FA] dark:active:bg-gray-900"
                                                >
                                                    <Text className="text-gray-700 dark:text-gray-200 font-bold text-xs">Attendance</Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity 
                                                    onPress={() => router.push("/(teacher)/management/report-cards" as any)}
                                                    className="flex-1 bg-[#FF6900] py-2.5 rounded-xl items-center active:bg-orange-600"
                                                >
                                                    <Text className="text-white font-bold text-xs">Report Cards</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                ) : (
                                    <View className="items-center justify-center py-6 bg-gray-50 dark:bg-[#161B22] rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                                        <Text className="text-gray-400 dark:text-gray-550 text-xs font-semibold">No assigned classes as Class Teacher</Text>
                                    </View>
                                )}
                            </View>
                        ) : (
                            /* Librarian Desk Mode */
                            <View>
                                <Text className="text-gray-400 dark:text-gray-550 text-[10px] font-bold uppercase tracking-wider mb-2">Library Desk</Text>
                                <View className="bg-orange-50/20 dark:bg-orange-950/10 border border-orange-100/20 dark:border-gray-800 p-4 rounded-3xl mb-3">
                                    <View className="flex-row items-center gap-3 mb-3">
                                        <View className="bg-orange-500/10 p-2 rounded-xl">
                                            <BookOpen size={16} color="#FF6900" />
                                        </View>
                                        <View>
                                            <Text className="text-gray-900 dark:text-white font-black text-sm">Librarian Circulation Active</Text>
                                            <Text className="text-gray-450 dark:text-gray-500 text-[10px]">Issue and return book loans directly</Text>
                                        </View>
                                    </View>
                                    
                                    <View className="flex-row gap-2 mt-2">
                                        <TouchableOpacity 
                                            onPress={() => router.push("/(teacher)/library" as any)}
                                            className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] border border-gray-200 dark:border-gray-800 py-2.5 rounded-xl items-center active:bg-[#F6F8FA] dark:active:bg-gray-900"
                                        >
                                            <Text className="text-gray-700 dark:text-gray-200 font-bold text-xs">Catalog</Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity 
                                            onPress={() => router.push("/(teacher)/management/library" as any)}
                                            className="flex-1 bg-[#FF6900] py-2.5 rounded-xl items-center active:bg-orange-600"
                                        >
                                            <Text className="text-white font-bold text-xs">Circulation Desk</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* --- Faculty Presence Today (Part D2) --- */}
                    <View className="bg-white dark:bg-[#161B22] rounded-[32px] border border-gray-100 dark:border-gray-800 p-5 mb-8 shadow-sm">
                        <View className="flex-row justify-between items-center mb-4">
                            <View>
                                <Text className="text-base font-bold text-gray-900 dark:text-white">Faculty Presence Today</Text>
                                <Text className="text-gray-400 dark:text-gray-500 text-xs">
                                    {staffPresence.filter(s => s.status === 'present').length} Present &middot; Real-time status
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                                <TouchableOpacity
                                    onPress={() => router.push('/(teacher)/faculty-presence' as any)}
                                    className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                                >
                                    <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">View All</Text>
                                </TouchableOpacity>
                                {isSelfPresent ? (
                                    <View className="flex-row items-center bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                                        <Check size={14} color="#10b981" />
                                        <Text className="ml-1.5 text-emerald-600 font-bold text-xs">Checked In</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        onPress={handleSelfCheckIn}
                                        disabled={checkingIn}
                                        className="bg-[#FF6900] px-3.5 py-1.5 rounded-xl active:bg-orange-600"
                                    >
                                        <Text className="text-white font-bold text-xs">
                                            {checkingIn ? 'Checking In...' : 'Check In'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {staffPresence.length === 0 ? (
                            <Text className="text-gray-400 text-xs text-center py-2">No presence recorded today yet.</Text>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row -mx-2 px-2">
                                {staffPresence.map((staff, idx) => (
                                    <View key={staff.teacher_id || idx} className="items-center mr-4 w-20">
                                        <View className="relative">
                                            <View className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/40 items-center justify-center border-2 border-white dark:border-gray-800">
                                                <Text className="font-bold text-sm text-[#FF6900]">
                                                    {(staff.name || 'T').split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                </Text>
                                            </View>
                                            <View className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#161B22] ${
                                                staff.status === 'present' ? 'bg-emerald-500' : staff.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400'
                                            }`} />
                                        </View>
                                        <Text numberOfLines={1} className="text-gray-800 dark:text-gray-200 text-xs font-semibold mt-1.5 text-center">
                                            {staff.name?.split(' ')[0]}
                                        </Text>
                                        <View className="mt-0.5">
                                            <Text className={`text-[9px] font-bold ${
                                                staff.status === 'present'
                                                    ? (staff.confirmation_status === 'confirmed' ? 'text-emerald-600' : 'text-amber-500')
                                                    : staff.status === 'pending'
                                                        ? 'text-amber-500'
                                                        : 'text-gray-400 dark:text-gray-500'
                                            }`}>
                                                {staff.status === 'present'
                                                    ? (staff.confirmation_status === 'confirmed' ? 'Confirmed' : 'Self-Reported')
                                                    : staff.status === 'pending'
                                                        ? 'Pending'
                                                        : 'Not Present'}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>

                    {/* --- 4. Today's Schedule --- */}
                    <View className="flex-row justify-between items-end mb-4 ">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white">
                            Today&apos;s Schedule
                        </Text>
                        <View className="flex-row items-center gap-2">
                            <TouchableOpacity
                                onPress={handleDownloadTeacherTimetablePdf}
                                disabled={downloadingEmbeddedPdf}
                                className="flex-row items-center px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50"
                                accessibilityRole="button"
                                accessibilityLabel="Download teacher timetable PDF"
                            >
                                <Download size={12} color="#FF6900" />
                                <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-widest ml-1.5">
                                    {downloadingEmbeddedPdf ? 'Exporting...' : 'PDF'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push({ pathname: "/(teacher)/management/timetable", params: { backTo: "/(teacher)" } } as any)}>
                                <Text className="text-[#FF6900] font-semibold">View All</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loading ? (
                        <ListItemSkeleton loading={loading} count={3} label="Loading schedule..." />
                    ) : schedule.length === 0 ? (
                        <View className="bg-white dark:bg-[#161B22] p-8 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 items-center justify-center mb-6">
                            <Calendar size={32} color="#D1D5DB" />
                            <Text className="text-gray-400 dark:text-gray-550 mt-2 font-medium">No classes today</Text>
                        </View>
                    ) : (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="flex-row mb-6 -mx-4 px-4 pb-4"
                        >
                            {schedule.map((item: any) => (
                                <View 
                                    key={item.id} 
                                    style={{
                                        boxShadow: [{
                                            offsetX: 0,
                                            offsetY: 1,
                                            blurRadius: 2,
                                            color: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.08)',
                                        }],
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: isDark ? 0.4 : 0.08,
                                        shadowRadius: 2,
                                        elevation: 2,
                                    }}
                                    className="bg-white dark:bg-[#161B22] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mr-4 w-64"
                                >
                                    <View className="flex-row items-center mb-3">
                                        <View className="bg-orange-50 dark:bg-orange-950/30 p-2 rounded-xl mr-3">
                                            <BookOpen size={18} color="#FF6900" />
                                        </View>
                                        <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                                            {item.start_time} - {item.end_time}
                                        </Text>
                                    </View>
                                    <Text className="text-gray-900 dark:text-white font-bold text-lg mb-1" numberOfLines={1}>
                                        {item.subjects?.title}
                                    </Text>
                                    <Text className="text-gray-650 dark:text-gray-300 text-sm">
                                        {item.classes?.display_name || item.classes?.name || 'Class'} {item.room_number ? ` \u00B7 Room ${item.room_number}` : ''}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    {/* --- 5. Quick Actions Grid --- */}
                    <View className="mt-2">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Quick Actions
                        </Text>
                        <View className="flex-row flex-wrap justify-between">
                            {quickActions.map((action) => (
                                <View key={action.key} className="w-[48%]">
                                    {action.gated ? (
                                        <SubscriptionGate>
                                            <QuickAction
                                                icon={action.icon}
                                                label={action.label}
                                                color={action.color}
                                                onPress={() => router.push({ pathname: action.route as any, params: { backTo: '/(teacher)' } } as any)}
                                            />
                                        </SubscriptionGate>
                                    ) : (
                                        <QuickAction
                                            icon={action.icon}
                                            label={action.label}
                                            color={action.color}
                                            onPress={() => router.push({ pathname: action.route as any, params: { backTo: '/(teacher)' } } as any)}
                                        />
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </ScrollView>
            )}
        </View>
    );
}
