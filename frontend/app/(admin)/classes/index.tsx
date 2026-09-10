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
import { showError, showSuccess } from '@/utils/toast';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert, Modal, Platform,
    RefreshControl,
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
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
    const [formLevel, setFormLevel] = useState('');
    const [formCategoryId, setFormCategoryId] = useState('');
    const [formLevelId, setFormLevelId] = useState('');
    const [formStreamId, setFormStreamId] = useState('');
    const [formStream, setFormStream] = useState('');
    const [formCapacity, setFormCapacity] = useState('');
    const [formTeacher, setFormTeacher] = useState('');
    const [saving, setSaving] = useState(false);
    const [formClassType, setFormClassType] = useState('Grade');
    const [classTypes, setClassTypes] = useState<string[]>(['Grade']);
    const [formStructure, setFormStructure] = useState<'stream' | 'single'>('stream');

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
    const [newLevelName, setNewLevelName] = useState('');
    const [newLevelAsSingleClass, setNewLevelAsSingleClass] = useState(false);
    const [newLevelCapacity, setNewLevelCapacity] = useState('');
    const [newLevelTeacherId, setNewLevelTeacherId] = useState('');
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
            setDomainLevels((options.levels || []));
            setDomainStreams(options.streams || []);
        } catch (err: any) {
            console.error('loadClassOptions error:', err);
            setGradeOptions([]);
            setDomainCategories([]);
            setDomainLevels([]);
            setDomainStreams([]);
        }
    }, []);

    const selectedLevel = domainLevels.find((l) => l.id === formLevelId) || null;

    const availableLevels = formCategoryId
        ? domainLevels.filter((level) => level.category_id === formCategoryId)
        : domainLevels;

    const availableStreams = formLevelId
        ? domainStreams.filter((stream) => stream.level_id === formLevelId)
        : [];

    const loadTeachers = useCallback(async () => {
        const { data } = await supabase
            .from('teachers')
            .select('id, user_id, users:user_id(full_name)') as any;

        if (data) {
            setTeachers(data.map((t: any) => ({
                id: t.id,
                full_name: t.users?.full_name || t.id,
            })));
        }
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([loadClasses(), loadTeachers(), loadClassOptions()]);
            showSuccess('Refreshed', 'Classes and grade levels up to date');
        } catch (err: any) {
            console.error('handleRefresh error:', err);
            showError('Refresh Failed', err?.message || 'Could not refresh data');
        } finally {
            setRefreshing(false);
        }
    }, [loadClasses, loadTeachers, loadClassOptions]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([loadClasses(), loadTeachers(), loadClassOptions()]);
            setLoading(false);
        };
        init();
    }, [loadClasses, loadTeachers, loadClassOptions]);

    // ─── Grade helper ──────────────────────────────────────
    const gradeToNumber = (grade: string): number | undefined => {
        const match = grade.match(/\d+/);
        return match ? parseInt(match[0]) : undefined;
    };

    const handleCreateLevel = async () => {
        const levelNumber = Number(newLevelNumber);
        if (!Number.isFinite(levelNumber) || levelNumber <= 0) {
            showError('Validation', 'Please enter a valid positive level number (e.g. 1, 2, 3)');
            return;
        }

        const candidateName = newLevelName.trim() || `${safeLevelLabel} ${levelNumber}`;

        // Client-side pre-check against already loaded domain levels
        const existingLevel = domainLevels.find(
            (l) => l.level_number === levelNumber || (l.name && l.name.trim().toLowerCase() === candidateName.toLowerCase())
        );
        if (existingLevel) {
            showError('Duplicate Grade Level', `Grade level ${levelNumber} (${existingLevel.name || candidateName}) already exists.`);
            return;
        }

        setDomainSaving(true);
        try {
            const created = await ClassService.createDomainLevel({
                category_id: newLevelCategoryId || undefined,
                level_number: levelNumber,
                name: candidateName,
                as_single_class: newLevelAsSingleClass,
                capacity: newLevelCapacity ? parseInt(newLevelCapacity, 10) : undefined,
                teacher_id: newLevelTeacherId || undefined,
            });

            // Optimistic update so list renders immediately
            const newDomainLevel: ClassDomainLevel = created?.id ? created : {
                id: `temp-${Date.now()}`,
                category_id: newLevelCategoryId || '',
                level_number: levelNumber,
                name: candidateName,
                has_standalone_class: newLevelAsSingleClass,
            };

            setDomainLevels((prev) => {
                const updated = [...prev.filter((l) => l.level_number !== levelNumber), newDomainLevel];
                return updated.sort((a, b) => a.level_number - b.level_number);
            });

            setGradeOptions((prev) => {
                if (!prev.includes(candidateName)) {
                    return [...prev, candidateName];
                }
                return prev;
            });

            setNewLevelNumber('');
            setNewLevelName('');
            setNewLevelCapacity('');
            setNewLevelTeacherId('');
            setNewLevelAsSingleClass(false);

            // Full refetch from backend to ensure complete synchronization with DB
            await Promise.all([loadClassOptions(), loadClasses()]);

            showSuccess('Grade Level Added', `"${candidateName}" has been added successfully${newLevelAsSingleClass ? ' as a single standalone class' : ''}.`);
        } catch (err: any) {
            console.error('handleCreateLevel error:', err);
            const status = err.response?.status;
            const errCode = err.response?.data?.code;
            const errMsg = err.response?.data?.error || err.message;
            if (status === 409 || errCode === 'DUPLICATE_GRADE_LEVEL' || errMsg?.toLowerCase().includes('already exists')) {
                showError('Duplicate Grade Level', errMsg || `Grade level ${levelNumber} already exists.`);
            } else {
                showError('Error Adding Grade Level', errMsg || 'An error occurred while creating grade level.');
            }
        } finally {
            setDomainSaving(false);
        }
    };

    const handleDeleteLevel = async (level: ClassDomainLevel) => {
        const label = level.name || `${safeLevelLabel} ${level.level_number}`;
        Alert.alert(
            'Remove Grade Level',
            `Are you sure you want to remove "${label}"? This level cannot be removed if classes are assigned to it.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        setDomainSaving(true);
                        try {
                            await ClassService.archiveDomainLevel(level.id);
                            setDomainLevels((prev) => prev.filter((l) => l.id !== level.id));
                            setGradeOptions((prev) => prev.filter((g) => g !== label));
                            await Promise.all([loadClassOptions(), loadClasses()]);
                            showSuccess('Grade Level Removed', `Grade level "${label}" removed`);
                        } catch (err: any) {
                            showError('Unable to Remove Level', err.response?.data?.error || err.message);
                        } finally {
                            setDomainSaving(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCreateStream = async () => {
        if (!newStreamLevelId) {
            showError('Validation', 'Select a level first');
            return;
        }
        if (!newStreamCode.trim()) {
            showError('Validation', 'Stream code is required');
            return;
        }

        const streamCode = newStreamCode.trim();
        setDomainSaving(true);
        try {
            await ClassService.createDomainStream({
                level_id: newStreamLevelId,
                code: streamCode,
                name: streamCode,
            });
            setNewStreamCode('');
            await loadClassOptions();
            showSuccess('Stream Added', `Stream "${streamCode}" added successfully.`);
        } catch (err: any) {
            showError('Error Adding Stream', err.response?.data?.error || err.message);
        } finally {
            setDomainSaving(false);
        }
    };

    const handleSetupSingleClassForLevel = async (level: ClassDomainLevel) => {
        setDomainSaving(true);
        try {
            await ClassService.createClass({
                class_type: formClassType,
                level_id: level.id,
                category_id: level.category_id || undefined,
                grade_level: (safeLevelLabel === 'Grade' || safeLevelLabel === 'KG') ? level.level_number : undefined,
                form_level: (safeLevelLabel === 'Form') ? level.level_number : undefined,
            });
            await Promise.all([loadClassOptions(), loadClasses()]);
            showSuccess('Class Created', `${level.name || `${safeLevelLabel} ${level.level_number}`} is now active as a single class.`);
        } catch (err: any) {
            showError('Failed to Create Class', err.response?.data?.error || err.message);
        } finally {
            setDomainSaving(false);
        }
    };

    // ─── Class CRUD ────────────────────────────────────────
    const openCreateModal = () => {
        setEditingClass(null);
        setFormLevel('');
        setFormStream('');
        setFormStructure('stream');
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
        setFormStream(cls.stream || '');
        setFormStructure(cls.stream || cls.stream_id ? 'stream' : 'single');
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
            const isSingle = formStructure === 'single';
            const levelNum = gradeToNumber(formLevel);
            const payload: any = {
                class_type: formClassType,
                grade_level: (safeLevelLabel === 'Grade' || safeLevelLabel === 'KG') ? levelNum : undefined,
                form_level: (safeLevelLabel === 'Form') ? levelNum : undefined,
                category_id: formCategoryId || undefined,
                level_id: formLevelId || undefined,
                stream_id: isSingle ? null : (formStreamId || undefined),
                stream: isSingle ? null : (formStream ? formStream.trim() : undefined),
                capacity: formCapacity ? parseInt(formCapacity, 10) : undefined,
                teacher_id: formTeacher || undefined,
            };

            if (editingClass) {
                await ClassService.updateClass(editingClass.id, payload);
                showSuccess('Class Updated', 'Class details updated successfully');
            } else {
                await ClassService.createClass(payload);
                showSuccess('Class Created', isSingle ? 'Single grade class created successfully' : 'New class stream created successfully');
            }
            setShowModal(false);
            await loadClasses();
            await loadClassOptions();
        } catch (err: any) {
            showError('Error Saving Class', err.response?.data?.error || err.message);
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
            showSuccess('Class Deleted', 'Class removed successfully');
        } catch (err: any) {
            const backendMsg = err?.response?.data?.error || err?.message || 'Failed to delete class';
            showError('Unable to Remove Class', backendMsg);
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
                subtitle={`${classes.length} Total Classes`}
                role="Admin"
                onBack={() => router.back()}
                showNotification={true}
            />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#FF6B00']}
                        tintColor="#FF6B00"
                    />
                }
            >
                <View style={{ padding: 16 }}>

                    {/* ── Action Bar ── */}
                    <View style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexDirection: 'row' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Active Classes</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                onPress={handleRefresh}
                                disabled={refreshing}
                                style={{
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                                    borderWidth: 1,
                                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB',
                                    paddingHorizontal: 10,
                                    paddingVertical: 8,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                accessibilityLabel="Refresh class data"
                            >
                                <Ionicons name="refresh" size={16} color={textPrimary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => { setAutoAssignLevel(''); setShowAutoAssignModal(true); }}
                                style={{ backgroundColor: '#7C3AED', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Ionicons name="shuffle" size={15} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12, marginLeft: 5 }}>Auto-Assign</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowDomainDrawer(true)}
                                style={{ backgroundColor: '#0284C7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Ionicons name="layers-outline" size={15} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12, marginLeft: 5 }}>
                                    Grade Levels{domainLevels.length > 0 ? ` (${domainLevels.length})` : ''}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={openCreateModal}
                                style={{ backgroundColor: '#FF6B00', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Ionicons name="add" size={18} color="white" />
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13, marginLeft: 4 }}>New Class</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── Prompt to configure grade levels if none exist ── */}
                    {domainLevels.length === 0 && gradeOptions.length === 0 && (
                        <View style={{
                            backgroundColor: isDark ? 'rgba(2, 132, 199, 0.12)' : '#E0F2FE',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(2, 132, 199, 0.3)' : '#BAE6FD',
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                                <Ionicons name="information-circle" size={24} color="#0284C7" style={{ marginRight: 12 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontWeight: '700', color: isDark ? '#38BDF8' : '#0369A1', fontSize: 14 }}>
                                        No Grade Levels Configured
                                    </Text>
                                    <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                                        Add your school&apos;s grade levels (e.g. Grade 1, Grade 2) before creating classes.
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowDomainDrawer(true)}
                                style={{
                                    backgroundColor: '#0284C7',
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 10,
                                }}
                            >
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Configure</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── Level Filter ── */}
                    {gradeOptions.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    onPress={() => setLevelFilter('')}
                                    style={{
                                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                                        backgroundColor: !levelFilter ? '#FF6B00' : pillInactive,
                                        borderColor: !levelFilter ? '#FF6B00' : pillInactiveBorder,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: !levelFilter ? 'white' : pillInactiveText }}>All Levels</Text>
                                </TouchableOpacity>
                                {gradeOptions.map(g => (
                                    <TouchableOpacity
                                        key={g}
                                        onPress={() => setLevelFilter(levelFilter === g ? '' : g)}
                                        style={{
                                            paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                                            backgroundColor: levelFilter === g ? '#FF6B00' : pillInactive,
                                            borderColor: levelFilter === g ? '#FF6B00' : pillInactiveBorder,
                                        }}
                                    >
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: levelFilter === g ? 'white' : pillInactiveText }}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    )}

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
                                                {!cls.stream && !cls.stream_id && (
                                                    <View style={{ backgroundColor: isDark ? 'rgba(255,107,0,0.18)' : '#fff7ed', borderWidth: 1, borderColor: isDark ? 'rgba(255,107,0,0.35)' : '#fed7aa', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 }}>
                                                        <Text style={{ color: '#FF6B00', fontSize: 11, fontWeight: '700' }}>Entire Grade</Text>
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
                            Remove {pendingDeleteClass ? formatClassLabel(pendingDeleteClass) : 'this class'}?
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
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {safeLevelLabel} Level *
                                </Text>
                                {domainLevels.length === 0 && gradeOptions.length === 0 ? (
                                    <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6', padding: 14, borderRadius: 12 }}>
                                        <Text style={{ color: textSecondary, fontSize: 13, marginBottom: 8 }}>
                                            No grade levels configured yet for your school.
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowModal(false);
                                                setShowDomainDrawer(true);
                                            }}
                                            style={{ backgroundColor: '#0284C7', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' }}
                                        >
                                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>+ Add Grade Level</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {domainLevels.length > 0 ? (
                                                domainLevels.map((lvl) => {
                                                    const isSelected = formLevelId === lvl.id || formLevel === `${safeLevelLabel} ${lvl.level_number}`;
                                                    const label = lvl.name || `${safeLevelLabel} ${lvl.level_number}`;
                                                    return (
                                                        <TouchableOpacity
                                                            key={lvl.id}
                                                            onPress={() => {
                                                                if (isSelected) {
                                                                    setFormLevelId('');
                                                                    setFormLevel('');
                                                                    setFormCategoryId('');
                                                                    setFormStreamId('');
                                                                } else {
                                                                    setFormLevelId(lvl.id);
                                                                    setFormLevel(`${safeLevelLabel} ${lvl.level_number}`);
                                                                    if (lvl.category_id) setFormCategoryId(lvl.category_id);
                                                                    setFormStreamId('');
                                                                }
                                                            }}
                                                            style={{
                                                                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                                                                backgroundColor: isSelected ? '#FF6B00' : pillInactive,
                                                                borderColor: isSelected ? '#FF6B00' : pillInactiveBorder,
                                                            }}
                                                        >
                                                            <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? 'white' : pillInactiveText }}>{label}</Text>
                                                        </TouchableOpacity>
                                                    );
                                                })
                                            ) : (
                                                gradeOptions.map(g => (
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
                                                ))
                                            )}
                                        </View>
                                    </ScrollView>
                                )}
                            </View>

                            {/* Class Structure (Entire Grade vs Streams) */}
                            <View style={{ marginBottom: 20 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Class Structure
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity
                                        onPress={() => setFormStructure('stream')}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 12,
                                            paddingHorizontal: 14,
                                            borderRadius: 12,
                                            borderWidth: 1.5,
                                            backgroundColor: formStructure === 'stream' ? (isDark ? 'rgba(14,165,233,0.15)' : '#e0f2fe') : pillInactive,
                                            borderColor: formStructure === 'stream' ? '#0EA5E9' : pillInactiveBorder,
                                        }}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: formStructure === 'stream' ? '#0EA5E9' : textPrimary, marginBottom: 2 }}>
                                            Streams / Sections
                                        </Text>
                                        <Text style={{ fontSize: 11, color: textSecondary }}>
                                            Multi-class grade (e.g. 1A, 1B)
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => {
                                            setFormStructure('single');
                                            setFormStream('');
                                            setFormStreamId('');
                                        }}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 12,
                                            paddingHorizontal: 14,
                                            borderRadius: 12,
                                            borderWidth: 1.5,
                                            backgroundColor: formStructure === 'single' ? (isDark ? 'rgba(255,107,0,0.15)' : '#fff7ed') : pillInactive,
                                            borderColor: formStructure === 'single' ? '#FF6B00' : pillInactiveBorder,
                                        }}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: formStructure === 'single' ? '#FF6B00' : textPrimary, marginBottom: 2 }}>
                                            Entire Grade (1 Class)
                                        </Text>
                                        <Text style={{ fontSize: 11, color: textSecondary }}>
                                            Standalone class (e.g. Grade 1)
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {formStructure === 'single' ? (
                                <View
                                    style={{
                                        marginBottom: 20,
                                        padding: 12,
                                        borderRadius: 12,
                                        backgroundColor: isDark ? 'rgba(255,107,0,0.1)' : '#fff7ed',
                                        borderWidth: 1,
                                        borderColor: isDark ? 'rgba(255,107,0,0.25)' : '#fed7aa',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 10,
                                    }}
                                >
                                    <Ionicons name="information-circle-outline" size={20} color="#FF6B00" />
                                    <Text style={{ fontSize: 13, color: isDark ? '#ffedd5' : '#9a3412', flex: 1 }}>
                                        This class represents the entire grade as a single standalone class. No stream selection is needed.
                                    </Text>
                                </View>
                            ) : (
                                /* Stream / Section Input */
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Stream / Section Name (e.g. A, East, Blue)
                                    </Text>
                                    {availableStreams.length > 0 && (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                {availableStreams.map((s) => {
                                                    const isSelected = formStreamId === s.id || formStream.toLowerCase() === (s.name || s.code).toLowerCase();
                                                    return (
                                                        <TouchableOpacity
                                                            key={s.id}
                                                            onPress={() => {
                                                                if (isSelected) {
                                                                    setFormStreamId('');
                                                                    setFormStream('');
                                                                } else {
                                                                    setFormStreamId(s.id);
                                                                    setFormStream(s.name || s.code);
                                                                }
                                                            }}
                                                            style={{
                                                                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5,
                                                                backgroundColor: isSelected ? '#0EA5E9' : pillInactive,
                                                                borderColor: isSelected ? '#0EA5E9' : pillInactiveBorder,
                                                            }}
                                                        >
                                                            <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? 'white' : pillInactiveText }}>
                                                                {s.name || s.code}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </View>
                                        </ScrollView>
                                    )}
                                    <TextInput
                                        style={{
                                            backgroundColor: inputBg, borderWidth: 1.5, borderColor: inputBorder,
                                            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                                            color: textPrimary, fontSize: 15, fontWeight: '500',
                                        }}
                                        placeholder="Enter stream name (e.g. A, East, Yellow)"
                                        value={formStream}
                                        onChangeText={(text) => {
                                            setFormStream(text);
                                            const matched = availableStreams.find(s => (s.name || s.code).toLowerCase() === text.trim().toLowerCase());
                                            setFormStreamId(matched ? matched.id : '');
                                        }}
                                        placeholderTextColor={textMuted}
                                    />
                                </View>
                            )}

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

            {/* ═══ School Grade Levels Manager Drawer ═══ */}
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
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={{ fontSize: 20, fontWeight: '800', color: textPrimary }}>School Grade Levels</Text>
                                <Text style={{ fontSize: 13, color: textSecondary, marginTop: 2 }}>
                                    Manage the grade levels and streams offered by your school
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <TouchableOpacity
                                    onPress={async () => {
                                        setDomainSaving(true);
                                        try {
                                            await loadClassOptions();
                                            showSuccess('Refreshed', 'Grade levels updated');
                                        } catch (e: any) {
                                            showError('Refresh Failed', e?.message || 'Could not refresh');
                                        } finally {
                                            setDomainSaving(false);
                                        }
                                    }}
                                    disabled={domainSaving}
                                    style={{
                                        padding: 6,
                                        borderRadius: 8,
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
                                    }}
                                    accessibilityLabel="Refresh grade levels"
                                >
                                    <Ionicons name="refresh" size={18} color={textPrimary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setShowDomainDrawer(false)} style={{ padding: 4 }}>
                                    <Ionicons name="close" size={24} color={textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView
                            style={{ padding: 20 }}
                            keyboardShouldPersistTaps="handled"
                            refreshControl={
                                <RefreshControl
                                    refreshing={domainSaving}
                                    onRefresh={async () => {
                                        setDomainSaving(true);
                                        try {
                                            await loadClassOptions();
                                        } finally {
                                            setDomainSaving(false);
                                        }
                                    }}
                                    colors={['#0284C7']}
                                    tintColor="#0284C7"
                                />
                            }
                        >
                            {/* 1. Active Grade Levels List */}
                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Active Grade Levels ({domainLevels.length})
                                </Text>
                                {domainLevels.length === 0 ? (
                                    <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB', padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: border, borderStyle: 'dashed' }}>
                                        <Ionicons name="layers-outline" size={32} color={textMuted} />
                                        <Text style={{ color: textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                                            No grade levels added yet. Use the form below to add your school&apos;s grade levels.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 8 }}>
                                        {domainLevels.slice().sort((a, b) => a.level_number - b.level_number).map((level) => {
                                            const label = level.name || `${safeLevelLabel} ${level.level_number}`;
                                            const levelStreams = domainStreams.filter(s => s.level_id === level.id);
                                            const hasStandalone = level.has_standalone_class || classes.some(c => c.level_id === level.id && !c.stream && !c.stream_id);
                                            return (
                                                <View
                                                    key={level.id}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
                                                        paddingHorizontal: 14,
                                                        paddingVertical: 12,
                                                        borderRadius: 14,
                                                        borderWidth: 1,
                                                        borderColor: border,
                                                    }}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                                                        <View style={{
                                                            width: 34, height: 34, borderRadius: 10,
                                                            backgroundColor: isDark ? '#082F49' : '#E0F2FE',
                                                            alignItems: 'center', justifyContent: 'center',
                                                            marginRight: 12,
                                                        }}>
                                                            <Text style={{ fontWeight: '800', color: '#0284C7', fontSize: 15 }}>
                                                                {level.level_number}
                                                            </Text>
                                                        </View>
                                                        <View style={{ flex: 1 }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                                                <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 14 }}>
                                                                    {label}
                                                                </Text>
                                                                {hasStandalone && (
                                                                    <View style={{ backgroundColor: isDark ? 'rgba(255,107,0,0.18)' : '#fff7ed', borderWidth: 1, borderColor: isDark ? 'rgba(255,107,0,0.35)' : '#fed7aa', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                                                                        <Text style={{ color: '#FF6B00', fontSize: 10, fontWeight: '700' }}>Single Class Active</Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                            {levelStreams.length > 0 ? (
                                                                <Text style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>
                                                                    Streams: {levelStreams.map(s => s.name || s.code).join(', ')}
                                                                </Text>
                                                            ) : !hasStandalone ? (
                                                                <Text style={{ color: textMuted, fontSize: 11, marginTop: 2 }}>
                                                                    No streams or classes yet
                                                                </Text>
                                                            ) : null}
                                                        </View>
                                                    </View>

                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        {!hasStandalone && levelStreams.length === 0 && (
                                                            <TouchableOpacity
                                                                onPress={() => handleSetupSingleClassForLevel(level)}
                                                                disabled={domainSaving}
                                                                style={{
                                                                    backgroundColor: isDark ? 'rgba(255,107,0,0.2)' : '#fff7ed',
                                                                    borderWidth: 1,
                                                                    borderColor: '#FF6B00',
                                                                    paddingHorizontal: 10,
                                                                    paddingVertical: 5,
                                                                    borderRadius: 8,
                                                                    marginRight: 6,
                                                                }}
                                                            >
                                                                <Text style={{ color: '#FF6B00', fontWeight: '700', fontSize: 11 }}>+ Set as 1 Class</Text>
                                                            </TouchableOpacity>
                                                        )}

                                                        <TouchableOpacity
                                                            onPress={() => handleDeleteLevel(level)}
                                                            style={{ padding: 6 }}
                                                            disabled={domainSaving}
                                                        >
                                                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>

                            {/* 2. Add New Grade Level Form */}
                            <View style={{ marginBottom: 24, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F3F4F6', padding: 16, borderRadius: 16 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    + Add New Grade Level
                                </Text>
                                {domainCategories.length > 1 && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {domainCategories.map((category) => (
                                                <TouchableOpacity
                                                    key={category.id}
                                                    onPress={() => setNewLevelCategoryId(newLevelCategoryId === category.id ? '' : category.id)}
                                                    style={{
                                                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                                                        backgroundColor: newLevelCategoryId === category.id ? '#0284C7' : pillInactive,
                                                        borderColor: newLevelCategoryId === category.id ? '#0284C7' : pillInactiveBorder,
                                                    }}
                                                >
                                                    <Text style={{ color: newLevelCategoryId === category.id ? 'white' : pillInactiveText, fontWeight: '700' }}>{category.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                )}
                                <View style={{ gap: 10 }}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TextInput
                                            style={{
                                                width: 100,
                                                backgroundColor: inputBg,
                                                borderWidth: 1.5,
                                                borderColor: inputBorder,
                                                borderRadius: 12,
                                                paddingHorizontal: 14,
                                                paddingVertical: 10,
                                                color: textPrimary,
                                                fontSize: 14,
                                            }}
                                            placeholder="Level #"
                                            value={newLevelNumber}
                                            onChangeText={setNewLevelNumber}
                                            keyboardType="number-pad"
                                            placeholderTextColor={textMuted}
                                        />
                                        <TextInput
                                            style={{
                                                flex: 1,
                                                backgroundColor: inputBg,
                                                borderWidth: 1.5,
                                                borderColor: inputBorder,
                                                borderRadius: 12,
                                                paddingHorizontal: 14,
                                                paddingVertical: 10,
                                                color: textPrimary,
                                                fontSize: 14,
                                            }}
                                            placeholder={`Custom label (e.g. ${safeLevelLabel} 1)`}
                                            value={newLevelName}
                                            onChangeText={setNewLevelName}
                                            placeholderTextColor={textMuted}
                                        />
                                    </View>

                                    {/* Set up as single class toggle */}
                                    <TouchableOpacity
                                        onPress={() => setNewLevelAsSingleClass(!newLevelAsSingleClass)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 6,
                                            gap: 8,
                                        }}
                                    >
                                        <Ionicons
                                            name={newLevelAsSingleClass ? "checkbox" : "square-outline"}
                                            size={20}
                                            color={newLevelAsSingleClass ? "#FF6B00" : textMuted}
                                        />
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>
                                                Set up as single class
                                            </Text>
                                            <Text style={{ fontSize: 11, color: textSecondary }}>
                                                Entire grade will be 1 class immediately (e.g. Grade 1). Stream not required.
                                            </Text>
                                        </View>
                                    </TouchableOpacity>

                                    {newLevelAsSingleClass && (
                                        <View style={{ gap: 8, paddingLeft: 28 }}>
                                            <TextInput
                                                style={{
                                                    backgroundColor: inputBg,
                                                    borderWidth: 1.5,
                                                    borderColor: inputBorder,
                                                    borderRadius: 12,
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 8,
                                                    color: textPrimary,
                                                    fontSize: 13,
                                                }}
                                                placeholder="Max capacity (optional, e.g. 40)"
                                                value={newLevelCapacity}
                                                onChangeText={setNewLevelCapacity}
                                                keyboardType="number-pad"
                                                placeholderTextColor={textMuted}
                                            />
                                            {teachers.length > 0 && (
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                                        {teachers.slice(0, 10).map((t) => (
                                                            <TouchableOpacity
                                                                key={t.id}
                                                                onPress={() => setNewLevelTeacherId(newLevelTeacherId === t.id ? '' : t.id)}
                                                                style={{
                                                                    paddingHorizontal: 10,
                                                                    paddingVertical: 5,
                                                                    borderRadius: 12,
                                                                    borderWidth: 1,
                                                                    backgroundColor: newLevelTeacherId === t.id ? '#FF6B00' : pillInactive,
                                                                    borderColor: newLevelTeacherId === t.id ? '#FF6B00' : pillInactiveBorder,
                                                                }}
                                                            >
                                                                <Text style={{ fontSize: 11, fontWeight: '600', color: newLevelTeacherId === t.id ? 'white' : pillInactiveText }}>
                                                                    {t.full_name}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                </ScrollView>
                                            )}
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        onPress={handleCreateLevel}
                                        disabled={domainSaving || !newLevelNumber.trim()}
                                        style={{
                                            backgroundColor: newLevelNumber.trim() ? '#0284C7' : (isDark ? '#374151' : '#D1D5DB'),
                                            borderRadius: 12,
                                            paddingVertical: 12,
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>
                                            {domainSaving ? 'Adding...' : '+ Add Grade Level'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* 3. Add Stream Section */}
                            {domainLevels.length > 0 && (
                                <View style={{ marginBottom: 24, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F3F4F6', padding: 16, borderRadius: 16 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        + Add Stream to Level (Optional)
                                    </Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            {domainLevels.map((level) => (
                                                <TouchableOpacity
                                                    key={level.id}
                                                    onPress={() => setNewStreamLevelId(newStreamLevelId === level.id ? '' : level.id)}
                                                    style={{
                                                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5,
                                                        backgroundColor: newStreamLevelId === level.id ? '#0284C7' : pillInactive,
                                                        borderColor: newStreamLevelId === level.id ? '#0284C7' : pillInactiveBorder,
                                                    }}
                                                >
                                                    <Text style={{ color: newStreamLevelId === level.id ? 'white' : pillInactiveText, fontWeight: '700', fontSize: 12 }}>
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
                                                borderWidth: 1.5,
                                                borderColor: inputBorder,
                                                borderRadius: 12,
                                                paddingHorizontal: 14,
                                                paddingVertical: 10,
                                                color: textPrimary,
                                                fontSize: 14,
                                            }}
                                            placeholder="Stream code (e.g. A, East, Blue)"
                                            value={newStreamCode}
                                            onChangeText={setNewStreamCode}
                                            placeholderTextColor={textMuted}
                                        />
                                        <TouchableOpacity
                                            onPress={handleCreateStream}
                                            disabled={domainSaving || !newStreamLevelId || !newStreamCode.trim()}
                                            style={{
                                                backgroundColor: (newStreamLevelId && newStreamCode.trim()) ? '#0284C7' : (isDark ? '#374151' : '#D1D5DB'),
                                                borderRadius: 12,
                                                paddingHorizontal: 16,
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Text style={{ color: 'white', fontWeight: '700' }}>Add</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </View>
    );
}
