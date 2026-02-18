import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Platform, Image } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ChevronLeft, Calendar as CalendarIcon, Check, X, Clock } from "lucide-react-native";
import { TeacherAttendanceAPI, TeacherAttendance } from "@/services/TeacherAttendanceService";
import DateTimePicker from '@react-native-community/datetimepicker';

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
            setAttendance(data);
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
            <View className="bg-white px-6 pt-14 pb-4 border-b border-gray-100 flex-row items-center justify-between shadow-sm">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-gray-50 p-2 rounded-full">
                        <ChevronLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-2xl font-bold text-gray-900" numberOfLines={1} adjustsFontSizeToFit>Teacher Attendance</Text>
                        <Text className="text-sm text-gray-500">Monitor teacher check-ins</Text>
                    </View>
                </View>
                <TouchableOpacity
                    className="bg-gray-100 p-2 rounded-lg flex-row items-center"
                    onPress={() => setShowDatePicker(true)}
                >
                    <CalendarIcon size={20} color="#4b5563" className="mr-2" />
                    <Text className="text-gray-700 font-medium">{date.toLocaleDateString()}</Text>
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
                <ActivityIndicator size="large" color="#0d9488" className="mt-10" />
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
