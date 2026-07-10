import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { Subject } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View, ScrollView, Modal, Alert } from 'react-native';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { SubjectList } from '@/components/SubjectList';
import { SubjectAPI } from '@/services/SubjectService';

export default function SubjectsIndex() {
    const { isDark } = useTheme();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

    // Listen to realtime changes on the subjects table
    useRealtimeQuery('subjects', () => {
        fetchSubjects();
    });

    const surface = isDark ? '#161B22' : '#F6F8FA';
    const border = isDark ? '#21262D' : '#D0D7DE';
    const inputBg = isDark ? '#161B22' : '#FFFFFF';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textMuted = isDark ? '#9ca3af' : '#6b7280';

    const filteredSubjects = subjects.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.instructor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => { fetchSubjects(); }, []);

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
                    category: '',
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
        // Navigate to the details page in the management/subjects folder, passing the subject id as a param
        router.push({
            pathname: '/(admin)/management/subjects/details' as any,
            params: { id: subject.id }
        });
    };

    const handleDeleteSubject = (subject: Subject) => {
        if (!subject?.id) {
            Alert.alert('Error', 'Subject ID is missing. Please refresh and try again.');
            return;
        }
        setSubjectToDelete(subject);
        setShowDeleteModal(true);
    };

    const confirmDeleteSubject = async () => {
        if (!subjectToDelete?.id) {
            setShowDeleteModal(false);
            setSubjectToDelete(null);
            return;
        }

        try {
            setDeletingId(subjectToDelete.id);
            await SubjectAPI.deleteSubject(subjectToDelete.id);
            setShowDeleteModal(false);
            setSubjectToDelete(null);
            await fetchSubjects();
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

                {/* Search Bar */}
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
                        <TouchableOpacity
                            onPress={() => router.push('/(admin)/management/subjects/create' as any)}
                            style={{ width: 40, height: 40, backgroundColor: '#FF6B00', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Ionicons name="add" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>

                <SubjectList
                    subjects={filteredSubjects}
                    onPressSubject={handleSubjectPress}
                    onDeleteSubject={handleDeleteSubject}
                    deletingId={deletingId}
                />

                <Modal
                    visible={showDeleteModal}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        if (!deletingId) {
                            setShowDeleteModal(false);
                            setSubjectToDelete(null);
                        }
                    }}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                        <View style={{ width: '100%', maxWidth: 480, backgroundColor: isDark ? '#161B22' : '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: border, padding: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: textPrimary, marginBottom: 8 }}>
                                Delete Subject
                            </Text>
                            <Text style={{ color: textMuted, fontSize: 14, lineHeight: 20, marginBottom: 18 }}>
                                {`Are you sure you want to delete "${subjectToDelete?.title || 'this subject'}"? This removes linked enrollments and teacher assignments.`}
                            </Text>

                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                                <TouchableOpacity
                                    onPress={() => {
                                        if (!deletingId) {
                                            setShowDeleteModal(false);
                                            setSubjectToDelete(null);
                                        }
                                    }}
                                    disabled={!!deletingId}
                                    style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: inputBg }}
                                >
                                    <Text style={{ color: textPrimary, fontWeight: '600' }}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={confirmDeleteSubject}
                                    disabled={!!deletingId}
                                    style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: deletingId ? '#9ca3af' : '#ef4444' }}
                                >
                                    <Text style={{ color: 'white', fontWeight: '700' }}>
                                        {deletingId ? 'Deleting...' : 'Delete'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </ScrollView>
    );

}
