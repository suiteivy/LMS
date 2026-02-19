import { SubjectDetails } from "@/components/SubjectDetails";
import { SubjectList } from "@/components/SubjectList";
import { Subject } from "@/types/types";
import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, ActivityIndicator, Alert, Text } from "react-native";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { SubjectAPI } from "@/services/SubjectService";
import { FullScreenLoader } from "@/components/common/FullScreenLoader";
import * as Linking from 'expo-linking';

export default function Subjects() {
  const { studentId, user } = useAuth();
  const [currentView, setCurrentView] = useState<"list" | "details">("list");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [resources, setResources] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [kesRate, setKesRate] = useState<number>(129); // Default fallback

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Try to fetch all subjects from Supabase
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select(`
          *,
          teacher:teachers(user:users(full_name)),
          lessons(*)
        `);

      if (subjectsError) throw subjectsError;

      // 2. Fetch enrollments if studentId exists
      let enrolledSubjectIds: string[] = [];
      if (studentId) {
        const { data: enrollData } = await supabase
          .from("enrollments")
          .select("subject_id")
          .eq("student_id", studentId);

        if (enrollData) {
          enrolledSubjectIds = enrollData.map((e: any) => e.subject_id);
        }
      }

      // 3. Fetch Exchange Rate
      const { data: exchangeData } = await (supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'exchange_rates')
        .single() as any);

      if (exchangeData && exchangeData.value && exchangeData.value.KES) {
        setKesRate(exchangeData.value.KES);
      }

      const formattedSubjects: Subject[] = subjectsData ? subjectsData.map((c: any) => {
        return {
          id: c.id,
          title: c.title || c.name || "Untitled Subject",
          description: c.description || "No description available.",
          shortDescription: c.description ? (c.description.substring(0, 100) + "...") : "",
          category: c.category || "General",
          level: (c.level || "all") as any,
          instructor: { name: c.teacher?.user?.full_name || "Unknown Instructor" },
          price: c.fee_amount || 0,
          duration: c.duration || "Self-paced",
          studentsCount: 0, // Still need aggregate or metadata for this
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
            isCompleted: false // This would come from student_lesson_status table if implemented
          })),
          subject_id: c.id
        };
      }) : [];

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
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('subject_id', subjectId);

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
      // Using direct Supabase call for enrollment if API service wrapper isn't robust
      // But preserving existing service call pattern if preferred
      // Here we assume SubjectAPI.enrollStudent handles the backend logic

      // If we don't have a specific API endpoint, we insert directly:
      const { error } = await supabase
        .from('enrollments')
        .insert({
          student_id: studentId,
          subject_id: selectedSubject.id,
          status: 'enrolled',
          enrollment_date: new Date().toISOString()
        } as any); // Cast to any to bypass potential type mismatches if generated types are strict

      if (error) throw error;

      Alert.alert("Success", "You have successfully enrolled in this Subject!");

      setSubjects(prev => prev.map(c =>
        c.id === selectedSubject.id ? { ...c, isEnrolled: true } : c
      ));
      setSelectedSubject(prev => prev ? { ...prev, isEnrolled: true } : null);
    } catch (error: any) {
      console.error("Enrollment error:", error);
      Alert.alert("Error", "Failed to enroll in Subject. " + (error.message || ""));
    } finally {
      setEnrolling(false);
    }
  };

  const openResource = (url: string) => {
    Linking.openURL(url).catch(err => Alert.alert("Error", "Could not open link: " + err.message));
  };


  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#fff]">
        <ActivityIndicator size="large" color="#fb6900" />
        <Text className="mt-4 text-gray-500 font-medium">Loading subjects...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-orange-50">
      <ScrollView className="flex-grow px-6 pt-12 pb-6">
        {currentView === "list" ? (
          <SubjectList
            subjects={subjects}
            title={subjects.length > 0 ? `${subjects.length} Subjects Available` : "No Subjects Available"}
            showFilters={true} // Re-enable filters if needed
            variant="featured"
            onPressSubject={handleSubjectPress}
            kesRate={kesRate}
          />
        ) : selectedSubject ? (
          <View>
            <SubjectDetails
              Subject={selectedSubject}
              onEnroll={handleEnroll}
              onBack={() => setCurrentView("list")}
              enrolling={enrolling}
              kesRate={kesRate}
            />

            {/* RESOURCES SECTION */}
            <View className="mt-6 bg-white p-4 rounded-3xl mb-10">
              <Text className="text-xl font-bold mb-4 text-gray-900">Resources</Text>
              {resourcesLoading ? (
                <ActivityIndicator color="#fb6900" />
              ) : resources.length > 0 ? (
                resources.map((res: any) => (
                  <View key={res.id} className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex-row justify-between items-center">
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-800">{res.title}</Text>
                      <Text className="text-xs text-gray-500 capitalize">{res.type}</Text>
                    </View>
                    <Text
                      onPress={() => openResource(res.url)}
                      className="text-orange-500 font-bold ml-2"
                    >
                      Open
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-gray-400 italic">No resources available for this subject.</Text>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <FullScreenLoader visible={enrolling} message="Enrolling in Subject..." />
    </View >
  );
}
