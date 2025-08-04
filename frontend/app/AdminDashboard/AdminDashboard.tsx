import React from "react";
import { View, ScrollView, Alert } from "react-native";

import { BaseComponentProps, StatsData, User } from "./types";
import { DashboardHeader } from "./components/DashboardHeader";
import { StatsOverview } from "./components/StatsOverview";
import { RecentUsersSection } from "./components/RecentUsersSection";
import { UsersTableSection } from "./components/UsersTableSection";
import { QuickActionsSection } from "./components/QuickActionsSection";
import { supabase } from "@/libs/supabase";
import { NavigationProp, useNavigation } from "@react-navigation/native";


type RootStackParamList = {
  "auth/sign": undefined;
};

type NavigationProps = NavigationProp<RootStackParamList>;

interface AdminDashboardProps extends BaseComponentProps {
  // Data props
  statsData?: StatsData[];
  recentUsers?: User[];
  allUsers?: User[];

  // Loading states
  statsLoading?: boolean;
  usersLoading?: boolean;
  tableLoading?: boolean;

  // Event handlers
  onStatsPress?: (stat: StatsData) => void;
  onUserPress?: (user: User) => void;
  onViewAllUsersPress?: () => void;
  onRefresh?: () => void;
  onQuickActionPress?: (action: string) => void;

  // Customization
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
  onQuickActionPress,
  showRecentUsers = true,
  showUsersTable = true,
  maxRecentUsers = 5,
  className = "",
  testID,
}) => {
  const navigation = useNavigation<NavigationProps>();
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Logout Failed", error.message);
    } else {
      // Navigate to login screen or do your own redirect
        navigation.navigate("auth/sign");
      // You might want to navigate back to login screen here.
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

        <QuickActionsSection onActionPress={onQuickActionPress} />
      </View>
    </ScrollView>
  );
};

export default AdminDashboard;
