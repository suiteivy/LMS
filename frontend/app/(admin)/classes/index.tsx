import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import { AutoAssignResult, ClassItem, ClassService, ClassStudent } from '@/services/ClassService';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

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

interface StreamClassConfig {
    name: string;
    capacity: string;
    teacher_id: string;
}

// ─── Autocomplete suggestions ───────────────────────────────
const NAME_SUFFIXES = [
    'A', 'B', 'C', 'D',
    '1', '2', '3',
    'East', 'West', 'North', 'South',
    'Red', 'Blue', 'Green', 'Yellow', 'Gold',
    'Alpha', 'Beta', 'Gamma',
    'Diamond', 'Emerald', 'Ruby',
];

const STREAM_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function getNameSuggestions(input: string, grade: string, existingClasses: ClassItem[]): string[] {
    const suggestions = new Set<string>();

    existingClasses.forEach(c => {
        if (c.name.toLowerCase().includes(input.toLowerCase()) && c.name !== input) {
            suggestions.add(c.name);
        }
    });

    if (grade) {
        NAME_SUFFIXES.forEach(suffix => {
            const suggestion = `${grade} ${suffix}`;
            if (suggestion.toLowerCase().includes(input.toLowerCase())) {
                suggestions.add(suggestion);
            }
        });
    }

    return Array.from(suggestions)
        .filter(s => s.toLowerCase().includes(input.toLowerCase()) && s !== input)
        .slice(0, 8);
}

// ─── Component ─────────────────────────────────────────────
export default function AdminClassManagement() {
    const { isDark } = useTheme();
    const { profile } = useAuth();
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
    const [formName, setFormName] = useState('');
    const [formGrade, setFormGrade] = useState('');
    const [formCapacity, setFormCapacity] = useState('');
    const [formTeacher, setFormTeacher] = useState('');
    const [saving, setSaving] = useState(false);
    const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

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

    // Stream bulk create
    const [showStreamModal, setShowStreamModal] = useState(false);
    const [streamGrade, setStreamGrade] = useState('');
    const [streamCount, setStreamCount] = useState(4);
    const [streamEndLetter, setStreamEndLetter] = useState('D');
    const [streamUseLetterPicker, setStreamUseLetterPicker] = useState(true);
    const [streamClasses, setStreamClasses] = useState<StreamClassConfig[]>([]);
    const [bulkCreating, setBulkCreating] = useState(false);

    // Lookups
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [gradeFilter, setGradeFilter] = useState('');

    const GRADE_OPTIONS = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'];

    // ─── Theme helpers ─────────────────────────────────────
    const bg = isDark ? '#121212' : '#F9FAFB';
    const card = isDark ? '#1E1E1E' : '#FFFFFF';
    const border = isDark ? '#2C2C2C' : '#F3F4F6';
    const textPrimary = isDark ? '#F9FAFB' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const textMuted = isDark ? '#6B7280' : '#9CA3AF';
    const inputBg = isDark ? '#2C2C2C' : '#F9FAFB';
    const inputBorder = isDark ? '#3F3F3F' : '#E5E7EB';
    const pillInactive = isDark ? '#2C2C2C' : '#FFFFFF';
    const pillInactiveBorder = isDark ? '#3F3F3F' : '#E5E7EB';
    const pillInactiveText = isDark ? '#9CA3AF' : '#4B5563';
    const modalBg = isDark ? '#1E1E1E' : '#FFFFFF';
    const sectionBg = isDark ? '#242424' : '#F9FAFB';

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

    // ─── Autocomplete ──────────────────────────────────────
    const handleNameChange = (text: string) => {
        setFormName(text);
        if (text.length >= 1) {
            const suggestions = getNameSuggestions(text, formGrade, classes);
            setNameSuggestions(suggestions);
            setShowSuggestions(suggestions.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    useEffect(() => {
        if (formName.length >= 1) {
            const suggestions = getNameSuggestions(formName, formGrade, classes);
            setNameSuggestions(suggestions);
            setShowSuggestions(suggestions.length > 0);
        }
    }, [formGrade]);

    const selectSuggestion = (suggestion: string) => {
        setFormName(suggestion);
        setShowSuggestions(false);
    };

    // ─── Grade helper ──────────────────────────────────────
    const gradeToShort = (grade: string): string => {
        const match = grade.match(/\d+/);
        return match ? match[0] : grade;
    };

    const gradeToNumber = (grade: string): number | undefined => {
        const match = grade.match(/\d+/);
        return match ? parseInt(match[0]) : undefined;
    };

    // ─── Stream helpers ────────────────────────────────────
    const buildStreamClasses = (grade: string, count: number): StreamClassConfig[] => {
        const short = gradeToShort(grade);
        return STREAM_LETTERS.slice(0, count).map(letter => ({
            name: `${short}${letter}`,
            capacity: '',
            teacher_id: '',
        }));
    };

    const handleStreamGradeChange = (grade: string) => {
        setStreamGrade(grade);
        const count = streamUseLetterPicker
            ? STREAM_LETTERS.indexOf(streamEndLetter) + 1
            : streamCount;
        setStreamClasses(buildStreamClasses(grade, count));
    };

    const handleStreamEndLetterChange = (letter: string) => {
        setStreamEndLetter(letter);
        const count = STREAM_LETTERS.indexOf(letter) + 1;
        setStreamCount(count);
        if (streamGrade) setStreamClasses(buildStreamClasses(streamGrade, count));
    };

    const handleStreamCountChange = (count: number) => {
        setStreamCount(count);
        const letter = STREAM_LETTERS[count - 1];
        setStreamEndLetter(letter);
        if (streamGrade) setStreamClasses(buildStreamClasses(streamGrade, count));
    };

    const updateStreamClass = (index: number, field: keyof StreamClassConfig, value: string) => {
        setStreamClasses(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
    };

    const handleBulkCreate = async () => {
        if (!streamGrade) {
            Alert.alert('Validation', 'Please select a grade level');
            return;
        }
        if (streamClasses.length === 0) {
            Alert.alert('Validation', 'No classes to create');
            return;
        }
        setBulkCreating(true);
        try {
            const gradeNum = gradeToNumber(streamGrade);
            await Promise.all(
                streamClasses.map(cls =>
                    ClassService.createClass({
                        name: cls.name,
                        grade_level: gradeNum !== undefined ? String(gradeNum) : undefined,
                        capacity: cls.capacity ? parseInt(cls.capacity) : undefined,
                        teacher_id: cls.teacher_id || undefined,
                    })
                )
            );
            setShowStreamModal(false);
            await loadClasses();
            Alert.alert('Success', `${streamClasses.length} classes created successfully!`);
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || err.message);
        } finally {
            setBulkCreating(false);
        }
    };

    // ─── Class CRUD ────────────────────────────────────────
    const openCreateModal = () => {
        setEditingClass(null);
        setFormName('');
        setFormGrade('');
        setFormCapacity('');
        setFormTeacher('');
        setShowSuggestions(false);
        setShowModal(true);
    };

    const openEditModal = (cls: ClassItem) => {
        setEditingClass(cls);
        setFormName(cls.name);
        setFormGrade(cls.grade_level || '');
        setFormCapacity(cls.capacity ? String(cls.capacity) : '');
        setFormTeacher(cls.teacher_id || '');
        setShowSuggestions(false);
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
                grade_level: formGrade ? String(gradeToNumber(formGrade)) : undefined,
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
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <UnifiedHeader
                title="Class Management"
                subtitle={`${classes.length} Total Streams`}
                role="Admin"
                showNotification={true}
                rightActions={
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                            onPress={() => { setAutoAssignGrade(''); setShowAutoAssignModal(true); }}
                            style={{
                                backgroundColor: '#7C3AED',
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}
                        >
                            <Ionicons name="shuffle" size={16} color="white" />
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Auto</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                setStreamGrade('');
                                setStreamCount(4);
                                setStreamClasses([]);
                                setShowStreamModal(true);
                            }}
                            style={{
                                backgroundColor: '#FF6B00',
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 12,
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}
                        >
                            <Ionicons name="apps" size={16} color="white" />
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Streams</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ padding: 16 }}>

                    {/* ── Sub-Header Info ── */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Active Streams</Text>
                        </View>
                    </View>

                    {/* ── Grade Filter ── */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                onPress={() => setGradeFilter('')}
                                style={{
                                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
                                    backgroundColor: !gradeFilter ? '#FF6B00' : pillInactive,
                                    borderColor: !gradeFilter ? '#FF6B00' : pillInactiveBorder,
                                }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: !gradeFilter ? 'white' : pillInactiveText }}>All</Text>
                            </TouchableOpacity>
                            {GRADE_OPTIONS.map(g => (
                                <TouchableOpacity
                                    key={g}
                                    onPress={() => setGradeFilter(gradeFilter === g ? '' : g)}
                                    style={{
                                        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
                                        backgroundColor: gradeFilter === g ? '#FF6B00' : pillInactive,
                                        borderColor: gradeFilter === g ? '#FF6B00' : pillInactiveBorder,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: gradeFilter === g ? 'white' : pillInactiveText }}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* ── Class List ── */}
                    {filteredClasses.length === 0 ? (
                        <View style={{ backgroundColor: card, padding: 32, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: border, borderStyle: 'dashed' }}>
                            <Ionicons name="school-outline" size={48} color={textMuted} />
                            <Text style={{ color: textSecondary, fontWeight: '500', marginTop: 16, textAlign: 'center' }}>
                                {gradeFilter ? `No classes for ${gradeFilter}` : 'No classes yet. Create one to get started.'}
                            </Text>
                        </View>
                    ) : (
                        filteredClasses.map(cls => (
                            <TouchableOpacity
                                key={cls.id}
                                onPress={() => viewStudents(cls)}
                                style={{
                                    backgroundColor: selectedClass?.id === cls.id ? (isDark ? '#2A1A0A' : '#FFF7F0') : card,
                                    padding: 16,
                                    borderRadius: 20,
                                    borderWidth: 1.5,
                                    borderColor: selectedClass?.id === cls.id ? '#FF6B00' : border,
                                    marginBottom: 12,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: isDark ? 0.3 : 0.06,
                                    shadowRadius: 4,
                                    elevation: 2,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={{ backgroundColor: isDark ? '#2A1A0A' : '#FFF3E8', padding: 12, borderRadius: 14, marginRight: 12 }}>
                                            <Ionicons name="school" size={22} color="#FF6B00" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 15 }}>{cls.name}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 6 }}>
                                                {cls.grade_level && (
                                                    <View style={{ backgroundColor: isDark ? '#2C2C2C' : '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                                                        <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '600' }}>{cls.grade_level}</Text>
                                                    </View>
                                                )}
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Ionicons name="people" size={12} color={textMuted} />
                                                    <Text style={{ color: textSecondary, fontSize: 12, marginLeft: 4 }}>
                                                        {cls.student_count || 0}{cls.capacity ? `/${cls.capacity}` : ''} students
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>
                                                Teacher: {getTeacherName(cls.teacher_id)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TouchableOpacity onPress={() => openEditModal(cls)} style={{ padding: 8 }}>
                                            <Ionicons name="create-outline" size={18} color={textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDelete(cls)} style={{ padding: 8 }}>
                                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}

                    {/* ── Students Panel ── */}
                    {selectedClass && (
                        <View style={{ marginTop: 8, backgroundColor: card, borderRadius: 20, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
                            <View style={{ padding: 16, backgroundColor: sectionBg, borderBottomWidth: 1, borderBottomColor: border }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ fontWeight: '700', color: textPrimary, fontSize: 17 }}>{selectedClass.name}</Text>
                                        <Text style={{ color: textSecondary, fontSize: 13, marginTop: 2 }}>
                                            {students.length} student{students.length !== 1 ? 's' : ''} enrolled
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setSelectedClass(null)} style={{ padding: 8 }}>
                                        <Ionicons name="close" size={20} color={textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Enroll search */}
                                <View style={{ marginTop: 12 }}>
                                    <TextInput
                                        style={{
                                            backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
                                            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
                                            color: textPrimary, fontSize: 14,
                                        }}
                                        placeholder="Search student to enroll..."
                                        value={searchQuery}
                                        onChangeText={searchStudents}
                                        placeholderTextColor={textMuted}
                                    />
                                    {searchResults.length > 0 && (
                                        <View style={{ backgroundColor: card, borderWidth: 1, borderColor: border, borderRadius: 14, marginTop: 4, maxHeight: 160, overflow: 'hidden' }}>
                                            {searchResults.map(s => (
                                                <TouchableOpacity
                                                    key={s.id}
                                                    onPress={() => handleEnroll(s.id)}
                                                    disabled={enrolling}
                                                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: border }}
                                                >
                                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#0A2A1A' : '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                                        <Ionicons name="add" size={16} color="#10B981" />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ color: textPrimary, fontWeight: '600', fontSize: 14 }}>{s.full_name}</Text>
                                                        <Text style={{ color: textMuted, fontSize: 11 }}>{s.grade_level} · {s.id}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Student list */}
                            {loadingStudents ? (
                                <View style={{ padding: 24, alignItems: 'center' }}>
                                    <ActivityIndicator color="#FF6B00" />
                                </View>
                            ) : students.length === 0 ? (
                                <View style={{ padding: 24, alignItems: 'center' }}>
                                    <Ionicons name="people-outline" size={36} color={textMuted} />
                                    <Text style={{ color: textMuted, marginTop: 8, fontSize: 13 }}>No students enrolled</Text>
                                </View>
                            ) : (
                                students.map((s, i) => (
                                    <View
                                        key={s.enrollment_id}
                                        style={{
                                            flexDirection: 'row', alignItems: 'center',
                                            paddingHorizontal: 16, paddingVertical: 12,
                                            borderBottomWidth: i < students.length - 1 ? 1 : 0,
                                            borderBottomColor: border,
                                        }}
                                    >
                                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#2A1A0A' : '#FFF3E8', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                            <Text style={{ color: '#FF6B00', fontWeight: '700', fontSize: 14 }}>
                                                {s.full_name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: textPrimary, fontWeight: '600', fontSize: 14 }}>{s.full_name}</Text>
                                            <Text style={{ color: textMuted, fontSize: 11 }}>{s.grade_level} · {s.student_id}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemoveStudent(s)} style={{ padding: 8 }}>
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
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: modalBg,
                        borderTopLeftRadius: 28, borderTopRightRadius: 28,
                        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                    }}>
                        {/* Modal Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: border }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary }}>
                                {editingClass ? 'Edit Class' : 'Create Class'}
                            </Text>
                            <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: 4 }}>
                                <Ionicons name="close" size={24} color={textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">

                            {/* Grade Level */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Grade Level</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {GRADE_OPTIONS.map(g => (
                                            <TouchableOpacity
                                                key={g}
                                                onPress={() => setFormGrade(formGrade === g ? '' : g)}
                                                style={{
                                                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                                                    backgroundColor: formGrade === g ? '#FF6B00' : pillInactive,
                                                    borderColor: formGrade === g ? '#FF6B00' : pillInactiveBorder,
                                                }}
                                            >
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: formGrade === g ? 'white' : pillInactiveText }}>{g}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            {/* Class Name with Autocomplete */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Class Name *</Text>
                                <TextInput
                                    style={{
                                        backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                        color: textPrimary, fontSize: 15, fontWeight: '500',
                                    }}
                                    placeholder={formGrade ? `e.g. ${formGrade} East` : 'e.g. Form 1 East'}
                                    value={formName}
                                    onChangeText={handleNameChange}
                                    placeholderTextColor={textMuted}
                                    onFocus={() => {
                                        if (formName.length >= 1) {
                                            const s = getNameSuggestions(formName, formGrade, classes);
                                            setNameSuggestions(s);
                                            setShowSuggestions(s.length > 0);
                                        }
                                    }}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                />

                                {/* Autocomplete dropdown */}
                                {showSuggestions && nameSuggestions.length > 0 && (
                                    <View style={{
                                        backgroundColor: card, borderWidth: 1.5, borderColor: '#FF6B00',
                                        borderRadius: 14, marginTop: 4, overflow: 'hidden',
                                        shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
                                    }}>
                                        {nameSuggestions.map((suggestion, i) => (
                                            <TouchableOpacity
                                                key={suggestion}
                                                onPress={() => selectSuggestion(suggestion)}
                                                style={{
                                                    flexDirection: 'row', alignItems: 'center',
                                                    paddingHorizontal: 16, paddingVertical: 12,
                                                    borderBottomWidth: i < nameSuggestions.length - 1 ? 1 : 0,
                                                    borderBottomColor: border,
                                                }}
                                            >
                                                <Ionicons name="sparkles-outline" size={14} color="#FF6B00" style={{ marginRight: 10 }} />
                                                <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '500' }}>{suggestion}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {/* Quick suffix pills */}
                                {formGrade && !formName && (
                                    <View style={{ marginTop: 10 }}>
                                        <Text style={{ fontSize: 11, color: textMuted, marginBottom: 6 }}>Quick pick:</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                                {['A', 'B', 'C', 'East', 'West', 'North', 'South', 'Red', 'Blue'].map(suffix => (
                                                    <TouchableOpacity
                                                        key={suffix}
                                                        onPress={() => selectSuggestion(`${formGrade} ${suffix}`)}
                                                        style={{
                                                            paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                                                            backgroundColor: isDark ? '#2A1A0A' : '#FFF3E8',
                                                            borderWidth: 1, borderColor: isDark ? '#FF6B0040' : '#FFD0A8',
                                                        }}
                                                    >
                                                        <Text style={{ color: '#FF6B00', fontSize: 12, fontWeight: '700' }}>{formGrade} {suffix}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            {/* Capacity */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Max Capacity (optional)</Text>
                                <TextInput
                                    style={{
                                        backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                        color: textPrimary, fontSize: 15, fontWeight: '500',
                                    }}
                                    placeholder="e.g. 40"
                                    value={formCapacity}
                                    onChangeText={setFormCapacity}
                                    keyboardType="numeric"
                                    placeholderTextColor={textMuted}
                                />
                            </View>

                            {/* Teacher */}
                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Class Teacher</Text>
                                <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                    <View style={{ gap: 6 }}>
                                        <TouchableOpacity
                                            onPress={() => setFormTeacher('')}
                                            style={{
                                                paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5,
                                                backgroundColor: !formTeacher ? (isDark ? '#FF6B00' : '#111827') : pillInactive,
                                                borderColor: !formTeacher ? (isDark ? '#FF6B00' : '#111827') : pillInactiveBorder,
                                            }}
                                        >
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: !formTeacher ? 'white' : textSecondary }}>None</Text>
                                        </TouchableOpacity>
                                        {teachers.map(t => (
                                            <TouchableOpacity
                                                key={t.id}
                                                onPress={() => setFormTeacher(formTeacher === t.id ? '' : t.id)}
                                                style={{
                                                    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5,
                                                    backgroundColor: formTeacher === t.id ? '#FF6B00' : pillInactive,
                                                    borderColor: formTeacher === t.id ? '#FF6B00' : pillInactiveBorder,
                                                }}
                                            >
                                                <Text style={{ fontSize: 14, fontWeight: '600', color: formTeacher === t.id ? 'white' : textPrimary }}>{t.full_name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={saving}
                                style={{
                                    backgroundColor: '#FF6B00', paddingVertical: 16,
                                    borderRadius: 16, alignItems: 'center', marginBottom: 8,
                                }}
                            >
                                {saving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>
                                        {editingClass ? 'Save Changes' : 'Create Class'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ═══ Auto-Assign Modal ═══ */}
            <Modal visible={showAutoAssignModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 20 }}>
                    <View style={{ backgroundColor: modalBg, borderRadius: 24, overflow: 'hidden' }}>
                        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: border }}>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary }}>Auto-Assign Students</Text>
                            <Text style={{ color: textSecondary, fontSize: 13, marginTop: 4 }}>
                                Distributes unassigned students evenly across classes for a grade level
                            </Text>
                        </View>

                        <View style={{ padding: 20 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Select Grade Level</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                                {GRADE_OPTIONS.map(g => (
                                    <TouchableOpacity
                                        key={g}
                                        onPress={() => setAutoAssignGrade(g)}
                                        style={{
                                            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                                            backgroundColor: autoAssignGrade === g ? '#7C3AED' : pillInactive,
                                            borderColor: autoAssignGrade === g ? '#7C3AED' : pillInactiveBorder,
                                        }}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: autoAssignGrade === g ? 'white' : pillInactiveText }}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={{ backgroundColor: isDark ? '#1A0A2A' : '#F5F3FF', borderRadius: 14, padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start' }}>
                                <Ionicons name="information-circle" size={18} color="#7C3AED" />
                                <Text style={{ color: isDark ? '#C4B5FD' : '#5B21B6', fontSize: 12, marginLeft: 8, flex: 1, lineHeight: 18 }}>
                                    Students without a class assignment will be distributed evenly. Classes at full capacity will be skipped.
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TouchableOpacity
                                    onPress={() => setShowAutoAssignModal(false)}
                                    style={{ flex: 1, backgroundColor: isDark ? '#2C2C2C' : '#F3F4F6', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
                                >
                                    <Text style={{ color: textSecondary, fontWeight: '700' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleAutoAssign}
                                    disabled={autoAssigning || !autoAssignGrade}
                                    style={{
                                        flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
                                        backgroundColor: autoAssignGrade ? '#7C3AED' : (isDark ? '#3F3F3F' : '#D1D5DB'),
                                    }}
                                >
                                    {autoAssigning ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={{ color: 'white', fontWeight: '800' }}>Assign</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ═══ Stream Bulk Create Modal ═══ */}
            <Modal visible={showStreamModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
                    <View style={{
                        backgroundColor: modalBg,
                        borderTopLeftRadius: 28, borderTopRightRadius: 28,
                        maxHeight: '92%',
                        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                    }}>
                        {/* Modal Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: border }}>
                            <View>
                                <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary }}>Create Stream</Text>
                                <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>
                                    Bulk create a full class stream
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowStreamModal(false)} style={{ padding: 4 }}>
                                <Ionicons name="close" size={24} color={textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">

                            {/* Grade Level */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Grade Level</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {GRADE_OPTIONS.map(g => (
                                            <TouchableOpacity
                                                key={g}
                                                onPress={() => handleStreamGradeChange(g)}
                                                style={{
                                                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                                                    backgroundColor: streamGrade === g ? '#0891B2' : pillInactive,
                                                    borderColor: streamGrade === g ? '#0891B2' : pillInactiveBorder,
                                                }}
                                            >
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: streamGrade === g ? 'white' : pillInactiveText }}>{g}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            {/* Range Picker toggle */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Stream Range</Text>

                                <View style={{ flexDirection: 'row', backgroundColor: inputBg, borderRadius: 12, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: inputBorder }}>
                                    <TouchableOpacity
                                        onPress={() => setStreamUseLetterPicker(true)}
                                        style={{
                                            flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                                            backgroundColor: streamUseLetterPicker ? '#0891B2' : 'transparent',
                                        }}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: streamUseLetterPicker ? 'white' : textSecondary }}>A → Letter</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setStreamUseLetterPicker(false)}
                                        style={{
                                            flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
                                            backgroundColor: !streamUseLetterPicker ? '#0891B2' : 'transparent',
                                        }}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: !streamUseLetterPicker ? 'white' : textSecondary }}># of Classes</Text>
                                    </TouchableOpacity>
                                </View>

                                {streamUseLetterPicker ? (
                                    <View>
                                        <Text style={{ fontSize: 12, color: textMuted, marginBottom: 8 }}>Classes will be created A through:</Text>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {STREAM_LETTERS.map(letter => (
                                                <TouchableOpacity
                                                    key={letter}
                                                    onPress={() => handleStreamEndLetterChange(letter)}
                                                    style={{
                                                        width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                                                        borderWidth: 1.5,
                                                        backgroundColor: streamEndLetter === letter ? '#0891B2' : pillInactive,
                                                        borderColor: streamEndLetter === letter ? '#0891B2' : pillInactiveBorder,
                                                    }}
                                                >
                                                    <Text style={{ fontWeight: '800', fontSize: 15, color: streamEndLetter === letter ? 'white' : textPrimary }}>{letter}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ) : (
                                    <View>
                                        <Text style={{ fontSize: 12, color: textMuted, marginBottom: 8 }}>Number of classes:</Text>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                                <TouchableOpacity
                                                    key={n}
                                                    onPress={() => handleStreamCountChange(n)}
                                                    style={{
                                                        width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                                                        borderWidth: 1.5,
                                                        backgroundColor: streamCount === n ? '#0891B2' : pillInactive,
                                                        borderColor: streamCount === n ? '#0891B2' : pillInactiveBorder,
                                                    }}
                                                >
                                                    <Text style={{ fontWeight: '800', fontSize: 15, color: streamCount === n ? 'white' : textPrimary }}>{n}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Per-class config */}
                            {streamClasses.length > 0 && (
                                <View style={{ marginBottom: 24 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Classes to Create ({streamClasses.length})
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 4 }}>
                                            {streamClasses.map(c => (
                                                <View key={c.name} style={{ backgroundColor: isDark ? '#062732' : '#E0F2FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                                                    <Text style={{ color: '#0891B2', fontWeight: '800', fontSize: 11 }}>{c.name}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>

                                    {streamClasses.map((cls, index) => (
                                        <View key={cls.name} style={{
                                            backgroundColor: sectionBg,
                                            borderRadius: 16,
                                            padding: 14,
                                            marginBottom: 10,
                                            borderWidth: 1,
                                            borderColor: border,
                                        }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                                <View style={{ backgroundColor: isDark ? '#062732' : '#E0F2FE', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, marginRight: 8 }}>
                                                    <Text style={{ color: '#0891B2', fontWeight: '900', fontSize: 16 }}>{cls.name}</Text>
                                                </View>
                                                <Text style={{ color: textMuted, fontSize: 12 }}>Configure below</Text>
                                            </View>

                                            {/* Capacity */}
                                            <View style={{ marginBottom: 10 }}>
                                                <Text style={{ fontSize: 11, fontWeight: '600', color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Capacity (optional)</Text>
                                                <TextInput
                                                    style={{
                                                        backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder,
                                                        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                                                        color: textPrimary, fontSize: 14,
                                                    }}
                                                    placeholder="e.g. 40"
                                                    value={cls.capacity}
                                                    onChangeText={v => updateStreamClass(index, 'capacity', v)}
                                                    keyboardType="numeric"
                                                    placeholderTextColor={textMuted}
                                                />
                                            </View>

                                            {/* Teacher */}
                                            <View>
                                                <Text style={{ fontSize: 11, fontWeight: '600', color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>Teacher (optional)</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                                        <TouchableOpacity
                                                            onPress={() => updateStreamClass(index, 'teacher_id', '')}
                                                            style={{
                                                                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
                                                                backgroundColor: !cls.teacher_id ? '#0891B2' : pillInactive,
                                                                borderColor: !cls.teacher_id ? '#0891B2' : pillInactiveBorder,
                                                            }}
                                                        >
                                                            <Text style={{ fontSize: 12, fontWeight: '600', color: !cls.teacher_id ? 'white' : textSecondary }}>None</Text>
                                                        </TouchableOpacity>
                                                        {teachers.map(t => (
                                                            <TouchableOpacity
                                                                key={t.id}
                                                                onPress={() => updateStreamClass(index, 'teacher_id', cls.teacher_id === t.id ? '' : t.id)}
                                                                style={{
                                                                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
                                                                    backgroundColor: cls.teacher_id === t.id ? '#0891B2' : pillInactive,
                                                                    borderColor: cls.teacher_id === t.id ? '#0891B2' : pillInactiveBorder,
                                                                }}
                                                            >
                                                                <Text style={{ fontSize: 12, fontWeight: '600', color: cls.teacher_id === t.id ? 'white' : textPrimary }}>{t.full_name}</Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                </ScrollView>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Create button */}
                            <TouchableOpacity
                                onPress={handleBulkCreate}
                                disabled={bulkCreating || !streamGrade || streamClasses.length === 0}
                                style={{
                                    backgroundColor: streamGrade && streamClasses.length > 0 ? '#0891B2' : (isDark ? '#3F3F3F' : '#D1D5DB'),
                                    paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 8,
                                }}
                            >
                                {bulkCreating ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>
                                        {streamClasses.length > 0
                                            ? `Create ${streamClasses.length} Classes (${streamClasses.map(c => c.name).join(', ')})`
                                            : 'Select a grade to continue'}
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