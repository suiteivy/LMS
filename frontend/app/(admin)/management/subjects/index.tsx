import { ActionTooltip } from "@/components/common/ActionTooltip";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Subject } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View, ScrollView, Alert, useWindowDimensions } from 'react-native';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { SubjectList } from '@/components/SubjectList';
import { SubjectAPI, SubjectCategoryData } from '@/services/SubjectService';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { SubjectCategoryModal } from '@/components/admin/SubjectCategoryModal';
import Toast from 'react-native-toast-message';

export default function SubjectsIndex() {
    const { width } = useWindowDimensions();
    const isMobile = width < 480;
    const { isDark } = useTheme();
    const { isReadOnlyAdmin } = useAuth();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [categories, setCategories] = useState<SubjectCategoryData[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    // Listen to realtime changes on the subjects table
    useRealtimeQuery('subjects', () => {
        fetchSubjects();
    });

    const surface = isDark ? '#161B22' : '#F6F8FA';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const inputBg = isDark ? '#161B22' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textMuted = isDark ? '#9ca3af' : '#6b7280';

    const filteredSubjects = subjects.filter((s) => {
        const matchesSearch =
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.instructor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description?.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (!selectedCategoryId || selectedCategoryId === 'ALL') {
            return true;
        }

        if (selectedCategoryId === 'UNCATEGORIZED') {
            return !s.category_id && (!s.category || s.category === 'all' || s.category === '');
        }

        return (
            s.category_id === selectedCategoryId ||
            s.categories?.id === selectedCategoryId ||
            s.category === categories.find((c) => c.id === selectedCategoryId)?.name
        );
    });

    useEffect(() => {
        fetchSubjects();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await SubjectAPI.getSubjectCategories();
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching subject categories:', error);
        }
    };

    const fetchSubjects = async () => {
        try {
            const data = await SubjectAPI.getSubjects();
            const safeSubjects = (data || []).map((item: any) => {
                const assignedTeachers = item.subject_teachers
                    ? item.subject_teachers.map((st: any) => ({
                        id: st.teacher_id,
                        name:
                            st.teachers?.users?.full_name ||
                            [st.teachers?.users?.first_name, st.teachers?.users?.last_name].filter(Boolean).join(' ').trim() ||
                            st.teacher_id
                      }))
                    : [];
                const firstTeacherName = assignedTeachers.length > 0 ? assignedTeachers[0].name : 'Unknown Instructor';
                return {
                    ...item,
                    level_ids: Array.isArray(item.level_ids) ? item.level_ids : [],
                    instructor: { name: firstTeacherName },
                    instructors: assignedTeachers,
                    lessons: item.lessons || [],
                    tags: item.tags || [],
                    isEnrolled: item.isEnrolled || false,
                    rating: item.rating || 0,
                    reviewsCount: item.reviewsCount || 0,
                    studentsCount: item.studentsCount || 0,
                    price: item.price || 0,
                    level: 'all',
                    image: item.image || `https://placehold.co/600x400?text=${encodeURIComponent(item.title)}`,
                    description: item.description || '',
                    shortDescription: item.shortDescription || '',
                    category_id: item.category_id || null,
                    categories: item.categories || null,
                    category_name: item.categories?.name || item.category_name || item.category || '',
                    category: item.categories?.name || item.category || '',
                    class_teacher_assignments: item.class_teacher_assignments || [],
                    duration: item.duration || '0 weeks',
                };
            }) as Subject[];
            setSubjects(safeSubjects);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubjectPress = (subject: Subject) => {
        router.push({
            pathname: '/(admin)/management/subjects/details' as any,
            params: { id: subject.id }
        });
    };

    const handleDeleteSubject = (subject: Subject) => {
        if (isReadOnlyAdmin) {
            Toast.show({
                type: 'info',
                text1: 'Read-only Access',
                text2: 'Read-only access — contact the main administrator to make changes.',
            });
            return;
        }
        if (!subject?.id) {
            Alert.alert('Error', 'Subject ID is missing. Please refresh and try again.');
            return;
        }
        setSubjectToDelete(subject);
        setShowDeleteModal(true);
    };

    const confirmDeleteSubject = async () => {
        if (isReadOnlyAdmin) {
            setShowDeleteModal(false);
            setSubjectToDelete(null);
            return;
        }
        if (!subjectToDelete?.id) {
            setShowDeleteModal(false);
            setSubjectToDelete(null);
            return;
        }

        try {
            setDeletingId(subjectToDelete.id);
            const deletedTitle = subjectToDelete.title;
            await SubjectAPI.deleteSubject(subjectToDelete.id);
            setShowDeleteModal(false);
            setSubjectToDelete(null);
            Toast.show({
                type: 'success',
                text1: 'Subject Deleted',
                text2: `Subject "${deletedTitle}" was deleted successfully.`,
            });
            await fetchSubjects();
            await fetchCategories();
        } catch (error: any) {
            console.error('Error deleting subject:', error);
            const message =
                error?.response?.data?.error ||
                error?.message ||
                'Failed to delete subject';
            Alert.alert('Error', message);
        } finally {
            setDeletingId(null);
        }
    };

    const handleCreatePress = () => {
        if (isReadOnlyAdmin) {
            Toast.show({
                type: 'info',
                text1: 'Read-only Access',
                text2: 'Read-only access — contact the main administrator to make changes.',
            });
            return;
        }
        router.push('/(admin)/management/subjects/create' as any);
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-[#FFFFFF] dark:bg-[#161B22]">
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
                <UnifiedHeader
                    title="Management"
                    subtitle="Subjects"
                    role="Admin"
                    onBack={() => router.back()}
                />

                {/* Search Bar & Action Buttons */}
                <View style={{ backgroundColor: surface, borderBottomWidth: 1, borderBottomColor: border, paddingHorizontal: 16, paddingVertical: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: inputBg, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: border }}>
                            <Ionicons name="search" size={20} color={textMuted} />
                            <TextInput
                                style={{ flex: 1, marginLeft: 8, color: textPrimary, fontWeight: '500', fontSize: 13 }}
                                placeholder="Search subjects..."
                                placeholderTextColor={textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={18} color={textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Manage Categories Button */}
                        <ActionTooltip
                            label="Subject Categories"
                            description={isReadOnlyAdmin ? "Inspect curriculum categories (read-only)." : "Manage curriculum categories, badges, and classifications."}
                        >
                            <TouchableOpacity
                                onPress={() => setShowCategoryModal(true)}
                                style={{
                                    height: 40,
                                    paddingHorizontal: isMobile ? 10 : 12,
                                    backgroundColor: isDark ? '#21262D' : '#E5E7EB',
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <Ionicons name="albums-outline" size={18} color={textPrimary} />
                                {!isMobile && (
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary }}>
                                        Categories{categories.length > 0 ? ` (${categories.length})` : ''}
                                    </Text>
                                )}
                                {isMobile && categories.length > 0 && (
                                    <View style={{ backgroundColor: '#FF6B00', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>
                                            {categories.length}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </ActionTooltip>

                        {/* Create Subject Button */}
                        <ActionTooltip
                            label={isReadOnlyAdmin ? "Read-Only Access" : "Create Subject"}
                            description={isReadOnlyAdmin ? "Read-only access — contact the main administrator to make changes." : "Configure curriculum title, syllabus codes, departmental HOD, and class offerings."}
                            learnMoreAnchor="hod-role"
                        >
                            <TouchableOpacity
                                onPress={handleCreatePress}
                                style={{
                                    width: 40,
                                    height: 40,
                                    backgroundColor: isReadOnlyAdmin ? '#9CA3AF' : '#FF6B00',
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: isReadOnlyAdmin ? 0.6 : 1,
                                }}
                            >
                                <Ionicons name="add" size={24} color="white" />
                            </TouchableOpacity>
                        </ActionTooltip>
                    </View>

                    {/* Category Filter Chips Bar (hidden if institution has 0 categories) */}
                    {categories.length > 0 && (
                        <View style={{ marginTop: 12 }}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
                            >
                                {/* All Chip */}
                                <TouchableOpacity
                                    onPress={() => setSelectedCategoryId(null)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 20,
                                        backgroundColor: !selectedCategoryId || selectedCategoryId === 'ALL'
                                            ? '#FF6B00'
                                            : (isDark ? '#21262D' : '#E5E7EB'),
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: '700',
                                            color: !selectedCategoryId || selectedCategoryId === 'ALL' ? '#FFFFFF' : textPrimary,
                                        }}
                                    >
                                        All ({subjects.length})
                                    </Text>
                                </TouchableOpacity>

                                {/* Per-category chips */}
                                {categories.map((cat) => {
                                    const isSelected = selectedCategoryId === cat.id;
                                    const catColor = cat.color || '#3B82F6';
                                    const count = subjects.filter(
                                        (s) => s.category_id === cat.id || s.categories?.id === cat.id || s.category === cat.name
                                    ).length;

                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 20,
                                                backgroundColor: isSelected
                                                    ? catColor
                                                    : (isDark ? '#21262D' : '#E5E7EB'),
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 6,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: 4,
                                                    backgroundColor: isSelected ? '#FFFFFF' : catColor,
                                                }}
                                            />
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: isSelected ? '700' : '600',
                                                    color: isSelected ? '#FFFFFF' : textPrimary,
                                                }}
                                            >
                                                {cat.name} ({count})
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}

                                {/* Uncategorized Chip */}
                                {(() => {
                                    const uncatCount = subjects.filter(
                                        (s) => !s.category_id && (!s.category || s.category === 'all' || s.category === '')
                                    ).length;
                                    if (uncatCount === 0) return null;
                                    const isSelected = selectedCategoryId === 'UNCATEGORIZED';
                                    return (
                                        <TouchableOpacity
                                            onPress={() => setSelectedCategoryId(isSelected ? null : 'UNCATEGORIZED')}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 20,
                                                backgroundColor: isSelected
                                                    ? (isDark ? '#4B5563' : '#374151')
                                                    : (isDark ? '#21262D' : '#E5E7EB'),
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 6,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    fontSize: 12,
                                                    fontWeight: isSelected ? '700' : '600',
                                                    color: isSelected ? '#FFFFFF' : textMuted,
                                                }}
                                            >
                                                Uncategorized ({uncatCount})
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })()}
                            </ScrollView>
                        </View>
                    )}
                </View>

                <SubjectList
                    subjects={filteredSubjects}
                    onPressSubject={handleSubjectPress}
                    onDeleteSubject={isReadOnlyAdmin ? undefined : handleDeleteSubject}
                    deletingId={deletingId}
                />

                <ConfirmationModal
                    visible={showDeleteModal}
                    title="Delete Subject"
                    targetName={subjectToDelete?.title}
                    message={`Are you sure you want to delete "${subjectToDelete?.title || 'this subject'}"? This removes linked enrollments and teacher assignments.`}
                    confirmText="Delete Subject"
                    isDestructive={true}
                    loading={!!deletingId}
                    onConfirm={confirmDeleteSubject}
                    onClose={() => {
                        if (!deletingId) {
                            setShowDeleteModal(false);
                            setSubjectToDelete(null);
                        }
                    }}
                />

                {/* Subject Category Modal */}
                <SubjectCategoryModal
                    visible={showCategoryModal}
                    onClose={() => setShowCategoryModal(false)}
                    isReadOnly={isReadOnlyAdmin}
                    onCategoriesChanged={() => {
                        fetchCategories();
                        fetchSubjects();
                    }}
                />
            </View>
        </ScrollView>
    );
}
