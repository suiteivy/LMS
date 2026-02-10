import { SubjectDetails } from "@/components/SubjectDetails";
import { SubjectList } from "@/components/SubjectList";
import { Subject } from "@/types/types";
import { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { supabase } from "@/libs/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function Subjects() {
  const { studentId } = useAuth();
  const [currentView, setCurrentView] = useState<"list" | "details">("list");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [Subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, [studentId]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      // Fetch all Subjects
      const { data: SubjectsData, error: SubjectsError } = await supabase
        .from("Subjects")
        .select(`
          *,
          teacher:teachers(user:users(full_name)),
          lessons(count)
        `);

      if (SubjectsError) throw SubjectsError;

      // Fetch enrollments for this student to check "isEnrolled"
      let enrolledSubjectIds: string[] = [];
      if (studentId) {
        const { data: enrollData, error: enrollError } = await supabase
          .from("enrollments")
          .select("class_id") // Wait, enrollments link to classes, not Subjects directly? 
          // The schema has Subjects linking to classes: Subjects.class_id -> classes.id
          // And enrollments link students to classes: enrollments.class_id, enrollments.student_id
          // So if I am enrolled in the class of the Subject, I am enrolled in the Subject.
          .eq("student_id", studentId);

        if (enrollError) {
          console.error("Error fetching enrollments:", enrollError);
        }
        if (enrollData) {
          enrolledSubjectIds = enrollData.map((e: any) => e.class_id);
        }
      }

      const formattedSubjects: Subject[] = SubjectsData.map((c: any) => ({
        id: c.id,
        title: c.name, // 'Subjects' table has 'name', type has 'title'. Adjusting.
        description: c.description,
        shortDescription: c.description ? c.description.substring(0, 50) + "..." : "",
        category: c.category || "General", // field might be missing in DB, using fallback
        level: "beginner", // 'level' not in schema shown, fallback
        instructor: { name: c.teacher?.user?.full_name || "Unknown Instructor" },
        price: 0, // 'price' not in schema
        duration: "TBD", // 'duration' not in schema
        studentsCount: 0, // Need to count enrollments per Subject/class
        rating: 0,
        reviewsCount: 0,
        image: c.image_url || "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400",
        tags: [],
        isEnrolled: enrolledSubjectIds.includes(c.class_id),
        lessons: [], // We can fetch lessons detail when viewing detail
        class_id: c.class_id // Store class_id for enrollment
      }));

      setSubjects(formattedSubjects);
    } catch (error: any) {
      console.error("Error loading Subjects:", error);
      Alert.alert("Error", "Failed to load Subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectPress = (Subject: Subject) => {
    setSelectedSubject(Subject);
    setCurrentView("details");
  };

  const handleEnroll = async () => {
    if (!studentId || !selectedSubject || !(selectedSubject as any).class_id) {
      Alert.alert("Error", "Unable to enroll. Missing student or Subject information.");
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
      <View className="flex-1 justify-center items-center bg-[#F1FFF8]">
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F1FFF8]">
      <ScrollView className="flex-grow px-6 pt-12 pb-6">
        {currentView === "list" ? (
          <SubjectList
            Subjects={Subjects}
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
