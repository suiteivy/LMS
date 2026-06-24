import { useTheme } from "@/contexts/ThemeContext";
import { router, useSegments } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  LucideIcon
} from "lucide-react-native";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const [collapsed, setCollapsed] = useState(false);

  // FotMob specific color tokens
  const surface = isDark ? '#161B22' : '#F6F8FA';
  const border = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';
  const bg = isDark ? '#0D1117' : '#FFFFFF';

  // Determine active route from segments
  const currentPath = segments.length > 0 ? '/' + segments.join('/') : '/';

  const sidebarWidth = collapsed ? 72 : 240;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: bg }}>
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
        {/* Logo / Role badge */}
        {!collapsed && (
          <View style={{ paddingHorizontal: 24, marginBottom: 32 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#FF6900', textTransform: 'uppercase', letterSpacing: 2 }}>
              {role}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: textPrimary, marginTop: 2 }}>
              Portal
            </Text>
          </View>
        )}
        {collapsed && (
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{ width: 40, height: 40, backgroundColor: '#FF6900', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>
                {role.charAt(0)}
              </Text>
            </View>
          </View>
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
            backgroundColor: isDark ? '#0D1117' : '#FFFFFF',
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
      <View style={{ flex: 1, backgroundColor: bg }}>
        {children}
      </View>
    </View>
  );
};