import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authService } from "@/libs/supabase";
import { Spinner } from "@/components/ui/Spinner";
import { ParentService } from "@/services/ParentService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  Calendar,
  ChevronRight,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  User,
  UserCircle,
  Users
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {DatePicker} from '@/components/common/DatePicker';

interface LinkedStudent {
  id: string;
  grade_level: string | null;
  users: {
    first_name: string;
    last_name: string;
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
  class_name?: string;
  class_id?: string | null;
}

export default function ParentProfile() {
  const { profile, refreshProfile } = useAuth();
  const { isDark } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [dob, setDob] = useState(profile?.date_of_birth || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const DatePicker = require('@/components/common/DatePicker').default;

  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhone(profile.phone || "");
      setGender(profile.gender || "");
      setDob(profile.date_of_birth || "");
      setAddress(profile.address || "");
    }
  }, [profile]);

  useEffect(() => {
    fetchLinkedStudents();
  }, []);

  const fetchLinkedStudents = async () => {
    try {
      setLoadingStudents(true);
      const data = await ParentService.getLinkedStudents();
      setLinkedStudents(data || []);
    } catch (error) {
      console.error("Error fetching linked students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshProfile();
    await fetchLinkedStudents();
    setRefreshing(false);
  };

  const handleUpdateProfile = async () => {
    if (!firstName.trim()) return Alert.alert("Error", "First name cannot be empty");
    setSaving(true);
    try {
      const { error } = await authService.updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        gender: (gender as any) || null,
        date_of_birth: dob || null,
        address: address || null,
      });
      if (error) throw error;
      await refreshProfile();
      await fetchLinkedStudents();
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectChild = async (student: LinkedStudent) => {
    try {
      await AsyncStorage.setItem('parent_active_student_id', student.id);
      router.push("/(parent)" as any);
    } catch (error) {
      console.error("Error selecting child:", error);
    }
  };

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-navy">
        <Spinner size="large" color="#FF6B00" label="Loading profile" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-navy">
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
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <UserCircle size={80} color={isDark ? "#374151" : "#F3F4F6"} />
              )}
            </View>
          </View>

          <Text className="text-gray-900 dark:text-white text-3xl font-black tracking-tighter mt-6 text-center">
            {profile?.first_name} {profile?.last_name}
          </Text>
          <View className="bg-[#FF6900]/10 px-4 py-1.5 rounded-full mt-2 border border-[#FF6900]/20 self-center">
            <Text className="text-[#FF6900] text-[10px] font-black uppercase tracking-[2px]">
              Parent/Guardian · ID: {profile?.id?.slice(0, 8)}
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View className="px-6 pb-32">
          <View className="bg-white dark:bg-[#1a1a1a] rounded-[48px] p-8 shadow-xl border border-gray-100 dark:border-gray-800">
            {/* Section Header */}
            <View className="flex-row items-center mb-10">
              <View className="bg-[#FF6900] w-1.5 h-6 rounded-full mr-4 shadow-sm" />
              <Text className="text-gray-900 dark:text-white font-black text-2xl tracking-tight uppercase">
                Personal Profile
              </Text>
            </View>

            <View>
              <View className="flex-row justify-between items-center mb-8">
                <Text className="text-gray-900 dark:text-white font-black text-xl tracking-tighter">
                  Core Information
                </Text>
                <TouchableOpacity
                  onPress={() => setIsEditing(!isEditing)}
                  className="bg-orange-50 dark:bg-orange-950/30 px-5 py-2.5 rounded-2xl border border-orange-100 dark:border-orange-900/30"
                >
                  <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-widest">
                    {isEditing ? 'Cancel' : 'Modify'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isEditing ? (
                <View className="bg-gray-50 dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 mb-8">
                  <InfoInput label="First Name" value={firstName} onChange={setFirstName} icon={User} isDark={isDark} />
                  <InfoInput label="Last Name" value={lastName} onChange={setLastName} icon={User} isDark={isDark} />
                  <InfoInput label="Contact Number" value={phone} onChange={setPhone} icon={Phone} isDark={isDark} />
                   <InfoInput label="Residential Address" value={address} onChange={setAddress} icon={MapPin} isDark={isDark} />
                   <View className="mb-6">
                     <Text className="text-sm font-semibold text-gray-700 mb-2">Date of Birth</Text>
                     <View className="bg-gray-50 dark:bg-navy border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 shadow-sm">
                       <DatePicker
                         label="Date of Birth"
                         value={dob}
                         onChange={setDob}
                         isDark={isDark}
                         inline={true}
                       />
                     </View>
                   </View>

                  {/* Gender Selector */}
                  <View className="mb-6">
                    <Text className="text-gray-400 dark:text-gray-500 text-[8px] font-bold uppercase tracking-widest mb-2 ml-1">
                      Gender
                    </Text>
                    <View className="flex-row gap-2">
                      {(['male', 'female', 'other'] as const).map((option) => (
                        <TouchableOpacity
                          key={option}
                          onPress={() => setGender(option)}
                          className={`flex-1 py-3 rounded-2xl border items-center ${
                            gender === option
                              ? 'bg-orange-50 dark:bg-orange-950/30 border-[#FF6900]'
                              : 'bg-white dark:bg-navy border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <Text className={`font-bold text-xs capitalize ${
                            gender === option ? 'text-[#FF6900]' : 'text-gray-500'
                          }`}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TouchableOpacity
                    className="bg-[#FF6900] py-4 rounded-2xl items-center mt-4 shadow-lg shadow-orange-500/20"
                    onPress={handleUpdateProfile}
                    disabled={saving}
                  >
                    {saving ? (
                      <Spinner color="white" label="Saving profile" />
                    ) : (
                      <Text className="text-white font-black text-xs uppercase tracking-[2px]">
                        Save Changes
                      </Text>
                    )}
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

            {/* Children Overview Section */}
            <View className="mt-12 pt-12 border-t border-gray-50 dark:border-gray-800">
              <View className="flex-row items-center mb-8">
                <View className="bg-purple-500 w-1.5 h-6 rounded-full mr-4 shadow-sm" />
                <Text className="text-gray-900 dark:text-white font-black text-xl tracking-tight uppercase">
                  Linked Children
                </Text>
              </View>

              {loadingStudents ? (
                <Spinner size="small" color="#FF6900" className="my-6" label="Loading linked children" />
              ) : linkedStudents.length === 0 ? (
                <View className="items-center justify-center py-8 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                  <Users size={32} color="#D1D5DB" />
                  <Text className="text-gray-400 dark:text-gray-500 mt-2 font-medium">
                    No linked children found
                  </Text>
                </View>
              ) : (
                linkedStudents.map((student) => (
                  <TouchableOpacity
                    key={student.id}
                    onPress={() => handleSelectChild(student)}
                    className="bg-gray-50 dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 mb-3 active:opacity-70"
                  >
                    <View className="flex-row items-center">
                      <View className="w-14 h-14 rounded-2xl bg-white dark:bg-navy items-center justify-center border border-gray-100 dark:border-gray-800 overflow-hidden mr-4">
                        {student.users?.avatar_url ? (
                          <Image
                            source={{ uri: student.users.avatar_url }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Text className="text-gray-400 text-xl font-bold">
                            {student.users?.first_name?.charAt(0) || '?'}
                          </Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight">
                          {student.users?.full_name || 'Unknown'}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-1">
                          <View className="bg-purple-50 dark:bg-purple-950/20 px-2 py-0.5 rounded-lg">
                            <Text className="text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                              {student.class_name || 'Unassigned'}
                            </Text>
                          </View>
                          {student.grade_level && (
                            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold">
                              Grade {student.grade_level}
                            </Text>
                          )}
                        </View>
                      </View>
                      <ChevronRight size={18} color="#9ca3af" />
                    </View>
                  </TouchableOpacity>
                ))
              )}
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
    <View className="flex-row items-center bg-white dark:bg-navy border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 shadow-sm">
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
