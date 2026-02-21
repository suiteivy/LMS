import { AlertCircle, Bell, CheckCircle, Info, X } from 'lucide-react-native';
import React from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Pressable } from "react-native-gesture-handler";

interface NotificationProps {
  visible: boolean;
  onClose: () => void;
}

import { useNotifications } from '@/contexts/NotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';

const Notifications = ({ visible, onClose }: NotificationProps) => {
  const { notifications, unreadCount, markAllAsRead, refreshNotifications, loading } = useNotifications();
  const { isDark } = useTheme();

  const tokens = {
    surface:      isDark ? '#1a1a1a' : '#ffffff',
    surfaceAlt:   isDark ? '#111827' : '#f9fafb',
    border:       isDark ? '#1f2937' : '#f3f4f6',
    textPrimary:  isDark ? '#ffffff' : '#111827',
    textSecondary:isDark ? '#9ca3af' : '#6b7280',
    textMuted:    isDark ? '#6b7280' : '#9ca3af',
    closeBtn:     isDark ? '#1f2937' : '#f3f4f6',
    unreadBg:     isDark ? 'rgba(194,65,12,0.15)' : 'rgba(255,247,237,0.8)',
    unreadBorder: isDark ? '#7c2d12' : '#fed7aa',
    readBorder:   isDark ? '#1f2937' : '#f9fafb',
  };

  const iconBg = (type: string) => {
    if (type === 'error')   return isDark ? 'rgba(127,29,29,0.3)'  : '#fef2f2';
    if (type === 'success') return isDark ? 'rgba(6,78,59,0.3)'    : '#f0fdf4';
    if (type === 'warning') return isDark ? 'rgba(120,53,15,0.3)'  : '#fffbeb';
    return isDark ? 'rgba(30,58,138,0.3)' : '#eff6ff';
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      onShow={refreshNotifications}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
        />

        {/* Modal Container */}
        <View style={{
          marginTop: 'auto',
          height: '85%',
          backgroundColor: tokens.surface,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 20,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 24,
            borderBottomWidth: 1,
            borderBottomColor: tokens.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: tokens.textPrimary }}>
                Notifications
              </Text>
              {unreadCount > 0 && (
                <View style={{ backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 }}>
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ padding: 8, backgroundColor: tokens.closeBtn, borderRadius: 99 }}
            >
              <X size={20} color={tokens.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
            {loading && notifications.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color="#FF6900" />
                <Text style={{ color: tokens.textMuted, marginTop: 16, fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  Checking alerts...
                </Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={{ padding: 48, alignItems: 'center' }}>
                <View style={{ backgroundColor: tokens.surfaceAlt, padding: 24, borderRadius: 99, marginBottom: 16 }}>
                  <Bell size={48} color={tokens.textMuted} />
                </View>
                <Text style={{ color: tokens.textPrimary, fontWeight: '700', fontSize: 18 }}>Inbox Zero</Text>
                <Text style={{ color: tokens.textMuted, marginTop: 8, textAlign: 'center', fontSize: 14, lineHeight: 20, paddingHorizontal: 40 }}>
                  You're all caught up! New updates will appear here.
                </Text>
              </View>
            ) : (
              notifications.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    padding: 20,
                    marginBottom: 16,
                    borderRadius: 24,
                    borderWidth: 1,
                    backgroundColor: item.is_read ? tokens.surface : tokens.unreadBg,
                    borderColor: item.is_read ? tokens.readBorder : tokens.unreadBorder,
                  }}
                >
                  <View style={{ marginRight: 16, marginTop: 4 }}>
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 16,
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontWeight: '700', fontSize: 14, color: tokens.textPrimary }}>{item.title}</Text>
                      <Text style={{ fontSize: 9, color: tokens.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </Text>
                    </View>
                    <Text style={{ color: tokens.textSecondary, fontSize: 13, lineHeight: 20 }}>{item.message}</Text>
                  </View>
                </View>
              ))
            )}

            {notifications.length > 0 && !loading && (
              <TouchableOpacity
                style={{
                  marginTop: 16,
                  marginBottom: 80,
                  paddingVertical: 16,
                  backgroundColor: tokens.surfaceAlt,
                  borderRadius: 16,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: tokens.border,
                }}
                onPress={markAllAsRead}
              >
                <Text style={{ color: tokens.textPrimary, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  Mark all as read
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default Notifications;