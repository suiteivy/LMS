import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/libs/supabase"
import { Activity, Calendar, CheckCircle2, ChevronRight, Clock, Download, X } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { TouchableOpacity, View, Text, ScrollView, ActivityIndicator, Modal, Linking, Alert } from "react-native"
import { useRouter } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import { decode } from 'base64-arraybuffer'

interface Assignments {
  id: string
  title: string
  course: { title: string }
  due_date: string
  total_points: number
  status: "pending" | "completed" | "overdue"
  submissions?: { status: string } | null
  resource_path?: string | ''
}

export default function StudentsAssignments() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<"pending" | "completed" | "overdue">('pending')
  const [assignments, setAssignments] = useState<Assignments[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignments | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [isUploading, setIsUploading] = useState(false)



  const displayList = assignments?.filter(a => {
    if (filter === 'pending') return a.status === 'pending';
    if (filter === 'completed') return a.status === 'completed';
    if (filter === 'overdue') return a.status === 'overdue';
    return false;
  }) ?? [];

  const fetchStudentsAssignments = async () => {
    if (!user?.id) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("assignments")
        .select(
          `
        *,
        course:subjects(title),
        submissions(*)
    `,
        )
      // .eq("submissions.student_id", user?.id);

      if (error) throw error

      //check for submissions
      if (data) {
        const formatted: Assignments[] = data.map((a: any) => {
          const isSubmitted = a.submissions && a.submissions.length > 0

          return {
            id: a.id,
            title: a.title,
            course: { title: a.course?.title || "General" },
            due_date: new Date(a.due_date).toLocaleDateString(),
            total_points: a.total_points,
            status: a.submissions?.length > 0 ? 'completed' : 'pending',
            submissions: a.submissions?.[0] || null
          }
        })
        setAssignments(formatted)
      }
      setLoading(false)
    } catch (error: any) {
      console.error("error fetching assignments", error.message);
    }
  }

  // fetch assignments from db
  useEffect(() => {
    fetchStudentsAssignments()
  }, [user?.id])

  // Downloading content uploaded by teacher
  const handleDownload = async (fileName: string) => {
    try {
      //TODO: 1. Construct the Public URL for your Supabase Storage bucket
      // Replace 'your-project-id' and 'bucket-name' with your actual Supabase details
      const publicUrl = `https://yqvtsjxgvtzshabkmegm.supabase.co/storage/v1/object/public/assignments/${fileName}`;

      const supported = await Linking.canOpenURL(publicUrl)

      if (supported) {
        await Linking.openURL(publicUrl)
      } else {
        Alert.alert('Error', "Don't know how to open this URL: " + publicUrl)
      }

    } catch (error) {
      Alert.alert("Download Failed, Could not open the file.")
    }
  }

  // Handling uploading content/submissions
  const handleUpload = async () => {
    if (!selectedAssignment || !user) return

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      })

      if (result.canceled) return
      setIsUploading(true)
      const file = result.assets[0]

      // 2. Prepare file data for Supabase
      // On Web, we can use the file object directly; on mobile, we fetch the URI
      const response = await fetch(file.uri)
      const blob = await response.blob()
      const arraybuffer = await new Response(blob).arrayBuffer()

      const fileName = `${selectedAssignment.id}/${user.id}_${file.name}`
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
          student_id: user.id,
          content: filePath,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })

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

        <ScrollView className="p-4 flex-1 items-center">
          {loading ? (
            <ActivityIndicator color="orange" className="mt-10" />
          ) : displayList.length === 0 ? (
            <View className="flex-1 flex-col p-3 gap-2">
              <View className="flex-1 items-center">
                <CheckCircle2 size={48} color="orange" />
              </View>
              <View className="flex-1 items-center">
                <Text>Nothing to see, Whoo!! All Caught up!</Text>
              </View>
            </View>
          ) : (
            displayList.map((item) => (
              <TouchableOpacity
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 flex-row items-center shadow-sm"
                // onPress={() => router.push(`/(student)/assignments/${item.id}`)}
                onPress={() => {
                  setSelectedAssignment(item);
                  setModalVisible(true);
                }}
              >
                <View
                  className={`p-3 rounded-xl mr-4 ${item?.status === "pending" ? "bg-amber-50" : "bg-teal-50"}`}
                >
                  {item?.status === "pending" ? (
                    <Clock size={20} color="#f59e0b" />
                  ) : (
                    <CheckCircle2 size={20} color="#0d9488" />
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-gray-400 text-[10px] font-bold uppercase">
                    {item.course?.title}
                  </Text>
                  <Text className="text-gray-900 font-bold text-sm mb-1">
                    {item.title}
                  </Text>
                  <View className="flex-row items-center">
                    <Calendar size={12} color="#9CA3AF" />
                    <Text className="text-gray-400 text-[10px] ml-1">
                      Due: {item.due_date}
                    </Text>
                  </View>
                </View>

                <ChevronRight size={18} color="#D1D5DB" />
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
          <View className="bg-white w-full max-w-[550px] overflow-hidden shadow-2xl rounded-xl">
            {/* 1. HEADER & STATUS */}
            <View className="bg-orange-500 p-8 flex-row justify-between items-start ">
              <View className="flex-1">
                <Text className="text-white/70 text-[10px] font-black uppercase tracking-[2px] mb-1">
                  {selectedAssignment?.course?.title}
                </Text>
                <Text className="text-white text-2xl font-black leading-7">
                  {selectedAssignment?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedAssignment(null)}
                className="bg-white/20 p-2 rounded-2xl"
              >
                <X size={20} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-8 max-h-[70vh]">
              {/* 2. TEACHER'S CONTENT (DOWNLOADABLE) */}
              <View className="mb-8">
                <View className="flex-row items-center mb-4">
                  <Activity size={18} color="#f97316" strokeWidth={2.5} />
                  <Text className="ml-2 font-bold text-gray-800">
                    Learning Materials
                  </Text>
                </View>

                <TouchableOpacity
                  className="flex-row items-center bg-orange-50 border border-orange-100 p-4 rounded-2xl"
                  onPress={() => selectedAssignment?.resource_path && handleDownload(selectedAssignment.resource_path)}
                >
                  <View className="bg-white p-3 rounded-xl shadow-sm mr-4">
                    <Download size={20} color="#f97316" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-sm">
                      Assignment_Resources.zip
                    </Text>
                    <Text className="text-orange-600/60 text-[10px] font-bold">
                      PDF, Assets • 12.4 MB
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* 3. UPLOAD WINDOW (SUBMISSION ZONE) */}
              <View>
                <View className="flex-row items-center mb-4">
                  <CheckCircle2 size={18} color="#0d9488" strokeWidth={2.5} />
                  <Text className="ml-2 font-bold text-gray-800">
                    Your Submission
                  </Text>
                </View>

                {/* Dotted Upload Box */}
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
                        <Calendar size={24} color="#9ca3af" />
                      </View>
                      <Text className="text-gray-900 font-bold text-sm">
                        Click to upload files
                      </Text>
                      <Text className="text-gray-400 text-xs mt-1">
                        PDF, ZIP, or DOC (Max 50MB)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* 4. FOOTER INFO */}
              <View className="mt-8 flex-row items-center justify-between bg-gray-50 p-4 rounded-2xl">
                <View className="flex-row items-center">
                  <Clock size={14} color="#6b7280" />
                  <Text className="ml-2 text-gray-500 text-xs font-bold">
                    Due: {selectedAssignment?.due_date}
                  </Text>
                </View>
                <Text className="text-gray-900 font-black text-xs">
                  {selectedAssignment?.total_points} Points
                </Text>
              </View>
            </ScrollView>

            {/* SUBMIT BUTTON */}
            <View className="p-8 pt-0">
              <TouchableOpacity
                className="bg-orange-500 py-4 rounded-2xl items-center shadow-lg shadow-orange-200"
                activeOpacity={0.8}
                onPress={handleUpload}
              >
                <Text className="text-white font-black text-lg">
                  Finalize Submission
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}