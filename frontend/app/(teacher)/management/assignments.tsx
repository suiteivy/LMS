import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { HelpTooltip } from "@/components/settings/HelpTooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import Toast from 'react-native-toast-message';
import { supabase } from "@/libs/supabase";
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from "base64-arraybuffer";
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from "expo-router";
import { AlignLeft, Calendar, Edit2, Eye, FileText, Plus, Printer, Target, Trophy, Trash2, Type, Upload, Users, X, BookOpen } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { DiaryAPI } from "@/services/DiaryService";
import { SubjectAPI } from "@/services/SubjectService";
import * as Print from 'expo-print';

import * as Sharing from 'expo-sharing';
import { DocumentPickerAsset } from 'expo-document-picker';

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
    description?: string;
    points: number;
}

interface SubjectOption {
    id: string;
    title: string;
}

const AssignmentCard = ({ assignment, onEdit, onView, onDelete }: {
    assignment: Assignment;
    onEdit: (a: Assignment) => void;
    onView: (a: Assignment) => void;
    onDelete: (a: Assignment) => void;
}) => {
    const getStatusStyle = (status: string) => {
        if (status === "active") return "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900";
        if (status === "draft") return "bg-gray-50 dark:bg-gray-950/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800";
        return "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900";
    };

    const progressPercent = assignment.totalStudents > 0
        ? Math.min((assignment.submissions / assignment.totalStudents) * 100, 100)
        : 0;

    // Data integrity: flag if submissions exceed enrolled students
    const hasIntegrityWarning = assignment.submissions > 0 && assignment.totalStudents === 0;
    // Cap numerator at denominator for display — orphaned submissions don't inflate the fraction
    const displaySubmissions = assignment.totalStudents > 0
        ? Math.min(assignment.submissions, assignment.totalStudents)
        : assignment.submissions;

    return (
        <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] mb-3">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-3">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">{assignment.title}</Text>
                    <Text className="text-[#FF6900] text-[10px] font-bold mt-1 uppercase tracking-widest">{assignment.Subject}</Text>
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

            <View className="flex-row mb-4 gap-4">
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
            </View>

            {/* Actions */}
            <View className="flex-row justify-end gap-2 mt-1">
                <TouchableOpacity
                    className="flex-row items-center px-4 py-2 bg-[#EAEEF2] dark:bg-[#161B22] rounded-lg"
                    onPress={() => onView(assignment)}
                    activeOpacity={0.7}
                >
                    <Eye size={14} color="#9CA3AF" />
                    <Text className="text-gray-900 dark:text-white text-xs ml-2 font-bold">View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-row items-center px-4 py-2 bg-[#FF6900] rounded-lg"
                    onPress={() => onEdit(assignment)}
                    activeOpacity={0.7}
                >
                    <Edit2 size={14} color="white" />
                    <Text className="text-white text-xs ml-2 font-bold">Edit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function AssignmentsPage() {
    const { teacherId, isDemo } = useAuth();
    const { isDark } = useTheme();
    const tier = useSubscriptionTier();
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState<"all" | "active" | "draft" | "closed">("all");
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [Subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [points, setPoints] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [dateObject, setDateObject] = useState(new Date())
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [selectedFile, setSelectedFile] = useState<DocumentPickerAsset | null>(null);
    const [uploading, setUploading] = useState(false);
    const [weight, setWeight] = useState("");
    const [term, setTerm] = useState("");
    const openManual = (anchor?: string) => {
        router.push({ pathname: '/(teacher)/accessibility/settings', params: { manual: '1', anchor: anchor || 'grading-ops' } } as any);
    };

    const onDateChange = (_event: any, selectedDate?: Date) => {
        setShowDatePicker(false)
        if (selectedDate) {
            setDateObject(selectedDate)
            setDueDate(selectedDate.toISOString().split('T')[0])
        }
    }

    const filteredAssignments = useMemo(() => {
        return filter === "all"
            ? assignments
            : assignments.filter(a => a.status === filter);
    }, [assignments, filter]);

    useEffect(() => {
        if (teacherId) {
            fetchAssignments();
            fetchSubjects();
        }
    }, [teacherId]);

    const fetchSubjects = async () => {
        if (!teacherId) return;
        try {
            const data = await SubjectAPI.getFilteredSubjects();
            setSubjects((data || []).map(s => ({ id: s.id, title: s.title })));
        } catch (error) {
            console.error("Error fetching filtered subjects:", error);
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
                    subject:subjects(title, class_id)
                `)
                .eq('teacher_id', teacherId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const assignments = (data as any[] || []);
            const assignmentIds = assignments.map(a => a.id);
            const subjectIds = [...new Set(assignments.map(a => a.subject_id).filter(Boolean))];
            const classIds = [...new Set(assignments.map(a => a.subject?.class_id).filter(Boolean))];

            // Enrollment count per subject — query BOTH enrollment tables
            const enrollmentCountsMap: Record<string, number> = {};
            if (subjectIds.length > 0) {
                // 1. Direct subject enrollments
                const { data: enrollmentsData } = await supabase
                    .from('enrollments')
                    .select('subject_id')
                    .in('subject_id', subjectIds)
                    .eq('status', 'enrolled');

                (enrollmentsData as any[] || []).forEach(e => {
                    enrollmentCountsMap[e.subject_id] = (enrollmentCountsMap[e.subject_id] || 0) + 1;
                });

                // 2. Class-based enrollments (student → class → subject)
                if (classIds.length > 0) {
                    const { data: classEnrollmentsData } = await supabase
                        .from('class_enrollments')
                        .select('student_id, class_id');

                    // Build a map: class_id → list of student_ids
                    const classStudentMap: Record<string, Set<string>> = {};
                    (classEnrollmentsData as any[] || []).forEach(ce => {
                        if (!classStudentMap[ce.class_id]) {
                            classStudentMap[ce.class_id] = new Set();
                        }
                        classStudentMap[ce.class_id].add(ce.student_id);
                    });

                    // For each subject, count unique students from its class
                    assignments.forEach(a => {
                        const classId = a.subject?.class_id;
                        if (classId && classStudentMap[classId]) {
                            const existingCount = enrollmentCountsMap[a.subject_id] || 0;
                            const classCount = classStudentMap[classId].size;
                            // Use the higher of the two counts (avoid double-counting)
                            enrollmentCountsMap[a.subject_id] = Math.max(existingCount, classCount);
                        }
                    });
                }
            }

            // Submission count per assignment — only count non-missing, non-pending statuses
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

            const formatted: Assignment[] = assignments.map((a: any) => ({
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
                term: a.term || ""
            }));

            setAssignments(formatted);
        } catch (error) {
            console.error('[fetchAssignments] Error:', error);
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
        setTerm(a.term || "");
        setShowModal(true);
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setDueDate("");
        setPoints("");
        setSelectedSubjectId("");
        setSelectedFile(null);
        setEditingAssignment(null);
        setWeight("0");
        setTerm("");
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

    const saveAssignment = async () => {
        if (uploading) return;
        if (!teacherId) {
            Alert.alert("Error", "Teacher ID not found. Please log out and log back in.");
            return;
        }
        const missing: string[] = [];
        if (!title.trim()) missing.push('Title');
        if (!selectedSubjectId) missing.push('Subject');
        if (missing.length > 0) {
            Alert.alert("Missing Fields", `Please fill in: ${missing.join(', ')}`);
            return;
        }

        if (isDemo) {
            const pointsVal = parseInt(points) || 100;
            const weightVal = parseFloat(weight) || 0;
            if (editingAssignment) {
                setAssignments(prev => prev.map(a => a.id === editingAssignment.id ? {
                    ...a,
                    title: title.trim(),
                    description: description.trim(),
                    dueDate: dateObject.toLocaleDateString(),
                    due_date_iso: dateObject.toISOString(),
                    points: pointsVal,
                    weight: weightVal,
                    term: term.trim(),
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
                    term: term.trim(),
                    subject_id: selectedSubjectId,
                    Subject: Subjects.find(s => s.id === selectedSubjectId)?.title || "Selected Subject",
                    submissions: 0,
                    totalStudents: 0,
                    status: 'active'
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

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            Alert.alert("Session Expired", "Please log out and log back in.");
            setUploading(false);
            return;
        }

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
                        Alert.alert("Upload Warning", "File upload failed. The assignment will be saved without the attachment.");
                    } else {
                        const { data: urlData } = supabase.storage
                            .from('course_materials')
                            .getPublicUrl(filePath);
                        attachmentUrl = urlData.publicUrl;
                        attachmentName = selectedFile.name;
                    }
                } catch (uploadErr: unknown) {
                    console.error('[saveAssignment] File upload catch error:', uploadErr);
                    Alert.alert("Upload Warning", "Could not upload file. The assignment will be saved without the attachment.");
                }
            }

            const weightVal = parseFloat(weight) || 0;
            if (weightVal < 0 || weightVal > 100) {
                Alert.alert("Invalid Weight", "Weight must be between 0 and 100%");
                setUploading(false);
                return;
            }

            const pointsVal = parseInt(points) || 100;
            if (pointsVal <= 0) {
                Alert.alert("Invalid Points", "Points must be a positive number");
                setUploading(false);
                return;
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
                term: term.trim()
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
                                content: `The assignment "${title}" has been updated.\nNew Due Date: ${dueDate || 'Not set'}\nPoints: ${pointsVal}`,
                            });
                        }
                    } else {
                        await DiaryAPI.createEntry({
                            class_id: subjectData.class_id,
                            title: `New Assignment: ${title}`,
                            content: `A new assignment has been published: ${title}.\nDue Date: ${dueDate || 'Not set'}\nPoints: ${pointsVal}`,
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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to save assignment";
            Alert.alert("Error", message);
        } finally {
            setUploading(false);
        }
    };

    const handlePrint = async () => {
        try {
            const html = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
                            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.5; }
                            .report-header { border-bottom: 2px solid #FF6900; margin-bottom: 30px; padding-bottom: 10px; }
                            .report-title { font-size: 24px; font-weight: 700; color: #FF6900; margin: 0; }
                            .report-meta { font-size: 12px; color: #666; margin-top: 5px; }
                            
                            .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
                            .summary-card { background: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #eee; }
                            .summary-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em; }
                            .summary-value { font-size: 18px; font-weight: 700; color: #111827; margin-top: 4px; }

                            table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 20px; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
                            th { background: #f3f4f6; padding: 12px 15px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
                            td { padding: 15px; font-size: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
                            tr:last-child td { border-bottom: none; }
                            .title-cell { font-weight: 700; color: #111827; }
                            .subject-cell { color: #FF6900; font-weight: 700; font-size: 11px; }
                            .status-pill { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
                            .status-active { background: #d1fae5; color: #065f46; }
                            .status-draft { background: #f3f4f6; color: #374151; }
                            .status-closed { background: #fee2e2; color: #991b1b; }
                            
                            .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 10px; border-top: 1px solid #f3f4f6; padding-top: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="report-header">
                            <h1 class="report-title">Assignments Summary</h1>
                            <div class="report-meta">Generated on ${new Date().toLocaleDateString()} \u2022 ${filteredAssignments.length} Assignments Found</div>
                        </div>

                        <div class="summary-grid">
                            <div class="summary-card">
                                <div class="summary-label">Total Submissions</div>
                                <div class="summary-value">${filteredAssignments.reduce((acc, a) => acc + Math.min(a.submissions, a.totalStudents || Infinity), 0)}</div>
                            </div>
                            <div class="summary-card">
                                <div class="summary-label">Active Assignments</div>
                                <div class="summary-value">${filteredAssignments.filter(a => a.status === 'active').length}</div>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>Assignment Details</th>
                                    <th>Subject</th>
                                    <th>Due Date</th>
                                    <th>Submissions</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredAssignments.map(a => `
                                    <tr>
                                        <td>
                                            <div class="title-cell">${a.title}</div>
                                            <div style="font-size: 10px; color: #666; margin-top: 4px;">${a.description?.substring(0, 100) || 'No description'}${((a.description?.length || 0) > 100) ? '...' : ''}</div>
                                        </td>
                                        <td><div class="subject-cell">${a.Subject}</div></td>
                                        <td>${a.dueDate}</td>
                                        <td>${a.totalStudents > 0 ? Math.min(a.submissions, a.totalStudents) : a.submissions} / ${a.totalStudents}</td>
                                        <td><span class="status-pill status-${a.status}">${a.status}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="footer">
                            Assignments Management Report \u2022 Confidential
                        </div>
                    </body>
                </html>
            `;

            if (Platform.OS === 'web') {
                const printWindow = window.open('', '_blank');
                printWindow?.document.write(html);
                printWindow?.document.close();
                setTimeout(() => {
                    printWindow?.print();
                }, 500);
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            console.error('Print error:', error);
            Alert.alert("Error", "Failed to generate print document");
        }
    };


    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Management"
                subtitle="Assignments"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
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
                                className="flex-row items-center bg-[#F6F8FA] dark:bg-[#161B22] px-3 py-2 rounded-lg border border-[#D0D7DE] dark:border-[#21262D]"
                                onPress={handlePrint}
                                activeOpacity={0.7}
                            >
                                <Printer size={16} color="#FF6900" />
                                <Text className="text-gray-900 dark:text-white font-bold text-xs ml-2 uppercase tracking-widest">Print</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-row items-center bg-[#FF6900] px-3 py-2 rounded-lg"
                                onPress={() => setShowModal(true)}
                                activeOpacity={0.7}
                            >
                                <Plus size={16} color="white" />
                                <Text className="text-white font-bold text-xs ml-2 uppercase tracking-widest">New</Text>
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
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
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
                            />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Create/Edit Assignment Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/70 justify-end">
                    <View className="bg-[#FFFFFF] dark:bg-[#161B22] rounded-t-3xl p-6 h-[85%] border-t border-[#D0D7DE] dark:border-[#21262D]">
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View className="flex-row justify-between items-center mb-6">
                                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                                    {editingAssignment ? "Edit Assignment" : "New Assignment"}
                                </Text>
                                <HelpTooltip id="teacher.manage.coursework" role="teacher" tier={tier} onLearnMore={openManual} />
                                <TouchableOpacity
                                    className="w-10 h-10 bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl items-center justify-center border border-[#D0D7DE] dark:border-[#21262D]"
                                    onPress={() => { setShowModal(false); resetForm(); }}
                                >
                                    <X size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3 ml-1">Subject</Text>
                                {Subjects.length === 0 ? (
                                    <View className="bg-[#F6F8FA] dark:bg-[#161B22] p-4 rounded-xl border border-[#D0D7DE] dark:border-[#21262D]">
                                        <Text className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest text-center">
                                            No subjects available.
                                        </Text>
                                    </View>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {Subjects.map(c => {
                                            const isSelected = selectedSubjectId === c.id;
                                            return (
                                                <TouchableOpacity
                                                    key={c.id}
                                                    onPress={() => setSelectedSubjectId(c.id)}
                                                    activeOpacity={0.7}
                                                    className={`mr-3 px-5 py-2.5 rounded-lg border ${isSelected ? "bg-[#FF6900] border-[#FF6900]" : "bg-[#F6F8FA] dark:bg-[#161B22] border-[#D0D7DE] dark:border-[#21262D]"}`}
                                                >
                                                    <Text className={`font-bold text-xs ${isSelected ? "text-white" : "text-gray-900 dark:text-gray-400"}`}>{c.title}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                            </View>


                            <View className="mb-6">
                                <View className="flex-row items-center ml-2 mb-2">
                                    <Type size={12} color="#6B7280" />
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-1.5">Title</Text>
                                    <HelpTooltip id="teacher.manage.coursework" role="teacher" tier={tier} onLearnMore={openManual} />
                                </View>

                                <View className="mb-5">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1 mb-2">Title</Text>

                                    <TextInput
                                        className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl px-5 py-4 text-gray-900 dark:text-white font-bold border border-[#D0D7DE] dark:border-[#21262D]"
                                        placeholder="e.g. Mid-term Research Project"
                                        placeholderTextColor="#9CA3AF"
                                        value={title}
                                        onChangeText={setTitle}
                                    />
                                </View>


                                <View className="mb-6">
                                    <View className="flex-row items-center ml-2 mb-2">
                                        <AlignLeft size={12} color="#6B7280" />
                                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-1.5">Description</Text>
                                        <HelpTooltip id="teacher.manage.coursework" role="teacher" tier={tier} onLearnMore={openManual} />
                                    </View>

                                    <View className="mb-5">
                                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1 mb-2">Description</Text>

                                        <TextInput
                                            className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl px-5 py-4 text-gray-900 dark:text-white font-medium border border-[#D0D7DE] dark:border-[#21262D]"
                                            placeholder="Enter assignment instructions..."
                                            placeholderTextColor="#9CA3AF"
                                            multiline
                                            textAlignVertical="top"
                                            value={description}
                                            onChangeText={setDescription}
                                            style={{ minHeight: 100 }}
                                        />
                                    </View>

                                    <View className="flex-row gap-3 mb-5">
                                        <View className="flex-1">
                                            <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1 mb-2">Due Date</Text>
                                            {Platform.OS === 'web' ? (
                                                <input
                                                    type="date"
                                                    aria-label="Due Date"
                                                    title="Due Date"
                                                    value={dueDate}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setDueDate(v);
                                                        if (v) setDateObject(new Date(v));
                                                    }}
                                                    className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl px-5 py-4 text-gray-900 dark:text-white font-bold border border-[#D0D7DE] dark:border-[#21262D]"
                                                    style={{
                                                        minHeight: 52,
                                                        colorScheme: isDark ? 'dark' : 'light',
                                                        outline: 'none',
                                                        fontFamily: 'inherit',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            ) : (
                                                <TouchableOpacity
                                                    onPress={() => setShowDatePicker(true)}
                                                    className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl px-5 py-4 flex-row justify-between items-center border border-[#D0D7DE] dark:border-[#21262D]"
                                                    style={{ minHeight: 52 }}
                                                >
                                                    <Text className={`font-bold ${dueDate ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                                                        {dueDate ? dueDate : "Select"}
                                                    </Text>
                                                    <Calendar size={16} color="#FF6900" />
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        <View className="flex-1">
                                            <View className="flex-row items-center ml-2 mb-2">
                                                <Target size={12} color="#6B7280" />
                                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-1.5">Points</Text>
                                                <HelpTooltip id="teacher.manage.coursework" role="teacher" tier={tier} onLearnMore={openManual} />
                                            </View>
                                            <TextInput
                                                className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl px-5 py-4 text-gray-900 dark:text-white font-bold border border-[#D0D7DE] dark:border-[#21262D]"
                                                placeholder="100"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                                value={points}
                                                onChangeText={setPoints}
                                                style={{ minHeight: 52 }}
                                            />
                                        </View >
                                    </View >

                                    <View className="flex-row gap-3 mb-6">
                                        <View className="flex-1">
                                            <View className="flex-row items-center ml-2 mb-2">
                                                <Trophy size={12} color="#6B7280" />
                                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-1.5">Weight (%)</Text>
                                                <HelpTooltip id="teacher.manage.coursework" role="teacher" tier={tier} onLearnMore={openManual} />
                                            </View>
                                            <TextInput
                                                className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl px-5 py-4 text-gray-900 dark:text-white font-bold border border-[#D0D7DE] dark:border-[#21262D]"
                                                placeholder="25"
                                                placeholderTextColor="#9CA3AF"
                                                keyboardType="numeric"
                                                value={weight}
                                                onChangeText={setWeight}
                                            />
                                        </View >

                                        <View className="flex-1">
                                            <View className="flex-row items-center ml-2 mb-2">
                                                <BookOpen size={12} color="#6B7280" />
                                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-1.5">Term</Text>
                                                <HelpTooltip id="teacher.manage.coursework" role="teacher" tier={tier} onLearnMore={openManual} />
                                            </View>
                                            <TextInput
                                                className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-xl px-5 py-4 text-gray-900 dark:text-white font-bold border border-[#D0D7DE] dark:border-[#21262D]"
                                                placeholder="Term 1"
                                                placeholderTextColor="#9CA3AF"
                                                value={term}
                                                onChangeText={setTerm}
                                            />
                                        </View >
                                    </View >

                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={dateObject}
                                            mode="date"
                                            display="default"
                                            onChange={onDateChange}
                                            minimumDate={new Date()}
                                        />
                                    )
                                    }

                                    <View className="mb-8">
                                        <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest ml-1 mb-2">Attachments</Text>
                                        <TouchableOpacity
                                            onPress={pickDocument}
                                            activeOpacity={0.7}
                                            className={`flex-row items-center justify-center border-dashed border-2 rounded-xl p-6 ${selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22]'}`}
                                        >
                                            {selectedFile ? (
                                                <View className="items-center">
                                                    <FileText size={24} color="#10B981" />
                                                    <Text className="text-green-900 dark:text-green-400 font-bold mt-2 text-center">{selectedFile.name}</Text>
                                                </View>
                                            ) : (
                                                <View className="items-center">
                                                    <Upload size={24} color="#9CA3AF" />
                                                    <Text className="text-gray-900 dark:text-white font-bold mt-2">Upload Material</Text>
                                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">PDF, DOCX, Images</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        className={`bg-[#FF6900] py-4 rounded-xl items-center ${uploading ? 'opacity-70' : ''}`}
                                        onPress={saveAssignment}
                                        disabled={uploading}
                                        activeOpacity={0.7}
                                    >
                                        {uploading ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text className="text-white font-bold text-lg">
                                                {editingAssignment ? "Update" : "Publish"}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal >

        </View>
    );
}
