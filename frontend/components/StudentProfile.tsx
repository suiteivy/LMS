import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, TextInput, Alert, ActivityIndicator, StatusBar, Platform } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { BookOpen, Edit3, GraduationCap, Mail, Save, X, Menu, ShieldCheck, ChevronRight, Calendar, Award, Clock } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/libs/supabase";
import { useNavigation } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";

export default function StudentProfile() {
    const { profile, refreshProfile } = useAuth();
    const navigation = useNavigation<DrawerNavigationProp<any>>();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(profile?.full_name || "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile?.full_name) setName(profile.full_name);
    }, [profile]);

    const handleSave = async () => {
        if (!name.trim()) return Alert.alert("Error", "Name cannot be empty");
        setSaving(true);
        try {
            const { error } = await authService.updateProfile({ full_name: name });
            if (error) throw error;
            await refreshProfile();
            setIsEditing(false);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setName(profile?.full_name || "");
        setIsEditing(false);
    };

    if (!profile) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0d9488" />
                <Text className="text-gray-600 mt-4 font-semibold">Loading profile...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* CLEAN HEADER */}
            <View className="bg-gray-200 pt-2 pb-2 px-6 shadow-lg">
                <View className="flex-row justify-between items-center">
                    <TouchableOpacity
                        onPress={() => navigation.openDrawer()}
                        className="w-10 h-10 rounded-xl items-center justify-center active:bg-white/30"
                        activeOpacity={0.7}
                    >
                        <Menu size={20} color="black" strokeWidth={2.5} />
                    </TouchableOpacity>

                    <Text className="text-black font-bold text-base tracking-tight">My Profile</Text>

                    <View className="w-10 h-10" />
                </View>
            </View>

            <ScrollView
                className="flex-1 px-5"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}
            >
                {/* MAIN PROFILE CARD */}
                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-5">
                    {/* Header with Teal Background */}
                    <View className="bg-teal-500 rounded-t-3xl">
                        <View className="px-6 pb-6 flex-row justify-between items-end mt-4">
                            <View className="flex-1 pb-2">
                                {isEditing ? (
                                    <View>
                                        <TextInput
                                            value={name}
                                            onChangeText={setName}
                                            className="text-2xl font-bold text-gray-900 bg-white px-3 py-2 rounded-xl mb-2"
                                            placeholder="Enter your name"
                                            autoFocus
                                            placeholderTextColor="#9ca3af"
                                        />
                                        <View className="flex-row gap-2">
                                            <TouchableOpacity
                                                onPress={handleCancel}
                                                className="bg-white/30 px-4 py-2 rounded-lg active:bg-white/40"
                                                activeOpacity={0.8}
                                            >
                                                <Text className="text-white font-bold text-sm">Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={handleSave}
                                                disabled={saving}
                                                className="bg-white px-4 py-2 rounded-lg active:bg-gray-100"
                                                activeOpacity={0.8}
                                            >
                                                {saving ? (
                                                    <ActivityIndicator size="small" color="#0d9488" />
                                                ) : (
                                                    <Text className="text-teal-600 font-bold text-sm">Save</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <Text className="text-2xl font-bold text-gray-900">
                                            {profile.full_name || "Student"}
                                        </Text>
                                        <Text className="text-white font-medium">
                                            {profile.role === 'student' ? 'Software Engineering Student' : profile.role}
                                        </Text>
                                        <View className="flex-row items-center mt-2 bg-teal-50 self-start px-3 py-1 rounded-full">
                                            <View className="w-2 h-2 rounded-full bg-teal-500 mr-2" />
                                            <Text className="text-teal-700 text-xs font-bold uppercase">
                                                {profile.status === 'approved' ? 'Active' : 'Pending'}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            <View className="relative">
                                <View style={{ elevation: 8, zIndex: 10 }}>
                                    <Image
                                        source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200' }}
                                        className="w-24 h-24 rounded-2xl border-4 border-white bg-gray-200"
                                    />
                                    {!isEditing && (
                                        <TouchableOpacity
                                            style={{ elevation: 10, zIndex: 20 }}
                                            onPress={() => setIsEditing(true)}
                                            activeOpacity={0.8}
                                            className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-md border border-gray-100"
                                        >
                                            <Edit3 size={18} color='#0d9488' />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Info Cards */}
                    <View className="p-5">
                        <View className="flex-row flex-wrap justify-between">
                            {/* Academic Info Card */}
                            <View className="w-full md:w-[48%] bg-gray-50 p-5 rounded-2xl mb-4">
                                <View className="flex-row items-center mb-4">
                                    <View className="p-2 bg-teal-50 rounded-lg">
                                        <GraduationCap size={20} color="#0d9488" strokeWidth={2.5} />
                                    </View>
                                    <Text className="ml-3 font-semibold text-gray-800">
                                        Academic Info
                                    </Text>
                                </View>

                                <View className="space-y-3">
                                    <View className="mb-3">
                                        <Text className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                                            Student ID
                                        </Text>
                                        <Text className="text-gray-900 font-semibold">
                                            {profile.id.substring(0, 12).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                                            Current Year
                                        </Text>
                                        <Text className="text-gray-900 font-semibold">
                                            3rd Year, Semester 2
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Contact Info Card */}
                            <View className="w-full md:w-[48%] bg-gray-50 p-5 rounded-2xl mb-4">
                                <View className="flex-row items-center mb-4">
                                    <View className="p-2 bg-teal-50 rounded-lg">
                                        <Mail size={20} color="#0d9488" strokeWidth={2.5} />
                                    </View>
                                    <Text className="ml-3 font-semibold text-gray-800">Contact</Text>
                                </View>

                                <View className="space-y-3">
                                    <View className="mb-3">
                                        <Text className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                                            Email Address
                                        </Text>
                                        <Text className="text-gray-900 font-semibold" numberOfLines={1}>
                                            {profile.email}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                                            Phone
                                        </Text>
                                        <Text className="text-gray-900 font-semibold">
                                            +1 234 567 890
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* REGISTERED COURSES */}
                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-5">
                    <View className="px-5 py-4 border-b border-gray-100">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <View className="p-2 bg-teal-50 rounded-lg">
                                    <BookOpen size={20} color="#0d9488" strokeWidth={2.5} />
                                </View>
                                <Text className="ml-3 font-semibold text-gray-800">Registered Courses</Text>
                            </View>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                className="active:opacity-70"
                            >
                                <Text className="text-teal-600 font-bold text-sm">View All</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="px-5 py-2">
                        {[
                            { name: 'Advanced React Native', progress: 68 },
                            { name: 'UI/UX Design Systems', progress: 45 },
                            { name: 'Database Management Systems', progress: 82 }
                        ].map((course, index) => (
                            <TouchableOpacity
                                key={index}
                                className="py-4 border-b border-gray-50 last:border-0 active:bg-gray-50"
                                activeOpacity={0.8}
                            >
                                <View className="flex-row items-center justify-between mb-3">
                                    <View className="flex-row items-center flex-1">
                                        <View className="w-2 h-2 rounded-full bg-teal-500 mr-3" />
                                        <Text className="text-gray-900 font-semibold flex-1">{course.name}</Text>
                                    </View>
                                    <Text className="text-gray-700 font-bold text-xs ml-2">
                                        {course.progress}%
                                    </Text>
                                </View>
                                <View className="ml-5">
                                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <View
                                            className="h-full bg-teal-600 rounded-full"
                                            style={{ width: `${course.progress}%` }}
                                        />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* ACHIEVEMENTS */}
                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-5">
                    <View className="px-5 py-4 border-b border-gray-100">
                        <View className="flex-row items-center">
                            <View className="p-2 bg-teal-50 rounded-lg">
                                <Award size={20} color="#0d9488" strokeWidth={2.5} />
                            </View>
                            <View className="ml-3">
                                <Text className="font-semibold text-gray-800">Recent Achievements</Text>
                                <Text className="text-gray-500 text-xs font-medium mt-0.5">Your latest milestones</Text>
                            </View>
                        </View>
                    </View>

                    <View className="p-4">
                        <View className="bg-gray-50 p-4 rounded-2xl mb-3">
                            <View className="flex-row items-start">
                                <View className="w-12 h-12 bg-teal-100 rounded-xl items-center justify-center mr-3">
                                    <Text className="text-2xl">🏆</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-bold text-sm mb-1">Course Completion</Text>
                                    <Text className="text-gray-600 text-xs font-medium mb-2">
                                        Successfully completed React Fundamentals
                                    </Text>
                                    <Text className="text-gray-500 text-xs font-semibold">2 days ago</Text>
                                </View>
                            </View>
                        </View>

                        <View className="bg-gray-50 p-4 rounded-2xl">
                            <View className="flex-row items-start">
                                <View className="w-12 h-12 bg-teal-100 rounded-xl items-center justify-center mr-3">
                                    <Text className="text-2xl">⭐</Text>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-900 font-bold text-sm mb-1">Perfect Score</Text>
                                    <Text className="text-gray-600 text-xs font-medium mb-2">
                                        Scored 100% on UI/UX Design Quiz
                                    </Text>
                                    <Text className="text-gray-500 text-xs font-semibold">1 week ago</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}
