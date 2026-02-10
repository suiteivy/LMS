import { BookOpen, Edit3, Mail, Save, Briefcase, Layers, Users } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useAuth } from "@/contexts/AuthContext";
import { authService, supabase } from "@/libs/supabase";
import { Database } from "@/types/database";
import { showSuccess, showError } from "@/utils/toast";

type Subject = Database['public']['Tables']['subjects']['Row'];
type Class = Database['public']['Tables']['classes']['Row'];

export default function TeacherProfile() {
    const { profile, user, refreshProfile, displayId, teacherId } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(profile?.full_name || "");
    const [phone, setPhone] = useState(profile?.phone || "");
    const [saving, setSaving] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'classes'>('overview');

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [stats, setStats] = useState({
        totalSubjects: 0,
        activeClasses: 0,
        totalStudents: 0
    });

    useEffect(() => {
        if (profile) {
            setName(profile.full_name || "");
            setPhone(profile.phone || "");
        }
    }, [profile]);

    useEffect(() => {
        if (teacherId) {
            fetchTeacherData();
        } else {
            setLoadingData(false);
        }
    }, [teacherId]);

    const fetchTeacherData = async () => {
        if (!teacherId) return;
        try {
            // Fetch subjects
            const { data: subjectsData, error: subjectsError } = await supabase
                .from('subjects')
                .select('*')
                .eq('teacher_id', teacherId)
                .returns<Subject[]>();

            if (subjectsError) throw subjectsError;

            // Fetch Classes
            const { data: classesData, error: classesError } = await supabase
                .from('classes')
                .select('*')
                .eq('teacher_id', teacherId)
                .returns<Class[]>();

            if (classesError) throw classesError;

            // Fetch Total Students (approximate by counting enrollments in these classes)
            let studentCount = 0;
            if (classesData && classesData.length > 0) {
                const classIds = classesData.map(c => c.id);
                const { count, error: countError } = await supabase
                    .from('enrollments')
                    .select('*', { count: 'exact', head: true })
                    .in('class_id', classIds);

                if (!countError && count !== null) {
                    studentCount = count;
                }
            }

            setSubjects(subjectsData || []);
            setClasses(classesData || []);
            setStats({
                totalSubjects: subjectsData?.length || 0,
                activeClasses: classesData?.length || 0,
                totalStudents: studentCount
            });

        } catch (error: any) {
            console.error("Error fetching teacher data:", error);
            showError("Error", "Failed to load profile data");
        } finally {
            setLoadingData(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        refreshProfile();
        fetchTeacherData();
    };

    const handleSave = async () => {
        if (!name.trim()) {
            showError("Error", "Name cannot be empty");
            return;
        }

        setSaving(true);
        try {
            const { error } = await authService.updateProfile({
                full_name: name,
                phone: phone
            });

            if (error) throw error;

            await refreshProfile();
            setIsEditing(false);
            showSuccess("Success", "Profile updated successfully");
        } catch (error: any) {
            showError("Error", "Failed to update profile: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (!profile) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    const renderTabButton = (tab: 'overview' | 'subjects' | 'classes', label: string, icon: React.ReactElement) => (
        <TouchableOpacity
            onPress={() => setActiveTab(tab)}
            className={`flex-row items-center px-4 py-2 rounded-full mr-2 ${activeTab === tab ? 'bg-teacherOrange' : 'bg-white border border-gray-200'}`}
        >
            {/* Clone icon with appropriate color */}
            {React.cloneElement(icon, {
                size: 16,
                color: activeTab === tab ? 'white' : '#6b7280'
            } as any)}
            <Text className={`ml-2 font-medium ${activeTab === tab ? 'text-white' : 'text-gray-600'}`}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const renderOverview = () => (
        <View className="mt-4">
            {/* Stats Grid */}
            <View className="flex-row flex-wrap justify-between mb-6 gap-y-4">
                <View className="w-full md:w-[32%] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm items-center">
                    <View className="p-2 bg-blue-50 rounded-full mb-2">
                        <BookOpen size={20} color="#3b82f6" />
                    </View>
                    <Text className="text-2xl font-bold text-gray-900">{stats.totalSubjects}</Text>
                    <Text className="text-xs text-gray-500 font-medium text-center">Subjects</Text>
                </View>
                <View className="w-full md:w-[32%] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm items-center">
                    <View className="p-2 bg-purple-50 rounded-full mb-2">
                        <Layers size={20} color="#a855f7" />
                    </View>
                    <Text className="text-2xl font-bold text-gray-900">{stats.activeClasses}</Text>
                    <Text className="text-xs text-gray-500 font-medium text-center">Classes</Text>
                </View>
                <View className="w-full md:w-[32%] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm items-center">
                    <View className="p-2 bg-orange-50 rounded-full mb-2">
                        <Users size={20} color="#f97316" />
                    </View>
                    <Text className="text-2xl font-bold text-gray-900">{stats.totalStudents}</Text>
                    <Text className="text-xs text-gray-500 font-medium text-center">Students</Text>
                </View>
            </View>

            {/* Info Cards */}
            <View className="flex-row flex-wrap justify-between">
                <View className="w-full md:w-[48%] bg-white p-5 rounded-2xl border border-gray-100 mb-4 shadow-sm">
                    <View className="flex-row items-center mb-4">
                        <View className="p-2 bg-orange-50 rounded-lg">
                            <Briefcase size={20} color="#FF6B00" />
                        </View>
                        <Text className="ml-3 font-semibold text-gray-800">Professional Info</Text>
                    </View>

                    <View className="space-y-3">
                        <View>
                            <Text className="text-xs text-gray-400 uppercase tracking-wider">Teacher ID</Text>
                            <Text className="text-gray-700 font-medium">{displayId || "N/A"}</Text>
                        </View>
                        <View>
                            <Text className="text-xs text-gray-400 uppercase tracking-wider">Institution ID</Text>
                            <Text className="text-gray-700 font-medium">{profile.institution_id || "N/A"}</Text>
                        </View>
                        <View>
                            <Text className="text-xs text-gray-400 uppercase tracking-wider">Joined Date</Text>
                            <Text className="text-gray-700 font-medium">
                                {new Date(profile.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="w-full md:w-[48%] bg-white p-5 rounded-2xl border border-gray-100 mb-4 shadow-sm">
                    <View className="flex-row items-center mb-4">
                        <View className="p-2 bg-blue-50 rounded-lg">
                            <Mail size={20} color="#2563eb" />
                        </View>
                        <Text className="ml-3 font-semibold text-gray-800">Contact</Text>
                    </View>

                    <View className="space-y-3">
                        <View>
                            <Text className="text-xs text-gray-400 uppercase tracking-wider">Email Address</Text>
                            <Text className="text-gray-700 font-medium">{profile.email}</Text>
                        </View>
                        <View className="mt-2">
                            <Text className="text-xs text-gray-400 uppercase tracking-wider">Work Phone</Text>
                            {isEditing ? (
                                <TextInput
                                    value={phone}
                                    onChangeText={setPhone}
                                    placeholder="Enter phone number"
                                    keyboardType="phone-pad"
                                    className="bg-gray-50 text-gray-900 px-3 py-2 rounded-lg border border-gray-200 mt-1"
                                />
                            ) : (
                                <Text className={`text-gray-700 font-medium ${!profile.phone ? 'text-gray-400 italic' : ''}`}>
                                    {profile.phone || "Not set"}
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
            </View>

        </View>
    );

    const renderSubjects = () => (
        <View className="mt-4 pb-8">
            {subjects.length === 0 ? (
                <View className="bg-white p-8 rounded-2xl items-center justify-center border border-gray-100 border-dashed">
                    <BookOpen size={48} color="#e5e7eb" />
                    <Text className="text-gray-400 mt-4 text-center">No subjects assigned yet.</Text>
                </View>
            ) : (
                subjects.map((subject) => (
                    <View key={subject.id} className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm flex-row items-center">
                        <View className="w-12 h-12 bg-orange-100 rounded-xl items-center justify-center mr-4">
                            <BookOpen size={24} color="#FF6B00" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-900 text-lg">{subject.title}</Text>
                            <Text className="text-gray-500 text-sm" numberOfLines={1}>{subject.description || "No description"}</Text>
                        </View>
                        <View className="bg-gray-50 px-3 py-1 rounded-lg">
                            <Text className="text-xs font-bold text-gray-600">{subject.fee_amount ? `$${subject.fee_amount}` : 'Free'}</Text>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderClasses = () => (
        <View className="mt-4 pb-8">
            {classes.length === 0 ? (
                <View className="bg-white p-8 rounded-2xl items-center justify-center border border-gray-100 border-dashed">
                    <Layers size={48} color="#e5e7eb" />
                    <Text className="text-gray-400 mt-4 text-center">No classes created yet.</Text>
                </View>
            ) : (
                classes.map((cls) => (
                    <View key={cls.id} className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm flex-row items-center">
                        <View className="w-12 h-12 bg-purple-100 rounded-xl items-center justify-center mr-4">
                            <Layers size={24} color="#9333ea" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-bold text-gray-900 text-lg">{cls.name}</Text>
                            <Text className="text-gray-500 text-sm">Created: {new Date(cls.created_at).toLocaleDateString()}</Text>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    return (
        <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#FF6B00"]} />
            }
        >
            <View className="p-4 md:p-8 max-w-3xl mx-auto w-full">
                {/* Header section / profile card */}
                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <View className="h-32 bg-teacherOrange rounded-t-3xl relative">
                        {/* Cover pattern or something could go here */}
                        <View className="absolute bottom-0 w-full h-16 bg-gradient-to-t from-black/20 to-transparent" />
                    </View>

                    <View className="px-6 pb-6 mt-[-40px]">
                        <View className="flex-row justify-between items-end">
                            <View className="relative">
                                <View style={{ elevation: 8, zIndex: 10 }} className="p-1 bg-white rounded-2xl shadow-sm">
                                    <Image
                                        source={{ uri: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200' }}
                                        className="w-24 h-24 rounded-xl bg-gray-200"
                                    />
                                </View>
                                {/* Edit Button */}
                                <TouchableOpacity
                                    style={{ elevation: 10, zIndex: 20 }}
                                    activeOpacity={0.8}
                                    onPress={() => isEditing ? handleSave() : setIsEditing(true)}
                                    disabled={saving}
                                    className={`absolute -bottom-2 -right-2 p-2 rounded-full shadow-md border border-gray-100 ${isEditing ? 'bg-green-500' : 'bg-white'}`}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : isEditing ? (
                                        <Save size={16} color='white' />
                                    ) : (
                                        <Edit3 size={16} color='#FF6B00' />
                                    )}
                                </TouchableOpacity>
                            </View>

                            <View className="flex-1 ml-4 mb-1">
                                {isEditing ? (
                                    <TextInput
                                        value={name}
                                        onChangeText={setName}
                                        className="bg-gray-50 text-gray-900 px-3 py-2 rounded-lg text-xl font-bold border border-gray-200"
                                        autoFocus
                                    />
                                ) : (
                                    <Text className="text-2xl font-bold text-gray-900" numberOfLines={1}>
                                        {profile.full_name || "Teacher"}
                                    </Text>
                                )}
                                <Text className="text-gray-500 font-medium capitalize flex-row items-center mt-1">
                                    {profile.role} • {profile.status}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Tabs */}
                <View className="flex-row mb-2">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {renderTabButton('overview', 'Overview', <Briefcase />)}
                        {renderTabButton('subjects', 'Subjects', <BookOpen />)}
                        {renderTabButton('classes', 'Classes', <Layers />)}
                    </ScrollView>
                </View>

                {/* Content */}
                {loadingData && !refreshing ? (
                    <View className="py-10">
                        <ActivityIndicator size="large" color="#FF6B00" />
                    </View>
                ) : (
                    <>
                        {activeTab === 'overview' && renderOverview()}
                        {activeTab === 'subjects' && renderSubjects()}
                        {activeTab === 'classes' && renderClasses()}
                    </>
                )}

            </View>
        </ScrollView>
    );
}
