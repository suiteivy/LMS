import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { router, useSegments } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  LucideIcon,
  ArrowLeftRight,
} from "lucide-react-native";
import React, { useState } from "react";
import { Text, TouchableOpacity, View, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CloudoraLogo } from "@/components/common/CloudoraLogo";

export interface NavItem {
  name: string;
  title: string;
  icon: LucideIcon;
  route: string;
}

interface WebSidebarProps {
  items: NavItem[];
  basePath: string; // e.g. "(student)"
  role: string;     // e.g. "Student"
  children: React.ReactNode;
}

export const WebSidebar = ({ items, basePath, role, children }: WebSidebarProps) => {
  const { isDark } = useTheme();
  const { availableRoles, activeRole, switchActiveRole, institutionName, institutionLogo } = useAuth();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const [collapsed, setCollapsed] = useState(false);

  // FotMob specific color tokens
  const surface = isDark ? '#161B22' : '#F6F8FA';
  const border = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const collapseSurface = isDark ? '#111827' : '#EAEEF2';

  // Determine active route from segments
  const currentPath = segments.length > 0 ? '/' + segments.join('/') : '/';

  const sidebarWidth = collapsed ? 72 : 240;
  const currentActiveRole = activeRole || basePath.replace(/[()]/g, '');

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: surface }}>
      {/* Sidebar */}
      <View style={{
        width: sidebarWidth,
        backgroundColor: surface,
        borderRightWidth: 1,
        borderRightColor: border,
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 20,
        transition: 'width 0.2s',
      } as any}
    >
        {/* Unboxed Logo / Role badge */}
        {!collapsed && (
          <View style={{ paddingHorizontal: 24, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {institutionLogo ? (
              <Image
                source={{ uri: institutionLogo }}
                style={{ width: 32, height: 32, borderRadius: 8 }}
                resizeMode="contain"
              />
            ) : (
              <CloudoraLogo size={32} glow glowIntensity={0.6} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#FF6900', textTransform: 'uppercase', letterSpacing: 2 }}>
                {role}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '900', color: textPrimary, marginTop: 1 }} numberOfLines={1}>
                {institutionName || 'Portal'}
              </Text>
            </View>
          </View>
        )}
        {collapsed && (
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            {institutionLogo ? (
              <Image
                source={{ uri: institutionLogo }}
                style={{ width: 28, height: 28, borderRadius: 6 }}
                resizeMode="contain"
              />
            ) : (
              <CloudoraLogo size={28} glow glowIntensity={0.6} />
            )}
          </View>
        )}

        {/* Multi-role switcher */}
        {availableRoles && availableRoles.length > 1 && !collapsed && (
          <View style={{
            marginHorizontal: 16,
            marginBottom: 16,
            padding: 10,
            borderRadius: 12,
            backgroundColor: isDark ? '#1C2128' : '#EAEEF2',
            borderWidth: 1,
            borderColor: isDark ? '#30363D' : '#D0D7DE',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
                Active Role
              </Text>
              <ArrowLeftRight size={12} color="#FF6900" />
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {availableRoles.map((r) => {
                const isSelected = currentActiveRole === r;
                const roleLabel = r === 'admin' ? 'Admin' : r === 'teacher' ? 'Teacher' : r === 'parent' ? 'Parent' : r === 'student' ? 'Student' : r;
                return (
                  <TouchableOpacity
                    key={r}
                    onPress={() => {
                      if (!isSelected) {
                        switchActiveRole(r);
                      }
                    }}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 6,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: isSelected ? '#FF6900' : (isDark ? '#21262D' : '#FFFFFF'),
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isSelected ? 0.2 : 0.05,
                      shadowRadius: 2,
                      elevation: isSelected ? 2 : 1,
                    }}
                  >
                    <Text style={{
                      fontSize: 12,
                      fontWeight: isSelected ? '700' : '600',
                      color: isSelected ? '#FFFFFF' : textPrimary,
                      textTransform: 'capitalize',
                    }}>
                      {roleLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {availableRoles && availableRoles.length > 1 && collapsed && (
          <TouchableOpacity
            onPress={() => {
              const currentIndex = availableRoles.indexOf(currentActiveRole);
              const nextIndex = (currentIndex + 1) % availableRoles.length;
              switchActiveRole(availableRoles[nextIndex]);
            }}
            activeOpacity={0.7}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginHorizontal: 12,
              marginBottom: 16,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: isDark ? '#1C2128' : '#EAEEF2',
              borderWidth: 1,
              borderColor: isDark ? '#30363D' : '#D0D7DE',
            }}
          >
            <ArrowLeftRight size={16} color="#FF6900" />
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#FF6900', marginTop: 2, textTransform: 'uppercase' }}>
              {currentActiveRole.slice(0, 3)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Nav items */}
        <View style={{ flex: 1, gap: 8, paddingHorizontal: collapsed ? 12 : 16 }}>
          {items.map((item) => {
            const Icon = item.icon;
            const isRootRoute = item.route === `/${basePath}`;
            const isActive = isRootRoute 
              ? (currentPath === `/${basePath}` || currentPath === `/${basePath}/index`)
              : (currentPath === item.route || currentPath.startsWith(item.route + '/'));
            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: collapsed ? 12 : 16,
                  borderRadius: 12,
                  backgroundColor: isActive ? (isDark ? 'rgba(255, 105, 0, 0.1)' : '#FFF3EB') : 'transparent',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
              >
                <Icon
                  size={20}
                  color={isActive ? '#FF6900' : textSecondary}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {!collapsed && (
                  <Text style={{
                    marginLeft: 14,
                    fontSize: 14,
                    fontWeight: isActive ? '700' : '600',
                    color: isActive ? '#FF6900' : textSecondary,
                  }}>
                    {item.title}
                  </Text>
                )}
                {/* Active indicator */}
                {isActive && !collapsed && (
                  <View style={{ position: 'absolute', right: 16, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6900' }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Collapse toggle */}
        <TouchableOpacity
          onPress={() => setCollapsed(c => !c)}
          activeOpacity={0.7}
          style={{
            marginHorizontal: collapsed ? 12 : 16,
            marginTop: 16,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
             backgroundColor: collapseSurface,
           }}
        >
          {collapsed
            ? <ChevronRight size={18} color={textSecondary} />
            : <>
                <ChevronLeft size={18} color={textSecondary} />
                <Text style={{ marginLeft: 8, fontSize: 12, color: textSecondary, fontWeight: '700' }}>Collapse</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <View style={{ flex: 1, backgroundColor: surface }}>
        {children}
      </View>
    </View>
  );
};
