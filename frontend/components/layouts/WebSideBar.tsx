import { useTheme } from "@/contexts/ThemeContext";
import { router, useSegments } from "expo-router";
import {
  BookOpen,
  Building,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Glasses,
  LucideIcon,
  MessageSquare,
  PenBox,
  Settings,
  Star,
} from "lucide-react-native";
import React, { useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
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

  const surface = isDark ? '#1e1e1e' : '#ffffff';
  const border = isDark ? '#2c2c2c' : '#e5e7eb';
  const textPrimary = isDark ? '#f1f1f1' : '#111827';
  const textSecondary = isDark ? '#9ca3af' : '#64748b';
  const bg = isDark ? '#121212' : '#f9fafb';

  // Determine active route from segments
  const activeSegment = segments[segments.length - 1] ?? 'index';

  const sidebarWidth = collapsed ? 64 : 220;

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: bg }}>
      {/* Sidebar */}
      <View style={{
        width: sidebarWidth,
        backgroundColor: surface,
        borderRightWidth: 1,
        borderRightColor: border,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 16,
        transition: 'width 0.2s',
      } as any}>
        {/* Logo / Role badge */}
        {!collapsed && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#FF6B00', textTransform: 'uppercase', letterSpacing: 2 }}>
              {role}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: textPrimary, marginTop: 2 }}>
              Portal
            </Text>
          </View>
        )}
        {collapsed && (
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{ width: 32, height: 32, backgroundColor: '#FF6B00', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 14 }}>
                {role.charAt(0)}
              </Text>
            </View>
          </View>
        )}

        {/* Nav items */}
        <View style={{ flex: 1, gap: 4, paddingHorizontal: collapsed ? 8 : 12 }}>
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeSegment === item.name || (item.name === 'index' && activeSegment === basePath);
            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => router.push(item.route as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: collapsed ? 8 : 12,
                  borderRadius: 12,
                  backgroundColor: isActive ? (isDark ? 'rgba(255,107,0,0.12)' : '#fff7ed') : 'transparent',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
              >
                <Icon
                  size={20}
                  color={isActive ? '#FF6B00' : textSecondary}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {!collapsed && (
                  <Text style={{
                    marginLeft: 12,
                    fontSize: 14,
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? '#FF6B00' : textSecondary,
                  }}>
                    {item.title}
                  </Text>
                )}
                {/* Active indicator */}
                {isActive && !collapsed && (
                  <View style={{ position: 'absolute', right: 12, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B00' }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Collapse toggle */}
        <TouchableOpacity
          onPress={() => setCollapsed(c => !c)}
          style={{
            marginHorizontal: collapsed ? 8 : 12,
            marginTop: 8,
            padding: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            backgroundColor: isDark ? '#242424' : '#f9fafb',
          }}
        >
          {collapsed
            ? <ChevronRight size={16} color={textSecondary} />
            : <>
                <ChevronLeft size={16} color={textSecondary} />
                <Text style={{ marginLeft: 8, fontSize: 12, color: textSecondary, fontWeight: '600' }}>Collapse</Text>
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