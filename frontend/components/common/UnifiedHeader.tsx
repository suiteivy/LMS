import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MasterAdminBadge } from "../shared/SubscriptionComponents";

interface UnifiedHeaderProps {
  title: string;
  subtitle?: string;
  role: "Student" | "Teacher" | "Admin" | "Parent";
  showNotification?: boolean;
  onNotificationPress?: () => void;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  showMasterBadge?: boolean;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  title,
  subtitle,
  role,
  showNotification = false,
  onNotificationPress,
  onBack,
  rightActions,
  showMasterBadge = false,
}) => {
  const insets = useSafeAreaInsets();
  const { setShowNotifications, unreadCount } = useNotifications();
  const { isDark } = useTheme();

  // Material Dark tokens
  const bg = isDark ? '#1e1e1e' : '#ffffff';
  const border = isDark ? '#2c2c2c' : '#f3f4f6';
  const surface = isDark ? '#242424' : '#f9fafb';
  const surfaceBorder = isDark ? '#2c2c2c' : '#f3f4f6';
  const iconColor = isDark ? '#e5e5e5' : '#111827';
  const subtleIconColor = isDark ? '#9ca3af' : '#6b7280';

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      setShowNotifications(true);
    }
  };

  return (
    <View
      style={{
        backgroundColor: bg,
        borderBottomWidth: 1,
        borderBottomColor: border,
        paddingHorizontal: 24,
        paddingBottom: 16,
        paddingTop: Math.max(insets.top, 8),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left side */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={{
                marginRight: 16,
                backgroundColor: surface,
                padding: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: surfaceBorder,
              }}
            >
              <Ionicons name="chevron-back" size={20} color={iconColor} />
            </TouchableOpacity>
          )}

          <View style={{
            backgroundColor: isDark ? 'rgba(255, 105, 0, 0.12)' : '#fff7ed',
            padding: 8,
            borderRadius: 12,
            marginRight: 12,
          }}>
            <Ionicons name="school" size={20} color="#FF6900" />
          </View>

          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 10,
                fontWeight: 'bold',
                color: isDark ? '#6b7280' : '#9ca3af',
                textTransform: 'uppercase',
                letterSpacing: 1.5,
              }}>
                {title}
              </Text>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: isDark ? '#f1f1f1' : '#000000',
                letterSpacing: -0.5,
              }} numberOfLines={1}>
                {subtitle || "Portal"}<Text style={{ color: '#FF6900' }}>.</Text>
              </Text>
            </View>
            {showMasterBadge && <MasterAdminBadge />}
          </View>
        </View>

        {/* Right side */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {rightActions}

          {showNotification === true && (
            <TouchableOpacity
              onPress={handleNotificationPress}
              style={{
                backgroundColor: surface,
                padding: 10,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: surfaceBorder,
              }}
            >
              <Ionicons name="notifications-outline" size={20} color={iconColor} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 8,
                  height: 8,
                  backgroundColor: '#FF6900',
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: bg,
                }} />
              )}
            </TouchableOpacity>
          )}

          <View style={{
            backgroundColor: surface,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: surfaceBorder,
          }}>
            <Ionicons
              name={
                role === "Student" ? "school-outline" :
                  role === "Teacher" ? "briefcase-outline" :
                    role === "Admin" ? "shield-checkmark-outline" :
                      "people-outline"
              }
              size={14}
              color={subtleIconColor}
            />
            <Text style={{
              marginLeft: 6,
              fontWeight: 'bold',
              color: isDark ? '#e5e5e5' : '#111827',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}>
              {role}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};