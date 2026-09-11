import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { ListItemSkeleton } from "@/components/ui/skeletons";
import { useAuth } from "@/contexts/AuthContext";
import Toast from 'react-native-toast-message';
import { ResourceAPI, Resource } from "@/services/ResourceService";
import { SubjectAPI } from "@/services/SubjectService";
import { supabase } from "@/libs/supabase";
import { decode } from "base64-arraybuffer";
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from "expo-router";
import { 
    CheckCircle2, Clock, Download, File as FileIcon, FileText, Image, 
    Link as LinkIcon, Trash2, Upload, Video, X, Lock, Globe, 
    ArrowRight, ArrowLeft, Check, Layers, BookOpen, ShieldAlert
} from 'lucide-react-native';
import React, { useEffect, useState, useMemo } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View, Platform, Linking } from 'react-native';
import { DocumentPickerAsset } from 'expo-document-picker';

const ResourceCard = ({ 
    resource, 
    onDelete 
}: { 
    resource: Resource; 
    onDelete: (id: string) => void 
}) => {
    const getTypeIcon = (type: string) => {
        if (type === "pdf") return { icon: FileText, color: "#ef4444", bg: "#fee2e2" };
        if (type === "video") return { icon: Video, color: "#8b5cf6", bg: "#ede9fe" };
        if (type === "image") return { icon: Image, color: "#22c55e", bg: "#dcfce7" };
        if (type === "link") return { icon: LinkIcon, color: "#3b82f6", bg: "#dbeafe" };
        return { icon: FileIcon, color: "#9ca3af", bg: "#f3f4f6" };
    };

    const isStaffOnly = resource.target_audience === 'staff_only';
    const typeInfo = getTypeIcon(resource.type);
    const IconComponent = typeInfo.icon;

    const handleDownload = async () => {
        if (!resource.url) return;
        try {
            if (Platform.OS === 'web') {
                window.open(resource.url, '_blank');
            } else {
                const supported = await Linking.canOpenURL(resource.url);
                if (supported) {
                    await Linking.openURL(resource.url);
                } else {
                    Alert.alert("Open Resource", `Opening ${resource.url}`);
                }
            }
        } catch (err) {
            console.error("Error opening resource:", err);
            Alert.alert("Error", "Could not open resource link");
        }
    };

    return (
        <View className="bg-white dark:bg-[#161B22] p-5 rounded-2xl border border-gray-100 dark:border-white/10 mb-4 shadow-sm">
            <View className="flex-row items-center">
                <View style={{ backgroundColor: typeInfo.bg }} className="w-12 h-12 rounded-2xl items-center justify-center mr-4">
                    <IconComponent size={22} color={typeInfo.color} />
                </View>
                <View className="flex-1 pr-2">
                    <Text className="text-gray-900 dark:text-white font-bold text-base leading-tight" numberOfLines={1}>
                        {resource.title}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-1.5 flex-wrap">
                        <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                            {resource.Subject_title || "General"} {resource.Class_name ? `• ${resource.Class_name}` : ''}
                        </Text>
                        <View className={`flex-row items-center px-2 py-0.5 rounded-full ${isStaffOnly ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-blue-50 dark:bg-blue-950/30'}`}>
                            {isStaffOnly ? <Lock size={9} color="#D97706" /> : <Globe size={9} color="#2563EB" />}
                            <Text className={`text-[9px] font-bold uppercase tracking-wider ml-1 ${isStaffOnly ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'}`}>
                                {isStaffOnly ? 'Staff Only' : 'Everyone'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="flex-row gap-2">
                    <TouchableOpacity 
                        className="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded-xl items-center justify-center" 
                        onPress={handleDownload}
                        activeOpacity={0.7}
                    >
                        <Download size={18} color="#FF6900" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-xl items-center justify-center" 
                        onPress={() => onDelete(resource.id)}
                        activeOpacity={0.7}
                    >
                        <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default function ResourcesPage() {
    const { teacherId, isDemo } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [modalStep, setModalStep] = useState<1 | 2 | 3 | 4>(1);
    const [loading, setLoading] = useState(true);
    const [resources, setResources] = useState<Resource[]>([]);
    const [Subjects, setSubjects] = useState<{ id: string; title: string; class_id?: string }[]>([]);
    const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
    const [filterAudience, setFilterAudience] = useState<"all" | "everyone" | "staff_only">("all");

    // Dependent Form State
    const [title, setTitle] = useState("");
    const [type, setType] = useState<"link" | "pdf" | "video" | "doc" | "other">("pdf");
    const [targetAudience, setTargetAudience] = useState<"everyone" | "staff_only">("everyone");
    const [url, setUrl] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedFile, setSelectedFile] = useState<DocumentPickerAsset | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (teacherId) {
            fetchResources();
            fetchSubjectsAndClasses();
        }
    }, [teacherId]);

    const fetchSubjectsAndClasses = async () => {
        try {
            const data = await SubjectAPI.getFilteredSubjects();
            if (data) {
                setSubjects(data);
                const { data: classRows } = await supabase.from('classes').select('id, display_name').order('display_name');
                if (classRows) {
                    setClasses(classRows.map((c: any) => ({ id: c.id, name: c.display_name || 'Class' })));
                }
            }
        } catch (error) {
            console.error("Failed to fetch subjects and classes:", error);
        }
    };

    const fetchResources = async () => {
        setLoading(true);
        try {
            const data = await ResourceAPI.getResources();
            setResources(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredResources = useMemo(() => {
        if (filterAudience === "all") return resources;
        return resources.filter(r => r.target_audience === filterAudience);
    }, [resources, filterAudience]);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            if (result.assets && result.assets.length > 0) {
                setSelectedFile(result.assets[0]);
                if (!title) {
                    // Pre-fill title from filename
                    setTitle(result.assets[0].name.replace(/\.[^/.]+$/, ""));
                }
            }
        } catch (err) {
            console.error("Error picking document:", err);
            Alert.alert("Error", "Failed to select document");
        }
    };

    const resetForm = () => {
        setTitle("");
        setUrl("");
        setType("pdf");
        setTargetAudience("everyone");
        setSelectedSubjectId("");
        setSelectedClassId("");
        setSelectedFile(null);
        setModalStep(1);
    };

    const validateStep = (step: number): boolean => {
        if (step === 1) {
            return true; // Type and Audience always have defaults
        } else if (step === 2) {
            if (type === 'link' || type === 'video') {
                if (!url.trim()) {
                    Alert.alert("Validation", "Please enter a valid URL");
                    return false;
                }
            } else {
                if (!selectedFile && !url.trim()) {
                    Alert.alert("Validation", "Please select a file to upload or enter a link");
                    return false;
                }
            }
        } else if (step === 3) {
            if (!selectedSubjectId && !selectedClassId) {
                Alert.alert("Validation", "Please select at least a Subject or a Class to categorize this resource");
                return false;
            }
        }
        return true;
    };

    const handleAddResource = async () => {
        if (!title.trim()) {
            Alert.alert("Validation", "Please provide a resource title");
            return;
        }

        setUploading(true);
        try {
            let finalUrl = url.trim();

            // Handle file upload if picked
            if (selectedFile) {
                try {
                    const fileExt = selectedFile.name.split('.').pop();
                    const filePath = `vault/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const file = new File(selectedFile.uri);
                    const base64 = await file.base64();
                    const fileBody = decode(base64);

                    const { error: uploadError } = await supabase.storage
                        .from('course_materials')
                        .upload(filePath, fileBody, {
                            contentType: selectedFile.mimeType || 'application/octet-stream',
                        });

                    if (uploadError) {
                        console.error('[handleAddResource] Storage upload error:', uploadError);
                        Alert.alert("Upload Error", "Failed to upload file to storage.");
                        setUploading(false);
                        return;
                    }

                    const { data: urlData } = supabase.storage
                        .from('course_materials')
                        .getPublicUrl(filePath);
                    finalUrl = urlData.publicUrl;
                } catch (upErr) {
                    console.error("Upload error:", upErr);
                    Alert.alert("Error", "Could not process file upload");
                    setUploading(false);
                    return;
                }
            }

            if (isDemo) {
                const newResource: Resource = {
                    id: Math.random().toString(),
                    title: title.trim(),
                    url: finalUrl,
                    type,
                    target_audience: targetAudience,
                    subject_id: selectedSubjectId || null,
                    class_id: selectedClassId || null,
                    size: selectedFile?.size || null,
                    created_at: new Date().toISOString(),
                    teacher_id: teacherId || "",
                    status: "approved",
                    institution_id: ""
                } as any;
                newResource.Subject_title = Subjects.find(s => s.id === selectedSubjectId)?.title || "General";
                newResource.Class_name = classes.find(c => c.id === selectedClassId)?.name;
                setResources(prev => [newResource, ...prev]);
                setShowModal(false);
                resetForm();
                Toast.show({
                    type: 'success',
                    text1: 'Academic Vault',
                    text2: 'Resource published successfully'
                });
                return;
            }

            await ResourceAPI.createResource({
                subject_id: selectedSubjectId || undefined,
                class_id: selectedClassId || undefined,
                title: title.trim(),
                url: finalUrl,
                type,
                target_audience: targetAudience,
                size: selectedFile?.size || null
            } as any);

            setShowModal(false);
            fetchResources();
            resetForm();
            Toast.show({
                type: 'success',
                text1: 'Resource Added',
                text2: targetAudience === 'staff_only' ? 'Visible to staff only' : 'Published to all students & staff'
            });
        } catch (error) {
            Alert.alert("Error", "Failed to add resource to Academic Vault");
        } finally {
            setUploading(false);
        }
    };

    const deleteResource = async (id: string) => {
        if (isDemo) {
            setResources(prev => prev.filter(r => r.id !== id));
            Toast.show({
                type: 'success',
                text1: 'Done',
                text2: 'Resource deleted.'
            });
            return;
        }
        try {
            await ResourceAPI.deleteResource(id);
            setResources(prev => prev.filter(r => r.id !== id));
            Toast.show({
                type: 'success',
                text1: 'Deleted',
                text2: 'Resource removed from Academic Vault.'
            });
        } catch (error) {
            Alert.alert("Error", "Failed to delete resource");
        }
    };

    return (
        <View className="flex-1 bg-[#F6F8FA] dark:bg-[#161B22]">
            <UnifiedHeader
                title="Academic"
                subtitle="Academic Vault"
                role="Teacher"
                fallbackPath="/(teacher)/management"
            />
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View className="p-4 md:p-8">
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-6 px-1">
                        <View>
                            <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">
                                {filteredResources.length} vault items
                            </Text>
                            <Text className="text-xs text-gray-500 mt-0.5">Digital Learning Materials & Resources</Text>
                        </View>
                        <TouchableOpacity
                            className="flex-row items-center bg-[#FF6900] px-4 py-2.5 rounded-xl shadow-sm active:opacity-80"
                            onPress={() => { resetForm(); setShowModal(true); }}
                        >
                            <Upload size={16} color="white" />
                            <Text className="text-white font-bold text-xs ml-2 uppercase tracking-widest">Add Resource</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Filter Audience Tabs */}
                    <View className="flex-row bg-white dark:bg-[#161B22] rounded-2xl p-1.5 mb-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                        {[
                            { id: "all", label: "All Items" },
                            { id: "everyone", label: "Everyone (Students & Staff)" },
                            { id: "staff_only", label: "Staff Only" }
                        ].map((tab) => (
                            <TouchableOpacity
                                key={tab.id}
                                className={`flex-1 py-2 rounded-xl items-center ${filterAudience === tab.id ? "bg-[#FF6900]" : "bg-transparent"}`}
                                onPress={() => setFilterAudience(tab.id as any)}
                                activeOpacity={0.7}
                            >
                                <Text className={`font-bold text-xs ${filterAudience === tab.id ? "text-white" : "text-gray-500 dark:text-gray-400"}`}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {loading ? (
                        <ListItemSkeleton loading={loading} count={4} label="Loading Academic Vault..." />
                    ) : filteredResources.length === 0 ? (
                        <View className="bg-white dark:bg-[#161B22] p-12 rounded-3xl items-center border border-gray-100 dark:border-white/10 border-dashed">
                            <FileIcon size={48} color="#E5E7EB" />
                            <Text className="text-gray-400 font-bold text-center mt-4 tracking-tight">No resources found in this category.</Text>
                        </View>
                    ) : (
                        filteredResources.map((resource) => (
                            <ResourceCard key={resource.id} resource={resource} onDelete={deleteResource} />
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Dependent Multistep Resource Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View className="flex-1 bg-black/60 justify-end">
                    <View className="bg-white dark:bg-[#161B22] rounded-t-3xl p-6 h-[85%] border-t border-[#D0D7DE] dark:border-[#21262D]">
                        
                        {/* Header */}
                        <View className="flex-row justify-between items-center mb-3">
                            <View>
                                <Text className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Add to Academic Vault</Text>
                                <Text className="text-xs text-gray-400">Step {modalStep} of 4</Text>
                            </View>
                            <TouchableOpacity
                                className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-full items-center justify-center"
                                onPress={() => { setShowModal(false); resetForm(); }}
                            >
                                <X size={18} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Step Bar */}
                        <View className="flex-row gap-1.5 mb-5">
                            {[1, 2, 3, 4].map(step => (
                                <View 
                                    key={step} 
                                    className={`h-1.5 flex-1 rounded-full ${step <= modalStep ? 'bg-[#FF6900]' : 'bg-gray-200 dark:bg-gray-800'}`} 
                                />
                            ))}
                        </View>

                        <ScrollView 
                            style={{ flex: 1 }} 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 25 }}
                        >
                            {/* STEP 1: TYPE & AUDIENCE */}
                            {modalStep === 1 && (
                                <View>
                                    <Text className="text-base font-bold text-gray-900 dark:text-white mb-1">Step 1: Resource Type & Target Audience</Text>
                                    <Text className="text-xs text-gray-400 mb-5">Determine what kind of material you are sharing and who should have access.</Text>

                                    {/* Resource Type Selection */}
                                    <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2.5">Resource Format</Text>
                                    <View className="flex-row flex-wrap gap-2 mb-6">
                                        {[
                                            { id: 'pdf', label: 'PDF Document' },
                                            { id: 'doc', label: 'Word / Office Document' },
                                            { id: 'video', label: 'Video Lecture / Media' },
                                            { id: 'link', label: 'Web Link / Tool' },
                                            { id: 'other', label: 'Other File' }
                                        ].map(item => {
                                            const isSelected = type === item.id;
                                            return (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    onPress={() => setType(item.id as any)}
                                                    activeOpacity={0.7}
                                                    className={`px-3.5 py-2.5 rounded-xl border ${isSelected ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-gray-50 dark:bg-[#0D1117] border-[#D0D7DE] dark:border-[#21262D]'}`}
                                                >
                                                    <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-300'}`}>
                                                        {item.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* Target Audience */}
                                    <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2.5">Target Audience Control</Text>
                                    <View className="gap-2.5">
                                        <TouchableOpacity
                                            onPress={() => setTargetAudience('everyone')}
                                            activeOpacity={0.7}
                                            className={`p-3.5 rounded-2xl border flex-row items-center ${targetAudience === 'everyone' ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-500' : 'bg-gray-50 dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                                        >
                                            <View className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-3">
                                                <Globe size={20} color="#2563EB" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="font-bold text-sm text-gray-900 dark:text-white">Everyone</Text>
                                                <Text className="text-xs text-gray-500">Accessible by all enrolled students, parents, and teachers.</Text>
                                            </View>
                                            {targetAudience === 'everyone' ? <Check size={18} color="#2563EB" /> : null}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => setTargetAudience('staff_only')}
                                            activeOpacity={0.7}
                                            className={`p-3.5 rounded-2xl border flex-row items-center ${targetAudience === 'staff_only' ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-500' : 'bg-gray-50 dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                                        >
                                            <View className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 items-center justify-center mr-3">
                                                <Lock size={20} color="#D97706" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="font-bold text-sm text-gray-900 dark:text-white">Staff Only</Text>
                                                <Text className="text-xs text-gray-500">Restricted to teachers and administrators (e.g. marking schemes, guides).</Text>
                                            </View>
                                            {targetAudience === 'staff_only' ? <Check size={18} color="#D97706" /> : null}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* STEP 2: CONTENT DEPENDENT ON STEP 1 */}
                            {modalStep === 2 && (
                                <View>
                                    <Text className="text-base font-bold text-gray-900 dark:text-white mb-1">
                                        Step 2: {type === 'link' || type === 'video' ? 'Provide Resource Link' : 'Upload File'}
                                    </Text>
                                    <Text className="text-xs text-gray-400 mb-5">
                                        {type === 'link' || type === 'video' 
                                            ? 'Enter the destination URL or embed link.' 
                                            : 'Select the original document file from your device.'
                                        }
                                    </Text>

                                    {type === 'link' || type === 'video' ? (
                                        <View className="mb-4">
                                            <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">URL Link *</Text>
                                            <TextInput
                                                className="bg-gray-50 dark:bg-[#0D1117] rounded-xl px-4 py-3.5 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800"
                                                placeholder="https://example.com/lecture or YouTube link"
                                                placeholderTextColor="#9CA3AF"
                                                autoCapitalize="none"
                                                value={url}
                                                onChangeText={setUrl}
                                            />
                                        </View>
                                    ) : (
                                        <View className="mb-4">
                                            <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Select File *</Text>
                                            <TouchableOpacity
                                                onPress={pickDocument}
                                                activeOpacity={0.7}
                                                className={`flex-row items-center justify-center border-dashed border-2 rounded-2xl p-6 ${selectedFile ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#0D1117]'}`}
                                            >
                                                {selectedFile ? (
                                                    <View className="items-center">
                                                        <FileText size={26} color="#10B981" />
                                                        <Text className="text-green-900 dark:text-green-400 font-bold mt-2 text-center text-xs">{selectedFile.name}</Text>
                                                        <Text className="text-green-600 text-[10px] mt-0.5">Click to choose a different file</Text>
                                                    </View>
                                                ) : (
                                                    <View className="items-center">
                                                        <Upload size={24} color="#9CA3AF" />
                                                        <Text className="text-gray-900 dark:text-white font-bold mt-2 text-xs">Pick {type.toUpperCase()} from Device</Text>
                                                        <Text className="text-gray-400 text-[10px] mt-0.5">Preserves original file format</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>

                                            <View className="mt-4">
                                                <Text className="text-gray-500 text-[11px] mb-1 font-semibold">Or enter an external file URL:</Text>
                                                <TextInput
                                                    className="bg-gray-50 dark:bg-[#0D1117] rounded-xl px-4 py-2.5 text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-800 text-xs"
                                                    placeholder="Optional external link URL"
                                                    placeholderTextColor="#9CA3AF"
                                                    autoCapitalize="none"
                                                    value={url}
                                                    onChangeText={setUrl}
                                                />
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* STEP 3: SCOPING (CLASS & SUBJECT) */}
                            {modalStep === 3 && (
                                <View>
                                    <Text className="text-base font-bold text-gray-900 dark:text-white mb-1">Step 3: Academic Scoping</Text>
                                    <Text className="text-xs text-gray-400 mb-5">Select which class or subject this resource belongs to.</Text>

                                    {/* Class Level */}
                                    <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2.5">Class / Level</Text>
                                    <View className="flex-row flex-wrap gap-2 mb-5">
                                        <TouchableOpacity
                                            onPress={() => setSelectedClassId("")}
                                            activeOpacity={0.7}
                                            className={`px-3 py-2 rounded-xl border ${!selectedClassId ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-gray-50 dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                                        >
                                            <Text className={`text-xs font-bold ${!selectedClassId ? 'text-white' : 'text-gray-800 dark:text-gray-300'}`}>
                                                All Classes
                                            </Text>
                                        </TouchableOpacity>
                                        {classes.map(c => {
                                            const isSelected = selectedClassId === c.id;
                                            return (
                                                <TouchableOpacity
                                                    key={c.id}
                                                    onPress={() => setSelectedClassId(c.id)}
                                                    activeOpacity={0.7}
                                                    className={`px-3 py-2 rounded-xl border ${isSelected ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-gray-50 dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                                                >
                                                    <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-300'}`}>
                                                        {c.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    {/* Subject */}
                                    <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2.5">Subject</Text>
                                    <View className="flex-row flex-wrap gap-2 mb-4">
                                        <TouchableOpacity
                                            onPress={() => setSelectedSubjectId("")}
                                            activeOpacity={0.7}
                                            className={`px-3 py-2 rounded-xl border ${!selectedSubjectId ? 'bg-orange-500 border-orange-500' : 'bg-gray-50 dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                                        >
                                            <Text className={`text-xs font-bold ${!selectedSubjectId ? 'text-white' : 'text-gray-800 dark:text-gray-300'}`}>
                                                General / Non-Subject
                                            </Text>
                                        </TouchableOpacity>
                                        {Subjects.map(s => {
                                            const isSelected = selectedSubjectId === s.id;
                                            return (
                                                <TouchableOpacity
                                                    key={s.id}
                                                    onPress={() => setSelectedSubjectId(s.id)}
                                                    activeOpacity={0.7}
                                                    className={`px-3 py-2 rounded-xl border ${isSelected ? 'bg-orange-500 border-orange-500' : 'bg-gray-50 dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                                                >
                                                    <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-300'}`}>
                                                        {s.title}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {/* STEP 4: METADATA & CONFIRMATION */}
                            {modalStep === 4 && (
                                <View>
                                    <Text className="text-base font-bold text-gray-900 dark:text-white mb-1">Step 4: Title & Review</Text>
                                    <Text className="text-xs text-gray-400 mb-5">Give your resource a title and verify the configuration before publishing.</Text>

                                    <View className="mb-4">
                                        <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">Resource Title *</Text>
                                        <TextInput
                                            className="bg-gray-50 dark:bg-[#0D1117] rounded-xl px-4 py-3 text-gray-900 dark:text-white font-bold border border-gray-200 dark:border-gray-800"
                                            placeholder="e.g. Physics Formula Cheat Sheet"
                                            placeholderTextColor="#9CA3AF"
                                            value={title}
                                            onChangeText={setTitle}
                                        />
                                    </View>

                                    {/* Review Card */}
                                    <View className="bg-gray-50 dark:bg-[#0D1117] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 mb-4">
                                        <Text className="text-xs font-bold uppercase tracking-wider text-[#FF6900] mb-3">Summary Overview</Text>
                                        <View className="gap-2">
                                            <View className="flex-row justify-between">
                                                <Text className="text-xs text-gray-500">Format:</Text>
                                                <Text className="text-xs font-bold text-gray-900 dark:text-white uppercase">{type}</Text>
                                            </View>
                                            <View className="flex-row justify-between">
                                                <Text className="text-xs text-gray-500">Audience:</Text>
                                                <Text className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {targetAudience === 'staff_only' ? 'Staff Only (Restricted)' : 'Everyone'}
                                                </Text>
                                            </View>
                                            <View className="flex-row justify-between">
                                                <Text className="text-xs text-gray-500">Target Level:</Text>
                                                <Text className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {classes.find(c => c.id === selectedClassId)?.name || 'All Classes'}
                                                </Text>
                                            </View>
                                            <View className="flex-row justify-between">
                                                <Text className="text-xs text-gray-500">Subject:</Text>
                                                <Text className="text-xs font-bold text-gray-900 dark:text-white">
                                                    {Subjects.find(s => s.id === selectedSubjectId)?.title || 'General'}
                                                </Text>
                                            </View>
                                            {selectedFile ? (
                                                <View className="flex-row justify-between">
                                                    <Text className="text-xs text-gray-500">Attached File:</Text>
                                                    <Text className="text-xs font-bold text-green-600 dark:text-green-400" numberOfLines={1}>
                                                        {selectedFile.name}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        {/* Navigation */}
                        <View className="flex-row justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-800">
                            {modalStep > 1 ? (
                                <TouchableOpacity
                                    onPress={() => setModalStep((modalStep - 1) as any)}
                                    activeOpacity={0.7}
                                    className="flex-row items-center px-4 py-3 bg-gray-100 dark:bg-white/5 rounded-xl"
                                >
                                    <ArrowLeft size={16} color="#6B7280" />
                                    <Text className="text-gray-700 dark:text-gray-300 font-bold text-xs ml-1.5 uppercase tracking-wider">Back</Text>
                                </TouchableOpacity>
                            ) : (
                                <View />
                            )}

                            {modalStep < 4 ? (
                                <TouchableOpacity
                                    onPress={() => {
                                        if (validateStep(modalStep)) {
                                            setModalStep((modalStep + 1) as any);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                    className="flex-row items-center px-6 py-3 bg-[#FF6900] rounded-xl"
                                >
                                    <Text className="text-white font-bold text-xs mr-1.5 uppercase tracking-wider">Next</Text>
                                    <ArrowRight size={16} color="white" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={handleAddResource}
                                    disabled={uploading}
                                    activeOpacity={0.7}
                                    className={`flex-row items-center px-6 py-3 bg-green-600 rounded-xl ${uploading ? 'opacity-70' : ''}`}
                                >
                                    {uploading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} color="white" />
                                            <Text className="text-white font-bold text-xs ml-2 uppercase tracking-wider">Publish Resource</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
