import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { Spinner } from '@/components/ui/Spinner';
import { CardGridSkeleton, TableRowSkeleton } from '@/components/ui/skeletons';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';
import {
    AutoAssignResult,
    ClassDomainCategory,
    ClassDomainLevel,
    ClassDomainStream,
    ClassItem,
    ClassService,
    ClassStudent,
} from '@/services/ClassService';
import { formatClassLabel } from '@/utils/classLabel';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert, Modal, Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ─────────────────────────────────────────────────
interface Teacher {
    id: string;
    full_name: string;
}

interface SearchStudent {
    id: string;
    full_name: string;
    grade_level?: number | string | null;
    form_level?: number | string | null;
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
    const [formLevel, setFormLevel] = useState('');
    const [formCategoryId, setFormCategoryId] = useState('');
    const [formLevelId, setFormLevelId] = useState('');
    const [formStreamId, setFormStreamId] = useState('');
    const [formCapacity, setFormCapacity] = useState('');
    const [formTeacher, setFormTeacher] = useState('');
    const [saving, setSaving] = useState(false);
    const [formClassType, setFormClassType] = useState('Grade');
    const [classTypes, setClassTypes] = useState<string[]>(['Grade']);

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
    const [autoAssignLevel, setAutoAssignLevel] = useState('');
    const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [pendingDeleteClass, setPendingDeleteClass] = useState<ClassItem | null>(null);
    const [deletingClass, setDeletingClass] = useState(false);

    // Domain management drawer
    const [showDomainDrawer, setShowDomainDrawer] = useState(false);
    const [domainSaving, setDomainSaving] = useState(false);
    const [newLevelCategoryId, setNewLevelCategoryId] = useState('');
    const [newLevelNumber, setNewLevelNumber] = useState('');
    const [newStreamLevelId, setNewStreamLevelId] = useState('');
    const [newStreamCode, setNewStreamCode] = useState('');

    // Lookups
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [levelFilter, setLevelFilter] = useState('');

    const safeLevelLabel = String(formClassType || 'Grade').replace(/[^A-Za-z0-9 ]+/g, '').trim() || 'Grade';
    const isSecondary = safeLevelLabel === 'Form';
    const [gradeOptions, setGradeOptions] = useState<string[]>([]);
    const [domainCategories, setDomainCategories] = useState<ClassDomainCategory[]>([]);
    const [domainLevels, setDomainLevels] = useState<ClassDomainLevel[]>([]);
    const [domainStreams, setDomainStreams] = useState<ClassDomainStream[]>([]);

    // ─── Theme helpers ─────────────────────────────────────
    const bg = isDark ? '#161B22' : '#F9FAFB';
    const card = isDark ? '#161B22' : '#FFFFFF';
    const border = isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6';
    const textPrimary = isDark ? '#F9FAFB' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
    const textMuted = isDark ? '#6B7280' : '#9CA3AF';
    const inputBg = isDark ? 'rgba(255,255,255,0.1)' : '#F9FAFB';
    const inputBorder = isDark ? '#3F3F3F' : '#E5E7EB';
    const pillInactive = isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF';
    const pillInactiveBorder = isDark ? '#3F3F3F' : '#E5E7EB';
    const pillInactiveText = isDark ? '#9CA3AF' : '#4B5563';
    const modalBg = isDark ? '#161B22' : '#FFFFFF';
    const sectionBg = isDark ? '#161B22' : '#F9FAFB';

    // ─── Data Loading ──────────────────────────────────────
    const loadClasses = useCallback(async () => {
        try {
            const data = await ClassService.getClasses();
            setClasses(data);
        } catch (err: any) {
            console.error('loadClasses error:', err);
        }
    }, []);

    const loadClassOptions = useCallback(async () => {
        try {
            const options = await ClassService.getClassOptions();
            const levels = (options.level_options || []).map((item) => item.label).filter(Boolean);
            setGradeOptions(levels);
            setFormClassType(options.class_type || 'Grade');
            setClassTypes((options.class_types || [options.class_type || 'Grade']).filter(Boolean));
            setDomainCategories(options.categories || []);
            const levelOptionMap = new Map((options.level_options || []).map((item) => [item.level_id, item]));
            setDomainLevels((options.levels || []).map((level) => ({
                ...level,
                class_type: levelOptionMap.get(level.id)?.class_type || options.class_type || 'Grade',
            })));
            setDomainStreams(options.streams || []);
        } catch (err: any) {
            console.error('loadClassOptions error:', err);
            const fallback = Array.from(
                { length: isSecondary ? 6 : (safeLevelLabel === 'KG' ? 3 : 7) },
                (_, i) => `${safeLevelLabel} ${i + 1}`
            );
            setGradeOptions(fallback);
            setDomainCategories([]);
            setDomainLevels([]);
            setDomainStreams([]);
        }
    }, [isSecondary, safeLevelLabel]);

    const selectedLevel = domainLevels.find((l) => l.id === formLevelId) || null;

    const availableLevels = formCategoryId
        ? domainLevels.filter((level) => level.category_id === formCategoryId && level.class_type === formClassType)
        : [];

    const availableStreams = formLevelId
        ? domainStreams.filter((stream) => stream.level_id === formLevelId)
        : [];

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
            await Promise.all([loadClasses(), loadTeachers(), loadClassOptions()]);
            setLoading(false);
        };
        init();
    }, [loadClasses, loadClassOptions]);

    // ─── Grade helper ──────────────────────────────────────
    const gradeToNumber = (grade: string): number | undefined => {
        const match = grade.match(/\d+/);
        return match ? parseInt(match[0]) : undefined;
    };

    const handleCreateLevel = async () => {
        const levelNumber = Number(newLevelNumber);
        if (!newLevelCategoryId) {
            Alert.alert('Validation', 'Select a category first');
            return;
        }
        if (!Number.isFinite(levelNumber) || levelNumber <= 0) {
            Alert.alert('Validation', 'Level number must be a positive number');
            return;
        }

        setDomainSaving(true);
        try {
            await ClassService.createDomainLevel({
                category_id: newLevelCategoryId,
                level_number: levelNumber,
                name: `${safeLevelLabel} ${levelNumber}`,
            });
            setNewLevelNumber('');
            await loadClassOptions();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || err.message);
        } finally {
            setDomainSaving(false);
        }
    };

    const handleCreateStream = async () => {
        if (!newStreamLevelId) {
            Alert.alert('Validation', 'Select a level first');
            return;
        }
        if (!newStreamCode.trim()) {
            Alert.alert('Validation', 'Stream code is required');
            return;
        }

        setDomainSaving(true);
        try {
            await ClassService.createDomainStream({
                level_id: newStreamLevelId,
                code: newStreamCode.trim(),
                name: newStreamCode.trim(),
            });
            setNewStreamCode('');
            await loadClassOptions();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || err.message);
        } finally {
            setDomainSaving(false);
        }
    };

    // ─── Class CRUD ────────────────────────────────────────
    const openCreateModal = () => {
        setEditingClass(null);
        setFormLevel('');
        setFormCategoryId('');
        setFormLevelId('');
        setFormStreamId('');
        setFormCapacity('');
        setFormTeacher('');
        setShowModal(true);
    };

    const openEditModal = (cls: ClassItem) => {
        setEditingClass(cls);
        const clsType = cls.class_type || safeLevelLabel;
        setFormClassType(clsType);
        const level = cls.grade_level || cls.form_level;
        setFormLevel(level ? `${clsType} ${level}` : '');
        setFormCategoryId(cls.category_id || '');
        setFormLevelId(cls.level_id || '');
        setFormStreamId(cls.stream_id || '');
        setFormCapacity(cls.capacity != null ? String(cls.capacity) : '');
        setFormTeacher(cls.teacher_id || '');
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const levelNum = gradeToNumber(formLevel);
            const payload: any = {
                class_type: formClassType,
                grade_level: (safeLevelLabel === 'Grade' || safeLevelLabel === 'KG') ? levelNum : undefined,
                form_level: (safeLevelLabel === 'Form') ? levelNum : undefined,
                category_id: formCategoryId || undefined,
                level_id: formLevelId || undefined,
                stream_id: formStreamId || undefined,
                capacity: formCapacity ? parseInt(formCapacity, 10) : undefined,
                teacher_id: formTeacher || undefined,
            };

            if (editingClass) {
                await ClassService.updateClass(editingClass.id, payload);
            } else {
                await ClassService.createClass(payload);
            }
            setShowModal(false);
            await loadClasses();
            await loadClassOptions();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (cls: ClassItem) => {
        setPendingDeleteClass(cls);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteClass) return;
        setDeletingClass(true);
        try {
            await ClassService.deleteClass(pendingDeleteClass.id);
            if (selectedClass?.id === pendingDeleteClass.id) setSelectedClass(null);
            setShowDeleteModal(false);
            setPendingDeleteClass(null);
            await loadClasses();
            await loadClassOptions();
        } catch (err: any) {
            const backendMsg = err?.response?.data?.error || err?.message || 'Failed to delete class';
            Alert.alert(
                'Unable to remove class',
                `${backendMsg}\n\nIf this class should be removable, ensure the classes deleted_at migration is applied and that no dependent records still reference it.`
            );
        } finally {
            setDeletingClass(false);
        }
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
            .select('id, grade_level, form_level, users:user_id(full_name)') as any;

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
                        grade_level: s.grade_level ? String(s.grade_level) : undefined,
                        form_level: s.form_level ? String(s.form_level) : undefined,
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
        if (!autoAssignLevel) {
            Alert.alert('Validation', 'Select a ' + safeLevelLabel.toLowerCase() + ' level');
            return;
        }
        setAutoAssigning(true);
        try {
            const numLevel = parseInt(autoAssignLevel.replace(/[^0-9]/g, ''), 10);
            const result: AutoAssignResult = await ClassService.autoAssign({
                grade_level: !isSecondary ? numLevel : undefined,
                form_level: isSecondary ? numLevel : undefined,
            });
            setShowAutoAssignModal(false);
            await loadClasses();
            await loadClassOptions();
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
    const filteredClasses = levelFilter
        ? classes.filter((c) => {
            const selectedLevel = gradeToNumber(levelFilter);
            if (selectedLevel === undefined) return true;
            const selectedType = levelFilter.split(' ')[0]?.trim();
            const classType = (c.class_type || safeLevelLabel || '').trim();
            const matchesType = selectedType ? classType.toLowerCase() === selectedType.toLowerCase() : true;
            const matchesLevel = c.grade_level === selectedLevel || c.form_level === selectedLevel;
            return matchesType && matchesLevel;
        })
        : classes;

    const getTeacherName = (teacherId?: string) => {
        if (!teacherId) return 'Unassigned';
        const t = teachers.find(t => t.id === teacherId);
        return t?.full_name || 'Unknown';
    };

    // ─── Render ────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: bg, padding: 16 }}>
                <CardGridSkeleton loading={loading} count={5} label="Loading classes..." />
            </SafeAreaView>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: bg }}>
            <UnifiedHeader
                title="Class Management"
                subtitle={`${classes.length} Total Streams`}
                role="Admin"
                onBack={() => router.back()}
                showNotification={true}
            />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ padding: 16 }}>

                    {/* ── Action Bar ── */}
                    <View style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Active Streams</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                onPress={async () => {
                                    setLoading(true);
                                    await Promise.all([loadClasses(), loadClassOptions()]);
                                    setLoading(false);
                                }}
                                style={{ backgroundColor: isDark ? '#1E293B' : '#E2E8F0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Ionicons name="refresh" size={15} color={isDark ? '#CBD5E1' : '#334155'} />
                                <Text style={{ color: isDark ? '#CBD5E1' : '#334155', fontWeight: '700', fontSize: 12, marginLeft: 5 }}>Refresh</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => { setAutoAssignLevel(''); setShowAutoAssignModal(true); }}
                                style={{ backgroundColor: '#7C3AED', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Ionicons name="shuffle" size={15} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12, marginLeft: 5 }}>Auto</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowDomainDrawer(true)}
                                style={{ backgroundColor: '#FF6B00', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Ionicons name="apps" size={15} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12, marginLeft: 5 }}>Domain</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={openCreateModal}
                                style={{ backgroundColor: isDark ? '#FF6B00' : '#111827', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Ionicons name="add" size={16} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12, marginLeft: 4 }}>New</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── Level Filter ── */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                onPress={() => setLevelFilter('')}
                                style={{
                                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
                                    backgroundColor: !levelFilter ? '#FF6B00' : pillInactive,
                                    borderColor: !levelFilter ? '#FF6B00' : pillInactiveBorder,
                                }}
                            >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: !levelFilter ? 'white' : pillInactiveText }}>All</Text>
                            </TouchableOpacity>
                            {gradeOptions.map(g => (
                                <TouchableOpacity
                                    key={g}
                                    onPress={() => setLevelFilter(levelFilter === g ? '' : g)}
                                    style={{
                                        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
                                        backgroundColor: levelFilter === g ? '#FF6B00' : pillInactive,
                                        borderColor: levelFilter === g ? '#FF6B00' : pillInactiveBorder,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: levelFilter === g ? 'white' : pillInactiveText }}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    {/* ── Class List ── */}
                    {filteredClasses.length === 0 ? (
                        <View style={{ backgroundColor: card, padding: 32, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: border, borderStyle: 'dashed' }}>
                            <Ionicons name="school-outline" size={48} color={textMuted} />
                            <Text style={{ color: textSecondary, fontWeight: '500', marginTop: 16, textAlign: 'center' }}>
                                {levelFilter ? `No classes for ${levelFilter}` : 'No classes yet. Create one to get started.'}
                            </Text>
                        </View>
                    ) : (
                        filteredClasses.map(cls => (
                            <View
                                key={cls.id}
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
                                    boxShadow: [{
                                        offsetX: 0,
                                        offsetY: 1,
                                        blurRadius: 4,
                                        color: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.06)',
                                    }],
                                    elevation: 2,
                                }}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <TouchableOpacity onPress={() => viewStudents(cls)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                        <View style={{ backgroundColor: isDark ? '#2A1A0A' : '#FFF3E8', padding: 12, borderRadius: 14, marginRight: 12 }}>
                                            <Ionicons name="school" size={22} color="#FF6B00" />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 15 }}>{formatClassLabel(cls)}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 6 }}>
                                                {(cls.class_type || cls.grade_level || cls.form_level) && (
                                                    <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                                                        <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '600' }}>{cls.class_type || safeLevelLabel} {cls.grade_level || cls.form_level}</Text>
                                                    </View>
                                                )}
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Ionicons name="people" size={12} color={textMuted} />
                                                    <Text style={{ color: textSecondary, fontSize: 12, marginLeft: 4 }}>
                                                        {cls.student_count || 0}{cls.capacity ? `/ ${cls.capacity}` : ''} students
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>
                                                Teacher: {getTeacherName(cls.teacher_id)}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TouchableOpacity onPress={() => openEditModal(cls)} style={{ padding: 8 }}>
                                            <Ionicons name="create-outline" size={18} color={textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDelete(cls)} style={{ padding: 8 }}>
                                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}

            {/* ── Delete Confirmation Modal ── */}
            <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => !deletingClass && setShowDeleteModal(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: modalBg, borderRadius: 20, borderWidth: 1, borderColor: border, padding: 20 }}>
                        <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>
                            Confirm Class Removal
                        </Text>
                        <Text style={{ color: textSecondary, fontSize: 14, marginBottom: 20 }}>
                            Remove "{pendingDeleteClass ? formatClassLabel(pendingDeleteClass) : 'this class'}"?
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                disabled={deletingClass}
                                onPress={() => {
                                    setShowDeleteModal(false);
                                    setPendingDeleteClass(null);
                                }}
                                style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: inputBorder, paddingVertical: 12, alignItems: 'center' }}
                            >
                                <Text style={{ color: textPrimary, fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                disabled={deletingClass}
                                onPress={confirmDelete}
                                style={{ flex: 1, borderRadius: 12, backgroundColor: '#EF4444', paddingVertical: 12, alignItems: 'center', opacity: deletingClass ? 0.7 : 1 }}
                            >
                                {deletingClass ? (
                                    <Spinner color="white" label="Removing class" />
                                ) : (
                                    <Text style={{ color: 'white', fontWeight: '700' }}>Remove</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── Students Panel ── */}
            {selectedClass && (
                        <View
                            style={{ marginTop: 8, backgroundColor: card, borderRadius: 20, borderWidth: 1, borderColor: border, overflow: 'hidden' }}
                            accessibilityState={{ busy: loadingStudents }}
                        >
                            <View style={{ padding: 16, backgroundColor: sectionBg, borderBottomWidth: 1, borderBottomColor: border }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ fontWeight: '700', color: textPrimary, fontSize: 17 }}>{formatClassLabel(selectedClass)}</Text>
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
                                                         <Text style={{ color: textMuted, fontSize: 11 }}>{safeLevelLabel} {s.grade_level || s.form_level} · {s.id}</Text>
                                                     </View>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Student list */}
                            {loadingStudents ? (
                                <View style={{ padding: 16 }}>
                                    <TableRowSkeleton loading={loadingStudents} columns={3} count={6} label="Loading class students..." />
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
                                                {s.full_name?.charAt(0).toUpperCase() || '?'}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: textPrimary, fontWeight: '600', fontSize: 14 }}>{s.full_name}</Text>
                                            <Text style={{ color: textMuted, fontSize: 11 }}>{safeLevelLabel} {s.grade_level || s.form_level} · {s.student_id}</Text>
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

                            {/* Dynamic Level Selection */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{safeLevelLabel} Level</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {gradeOptions.map(g => (
                                            <TouchableOpacity
                                                key={g}
                                                onPress={() => setFormLevel(formLevel === g ? '' : g)}
                                                style={{
                                                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                                                    backgroundColor: formLevel === g ? '#FF6B00' : pillInactive,
                                                    borderColor: formLevel === g ? '#FF6B00' : pillInactiveBorder,
                                                }}
                                            >
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: formLevel === g ? 'white' : pillInactiveText }}>{g}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>

                            {domainCategories.length > 0 && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Category</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {domainCategories.map((category) => (
                                                <TouchableOpacity
                                                    key={category.id}
                                                    onPress={() => {
                                                        const nextCategoryId = formCategoryId === category.id ? '' : category.id;
                                                        setFormCategoryId(nextCategoryId);
                                                        setFormLevelId('');
                                                        setFormStreamId('');
                                                    }}
                                                    style={{
                                                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                                                        backgroundColor: formCategoryId === category.id ? '#0EA5E9' : pillInactive,
                                                        borderColor: formCategoryId === category.id ? '#0EA5E9' : pillInactiveBorder,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: formCategoryId === category.id ? 'white' : pillInactiveText }}>{category.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            )}

                            {availableLevels.length > 0 && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Level</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {availableLevels.map((level) => (
                                                <TouchableOpacity
                                                    key={level.id}
                                                    onPress={() => {
                                                        const nextLevelId = formLevelId === level.id ? '' : level.id;
                                                        setFormLevelId(nextLevelId);
                                                        setFormStreamId('');
                                                        if (nextLevelId) {
                                                            setFormLevel(`${safeLevelLabel} ${level.level_number}`);
                                                        }
                                                    }}
                                                    style={{
                                                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                                                        backgroundColor: formLevelId === level.id ? '#0EA5E9' : pillInactive,
                                                        borderColor: formLevelId === level.id ? '#0EA5E9' : pillInactiveBorder,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: formLevelId === level.id ? 'white' : pillInactiveText }}>
                                                        {level.name || `${safeLevelLabel} ${level.level_number}`}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            )}

                            {availableStreams.length > 0 && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Stream</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {availableStreams.map((streamItem) => (
                                                <TouchableOpacity
                                                    key={streamItem.id}
                                                    onPress={() => {
                                                        const nextStreamId = formStreamId === streamItem.id ? '' : streamItem.id;
                                                        setFormStreamId(nextStreamId);
                                                    }}
                                                    style={{
                                                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                                                        backgroundColor: formStreamId === streamItem.id ? '#0EA5E9' : pillInactive,
                                                        borderColor: formStreamId === streamItem.id ? '#0EA5E9' : pillInactiveBorder,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: formStreamId === streamItem.id ? 'white' : pillInactiveText }}>
                                                        {streamItem.name || streamItem.code}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            )}

                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {classTypes.map((typeName) => (
                                            <TouchableOpacity
                                                key={typeName}
                                                onPress={() => {
                                                    setFormClassType(typeName);
                                                    setFormCategoryId('');
                                                    setFormLevelId('');
                                                    setFormStreamId('');
                                                    setFormLevel('');
                                                }}
                                                style={{
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 8,
                                                    borderRadius: 20,
                                                    borderWidth: 1.5,
                                                    backgroundColor: formClassType === typeName ? '#0EA5E9' : pillInactive,
                                                    borderColor: formClassType === typeName ? '#0EA5E9' : pillInactiveBorder,
                                                }}
                                            >
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: formClassType === typeName ? 'white' : pillInactiveText }}>{typeName}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
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
                                        {teachers.map(t => {
                                            const assignedClass = classes.find(c => c.teacher_id === t.id && c.id !== editingClass?.id);
                                            return (
                                                <TouchableOpacity
                                                    key={t.id}
                                                    onPress={() => setFormTeacher(formTeacher === t.id ? '' : t.id)}
                                                    disabled={!!assignedClass}
                                                    style={{
                                                        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5,
                                                        backgroundColor: formTeacher === t.id ? '#FF6B00' : (assignedClass ? (isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6') : pillInactive),
                                                        borderColor: formTeacher === t.id ? '#FF6B00' : pillInactiveBorder,
                                                        opacity: assignedClass ? 0.5 : 1,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 14, fontWeight: '600', color: formTeacher === t.id ? 'white' : (assignedClass ? textSecondary : textPrimary) }}>
                                                        {t.full_name} {assignedClass ? `(Class Teacher of ${assignedClass.name})` : ''}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </ScrollView>
                            </View>

                            <TouchableOpacity
                                onPress={handleSave}
                                disabled={saving}
                                style={{
                                    backgroundColor: '#FF6B00', paddingVertical: 16,
                                    borderRadius: 16, alignItems: 'center', marginBottom: 8,
                                    opacity: saving ? 0.7 : 1,
                                }}
                                accessibilityState={{ disabled: saving, busy: saving }}
                            >
                                {saving ? (
                                    <Spinner color="white" label="Saving class" />
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
                                    {`Distributes unassigned students evenly across classes for a ${safeLevelLabel.toLowerCase()} level`}
                             </Text>
                        </View>

                        <View style={{ padding: 20 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Select {safeLevelLabel} Level</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                                {gradeOptions.map(g => (
                                    <TouchableOpacity
                                        key={g}
                                        onPress={() => setAutoAssignLevel(g)}
                                        style={{
                                            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                                            backgroundColor: autoAssignLevel === g ? '#7C3AED' : pillInactive,
                                            borderColor: autoAssignLevel === g ? '#7C3AED' : pillInactiveBorder,
                                        }}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: autoAssignLevel === g ? 'white' : pillInactiveText }}>{g}</Text>
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
                                    style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6', paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
                                >
                                    <Text style={{ color: textSecondary, fontWeight: '700' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleAutoAssign}
                                    disabled={autoAssigning || !autoAssignLevel}
                                    style={{
                                        flex: 2, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
                                        backgroundColor: autoAssignLevel ? '#7C3AED' : (isDark ? '#3F3F3F' : '#D1D5DB'),
                                        opacity: autoAssigning ? 0.8 : 1,
                                    }}
                                    accessibilityState={{ disabled: autoAssigning || !autoAssignLevel, busy: autoAssigning }}
                                >
                                    {autoAssigning ? (
                                        <Spinner color="white" label="Auto-assigning students" />
                                    ) : (
                                        <Text style={{ color: 'white', fontWeight: '800' }}>Assign</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ═══ Domain Management Drawer ═══ */}
            <Modal visible={showDomainDrawer} animationType="slide" transparent>
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
                                <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary }}>Class Domain Manager</Text>
                                <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>
                                    Manage categories, levels, and streams
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowDomainDrawer(false)} style={{ padding: 4 }}>
                                <Ionicons name="close" size={24} color={textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>New Level</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {domainCategories.map((category) => (
                                            <TouchableOpacity
                                                key={category.id}
                                                onPress={() => setNewLevelCategoryId(newLevelCategoryId === category.id ? '' : category.id)}
                                                style={{
                                                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                                                    backgroundColor: newLevelCategoryId === category.id ? '#0891B2' : pillInactive,
                                                    borderColor: newLevelCategoryId === category.id ? '#0891B2' : pillInactiveBorder,
                                                }}
                                            >
                                                <Text style={{ color: newLevelCategoryId === category.id ? 'white' : pillInactiveText, fontWeight: '700' }}>{category.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TextInput
                                        style={{
                                            flex: 1,
                                            backgroundColor: inputBg,
                                            borderWidth: 1,
                                            borderColor: inputBorder,
                                            borderRadius: 12,
                                            paddingHorizontal: 12,
                                            paddingVertical: 10,
                                            color: textPrimary,
                                        }}
                                        placeholder="Level number"
                                        value={newLevelNumber}
                                        onChangeText={setNewLevelNumber}
                                        keyboardType="number-pad"
                                        placeholderTextColor={textMuted}
                                    />
                                    <TouchableOpacity
                                        onPress={handleCreateLevel}
                                        disabled={domainSaving}
                                        style={{ backgroundColor: '#0891B2', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '700' }}>Add</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>New Stream</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {domainLevels.map((level) => (
                                            <TouchableOpacity
                                                key={level.id}
                                                onPress={() => setNewStreamLevelId(newStreamLevelId === level.id ? '' : level.id)}
                                                style={{
                                                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                                                    backgroundColor: newStreamLevelId === level.id ? '#0891B2' : pillInactive,
                                                    borderColor: newStreamLevelId === level.id ? '#0891B2' : pillInactiveBorder,
                                                }}
                                            >
                                                <Text style={{ color: newStreamLevelId === level.id ? 'white' : pillInactiveText, fontWeight: '700' }}>
                                                    {level.name || `${safeLevelLabel} ${level.level_number}`}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TextInput
                                        style={{
                                            flex: 1,
                                            backgroundColor: inputBg,
                                            borderWidth: 1,
                                            borderColor: inputBorder,
                                            borderRadius: 12,
                                            paddingHorizontal: 12,
                                            paddingVertical: 10,
                                            color: textPrimary,
                                        }}
                                        placeholder="Stream code (e.g. A, East)"
                                        value={newStreamCode}
                                        onChangeText={setNewStreamCode}
                                        placeholderTextColor={textMuted}
                                    />
                                    <TouchableOpacity
                                        onPress={handleCreateStream}
                                        disabled={domainSaving}
                                        style={{ backgroundColor: '#0891B2', borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center' }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '700' }}>Add</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </View>
    );
}
