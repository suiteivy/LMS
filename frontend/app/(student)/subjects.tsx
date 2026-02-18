import { SubjectDetails } from "@/components/SubjectDetails";
import { SubjectList } from "@/components/SubjectList";
import { Subject } from "@/types/types";
import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, ActivityIndicator, Alert, Text } from "react-native";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { SubjectAPI } from "@/services/SubjectService";
// Import your demo data
import demoData from "@/constants/demoData";

export default function Subjects() {
  const { studentId } = useAuth();
  const [currentView, setCurrentView] = useState<"list" | "details">("list");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  const fetchSubjects = useCallback(async () => {
    try {
      setLoading(true);
      
      // 1. Try to fetch all subjects from Supabase
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select(`
          *,
          teacher:teachers(user:users(full_name)),
          lessons(count)
        `);

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

      // 3. Logic: Fallback to Demo Data if database is empty or fetch fails
      if (!subjectsData || subjectsData.length === 0) {
        console.log("Using demo subjects fallback");
        setSubjects(demoData.MOCK_SUBJECTS || []); // Ensure you have MOCK_SUBJECTS in your demoData file
      } else {
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
            studentsCount: metadata.maxStudents ? parseInt(metadata.maxStudents) : 0,
            rating: 4.5, // Default for demo
            reviewsCount: 12, // Default for demo
            image: metadata.image || c.image_url || "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400",
            tags: metadata.tags || [],
            isEnrolled: enrolledSubjectIds.includes(c.id),
            lessons: [],
            subject_id: c.id
          };
        });
        setSubjects(formattedSubjects);
      }
    } catch (error: any) {
      console.error("Error loading subjects, using demo fallback:", error);
      setSubjects(demoData.MOCK_SUBJECTS || []);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleSubjectPress = (subject: Subject) => {
    setSelectedSubject(subject);
    setCurrentView("details");
  };

  const handleEnroll = async () => {
    if (!selectedSubject || !selectedSubject.id) return;

    setEnrolling(true);

    // INTERACTIVE DEMO LOGIC: If no studentId, simulate success locally
    if (!studentId) {
      setTimeout(() => {
        const updatedSubject = { ...selectedSubject, isEnrolled: true };
        
        // Update the list and the details view so the button changes to "Enrolled"
        setSubjects(prev => prev.map(c => 
          c.id === selectedSubject.id ? updatedSubject : c
        ));
        setSelectedSubject(updatedSubject);
        
        Alert.alert("Demo Mode", "You have successfully enrolled in " + selectedSubject.title);
        setEnrolling(false);
      }, 1000);
      return;
    }

    // REAL BACKEND LOGIC
    try {
      await SubjectAPI.enrollStudent(selectedSubject.id);
      Alert.alert("Success", "You have successfully enrolled in this Subject!");
      
      setSubjects(prev => prev.map(c =>
        c.id === selectedSubject.id ? { ...c, isEnrolled: true } : c
      ));
      setSelectedSubject(prev => prev ? { ...prev, isEnrolled: true } : null);
    } catch (error: any) {
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
            title={subjects.length > 0 ? `${subjects.length} Subjects Available` : "Available Subjects"}
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