import { useTheme } from "@/contexts/ThemeContext";
import { LibraryAPI } from "@/services/LibraryService";
import { LibrarianAuditLogItem, LibrarianStaffItem } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export const LibrarianManagement: React.FC = () => {
    const { isDark } = useTheme();
    const pageBg = isDark ? "#161B22" : "#FFFFFF";
    const cardBg = isDark ? "#161B22" : "#FFFFFF";
    const surfaceBg = isDark ? "#1C2128" : "#F6F8FA";
    const border = isDark ? "#21262D" : "#D0D7DE";
    const textPrimary = isDark ? "#F1F5F9" : "#1E293B";
    const textMuted = isDark ? "#9CA3AF" : "#64748B";

    const [staffList, setStaffList] = useState<LibrarianStaffItem[]>([]);
    const [auditLogs, setAuditLogs] = useState<LibrarianAuditLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState<"all" | "teacher" | "admin">("all");
    const [statusFilter, setStatusFilter] = useState<"all" | "librarian" | "non_librarian">("all");
    const [viewMode, setViewMode] = useState<"staff" | "audit">("staff");

    // Toggle Modal State
    const [toggleModalVisible, setToggleModalVisible] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<LibrarianStaffItem | null>(null);
    const [toggleNotes, setToggleNotes] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [staffData, auditData] = await Promise.all([
                LibraryAPI.getLibrariansList(),
                LibraryAPI.getLibrarianAuditLogs(),
            ]);
            setStaffList(staffData);
            setAuditLogs(auditData);
        } catch (error: any) {
            console.error("Failed to load librarian management data:", error);
            Alert.alert("Error", error.response?.data?.error || "Failed to load librarian staff list.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleOpenToggleModal = (staff: LibrarianStaffItem) => {
        setSelectedStaff(staff);
        setToggleNotes("");
        setToggleModalVisible(true);
    };

    const handleConfirmToggle = async () => {
        if (!selectedStaff) return;
        const newStatus = !selectedStaff.is_librarian;

        try {
            setIsUpdating(true);
            await LibraryAPI.toggleLibrarianDesignation(
                selectedStaff.user_id,
                newStatus ? 'grant' : 'revoke',
                toggleNotes.trim() || undefined
            );

            Alert.alert(
                "Designation Updated",
                `${selectedStaff.full_name} is ${newStatus ? "now designated as a Librarian." : "no longer a Librarian."}`
            );

            setToggleModalVisible(false);
            setSelectedStaff(null);
            setToggleNotes("");
            loadData();
        } catch (error: any) {
            console.error("Failed to toggle librarian designation:", error);
            Alert.alert("Action Failed", error.response?.data?.error || "Failed to update designation.");
        } finally {
            setIsUpdating(false);
        }
    };

    // Filtering
    const filteredStaff = staffList.filter((item) => {
        const matchesSearch =
            item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === "all" || item.role === roleFilter;

        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "librarian" && item.is_librarian) ||
            (statusFilter === "non_librarian" && !item.is_librarian);

        return matchesSearch && matchesRole && matchesStatus;
    });

    const activeLibrariansCount = staffList.filter((s) => s.is_librarian).length;

    return (
        <View style={{ flex: 1, backgroundColor: pageBg }}>
            {/* View Switcher: Staff List vs Audit Trail */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
                <View
                    style={{
                        flexDirection: "row",
                        backgroundColor: surfaceBg,
                        borderRadius: 14,
                        padding: 4,
                        borderWidth: 1,
                        borderColor: border,
                    }}
                >
                    <TouchableOpacity
                        onPress={() => setViewMode("staff")}
                        style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: viewMode === "staff" ? "#FF6900" : "transparent",
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 6,
                        }}
                    >
                        <Ionicons
                            name="people-outline"
                            size={16}
                            color={viewMode === "staff" ? "white" : textMuted}
                        />
                        <Text
                            style={{
                                color: viewMode === "staff" ? "white" : textMuted,
                                fontWeight: "700",
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1,
                            }}
                        >
                            Staff ({activeLibrariansCount} Active)
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setViewMode("audit")}
                        style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: viewMode === "audit" ? "#FF6900" : "transparent",
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 6,
                        }}
                    >
                        <Ionicons
                            name="time-outline"
                            size={16}
                            color={viewMode === "audit" ? "white" : textMuted}
                        />
                        <Text
                            style={{
                                color: viewMode === "audit" ? "white" : textMuted,
                                fontWeight: "700",
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: 1,
                            }}
                        >
                            Audit Trail ({auditLogs.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="large" color="#FF6900" />
                    <Text style={{ marginTop: 12, color: textMuted, fontSize: 13 }}>
                        Loading librarian designations...
                    </Text>
                </View>
            ) : viewMode === "staff" ? (
                /* ================= STAFF DESIGNATIONS TAB ================= */
                <View style={{ flex: 1, paddingHorizontal: 16 }}>
                    {/* Search Input */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: surfaceBg,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: border,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            marginTop: 8,
                            marginBottom: 10,
                        }}
                    >
                        <Ionicons name="search-outline" size={18} color={textMuted} />
                        <TextInput
                            placeholder="Search staff by name or email..."
                            placeholderTextColor={textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={{
                                flex: 1,
                                marginLeft: 8,
                                color: textPrimary,
                                fontSize: 13,
                                fontWeight: "500",
                            }}
                        />
                    </View>

                    {/* Filter Pills */}
                    <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
                        {(["all", "librarian", "non_librarian"] as const).map((filter) => {
                            const active = statusFilter === filter;
                            const label =
                                filter === "all"
                                    ? "All Staff"
                                    : filter === "librarian"
                                    ? "Librarians Only"
                                    : "Non-Librarians";
                            return (
                                <TouchableOpacity
                                    key={filter}
                                    onPress={() => setStatusFilter(filter)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 999,
                                        backgroundColor: active ? "#FF6900" : surfaceBg,
                                        borderWidth: 1,
                                        borderColor: active ? "#FF6900" : border,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            fontWeight: "700",
                                            color: active ? "white" : textMuted,
                                        }}
                                    >
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Staff List */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#FF6900"
                                colors={["#FF6900"]}
                            />
                        }
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >
                        {filteredStaff.length === 0 ? (
                            <View
                                style={{
                                    backgroundColor: surfaceBg,
                                    borderRadius: 24,
                                    padding: 32,
                                    alignItems: "center",
                                    borderWidth: 1,
                                    borderColor: border,
                                    borderStyle: "dashed",
                                    marginTop: 16,
                                }}
                            >
                                <Ionicons name="people-outline" size={40} color={textMuted} style={{ opacity: 0.5 }} />
                                <Text style={{ color: textMuted, fontWeight: "600", marginTop: 12, fontSize: 13 }}>
                                    No staff members match the selected filters
                                </Text>
                            </View>
                        ) : (
                            filteredStaff.map((staff) => (
                                <View
                                    key={staff.user_id}
                                    style={{
                                        backgroundColor: cardBg,
                                        borderRadius: 18,
                                        borderWidth: 1,
                                        borderColor: staff.is_librarian ? "#FF6900" : border,
                                        padding: 16,
                                        marginBottom: 10,
                                    }}
                                >
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <View style={{ flex: 1, paddingRight: 12 }}>
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                                                <Text style={{ fontSize: 15, fontWeight: "700", color: textPrimary }}>
                                                    {staff.full_name}
                                                </Text>
                                                <View
                                                    style={{
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                        borderRadius: 6,
                                                        backgroundColor: staff.role === "admin" ? (isDark ? "rgba(59,130,246,0.2)" : "#dbeafe") : (isDark ? "rgba(107,114,128,0.2)" : "#f3f4f6"),
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 9,
                                                            fontWeight: "700",
                                                            textTransform: "uppercase",
                                                            color: staff.role === "admin" ? "#2563eb" : textMuted,
                                                        }}
                                                    >
                                                        {staff.role} {staff.is_main ? "(Main Admin)" : ""}
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text style={{ fontSize: 12, color: textMuted, marginBottom: 4 }}>
                                                {staff.email}
                                            </Text>

                                            {staff.is_librarian && (
                                                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                                                    <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                                                    <Text style={{ fontSize: 11, color: "#10b981", fontWeight: "600" }}>
                                                        Designated Librarian
                                                        {staff.designated_at ? ` • Since ${new Date(staff.designated_at).toLocaleDateString()}` : ""}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Toggle Action */}
                                        <View style={{ alignItems: "center", justifyContent: "center" }}>
                                            <TouchableOpacity
                                                onPress={() => handleOpenToggleModal(staff)}
                                                style={{
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 8,
                                                    borderRadius: 12,
                                                    backgroundColor: staff.is_librarian
                                                        ? isDark ? "rgba(239,68,68,0.15)" : "#fee2e2"
                                                        : "#FF6900",
                                                    borderWidth: 1,
                                                    borderColor: staff.is_librarian ? "#fca5a5" : "#FF6900",
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: "700",
                                                        textTransform: "uppercase",
                                                        letterSpacing: 0.5,
                                                        color: staff.is_librarian ? "#dc2626" : "white",
                                                    }}
                                                >
                                                    {staff.is_librarian ? "Revoke" : "Designate"}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            ) : (
                /* ================= AUDIT TRAIL TAB ================= */
                <View style={{ flex: 1, paddingHorizontal: 16 }}>
                    <Text style={{ fontSize: 12, color: textMuted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginVertical: 10 }}>
                        Librarian Assignment Audit History
                    </Text>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#FF6900"
                                colors={["#FF6900"]}
                            />
                        }
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >
                        {auditLogs.length === 0 ? (
                            <View
                                style={{
                                    backgroundColor: surfaceBg,
                                    borderRadius: 24,
                                    padding: 32,
                                    alignItems: "center",
                                    borderWidth: 1,
                                    borderColor: border,
                                    borderStyle: "dashed",
                                    marginTop: 16,
                                }}
                            >
                                <Ionicons name="document-text-outline" size={40} color={textMuted} style={{ opacity: 0.5 }} />
                                <Text style={{ color: textMuted, fontWeight: "600", marginTop: 12, fontSize: 13 }}>
                                    No designation changes recorded yet
                                </Text>
                            </View>
                        ) : (
                            auditLogs.map((log) => {
                                const isGrant = log.action === "grant";
                                return (
                                    <View
                                        key={log.id}
                                        style={{
                                            backgroundColor: cardBg,
                                            borderRadius: 16,
                                            borderWidth: 1,
                                            borderColor: border,
                                            padding: 14,
                                            marginBottom: 10,
                                        }}
                                    >
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                            <View
                                                style={{
                                                    paddingHorizontal: 8,
                                                    paddingVertical: 3,
                                                    borderRadius: 6,
                                                    backgroundColor: isGrant
                                                        ? isDark ? "rgba(16,185,129,0.2)" : "#d1fae5"
                                                        : isDark ? "rgba(239,68,68,0.2)" : "#fee2e2",
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: "800",
                                                        textTransform: "uppercase",
                                                        color: isGrant ? "#059669" : "#dc2626",
                                                    }}
                                                >
                                                    {isGrant ? "Granted Librarian" : "Revoked Librarian"}
                                                </Text>
                                            </View>
                                            <Text style={{ fontSize: 11, color: textMuted }}>
                                                {new Date(log.created_at).toLocaleString()}
                                            </Text>
                                        </View>

                                        <Text style={{ fontSize: 14, fontWeight: "600", color: textPrimary, marginBottom: 2 }}>
                                            Target: {log.target?.full_name || "Unknown Staff"} ({log.target?.email || ""})
                                        </Text>

                                        <Text style={{ fontSize: 12, color: textMuted }}>
                                            Performed By: {log.performer?.full_name || "Admin"} ({log.performer?.email || ""})
                                        </Text>

                                        {log.notes ? (
                                            <View style={{ marginTop: 6, backgroundColor: surfaceBg, padding: 8, borderRadius: 8 }}>
                                                <Text style={{ fontSize: 11, color: textPrimary, fontStyle: "italic" }}>
                                                    "{log.notes}"
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
                </View>
            )}

            {/* Confirm Designation Change Modal */}
            <Modal
                visible={toggleModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setToggleModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
                    <View
                        style={{
                            backgroundColor: cardBg,
                            borderTopLeftRadius: 36,
                            borderTopRightRadius: 36,
                            padding: 24,
                            paddingBottom: 40,
                            borderTopWidth: 1,
                            borderColor: border,
                        }}
                    >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <View>
                                <Text style={{ fontSize: 11, color: "#FF6900", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
                                    Librarian Designation
                                </Text>
                                <Text style={{ fontSize: 20, fontWeight: "700", color: textPrimary }}>
                                    {selectedStaff?.is_librarian ? "Revoke Librarian Access" : "Grant Librarian Access"}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setToggleModalVisible(false)}
                                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: surfaceBg, alignItems: "center", justifyContent: "center" }}
                            >
                                <Ionicons name="close" size={20} color={textMuted} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 13, color: textPrimary, lineHeight: 20, marginBottom: 16 }}>
                            {selectedStaff?.is_librarian
                                ? `Are you sure you want to revoke librarian privileges from ${selectedStaff?.full_name}? They will no longer be authorized to issue or return physical books.`
                                : `Are you sure you want to designate ${selectedStaff?.full_name} as a school Librarian? They will receive full authority to issue, return, and inspect book loans at the circulation desk.`}
                        </Text>

                        <Text style={{ fontSize: 11, fontWeight: "700", color: textMuted, textTransform: "uppercase", marginBottom: 6 }}>
                            Audit Reason / Notes (Optional)
                        </Text>
                        <TextInput
                            placeholder="E.g. Term appointment, designated by school administration..."
                            placeholderTextColor={textMuted}
                            value={toggleNotes}
                            onChangeText={setToggleNotes}
                            multiline
                            numberOfLines={3}
                            style={{
                                backgroundColor: surfaceBg,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: border,
                                padding: 12,
                                color: textPrimary,
                                fontSize: 12,
                                minHeight: 70,
                                marginBottom: 20,
                            }}
                        />

                        <TouchableOpacity
                            onPress={handleConfirmToggle}
                            disabled={isUpdating}
                            style={{
                                paddingVertical: 14,
                                borderRadius: 14,
                                backgroundColor: selectedStaff?.is_librarian ? "#dc2626" : "#FF6900",
                                alignItems: "center",
                                marginBottom: 10,
                            }}
                        >
                            {isUpdating ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={{ color: "white", fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                    {selectedStaff?.is_librarian ? "Confirm Revocation" : "Confirm Librarian Designation"}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setToggleModalVisible(false)}
                            style={{ paddingVertical: 10, alignItems: "center" }}
                        >
                            <Text style={{ color: textMuted, fontWeight: "600", fontSize: 12, textTransform: "uppercase" }}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};
