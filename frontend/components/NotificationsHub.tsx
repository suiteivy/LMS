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
  const [markingAllRead, setMarkingAllRead] = React.useState(false);

  useEffect(() => {
    refreshNotifications();
  }, []);

  const tokens = {
    surface:      isDark ? '#0D1117' : '#FFFFFF',
    surfaceAlt:   isDark ? '#161B22' : '#F6F8FA',
    border:       isDark ? '#21262D' : '#D0D7DE',
    textPrimary:  isDark ? '#FFFFFF' : '#111827',
    textSecondary:isDark ? '#9CA3AF' : '#6B7280',
    textMuted:    isDark ? '#4B5563' : '#9CA3AF',
    unreadBg:     isDark ? 'rgba(255, 105, 0, 0.1)' : '#FFF3EB',
    unreadBorder: isDark ? 'rgba(255, 105, 0, 0.3)' : '#FFB085',
  };

  const iconBg = (type: string) => {
    if (type === 'error')   return isDark ? 'rgba(239, 68, 68, 0.2)'  : '#fef2f2';
    if (type === 'success') return isDark ? 'rgba(16, 185, 129, 0.2)' : '#f0fdf4';
    if (type === 'warning') return isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb';
    return isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff';
  };

  const hasUnread = notifications.some((item) => !item.is_read);

  const handleMarkAllAsRead = async () => {
    if (!hasUnread || markingAllRead) return;
    try {
      setMarkingAllRead(true);
      await markAllAsRead();
      await refreshNotifications();
    } finally {
      setMarkingAllRead(false);
    }
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: tokens.border,
      }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: tokens.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>
            Recent Activities
        </Text>
        {notifications.length > 0 && (
          <TouchableOpacity
            onPress={clearAll}
            activeOpacity={0.7}
            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', borderRadius: 8 }}
          >
            <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>Clear All</Text>
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
            <View style={{ backgroundColor: tokens.surfaceAlt, padding: 32, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: tokens.border }}>
              <Bell size={40} color={tokens.textMuted} strokeWidth={2} />
            </View>
            <Text style={{ color: tokens.textPrimary, fontWeight: '900', fontSize: 20 }}>All Caught Up!</Text>
            <Text style={{ color: tokens.textMuted, marginTop: 12, textAlign: 'center', fontSize: 14, lineHeight: 22, paddingHorizontal: 20 }}>
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
                  padding: 16,
                  marginBottom: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  backgroundColor: item.is_read ? tokens.surfaceAlt : tokens.unreadBg,
                  borderColor: item.is_read ? tokens.border : tokens.unreadBorder,
                }}
              >
                <View style={{ marginRight: 16, marginTop: 2 }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: iconBg(item.type),
                  }}>
                    {item.type === 'info'    && <Info size={20} color="#3b82f6" />}
                    {item.type === 'success' && <CheckCircle size={20} color="#10b981" />}
                    {item.type === 'warning' && <AlertCircle size={20} color="#f59e0b" />}
                    {item.type === 'error'   && <AlertCircle size={20} color="#ef4444" />}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontWeight: '700', fontSize: 15, color: tokens.textPrimary }}>{item.title}</Text>
                    <Text style={{ fontSize: 10, color: tokens.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </Text>
                  </View>
                  <Text style={{ color: tokens.textSecondary, fontSize: 14, lineHeight: 20 }}>{item.message}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => deleteNotification(item.id)}
                  activeOpacity={0.7}
                  style={{ marginLeft: 12, padding: 8, justifyContent: 'center' }}
                >
                  <Trash2 size={16} color={tokens.textMuted} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={{
                marginTop: 10,
                alignSelf: 'center',
                paddingHorizontal: 10,
                paddingVertical: 6,
                backgroundColor: hasUnread ? tokens.surfaceAlt : 'transparent',
                borderRadius: 999,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: hasUnread ? tokens.border : 'transparent',
                opacity: hasUnread ? 1 : 0.55,
              }}
              activeOpacity={0.7}
              onPress={handleMarkAllAsRead}
              disabled={!hasUnread || markingAllRead}
              accessibilityState={{ disabled: !hasUnread || markingAllRead, busy: markingAllRead }}
            >
              {markingAllRead ? (
                <ActivityIndicator size="small" color="#FF6900" />
              ) : (
                <Text style={{ color: tokens.textSecondary, fontWeight: '700', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.9 }}>
                  Mark everything as read
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};
