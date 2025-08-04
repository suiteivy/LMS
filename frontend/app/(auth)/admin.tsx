import React from "react";
import { View, ScrollView, Alert } from "react-native";
import { supabase } from "@/libs/supabase";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { BaseComponentProps, StatsData, User } from "@/types/types";
import { DashboardHeader } from "../../components/AdminDashboard/elements/DashboardHeader";
import { StatsOverview } from "../../components/AdminDashboard/elements/StatsOverview";
import { RecentUsersSection } from "../../components/AdminDashboard/elements/RecentUsersSection";
import { UsersTableSection } from "../../components/AdminDashboard/elements/UsersTableSection";
import { QuickActionsSection } from "../../components/AdminDashboard/elements/QuickActionsSection";

type RootStackParamList = {
  "auth/sign": undefined;
  CreateUserScreen: undefined;
  CreateCourse: undefined;
  AnalyticsScreen: undefined;
  SettingsScreen: undefined;
};

type NavigationProps = NavigationProp<RootStackParamList>;

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
  const navigation = useNavigation<NavigationProps>();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Logout Failed", error.message);
    } else {
      navigation.navigate("auth/sign");
    }
  };

  const handleQuickActionPress = (actionId: string) => {
    switch (actionId) {
      case "add-user":
        navigation.navigate("CreateUserScreen");
        break;
      case "add-course":
        navigation.navigate("CreateCourse");
        break;
      case "analytics":
        navigation.navigate("AnalyticsScreen");
        break;
      case "settings":
        navigation.navigate("SettingsScreen");
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
