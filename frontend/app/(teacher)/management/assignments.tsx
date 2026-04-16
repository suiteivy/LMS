import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import DateTimePicker from '@react-native-community/datetimepicker';
import { decode } from "base64-arraybuffer";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { router } from "expo-router";
import { Calendar, Edit2, Eye, FileText, Plus, Printer, Trash2, Upload, Users, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, Platform } from 'react-native';
import { DiaryAPI } from "@/services/DiaryService";
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
        ? (assignment.submissions / assignment.totalStudents) * 100
        : 0;

    return (
        <View className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 shadow-sm">
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 pr-3">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">{assignment.title}</Text>
                    <Text className="text-[#FF6900] text-xs font-bold mt-1 uppercase tracking-wider">{assignment.Subject}</Text>
                </View>
                <View className="flex-row items-center gap-2">
                    <View className={`px-3 py-1 rounded-full border ${getStatusStyle(assignment.status || 'active').split(' ')[0]} ${getStatusStyle(assignment.status || 'active').split(' ')[2]}`}>
                        <Text className={`text-[10px] font-bold uppercase tracking-widest ${getStatusStyle(assignment.status || 'active').split(' ')[1]}`}>
                            {assignment.status || 'active'}
                        </Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => onDelete(assignment)}
                        className="p-2 bg-red-50 dark:bg-red-950/20 rounded-full"
                    >
                        <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <View className="flex-row mb-5 gap-4">
                <View className="flex-row items-center">
                    <Calendar size={14} color="#6B7280" />
                    <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold ml-1.5">{assignment.dueDate}</Text>
                </View>
                <View className="flex-row items-center">
                    <Users size={14} color="#6B7280" />
                    <Text className="text-gray-500 dark:text-gray-400 text-xs font-bold ml-1.5">
                        {assignment.submissions}/{assignment.totalStudents} submitted
                    </Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-gray-100 dark:bg-[#1A1650] rounded-full overflow-hidden mb-5">
                <View className="h-full bg-[#FF6900] rounded-full" style={{ width: `${progressPercent}%` }} />
            </View>

            {/* Actions */}
            <View className="flex-row justify-end gap-2">
                <TouchableOpacity
                    className="flex-row items-center px-4 py-2 bg-gray-50 dark:bg-[#1A1650] rounded-xl"
                    onPress={() => onView(assignment)}
                >
                    <Eye size={16} color="#6B7280" />
                    <Text className="text-gray-600 dark:text-gray-400 text-xs ml-2 font-bold">View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-row items-center px-4 py-2 bg-orange-50 dark:bg-orange-950/20 rounded-xl"
                    onPress={() => onEdit(assignment)}
                >
                    <Edit2 size={16} color="#FF6900" />
                    <Text className="text-[#FF6900] text-xs ml-2 font-bold">Edit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function AssignmentsPage() {
    const { teacherId } = useAuth();
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
    const [weight, setWeight] = useState("0");
    const [term, setTerm] = useState("");

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
        // First try subjects assigned to this teacher
        const { data: mySubjects } = await supabase.from('subjects').select('id, title').eq('teacher_id', teacherId);
        if (mySubjects && mySubjects.length > 0) {
            setSubjects(mySubjects);
            return;
        }
        // Fallback: show all available subjects so the teacher can still create assignments
        const { data: allSubjects } = await supabase.from('subjects').select('id, title').order('title');
        if (allSubjects) setSubjects(allSubjects);
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
                    subject:subjects(title),
                    submissions(count)
                `)
                .eq('teacher_id', teacherId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const subjectIds = (data as any[] || []).map(a => a.subject_id);
            const { data: countsData } = await supabase
                .from('enrollments')
                .select('subject_id')
                .in('subject_id', subjectIds)
                .eq('status', 'enrolled');

            const countsMap: Record<string, number> = {};
            (countsData as any[] || []).forEach(e => {
                countsMap[e.subject_id] = (countsMap[e.subject_id] || 0) + 1;
            });

            const formatted: Assignment[] = (data || []).map((a: any) => ({
                id: a.id,
                title: a.title,
                Subject: a.subject?.title || "Unknown Subject",
                subject_id: a.subject_id,
                dueDate: a.due_date ? new Date(a.due_date).toLocaleDateString() : "No Due Date",
                due_date_iso: a.due_date,
                submissions: a.submissions?.[0]?.count || 0,
                totalStudents: countsMap[a.subject_id] || 0,
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
            try {
                setLoading(true);
                const { error } = await (supabase.from('assignments') as any).delete().eq('id', a.id);
                if (error) throw error;

                // Attempt to remove diary entry
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

        setUploading(true);
        let attachmentUrl = editingAssignment?.attachment_url || null;
        let attachmentName = editingAssignment?.attachment_name || null;

        // Check auth session first
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

                    // Robust file reading for mobile compatibility
                    let fileBody;
                    if (Platform.OS === 'web') {
                        // Standard web file handling
                        const response = await fetch(selectedFile.uri);
                        const blob = await response.blob();
                        fileBody = blob;
                    } else {
                        // Expo native handling
                        const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
                            encoding: 'base64',
                        });
                        fileBody = decode(base64);
                    }

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

            // Sync to Diary
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
                            <div class="report-meta">Generated on ${new Date().toLocaleDateString()} • ${filteredAssignments.length} Assignments Found</div>
                        </div>

                        <div class="summary-grid">
                            <div class="summary-card">
                                <div class="summary-label">Total Submissions</div>
                                <div class="summary-value">${assignments.reduce((acc, a) => acc + a.submissions, 0)}</div>
                            </div>
                            <div class="summary-card">
                                <div class="summary-label">Active Assignments</div>
                                <div class="summary-value">${assignments.filter(a => a.status === 'active').length}</div>
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
                                        <td>${a.submissions} / ${a.totalStudents}</td>
                                        <td><span class="status-pill status-${a.status}">${a.status}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="footer">
                            Assignments Management Report • Confidential
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
        <View className="flex-1 bg-gray-50 dark:bg-navy">
            <UnifiedHeader
                title="Management"
                subtitle="Assignments"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View className="p-4 md:p-8">
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-6 px-2">
                        <View>
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                                {assignments.length} total assignments
                            </Text>
                        </View>
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                className="flex-row items-center bg-white dark:bg-[#1a1a1a] px-4 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-800 active:bg-gray-50"
                                onPress={handlePrint}
                            >
                                <Printer size={18} color={Platform.OS === 'web' ? '#6B7280' : '#FF6900'} />
                                <Text className="text-gray-600 dark:text-gray-400 font-bold text-xs ml-2 uppercase tracking-widest">Print</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-row items-center bg-[#FF6900] px-5 py-2.5 rounded-2xl shadow-lg active:bg-orange-600"
                                onPress={() => setShowModal(true)}
                            >
                                <Plus size={18} color="white" />
                                <Text className="text-white font-bold text-xs ml-2 uppercase tracking-widest">New</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Stats */}
                    <View className="flex-row gap-4 mb-8">
                        <View className="flex-1 bg-gray-900 dark:bg-[#1a1a1a] p-5 rounded-[32px] shadow-xl border border-transparent dark:border-gray-800">
                            <Text className="text-white/60 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider">Active</Text>
                            <Text className="text-white text-3xl font-bold mt-2">
                                {assignments.filter(a => a.status === "active").length}
                            </Text>
                        </View>
                        <View className="flex-1 bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider">Submissions</Text>
                            <Text className="text-gray-900 dark:text-white text-3xl font-bold mt-2">
                                {assignments.reduce((acc, a) => acc + a.submissions, 0)}
                            </Text>
                        </View>
                    </View>

                    {/* Filter Tabs */}
                    <View className="flex-row bg-white dark:bg-[#1a1a1a] rounded-2xl p-1.5 mb-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                        {(["all", "active", "draft", "closed"] as const).map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                className={`flex-1 py-3 rounded-xl ${filter === tab ? "bg-[#FF6900] shadow-sm" : ""}`}
                                onPress={() => setFilter(tab)}
                            >
                                <Text className={`text-center font-bold text-[10px] uppercase tracking-widest ${filter === tab ? "text-white" : "text-gray-400 dark:text-gray-500"}`}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Assignment List */}
                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : filteredAssignments.length === 0 ? (
                        <View className="bg-white dark:bg-[#1a1a1a] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                            <FileText size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">No assignments found</Text>
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
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white dark:bg-[#0F0B2E] rounded-t-[40px] p-8 h-[85%] border-t border-gray-100 dark:border-gray-800">
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            <View className="flex-row justify-between items-center mb-10">
                                <Text className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                                    {editingAssignment ? "Edit" : "Create"}
                                </Text>
                                <TouchableOpacity
                                    className="w-10 h-10 bg-gray-50 dark:bg-[#1a1a1a] rounded-full items-center justify-center"
                                    onPress={() => { setShowModal(false); resetForm(); }}
                                >
                                    <X size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ color: '#6B7280', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginLeft: 8, marginBottom: 8 }}>Subject</Text>
                                {Subjects.length === 0 ? (
                                    <View style={{ backgroundColor: '#fefce8', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#fde68a' }}>
                                        <Text style={{ color: '#a16207', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                                            No subjects available. Ask your admin to assign subjects to you.
                                        </Text>
                                    </View>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {Subjects.map(c => {
                                            const isSelected = selectedSubjectId === c.id;
                                            return (
                                                <TouchableOpacity
                                                    key={c.id}
                                                    onPress={() => { console.log('[Subject] Selected:', c.id, c.title); setSelectedSubjectId(c.id); }}
                                                    style={{
                                                        marginRight: 12,
                                                        paddingHorizontal: 24,
                                                        paddingVertical: 12,
                                                        borderRadius: 16,
                                                        borderWidth: 1,
                                                        backgroundColor: isSelected ? '#FF6900' : '#f9fafb',
                                                        borderColor: isSelected ? '#FF6900' : '#f3f4f6',
                                                    }}
                                                >
                                                    <Text style={{ fontWeight: '700', fontSize: 12, color: isSelected ? '#ffffff' : '#6B7280' }}>{c.title}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Title</Text>
                                <TextInput
                                    className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-bold border border-gray-100 dark:border-gray-800"
                                    placeholder="Assignment Title"
                                    placeholderTextColor="#9CA3AF"
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            <View className="mb-6">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Description</Text>
                                <TextInput
                                    className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-medium border border-gray-100 dark:border-gray-800 h-32"
                                    placeholder="What should the students do?"
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    textAlignVertical="top"
                                    value={description}
                                    onChangeText={setDescription}
                                />
                            </View>

                            <View className="flex-row gap-4 mb-8">
                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Due Date</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowDatePicker(true)}
                                        className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 flex-row justify-between items-center border border-gray-100 dark:border-gray-800"
                                    >
                                        <Text className={`font-bold ${dueDate ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-gray-600"}`}>
                                            {dueDate ? dueDate : "Select date"}
                                        </Text>
                                        <Calendar size={18} color="#FF6900" />
                                    </TouchableOpacity>
                                </View>

                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Points</Text>
                                    <TextInput
                                        className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-bold border border-gray-100 dark:border-gray-800"
                                        placeholder="100"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        value={points}
                                        onChangeText={setPoints}
                                    />
                                </View>
                            </View>

                            <View className="flex-row gap-4 mb-8">
                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Weight (%)</Text>
                                    <TextInput
                                        className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-bold border border-gray-100 dark:border-gray-800"
                                        placeholder="0"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numeric"
                                        value={weight}
                                        onChangeText={setWeight}
                                    />
                                </View>

                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Term / Semester</Text>
                                    <TextInput
                                        className="bg-gray-50 dark:bg-[#1a1a1a] rounded-2xl px-6 py-4 text-gray-900 dark:text-white font-bold border border-gray-100 dark:border-gray-800"
                                        placeholder="Semester 1"
                                        placeholderTextColor="#9CA3AF"
                                        value={term}
                                        onChangeText={setTerm}
                                    />
                                </View>
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={dateObject}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                    minimumDate={new Date()}
                                />
                            )}

                            <View className="mb-10">
                                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider ml-2 mb-2">Attachments</Text>
                                <TouchableOpacity
                                    onPress={pickDocument}
                                    className={`flex-row items-center justify-center border-dashed border-2 rounded-[32px] p-8 ${selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1a1a]'}`}
                                >
                                    {selectedFile ? (
                                        <View className="items-center">
                                            <FileText size={32} color="#10B981" />
                                            <Text className="text-green-900 dark:text-green-400 font-bold mt-3 text-center px-4">{selectedFile.name}</Text>
                                            <Text className="text-green-600 dark:text-green-400/60 text-[10px] font-bold uppercase tracking-widest mt-1">Tap to change</Text>
                                        </View>
                                    ) : (
                                        <View className="items-center">
                                            <Upload size={32} color="#D1D5DB" />
                                            <Text className="text-gray-500 dark:text-gray-400 font-bold mt-3">Upload Material</Text>
                                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">PDF, DOCX, Images</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                className={`bg-[#FF6900] py-5 rounded-2xl items-center shadow-lg active:bg-orange-600 ${uploading ? 'opacity-70' : ''}`}
                                onPress={saveAssignment}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-lg">
                                        {editingAssignment ? "Update Assignment" : "Publish Assignment"}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
