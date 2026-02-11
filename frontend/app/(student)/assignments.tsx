import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/libs/supabase"
import { Activity, Calendar, CheckCircle2, ChevronRight, Clock } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { TouchableOpacity, View, Text, ScrollView, ActivityIndicator } from "react-native"
import { useRouter } from 'expo-router'

interface Assignments{
  id: string
  title: string
  course: {title: string}
  due_date: string
  total_points: number
  status: "pending" | "completed" | "overdue"
  submissions?: {status: string} | null
}

export default function StudentsAssignments() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<"pending" | "completed" | "overdue">('pending')
  const [assignments, setAssignments] = useState<Assignments[]>([])

  const displayList = assignments?.filter(a => {
    if (filter === 'pending') return a.status === 'pending';
    if (filter === 'completed') return a.status === 'completed';
    if (filter === 'overdue') return a.status === 'overdue';
    return false;
  }) ?? []; 

  // fetch assignments from db
  useEffect(() => { 
    const fetchStudentsAssignments = async () => {
      if(!user?.id) return
      setLoading(true)

    try {
      const { data, error } = await supabase
        .from("assignments")
        .select(
          `
        *,
        course:id(title),
        submissions(id, status, score)
      `,
        )
        .eq("submissions.student_id", user?.id);

      if(error) throw error

      //check for submissions
      if(data){
        const formatted: Assignments[] = data.map((a: any) => {
          const isSubmitted = a.submissions && a.submissions.length > 0

          return {
            id: a.id,
            title: a.title,
            course: {title: a.course?.title || "General"},
            due_date: new Date(a.due_date).toLocaleDateString(),
            total_points: a.total_points,
            status: a.submissions?.length > 0 ? 'completed' : 'pending',
            submissions: a.submissions?.[0] || null
          }
        })
        setAssignments(formatted)
      }
      setLoading(false)
      } catch(error: any) {
        console.error("error fetching assignments", error.message);
      }
    }
    fetchStudentsAssignments()
  },[user?.id])

  
  return (
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
          <View className="flex-1">
            <CheckCircle2 size={48} color="orange" />
            <Text>Nothing to see, Whoo!! All Caught up!</Text>
          </View>
        ) : (
          displayList.map((item) => (
            <TouchableOpacity
              key={item.id}
              className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 flex-row items-center shadow-sm"
              // onPress={() => router.push(`/(student)/assignments/${item.id}`)}
            >
              <View className={`p-3 rounded-xl mr-4 ${item?.status === "pending" ? "bg-amber-50" : "bg-teal-50"}`}>
                {item?.status === "pending" ? <Clock size={20} color="#f59e0b" /> : <CheckCircle2 size={20} color="#0d9488" />}
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
  );
}