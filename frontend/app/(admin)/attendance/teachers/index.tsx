import { TeacherAttendance, TeacherAttendanceAPI } from "@/services/TeacherAttendanceService";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from "expo-router";
import { Calendar as CalendarIcon, Check, ChevronLeft, Clock, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";

const DEMO_ATTENDANCE: TeacherAttendance[] = [
    { 
        id: "ATT1",
        teacher_id: "T1", 
        status: "present", 
        date: new Date().toISOString(), 
        notes: "",
        teachers: { 
            id: "T1",
            users: { 
                full_name: "Isaac Newton", 
                avatar_url: undefined 
            } 
        } 
    },
    { 
        id: "ATT2",
        teacher_id: "T2", 
        status: "absent", 
        date: new Date().toISOString(), 
        notes: "On medical leave",
        teachers: { 
            id: "T2",
            users: { 
                full_name: "Marie Curie", 
                avatar_url: undefined 
            } 
        } 
    },
    { 
        id: "ATT3",
        teacher_id: "T3", 
        status: "late", 
        date: new Date().toISOString(), 
        notes: "Arrived at 8:15 AM",
        teachers: { 
            id: "T3",
            users: { 
                full_name: "Albert Einstein", 
                avatar_url: undefined 
            } 
        } 
    },
];

export default function TeacherAttendancePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [attendance, setAttendance] = useState<TeacherAttendance[]>([]);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        loadAttendance();
    }, [date]);

    const loadAttendance = async () => {
        setLoading(true);
        try {
            const dateStr = date.toISOString().split('T')[0];
            const data = await TeacherAttendanceAPI.getAttendance(dateStr);
            setAttendance(data.length > 0 ? data : DEMO_ATTENDANCE);
        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", "Failed to load attendance");
        } finally {
            setLoading(false);
        }
    };

    const handleMark = async (teacherId: string, status: string) => {
        try {
            // Optimistic update
            const oldAttendance = [...attendance];
            setAttendance(prev => prev.map(a => a.teacher_id === teacherId ? { ...a, status: status as any } : a));

            const dateStr = date.toISOString().split('T')[0];
            await TeacherAttendanceAPI.markAttendance({
                teacher_id: teacherId,
                date: dateStr,
                status,
                notes: "" // Add notes UI if needed
            });
        } catch (error) {
            Alert.alert("Error", "Failed to update status");
            loadAttendance(); // Revert
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    return (
        <View className="flex-1 bg-gray-50">
            <View className="bg-white px-6 pt-10 pb-4 border-b border-slate-100 flex-row items-center justify-between shadow-sm">
                <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <ChevronLeft size={24} color="#f97316" />
                </TouchableOpacity>
                <View className="flex-1">
                    <Text className="text-2xl font-black text-slate-900" numberOfLines={1} adjustsFontSizeToFit>Attendance</Text>
                    <Text className="text-xs text-slate-500 font-medium">Teacher Check-ins</Text>
                </View>
                <TouchableOpacity
                    className="bg-orange-50 px-4 py-2.5 rounded-2xl flex-row items-center border border-orange-100"
                    onPress={() => setShowDatePicker(true)}
                >
                    <CalendarIcon size={18} color="#f97316" className="mr-2" />
                    <Text className="text-[#f97316] font-bold text-xs">{date.toLocaleDateString()}</Text>
                </TouchableOpacity>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}

            {loading ? (
                <View className="flex-1 items-center justify-center p-12">
                    <ActivityIndicator size="large" color="#f97316" />
                </View>
            ) : (
                <ScrollView className="p-6">
                    {attendance.map(item => (
                        <View key={item.teacher_id} className="bg-white p-4 rounded-xl border border-gray-100 mb-3 flex-row justify-between items-center shadow-sm">
                            <View className="flex-row items-center flex-1 mr-2">
                                <View className="w-10 h-10 rounded-full bg-gray-200 mr-3 overflow-hidden flex-shrink-0">
                                    {/* Avatar or Initials */}
                                    {item.teachers?.users?.avatar_url ? (
                                        <Image source={{ uri: item.teachers.users.avatar_url }} className="w-full h-full" />
                                    ) : (
                                        <View className="items-center justify-center h-full w-full bg-teal-100">
                                            <Text className="text-teal-700 font-bold">{item.teachers?.users?.full_name?.charAt(0) || "T"}</Text>
                                        </View>
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-base font-bold text-gray-800" numberOfLines={1} ellipsizeMode="tail">
                                        {item.teachers?.users?.full_name || "Unknown Teacher"}
                                    </Text>
                                    <View className="flex-row items-center mt-1">
                                        <View className={`w-2 h-2 rounded-full mr-2 ${item.status === 'present' ? 'bg-green-500' :
                                            item.status === 'absent' ? 'bg-red-500' :
                                                item.status === 'late' ? 'bg-yellow-500' : 'bg-gray-300'
                                            }`} />
                                        <Text className="text-xs text-gray-500 capitalize">{item.status}</Text>
                                    </View>
                                </View>
                            </View>

                            <View className="flex-row space-x-2 flex-shrink-0">
                                <TouchableOpacity
                                    onPress={() => handleMark(item.teacher_id, 'present')}
                                    className={`p-2 rounded-lg border ${item.status === 'present' ? 'bg-green-100 border-green-500' : 'border-gray-200'}`}
                                >
                                    <Check size={20} color={item.status === 'present' ? '#16a34a' : '#9ca3af'} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleMark(item.teacher_id, 'absent')}
                                    className={`p-2 rounded-lg border ${item.status === 'absent' ? 'bg-red-100 border-red-500' : 'border-gray-200'}`}
                                >
                                    <X size={20} color={item.status === 'absent' ? '#dc2626' : '#9ca3af'} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => handleMark(item.teacher_id, 'late')}
                                    className={`p-2 rounded-lg border ${item.status === 'late' ? 'bg-yellow-100 border-yellow-500' : 'border-gray-200'}`}
                                >
                                    <Clock size={20} color={item.status === 'late' ? '#ca8a04' : '#9ca3af'} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                    {attendance.length === 0 && <Text className="text-center text-gray-400 mt-10">No teachers found.</Text>}
                </ScrollView>
            )}
        </View>
    );
}
