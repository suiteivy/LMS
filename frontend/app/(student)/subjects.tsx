import { SubjectDetails } from "@/components/SubjectDetails";
import { SubjectList } from "@/components/SubjectList";
import { Subject } from "@/types/types";
import { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, Alert, Text } from "react-native";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { SubjectAPI } from "@/services/SubjectService";

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
          .select("subject_id")
          .eq("student_id", studentId);

        if (enrollError) {
          console.error("Error fetching enrollments:", enrollError);
        }
        if (enrollData) {
          enrolledSubjectIds = enrollData.map((e: any) => e.subject_id);
        }
      }

      const formattedSubjects: Subject[] = subjectsData.map((c: any) => {
        const metadata = c.metadata || {};
        return {
          id: c.id,
          title: c.title || c.name,
          description: c.description,
          shortDescription: metadata.shortDescription || (c.description ? c.description.substring(0, 50) + "..." : ""),
          category: metadata.category || c.category || "General",
          level: metadata.level || "beginner",
          instructor: { name: c.teacher?.user?.full_name || "Unknown Instructor" },
          price: c.fee_amount || 0,
          duration: metadata.duration || "TBD",
          studentsCount: metadata.maxStudents ? parseInt(metadata.maxStudents) : 0, // Or fetch real count?
          rating: 0,
          reviewsCount: 0,
          image: metadata.image || c.image_url || "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400",
          tags: metadata.tags || [],
          isEnrolled: enrolledSubjectIds.includes(c.id),
          lessons: [],
          subject_id: c.id
        };
      });

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
    if (!studentId || !selectedSubject || !selectedSubject.id) {
      Alert.alert("Error", "Unable to enroll. Missing student or subject information.");
      return;
    }

    setEnrolling(true);
    try {
      await SubjectAPI.enrollStudent(selectedSubject.id);

      Alert.alert("Success", "You have successfully enrolled in this Subject!");

      // Update local state
      setSubjects(prev => prev.map(c =>
        c.id === selectedSubject.id ? { ...c, isEnrolled: true } : c
      ));
      setSelectedSubject(prev => prev ? { ...prev, isEnrolled: true } : null);

    } catch (error: any) {
      console.error("Enrollment error:", error);
      const message = error.response?.data?.error || "Failed to enroll in Subject.";
      Alert.alert("Error", message);
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
            title={`${subjects.length} Subjects Available`}
            showFilters={true}
            variant="featured"
            onPressSubject={(subject) => {
              handleSubjectPress(subject);
            }}
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

