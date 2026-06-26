import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/libs/supabase';
import { Subject } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { SubjectList } from '@/components/SubjectList';

export default function SubjectsIndex() {
    const { isDark } = useTheme();
    const { profile } = useAuth();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

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
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => { fetchSubjects(); }, [profile?.institution_id]);

    const fetchSubjects = async () => {
        try {
            if (!profile?.institution_id) {
                setSubjects([]);
                setLoading(false);
                return;
            }
            const { data, error } = await supabase
                .from('subjects')
                .select(`
                    *,
                    subject_teachers(
                        teacher_id,
                        teachers(
                            id,
                            user_id,
                            users:user_id(
                                first_name,
                                last_name,
                                full_name
                            )
                        )
                    )
                `)
                .eq('institution_id', profile.institution_id)
                .order('title');
            if (error) throw error;
            const safeSubjects = (data || []).map((item: any) => {
                const assignedTeachers = item.subject_teachers
                    ? item.subject_teachers.map((st: any) => ({
                        id: st.teacher_id,
                        name: st.teachers?.users?.full_name || st.teacher_id
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
                    level: item.level || 'beginner',
                    image: item.image || `https://placehold.co/600x400?text=${encodeURIComponent(item.title)}`,
                    description: item.description || '',
                    shortDescription: item.shortDescription || '',
                    category: item.category || 'General',
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
                />
            </View>
        </ScrollView>
    );

}
