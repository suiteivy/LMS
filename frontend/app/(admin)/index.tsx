import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView, Alert } from "react-native";
import { supabase } from "@/libs/supabase";
import { router } from "expo-router";
import { AdminDashboardProps, FeeStructure, Payment, User } from "@/types/types";
import { Database } from "@/types/database";
import { DashboardHeader } from "./elements/DashboardHeader";
import { StatsOverview } from "./elements/StatsOverview";
import { RecentUsersSection } from "./elements/RecentUsersSection";
import { UsersTableSection } from "./elements/UsersTableSection";
import { QuickActionsSection } from "./elements/QuickActionsSection";
import { PaymentManagementSection } from "./Bursary/PaymentManagementSection";
import { TeacherPayoutSection } from "./Bursary/TeacherPayoutSection";
import { FeeStructureSection } from "./Bursary/FeeStructureSection";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  statsData = [],
  recentUsers = [],
  allUsers = [],
  payments = [],
  teacherPayouts = [],
  feeStructures = [],
  statsLoading = false,
  usersLoading = false,
  tableLoading = false,
  paymentsLoading = false,
  payoutsLoading = false,
  feeStructuresLoading = false,
  onStatsPress,
  onUserPress,
  onViewAllUsersPress,
  onRefresh: propOnRefresh, // Rename to avoid conflict
  showRecentUsers = true,
  showUsersTable = true,
  showPaymentManagement = true,
  showTeacherPayouts = true,
  showFeeStructure = true,
  maxRecentUsers = 5,
  className = "",
  testID,
}) => {
  const [activeSection, setActiveSection] = useState<
    "overview" | "payments" | "payouts" | "fees"
  >("overview");

  // Local state for users if not provided via props (which seems to be the case mostly)
  const [localUsers, setLocalUsers] = useState<User[]>([]);
  const [localUsersLoading, setLocalUsersLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch real stats using the hook
  const { stats: fetchedStats, loading: statsHookLoading } = useDashboardStats();
  const displayStats = statsData.length > 0 ? statsData : fetchedStats;
  const displayStatsLoading = statsLoading || statsHookLoading;

  const fetchUsers = useCallback(async () => {
    try {
      setLocalUsersLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<Database["public"]["Tables"]["users"]["Row"][]>();

      if (error) {
        throw error;
      }

      if (data) {
        // Transform data to match User interface
        const users = data.map((u) => ({
          id: u.id,
          name: u.full_name,
          email: u.email,
          role: u.role,
          status: u.status,
          joinDate: u.created_at,
        } as User));
        setLocalUsers(users);
      }
    } catch (error: any) {
      Alert.alert("Error fetching users", error.message);
    } finally {
      setLocalUsersLoading(false);
    }
  }, []);

  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({ status: "approved" as const })
        .eq("id", userId);

      if (error) throw error;

      Alert.alert("Success", "User approved successfully");
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      Alert.alert("Error approving user", error.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    // Also re-fetch stats if needed, but the hook doesn't expose a refetch yet.
    // For now, simple component remount or prop update works.
    if (propOnRefresh) await propOnRefresh();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Logout Failed", error.message);
    } else {
      router.replace("/(auth)/signIn");
    }
  };

  const handleQuickActionPress = (actionId: string) => {
    switch (actionId) {
      case "add-user":
        router.push("/(admin)/create-user");
        break;
      case "add-course":
        router.push("/(admin)/CreateCourse");
        break;
      case "library":
        router.push("/(admin)/library/LibraryAction");
        break;
      case "analytics":
        router.push("/(admin)/analytics");
        break;
      case "settings":
        router.push("/(admin)/settings");
        break;
      case "payment-management":
        setActiveSection("payments");
        break;
      case "teacher-payouts":
        setActiveSection("payouts");
        break;
      case "fee-structure":
        setActiveSection("fees");
        break;
      default:
        Alert.alert(
          "Unknown Action",
          `No screen found for action: ${actionId}`
        );
    }
  };

  const handlePaymentSubmit = async (paymentData: Omit<Payment, "id">) => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .insert([paymentData])
        .select();

      if (error) throw error;

      Alert.alert("Success", "Payment recorded successfully");
      onRefresh();
    } catch (error: any) {
      Alert.alert("Error", `Failed to record payment: ${error.message}`);
    }
  };

  const handlePayoutProcess = async (payoutId: string) => {
    try {
      const { error } = await supabase
        .from("teacher_payouts")
        .update({
          status: "processing",
          payment_date: new Date().toISOString(),
        })
        .eq("id", payoutId);

      if (error) throw error;

      Alert.alert("Success", "Payout processing initiated");
      onRefresh();
    } catch (error: any) {
      Alert.alert("Error", `Failed to process payout: ${error.message}`);
    }
  };

  const handleFeeStructureUpdate = async (
    feeStructure: Partial<FeeStructure>
  ) => {
    try {
      const { error } = await supabase
        .from("fee_structures")
        .upsert([feeStructure as any])
        .select();

      if (error) throw error;

      Alert.alert("Success", "Fee structure updated successfully");
      onRefresh();
    } catch (error: any) {
      Alert.alert("Error", `Failed to update fee structure: ${error.message}`);
    }
  };

  // Use localUsers if allUsers (prop) is empty, which is likely since this is the top level page
  const displayUsers = allUsers.length > 0 ? allUsers : localUsers;
  const displayRecentUsers = recentUsers.length > 0 ? recentUsers : localUsers.slice(0, maxRecentUsers);

  return (
    <ScrollView
      className={`flex-1 bg-gray-50 ${className}`}
      testID={testID}
      showsVerticalScrollIndicator={false}
    >
      <View className="p-4">
        <DashboardHeader
          onRefresh={onRefresh}
          onLogout={handleLogout}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {activeSection === "overview" && (
          <>
            <StatsOverview
              statsData={displayStats}
              loading={displayStatsLoading}
              onStatsPress={onStatsPress}
            />

            {showRecentUsers && (
              <RecentUsersSection
                users={displayRecentUsers}
                loading={usersLoading || localUsersLoading}
                maxUsers={maxRecentUsers}
                onUserPress={onUserPress}
                onViewAllPress={onViewAllUsersPress}
              />
            )}

            {showUsersTable && (
              <UsersTableSection
                users={displayUsers}
                loading={tableLoading || localUsersLoading}
                onUserPress={onUserPress}
                onApproveUser={handleApproveUser}
              />
            )}

            <QuickActionsSection onActionPress={handleQuickActionPress} />
          </>
        )}

        {activeSection === "payments" && showPaymentManagement && (
          <PaymentManagementSection
            payments={payments}
            loading={paymentsLoading}
            onPaymentSubmit={handlePaymentSubmit}
            onRefresh={onRefresh}
          />
        )}

        {activeSection === "payouts" && showTeacherPayouts && (
          <TeacherPayoutSection
            payouts={teacherPayouts}
            loading={payoutsLoading}
            onPayoutProcess={handlePayoutProcess}
            onRefresh={onRefresh}
          />
        )}

        {activeSection === "fees" && showFeeStructure && (
          <FeeStructureSection
            feeStructures={feeStructures}
            loading={feeStructuresLoading}
            onFeeStructureUpdate={handleFeeStructureUpdate}
            onRefresh={onRefresh}
          />
        )}
      </View>
    </ScrollView>
  );
};

export default AdminDashboard;
