import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authService, supabase } from "@/libs/supabase";
import { Database } from "@/types/database";
import { showError, showSuccess } from "@/utils/toast";
import { BookOpen, Calendar, Camera, GraduationCap, Layers, Mail, MapPin, Phone, User, UserCircle, Users } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

type Subject = Database['public']['Tables']['subjects']['Row'];
type Class = Database['public']['Tables']['classes']['Row'];

export default function TeacherProfile() {
    const { profile, user, refreshProfile, teacherId } = useAuth();
    const { isDark } = useTheme();
    const [isEditing, setIsEditing] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [phone, setPhone] = useState(profile?.phone || "");
    const [gender, setGender] = useState(profile?.gender || "");
    const [dob, setDob] = useState(profile?.date_of_birth || "");
    const [address, setAddress] = useState(profile?.address || "");
    const [saving, setSaving] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [stats, setStats] = useState({
        totalSubjects: 0,
        activeClasses: 0,
        totalStudents: 0
    });
    const [teacherDetails, setTeacherDetails] = useState<{ department: string | null; hire_date: string | null }>({
        department: null,
        hire_date: null
    });

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || "");
            setPhone(profile.phone || "");
            setGender(profile.gender || "");
            setDob(profile.date_of_birth || "");
            setAddress(profile.address || "");
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
            const { data: subjectsData, error: subjectsError } = await supabase
                .from('subjects')
                .select('*')
                .eq('teacher_id', teacherId)
                .returns<Subject[]>();

            if (subjectsError) throw subjectsError;

            const { data: classesData, error: classesError } = await supabase
                .from('classes')
                .select('*')
                .eq('teacher_id', teacherId)
                .returns<Class[]>();

            if (classesError) throw classesError;

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

            // Fetch Teacher Details
            const { data: teacherData, error: teacherError } = await supabase
                .from('teachers')
                .select('department, hire_date')
                .eq('id', teacherId)
                .single();

            if (!teacherError && teacherData) {
                setTeacherDetails({
                    department: teacherData.department,
                    hire_date: teacherData.hire_date
                });
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

    const handleUpdateProfile = async () => {
        if (!fullName.trim()) {
            showError("Error", "Name cannot be empty");
            return;
        }

        setSaving(true);
        try {
            const { error } = await authService.updateProfile({
                full_name: fullName,
                phone: phone || null,
                gender: (gender as any) || null,
                date_of_birth: dob || null,
                address: address || null,
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
            <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-black">
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 dark:bg-black">
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6900" />
                }
            >
                {/* Profile Info Section */}
                <View className="items-center mt-8 mb-4">
                    <View className="relative">
                        <View className="w-32 h-32 rounded-[40px] bg-white dark:bg-gray-800 items-center justify-center border-4 border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden">
                            <UserCircle size={80} color={isDark ? "#374151" : "#F3F4F6"} />
                        </View>
                        <TouchableOpacity className="absolute -bottom-2 -right-2 bg-[#FF6900] p-3 rounded-2xl shadow-lg border-2 border-gray-50 dark:border-gray-900">
                            <Camera size={18} color="white" />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-gray-900 dark:text-white text-3xl font-black tracking-tighter mt-6 text-center">{profile?.full_name}</Text>
                    <View className="bg-[#FF6900]/10 px-4 py-1.5 rounded-full mt-2 border border-[#FF6900]/20 self-center">
                        <Text className="text-[#FF6900] text-[10px] font-black uppercase tracking-[2px]">Faculty Member • ID: {teacherId?.slice(0, 8)}</Text>
                    </View>
                </View>

                {/* Main Content */}
                <View className="px-6 pb-32">
                    <View className="bg-white dark:bg-[#1a1a1a] rounded-[48px] p-8 shadow-xl border border-gray-100 dark:border-gray-800">
                        {/* Section Header */}
                        <View className="flex-row items-center mb-10">
                            <View className="bg-[#FF6900] w-1.5 h-6 rounded-full mr-4 shadow-sm" />
                            <Text className="text-gray-900 dark:text-white font-black text-2xl tracking-tight uppercase">Professional Identity</Text>
                        </View>

                        <View>
                            <View className="flex-row justify-between items-center mb-8">
                                <Text className="text-gray-900 dark:text-white font-black text-xl tracking-tighter">Core Information</Text>
                                <TouchableOpacity
                                    onPress={() => setIsEditing(!isEditing)}
                                    className="bg-orange-50 dark:bg-orange-950/30 px-5 py-2.5 rounded-2xl border border-orange-100 dark:border-orange-900/30"
                                >
                                    <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-widest">{isEditing ? 'Cancel' : 'Modify'}</Text>
                                </TouchableOpacity>
                            </View>

                            {isEditing ? (
                                <View className="bg-gray-50 dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 mb-8">
                                    <InfoInput label="Full Name" value={fullName} onChange={setFullName} icon={User} isDark={isDark} />
                                    <InfoInput label="Contact Number" value={phone} onChange={setPhone} icon={Phone} isDark={isDark} />
                                    <InfoInput label="Staff Address" value={address} onChange={setAddress} icon={MapPin} isDark={isDark} />
                                    <TouchableOpacity className="bg-[#FF6900] py-4 rounded-2xl items-center mt-4 shadow-lg shadow-orange-500/20" onPress={handleUpdateProfile} disabled={saving}>
                                        {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-xs uppercase tracking-[2px]">Save Changes</Text>}
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View>
                                    <InfoRow label="Email Identity" value={profile?.email || 'N/A'} icon={Mail} color="#6366f1" isDark={isDark} />
                                    <InfoRow label="Contact Line" value={profile?.phone || 'Not listed'} icon={Phone} color="#10b981" isDark={isDark} />
                                    <InfoRow label="Residence" value={profile?.address || 'Not listed'} icon={MapPin} color="#f59e0b" isDark={isDark} />
                                    <View className="h-px bg-gray-50 dark:border-gray-800 my-6" />
                                    <View className="flex-row gap-4">
                                        <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mb-1">Gender</Text>
                                            <Text className="text-gray-900 dark:text-white font-bold capitalize">{profile?.gender || 'N/A'}</Text>
                                        </View>
                                        <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <Text className="text-gray-400 text-[8px] font-bold uppercase tracking-widest mb-1">Birth Date</Text>
                                            <Text className="text-gray-900 dark:text-white font-bold">{profile?.date_of_birth || 'N/A'}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Academic Experience Section */}
                        <View className="mt-12 pt-12 border-t border-gray-50 dark:border-gray-800">
                            <View className="flex-row items-center mb-8">
                                <View className="bg-purple-500 w-1.5 h-6 rounded-full mr-4 shadow-sm" />
                                <Text className="text-gray-900 dark:text-white font-black text-xl tracking-tight uppercase">Academic Credentials</Text>
                            </View>
                            <View>
                                <InfoRow label="Department" value={teacherDetails.department || 'General Faculty'} icon={GraduationCap} color="#ec4899" isDark={isDark} />
                                <InfoRow label="Hire Date" value={teacherDetails.hire_date || 'N/A'} icon={Calendar} color="#8b5cf6" isDark={isDark} />
                                <InfoRow label="Total Subjects" value={stats.totalSubjects.toString()} icon={BookOpen} color="#3b82f6" isDark={isDark} />
                                <InfoRow label="Active Classes" value={stats.activeClasses.toString()} icon={Layers} color="#10b981" isDark={isDark} />
                                <InfoRow label="Total Students" value={stats.totalStudents.toString()} icon={Users} color="#f59e0b" isDark={isDark} />
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const InfoRow = ({ label, value, icon: Icon, color, isDark }: any) => (
    <View className="flex-row items-center mb-6">
        <View className="w-12 h-12 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : `${color}10` }}>
            <Icon size={20} color={color} />
        </View>
        <View className="flex-1">
            <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-0.5">{label}</Text>
            <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight" numberOfLines={1}>{value}</Text>
        </View>
    </View>
);

const InfoInput = ({ label, value, onChange, icon: Icon, isDark }: any) => (
    <View className="mb-6">
        <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-2 ml-1">{label}</Text>
        <View className="flex-row items-center bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 shadow-sm">
            <Icon size={16} color={isDark ? "#4B5563" : "#9CA3AF"} />
            <TextInput
                className="flex-1 ml-3 text-gray-900 dark:text-white font-bold text-xs"
                value={value}
                onChangeText={onChange}
                placeholder={`Enter ${label.toLowerCase()}`}
                placeholderTextColor={isDark ? "#4B5563" : "#D1D5DB"}
            />
        </View>
    </View>
);
