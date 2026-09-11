import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { DatePicker } from "@/components/common/DatePicker";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import Toast from 'react-native-toast-message';
import { supabase } from "@/libs/supabase";
import { decode } from "base64-arraybuffer";
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from "expo-router";
import { 
    AlignLeft, Calendar, Edit2, Eye, FileText, Plus, Target, Trophy, 
    Trash2, Type, Upload, Users, X, BookOpen, Download, CheckCircle2, 
    ArrowRight, ArrowLeft, Award, Layers, Check, ShieldCheck
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, Platform, Linking } from 'react-native';
import { DiaryAPI } from "@/services/DiaryService";
import { SubjectAPI } from "@/services/SubjectService";
import { GradingAPI } from "@/services/GradingService";
import { showFetchError } from "@/utils/toast";
import { DocumentPickerAsset } from 'expo-document-picker';

export type GradingStyle = 'points' | 'percentage' | 'letter_grade' | 'pass_fail' | 'rubric';

interface Assignment {
    id: string;
    title: string;
    Subject: string;
    dueDate: string; // Visual display
    due_date_iso: string | null; // Logic source
    submissions: number;
    totalStudents: number;
    status: "active" | "draft" | "closed";
    subject_id: string;
    attachment_url?: string | null;
    attachment_name?: string | null;
    weight: number;
    term: string;
    term_id?: string | null;
    description?: string;
    points: number;
    grading_style?: GradingStyle;
    grades_released?: boolean;
}

interface SubjectOption {
    id: string;
    title: string;
}

interface TermOption {
    id: string;
    name: string;
    is_active?: boolean;
}

const GRADING_STYLES: { id: GradingStyle; label: string; description: string }[] = [
    { id: 'points', label: 'Points Based', description: 'Score out of fixed points (e.g. 100 pts)' },
    { id: 'percentage', label: 'Percentage (%)', description: 'Direct percentage score (0 - 100%)' },
    { id: 'letter_grade', label: 'Letter Grade', description: 'Graded by institution scale bands (A, B, C...)' },
    { id: 'pass_fail', label: 'Pass / Fail', description: 'Binary competence evaluation' },
    { id: 'rubric', label: 'Rubric Criteria', description: 'Multi-criteria weighted scoring' }
];

const AssignmentCard = ({ 
    assignment, 
    onEdit, 
    onView, 
    onDelete,
    onToggleRelease
}: {
    assignment: Assignment;
    onEdit: (a: Assignment) => void;
    onView: (a: Assignment) => void;
    onDelete: (a: Assignment) => void;
    onToggleRelease: (a: Assignment) => void;
}) => {
    // Data integrity: flag if submissions exceed enrolled students
    const hasIntegrityWarning = assignment.submissions > 0 && assignment.totalStudents === 0;
    const displaySubmissions = assignment.totalStudents > 0
        ? Math.min(assignment.submissions, assignment.totalStudents)
        : assignment.submissions;

    const handleDownloadAttachment = async () => {
        if (!assignment.attachment_url) return;
        try {
            if (Platform.OS === 'web') {
                window.open(assignment.attachment_url, '_blank');
            } else {
                const supported = await Linking.canOpenURL(assignment.attachment_url);
                if (supported) {
                    await Linking.openURL(assignment.attachment_url);
                } else {
                    Alert.alert("Open Attachment", `File is at: ${assignment.attachment_url}`);
                }
            }
        } catch (err) {
            console.error("Download error:", err);
            Alert.alert("Error", "Could not open attachment file in original format");
        }
    };

    const getGradingStyleBadge = (style?: GradingStyle) => {
        switch (style) {
            case 'percentage': return { label: 'Percentage', bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400' };
            case 'letter_grade': return { label: 'Letter Grade', bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-600 dark:text-purple-400' };
            case 'pass_fail': return { label: 'Pass/Fail', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-600 dark:text-emerald-400' };
            case 'rubric': return { label: 'Rubric', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400' };
            case 'points':
            default:
                return { label: `${assignment.points} Pts`, bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-[#FF6900]' };
        }
    };

    const styleBadge = getGradingStyleBadge(assignment.grading_style);

    return (
        <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-3">
            <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 pr-3">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">{assignment.title}</Text>
                    <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                        <Text className="text-[#FF6900] text-[10px] font-bold uppercase tracking-widest">{assignment.Subject}</Text>
                        {assignment.term ? (
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider bg-gray-200/60 dark:bg-gray-800 px-2 py-0.5 rounded">
                                {assignment.term}
                            </Text>
                        ) : null}
                        <View className={`px-2 py-0.5 rounded ${styleBadge.bg}`}>
                            <Text className={`text-[10px] font-bold ${styleBadge.text}`}>{styleBadge.label}</Text>
                        </View>
                    </View>
                </View>
                <View className="flex-row items-center gap-2">
                    <Text className={`text-[10px] font-bold uppercase tracking-widest ${assignment.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {assignment.status || 'active'}
                    </Text>
                    <TouchableOpacity
                        onPress={() => onDelete(assignment)}
                        activeOpacity={0.7}
                        className="p-1.5 bg-[#EAEEF2] dark:bg-[#161B22] rounded-lg"
                    >
                        <Trash2 size={14} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <View className="flex-row mb-3 gap-4 flex-wrap">
                <View className="flex-row items-center">
                    <Calendar size={14} color="#FF6900" />
                    <Text className="text-gray-900 dark:text-white text-xs font-bold ml-1.5">{assignment.dueDate}</Text>
                </View>
                <View className="flex-row items-center">
                    <Users size={14} color={hasIntegrityWarning ? "#F59E0B" : "#6B7280"} />
                    <Text className={`text-xs font-bold ml-1.5 ${hasIntegrityWarning ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {hasIntegrityWarning
                            ? `${assignment.submissions} submitted (enrollment data missing)`
                            : `${displaySubmissions}/${assignment.totalStudents} submitted`
                        }
                    </Text>
                </View>
                {assignment.weight > 0 ? (
                    <View className="flex-row items-center">
                        <Trophy size={14} color="#8B5CF6" />
                        <Text className="text-purple-600 dark:text-purple-400 text-xs font-bold ml-1.5">Weight: {assignment.weight}%</Text>
                    </View>
                ) : null}
            </View>

            {/* Original Attachment Download Action */}
            {assignment.attachment_url ? (
                <TouchableOpacity
                    onPress={handleDownloadAttachment}
                    activeOpacity={0.7}
                    className="flex-row items-center bg-white dark:bg-[#0D1117] p-2.5 rounded-lg border border-[#D0D7DE] dark:border-[#30363D] mb-3"
                >
                    <Download size={15} color="#FF6900" />
                    <View className="flex-1 ml-2.5">
                        <Text className="text-gray-900 dark:text-white text-xs font-semibold" numberOfLines={1}>
                            {assignment.attachment_name || 'Download Attached Material'}
                        </Text>
                        <Text className="text-gray-400 text-[9px] uppercase tracking-wider">Original file format preserved</Text>
                    </View>
                </TouchableOpacity>
            ) : null}

            {/* Actions */}
            <View className="flex-row justify-between items-center mt-1 pt-2 border-t border-[#D0D7DE]/50 dark:border-[#21262D]">
                <TouchableOpacity
                    onPress={() => onToggleRelease(assignment)}
                    activeOpacity={0.7}
                    className={`flex-row items-center px-3 py-1.5 rounded-lg border ${assignment.grades_released ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'}`}
                >
                    <ShieldCheck size={13} color={assignment.grades_released ? "#10B981" : "#6B7280"} />
                    <Text className={`text-[11px] font-bold ml-1.5 ${assignment.grades_released ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {assignment.grades_released ? "Grades Released" : "Release Grades"}
                    </Text>
                </TouchableOpacity>

                <View className="flex-row gap-2">
                    <TouchableOpacity
                        className="flex-row items-center px-3 py-1.5 bg-[#EAEEF2] dark:bg-[#161B22] rounded-lg"
                        onPress={() => onView(assignment)}
                        activeOpacity={0.7}
                    >
                        <Eye size={13} color="#9CA3AF" />
                        <Text className="text-gray-900 dark:text-white text-xs ml-1.5 font-bold">Submissions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-row items-center px-3 py-1.5 bg-[#FF6900] rounded-lg"
                        onPress={() => onEdit(assignment)}
                        activeOpacity={0.7}
                    >
                        <Edit2 size={13} color="white" />
                        <Text className="text-white text-xs ml-1.5 font-bold">Edit</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default function AssignmentsPage() {
    const { teacherId, isDemo } = useAuth();
    const { isDark } = useTheme();
    const tier = useSubscriptionTier();
    const [showModal, setShowModal] = useState(false);
    const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [filter, setFilter] = useState<"all" | "active" | "draft" | "closed">("all");
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [Subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [terms, setTerms] = useState<TermOption[]>([]);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [points, setPoints] = useState("100");
    const [weight, setWeight] = useState("0");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [selectedTermId, setSelectedTermId] = useState("");
    const [termName, setTermName] = useState("");
    const [gradingStyle, setGradingStyle] = useState<GradingStyle>("points");
    const [dateObject, setDateObject] = useState(new Date());
    const [selectedFile, setSelectedFile] = useState<DocumentPickerAsset | null>(null);
    const [uploading, setUploading] = useState(false);

    const openManual = (anchor?: string) => {
        router.push({ pathname: '/(teacher)/accessibility/settings', params: { manual: '1', anchor: anchor || 'grading-ops' } } as any);
    };

    const filteredAssignments = useMemo(() => {
        return filter === "all"
            ? assignments
            : assignments.filter(a => a.status === filter);
    }, [assignments, filter]);

    useEffect(() => {
        if (teacherId) {
            fetchAssignments();
            fetchSubjects();
            fetchTerms();
        }
    }, [teacherId]);

    const fetchTerms = async () => {
        try {
            const data = await GradingAPI.getTerms();
            if (Array.isArray(data) && data.length > 0) {
                const termOptions: TermOption[] = data.map(t => ({
                    id: t.id,
                    name: t.name,
                    is_active: t.is_active
                }));
                setTerms(termOptions);
                const active = termOptions.find(t => t.is_active) || termOptions[0];
                if (active && !selectedTermId) {
                    setSelectedTermId(active.id);
                    setTermName(active.name);
                }
            } else {
                setTerms([
                    { id: 'term-1', name: 'Term 1' },
                    { id: 'term-2', name: 'Term 2' },
                    { id: 'term-3', name: 'Term 3' }
                ]);
            }
        } catch (err) {
            console.error("Error fetching terms from DB:", err);
            setTerms([
                { id: 'term-1', name: 'Term 1' },
                { id: 'term-2', name: 'Term 2' },
                { id: 'term-3', name: 'Term 3' }
            ]);
        }
    };

    const fetchSubjects = async () => {
        if (!teacherId) return;
        try {
            const data = await SubjectAPI.getFilteredSubjects();
            setSubjects((data || []).map(s => ({ id: s.id, title: s.title })));
        } catch (error) {
            console.error("Error fetching filtered subjects:", error);
            showFetchError("subjects", error);
            setSubjects([]);
        }
    };

    const fetchAssignments = async () => {
        if (!teacherId) return;
        try {
            setLoading(true);
            const { data, error } = await (supabase.from('assignments') as any)
                .select(`
                    id, 
                    title, 
                    due_date, 
                    status, 
                    subject_id, 
                    attachment_url, 
                    attachment_name, 
                    description, 
                    total_points, 
                    weight, 
                    term,
                    term_id,
                    grading_style,
                    grades_released,
                    subject:subjects(title, class_id)
                `)
                .eq('teacher_id', teacherId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const assignmentList = (data as any[] || []);
            const assignmentIds = assignmentList.map(a => a.id);
            const subjectIds = [...new Set(assignmentList.map(a => a.subject_id).filter(Boolean))];
            const classIds = [...new Set(assignmentList.map(a => a.subject?.class_id).filter(Boolean))];

            const enrollmentCountsMap: Record<string, number> = {};
            if (subjectIds.length > 0) {
                const { data: enrollmentsData } = await supabase
                    .from('enrollments')
                    .select('subject_id')
                    .in('subject_id', subjectIds)
                    .eq('status', 'enrolled');

                (enrollmentsData as any[] || []).forEach(e => {
                    enrollmentCountsMap[e.subject_id] = (enrollmentCountsMap[e.subject_id] || 0) + 1;
                });

                if (classIds.length > 0) {
                    const { data: classEnrollmentsData } = await supabase
                        .from('class_enrollments')
                        .select('student_id, class_id');

                    const classStudentMap: Record<string, Set<string>> = {};
                    (classEnrollmentsData as any[] || []).forEach(ce => {
                        if (!classStudentMap[ce.class_id]) {
                            classStudentMap[ce.class_id] = new Set();
                        }
                        classStudentMap[ce.class_id].add(ce.student_id);
                    });

                    assignmentList.forEach(a => {
                        const classId = a.subject?.class_id;
                        if (classId && classStudentMap[classId]) {
                            const existingCount = enrollmentCountsMap[a.subject_id] || 0;
                            const classCount = classStudentMap[classId].size;
                            enrollmentCountsMap[a.subject_id] = Math.max(existingCount, classCount);
                        }
                    });
                }
            }

            const submissionCountsMap: Record<string, number> = {};
            if (assignmentIds.length > 0) {
                const { data: submissionsData } = await supabase
                    .from('submissions')
                    .select('assignment_id, status')
                    .in('assignment_id', assignmentIds);

                const SUBMITTED_STATUSES = ['submitted', 'graded', 'late'];
                (submissionsData as any[] || []).forEach(s => {
                    if (SUBMITTED_STATUSES.includes(s.status)) {
                        submissionCountsMap[s.assignment_id] = (submissionCountsMap[s.assignment_id] || 0) + 1;
                    }
                });
            }

            const formatted: Assignment[] = assignmentList.map((a: any) => ({
                id: a.id,
                title: a.title,
                Subject: a.subject?.title || "Unknown Subject",
                subject_id: a.subject_id,
                dueDate: a.due_date ? new Date(a.due_date).toLocaleDateString() : "No Due Date",
                due_date_iso: a.due_date,
                submissions: submissionCountsMap[a.id] || 0,
                totalStudents: enrollmentCountsMap[a.subject_id] || 0,
                status: a.status || 'active',
                attachment_url: a.attachment_url,
                attachment_name: a.attachment_name,
                description: a.description || "",
                points: a.total_points || 100,
                weight: a.weight || 0,
                term: a.term || "",
                term_id: a.term_id || null,
                grading_style: a.grading_style || 'points',
                grades_released: Boolean(a.grades_released)
            }));

            setAssignments(formatted);
        } catch (error) {
            console.error('[fetchAssignments] Error:', error);
            showFetchError("assignments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (a: Assignment) => {
        setEditingAssignment(a);
        setTitle(a.title);
        setDescription(a.description || "");
        setPoints(a.points.toString());
        setSelectedSubjectId(a.subject_id);
        const d = a.due_date_iso ? new Date(a.due_date_iso) : new Date();
        setDateObject(d);
        setDueDate(a.due_date_iso ? a.due_date_iso.split('T')[0] : "");
        setWeight(a.weight.toString());
        setTermName(a.term || "");
        setSelectedTermId(a.term_id || "");
        setGradingStyle(a.grading_style || "points");
        setModalStep(1);
        setShowModal(true);
    };

    const handleToggleRelease = async (a: Assignment) => {
        const nextState = !a.grades_released;
        try {
            const { error } = await (supabase.from('assignments') as any)
                .update({ grades_released: nextState })
                .eq('id', a.id);
            if (error) throw error;

            setAssignments(prev => prev.map(item => item.id === a.id ? { ...item, grades_released: nextState } : item));
            Toast.show({
                type: 'success',
                text1: nextState ? 'Grades Released' : 'Grades Hidden',
                text2: nextState ? 'Students and parents can now view assignment grades.' : 'Assignment grades are now restricted.'
            });
        } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to update grade release status");
        }
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setDueDate("");
        setPoints("100");
        setWeight("0");
        setSelectedSubjectId("");
        setSelectedFile(null);
        setEditingAssignment(null);
        setGradingStyle("points");
        setModalStep(1);
    };

    const handleDelete = async (a: Assignment) => {
        const performDelete = async () => {
            if (isDemo) {
                setAssignments(prev => prev.filter(item => item.id !== a.id));
                Toast.show({
                    type: 'success',
                    text1: 'Done',
                    text2: 'Changes saved.'
                });
                return;
            }
            try {
                setLoading(true);
                const { error } = await (supabase.from('assignments') as any).delete().eq('id', a.id);
                if (error) throw error;

                try {
                    const { data: existingEntries } = await (supabase.from('diary_entries') as any)
                        .select('id')
                        .ilike('title', `%Assignment%${a.title}%`)
                        .limit(1);
                    const entries = existingEntries as any[];
                    if (entries && entries.length > 0) {
                        await DiaryAPI.deleteEntry(entries[0].id);
                    }
                } catch (e) { console.error('Diary entry delete error:', e); }

                Alert.alert("Success", "Assignment deleted successfully");
                fetchAssignments();
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Failed to delete assignment";
                Alert.alert("Error", message);
            } finally {
                setLoading(false);
            }
        };

        if (Platform.OS === 'web') {
            if (confirm("Are you sure you want to delete this assignment?")) performDelete();
        } else {
            Alert.alert(
                "Delete Assignment",
                "Are you sure you want to delete this assignment? This action cannot be undone.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: performDelete }
                ]
            );
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            if (result.assets && result.assets.length > 0) {
                setSelectedFile(result.assets[0]);
            }
        } catch (err) {
            console.error("Error picking document:", err);
            Alert.alert("Error", "Failed to pick document");
        }
    };

    const validateStep = (step: number): boolean => {
        if (step === 1) {
            if (!title.trim()) {
                Alert.alert("Validation", "Please enter an assignment title");
                return false;
            }
        } else if (step === 2) {
            if (!selectedSubjectId) {
                Alert.alert("Validation", "Please select a target subject");
                return false;
            }
            if (!termName.trim() && !selectedTermId) {
                Alert.alert("Validation", "Please choose an academic term from the database");
                return false;
            }
        } else if (step === 3) {
            const pointsVal = parseInt(points) || 0;
            if (gradingStyle === 'points' && pointsVal <= 0) {
                Alert.alert("Validation", "Please enter a valid positive points value");
                return false;
            }
        } else if (step === 4) {
            if (!dueDate) {
                Alert.alert("Validation", "Please set a due date for this assignment");
                return false;
            }
        }
        return true;
    };

    const goToNextStep = () => {
        if (!validateStep(modalStep)) return;
        if (modalStep < 5) {
            setModalStep((modalStep + 1) as any);
        }
    };

    const goToPrevStep = () => {
        if (modalStep > 1) {
            setModalStep((modalStep - 1) as any);
        }
    };

    const saveAssignment = async () => {
        if (uploading) return;
        if (!teacherId) {
            Alert.alert("Error", "Teacher ID not found. Please log out and log back in.");
            return;
        }

        if (!title.trim() || !selectedSubjectId) {
            Alert.alert("Missing Fields", "Please ensure Title and Subject are selected.");
            return;
        }

        const pointsVal = parseInt(points) || 100;
        const weightVal = parseFloat(weight) || 0;

        if (isDemo) {
            if (editingAssignment) {
                setAssignments(prev => prev.map(a => a.id === editingAssignment.id ? {
                    ...a,
                    title: title.trim(),
                    description: description.trim(),
                    dueDate: dateObject.toLocaleDateString(),
                    due_date_iso: dateObject.toISOString(),
                    points: pointsVal,
                    weight: weightVal,
                    term: termName.trim(),
                    term_id: selectedTermId || null,
                    grading_style: gradingStyle,
                    subject_id: selectedSubjectId,
                    Subject: Subjects.find(s => s.id === selectedSubjectId)?.title || a.Subject
                } : a));
            } else {
                const newAssign: Assignment = {
                    id: Math.random().toString(),
                    title: title.trim(),
                    description: description.trim(),
                    dueDate: dateObject.toLocaleDateString(),
                    due_date_iso: dateObject.toISOString(),
                    points: pointsVal,
                    weight: weightVal,
                    term: termName.trim(),
                    term_id: selectedTermId || null,
                    grading_style: gradingStyle,
                    subject_id: selectedSubjectId,
                    Subject: Subjects.find(s => s.id === selectedSubjectId)?.title || "Selected Subject",
                    submissions: 0,
                    totalStudents: 0,
                    status: 'active',
                    grades_released: false
                };
                setAssignments(prev => [newAssign, ...prev]);
            }
            setShowModal(false);
            resetForm();
            Toast.show({
                type: 'success',
                text1: 'Done',
                text2: 'Changes saved.'
            });
            return;
        }

        setUploading(true);
        let attachmentUrl = editingAssignment?.attachment_url || null;
        let attachmentName = editingAssignment?.attachment_name || null;

        try {
            if (selectedFile) {
                try {
                    const fileExt = selectedFile.name.split('.').pop();
                    const filePath = `${teacherId}/${Date.now()}.${fileExt}`;

                    const file = new File(selectedFile.uri);
                    const base64 = await file.base64();
                    const fileBody = decode(base64);

                    const { error: uploadError } = await supabase.storage
                        .from('course_materials')
                        .upload(filePath, fileBody, {
                            contentType: selectedFile.mimeType || 'application/octet-stream',
                        });

                    if (uploadError) {
                        console.error('[saveAssignment] Storage upload error:', uploadError);
                        Alert.alert("Upload Warning", "File upload failed. The assignment will be saved without attachment.");
                    } else {
                        const { data: urlData } = supabase.storage
                            .from('course_materials')
                            .getPublicUrl(filePath);
                        attachmentUrl = urlData.publicUrl;
                        attachmentName = selectedFile.name;
                    }
                } catch (uploadErr: unknown) {
                    console.error('[saveAssignment] File upload catch error:', uploadErr);
                }
            }

            const payload = {
                teacher_id: teacherId,
                subject_id: selectedSubjectId,
                title: title.trim(),
                description: description.trim(),
                due_date: dateObject.toISOString(),
                total_points: pointsVal,
                status: 'active' as const,
                attachment_url: attachmentUrl,
                attachment_name: attachmentName,
                weight: weightVal,
                term: termName.trim(),
                term_id: selectedTermId || null,
                grading_style: gradingStyle
            };

            if (editingAssignment) {
                const { teacher_id: _t, status: _s, ...updatePayload } = payload;
                const { error } = await (supabase.from('assignments') as any)
                    .update(updatePayload)
                    .eq('id', editingAssignment.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase.from('assignments') as any).insert(payload);
                if (error) throw error;
            }

            // Diary Sync
            try {
                const { data: subjectData } = await (supabase
                    .from('subjects')
                    .select('class_id')
                    .eq('id', selectedSubjectId)
                    .single() as unknown as Promise<{ data: { class_id: string } | null; error: any }>);

                if (subjectData?.class_id) {
                    if (editingAssignment) {
                        const { data: existingEntries } = await (supabase.from('diary_entries') as any)
                            .select('id')
                            .eq('class_id', subjectData.class_id)
                            .ilike('title', `%Assignment%${editingAssignment.title}%`)
                            .limit(1);

                        const entries = existingEntries as any[];
                        if (entries && entries.length > 0) {
                            await DiaryAPI.updateEntry(entries[0].id, {
                                title: `Assignment Update: ${title}`,
                                content: `The assignment "${title}" has been updated.\nDue Date: ${dueDate || 'Not set'}\nStyle: ${gradingStyle}`,
                            });
                        }
                    } else {
                        await DiaryAPI.createEntry({
                            class_id: subjectData.class_id,
                            title: `New Assignment: ${title}`,
                            content: `A new assignment has been published: ${title}.\nDue Date: ${dueDate || 'Not set'}\nGrading: ${gradingStyle}`,
                            entry_date: new Date().toISOString().split('T')[0]
                        });
                    }
                }
            } catch (diaryErr) {
                console.error('[saveAssignment] Failed to sync diary:', diaryErr);
            }

            setShowModal(false);
            fetchAssignments();
            resetForm();
            Toast.show({
                type: 'success',
                text1: 'Assignment Saved',
                text2: editingAssignment ? 'Updated successfully' : 'Created and assigned to class'
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save assignment";
            Alert.alert("Error", message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Management"
                subtitle="Assignments"
                role="Teacher"
                fallbackPath="/(teacher)/management"
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 60 }}
            >
                <View className="px-5 pt-4">
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-6">
                        <View>
                            <View className="flex-row items-center">
                                <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                                    {assignments.length} total assignments
                                </Text>
                                <HelpTooltip id="teacher.manage.coursework" role="teacher" tier={tier} onLearnMore={openManual} />
                            </View>
                        </View>
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                className="flex-row items-center bg-[#FF6900] px-4 py-2 rounded-lg shadow-sm"
                                onPress={() => { resetForm(); setShowModal(true); }}
                                activeOpacity={0.7}
                            >
                                <Plus size={16} color="white" />
                                <Text className="text-white font-bold text-xs ml-2 uppercase tracking-widest">New Assignment</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Stats */}
                    <View className="flex-row gap-4 mb-6">
                        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]">
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest">Active</Text>
                            <Text className="text-gray-900 dark:text-white text-2xl font-black mt-1">
                                {assignments.filter(a => a.status === "active").length}
                            </Text>
                        </View>
                        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]">
                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest">Submissions</Text>
                            <Text className="text-gray-900 dark:text-white text-2xl font-black mt-1">
                                {assignments.reduce((acc, a) => acc + a.submissions, 0)}
                            </Text>
                        </View>
                    </View>

                    {/* Filter Tabs */}
                    <View className="flex-row items-center mb-2 px-1">
                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Assignment Status</Text>
                        <HelpTooltip id="teacher.manage.coursework" role="teacher" tier={tier} onLearnMore={openManual} />
                    </View>
                    <ScrollView className="flex-row bg-white dark:bg-[#161B22] rounded-2xl p-1.5 mb-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                        {(["all", "active", "draft", "closed"] as const).map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                className={`mr-6 pb-2 border-b-2 ${filter === tab ? "border-[#FF6900]" : "border-transparent"}`}
                                onPress={() => setFilter(tab)}
                                activeOpacity={0.7}
                            >
                                <Text className={`font-bold ${filter === tab ? "text-[#FF6900]" : "text-gray-500 dark:text-gray-400"}`}>
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Assignment List */}
                    {loading ? (
                        <ListItemSkeleton loading={loading} count={4} label="Loading assignments..." />
                    ) : filteredAssignments.length === 0 ? (
                        <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-8 rounded-xl items-center border border-[#D0D7DE] dark:border-[#21262D]">
                            <FileText size={40} color={isDark ? "#4B5563" : "#9CA3AF"} />
                            <Text className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest mt-3">No assignments found</Text>
                        </View>
                    ) : (
                        filteredAssignments.map((assignment) => (
                            <AssignmentCard
                                key={assignment.id}
                                assignment={assignment}
                                onEdit={handleEdit}
                                onView={(a) => router.push({ pathname: "/(teacher)/management/submissions", params: { assignmentId: a.id } } as any)}
                                onDelete={handleDelete}
                                onToggleRelease={handleToggleRelease}
                            />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Refactored 5-Step Create/Edit Assignment Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/70 justify-end">
                    <View className="bg-[#FFFFFF] dark:bg-[#161B22] rounded-t-3xl p-6 h-[88%] border-t border-[#D0D7DE] dark:border-[#21262D]">
                        
                        {/* Modal Header */}
                        <View className="flex-row justify-between items-center mb-4">
                            <View>
                                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                                    {editingAssignment ? "Edit Assignment" : "New Assignment"}
                                </Text>
                                <Text className="text-xs text-gray-400">Step {modalStep} of 5</Text>
                            </View>
                            <TouchableOpacity
                                className="w-10 h-10 bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl items-center justify-center border border-[#D0D7DE] dark:border-[#21262D]"
                                onPress={() => { setShowModal(false); resetForm(); }}
                            >
                                <X size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {/* Step Progress Bar */}
                        <View className="flex-row gap-1.5 mb-5">
                            {[1, 2, 3, 4, 5].map(step => (
                                <View 
                                    key={step} 
                                    className={`h-1.5 flex-1 rounded-full ${step <= modalStep ? 'bg-[#FF6900]' : 'bg-gray-200 dark:bg-gray-800'}`} 
                                />
                            ))}
                        </View>

                        <ScrollView 
                            style={{ flex: 1 }} 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 30 }}
                        >
                            {/* STEP 1: BASICS */}
                            {modalStep === 1 && (
                                <View>
                                    <View className="flex-row items-center mb-1">
                                        <Type size={16} color="#FF6900" />
                                        <Text className="text-base font-bold text-gray-900 dark:text-white ml-2">Step 1: Assignment Basics</Text>
                                    </View>
                                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-5">Give your assignment a clear title and instructions for students.</Text>

                                    <View className="mb-4">
                                        <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Title *</Text>
                                        <TextInput
                                            className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-semibold border border-[#D0D7DE] dark:border-[#21262D]"
                                            placeholder="e.g. History Mid-Term Essay"
                                            placeholderTextColor="#9CA3AF"
                                            value={title}
                                            onChangeText={setTitle}
                                        />
                                    </View>

                                    <View className="mb-4">
                                        <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Instructions / Description</Text>
                                        <TextInput
                                            className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-medium border border-[#D0D7DE] dark:border-[#21262D]"
                                            placeholder="Specify guidelines, references, and deliverables..."
                                            placeholderTextColor="#9CA3AF"
                                            multiline
                                            textAlignVertical="top"
                                            value={description}
                                            onChangeText={setDescription}
                                            style={{ minHeight: 120 }}
                                        />
                                    </View>
                                </View>
                            )}

                            {/* STEP 2: TARGETING & TERM FROM DATABASE */}
                            {modalStep === 2 && (
                                <View>
                                    <View className="flex-row items-center mb-1">
                                        <BookOpen size={16} color="#FF6900" />
                                        <Text className="text-base font-bold text-gray-900 dark:text-white ml-2">Step 2: Subject & Academic Term</Text>
                                    </View>
                                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-5">Assign this to your enrolled subject and the current institution term.</Text>

                                    {/* Subject Selection */}
                                    <View className="mb-5">
                                        <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2.5">Target Subject *</Text>
                                        {Subjects.length === 0 ? (
                                            <View className="bg-[#F6F8FA] dark:bg-[#0D1117] p-4 rounded-xl border border-dashed border-[#D0D7DE] dark:border-[#21262D]">
                                                <Text className="text-gray-400 text-xs text-center">No assigned subjects available.</Text>
                                            </View>
                                        ) : (
                                            <View className="flex-row flex-wrap gap-2">
                                                {Subjects.map(sub => {
                                                    const isSelected = selectedSubjectId === sub.id;
                                                    return (
                                                        <TouchableOpacity
                                                            key={sub.id}
                                                            onPress={() => setSelectedSubjectId(sub.id)}
                                                            activeOpacity={0.7}
                                                            className={`px-3.5 py-2.5 rounded-xl border ${isSelected ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-[#F6F8FA] dark:bg-[#0D1117] border-[#D0D7DE] dark:border-[#21262D]'}`}
                                                        >
                                                            <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-300'}`}>
                                                                {sub.title}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>

                                    {/* DB Academic Terms */}
                                    <View className="mb-4">
                                        <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2.5">Academic Term (From Database) *</Text>
                                        <View className="flex-row flex-wrap gap-2">
                                            {terms.map(t => {
                                                const isSelected = selectedTermId === t.id || termName === t.name;
                                                return (
                                                    <TouchableOpacity
                                                        key={t.id}
                                                        onPress={() => {
                                                            setSelectedTermId(t.id);
                                                            setTermName(t.name);
                                                        }}
                                                        activeOpacity={0.7}
                                                        className={`px-4 py-2.5 rounded-xl border ${isSelected ? 'bg-orange-500 border-orange-500' : 'bg-[#F6F8FA] dark:bg-[#0D1117] border-[#D0D7DE] dark:border-[#21262D]'}`}
                                                    >
                                                        <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-300'}`}>
                                                            {t.name}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* STEP 3: FLEXIBLE GRADING STYLES */}
                            {modalStep === 3 && (
                                <View>
                                    <View className="flex-row items-center mb-1">
                                        <Award size={16} color="#FF6900" />
                                        <Text className="text-base font-bold text-gray-900 dark:text-white ml-2">Step 3: Grading Style & Scale</Text>
                                    </View>
                                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-5">Select how student submissions for this assignment will be evaluated.</Text>

                                    <View className="gap-2.5 mb-5">
                                        {GRADING_STYLES.map(style => {
                                            const isSelected = gradingStyle === style.id;
                                            return (
                                                <TouchableOpacity
                                                    key={style.id}
                                                    onPress={() => setGradingStyle(style.id)}
                                                    activeOpacity={0.7}
                                                    className={`p-3.5 rounded-xl border flex-row items-center justify-between ${isSelected ? 'bg-orange-500/10 border-[#FF6900]' : 'bg-[#F6F8FA] dark:bg-[#0D1117] border-[#D0D7DE] dark:border-[#21262D]'}`}
                                                >
                                                    <View className="flex-1 pr-2">
                                                        <Text className={`font-bold text-xs ${isSelected ? 'text-[#FF6900]' : 'text-gray-900 dark:text-white'}`}>{style.label}</Text>
                                                        <Text className="text-gray-500 text-[11px] mt-0.5">{style.description}</Text>
                                                    </View>
                                                    {isSelected ? <Check size={16} color="#FF6900" /> : null}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    <View className="flex-row gap-3 mb-4">
                                        <View className="flex-1">
                                            <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Max Points / Score</Text>
                                            <TextInput
                                                className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold border border-[#D0D7DE] dark:border-[#21262D]"
                                                placeholder="100"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                                value={points}
                                                onChangeText={setPoints}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Report Card Weight (%)</Text>
                                            <TextInput
                                                className="bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold border border-[#D0D7DE] dark:border-[#21262D]"
                                                placeholder="e.g. 20"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                                value={weight}
                                                onChangeText={setWeight}
                                            />
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* STEP 4: SCHEDULE & DUE DATE */}
                            {modalStep === 4 && (
                                <View>
                                    <View className="flex-row items-center mb-1">
                                        <Calendar size={16} color="#FF6900" />
                                        <Text className="text-base font-bold text-gray-900 dark:text-white ml-2">Step 4: Scheduling & Due Date</Text>
                                    </View>
                                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-5">Set the deadline for student submission.</Text>

                                    <View className="mb-5">
                                        <DatePicker
                                            label="Assignment Due Date *"
                                            value={dueDate}
                                            onChange={(v) => {
                                                setDueDate(v);
                                                if (v) setDateObject(new Date(v));
                                            }}
                                            isDark={isDark}
                                        />
                                    </View>

                                    <View className="bg-[#F6F8FA] dark:bg-[#0D1117] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]">
                                        <Text className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">Submissions Window</Text>
                                        <Text className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                            Students will be able to submit their work up until 23:59 on the selected due date. Submissions after this date will be tagged as late.
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* STEP 5: ATTACHMENTS & REVIEW */}
                            {modalStep === 5 && (
                                <View>
                                    <View className="flex-row items-center mb-1">
                                        <CheckCircle2 size={16} color="#FF6900" />
                                        <Text className="text-base font-bold text-gray-900 dark:text-white ml-2">Step 5: Materials & Final Review</Text>
                                    </View>
                                    <Text className="text-xs text-gray-500 dark:text-gray-400 mb-5">Attach original materials (PDF, DOCX, etc.) and confirm settings.</Text>

                                    {/* Upload box */}
                                    <View className="mb-5">
                                        <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Original Format Attachment</Text>
                                        <TouchableOpacity
                                            onPress={pickDocument}
                                            activeOpacity={0.7}
                                            className={`flex-row items-center justify-center border-dashed border-2 rounded-xl p-5 ${selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#0D1117]'}`}
                                        >
                                            {selectedFile ? (
                                                <View className="items-center">
                                                    <FileText size={24} color="#10B981" />
                                                    <Text className="text-green-900 dark:text-green-400 font-bold mt-2 text-center text-xs">{selectedFile.name}</Text>
                                                    <Text className="text-green-600 text-[10px] mt-0.5">Click to replace file</Text>
                                                </View>
                                            ) : (
                                                <View className="items-center">
                                                    <Upload size={22} color="#9CA3AF" />
                                                    <Text className="text-gray-900 dark:text-white font-bold mt-1.5 text-xs">Upload Material</Text>
                                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-widest mt-0.5">PDF, DOCX, PPTX, Images</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    {/* Review Card */}
                                    <View className="bg-[#F6F8FA] dark:bg-[#0D1117] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-5">
                                        <Text className="text-xs font-bold uppercase tracking-wider text-[#FF6900] mb-3">Assignment Summary</Text>
                                        <View className="gap-2">
                                            <View className="flex-row justify-between">
                                                <Text className="text-xs text-gray-500">Title:</Text>
                                                <Text className="text-xs font-bold text-gray-900 dark:text-white flex-1 text-right ml-4">{title || 'Untitled'}</Text>
                                            </View>
                                            <View className="flex-row justify-between">
                                                <Text className="text-xs text-gray-500">Subject:</Text>
                                                <Text className="text-xs font-bold text-gray-900 dark:text-white">{Subjects.find(s => s.id === selectedSubjectId)?.title || 'Not selected'}</Text>
                                            </View>
                                            <View className="flex-row justify-between">
                                                <Text className="text-xs text-gray-500">Term:</Text>
                                                <Text className="text-xs font-bold text-gray-900 dark:text-white">{termName || 'Default Term'}</Text>
                                            </View>
                                            <View className="flex-row justify-between">
                                                <Text className="text-xs text-gray-500">Grading Style:</Text>
                                                <Text className="text-xs font-bold text-gray-900 dark:text-white uppercase">{gradingStyle}</Text>
                                            </View>
                                            <View className="flex-row justify-between">
                                                <Text className="text-xs text-gray-500">Total Points & Weight:</Text>
                                                <Text className="text-xs font-bold text-gray-900 dark:text-white">{points} pts ({weight}%)</Text>
                                            </View>
                                            <View className="flex-row justify-between">
                                                <Text className="text-xs text-gray-500">Due Date:</Text>
                                                <Text className="text-xs font-bold text-gray-900 dark:text-white">{dueDate || 'Not set'}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        {/* Modal Navigation Buttons */}
                        <View className="flex-row justify-between items-center pt-3 border-t border-[#D0D7DE] dark:border-[#21262D]">
                            {modalStep > 1 ? (
                                <TouchableOpacity
                                    onPress={goToPrevStep}
                                    activeOpacity={0.7}
                                    className="flex-row items-center px-4 py-3 bg-[#F6F8FA] dark:bg-[#0D1117] rounded-xl border border-[#D0D7DE] dark:border-[#21262D]"
                                >
                                    <ArrowLeft size={16} color="#6B7280" />
                                    <Text className="text-gray-700 dark:text-gray-300 font-bold text-xs ml-1.5 uppercase tracking-wider">Back</Text>
                                </TouchableOpacity>
                            ) : (
                                <View />
                            )}

                            {modalStep < 5 ? (
                                <TouchableOpacity
                                    onPress={goToNextStep}
                                    activeOpacity={0.7}
                                    className="flex-row items-center px-6 py-3 bg-[#FF6900] rounded-xl"
                                >
                                    <Text className="text-white font-bold text-xs mr-1.5 uppercase tracking-wider">Continue</Text>
                                    <ArrowRight size={16} color="white" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={saveAssignment}
                                    disabled={uploading}
                                    activeOpacity={0.7}
                                    className={`flex-row items-center px-6 py-3 bg-green-600 rounded-xl ${uploading ? 'opacity-70' : ''}`}
                                >
                                    {uploading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} color="white" />
                                            <Text className="text-white font-bold text-xs ml-2 uppercase tracking-wider">
                                                {editingAssignment ? "Update Assignment" : "Publish Assignment"}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
