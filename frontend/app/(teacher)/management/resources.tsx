import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Modal } from 'react-native';
import { ArrowLeft, Plus, FileText, Video, File, Image, Download, Trash2, X, Upload, FolderOpen } from 'lucide-react-native';
import { router } from "expo-router";

interface Resource {
    id: string;
    name: string;
    type: "pdf" | "video" | "document" | "image";
    course: string;
    size: string;
    uploadedAt: string;
}

const ResourceCard = ({ resource }: { resource: Resource }) => {
    const getTypeIcon = (type: string) => {
        if (type === "pdf") return { icon: FileText, color: "#ef4444", bg: "#fee2e2" };
        if (type === "video") return { icon: Video, color: "#8b5cf6", bg: "#ede9fe" };
        if (type === "image") return { icon: Image, color: "#22c55e", bg: "#dcfce7" };
        return { icon: File, color: "#3b82f6", bg: "#dbeafe" };
    };

    const typeInfo = getTypeIcon(resource.type);
    const IconComponent = typeInfo.icon;

    return (
        <View className="bg-white p-4 rounded-xl border border-gray-100 mb-2 flex-row items-center">
            <View style={{ backgroundColor: typeInfo.bg }} className="w-10 h-10 rounded-xl items-center justify-center mr-3">
                <IconComponent size={20} color={typeInfo.color} />
            </View>
            <View className="flex-1">
                <Text className="text-gray-900 font-semibold" numberOfLines={1}>{resource.name}</Text>
                <Text className="text-gray-400 text-xs">{resource.course} • {resource.size}</Text>
            </View>
            <View className="flex-row gap-2">
                <TouchableOpacity className="p-2">
                    <Download size={18} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity className="p-2">
                    <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function ResourcesPage() {
    const [showModal, setShowModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState("All Courses");

    const resources: Resource[] = [
        { id: "1", name: "Algebra Fundamentals.pdf", type: "pdf", course: "Mathematics", size: "2.4 MB", uploadedAt: "2 days ago" },
        { id: "2", name: "Lecture 1 - Introduction.mp4", type: "video", course: "Computer Science", size: "156 MB", uploadedAt: "1 week ago" },
        { id: "3", name: "Writing Guidelines.docx", type: "document", course: "Writing Workshop", size: "540 KB", uploadedAt: "3 days ago" },
        { id: "4", name: "Course Syllabus.pdf", type: "pdf", course: "Digital Literacy", size: "890 KB", uploadedAt: "2 weeks ago" },
        { id: "5", name: "Lab Setup Instructions.pdf", type: "pdf", course: "Computer Science", size: "1.2 MB", uploadedAt: "5 days ago" },
        { id: "6", name: "Class Photo.jpg", type: "image", course: "Writing Workshop", size: "3.8 MB", uploadedAt: "1 day ago" },
    ];

    const totalSize = "164.8 MB";
    const totalFiles = resources.length;

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
                                    <Text className="text-2xl font-bold text-gray-900">Resources</Text>
                                    <Text className="text-gray-500 text-sm">{totalFiles} files • {totalSize}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                className="flex-row items-center bg-yellow-500 px-4 py-2 rounded-xl"
                                onPress={() => setShowModal(true)}
                            >
                                <Upload size={18} color="white" />
                                <Text className="text-white font-semibold ml-1">Upload</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Storage Info */}
                        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-6">
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-gray-900 font-bold">Storage Used</Text>
                                <Text className="text-gray-500 text-sm">164.8 MB / 5 GB</Text>
                            </View>
                            <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <View className="h-full bg-yellow-500 rounded-full" style={{ width: "3.3%" }} />
                            </View>
                        </View>

                        {/* Quick Filters */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                            <TouchableOpacity className="bg-teal-600 px-4 py-2 rounded-full mr-2">
                                <Text className="text-white font-medium text-sm">All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="bg-white px-4 py-2 rounded-full mr-2 border border-gray-100">
                                <Text className="text-gray-600 font-medium text-sm">PDFs</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="bg-white px-4 py-2 rounded-full mr-2 border border-gray-100">
                                <Text className="text-gray-600 font-medium text-sm">Videos</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="bg-white px-4 py-2 rounded-full mr-2 border border-gray-100">
                                <Text className="text-gray-600 font-medium text-sm">Documents</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="bg-white px-4 py-2 rounded-full border border-gray-100">
                                <Text className="text-gray-600 font-medium text-sm">Images</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Resources List */}
                        <Text className="text-lg font-bold text-gray-900 mb-3">All Files</Text>
                        {resources.map((resource) => (
                            <ResourceCard key={resource.id} resource={resource} />
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Upload Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Upload Resource</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity className="border-2 border-dashed border-gray-300 rounded-2xl p-8 items-center mb-6">
                            <View className="bg-yellow-100 p-4 rounded-full mb-3">
                                <FolderOpen size={32} color="#eab308" />
                            </View>
                            <Text className="text-gray-900 font-bold mb-1">Choose File</Text>
                            <Text className="text-gray-500 text-sm">PDF, Video, or Document</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="bg-gray-50 rounded-xl px-4 py-3 mb-6 flex-row items-center justify-between">
                            <Text className="text-gray-500">Select Course</Text>
                            <Text className="text-teal-600 font-medium">Mathematics</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="bg-yellow-500 py-4 rounded-xl items-center"
                            onPress={() => setShowModal(false)}
                        >
                            <Text className="text-white font-bold text-base">Upload File</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}
