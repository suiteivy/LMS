import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { ChevronLeft, Plus, Trash2, Calendar, Clock, MapPin, X } from "lucide-react-native";
import { TimetableAPI, TimetableEntry, CreateTimetableDto } from "@/services/TimetableService";
import { ClassAPI, ClassData } from "@/services/ClassService";
import { SubjectAPI, SubjectData } from "@/services/SubjectService";
import { Picker } from '@react-native-picker/picker';
import { showSuccess, showError } from "@/utils/toast";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimetableManager() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [fetchingTimetable, setFetchingTimetable] = useState(false);
    const [classes, setClasses] = useState<ClassData[]>([]);
    const [subjects, setSubjects] = useState<SubjectData[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);

    // New slot state
    const [newSlot, setNewSlot] = useState<Partial<CreateTimetableDto>>({
        day_of_week: 'Monday',
        start_time: '08:00',
        end_time: '09:00',
        room_number: ''
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchClassTimetable(selectedClassId);
            fetchClassSubjects(selectedClassId);
        } else {
            setTimetable([]);
        }
    }, [selectedClassId]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const classList = await ClassAPI.getClasses();
            setClasses(classList);
        } catch (error) {
            console.error("Failed to load classes", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClassTimetable = async (classId: string) => {
        try {
            setFetchingTimetable(true);
            const data = await TimetableAPI.getClassTimetable(classId);
            setTimetable(data);
        } catch (error) {
            console.error("Failed to fetch timetable", error);
        } finally {
            setFetchingTimetable(false);
        }
    };

    const fetchClassSubjects = async (classId: string) => {
        try {
            const data = await SubjectAPI.getSubjectsByClass(classId);
            setSubjects(data);
        } catch (error) {
            console.error("Failed to fetch subjects", error);
        }
    };

    const handleAddSlot = async () => {
        if (!selectedClassId || !newSlot.subject_id || !newSlot.day_of_week || !newSlot.start_time || !newSlot.end_time) {
            showError("Error", "Please fill all required fields");
            return;
        }

        try {
            await TimetableAPI.createEntry({
                ...newSlot,
                class_id: selectedClassId
            } as CreateTimetableDto);

            showSuccess("Success", "Schedule entry added");
            setIsAddModalVisible(false);
            fetchClassTimetable(selectedClassId);
        } catch (error) {
            // Error handled by interceptor
        }
    };

    const handleDeleteSlot = (id: string) => {
        Alert.alert(
            "Delete Entry",
            "Are you sure you want to remove this slot from the timetable?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await TimetableAPI.deleteEntry(id);
                            showSuccess("Deleted", "Entry removed successfully");
                            fetchClassTimetable(selectedClassId);
                        } catch (error) {
                            // Error handled by interceptor
                        }
                    }
                }
            ]
        );
    };

    const renderDaySchedule = (day: string) => {
        const slots = timetable.filter(t => t.day_of_week === day);
        if (slots.length === 0) return null;

        return (
            <View key={day} className="mb-6">
                <View className="flex-row items-center mb-3">
                    <Calendar size={18} color="#0D9488" />
                    <Text className="text-lg font-bold text-gray-800 ml-2">{day}</Text>
                </View>

                {slots.map((slot) => (
                    <View key={slot.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-3 flex-row justify-between items-center">
                        <View className="flex-1">
                            <Text className="text-lg font-bold text-gray-900">
                                {slot.subjects?.title || "Unknown Subject"}
                            </Text>
                            <View className="flex-row items-center mt-1">
                                <Clock size={14} color="#6B7280" />
                                <Text className="text-gray-500 text-sm ml-1">
                                    {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                                </Text>
                                {slot.room_number && (
                                    <>
                                        <MapPin size={14} color="#6B7280" className="ml-3" />
                                        <Text className="text-gray-500 text-sm ml-1">{slot.room_number}</Text>
                                    </>
                                )}
                            </View>
                            <Text className="text-teal-600 text-xs font-medium mt-1">
                                {slot.subjects?.teachers?.users?.full_name || "No teacher assigned"}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => handleDeleteSlot(slot.id)}
                            className="bg-red-50 p-2 rounded-lg"
                        >
                            <Trash2 size={20} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0D9488" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
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
                {selectedClassId && (
                    <TouchableOpacity
                        className="bg-teal-600 p-3 rounded-full shadow-lg"
                        onPress={() => setIsAddModalVisible(true)}
                    >
                        <Plus size={24} color="white" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Class Selector */}
            <View className="p-4 bg-white border-b border-gray-100">
                <Text className="text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Select Class</Text>
                <View className="bg-gray-50 rounded-xl border border-gray-200">
                    <Picker
                        selectedValue={selectedClassId}
                        onValueChange={(itemValue) => setSelectedClassId(itemValue)}
                    >
                        <Picker.Item label="Choose a class..." value="" />
                        {classes.map(c => (
                            <Picker.Item key={c.id} label={c.name} value={c.id} />
                        ))}
                    </Picker>
                </View>
            </View>

            <ScrollView className="flex-1 p-6">
                {!selectedClassId ? (
                    <View className="mt-20 items-center justify-center">
                        <Calendar size={64} color="#E5E7EB" />
                        <Text className="text-gray-400 mt-4 text-center font-medium">
                            Please select a class to view its timetable
                        </Text>
                    </View>
                ) : fetchingTimetable ? (
                    <ActivityIndicator size="small" color="#0D9488" />
                ) : timetable.length === 0 ? (
                    <View className="mt-20 items-center justify-center">
                        <Clock size={64} color="#E5E7EB" />
                        <Text className="text-gray-400 mt-4 text-center font-medium">
                            No schedule found for this class. {"\n"}Click + to add a new slot.
                        </Text>
                    </View>
                ) : (
                    DAYS.map(day => renderDaySchedule(day))
                )}
                <View className="h-10" />
            </ScrollView>

            {/* Add Slot Modal */}
            <Modal
                visible={isAddModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsAddModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-[40px] p-8 shadow-2xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl font-extrabold text-gray-900">Add Schedule Slot</Text>
                            <TouchableOpacity onPress={() => setIsAddModalVisible(false)} className="p-2 bg-gray-50 rounded-full">
                                <X size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Day Selection */}
                            <Text className="text-sm font-bold text-gray-700 mb-2">Day of Week</Text>
                            <View className="bg-gray-50 rounded-xl border border-gray-200 mb-4 overflow-hidden">
                                <Picker
                                    selectedValue={newSlot.day_of_week}
                                    onValueChange={(val) => setNewSlot({ ...newSlot, day_of_week: val as any })}
                                >
                                    {DAYS.map(day => (
                                        <Picker.Item key={day} label={day} value={day} />
                                    ))}
                                </Picker>
                            </View>

                            {/* Subject Selection */}
                            <Text className="text-sm font-bold text-gray-700 mb-2">Subject</Text>
                            <View className="bg-gray-50 rounded-xl border border-gray-200 mb-4 overflow-hidden">
                                <Picker
                                    selectedValue={newSlot.subject_id}
                                    onValueChange={(val) => setNewSlot({ ...newSlot, subject_id: val })}
                                >
                                    <Picker.Item label="Select subject..." value="" />
                                    {subjects.map(s => (
                                        <Picker.Item key={s.id} label={s.title} value={s.id} />
                                    ))}
                                </Picker>
                            </View>

                            {/* Time Selectors */}
                            <View className="flex-row gap-4 mb-4">
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-gray-700 mb-2">Start Time</Text>
                                    <TextInput
                                        className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-900"
                                        placeholder="08:00"
                                        value={newSlot.start_time}
                                        onChangeText={(v) => setNewSlot({ ...newSlot, start_time: v })}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-gray-700 mb-2">End Time</Text>
                                    <TextInput
                                        className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-900"
                                        placeholder="09:00"
                                        value={newSlot.end_time}
                                        onChangeText={(v) => setNewSlot({ ...newSlot, end_time: v })}
                                    />
                                </View>
                            </View>

                            {/* Room Number */}
                            <Text className="text-sm font-bold text-gray-700 mb-2">Room (Optional)</Text>
                            <TextInput
                                className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-900 mb-6"
                                placeholder="e.g. Room 101, Lab A"
                                value={newSlot.room_number || ''}
                                onChangeText={(v) => setNewSlot({ ...newSlot, room_number: v })}
                            />

                            <TouchableOpacity
                                className="bg-teal-600 p-5 rounded-2xl items-center shadow-lg mb-6"
                                onPress={handleAddSlot}
                            >
                                <Text className="text-white font-extrabold text-lg">Create Entry</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
