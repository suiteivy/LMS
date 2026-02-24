import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import * as DocumentPicker from 'expo-document-picker';
import { router } from "expo-router";
import { Activity, Calendar, CheckCircle2, ChevronRight, Clock, Download, FileText, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

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
  const { studentId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<"pending" | "completed" | "overdue">('pending')
  const [assignments, setAssignments] = useState<Assignments[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignments | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const fetchStudentsAssignments = async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const { data: enrollmentData } = await supabase.from('enrollments').select('subject_id').eq('student_id', studentId);
      const subjectIds = enrollmentData?.map(e => e.subject_id) || [];
      if (subjectIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("assignments")
        .select(`*, subject:subjects(title), submissions(*)`)
        .in('subject_id', subjectIds);

      if (error) throw error
      if (data) {
        const formatted: Assignments[] = data.map((a: any) => {
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
      console.error(error.message);
      Alert.alert("Error", "Failed to load assignments.");
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudentsAssignments()
  }, [studentId])

  const handleDownload = async (url: string) => {
    try {
      if (!url) return;
      const fullUrl = url.startsWith('http') ? url : `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assignments/${url}`;
      await Linking.openURL(fullUrl)
    } catch (error) {
      Alert.alert("Error", "Could not open the file.")
    }
  }

  const handleUpload = async () => {
    if (!selectedAssignment || !studentId) return
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true })
      if (result.canceled) return
      setIsUploading(true)
      const file = result.assets[0]
      const response = await fetch(file.uri)
      const blob = await response.blob()
      const arraybuffer = await new Response(blob).arrayBuffer()
      const fileName = `${selectedAssignment.id}/${studentId}_${file.name}`
      const filePath = `submissions/${fileName}`

      const { error } = await supabase.storage.from('assignments').upload(filePath, arraybuffer, { contentType: file.mimeType, upsert: true })
      if (error) throw error
      const { error: dbError } = await supabase.from('submissions').insert({
        assignment_id: selectedAssignment.id,
        student_id: studentId,
        file_url: filePath,
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
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <UnifiedHeader
        title="Tasks"
        subtitle="Assignments"
        role="Student"
        onBack={() => router.back()}
        showNotification={false}
      />

      <View className="p-4 md:p-8">
        {/* Toggle Controls */}
        <View className="flex-row bg-white dark:bg-[#1a1a1a] p-1.5 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm mb-8">
          <TouchableOpacity
            onPress={() => setFilter("pending")}
            className={`flex-1 py-3.5 rounded-2xl items-center ${filter === "pending" ? "bg-[#FF6900]" : ""}`}
          >
            <Text className={`text-xs font-bold uppercase tracking-widest ${filter === "pending" ? "text-white" : "text-gray-400 dark:text-gray-500"}`}>Current</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilter("completed")}
            className={`flex-1 py-3.5 rounded-2xl items-center ${filter === "completed" ? "bg-gray-900 dark:bg-gray-800" : ""}`}
          >
            <Text className={`text-xs font-bold uppercase tracking-widest ${filter === "completed" ? "text-white" : "text-gray-400 dark:text-gray-500"}`}>History</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#FF6900" className="mt-8" />
        ) : (
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 200 }}>
            {displayList.length === 0 ? (
              <View className="bg-white dark:bg-[#1a1a1a] p-16 rounded-[40px] items-center border border-gray-100 dark:border-gray-800 border-dashed mt-8">
                <CheckCircle2 size={64} color="#E5E7EB" style={{ opacity: 0.3 }} />
                <Text className="text-gray-400 dark:text-gray-500 font-bold text-center mt-6 tracking-tight">
                  {filter === 'pending' ? "No pending tasks." : "No records found."}
                </Text>
              </View>
            ) : (
              displayList.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedAssignment(item)}
                  className="bg-white dark:bg-[#1a1a1a] p-5 rounded-[32px] border border-gray-50 dark:border-gray-800 mb-4 flex-row items-center shadow-sm"
                >
                  <View className={`w-14 h-14 rounded-2xl items-center justify-center mr-4 ${item.status === "completed" ? "bg-green-50 dark:bg-green-950/20" : (item.status === 'overdue' ? "bg-red-50 dark:bg-red-950/20" : "bg-orange-50 dark:bg-orange-950/20")}`}>
                    {item.status === "completed" ? <CheckCircle2 size={24} color="#16a34a" /> : (item.status === 'overdue' ? <Clock size={24} color="#dc2626" /> : <Activity size={24} color="#FF6900" />)}
                  </View>
                  <View className="flex-1">
                    <Text className="text-[#FF6900] text-[8px] font-bold uppercase tracking-[2px] mb-1">{item.subject?.title}</Text>
                    <Text className="text-gray-900 dark:text-gray-100 font-bold text-base leading-tight mb-1" numberOfLines={1}>{item.title}</Text>
                    <View className="flex-row items-center">
                      <Calendar size={12} color="#9CA3AF" />
                      <Text className="text-gray-400 dark:text-gray-500 text-xs font-medium ml-1.5">{item.due_date}</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#D1D5DB" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>

      <Modal animationType="slide" transparent visible={!!selectedAssignment}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white dark:bg-[#121212] rounded-t-[50px] p-8 pb-12 border-t border-gray-100 dark:border-gray-800">
            <View className="flex-row justify-between items-start mb-8">
              <View className="flex-1 pr-6">
                <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-[3px] mb-2">{selectedAssignment?.subject?.title}</Text>
                <Text className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-8">{selectedAssignment?.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedAssignment(null)} className="w-10 h-10 bg-gray-50 dark:bg-[#1a1a1a] rounded-full items-center justify-center">
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Assignment Details */}
            <View className="bg-gray-50 dark:bg-[#1a1a1a] p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 mb-8">
              <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                <View className="flex-row items-center">
                  <Clock size={16} color="#9CA3AF" />
                  <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest ml-2">Deadline</Text>
                </View>
                <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm">{selectedAssignment?.due_date}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Activity size={16} color="#9CA3AF" />
                  <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest ml-2">Potential</Text>
                </View>
                <Text className="text-[#FF6900] font-bold text-sm">{selectedAssignment?.total_points} Points</Text>
              </View>
            </View>

            {/* Materials */}
            {selectedAssignment?.attachment_url && (
              <TouchableOpacity
                onPress={() => handleDownload(selectedAssignment!.attachment_url!)}
                className="bg-orange-50 dark:bg-orange-950/20 p-6 rounded-[32px] border border-orange-100 dark:border-orange-900 flex-row items-center mb-8"
              >
                <View className="bg-white dark:bg-[#121212] p-3 rounded-2xl shadow-sm mr-4">
                  <Download size={20} color="#FF6900" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-gray-100 font-bold text-sm tracking-tight">{selectedAssignment.attachment_name || "Course Material"}</Text>
                  <Text className="text-[#FF6900] text-[8px] font-bold uppercase tracking-widest mt-0.5">Reference Document</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Submission Zone */}
            {selectedAssignment?.status === 'completed' ? (
              <View className="bg-green-50 dark:bg-green-950/20 p-8 rounded-[40px] border border-green-100 dark:border-green-900 items-center">
                <View className="bg-white dark:bg-[#121212] p-4 rounded-full shadow-sm mb-4">
                  <CheckCircle2 size={32} color="#16a34a" />
                </View>
                <Text className="text-green-600 dark:text-green-400 font-bold text-lg tracking-tight">Assignment Submitted</Text>
                <Text className="text-green-600/60 dark:text-green-400/60 text-xs font-medium mt-1">Under faculty review</Text>
              </View>
            ) : (
              <TouchableOpacity
                disabled={isUploading}
                onPress={handleUpload}
                className="bg-gray-900 p-8 rounded-[40px] items-center shadow-xl active:bg-gray-800"
              >
                {isUploading ? <ActivityIndicator color="white" /> : (
                  <>
                    <View className="bg-white/10 p-4 rounded-3xl mb-4">
                      <FileText size={32} color="white" />
                    </View>
                    <Text className="text-white font-bold text-lg tracking-tight">Upload Submission</Text>
                    <Text className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Tap to select device file</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}