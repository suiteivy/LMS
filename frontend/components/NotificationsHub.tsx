import { useNotifications } from '@/contexts/NotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, Bell, CheckCircle, Info, Trash2 } from 'lucide-react-native';
import React, { useEffect } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, Platform } from 'react-native';
import { UnifiedHeader } from "./common/UnifiedHeader";
import { router } from 'expo-router';

export const NotificationsHub = () => {
  const { notifications, markAllAsRead, refreshNotifications, loading, clearAll, deleteNotification } = useNotifications();
  const { isDark } = useTheme();

  useEffect(() => {
    refreshNotifications();
  }, []);

  const tokens = {
    surface:      isDark ? '#0F0B2E' : '#ffffff',
    surfaceAlt:   isDark ? '#1A1650' : '#f9fafb',
    border:       isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
    textPrimary:  isDark ? '#ffffff' : '#111827',
    textSecondary:isDark ? '#9ca3af' : '#6b7280',
    textMuted:    isDark ? '#6b7280' : '#9ca3af',
    unreadBg:     isDark ? 'rgba(255,105,0,0.1)' : 'rgba(255,247,237,0.8)',
    unreadBorder: isDark ? 'rgba(255,105,0,0.2)' : '#fed7aa',
    readBorder:   isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
  };

  const iconBg = (type: string) => {
    if (type === 'error')   return isDark ? 'rgba(127,29,29,0.3)'  : '#fef2f2';
    if (type === 'success') return isDark ? 'rgba(6,78,59,0.3)'    : '#f0fdf4';
    if (type === 'warning') return isDark ? 'rgba(120,53,15,0.3)'  : '#fffbeb';
    return isDark ? 'rgba(30,58,138,0.3)' : '#eff6ff';
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.surface }}>
      <UnifiedHeader 
        title="Portal" 
        subtitle="Notifications" 
        role="Teacher" // This should ideally be passed in or derived from context
        onBack={() => router.back()}
      />
      
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: tokens.border,
      }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
            Recent Activities
        </Text>
        {notifications.length > 0 && (
          <TouchableOpacity
            onPress={clearAll}
            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', borderRadius: 8 }}
          >
            <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {loading && notifications.length === 0 ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <ActivityIndicator color="#FF6900" />
            <Text style={{ color: tokens.textMuted, marginTop: 16, fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Syncing updates...
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={{ padding: 64, alignItems: 'center' }}>
            <View style={{ backgroundColor: tokens.surfaceAlt, padding: 32, borderRadius: 99, marginBottom: 20 }}>
              <Bell size={64} color={tokens.textMuted} strokeWidth={1.5} />
            </View>
            <Text style={{ color: tokens.textPrimary, fontWeight: '700', fontSize: 20 }}>All Caught Up!</Text>
            <Text style={{ color: tokens.textMuted, marginTop: 12, textAlign: 'center', fontSize: 15, lineHeight: 22, paddingHorizontal: 20 }}>
              Your notification center is clear. New updates will appear here in real-time.
            </Text>
          </View>
        ) : (
          <>
            {notifications.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  padding: 20,
                  marginBottom: 16,
                  borderRadius: 24,
                  borderWidth: 1,
                  backgroundColor: item.is_read ? tokens.surface : tokens.unreadBg,
                  borderColor: item.is_read ? tokens.border : tokens.unreadBorder,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: item.is_read ? 0 : 0.05,
                  shadowRadius: 4,
                  elevation: item.is_read ? 0 : 2,
                }}
              >
                <View style={{ marginRight: 16, marginTop: 2 }}>
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: iconBg(item.type),
                  }}>
                    {item.type === 'info'    && <Info size={22} color="#3b82f6" />}
                    {item.type === 'success' && <CheckCircle size={22} color="#10b981" />}
                    {item.type === 'warning' && <AlertCircle size={22} color="#f59e0b" />}
                    {item.type === 'error'   && <AlertCircle size={22} color="#ef4444" />}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontWeight: '700', fontSize: 15, color: tokens.textPrimary }}>{item.title}</Text>
                    <Text style={{ fontSize: 9, color: tokens.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </Text>
                  </View>
                  <Text style={{ color: tokens.textSecondary, fontSize: 14, lineHeight: 20 }}>{item.message}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => deleteNotification(item.id)}
                  style={{ marginLeft: 12, padding: 8, justifyContent: 'center' }}
                >
                  <Trash2 size={18} color={tokens.textMuted} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={{
                marginTop: 24,
                paddingVertical: 18,
                backgroundColor: tokens.surfaceAlt,
                borderRadius: 20,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: tokens.border,
              }}
              onPress={markAllAsRead}
            >
              <Text style={{ color: tokens.textPrimary, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 }}>
                Mark everything as read
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};
