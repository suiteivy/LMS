import { SubjectDetails } from "@/components/SubjectDetails";
import { SubjectList } from "@/components/SubjectList";
import { Subject } from "@/types/types";
import { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, Alert, Text } from "react-native";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function Subjects() {
  const { studentId } = useAuth();
  const [currentView, setCurrentView] = useState<"list" | "details">("list");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, [studentId]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      // Fetch all subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select(`
          *,
          teacher:teachers(user:users(full_name)),
          lessons(count)
        `);

      if (subjectsError) throw subjectsError;

      // Fetch enrollments for this student to check "isEnrolled"
      let enrolledSubjectIds: string[] = [];
      if (studentId) {
        const { data: enrollData, error: enrollError } = await supabase
          .from("enrollments")
          .select("class_id")
          .eq("student_id", studentId);

        if (enrollError) {
          console.error("Error fetching enrollments:", enrollError);
        }
        if (enrollData) {
          enrolledSubjectIds = enrollData.map((e: any) => e.class_id);
        }
      }

      const formattedSubjects: Subject[] = subjectsData.map((c: any) => ({
        id: c.id,
        title: c.title || c.name,
        description: c.description,
        shortDescription: c.description ? c.description.substring(0, 50) + "..." : "",
        category: c.category || "General",
        level: "beginner",
        instructor: { name: c.teacher?.user?.full_name || "Unknown Instructor" },
        price: c.fee_amount || 0,
        duration: "TBD",
        studentsCount: 0,
        rating: 0,
        reviewsCount: 0,
        image: c.image_url || "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400",
        tags: [],
        isEnrolled: enrolledSubjectIds.includes(c.class_id),
        lessons: [],
        class_id: c.class_id
      }));

      setSubjects(formattedSubjects);
    } catch (error: any) {
      console.error("Error loading subjects:", error);
      Alert.alert("Error", "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectPress = (subject: Subject) => {
    setSelectedSubject(subject);
    setCurrentView("details");
  };

  const handleEnroll = async () => {
    if (!studentId || !selectedSubject || !(selectedSubject as any).class_id) {
      Alert.alert("Error", "Unable to enroll. Missing student or subject information.");
      return;
    }

    setEnrolling(true);
    try {
      const { error } = await supabase.from("enrollments").insert({
        student_id: studentId,
        class_id: (selectedSubject as any).class_id
      });

      if (error) throw error;

      Alert.alert("Success", "You have successfully enrolled in this Subject!");

      // Update local state
      setSubjects(prev => prev.map(c =>
        c.id === selectedSubject.id ? { ...c, isEnrolled: true } : c
      ));
      setSelectedSubject(prev => prev ? { ...prev, isEnrolled: true } : null);

    } catch (error: any) {
      console.error("Enrollment error:", error);
      Alert.alert("Error", "Failed to enroll in Subject.");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#fff]">
        <ActivityIndicator size="large" color="#fb6900" />
        <Text>Loading subjects</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-orange-50">
      <ScrollView className="flex-grow px-6 pt-12 pb-6">
        {currentView === "list" ? (
          <SubjectList
            subjects={subjects}
            title="Available Subjects"
            showFilters={true}
            variant="featured"
            onPressSubject={handleSubjectPress}
          />
        ) : selectedSubject ? (
          <SubjectDetails
            Subject={selectedSubject}
            onEnroll={handleEnroll}
            onBack={() => setCurrentView("list")}
            enrolling={enrolling}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

