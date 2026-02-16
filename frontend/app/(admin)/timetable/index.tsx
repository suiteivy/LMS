import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ChevronLeft, Plus, Trash2, Calendar, Clock, MapPin } from "lucide-react-native";
import { TimetableAPI, TimetableEntry } from "@/services/TimetableService";
import { Picker } from '@react-native-picker/picker'; // Assumes installed, or use alternative
// If picker not installed, we might need a custom dropdown or simple mapping. 
// For now, I'll use standard View/Text mapped if Picker is an issue, but standard Expo projects usually have it.
// Actually, let's use a simple UI for day selection first to avoid dependency hell if not present.

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimetableManager() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    // In a real app, we'd fetch classes list. For now, let's assume we pass classId or fetch all?
    // The API `getClassTimetable` requires classId. 
    // We need a way to select a class.

    // For this MVP, let's just list classes? Or maybe we are navigating here FROM a class detail page?
    // User requirement: "Timetable management and assigning logic".

    // Let's make this page "Manage Timetables" where you first select a class.

    useEffect(() => {
        // Load initial data?
        setLoading(false);
    }, []);

    return (
        <View className="flex-1 bg-gray-50">
            <View className="bg-white px-6 pt-14 pb-4 border-b border-gray-100 flex-row items-center justify-between shadow-sm">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-gray-50 p-2 rounded-full">
                        <ChevronLeft size={24} color="#374151" />
                    </TouchableOpacity>
                    <View>
                        <Text className="text-2xl font-bold text-gray-900">Timetables</Text>
                        <Text className="text-sm text-gray-500">Manage class schedules</Text>
                    </View>
                </View>
                <TouchableOpacity
                    className="bg-teal-600 p-3 rounded-full shadow-md"
                    onPress={() => Alert.alert("Feature", "Select a class to add schedule")}
                >
                    <Plus size={24} color="white" />
                </TouchableOpacity>
            </View>

            <ScrollView className="p-6">
                <View className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-100">
                    <Text className="text-gray-500 text-center">Select a class to view/edit timetable (TODO: Class Selector)</Text>
                    {/* Placeholder for Class Selector */}
                </View>
            </ScrollView>
        </View>
    );
}
