import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { UnifiedHeader } from "@/components/common/UnifiedHeader";
import { SupportService, SupportTicket } from "@/services/SupportService";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LifeBuoy,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  X,
  ChevronDown,
} from "lucide-react-native";

const CATEGORIES = [
  "Academic Inquiry",
  "Fee & Financial Records",
  "Attendance & Leave",
  "Transport & Extracurriculars",
  "Technical & App Issue",
  "General Administrative",
];

const PRIORITIES = [
  { label: "Normal", value: "normal", color: "#3B82F6" },
  { label: "High", value: "high", color: "#F59E0B" },
  { label: "Urgent", value: "critical", color: "#EF4444" },
];

export default function ParentSupportPage() {
  const { isDark } = useTheme();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New ticket modal
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await SupportService.getMyTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[ParentSupport] Error fetching tickets:", err);
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const handleCreateTicket = async () => {
    if (!subject.trim()) {
      Alert.alert("Required Field", "Please enter an inquiry subject.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Required Field", "Please describe your inquiry or issue.");
      return;
    }

    try {
      setSubmitting(true);
      await SupportService.createTicket({
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
      });

      setModalVisible(false);
      setSubject("");
      setDescription("");
      setPriority("normal");
      setCategory(CATEGORIES[0]);
      fetchTickets();
      Alert.alert("Inquiry Submitted", "School administration has received your support ticket.");
    } catch (err: any) {
      console.error("[ParentSupport] Error submitting ticket:", err);
      Alert.alert("Submission Failed", err.message || "Could not submit ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case "resolved":
        return {
          label: "Resolved",
          bg: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5",
          text: "#059669",
          border: "#10B981",
        };
      case "in_progress":
        return {
          label: "In Progress",
          bg: isDark ? "rgba(59, 130, 246, 0.15)" : "#EFF6FF",
          text: "#2563EB",
          border: "#3B82F6",
        };
      case "acknowledged":
        return {
          label: "Acknowledged",
          bg: isDark ? "rgba(245, 158, 11, 0.15)" : "#FFFBEB",
          text: "#D97706",
          border: "#F59E0B",
        };
      default:
        return {
          label: "Pending",
          bg: isDark ? "rgba(107, 114, 128, 0.15)" : "#F3F4F6",
          text: "#4B5563",
          border: "#9CA3AF",
        };
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <View className="flex-1 bg-[#F6F8FA] dark:bg-[#0D1117]">
      <UnifiedHeader
        title="Support & Help Desk"
        subtitle="Parent Inquiries & Requests"
        role="Parent/Guardian"
        onBack={() => router.back()}
        showNotification={false}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />
        }
      >
        <View className="p-4 md:p-6 max-w-4xl mx-auto w-full">
          {/* Support Hero */}
          <View className="bg-[#161B22] p-6 rounded-[28px] shadow-xl mb-6 border border-gray-800 flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[2px] mb-1">
                Direct Administrative Help
              </Text>
              <Text className="text-white text-2xl font-black tracking-tight">
                Help & Inquiries
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                Reach the school administration regarding fees, academic questions, or student welfare.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="bg-[#FF6900] px-4 py-3 rounded-2xl flex-row items-center gap-2 shadow-lg"
            >
              <Plus size={18} color="#FFFFFF" />
              <Text className="text-white font-bold text-xs">New Inquiry</Text>
            </TouchableOpacity>
          </View>

          {/* Ticket List Header */}
          <View className="flex-row justify-between items-center mb-4 px-1">
            <Text className="text-gray-900 dark:text-white font-bold text-lg">
              Your Inquiries ({tickets.length})
            </Text>
          </View>

          {loading ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#FF6900" />
              <Text className="text-gray-400 text-xs font-semibold mt-3">Loading tickets...</Text>
            </View>
          ) : tickets.length === 0 ? (
            <View className="bg-white dark:bg-[#161B22] p-10 rounded-[28px] border border-gray-100 dark:border-gray-800 items-center justify-center shadow-sm">
              <LifeBuoy size={40} color={isDark ? "#4B5563" : "#9CA3AF"} />
              <Text className="text-gray-900 dark:text-white font-bold text-base mt-4">
                No Inquiries Yet
              </Text>
              <Text className="text-gray-400 text-xs text-center mt-1 max-w-xs">
                Need assistance from the school administration or teachers? Tap "New Inquiry" above to submit a ticket.
              </Text>
            </View>
          ) : (
            tickets.map((t) => {
              const badge = getStatusBadge(t.status);
              return (
                <View
                  key={t.id}
                  className="bg-white dark:bg-[#161B22] p-5 rounded-[24px] mb-4 border border-gray-100 dark:border-gray-800 shadow-sm"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center gap-2 mb-1">
                        <View className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                          <Text className="text-gray-600 dark:text-gray-400 text-[10px] font-bold uppercase">
                            {t.category || "General"}
                          </Text>
                        </View>
                        <Text className="text-gray-400 text-[11px] font-medium">
                          {formatDate(t.created_at)}
                        </Text>
                      </View>

                      <Text className="text-gray-900 dark:text-white font-bold text-base tracking-tight">
                        {t.subject}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: badge.bg,
                        borderColor: badge.border,
                        borderWidth: 1,
                      }}
                      className="px-2.5 py-1 rounded-full"
                    >
                      <Text style={{ color: badge.text }} className="text-[10px] font-bold uppercase">
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed mt-1">
                    {t.description}
                  </Text>

                  {t.resolved_at ? (
                    <View className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex-row items-center gap-1.5">
                      <CheckCircle2 size={14} color="#10B981" />
                      <Text className="text-emerald-500 text-[11px] font-medium">
                        Resolved on {formatDate(t.resolved_at)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* New Inquiry Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-end md:justify-center p-0 md:p-4">
          <View className="bg-white dark:bg-[#161B22] rounded-t-[32px] md:rounded-[32px] p-6 max-w-lg w-full mx-auto border border-gray-100 dark:border-gray-800 shadow-2xl">
            <View className="flex-row justify-between items-center mb-5">
              <View>
                <Text className="text-gray-900 dark:text-white font-bold text-lg">
                  Submit Support Inquiry
                </Text>
                <Text className="text-gray-400 text-xs">
                  Direct message to school administration
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-800"
              >
                <X size={18} color={isDark ? "#9CA3AF" : "#4B5563"} />
              </TouchableOpacity>
            </View>

            {/* Subject Input */}
            <View className="mb-4">
              <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                Subject
              </Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="e.g., Question regarding Term 1 Fee Clearance"
                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                className="bg-gray-50 dark:bg-[#0D1117] text-gray-900 dark:text-white px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm"
              />
            </View>

            {/* Category Select */}
            <View className="mb-4">
              <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                Category
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: category === cat ? "#FF6900" : isDark ? "#0D1117" : "#F3F4F6",
                      borderWidth: 1,
                      borderColor: category === cat ? "#FF6900" : isDark ? "#30363D" : "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: category === cat ? "#FFFFFF" : isDark ? "#9CA3AF" : "#4B5563",
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Priority Select */}
            <View className="mb-4">
              <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                Priority
              </Text>
              <View className="flex-row gap-2">
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => setPriority(p.value)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      alignItems: "center",
                      borderRadius: 10,
                      backgroundColor: priority === p.value ? p.color : isDark ? "#0D1117" : "#F3F4F6",
                      borderWidth: 1,
                      borderColor: priority === p.value ? p.color : isDark ? "#30363D" : "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: priority === p.value ? "#FFFFFF" : isDark ? "#9CA3AF" : "#4B5563",
                      }}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description Input */}
            <View className="mb-6">
              <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider mb-1.5">
                Description / Message
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Provide detailed information regarding your inquiry..."
                placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="bg-gray-50 dark:bg-[#0D1117] text-gray-900 dark:text-white px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm min-h-[100px]"
              />
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-gray-800 items-center"
              >
                <Text className="text-gray-600 dark:text-gray-400 font-bold text-sm">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateTicket}
                disabled={submitting}
                className="flex-1 py-3.5 rounded-xl bg-[#FF6900] items-center shadow-md flex-row justify-center gap-2"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-sm">Submit Ticket</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
