import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/libs/supabase"
import { Activity, Calendar, CheckCircle2, ChevronRight, Clock, Download, X } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { TouchableOpacity, View, Text, ScrollView, ActivityIndicator, Modal, Linking, Alert } from "react-native"
import * as DocumentPicker from 'expo-document-picker'
import { decode } from 'base64-arraybuffer'

// Cast icons to any to avoid nativewind interop issues
const IconActivity = Activity as any;
const IconCalendar = Calendar as any;
const IconCheckCircle2 = CheckCircle2 as any;
const IconChevronRight = ChevronRight as any;
const IconClock = Clock as any;
const IconDownload = Download as any;
const IconX = X as any;

interface Assignments {
  id: string
  title: string
  subject: { title: string }
  due_date: string
  total_points: number
  status: "pending" | "completed" | "overdue"
  submissions?: { status: string } | null
  attachment_url?: string | null
  attachment_name?: string | null
}

export default function StudentsAssignments() {
  const { user, studentId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<"pending" | "completed" | "overdue">('pending')
  const [assignments, setAssignments] = useState<Assignments[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignments | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const fetchStudentsAssignments = async () => {
    if (!studentId) return
    setLoading(true)

    try {
      // 1. Get subjects the student is enrolled in
      const { data: enrollmentData, error: enrollError } = await supabase
        .from('enrollments')
        .select('subject_id')
        .eq('student_id', studentId);

      if (enrollError) throw enrollError;

      const subjectIds = enrollmentData?.map(e => e.subject_id) || [];

      if (subjectIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // 2. Fetch assignments for those subjects
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          *,
          subject:subjects(title),
          submissions(*)
        `)
        .in('subject_id', subjectIds);

      if (error) throw error

      if (data) {
        const formatted: Assignments[] = data.map((a: any) => {
          // Filter submissions for THIS student only
          const mySubmissions = a.submissions?.filter((s: any) => s.student_id === studentId) || [];
          const isSubmitted = mySubmissions.length > 0;
          const dueDate = new Date(a.due_date);
          const now = new Date();
          const isOverdue = !isSubmitted && dueDate < now;

          return {
            id: a.id,
            title: a.title,
            subject: { title: a.subject?.title || "General" },
            due_date: dueDate.toLocaleDateString(),
            total_points: a.total_points,
            status: isSubmitted ? 'completed' : (isOverdue ? 'overdue' : 'pending'),
            submissions: mySubmissions[0] || null,
            attachment_url: a.attachment_url,
            attachment_name: a.attachment_name
          }
        })
        setAssignments(formatted)
      }
    } catch (error: any) {
      console.error("error fetching assignments", error.message);
      Alert.alert("Error", "Failed to load assignments.");
    } finally {
      setLoading(false)
    }
  }

  // fetch assignments from db
  useEffect(() => {
    fetchStudentsAssignments()
  }, [studentId])

  // Downloading content uploaded by teacher
  const handleDownload = async (url: string) => {
    try {
      if (!url) return;

      // If it's a relative path, construct the full URL
      const fullUrl = url.startsWith('http')
        ? url
        : `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assignments/${url}`;

      const supported = await Linking.canOpenURL(fullUrl)

      if (supported) {
        await Linking.openURL(fullUrl)
      } else {
        Alert.alert('Error', "Cannot open this file URL.")
      }

    } catch (error) {
      Alert.alert("Error", "Could not open the file.")
    }
  }

  // Handling uploading content/submissions
  const handleUpload = async () => {
    if (!selectedAssignment || !studentId) return

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      })

      if (result.canceled) return
      setIsUploading(true)
      const file = result.assets[0]

      const response = await fetch(file.uri)
      const blob = await response.blob()
      const arraybuffer = await new Response(blob).arrayBuffer()

      const fileName = `${selectedAssignment.id}/${studentId}_${file.name}`
      const filePath = `submissions/${fileName}`

      // 3. Uploading to supabase storage
      const { data, error } = await supabase.storage
        .from('assignments')
        .upload(filePath, arraybuffer, {
          contentType: file.mimeType,
          upsert: true
        })

      if (error) throw error

      const { error: dbError } = await supabase
        .from('submissions')
        .insert({
          assignment_id: selectedAssignment.id,
          student_id: studentId,
          file_url: filePath, // Using file_url as confirmed in schema earlier
          status: 'submitted',
          submitted_at: new Date().toISOString()
        } as any)

      if (dbError) throw dbError

      Alert.alert('Success', "Assignment submitted successfully!")
      setSelectedAssignment(null)
      fetchStudentsAssignments()

    } catch (error: any) {
      Alert.alert("Upload Error", error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const displayList = assignments?.filter(a => {
    if (filter === 'pending') return a.status === 'pending' || a.status === 'overdue';
    if (filter === 'completed') return a.status === 'completed';
    return false;
  }) ?? [];

  return (
    <>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-6 pt-6 pb-4 border-b border-gray-100">
          <Text className="text-2xl font-black text-gray-900">Assignments</Text>

          {/* Custom Tab Switcher */}
          <View className="flex-row mt-4 bg-gray-100 p-1 rounded-xl">
            <TouchableOpacity
              onPress={() => setFilter("pending")}
              className={`flex-1 py-2 rounded-lg ${filter === "pending" ? "bg-white shadow-sm" : ""}`}
            >
              <Text
                className={`text-center font-bold text-xs ${filter === "pending" ? "text-orange-500" : "text-gray-500"}`}
              >
                To-Do
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter("completed")}
              className={`flex-1 py-2 rounded-lg ${filter === "completed" ? "bg-white shadow-sm" : ""}`}
            >
              <Text
                className={`text-center font-bold text-xs ${filter === "completed" ? "text-orange-500" : "text-gray-500"}`}
              >
                Completed
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="p-4 flex-1">
          {loading ? (
            <ActivityIndicator color="orange" className="mt-10" />
          ) : displayList.length === 0 ? (
            <View className="flex-1 items-center justify-center mt-20">
              <IconCheckCircle2 size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-4 font-medium text-center px-10">
                {filter === 'pending' ? "All caught up! No pending assignments." : "No completed assignments yet."}
              </Text>
            </View>
          ) : (
            displayList.map((item) => (
              <TouchableOpacity
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 flex-row items-center shadow-sm"
                onPress={() => {
                  setSelectedAssignment(item);
                  setModalVisible(true);
                }}
              >
                <View
                  className={`p-3 rounded-xl mr-4 ${item.status === "completed" ? "bg-teal-50" : (item.status === 'overdue' ? "bg-red-50" : "bg-amber-50")}`}
                >
                  {item.status === "completed" ? (
                    <IconCheckCircle2 size={20} color="#0d9488" />
                  ) : item.status === 'overdue' ? (
                    <IconClock size={20} color="#ef4444" />
                  ) : (
                    <IconClock size={20} color="#f59e0b" />
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-gray-400 text-[10px] font-bold uppercase">
                    {item.subject?.title}
                  </Text>
                  <Text className="text-gray-900 font-bold text-sm mb-1">
                    {item.title}
                  </Text>
                  <View className="flex-row items-center">
                    <IconCalendar size={12} color="#9CA3AF" />
                    <Text className={`text-[10px] ml-1 ${item.status === 'overdue' ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                      Due: {item.due_date} {item.status === 'overdue' && '(Overdue)'}
                    </Text>
                  </View>
                </View>

                <IconChevronRight size={18} color="#D1D5DB" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedAssignment}
        onRequestClose={() => setSelectedAssignment(null)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-4 ">
          <View className="bg-white w-full max-w-[550px] overflow-hidden shadow-2xl rounded-3xl">
            {/* 1. HEADER & STATUS */}
            <View className="bg-orange-500 p-6 flex-row justify-between items-start ">
              <View className="flex-1">
                <Text className="text-white/70 text-[10px] font-black uppercase tracking-[2px] mb-1">
                  {selectedAssignment?.subject?.title}
                </Text>
                <Text className="text-white text-2xl font-black leading-7">
                  {selectedAssignment?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedAssignment(null)}
                className="bg-white/20 p-2 rounded-2xl"
              >
                <IconX size={20} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-6 max-h-[70vh]">
              {/* 2. TEACHER'S CONTENT (DOWNLOADABLE) */}
              <View className="mb-8">
                <View className="flex-row items-center mb-4">
                  <IconActivity size={18} color="#f97316" strokeWidth={2.5} />
                  <Text className="ml-2 font-bold text-gray-800">
                    Learning Materials
                  </Text>
                </View>

                {selectedAssignment?.attachment_url ? (
                  <TouchableOpacity
                    className="flex-row items-center bg-orange-50 border border-orange-100 p-4 rounded-2xl"
                    onPress={() => handleDownload(selectedAssignment.attachment_url!)}
                  >
                    <View className="bg-white p-3 rounded-xl shadow-sm mr-4">
                      <IconDownload size={20} color="#f97316" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-bold text-sm">
                        {selectedAssignment.attachment_name || "Attachment"}
                      </Text>
                      <Text className="text-orange-600/60 text-[10px] font-bold">
                        Click to download
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <Text className="text-gray-400 italic text-sm ml-6">No materials attached.</Text>
                )}
              </View>

              {/* 3. UPLOAD WINDOW (SUBMISSION ZONE) */}
              <View>
                <View className="flex-row items-center mb-4">
                  <IconCheckCircle2 size={18} color="#0d9488" strokeWidth={2.5} />
                  <Text className="ml-2 font-bold text-gray-800">
                    Your Submission
                  </Text>
                </View>

                {selectedAssignment?.status === 'completed' ? (
                  <View className="bg-teal-50 border border-teal-100 p-6 rounded-3xl flex-row items-center">
                    <View className="bg-white p-4 rounded-full shadow-sm mr-4">
                      <IconCheckCircle2 size={24} color="#0d9488" />
                    </View>
                    <View>
                      <Text className="text-teal-900 font-bold text-sm">Submitted</Text>
                      <Text className="text-teal-600/70 text-xs">Nice work! Your assignment is in.</Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    disabled={isUploading}
                    className="border-2 border-dashed border-gray-200 bg-gray-50 rounded-3xl p-10 items-center justify-center"
                    onPress={handleUpload}
                  >
                    {isUploading ? (
                      <ActivityIndicator color="#f97316" />
                    ) : (
                      <>
                        <View className="bg-white p-4 rounded-full shadow-sm mb-3">
                          <IconDownload size={24} color="#9ca3af" />
                        </View>
                        <Text className="text-gray-900 font-bold text-sm">
                          Click to upload submission
                        </Text>
                        <Text className="text-gray-400 text-xs mt-1">
                          Files, Docs, or Images (Max 50MB)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* 4. FOOTER INFO */}
              <View className="mt-8 flex-row items-center justify-between bg-gray-50 p-4 rounded-2xl">
                <View className="flex-row items-center">
                  <IconClock size={14} color="#6b7280" />
                  <Text className="ml-2 text-gray-500 text-xs font-bold">
                    Due: {selectedAssignment?.due_date}
                  </Text>
                </View>
                <Text className="text-gray-900 font-black text-xs">
                  {selectedAssignment?.total_points} Points
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}