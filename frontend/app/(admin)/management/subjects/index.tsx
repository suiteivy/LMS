import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/libs/supabase';
import { SubjectList } from '@/components/SubjectList';
import { Subject } from '@/types/types';
import { Ionicons } from '@expo/vector-icons';

export default function SubjectsIndex() {
    const router = useRouter();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSubjects();
    }, []);

    const fetchSubjects = async () => {
        try {
            const { data, error } = await supabase
                .from('subjects')
                .select('*')
                .order('name');

            if (error) throw error;
            setSubjects((data as unknown as Subject[]) || []);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubjectPress = (subject: Subject) => {
        // Navigate to edit or view details if needed
        // For now, we might just want to edit
        console.log('Pressed subject:', subject.title);
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <View className="p-4 border-b border-gray-200 bg-white flex-row justify-between items-center">
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">Subjects</Text>
                <TouchableOpacity
                    onPress={() => router.push('/(admin)/management/subjects/create' as any)}
                    className="bg-orange-500 p-2 rounded-full"
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>
            <SubjectList
                subjects={subjects}
                onPressSubject={handleSubjectPress}
                showFilters={true}
            />
        </View>
    );
}
