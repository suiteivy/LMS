import React from "react";
import { View, ScrollView, Alert } from "react-native";
import { supabase } from "@/libs/supabase";
import { router } from "expo-router";
import { BaseComponentProps, StatsData, User } from "@/types/types";
import { DashboardHeader } from "./elements/DashboardHeader";
import { StatsOverview } from "./elements/StatsOverview";
import { RecentUsersSection } from "./elements/RecentUsersSection";
import { UsersTableSection } from "./elements/UsersTableSection";
import { QuickActionsSection } from "./elements/QuickActionsSection";

interface AdminDashboardProps extends BaseComponentProps {
  statsData?: StatsData[];
  recentUsers?: User[];
  allUsers?: User[];
  statsLoading?: boolean;
  usersLoading?: boolean;
  tableLoading?: boolean;
  onStatsPress?: (stat: StatsData) => void;
  onUserPress?: (user: User) => void;
  onViewAllUsersPress?: () => void;
  onRefresh?: () => void;
  showRecentUsers?: boolean;
  showUsersTable?: boolean;
  maxRecentUsers?: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  statsData = [],
  recentUsers = [],
  allUsers = [],
  statsLoading = false,
  usersLoading = false,
  tableLoading = false,
  onStatsPress,
  onUserPress,
  onViewAllUsersPress,
  onRefresh,
  showRecentUsers = true,
  showUsersTable = true,
  maxRecentUsers = 5,
  className = "",
  testID,
}) => {
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
      case "analytics":
        router.push("/(admin)/analytics");
        break;
      case "settings":
        router.push("/(admin)/settings");
        break;
      default:
        Alert.alert("Unknown Action", `No screen found for action: ${actionId}`);
    }
  };

  return (
    <ScrollView
      className={`flex-1 bg-gray-50 ${className}`}
      testID={testID}
      showsVerticalScrollIndicator={false}
    >
      <View className="p-4">
        <DashboardHeader onRefresh={onRefresh} onLogout={handleLogout} />

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
      </View>
    </ScrollView>
  );
};

export default AdminDashboard;
