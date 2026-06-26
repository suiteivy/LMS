import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/services/api";
import { showError } from "@/utils/toast";
import { router } from "expo-router";
import { 
    BadgeCent, 
    BarChart3, 
    CheckCircle, 
    HelpCircle, 
    Library, 
    MessageSquare, 
    Users, 
    Zap 
} from "lucide-react-native";
import React, { useState } from "react";
import { 
    ActivityIndicator, 
    Modal, 
    ScrollView, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    View 
} from "react-native";

const ADDON_OPTIONS = [
    { key: 'library', label: 'Digital Library', icon: Library, color: '#FF6B00', desc: 'Manage books, PDFs and student borrowing.' },
    { key: 'messaging', label: 'Messaging + Diary', icon: MessageSquare, color: '#8B5CF6', desc: 'Direct chat, announcements and daily logs.' },
    { key: 'attendance', label: 'Attendance Management', icon: Users, color: '#EC4899', desc: 'Advanced student and teacher tracking.' },
    { key: 'feature_request', label: 'Feature Request', icon: Zap, color: '#F59E0B', desc: 'Describe a new feature or modification you need.' },
    { key: 'finance', label: 'Accounting Plus', icon: BadgeCent, color: '#10B981', desc: 'Advanced financial reports and fee tracking.' },
    { key: 'analytics', label: 'Performance Analytics', icon: BarChart3, color: '#3B82F6', desc: 'Student progress and visual data insights.' },
    { key: 'bursary', label: 'Bursary Module', icon: HelpCircle, color: '#F59E0B', desc: 'Financial aid tracking and disbursements.' },
];

export default function RequestFeaturePage() {
    const { isDark } = useTheme();
    const { 
        addonMessaging, 
        addonLibrary, 
        addonFinance, 
        addonAnalytics, 
        addonBursary 
    } = useAuth();

    const currentAddons: Record<string, boolean> = {
        library: addonLibrary,
        messaging: addonMessaging,
        finance: addonFinance,
        analytics: addonAnalytics,
        bursary: addonBursary,
    };

    const [selectedAddon, setSelectedAddon] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!selectedAddon) return;

        setLoading(true);
        try {
            await api.post('/addon-requests/submit', {
                addon_type: selectedAddon,
                notes: notes
            });
            setSuccess(true);
        } catch (error: any) {
            console.error('Error submitting addon request:', error);
            showError('Request Failed', error.response?.data?.error || 'Could not submit your request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        router.back();
    };

    return (
        <View className="flex-1 bg-[#FFFFFF] dark:bg-[#161B22]">
            <UnifiedHeader 
                title="Request Feature"
                subtitle="Enhance Your Institution"
                role="Admin"
                onBack={handleBack}
            />

            <ScrollView 
                className="flex-1" 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
            >
                <Text className="text-gray-900 dark:text-white font-black text-xl mb-2 tracking-tight">Expand Your Platform</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-sm mb-8 leading-5">
                    {"Select a module or feature you'd like to add to your institution. Our team will review and get in touch."}
                </Text>

                <View className="gap-4">
                    {ADDON_OPTIONS.map((item) => {
                        const isOwned = Boolean(currentAddons?.[item.key]);
                        const isSelected = selectedAddon === item.key;
                        const Icon = item.icon;

                        return (
                            <TouchableOpacity
                                key={item.key}
                                onPress={() => !isOwned && setSelectedAddon(item.key)}
                                disabled={isOwned}
                                className={`flex-row items-center p-5 rounded-xl border-2 ${
                                    isSelected 
                                    ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10' 
                                    : 'border-[#D0D7DE] dark:border-[#21262D] bg-[#FFFFFF] dark:bg-[#161B22]'
                                } ${isOwned ? 'opacity-50' : ''}`}
                                style={{
                                    boxShadow: isSelected ? [{ offsetX: 0, offsetY: 4, blurRadius: 10, color: 'rgba(255, 105, 0, 0.1)' }] : [],
                                    shadowColor: isSelected ? "#FF6900" : "transparent",
                                    elevation: isSelected ? 4 : 0
                                }}
                            >
                                <View 
                                    className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                                    style={{ backgroundColor: `${item.color}15` }}
                                >
                                    <Icon size={24} color={isOwned ? '#9CA3AF' : item.color} />
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-center gap-2">
                                        <Text className={`font-bold text-base ${isOwned ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                            {item.label}
                                        </Text>
                                        {isOwned && (
                                            <View className="bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg">
                                                <Text className="text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase">Active</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text className="text-gray-500 dark:text-gray-400 text-xs mt-1" numberOfLines={2}>
                                        {item.desc}
                                    </Text>
                                </View>
                                {!isOwned && (
                                    <View 
                                        className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                                            isSelected ? 'border-orange-500' : 'border-[#D0D7DE] dark:border-[#21262D]'
                                        }`}
                                    >
                                        {isSelected && <View className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View className="mt-10">
                    <Text className="text-gray-900 dark:text-white font-bold text-sm mb-3 ml-1 uppercase tracking-widest">Additional Requirements</Text>
                    <TextInput
                        className="bg-gray-50 dark:bg-[#161B22] border border-[#D0D7DE] dark:border-[#21262D] rounded-xl p-5 text-gray-900 dark:text-white text-base min-h-[120]"
                        placeholder="Describe any specific needs or custom modifications..."
                        placeholderTextColor="#9CA3AF"
                        multiline
                        textAlignVertical="top"
                        value={notes}
                        onChangeText={setNotes}
                    />
                </View>

                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading || !selectedAddon}
                    className={`mt-10 py-5 rounded-[24px] flex-row justify-center items-center ${
                        selectedAddon ? 'bg-orange-500 shadow-lg shadow-orange-500/30' : 'bg-gray-200 dark:bg-[#161B22]'
                    }`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white font-black text-lg">Submit Request</Text>
                    )}
                </TouchableOpacity>

                <Text className="text-gray-400 text-[10px] text-center mt-6 uppercase tracking-widest font-bold">
                    Terms and conditions apply
                </Text>
            </ScrollView>

            {/* Success Modal */}
            <Modal visible={success} transparent animationType="fade">
                <View className="flex-1 bg-black/60 items-center justify-center p-6">
                    <View className="bg-[#FFFFFF] dark:bg-[#161B22] w-full max-w-sm rounded-xl p-10 items-center border border-[#D0D7DE] dark:border-[#21262D]">
                        <View className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 rounded-full items-center justify-center mb-8">
                            <CheckCircle size={48} color="#10B981" />
                        </View>
                        <Text className="text-gray-900 dark:text-white font-black text-2xl text-center mb-4 tracking-tighter">
                            Request Received!
                        </Text>
                        <Text className="text-gray-400 dark:text-gray-500 text-sm text-center leading-6 mb-10">
                            {"Thank you for your request, we'll keep in touch. Your requested features will be reviewed and added soon."}
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                setSuccess(false);
                                router.back();
                            }}
                            className="bg-gray-900 dark:bg-white w-full py-4 rounded-xl items-center"
                        >
                            <Text className="text-white dark:text-gray-900 font-bold text-base">Back to Dashboard</Text>
                        </TouchableOpacity>
                        <Text className="text-gray-300 dark:text-gray-600 text-[8px] font-bold uppercase tracking-widest mt-6">
                            Terms and conditions apply
                        </Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
