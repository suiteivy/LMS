import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { router } from "expo-router";
import { Megaphone } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface Announcement {
    id: string;
    title: string;
    message: string;
    Subject_title: string;
    created_at: string;
}

const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setExpanded(!expanded)}
            className="bg-white dark:bg-[#161B22] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-4 shadow-sm"
        >
            <View className="flex-row items-start mb-4">
                <View className="bg-orange-100 dark:bg-orange-950/20 p-2.5 rounded-2xl mr-4">
                    <Megaphone size={20} color="#FF6900" />
                </View>
                <View className="flex-1">
                    <Text className="text-gray-900 dark:text-white font-bold text-lg leading-tight">{announcement.title}</Text>
                    <Text className="text-[#FF6900] text-xs font-bold mt-1 uppercase tracking-wider">{announcement.Subject_title}</Text>
                </View>
            </View>

            <Text className="text-gray-600 dark:text-gray-400 text-sm mb-4 leading-5" numberOfLines={expanded ? undefined : 3}>
                {announcement.message}
            </Text>

            <View className="flex-row justify-between items-center pt-4 border-t border-gray-50 dark:border-gray-800">
                <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                    Posted {new Date(announcement.created_at).toLocaleDateString()}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

export default function AnnouncementsPage() {
    const { teacherId, profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    const fetchSubjects = async (): Promise<{ id: string; title: string }[]> => {
        if (!teacherId) return [];
        const { data } = await supabase.from('subjects').select('id, title').eq('teacher_id', teacherId);
        return data || [];
    };

    const fetchAnnouncements = async (subjectsList: { id: string; title: string }[]) => {
        try {
            const subjectIds = subjectsList.map(s => s.id);
            let query = (supabase.from('announcements') as any)
                .select(`*, Subject:subjects(title)`)
                .eq('institution_id', profile?.institution_id)
                .order('created_at', { ascending: false });

            if (subjectIds.length > 0) {
                query = query.or(`subject_id.is.null,subject_id.in.(${subjectIds.map(id => `"${id}"`).join(',')})`);
            } else {
                query = query.is('subject_id', null);
            }

            const { data, error } = await query;
            if (error) throw error;

            const formatted = (data || []).map((a: any) => ({
                id: a.id,
                title: a.title,
                message: a.message,
                Subject_title: a.Subject?.title || "General Announcement",
                created_at: a.created_at
            }));

            setAnnouncements(formatted);
        } catch (error) {
            console.error("Error fetching announcements:", error);
        }
    };

    const loadData = async (showSilent = false) => {
        if (!showSilent) setLoading(true);
        const subjectsList = await fetchSubjects();
        await fetchAnnouncements(subjectsList);
        setLoading(false);
    };

    useEffect(() => {
        if (teacherId) {
            loadData();
        }
    }, [teacherId]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData(true);
        setRefreshing(false);
    };

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Management"
                subtitle="School Notices"
                role="Teacher"
                onBack={() => router.push("/(teacher)/management")}
            />
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
                }
            >
                <View className="p-4 md:p-8">
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-6 px-2">
                        <View>
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                                {announcements.length} school notices
                            </Text>
                        </View>
                    </View>

                    {/* Announcements List */}
                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
                    ) : announcements.length === 0 ? (
                        <View className="bg-white dark:bg-[#161B22] p-12 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed">
                            <Megaphone size={48} color="#E5E7EB" style={{ opacity: 0.3 }} />
                            <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">No announcements posted yet.</Text>
                        </View>
                    ) : (
                        announcements.map((announcement) => (
                            <AnnouncementCard key={announcement.id} announcement={announcement} />
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
