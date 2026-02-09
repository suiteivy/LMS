import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, TextInput, Modal } from 'react-native';
import { ArrowLeft, Plus, FileText, Calendar, Clock, Users, Eye, Edit2, Trash2, X } from 'lucide-react-native';
import { router } from "expo-router";

interface Assignment {
    id: string;
    title: string;
    course: string;
    dueDate: string;
    submissions: number;
    totalStudents: number;
    status: "active" | "draft" | "closed";
}

const AssignmentCard = ({ assignment }: { assignment: Assignment }) => {
    const getStatusStyle = (status: string) => {
        if (status === "active") return "bg-green-50 text-green-600 border-green-100";
        if (status === "draft") return "bg-gray-50 text-gray-600 border-gray-200";
        return "bg-red-50 text-red-600 border-red-100";
    };

    const progressPercent = (assignment.submissions / assignment.totalStudents) * 100;

    return (
        <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-3 shadow-sm">
            <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-3">
                    <Text className="text-gray-900 font-bold text-base">{assignment.title}</Text>
                    <Text className="text-gray-400 text-xs mt-0.5">{assignment.course}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full border ${getStatusStyle(assignment.status)}`}>
                    <Text className={`text-xs font-bold ${getStatusStyle(assignment.status).split(' ')[1]}`}>
                        {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                    </Text>
                </View>
            </View>

            <View className="flex-row mb-3">
                <View className="flex-row items-center mr-4">
                    <Calendar size={14} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1">{assignment.dueDate}</Text>
                </View>
                <View className="flex-row items-center">
                    <Users size={14} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1">
                        {assignment.submissions}/{assignment.totalStudents} submitted
                    </Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                <View className="h-full bg-teal-500 rounded-full" style={{ width: `${progressPercent}%` }} />
            </View>

            {/* Actions */}
            <View className="flex-row justify-end gap-3">
                <TouchableOpacity className="flex-row items-center p-2">
                    <Eye size={16} color="#6B7280" />
                    <Text className="text-gray-500 text-xs ml-1 font-medium">View</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center p-2">
                    <Edit2 size={16} color="#0d9488" />
                    <Text className="text-teal-600 text-xs ml-1 font-medium">Edit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function AssignmentsPage() {
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState<"all" | "active" | "draft" | "closed">("all");

    const assignments: Assignment[] = [
        { id: "1", title: "Quiz 1: Basic Algebra", course: "Mathematics", dueDate: "Feb 15, 2026", submissions: 18, totalStudents: 25, status: "active" },
        { id: "2", title: "Essay: My Favorite Book", course: "Writing Workshop", dueDate: "Feb 20, 2026", submissions: 12, totalStudents: 20, status: "active" },
        { id: "3", title: "Lab Report: Variables", course: "Computer Science", dueDate: "Feb 10, 2026", submissions: 30, totalStudents: 30, status: "closed" },
        { id: "4", title: "Project: Simple Calculator", course: "Computer Science", dueDate: "Mar 1, 2026", submissions: 0, totalStudents: 30, status: "draft" },
        { id: "5", title: "Reading Comprehension Test", course: "Digital Literacy", dueDate: "Feb 18, 2026", submissions: 8, totalStudents: 15, status: "active" },
    ];

    const filteredAssignments = filter === "all"
        ? assignments
        : assignments.filter(a => a.status === filter);

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
                                <Text className="text-2xl font-bold text-gray-900">Assignments</Text>
                            </View>
                            <TouchableOpacity
                                className="flex-row items-center bg-teal-600 px-4 py-2 rounded-xl"
                                onPress={() => setShowModal(true)}
                            >
                                <Plus size={18} color="white" />
                                <Text className="text-white font-semibold ml-1">New</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Stats */}
                        <View className="flex-row gap-3 mb-6">
                            <View className="flex-1 bg-teal-600 p-3 rounded-xl">
                                <Text className="text-teal-100 text-xs uppercase">Active</Text>
                                <Text className="text-white text-xl font-bold">
                                    {assignments.filter(a => a.status === "active").length}
                                </Text>
                            </View>
                            <View className="flex-1 bg-white p-3 rounded-xl border border-gray-100">
                                <Text className="text-gray-400 text-xs uppercase">Submissions</Text>
                                <Text className="text-gray-900 text-xl font-bold">
                                    {assignments.reduce((acc, a) => acc + a.submissions, 0)}
                                </Text>
                            </View>
                        </View>

                        {/* Filter Tabs */}
                        <View className="flex-row bg-white rounded-xl p-1 mb-4 border border-gray-100">
                            {(["all", "active", "draft", "closed"] as const).map((tab) => (
                                <TouchableOpacity
                                    key={tab}
                                    className={`flex-1 py-2 rounded-lg ${filter === tab ? "bg-teal-600" : ""}`}
                                    onPress={() => setFilter(tab)}
                                >
                                    <Text className={`text-center font-medium text-xs ${filter === tab ? "text-white" : "text-gray-500"}`}>
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Assignment List */}
                        {filteredAssignments.map((assignment) => (
                            <AssignmentCard key={assignment.id} assignment={assignment} />
                        ))}
                    </View>
                </ScrollView>
            </View>

            {/* Create Assignment Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-gray-900">Create Assignment</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900"
                            placeholder="Assignment Title"
                            placeholderTextColor="#9CA3AF"
                        />
                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900 h-24"
                            placeholder="Description"
                            placeholderTextColor="#9CA3AF"
                            multiline
                            textAlignVertical="top"
                        />
                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-gray-900"
                            placeholder="Due Date (e.g., Feb 20, 2026)"
                            placeholderTextColor="#9CA3AF"
                        />
                        <TextInput
                            className="bg-gray-50 rounded-xl px-4 py-3 mb-6 text-gray-900"
                            placeholder="Max Points (e.g., 100)"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                        />

                        <TouchableOpacity
                            className="bg-teal-600 py-4 rounded-xl items-center"
                            onPress={() => setShowModal(false)}
                        >
                            <Text className="text-white font-bold text-base">Create Assignment</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}
