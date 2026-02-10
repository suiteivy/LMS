import { CourseDetails } from "@/components/CourseDetails";
import { CourseList } from "@/components/CourseList";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { Course } from "@/types/types";
import { useEffect, useState } from "react";
import { View, ScrollView, Alert } from "react-native";

export default function Courses() {

  const {studentId} = useAuth() 
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [currentView, setCurrentView] = useState<"list" | "details">("list");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, [studentId]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      // Fetch all courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select(`
          *,
          teacher:teachers(user:users(full_name)),
          lessons(count)
        `);

      if (coursesError) throw coursesError;

      // Fetch enrollments for this student to check "isEnrolled"
      let enrolledCourseIds: string[] = [];
      if (studentId) {
        const { data: enrollData, error: enrollError } = await supabase
          .from("enrollments")
          .select("class_id") 
          // Wait, enrollments link to classes, not courses directly? 
          // The schema has courses linking to classes: courses.class_id -> classes.id
          // And enrollments link students to classes: enrollments.class_id, enrollments.student_id
          // So if I am enrolled in the class of the course, I am enrolled in the course.
          .eq("student_id", studentId);

        if (enrollError) {
          console.error("Error fetching enrollments:", enrollError);
        }
        if (enrollData) {
          enrolledCourseIds = enrollData.map((e: any) => e.class_id);
        }
      }

      const formattedCourses: Course[] = coursesData.map((c: any) => ({
        id: c.id,
        title: c.name, // 'courses' table has 'name', type has 'title'. Adjusting.
        description: c.description,
        shortDescription: c.description ? c.description.substring(0, 50) + "..." : "",
        category: c.category || "General", // field might be missing in DB, using fallback
        level: "beginner", // 'level' not in schema shown, fallback
        instructor: { name: c.teacher?.user?.full_name || "Unknown Instructor" },
        price: 0, // 'price' not in schema
        duration: "TBD", // 'duration' not in schema
        studentsCount: 0, // Need to count enrollments per course/class
        rating: 0,
        reviewsCount: 0,
        image: c.image_url || "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400",
        tags: [],
        isEnrolled: enrolledCourseIds.includes(c.class_id),
        lessons: [], // We can fetch lessons detail when viewing detail
        class_id: c.class_id // Store class_id for enrollment
      }));

      setCourses(formattedCourses);
    } catch (error: any) {
      console.error("Error loading courses:", error);
      Alert.alert("Error", "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const handleCoursePress = (course: Course) => {
    setSelectedCourse(course);
    setCurrentView("details");
  };

  const handleEnroll = async () => {
    if (!studentId || !selectedCourse || !(selectedCourse as any).class_id) {
      Alert.alert("Error", "Unable to enroll. Missing student or course information.");
      return;
    }

    setEnrolling(true);
    try {
      const { error } = await supabase.from("enrollments").insert({
        student_id: studentId,
        class_id: (selectedCourse as any).class_id
      });

      if (error) throw error;

      Alert.alert("Success", "You have successfully enrolled in this course!");

      // Update local state
      setCourses(prev => prev.map(c =>
        c.id === selectedCourse.id ? { ...c, isEnrolled: true } : c
      ));
      setSelectedCourse(prev => prev ? { ...prev, isEnrolled: true } : null);

    } catch (error: any) {
      console.error("Enrollment error:", error);
      Alert.alert("Error", "Failed to enroll in course.");
    } finally {
      setEnrolling(false);
    }
  };

  useEffect (() => {
    const fetchCourseData = async () => {
      try {
        const {data, error} = await supabase
        .from('courses')
        .select('*')

        console.log('Raw data from Supabase:', data)
        console.log('Any error?', error)
        
        if(error) throw error

      } catch (error: any) {
        console.error('Error fetching course data:', error.message)
        return;
      }
    }
    fetchCourseData()
    
  }, [])

  console.log('Available courses now:', availableCourses)

  return (
    <View className="flex-1 bg-[#F1FFF8]">
      <ScrollView className="flex-grow px-6 pt-12 pb-6">
        {currentView === "list" ? (
          <CourseList
            courses={availableCourses}
            title="Available Courses"
            showFilters={true}
            variant="featured"
            onPressCourse={handleCoursePress}
          />
        ) : selectedCourse ? (
          <CourseDetails
            course={selectedCourse}
            onEnroll={handleEnroll}
            onBack={() => setCurrentView("list")}
            enrolling={enrolling}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}
