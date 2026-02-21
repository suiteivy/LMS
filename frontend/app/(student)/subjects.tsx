import { FullScreenLoader } from "@/components/common/FullScreenLoader";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { SubjectDetails } from "@/components/SubjectDetails";
import { SubjectList } from "@/components/SubjectList";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/libs/supabase";
import { Subject } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from 'expo-linking';
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function Subjects() {
  const { studentId, user } = useAuth();
  const { isDark } = useTheme();
  const [currentView, setCurrentView] = useState<"list" | "details">("list");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [resources, setResources] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [kesRate, setKesRate] = useState<number>(129);

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select(`*, teacher:teachers(user:users(full_name)), lessons(*)`);

      if (subjectsError) throw subjectsError;

      let enrolledSubjectIds: string[] = [];
      if (studentId) {
        const { data: enrollData } = await supabase.from("enrollments").select("subject_id").eq("student_id", studentId);
        if (enrollData) enrolledSubjectIds = enrollData.map((e: any) => e.subject_id);
      }

      const { data: exchangeData } = await (supabase.from('system_settings').select('value').eq('key', 'exchange_rates').single() as any);
      if (exchangeData?.value?.KES) setKesRate(exchangeData.value.KES);

      const formattedSubjects: Subject[] = (subjectsData || []).map((c: any) => ({
        id: c.id,
        title: c.title || c.name || "Untitled Subject",
        description: c.description || "No description available.",
        shortDescription: c.description ? (c.description.substring(0, 100) + "...") : "",
        category: c.category || "General",
        level: (c.level || "all") as any,
        instructor: { name: c.teacher?.user?.full_name || "Unknown Instructor" },
        price: c.fee_amount || 0,
        duration: c.duration || "Self-paced",
        studentsCount: 0,
        rating: Number(c.rating) || 5.0,
        reviewsCount: c.reviews_count || 0,
        image: c.image_url || "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400",
        tags: (c.metadata?.tags as string[]) || [],
        isEnrolled: enrolledSubjectIds.includes(c.id),
        lessons: (c.lessons || []).map((l: any) => ({
          id: l.id,
          title: l.title,
          duration: l.duration || "10m",
          type: l.type || "reading",
          isLocked: l.is_locked || false,
          isCompleted: false
        })),
        subject_id: c.id
      }));

      setSubjects(formattedSubjects);
    } catch (error: any) {
      console.error("Error loading subjects:", error);
      Alert.alert("Error", "Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const fetchResources = async (subjectId: string) => {
    try {
      setResourcesLoading(true);
      const { data, error } = await supabase.from('resources').select('*').eq('subject_id', subjectId);
      if (error) throw error;
      setResources(data || []);
    } catch (e) {
      console.error("Error fetching resources:", e);
    } finally {
      setResourcesLoading(false);
    }
  }

  const handleSubjectPress = (subject: Subject) => {
    setSelectedSubject(subject);
    fetchResources(subject.id);
    setCurrentView("details");
  };

  const handleEnroll = async () => {
    if (!selectedSubject || !selectedSubject.id) return;
    if (!user || !studentId) {
      Alert.alert("Error", "You must be logged in to enroll.");
      return;
    }
    setEnrolling(true);
    try {
      const { error } = await supabase.from('enrollments').insert({
        student_id: studentId,
        subject_id: selectedSubject.id,
        status: 'enrolled',
        enrollment_date: new Date().toISOString()
      } as any);
      if (error) throw error;
      Alert.alert("Success", "You have successfully enrolled in this Subject!");
      setSubjects(prev => prev.map(c => c.id === selectedSubject.id ? { ...c, isEnrolled: true } : c));
      setSelectedSubject(prev => prev ? { ...prev, isEnrolled: true } : null);
    } catch (error: any) {
      Alert.alert("Error", "Failed to enroll. " + (error.message || ""));
    } finally {
      setEnrolling(false);
    }
  };

  const openResource = (url: string) => Linking.openURL(url).catch(err => Alert.alert("Error", "Could not open link"));

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#FF6900" />
        <Text className="mt-4 text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest">Entering Classroom...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <UnifiedHeader
        title="Intelligence"
        subtitle={currentView === "details" ? "Details" : "Subject Portal"}
        role="Student"
        onBack={currentView === "details" ? () => setCurrentView("list") : undefined}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 md:p-8">
          {currentView === "list" ? (
            <View className="px-2">
              <SubjectList
                subjects={subjects}
                title={subjects.length > 0 ? "Academic Programs" : "Catalog Loading..."}
                showFilters={true}
                variant="featured"
                onPressSubject={handleSubjectPress}
                kesRate={kesRate}
              />
            </View>
          ) : selectedSubject ? (
            <View className="-mt-14">
              <SubjectDetails
                Subject={selectedSubject}
                onEnroll={handleEnroll}
                onBack={() => setCurrentView("list")}
                enrolling={enrolling}
                kesRate={kesRate}
              />

              <View className="px-6 -mt-32 pb-40">
                <View className="bg-white dark:bg-[#1a1a1a] p-10 rounded-[48px] border border-gray-50 dark:border-gray-800 shadow-sm">
                  <View className="flex-row items-center justify-between mb-10">
                    <Text className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[4px]">Learning Materials</Text>
                    <View className="bg-orange-50 dark:bg-orange-950/20 p-2 rounded-xl">
                      <Ionicons name="folder-open" size={20} color="#FF6900" />
                    </View>
                  </View>

                  {resourcesLoading ? (
                    <ActivityIndicator color="#FF6900" />
                  ) : resources.length > 0 ? (
                    resources.map((res: any) => (
                      <TouchableOpacity
                        key={res.id}
                        onPress={() => openResource(res.url)}
                        activeOpacity={0.7}
                        className="mb-4 p-6 bg-gray-50 dark:bg-[#121212] rounded-[32px] border border-gray-100 dark:border-gray-800 flex-row justify-between items-center active:bg-gray-100 dark:active:bg-gray-900"
                      >
                        <View className="flex-1 mr-4">
                          <Text className="font-bold text-gray-900 dark:text-white text-base tracking-tight">{res.title}</Text>
                          <Text className="text-[8px] text-[#FF6900] font-bold uppercase tracking-widest mt-1.5">{res.type}</Text>
                        </View>
                        <View className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm">
                          <Ionicons name="arrow-forward" size={16} color={isDark ? "#9CA3AF" : "#374151"} />
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View className="py-12 items-center border border-gray-100 dark:border-gray-800 border-dashed rounded-[32px]">
                      <Text className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest italic text-center">No assets found</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <FullScreenLoader visible={enrolling} message="Securing your spot..." />
    </View >
  );
}
