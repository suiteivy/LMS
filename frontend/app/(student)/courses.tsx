import { CourseDetails } from "@/components/CourseDetails";
import { CourseList } from "@/components/CourseList";

import { Course } from "@/types/types";
import { useState } from "react";
import { View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

export default function Courses() {
  const [currentView, setCurrentView] = useState<"list" | "details">("list");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const mockCourses: Course[] = [
    {
      id: "1",
      title: "Introduction to Mathematics",
      description:
        "Learn the fundamentals of mathematics with interactive lessons and practical examples.",
      shortDescription: "Master basic math concepts",
      category: "Mathematics",
      level: "beginner",
      instructor: { name: "Dr. Sarah Johnson" },
      price: 0,
      duration: "6 weeks",
      studentsCount: 1250,
      rating: 4.8,
      reviewsCount: 234,
      image:
        "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400",
      tags: ["Basic arithmetic", "Problem solving", "Number theory"],
      isEnrolled: false,
      lessons: [
        {
          id: "1",
          title: "Numbers and Operations",
          duration: "15 min",
          isCompleted: false,
          isLocked: false,
          type: "video",
        },
        {
          id: "2",
          title: "Basic Addition",
          duration: "20 min",
          isCompleted: false,
          isLocked: false,
          type: "video",
        },
        {
          id: "3",
          title: "Practice Quiz",
          duration: "10 min",
          isCompleted: false,
          isLocked: true,
          type: "quiz",
        },
      ],
    },
    {
      id: "2",
      title: "Creative Writing Workshop",
      description:
        "Develop your writing skills through guided exercises and peer feedback.",
      shortDescription: "Express yourself through writing",
      category: "Creative Arts",
      level: "intermediate",
      instructor: { name: "Prof. Michael Chen" },
      price: 49,
      originalPrice: 99,
      duration: "8 weeks",
      studentsCount: 890,
      rating: 4.9,
      reviewsCount: 156,
      image:
        "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400",
      tags: ["Story structure", "Character development", "Creative expression"],
      isEnrolled: true,
      progress: 65,
      lessons: [
        {
          id: "1",
          title: "Finding Your Voice",
          duration: "25 min",
          isCompleted: true,
          isLocked: false,
          type: "video",
        },
        {
          id: "2",
          title: "Character Building",
          duration: "30 min",
          isCompleted: true,
          isLocked: false,
          type: "reading",
        },
        {
          id: "3",
          title: "Plot Development",
          duration: "35 min",
          isCompleted: false,
          isLocked: false,
          type: "video",
        },
      ],
    },
    {
      id: "3",
      title: "Basics of Computer Science",
      description:
        "Explore the foundation of computing — from binary to algorithms to real-world apps.",
      shortDescription: "Start your tech journey",
      category: "Science & Technology",
      level: "beginner",
      instructor: { name: "Ms. Aisha Kilonzo" },
      price: 0,
      duration: "5 weeks",
      studentsCount: 1020,
      rating: 4.7,
      reviewsCount: 201,
      image:
        "https://source.unsplash.com/a-computer-screen-with-a-bunch-of-code-on-it-ieic5Tq8YMk?w=400",
      tags: ["Algorithms", "Binary", "Programming basics"],
      isEnrolled: false,
      lessons: [
        {
          id: "1",
          title: "What is a Computer?",
          duration: "10 min",
          isCompleted: false,
          isLocked: false,
          type: "video",
        },
        {
          id: "2",
          title: "Binary & Data",
          duration: "15 min",
          isCompleted: false,
          isLocked: false,
          type: "video",
        },
        {
          id: "3",
          title: "Simple Algorithms",
          duration: "20 min",
          isCompleted: false,
          isLocked: true,
          type: "quiz",
        },
      ],
    },
    {
      id: "5",
      title: "Introduction to Digital Literacy",
      description:
        "Become confident navigating the digital world — from using browsers to online safety.",
      shortDescription: "Boost your tech confidence",
      category: "Literacy",
      level: "beginner",
      instructor: { name: "Mrs. Grace Otieno" },
      price: 0,
      duration: "3 weeks",
      studentsCount: 1580,
      rating: 4.5,
      reviewsCount: 178,
      image: "https://source.unsplash.com/400x300/?reading,books,literacy",
      tags: ["Internet basics", "Email", "Online safety"],
      isEnrolled: false,
      lessons: [
        {
          id: "1",
          title: "What is Digital Literacy?",
          duration: "15 min",
          isCompleted: false,
          isLocked: false,
          type: "video",
        },
        {
          id: "2",
          title: "Internet Navigation",
          duration: "20 min",
          isCompleted: false,
          isLocked: false,
          type: "reading",
        },
        {
          id: "3",
          title: "Staying Safe Online",
          duration: "15 min",
          isCompleted: false,
          isLocked: true,
          type: "quiz",
        },
      ],
    },
    {
      id: "6",
      title: "Everyday Science Explained",
      description:
        "Understand the science behind everyday phenomena — from boiling water to gravity.",
      shortDescription: "Science in your daily life",
      category: "Science & Technology",
      level: "beginner",
      instructor: { name: "Dr. Alice Kamau" },
      price: 0,
      duration: "5 weeks",
      studentsCount: 650,
      rating: 4.4,
      reviewsCount: 109,
      image:
        "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?w=400",
      tags: ["Physics basics", "Everyday phenomena", "Chemistry"],
      isEnrolled: false,
      lessons: [
        {
          id: "1",
          title: "Why Water Boils",
          duration: "10 min",
          isCompleted: false,
          isLocked: false,
          type: "video",
        },
        {
          id: "2",
          title: "Gravity at Work",
          duration: "15 min",
          isCompleted: false,
          isLocked: false,
          type: "video",
        },
        {
          id: "3",
          title: "Quiz: Forces Around Us",
          duration: "12 min",
          isCompleted: false,
          isLocked: true,
          type: "quiz",
        },
      ],
    },
    {
      id: "8",
      title: "Reading Comprehension Skills",
      description:
        "Sharpen your ability to understand, interpret, and respond to texts.",
      shortDescription: "Read. Understand. Respond.",
      category: "Literacy",
      level: "intermediate",
      instructor: { name: "Ms. Pauline Njeri" },
      price: 0,
      duration: "4 weeks",
      studentsCount: 730,
      rating: 4.6,
      reviewsCount: 130,
      image:
        "https://images.unsplash.com/photo-1519377345644-937ef9754740?w=400",
      tags: ["Reading strategies", "Critical thinking", "Inference"],
      isEnrolled: false,
      lessons: [
        {
          id: "1",
          title: "Understanding Main Ideas",
          duration: "15 min",
          isCompleted: false,
          isLocked: false,
          type: "video",
        },
        {
          id: "2",
          title: "Context Clues & Vocabulary",
          duration: "20 min",
          isCompleted: false,
          isLocked: false,
          type: "reading",
        },
        {
          id: "3",
          title: "Analyzing Arguments",
          duration: "18 min",
          isCompleted: false,
          isLocked: true,
          type: "quiz",
        },
      ],
    },
  ];

  const handleCoursePress = (course: Course) => {
    setSelectedCourse(course);
    setCurrentView("details");
  };

  const handleEnroll = () => {
    console.log("Enrolling in course:", selectedCourse?.title);
  };

  return (
    <View className="flex-1 bg-[#F1FFF8]">
      <ScrollView className="flex-grow px-6 pt-12 pb-6">
        {currentView === "list" ? (
          <CourseList
            courses={mockCourses}
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
          />
        ) : null}
      </ScrollView>
    </View>
  );
}
