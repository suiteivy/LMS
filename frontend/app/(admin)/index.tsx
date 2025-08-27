import React, { useState } from "react";
import { View, ScrollView, Alert } from "react-native";
import { supabase } from "@/libs/supabase";
import { router } from "expo-router";
import { AdminDashboardProps, FeeStructure, Payment } from "@/types/types";
import { DashboardHeader } from "./elements/DashboardHeader";
import { StatsOverview } from "./elements/StatsOverview";
import { RecentUsersSection } from "./elements/RecentUsersSection";
import { UsersTableSection } from "./elements/UsersTableSection";
import { QuickActionsSection } from "./elements/QuickActionsSection";
import { PaymentManagementSection } from "./Bursary/PaymentManagementSection";
import { TeacherPayoutSection } from "./Bursary/TeacherPayoutSection";
import { FeeStructureSection } from "./Bursary/ FeeStructureSection";

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
  onRefresh,
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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Logout Failed", error.message);
    } else {
      router.replace("/(auth)/sign");
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
      onRefresh?.();
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
      onRefresh?.();
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
        .upsert([feeStructure])
        .select();

      if (error) throw error;

      Alert.alert("Success", "Fee structure updated successfully");
      onRefresh?.();
    } catch (error: any) {
      Alert.alert("Error", `Failed to update fee structure: ${error.message}`);
    }
  };

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
              statsData={statsData}
              loading={statsLoading}
              onStatsPress={onStatsPress}
            />

            {showRecentUsers && (
              <RecentUsersSection
                users={recentUsers}
                loading={usersLoading}
                maxUsers={maxRecentUsers}
                onUserPress={onUserPress}
                onViewAllPress={onViewAllUsersPress}
              />
            )}

            {showUsersTable && (
              <UsersTableSection
                users={allUsers}
                loading={tableLoading}
                onUserPress={onUserPress}
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
