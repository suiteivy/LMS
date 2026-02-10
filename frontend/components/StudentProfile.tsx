import { BookOpen, Edit3, GraduationCap, Mail, Save, X } from "lucide-react-native";
import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/libs/supabase";

export default function StudentProfile() {
    const { profile, user, refreshProfile, displayId } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(profile?.full_name || "");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile?.full_name) {
            setName(profile.full_name);
        }
    }, [profile]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Name cannot be empty");
            return;
        }

        setSaving(true);
        try {
            const { error } = await authService.updateProfile({
                full_name: name
            });

            if (error) throw error;

            await refreshProfile();
            setIsEditing(false);
            Alert.alert("Success", "Profile updated successfully");
        } catch (error: any) {
            Alert.alert("Error", "Failed to update profile: " + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (!profile) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0d9488" />
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-4 md:p-8 max-w-3xl mx-auto w-full">
                {/* Header section / profile card */}
                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <View className="h-auto bg-teal-500 rounded-t-3xl">
                        <View className="px-6 pb-6 flex-row justify-between items-end mt-4">
                            <View className="flex-1 pb-2">
                                {isEditing ? (
                                    <View className="flex-row items-center">
                                        <TextInput
                                            value={name}
                                            onChangeText={setName}
                                            className="bg-white text-gray-900 px-3 py-2 rounded-lg text-xl font-bold flex-1 mr-2"
                                            autoFocus
                                        />
                                    </View>
                                ) : (
                                    <Text className="text-2xl font-bold text-gray-900">
                                        {profile.full_name || "Student"}
                                    </Text>
                                )}

                                <Text className="text-white font-medium capitalize">
                                    {profile.role}
                                </Text>
                                <View className="flex-row items-center mt-2 bg-teal-50 self-start px-3 py-1 rounded-full">
                                    <View className={`w-2 h-2 rounded-full mr-2 ${profile.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                    <Text className={`text-xs font-bold uppercase ${profile.status === 'approved' ? 'text-green-700' : 'text-yellow-700'}`}>
                                        {profile.status}
                                    </Text>
                                </View>
                            </View>

                            <View className="relative">
                                <View style={{ elevation: 8, zIndex: 10 }}>
                                    <Image
                                        source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200' }}
                                        className="w-24 h-24 rounded-2xl border-4 border-white bg-gray-200"
                                    />
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
                                            <Save size={18} color='white' />
                                        ) : (
                                            <Edit3 size={18} color='#0d9488' />
                                        )}
                                    </TouchableOpacity>
                                    {isEditing && (
                                        <TouchableOpacity
                                            style={{ elevation: 10, zIndex: 20 }}
                                            activeOpacity={0.8}
                                            onPress={() => {
                                                setIsEditing(false);
                                                setName(profile.full_name);
                                            }}
                                            className="absolute -bottom-2 -left-2 bg-red-100 p-2 rounded-full shadow-md border border-red-50"
                                        >
                                            <X size={18} color='#ef4444' />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>

                    <View className="mt-6 flex-row flex-wrap justify-between">
                        <View className="w-full md:w-[48%] bg-white p-5 rounded-2xl border border-gray-100 mb-4 shadow-sm">
                            <View className="flex-row items-center mb-4">
                                <View className="p-2 bg-teal-50 rounded-lg">
                                    <GraduationCap size={20} color="#0d9488" />
                                </View>
                                <Text className="ml-3 font-semibold text-gray-800">
                                    Academic Info
                                </Text>
                            </View>

                            <View className="space-y-3">
                                <View>
                                    <Text className="text-xs text-gray-400 uppercase tracking-wider">
                                        Student ID
                                    </Text>
                                    <Text className="text-gray-700 font-medium" numberOfLines={1}>
                                        {displayId || "N/A"}
                                    </Text>
                                </View>
                                <View>
                                    <Text className="text-xs text-gray-400 uppercase tracking-wider">Institution ID</Text>
                                    <Text className="text-gray-700 font-medium"> {profile.institution_id || "N/A"}</Text>
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
                                    <Text className="text-gray-700 font-medium">
                                        {profile.email}
                                    </Text>
                                </View>
                                <View className="mt-2">
                                    <Text className="text-xs text-gray-400 uppercase tracking-wider">
                                        Phone
                                    </Text>
                                    <Text className="text-gray-700 font-medium">
                                        N/A
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Subjects section */}
                        <View className="mt-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-row items-center">
                                    <BookOpen size={20} color="#0d9488" />
                                    <Text className="ml-3 font-semibold text-gray-800">Registered Subjects</Text>
                                </View>
                                <Text className="text-teal-600 text-sm font-bold"></Text>
                            </View>

                            <View className="border-t border-gray-50 pt-2">
                                {['Advanced React Native', 'UI/UX Design Systems', 'DBMS'].map((Subject, index) =>
                                    <View key={index} className="py-3 border-b border-gray-50 last:border-0 flex-row items-center">
                                        <View className="w-2 h-2 rounded-full bg-teal-400 mr-3" />
                                        <Text className="text-gray-600">{Subject}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
