import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    ActivityIndicator, Alert, Modal, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClassService, ClassItem, ClassStudent, AutoAssignResult } from '@/services/ClassService';
import { supabase } from '@/libs/supabase';

// ─── Types ─────────────────────────────────────────────────
interface Teacher {
    id: string;
    full_name: string;
}

interface SearchStudent {
    id: string;
    full_name: string;
    grade_level: string;
}

// ─── Component ─────────────────────────────────────────────
export default function AdminClassManagement() {
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
    const [formName, setFormName] = useState('');
    const [formGrade, setFormGrade] = useState('');
    const [formCapacity, setFormCapacity] = useState('');
    const [formTeacher, setFormTeacher] = useState('');
    const [saving, setSaving] = useState(false);

    // Students panel
    const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
    const [students, setStudents] = useState<ClassStudent[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Enroll search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchStudent[]>([]);
    const [enrolling, setEnrolling] = useState(false);

    // Auto-assign
    const [autoAssigning, setAutoAssigning] = useState(false);
    const [autoAssignGrade, setAutoAssignGrade] = useState('');
    const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);

    // Lookups
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [gradeFilter, setGradeFilter] = useState('');

    const GRADE_OPTIONS = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];

    // ─── Data Loading ──────────────────────────────────────
    const loadClasses = useCallback(async () => {
        try {
            const data = await ClassService.getClasses();
            setClasses(data);
        } catch (err: any) {
            console.error('loadClasses error:', err);
        }
    }, []);

    const loadTeachers = async () => {
        const { data } = await supabase
            .from('teachers')
            .select('id, user_id, users:user_id(full_name)') as any;

        if (data) {
            setTeachers(data.map((t: any) => ({
                id: t.id,
                full_name: t.users?.full_name || t.id,
            })));
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([loadClasses(), loadTeachers()]);
            setLoading(false);
        };
        init();
    }, []);

    const refresh = async () => {
        setRefreshing(true);
        await loadClasses();
        setRefreshing(false);
    };

    // ─── Class CRUD ────────────────────────────────────────
    const openCreateModal = () => {
        setEditingClass(null);
        setFormName('');
        setFormGrade('');
        setFormCapacity('');
        setFormTeacher('');
        setShowModal(true);
    };

    const openEditModal = (cls: ClassItem) => {
        setEditingClass(cls);
        setFormName(cls.name);
        setFormGrade(cls.grade_level || '');
        setFormCapacity(cls.capacity ? String(cls.capacity) : '');
        setFormTeacher(cls.teacher_id || '');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formName.trim()) {
            Alert.alert('Validation', 'Class name is required');
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                name: formName.trim(),
                grade_level: formGrade || undefined,
                capacity: formCapacity ? parseInt(formCapacity) : undefined,
                teacher_id: formTeacher || undefined,
            };

            if (editingClass) {
                await ClassService.updateClass(editingClass.id, payload);
            } else {
                await ClassService.createClass(payload);
            }
            setShowModal(false);
            await loadClasses();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (cls: ClassItem) => {
        Alert.alert(
            'Delete Class',
            `Are you sure you want to delete "${cls.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await ClassService.deleteClass(cls.id);
                            if (selectedClass?.id === cls.id) setSelectedClass(null);
                            await loadClasses();
                        } catch (err: any) {
                            Alert.alert('Error', err.response?.data?.error || err.message);
                        }
                    },
                },
            ]
        );
    };

    // ─── Students ──────────────────────────────────────────
    const viewStudents = async (cls: ClassItem) => {
        setSelectedClass(cls);
        setLoadingStudents(true);
        setSearchQuery('');
        setSearchResults([]);
        try {
            const data = await ClassService.getClassStudents(cls.id);
            setStudents(data);
        } catch (err: any) {
            console.error('viewStudents error:', err);
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleRemoveStudent = (student: ClassStudent) => {
        if (!selectedClass) return;
        Alert.alert('Remove Student', `Remove ${student.full_name} from this class?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive',
                onPress: async () => {
                    try {
                        await ClassService.removeStudent(selectedClass.id, student.student_id);
                        await viewStudents(selectedClass);
                        await loadClasses();
                    } catch (err: any) {
                        Alert.alert('Error', err.response?.data?.error || err.message);
                    }
                },
            },
        ]);
    };

    // ─── Enroll Search ─────────────────────────────────────
    const searchStudents = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        const { data } = await supabase
            .from('students')
            .select('id, grade_level, users:user_id(full_name)') as any;

        if (data) {
            const enrolledIds = new Set(students.map(s => s.student_id));
            setSearchResults(
                data
                    .filter((s: any) => {
                        const name = s.users?.full_name || '';
                        return (
                            !enrolledIds.has(s.id) &&
                            (name.toLowerCase().includes(query.toLowerCase()) ||
                                s.id.toLowerCase().includes(query.toLowerCase()))
                        );
                    })
                    .slice(0, 10)
                    .map((s: any) => ({
                        id: s.id,
                        full_name: s.users?.full_name || 'Unknown',
                        grade_level: s.grade_level || '',
                    }))
            );
        }
    };

    const handleEnroll = async (studentId: string) => {
        if (!selectedClass) return;
        setEnrolling(true);
        try {
            await ClassService.enrollStudent(selectedClass.id, studentId);
            setSearchQuery('');
            setSearchResults([]);
            await viewStudents(selectedClass);
            await loadClasses();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || err.message);
        } finally {
            setEnrolling(false);
        }
    };

    // ─── Auto-Assign ───────────────────────────────────────
    const handleAutoAssign = async () => {
        if (!autoAssignGrade) {
            Alert.alert('Validation', 'Select a grade level');
            return;
        }
        setAutoAssigning(true);
        try {
            const result: AutoAssignResult = await ClassService.autoAssign(autoAssignGrade);
            setShowAutoAssignModal(false);
            await loadClasses();
            if (selectedClass) await viewStudents(selectedClass);

            let detail = result.message;
            if (result.classes && result.classes.length > 0) {
                detail += '\n\n' + result.classes.map(c => `${c.class_name}: ${c.total_students} students`).join('\n');
            }
            Alert.alert('Auto-Assign Complete', detail);
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || err.message);
        } finally {
            setAutoAssigning(false);
        }
    };

    // ─── Derived ───────────────────────────────────────────
    const filteredClasses = gradeFilter
        ? classes.filter(c => c.grade_level === gradeFilter)
        : classes;

    const getTeacherName = (teacherId?: string) => {
        if (!teacherId) return 'Unassigned';
        const t = teachers.find(t => t.id === teacherId);
        return t?.full_name || 'Unknown';
    };

    // ─── Render ────────────────────────────────────────────
    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50">
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="p-4 md:p-8">

                    {/* ── Header ── */}
                    <View className="flex-row justify-between items-center mb-4">
                        <View>
                            <Text className="text-2xl font-bold text-gray-900">Classes</Text>
                            <Text className="text-gray-500 text-sm">
                                {classes.length} {classes.length === 1 ? 'class' : 'classes'} total
                            </Text>
                        </View>
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={() => { setAutoAssignGrade(''); setShowAutoAssignModal(true); }}
                                className="bg-purple-600 px-4 py-2.5 rounded-xl flex-row items-center"
                            >
                                <Ionicons name="shuffle" size={16} color="white" />
                                <Text className="text-white font-bold text-sm ml-1.5">Auto</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={openCreateModal}
                                className="bg-black px-4 py-2.5 rounded-xl flex-row items-center"
                            >
                                <Ionicons name="add" size={18} color="white" />
                                <Text className="text-white font-bold text-sm ml-1">New</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── Grade Filter ── */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                        <View className="flex-row gap-2">
                            <TouchableOpacity
                                onPress={() => setGradeFilter('')}
                                className={`px-3 py-1.5 rounded-full border ${!gradeFilter ? 'bg-black border-black' : 'bg-white border-gray-200'}`}
                            >
                                <Text className={`text-xs font-bold ${!gradeFilter ? 'text-white' : 'text-gray-600'}`}>All</Text>
                            </TouchableOpacity>
                            {GRADE_OPTIONS.map(g => (
                                <TouchableOpacity
                                    key={g}
                                    onPress={() => setGradeFilter(gradeFilter === g ? '' : g)}
                                    className={`px-3 py-1.5 rounded-full border ${gradeFilter === g ? 'bg-black border-black' : 'bg-white border-gray-200'}`}
                                >
                                    <Text className={`text-xs font-bold ${gradeFilter === g ? 'text-white' : 'text-gray-600'}`}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* ── Class List ── */}
                    {filteredClasses.length === 0 ? (
                        <View className="bg-white p-8 rounded-2xl items-center border border-gray-100 border-dashed">
                            <Ionicons name="school-outline" size={48} color="#9CA3AF" />
                            <Text className="text-gray-500 font-medium mt-4 text-center">
                                {gradeFilter ? `No classes for ${gradeFilter}` : 'No classes yet. Create one to get started.'}
                            </Text>
                        </View>
                    ) : (
                        filteredClasses.map(cls => (
                            <TouchableOpacity
                                key={cls.id}
                                onPress={() => viewStudents(cls)}
                                className={`bg-white p-4 rounded-2xl border mb-3 shadow-sm ${selectedClass?.id === cls.id ? 'border-orange-400 bg-orange-50' : 'border-gray-100'}`}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1">
                                        <View className="bg-orange-50 p-3 rounded-xl mr-3">
                                            <Ionicons name="school" size={22} color="#FF6B00" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-900 font-bold text-base">{cls.name}</Text>
                                            <View className="flex-row items-center mt-0.5">
                                                {cls.grade_level && (
                                                    <View className="bg-gray-100 px-2 py-0.5 rounded-full mr-2">
                                                        <Text className="text-gray-600 text-xs font-medium">{cls.grade_level}</Text>
                                                    </View>
                                                )}
                                                <Ionicons name="people" size={12} color="#6B7280" />
                                                <Text className="text-gray-500 text-xs ml-1">
                                                    {cls.student_count || 0}{cls.capacity ? `/${cls.capacity}` : ''} students
                                                </Text>
                                            </View>
                                            <Text className="text-gray-400 text-xs mt-0.5">
                                                Teacher: {getTeacherName(cls.teacher_id)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="flex-row items-center gap-1">
                                        <TouchableOpacity
                                            onPress={() => openEditModal(cls)}
                                            className="p-2"
                                        >
                                            <Ionicons name="create-outline" size={18} color="#6B7280" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleDelete(cls)}
                                            className="p-2"
                                        >
                                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}

                    {/* ── Students Panel ── */}
                    {selectedClass && (
                        <View className="mt-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <View className="p-4 bg-gray-50 border-b border-gray-100">
                                <View className="flex-row items-center justify-between">
                                    <View>
                                        <Text className="font-bold text-gray-900 text-lg">{selectedClass.name}</Text>
                                        <Text className="text-gray-500 text-sm">
                                            {students.length} student{students.length !== 1 ? 's' : ''} enrolled
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setSelectedClass(null)} className="p-2">
                                        <Ionicons name="close" size={20} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>

                                {/* Enroll search */}
                                <View className="mt-3">
                                    <TextInput
                                        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                                        placeholder="Search student to enroll..."
                                        value={searchQuery}
                                        onChangeText={searchStudents}
                                        placeholderTextColor="#9CA3AF"
                                    />
                                    {searchResults.length > 0 && (
                                        <View className="bg-white border border-gray-200 rounded-xl mt-1 max-h-40 overflow-hidden">
                                            {searchResults.map(s => (
                                                <TouchableOpacity
                                                    key={s.id}
                                                    onPress={() => handleEnroll(s.id)}
                                                    disabled={enrolling}
                                                    className="flex-row items-center px-4 py-3 border-b border-gray-50"
                                                >
                                                    <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center mr-3">
                                                        <Ionicons name="add" size={16} color="#10B981" />
                                                    </View>
                                                    <View className="flex-1">
                                                        <Text className="text-gray-800 font-medium">{s.full_name}</Text>
                                                        <Text className="text-gray-400 text-xs">{s.grade_level} · {s.id}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Student list */}
                            {loadingStudents ? (
                                <View className="p-6 items-center">
                                    <ActivityIndicator color="#FF6B00" />
                                </View>
                            ) : students.length === 0 ? (
                                <View className="p-6 items-center">
                                    <Ionicons name="people-outline" size={36} color="#D1D5DB" />
                                    <Text className="text-gray-400 mt-2 text-sm">No students enrolled</Text>
                                </View>
                            ) : (
                                students.map((s, i) => (
                                    <View
                                        key={s.enrollment_id}
                                        className={`flex-row items-center px-4 py-3 ${i < students.length - 1 ? 'border-b border-gray-50' : ''}`}
                                    >
                                        <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center mr-3">
                                            <Text className="text-orange-600 font-bold text-sm">
                                                {s.full_name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-gray-900 font-semibold">{s.full_name}</Text>
                                            <Text className="text-gray-400 text-xs">{s.grade_level} · {s.student_id}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemoveStudent(s)} className="p-2">
                                            <Ionicons name="remove-circle-outline" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* ═══ Create / Edit Modal ═══ */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl"
                        style={{ paddingBottom: Platform.OS === 'ios' ? 32 : 24 }}
                    >
                        <View className="flex-row justify-between items-center p-5 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-900">
                                {editingClass ? 'Edit Class' : 'Create Class'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="p-5">
                            {/* Name */}
                            <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-600 mb-1.5">Class Name *</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-medium"
                                    placeholder="e.g. Form 1 East"
                                    value={formName}
                                    onChangeText={setFormName}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>

                            {/* Grade */}
                            <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-600 mb-1.5">Grade Level</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View className="flex-row gap-2">
                                        {GRADE_OPTIONS.map(g => (
                                            <TouchableOpacity
                                                key={g}
                                                onPress={() => setFormGrade(formGrade === g ? '' : g)}
                                                className={`px-3 py-2 rounded-full border ${formGrade === g ? 'bg-black border-black' : 'bg-white border-gray-200'}`}
                                            >
                                                <Text className={`text-xs font-bold ${formGrade === g ? 'text-white' : 'text-gray-600'}`}>{g}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            {/* Capacity */}
                            <View className="mb-4">
                                <Text className="text-sm font-semibold text-gray-600 mb-1.5">Max Capacity (optional)</Text>
                                <TextInput
                                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 font-medium"
                                    placeholder="e.g. 40"
                                    value={formCapacity}
                                    onChangeText={setFormCapacity}
                                    keyboardType="numeric"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>

                            {/* Teacher */}
                            <View className="mb-6">
                                <Text className="text-sm font-semibold text-gray-600 mb-1.5">Class Teacher</Text>
                                <ScrollView style={{ maxHeight: 130 }} nestedScrollEnabled>
                                    <View className="gap-1">
                                        <TouchableOpacity
                                            onPress={() => setFormTeacher('')}
                                            className={`px-4 py-2.5 rounded-xl border ${!formTeacher ? 'bg-gray-800 border-gray-800' : 'bg-white border-gray-200'}`}
                                        >
                                            <Text className={`text-sm font-medium ${!formTeacher ? 'text-white' : 'text-gray-500'}`}>None</Text>
                                        </TouchableOpacity>
                                        {teachers.map(t => (
                                            <TouchableOpacity
                                                key={t.id}
                                                onPress={() => setFormTeacher(formTeacher === t.id ? '' : t.id)}
                                                className={`px-4 py-2.5 rounded-xl border ${formTeacher === t.id ? 'bg-black border-black' : 'bg-white border-gray-200'}`}
                                            >
                                                <Text className={`text-sm font-medium ${formTeacher === t.id ? 'text-white' : 'text-gray-800'}`}>{t.full_name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={saving}
                                className="bg-black py-4 rounded-xl items-center"
                            >
                                {saving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-bold text-base">
                                        {editingClass ? 'Save Changes' : 'Create Class'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ═══ Auto-Assign Modal ═══ */}
            <Modal visible={showAutoAssignModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-center px-6">
                    <View className="bg-white rounded-2xl overflow-hidden">
                        <View className="p-5 border-b border-gray-100">
                            <Text className="text-xl font-bold text-gray-900">Auto-Assign Students</Text>
                            <Text className="text-gray-500 text-sm mt-1">
                                Distributes unassigned students evenly across classes for a grade level
                            </Text>
                        </View>

                        <View className="p-5">
                            <Text className="text-sm font-semibold text-gray-600 mb-2">Select Grade Level</Text>
                            <View className="flex-row flex-wrap gap-2 mb-6">
                                {GRADE_OPTIONS.map(g => (
                                    <TouchableOpacity
                                        key={g}
                                        onPress={() => setAutoAssignGrade(g)}
                                        className={`px-4 py-2 rounded-full border ${autoAssignGrade === g ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-200'}`}
                                    >
                                        <Text className={`text-sm font-medium ${autoAssignGrade === g ? 'text-white' : 'text-gray-700'}`}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View className="bg-purple-50 rounded-xl p-4 mb-4">
                                <View className="flex-row items-start">
                                    <Ionicons name="information-circle" size={18} color="#7C3AED" />
                                    <Text className="text-purple-800 text-xs ml-2 flex-1">
                                        Students without a class assignment will be distributed evenly. Classes at full capacity will be skipped.
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row gap-3">
                                <TouchableOpacity
                                    onPress={() => setShowAutoAssignModal(false)}
                                    className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center"
                                >
                                    <Text className="text-gray-700 font-bold">Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleAutoAssign}
                                    disabled={autoAssigning || !autoAssignGrade}
                                    className={`flex-1 py-3.5 rounded-xl items-center ${autoAssignGrade ? 'bg-purple-600' : 'bg-gray-300'}`}
                                >
                                    {autoAssigning ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="text-white font-bold">Assign</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
