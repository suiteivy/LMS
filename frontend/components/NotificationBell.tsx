import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import { Bell, CheckCircle, Info, AlertCircle, Trash2, RefreshCw, X } from 'lucide-react-native';
import { useNotifications } from '@/contexts/NotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Notification } from '@/types/types';
import { formatDistanceToNow } from 'date-fns';

const STALE_MS = 30_000;
const MAX_VISIBLE = 8;

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, refreshNotifications, loading } = useNotifications();
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const panelRef = useRef<View>(null);

  const tokens = {
    surface:     isDark ? '#1a1a1a' : '#ffffff',
    surfaceAlt:  isDark ? '#111827' : '#f9fafb',
    border:      isDark ? '#2d2d2d' : '#e5e7eb',
    textPrimary: isDark ? '#ffffff' : '#111827',
    textSecondary: isDark ? '#9ca3af' : '#6b7280',
    textMuted:   isDark ? '#6b7280' : '#9ca3af',
    unreadBg:    isDark ? 'rgba(194,65,12,0.15)' : 'rgba(255,247,237,0.8)',
    unreadBorder: isDark ? '#7c2d12' : '#fed7aa',
  };

  const fetchFresh = useCallback(async () => {
    try {
      setError(false);
      await refreshNotifications();
      lastFetchRef.current = Date.now();
    } catch {
      setError(true);
    }
  }, [refreshNotifications]);

  const handleOpen = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        // Fetch if stale
        if (Date.now() - lastFetchRef.current > STALE_MS) {
          fetchFresh();
        }
      }
      return !prev;
    });
  }, [fetchFresh]);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await markAsRead(id);
    } catch {
      // optimistic update already happened in context
    }
  }, [markAsRead]);

  const iconBg = (type: string) => {
    if (type === 'error')   return isDark ? 'rgba(127,29,29,0.3)'  : '#fef2f2';
    if (type === 'success') return isDark ? 'rgba(6,78,59,0.3)'    : '#f0fdf4';
    if (type === 'warning') return isDark ? 'rgba(120,53,15,0.3)'  : '#fffbeb';
    return isDark ? 'rgba(30,58,138,0.3)' : '#eff6ff';
  };

  const visibleNotifications = notifications.slice(0, MAX_VISIBLE);

  return (
    <View ref={panelRef} style={{ position: 'relative', zIndex: 1000 }}>
      {/* Bell trigger */}
      <TouchableOpacity
        onPress={handleOpen}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{ position: 'relative', padding: 6 }}
      >
        <Bell size={22} color={tokens.textSecondary} />
        {unreadCount > 0 && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#ef4444',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Backdrop */}
          <Pressable
            style={{
              position: 'absolute',
              top: -1000,
              left: -1000,
              right: -1000,
              bottom: -1000,
              zIndex: 998,
            }}
            onPress={() => setOpen(false)}
          />

          {/* Panel */}
          <View
            style={{
              position: 'absolute',
              top: 44,
              right: 0,
              width: Platform.OS === 'web' ? 380 : 320,
              maxHeight: 440,
              backgroundColor: tokens.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: tokens.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
              overflow: 'hidden',
              zIndex: 999,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 14,
                borderBottomWidth: 1,
                borderBottomColor: tokens.border,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: tokens.textPrimary }}>
                Notifications
              </Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={18} color={tokens.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {loading && notifications.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <ActivityIndicator color="#FF6900" size="small" />
                  <Text style={{ color: tokens.textMuted, marginTop: 10, fontSize: 11, fontWeight: '600' }}>
                    Loading...
                  </Text>
                </View>
              ) : error ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <AlertCircle size={28} color="#ef4444" />
                  <Text style={{ color: tokens.textPrimary, fontWeight: '700', fontSize: 13, marginTop: 10 }}>
                    Couldn't load notifications
                  </Text>
                  <TouchableOpacity
                    onPress={fetchFresh}
                    style={{
                      marginTop: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6',
                    }}
                  >
                    <RefreshCw size={12} color={tokens.textSecondary} />
                    <Text style={{ color: tokens.textSecondary, fontSize: 12, fontWeight: '600' }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : notifications.length === 0 ? (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <View style={{ backgroundColor: tokens.surfaceAlt, padding: 16, borderRadius: 99, marginBottom: 10 }}>
                    <Bell size={28} color={tokens.textMuted} />
                  </View>
                  <Text style={{ color: tokens.textPrimary, fontWeight: '700', fontSize: 13 }}>
                    You're all caught up
                  </Text>
                  <Text style={{ color: tokens.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                    New updates will appear here.
                  </Text>
                </View>
              ) : (
                visibleNotifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => handleMarkRead(item.id)}
                    style={{
                      flexDirection: 'row',
                      padding: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: tokens.border,
                      backgroundColor: item.is_read ? 'transparent' : tokens.unreadBg,
                    }}
                  >
                    <View style={{ marginRight: 10, marginTop: 2 }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: iconBg(item.type),
                        }}
                      >
                        {item.type === 'info'    && <Info size={16} color="#3b82f6" />}
                        {item.type === 'success' && <CheckCircle size={16} color="#10b981" />}
                        {item.type === 'warning' && <AlertCircle size={16} color="#f59e0b" />}
                        {item.type === 'error'   && <AlertCircle size={16} color="#ef4444" />}
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Text
                          style={{ fontWeight: '700', fontSize: 12, color: tokens.textPrimary, flex: 1 }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text style={{ fontSize: 9, color: tokens.textMuted, marginLeft: 6, fontWeight: '500' }}>
                          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                        </Text>
                      </View>
                      <Text style={{ color: tokens.textSecondary, fontSize: 11, lineHeight: 16 }} numberOfLines={2}>
                        {item.message}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Footer */}
            {notifications.length > 0 && (
              <View style={{ borderTopWidth: 1, borderTopColor: tokens.border, padding: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    setOpen(false);
                    // Navigate to full notifications page would happen here
                  }}
                  style={{ alignItems: 'center', paddingVertical: 6 }}
                >
                  <Text style={{ color: '#FF6900', fontSize: 12, fontWeight: '700' }}>
                    View all notifications
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}
