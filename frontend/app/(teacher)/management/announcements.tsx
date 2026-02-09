import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, TextInput, Modal } from 'react-native';
import { ArrowLeft, Plus, Megaphone, Send, Edit2, Trash2, X, Users, Clock } from 'lucide-react-native';
import { router } from "expo-router";

interface Announcement {
    id: string;
    title: string;
    message: string;
    course: string;
    createdAt: string;
    readCount: number;
    totalStudents: number;
}

const AnnouncementCard = ({ announcement }: { announcement: Announcement }) => {
    return (
        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm">
            <View className="flex-row items-start mb-3">
                <View className="bg-pink-100 p-2 rounded-xl mr-3">
                    <Megaphone size={20} color="#ec4899" />
                </View>
                <View className="flex-1">
                    <Text className="text-gray-900 font-bold text-base">{announcement.title}</Text>
                    <Text className="text-gray-400 text-xs">{announcement.course}</Text>
                </View>
            </View>

            <Text className="text-gray-600 text-sm mb-3" numberOfLines={2}>
                {announcement.message}
            </Text>

            <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                    <Clock size={12} color="#9CA3AF" />
                    <Text className="text-gray-400 text-xs ml-1">{announcement.createdAt}</Text>
                </View>
                <View className="flex-row items-center">
                    <Users size={12} color="#9CA3AF" />
                    <Text className="text-gray-400 text-xs ml-1">
                        {announcement.readCount}/{announcement.totalStudents} read
                    </Text>
                </View>
            </View>

            <View className="flex-row justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
                <TouchableOpacity className="flex-row items-center p-2">
                    <Edit2 size={16} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1 font-medium">Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center p-2">
                    <Trash2 size={16} color="#ef4444" />
                    <Text className="text-red-500 text-xs ml-1 font-medium">Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function AnnouncementsPage() {
    const [showModal, setShowModal] = useState(false);

    const announcements: Announcement[] = [
        {
            id: "1",
            title: "Quiz 1 Postponed",
            message: "Due to the upcoming holiday, Quiz 1 has been rescheduled to February 20th. Please review chapters 3-5 in preparation.",
            course: "Mathematics",
            createdAt: "2 hours ago",
            readCount: 18,
            totalStudents: 25
        },
        {
            id: "2",
            title: "Guest Speaker Next Week",
            message: "We'll have a special guest speaker from Tech Corp discussing career opportunities in software development.",
            course: "Computer Science",
            createdAt: "1 day ago",
            readCount: 25,
            totalStudents: 30
        },
        {
            id: "3",
            title: "Essay Submissions Reminder",
            message: "Please remember to submit your essays by Friday. Late submissions will receive a 10% penalty.",
            course: "Writing Workshop",
            createdAt: "3 days ago",
            readCount: 20,
            totalStudents: 20
        },
    ];

    return (
        <>
            <StatusBar barStyle="dark-content" />
            <View className="flex-1 bg-gray-50">
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <View className="p-4">
                        {/* Header */}
                        <View className="flex-row items-center justify-between mb-6">
                            <View className="flex-row items-center">
                                <TouchableOpacity className="p-2 mr-2" onPress={() => router.back()}>
                                    <ArrowLeft size={24} color="#374151" />
                                </TouchableOpacity>
                                <View>
                                    <Text className="text-2xl font-bold text-gray-900">Announcements</Text>
                                    <Text className="text-gray-500 text-sm">{announcements.length} posted</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                className="flex-row items-center bg-pink-500 px-4 py-2 rounded-xl"
                                onPress={() => setShowModal(true)}
                            >
                                <Plus size={18} color="white" />
                                <Text className="text-white font-semibold ml-1">New</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Announcements List */}
                        {announcements.map((announcement) => (
                            <AnnouncementCard key={announcement.id} announcement={announcement} />
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Create Announcement Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">New Announcement</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900"
                            placeholder="Title"
                            placeholderTextColor="#9CA3AF"
                        />
                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900 h-32"
                            placeholder="Message"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            textAlignVertical="top"
                        />
                        <TouchableOpacity className="bg-gray-50 rounded-xl px-4 py-3 mb-6 flex-row items-center justify-between">
                            <Text className="text-gray-500">Select Course</Text>
                            <Text className="text-teal-600 font-medium">All Courses</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-pink-500 py-4 rounded-xl items-center flex-row justify-center"
                            onPress={() => setShowModal(false)}
                        >
                            <Send size={18} color="white" />
                            <Text className="text-white font-bold text-base ml-2">Post Announcement</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}
