import { useNotifications } from '@/contexts/NotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { SupportService, type SupportTicket } from '@/services/SupportService';
import { useSubscriptionTier } from '@/hooks/useSubscriptionTier';
import { HelpTooltip } from '@/components/settings/HelpTooltip';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, Bell, CheckCircle, Info, Trash2 } from 'lucide-react-native';
import React, { useEffect } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { UnifiedHeader } from "./common/UnifiedHeader";
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

export const NotificationsHub = () => {
  const { notifications, markAsRead, markAllAsRead, refreshNotifications, loading, clearAll, deleteNotification } = useNotifications();
  const { profile } = useAuth();
  const { isDark } = useTheme();
  const isInstitutionAdmin = profile?.role === 'admin';
  const tier = useSubscriptionTier();
  const [markingAllRead, setMarkingAllRead] = React.useState(false);
  const [nowMs, setNowMs] = React.useState(Date.now());
  const [supportTickets, setSupportTickets] = React.useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = React.useState(false);
  const [editingTicket, setEditingTicket] = React.useState<SupportTicket | null>(null);
  const [editSubject, setEditSubject] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [savingTicket, setSavingTicket] = React.useState(false);

  const headerRole = profile?.role === 'admin'
    ? 'Admin'
    : profile?.role === 'teacher'
      ? 'Teacher'
      : profile?.role === 'student'
        ? 'Student'
        : profile?.role === 'parent'
          ? 'Parent/Guardian'
          : profile?.role === 'master_admin'
            ? 'Master Admin'
            : 'Admin';

  const formatExpiryCountdown = React.useCallback((expiresAt?: string | null) => {
    if (!expiresAt) return null;
    const endMs = new Date(expiresAt).getTime();
    if (!Number.isFinite(endMs)) return null;
    const remaining = endMs - nowMs;
    if (remaining <= 0) return 'Expired';

    const totalMinutes = Math.floor(remaining / (60 * 1000));
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;
    return `${days}d ${hours}h ${minutes}m left`;
  }, [nowMs]);

  useEffect(() => {
    refreshNotifications();
  }, []);

  const loadSupportTickets = React.useCallback(async () => {
    if (!isInstitutionAdmin) return;
    try {
      setLoadingTickets(true);
      const tickets = await SupportService.getMyTickets();
      setSupportTickets(tickets || []);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Support', text2: error?.message || 'Failed to load support tickets' });
    } finally {
      setLoadingTickets(false);
    }
  }, [isInstitutionAdmin]);

  useEffect(() => {
    if (isInstitutionAdmin) {
      loadSupportTickets();
    }
  }, [isInstitutionAdmin, loadSupportTickets]);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(interval);
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

  const resolveChatRoute = React.useCallback((conversationId?: string | null) => {
    if (!conversationId) return;
    const role = profile?.role;
    if (role === 'admin') {
      router.push({ pathname: '/(admin)/communication', params: { conversationId } } as any);
      return;
    }
    if (role === 'teacher') {
      router.push({ pathname: '/(teacher)/management/messages', params: { conversationId } } as any);
      return;
    }
    if (role === 'parent') {
      router.push({ pathname: '/(parent)/messages', params: { conversationId } } as any);
    }
  }, [profile?.role]);

  const handleNotificationPress = React.useCallback((item: any) => {
    if (!item.is_read) {
      markAsRead(item.id);
    }

    const conversationId = item?.data?.conversation_id || item?.data?.conversationId || null;
    const source = String(item?.data?.source || '').toLowerCase();
    const isMessageNotification = source === 'message' || Boolean(conversationId);

    if (!isMessageNotification || !conversationId) {
      return;
    }

    const senderName = item?.data?.sender_name ? ` from ${item.data.sender_name}` : '';
    Alert.alert(
      'Open message',
      `Open this message${senderName} in chat?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open',
          onPress: () => resolveChatRoute(conversationId),
        },
      ]
    );
  }, [markAsRead, resolveChatRoute]);

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

  const openEditTicket = (ticket: SupportTicket) => {
    setEditingTicket(ticket);
    setEditSubject(ticket.subject || '');
    setEditDescription(ticket.description || '');
  };

  const canEditOrDelete = (ticket: SupportTicket) => !!ticket.can_edit || !!ticket.can_delete;

  const saveTicketEdit = async () => {
    if (!editingTicket) return;
    try {
      setSavingTicket(true);
      const updated = await SupportService.updateMyTicket(editingTicket.id, {
        subject: editSubject,
        description: editDescription,
      });
      setSupportTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTicket(updated);
      Toast.show({ type: 'success', text1: 'Support', text2: 'Ticket updated successfully' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Support', text2: error?.message || 'Failed to update ticket' });
    } finally {
      setSavingTicket(false);
    }
  };

  const deleteTicket = async (ticketId: string) => {
    try {
      await SupportService.deleteMyTicket(ticketId);
      setSupportTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (editingTicket?.id === ticketId) setEditingTicket(null);
      Toast.show({ type: 'success', text1: 'Support', text2: 'Ticket deleted successfully' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Support', text2: error?.message || 'Failed to delete ticket' });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.surface }}>
      <UnifiedHeader 
        title="Portal" 
        subtitle="Notifications" 
        role={headerRole}
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
        {isInstitutionAdmin && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: tokens.textPrimary, fontWeight: '800', fontSize: 14 }}>Your Support Tickets</Text>
                <HelpTooltip
                  id="admin.support.tickets"
                  role="admin"
                  tier={tier}
                  onLearnMore={(anchor) => router.push({ pathname: '/(admin)/accessibility/settings', params: { manual: '1', anchor: anchor || 'reports-ops' } } as any)}
                />
              </View>
              <TouchableOpacity onPress={loadSupportTickets} activeOpacity={0.7}>
                <Text style={{ color: '#FF6900', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {loadingTickets ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <ActivityIndicator color="#FF6900" />
              </View>
            ) : supportTickets.length === 0 ? (
              <View style={{ backgroundColor: tokens.surfaceAlt, borderWidth: 1, borderColor: tokens.border, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: tokens.textSecondary, fontSize: 12 }}>No support tickets yet.</Text>
              </View>
            ) : (
              supportTickets.map((ticket) => {
                const wf = ticket.workflow_status || 'pending';
                const statusColor = wf === 'pending' ? '#B91C1C' : wf === 'acknowledged' ? '#1D4ED8' : wf === 'in_progress' ? '#B45309' : '#15803D';
                const steps = ['pending', 'acknowledged', 'in_progress', 'resolved'] as const;
                const currentIndex = steps.indexOf(wf as any);
                return (
                  <View key={ticket.id} style={{ backgroundColor: tokens.surfaceAlt, borderWidth: 1, borderColor: tokens.border, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: tokens.textPrimary, fontWeight: '700', flex: 1, marginRight: 8 }} numberOfLines={1}>{ticket.subject}</Text>
                      <Text style={{ color: statusColor, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{wf.replace('_', ' ')}</Text>
                    </View>
                    <Text style={{ color: tokens.textSecondary, marginTop: 6, fontSize: 12 }} numberOfLines={2}>{ticket.description}</Text>

                    <View style={{ marginTop: 8 }}>
                      <Text style={{ color: tokens.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 }}>
                        Ticket Progress
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {steps.map((step, index) => {
                          const reached = currentIndex >= index;
                          const isCurrent = currentIndex === index;
                          const chipBg = reached ? (isCurrent ? `${statusColor}25` : (isDark ? 'rgba(34,197,94,0.2)' : '#DCFCE7')) : (isDark ? '#0F141C' : '#FFFFFF');
                          const chipBorder = reached ? (isCurrent ? statusColor : '#16A34A') : tokens.border;
                          const chipText = reached ? (isCurrent ? statusColor : (isDark ? '#86EFAC' : '#166534')) : tokens.textSecondary;
                          return (
                            <View
                              key={`${ticket.id}-${step}`}
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 5,
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: chipBorder,
                                backgroundColor: chipBg,
                                marginRight: 6,
                                marginBottom: 6,
                              }}
                            >
                              <Text style={{ color: chipText, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                                {step.replace('_', ' ')}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {!canEditOrDelete(ticket) && (
                      <Text style={{ color: '#9A6700', marginTop: 6, fontSize: 11, fontWeight: '700' }}>
                        Locked after acknowledgement. Editable/deletable once resolved.
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row', marginTop: 10 }}>
                      <TouchableOpacity
                        disabled={!ticket.can_edit}
                        onPress={() => openEditTicket(ticket)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: ticket.can_edit ? tokens.border : tokens.textMuted,
                          opacity: ticket.can_edit ? 1 : 0.5,
                          marginRight: 8,
                        }}
                      >
                        <Text style={{ color: tokens.textPrimary, fontSize: 11, fontWeight: '700' }}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={!ticket.can_delete}
                        onPress={() => deleteTicket(ticket.id)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#CF222E',
                          opacity: ticket.can_delete ? 1 : 0.5,
                        }}
                      >
                        <Text style={{ color: '#CF222E', fontSize: 11, fontWeight: '700' }}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

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
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() => handleNotificationPress(item)}
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
                  {!!item.expires_at && (
                    <Text style={{ color: '#D97706', fontSize: 11, marginTop: 6, fontWeight: '700' }}>
                      {formatExpiryCountdown(item.expires_at)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity 
                  onPress={() => deleteNotification(item.id)}
                  activeOpacity={0.7}
                  style={{ marginLeft: 12, padding: 8, justifyContent: 'center' }}
                >
                  <Trash2 size={16} color={tokens.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
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

      <Modal visible={!!editingTicket} transparent animationType="fade" onRequestClose={() => setEditingTicket(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: tokens.surface, borderWidth: 1, borderColor: tokens.border, borderRadius: 12, padding: 14 }}>
            <Text style={{ color: tokens.textPrimary, fontSize: 16, fontWeight: '800' }}>Edit Support Ticket</Text>
            <TextInput
              value={editSubject}
              onChangeText={setEditSubject}
              placeholder="Subject"
              placeholderTextColor={tokens.textMuted}
              style={{ marginTop: 12, backgroundColor: tokens.surfaceAlt, color: tokens.textPrimary, borderWidth: 1, borderColor: tokens.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 }}
            />
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description"
              placeholderTextColor={tokens.textMuted}
              multiline
              style={{ marginTop: 10, minHeight: 100, textAlignVertical: 'top', backgroundColor: tokens.surfaceAlt, color: tokens.textPrimary, borderWidth: 1, borderColor: tokens.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity onPress={() => setEditingTicket(null)} style={{ paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 }}>
                <Text style={{ color: tokens.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={savingTicket}
                onPress={saveTicketEdit}
                style={{ backgroundColor: '#FF6900', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, opacity: savingTicket ? 0.7 : 1 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{savingTicket ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
