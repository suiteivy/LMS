import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MainAdminBadge, SubscriptionStatusBadge } from "../shared/SubscriptionComponents";

interface UnifiedHeaderProps {
  title: string;
  subtitle?: string;
  role: "Student" | "Teacher" | "Admin" | "Parent" | "Master Admin";
  showNotification?: boolean;
  onNotificationPress?: () => void;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  showMainBadge?: boolean;
}

export const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  title,
  subtitle,
  role,
  showNotification = false,
  onNotificationPress,
  onBack,
  rightActions,
  showMainBadge = false,
}) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { institutionName } = useAuth();
  const { width } = useWindowDimensions();

  const isMobile = width < 768;

  // Material Dark tokens
  const bg = isDark ? '#13103A' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
  const surface = isDark ? '#1A1650' : '#f9fafb';
  const surfaceBorder = isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
  const iconColor = isDark ? '#e5e5e5' : '#111827';
  const subtleIconColor = isDark ? '#9ca3af' : '#6b7280';

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

          <View style={{ flex: 1 }}>
            <View>
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

            {/* Role & Institution Info (Mobile Desktop specific) */}
            {isMobile && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <View style={{
                  backgroundColor: surface,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
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
                            role === "Master Admin" ? "globe-outline" : 
                              "people-outline"
                    }
                    size={10}
                    color={subtleIconColor}
                  />
                  <Text style={{
                    marginLeft: 4,
                    fontWeight: 'bold',
                    color: isDark ? '#e5e5e5' : '#111827',
                    fontSize: 8,
                    textTransform: 'uppercase',
                  }}>
                    {role}
                  </Text>
                </View>
                {institutionName && (
                  <View style={{
                    backgroundColor: isDark ? 'rgba(255, 105, 0, 0.12)' : '#fff7ed',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255, 105, 0, 0.2)' : '#ffedd5',
                  }}>
                    <Text style={{
                      fontWeight: 'bold',
                      color: '#FF6900',
                      fontSize: 8,
                      textTransform: 'uppercase',
                    }}>
                      {institutionName}
                    </Text>
                  </View>
                )}
                <SubscriptionStatusBadge />
              </View>
            )}
          </View>
        </View>

        {/* Right side Actions (Mainly for Desktop) */}
        {!isMobile && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {rightActions}
            
            {institutionName && (
              <View style={{
                backgroundColor: isDark ? 'rgba(255, 105, 0, 0.12)' : '#fff7ed',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 105, 0, 0.2)' : '#ffedd5',
              }}>
                <Text style={{
                  fontWeight: 'bold',
                  color: '#FF6900',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>
                  {institutionName}
                </Text>
              </View>
            )}

            <View style={{
              backgroundColor: surface,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 16,
              flexDirection: 'column',
              alignItems: 'stretch',
              borderWidth: 1,
              borderColor: surfaceBorder,
            }}>
              {/* Top section: Role */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons
                  name={
                    role === "Student" ? "school-outline" :
                      role === "Teacher" ? "briefcase-outline" :
                        role === "Admin" ? "shield-checkmark-outline" :
                          role === "Master Admin" ? "globe-outline" : 
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

              {/* Divider line (like a fraction bar) */}
              <View style={{ height: 1, backgroundColor: surfaceBorder, marginVertical: 6 }} />

              {/* Bottom section: Badge */}
              <View style={{ alignItems: 'center' }}>
                <SubscriptionStatusBadge />
              </View>
            </View>
          </View>
        )}
        
        {/* Mobile Right Actions */}
        {isMobile && rightActions && (
            <View style={{ marginLeft: 12 }}>
                {rightActions}
            </View>
        )}
      </View>
    </View>
  );
};