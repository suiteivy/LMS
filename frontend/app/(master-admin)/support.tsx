import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { ListItemSkeleton } from '@/components/ui/skeletons';

import { useTheme } from '@/contexts/ThemeContext';
import { MasterSupportService } from '@/services/MasterSupportService';
import type { SupportTicket, SupportWorkflowStatus } from '@/services/SupportService';

const useThemeColors = (isDark: boolean) => ({
  bg: isDark ? '#0D1117' : '#F6F8FA',
  card: isDark ? '#161B22' : '#FFFFFF',
  border: isDark ? '#4B5563' : '#9CA3AF',
  text: isDark ? '#F0F6FC' : '#1F2328',
  sub: isDark ? '#8B949E' : '#57606A',
  primary: '#FF6900',
  success: '#1A7F37',
  danger: '#CF222E',
  warn: '#9A6700',
  info: '#3B82F6',
  overlay: 'rgba(0,0,0,0.5)',
  input: isDark ? '#0F141C' : '#F3F4F6',
});

const statusColor = (status: SupportWorkflowStatus, isDark: boolean) => {
  if (status === 'pending') return isDark ? '#F87171' : '#B91C1C';
  if (status === 'acknowledged') return isDark ? '#60A5FA' : '#1D4ED8';
  if (status === 'in_progress') return isDark ? '#FBBF24' : '#B45309';
  return isDark ? '#34D399' : '#15803D';
};

const PRIORITY_LEVELS = ['high', 'medium', 'low'] as const;
type TicketPriority = (typeof PRIORITY_LEVELS)[number];

const normalizePriority = (value: string | null | undefined): TicketPriority | null => {
  const normalized = String(value || '').trim().toLowerCase();
  if (PRIORITY_LEVELS.includes(normalized as TicketPriority)) return normalized as TicketPriority;
  return null;
};

const priorityOrder: Record<TicketPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const priorityColor = (priority: TicketPriority, isDark: boolean) => {
  if (priority === 'high') return isDark ? '#F87171' : '#B91C1C';
  if (priority === 'medium') return isDark ? '#FBBF24' : '#B45309';
  return isDark ? '#34D399' : '#15803D';
};

export default function MasterSupportPage() {
  const { isDark } = useTheme();
  const c = useThemeColors(isDark);

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [queuePage, setQueuePage] = useState<'unassigned' | 'assigned'>('unassigned');

  const [resolveConfirmOpen, setResolveConfirmOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await MasterSupportService.getSupportRequests();
      setTickets(data);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Support', text2: e.message || 'Failed to load support tickets' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const workflowStatus: SupportWorkflowStatus = useMemo(() => {
    if (!selectedTicket?.workflow_status) return 'pending';
    return selectedTicket.workflow_status;
  }, [selectedTicket]);

  const canMarkAcknowledged = workflowStatus === 'pending';
  const canMarkInProgress = workflowStatus === 'acknowledged';
  const canResolve = workflowStatus === 'in_progress';
  const canDelete = selectedTicket?.can_delete === true;
  const selectedPriority = normalizePriority(selectedTicket?.priority);

  const { unassignedTickets, assignedTickets } = useMemo(() => {
    const sorted = [...tickets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const unassigned: SupportTicket[] = [];
    const assigned: SupportTicket[] = [];

    for (const ticket of sorted) {
      const priority = normalizePriority(ticket.priority);
      if (!priority) {
        unassigned.push(ticket);
      } else {
        assigned.push(ticket);
      }
    }

    assigned.sort((a, b) => {
      const aPriority = normalizePriority(a.priority) || 'low';
      const bPriority = normalizePriority(b.priority) || 'low';
      const diff = priorityOrder[aPriority] - priorityOrder[bPriority];
      if (diff !== 0) return diff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return { unassignedTickets: unassigned, assignedTickets: assigned };
  }, [tickets]);

  const applyTicketUpdateLocally = (updated: SupportTicket) => {
    setTickets((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    setSelectedTicket((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  };

  const updateTicketStatus = async (status: SupportWorkflowStatus, note?: string) => {
    if (!selectedTicket) return;
    try {
      setStatusSaving(true);
      const updated = await MasterSupportService.updateSupportRequest(selectedTicket.id, {
        status,
        resolution_note: note,
      });
      applyTicketUpdateLocally(updated);
      Toast.show({ type: 'success', text1: 'Support', text2: `Ticket marked ${status.replace('_', ' ')}` });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Support', text2: e.message || 'Failed to update ticket status' });
    } finally {
      setStatusSaving(false);
    }
  };

  const updateTicketPriority = async (priority: TicketPriority) => {
    if (!selectedTicket) return;
    try {
      setStatusSaving(true);
      const updated = await MasterSupportService.updateSupportRequest(selectedTicket.id, {
        priority,
      });
      applyTicketUpdateLocally(updated);
      Toast.show({ type: 'success', text1: 'Support', text2: `Priority set to ${priority}` });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Support', text2: e.message || 'Failed to update ticket priority' });
    } finally {
      setStatusSaving(false);
    }
  };

  const deleteTicket = async () => {
    if (!selectedTicket) return;
    try {
      setDeleteSaving(true);
      await MasterSupportService.deleteSupportRequest(selectedTicket.id);
      setTickets((prev) => prev.filter((t) => t.id !== selectedTicket.id));
      setSelectedTicket(null);
      Toast.show({ type: 'success', text1: 'Support', text2: 'Ticket deleted successfully' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Support', text2: e.message || 'Failed to delete ticket' });
    } finally {
      setDeleteSaving(false);
    }
  };

  const openTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setResolutionNote('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${c.primary}20`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <MaterialCommunityIcons name="headphones" size={20} color={c.primary} />
            </View>
            <View>
              <Text style={{ color: c.text, fontSize: 22, fontWeight: '800' }}>Support Desk</Text>
              <Text style={{ color: c.sub, fontSize: 12 }}>Ticket lifecycle management</Text>
            </View>
          </View>
          <TouchableOpacity onPress={loadTickets}>
            <MaterialCommunityIcons name="refresh" size={22} color={c.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 8 }}>
            <ListItemSkeleton loading={loading} count={6} label="Loading support tickets..." />
          </View>
        ) : tickets.length === 0 ? (
          <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 28, alignItems: 'center' }}>
            <MaterialCommunityIcons name="check-all" size={38} color={c.sub} />
            <Text style={{ color: c.text, fontWeight: '800', marginTop: 10 }}>No active tickets</Text>
            <Text style={{ color: c.sub, marginTop: 6, textAlign: 'center' }}>No pending support tickets at the moment.</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              <TouchableOpacity
                onPress={() => setQueuePage('unassigned')}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: queuePage === 'unassigned' ? c.primary : c.border,
                  backgroundColor: queuePage === 'unassigned' ? `${c.primary}20` : c.card,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: 'center',
                  marginRight: 6,
                }}
              >
                <Text style={{ color: queuePage === 'unassigned' ? c.primary : c.text, fontWeight: '800', fontSize: 12 }}>
                  Unassigned ({unassignedTickets.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setQueuePage('assigned')}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: queuePage === 'assigned' ? c.primary : c.border,
                  backgroundColor: queuePage === 'assigned' ? `${c.primary}20` : c.card,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: 'center',
                  marginLeft: 6,
                }}
              >
                <Text style={{ color: queuePage === 'assigned' ? c.primary : c.text, fontWeight: '800', fontSize: 12 }}>
                  Assigned ({assignedTickets.length})
                </Text>
              </TouchableOpacity>
            </View>

            {queuePage === 'unassigned' ? (
              <>
                {unassignedTickets.length === 0 ? (
                  <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14 }}>
                    <Text style={{ color: c.sub, fontSize: 12 }}>All open tickets have a priority assignment.</Text>
                  </View>
                ) : (
                  unassignedTickets.map((ticket) => {
                    const wf = (ticket.workflow_status || 'pending') as SupportWorkflowStatus;
                    return (
                      <TouchableOpacity
                        key={ticket.id}
                        onPress={() => openTicket(ticket)}
                        style={{
                          backgroundColor: c.card,
                          borderWidth: 1,
                          borderColor: c.border,
                          borderRadius: 14,
                          padding: 14,
                          marginBottom: 10,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={{ color: c.text, fontWeight: '800', flex: 1, marginRight: 10 }} numberOfLines={1}>{ticket.subject}</Text>
                          <View style={{ backgroundColor: `${statusColor(wf, isDark)}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ color: statusColor(wf, isDark), fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{wf.replace('_', ' ')}</Text>
                          </View>
                        </View>
                        <Text style={{ color: c.sub, fontSize: 12 }} numberOfLines={2}>{ticket.description}</Text>
                        <Text style={{ color: c.warn, fontSize: 11, fontWeight: '700', marginTop: 8 }}>Assign priority to move this ticket to active queue.</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            ) : (
              <>
                {assignedTickets.length === 0 ? (
                  <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14 }}>
                    <Text style={{ color: c.sub, fontSize: 12 }}>No tickets with assigned priority yet.</Text>
                  </View>
                ) : (
                  assignedTickets.map((ticket) => {
                    const wf = (ticket.workflow_status || 'pending') as SupportWorkflowStatus;
                    const ticketPriority = normalizePriority(ticket.priority) || 'low';
                    const pColor = priorityColor(ticketPriority, isDark);
                    return (
                      <TouchableOpacity
                        key={ticket.id}
                        onPress={() => openTicket(ticket)}
                        style={{
                          backgroundColor: c.card,
                          borderWidth: 1,
                          borderColor: c.border,
                          borderRadius: 14,
                          padding: 14,
                          marginBottom: 10,
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={{ color: c.text, fontWeight: '800', flex: 1, marginRight: 10 }} numberOfLines={1}>{ticket.subject}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ backgroundColor: `${pColor}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 }}>
                              <Text style={{ color: pColor, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{ticketPriority}</Text>
                            </View>
                            <View style={{ backgroundColor: `${statusColor(wf, isDark)}20`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                              <Text style={{ color: statusColor(wf, isDark), fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>{wf.replace('_', ' ')}</Text>
                            </View>
                          </View>
                        </View>
                        <Text style={{ color: c.sub, fontSize: 12 }} numberOfLines={2}>{ticket.description}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={!!selectedTicket} transparent animationType="fade" onRequestClose={() => setSelectedTicket(null)}>
        <View style={{ flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <Text style={{ color: c.text, fontSize: 17, fontWeight: '800' }}>View Ticket</Text>
              <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                <MaterialCommunityIcons name="close" size={22} color={c.sub} />
              </TouchableOpacity>
            </View>

            {!!selectedTicket && (
              <View style={{ padding: 14, paddingBottom: 18 }}>
                <Text style={{ color: c.sub, fontSize: 11, textTransform: 'uppercase', fontWeight: '700' }}>Subject</Text>
                <Text style={{ color: c.text, fontSize: 17, fontWeight: '800', marginTop: 4 }}>{selectedTicket.subject}</Text>

                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: c.sub, fontSize: 11, textTransform: 'uppercase', fontWeight: '700' }}>Description</Text>
                  <Text style={{ color: c.text, marginTop: 4, lineHeight: 20 }}>{selectedTicket.description}</Text>
                </View>

                <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
                  <View style={{ marginRight: 14, marginBottom: 8 }}>
                    <Text style={{ color: c.sub, fontSize: 11 }}>Priority</Text>
                    <Text style={{ color: selectedPriority ? priorityColor(selectedPriority, isDark) : c.text, fontWeight: '700', textTransform: 'uppercase' }}>
                      {selectedPriority || 'unassigned'}
                    </Text>
                  </View>
                  <View style={{ marginRight: 14, marginBottom: 8 }}>
                    <Text style={{ color: c.sub, fontSize: 11 }}>Status</Text>
                    <Text style={{ color: statusColor(workflowStatus, isDark), fontWeight: '800' }}>{workflowStatus.replace('_', ' ')}</Text>
                  </View>
                  <View style={{ marginRight: 14, marginBottom: 8 }}>
                    <Text style={{ color: c.sub, fontSize: 11 }}>Created</Text>
                    <Text style={{ color: c.text, fontWeight: '700' }}>{new Date(selectedTicket.created_at).toLocaleString()}</Text>
                  </View>
                  {selectedTicket?.resolved_at ? (
                    <View style={{ marginRight: 14, marginBottom: 8 }}>
                      <Text style={{ color: c.sub, fontSize: 11 }}>Resolved</Text>
                      <Text style={{ color: c.text, fontWeight: '700' }}>{new Date(selectedTicket.resolved_at).toLocaleString()}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 }}>
                  <Text style={{ color: c.text, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>Priority Assignment</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                    {PRIORITY_LEVELS.map((priority) => {
                      const active = selectedPriority === priority;
                      const pColor = priorityColor(priority, isDark);
                      return (
                        <TouchableOpacity
                          key={priority}
                          disabled={statusSaving}
                          onPress={() => updateTicketPriority(priority)}
                          style={{
                            borderWidth: 1,
                            borderColor: active ? pColor : c.border,
                            backgroundColor: active ? `${pColor}20` : c.card,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                            marginRight: 8,
                            marginBottom: 8,
                            opacity: statusSaving ? 0.6 : 1,
                          }}
                        >
                          <Text style={{ color: active ? pColor : c.text, fontWeight: '800', fontSize: 12, textTransform: 'uppercase' }}>{priority}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={{ color: c.text, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>Lifecycle Actions</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <TouchableOpacity
                      disabled={!canMarkAcknowledged || statusSaving}
                      onPress={() => updateTicketStatus('acknowledged')}
                      style={{
                        backgroundColor: canMarkAcknowledged ? c.info : c.border,
                        opacity: (!canMarkAcknowledged || statusSaving) ? 0.6 : 1,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Mark Acknowledged</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={!canMarkInProgress || statusSaving}
                      onPress={() => updateTicketStatus('in_progress')}
                      style={{
                        backgroundColor: canMarkInProgress ? c.warn : c.border,
                        opacity: (!canMarkInProgress || statusSaving) ? 0.6 : 1,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Mark In Progress</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={!canResolve || statusSaving}
                      onPress={() => setResolveConfirmOpen(true)}
                      style={{
                        backgroundColor: canResolve ? c.success : c.border,
                        opacity: (!canResolve || statusSaving) ? 0.6 : 1,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Mark Resolved</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    disabled={!canDelete || deleteSaving}
                    onPress={deleteTicket}
                    style={{
                      borderWidth: 1,
                      borderColor: c.danger,
                      opacity: (!canDelete || deleteSaving) ? 0.5 : 1,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginTop: 4,
                      alignSelf: 'flex-start',
                    }}
                  >
                    <Text style={{ color: c.danger, fontWeight: '700', fontSize: 12 }}>Delete Ticket</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={resolveConfirmOpen} transparent animationType="fade" onRequestClose={() => setResolveConfirmOpen(false)}>
        <View style={{ flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: 18 }}>
          <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14 }}>
            <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>Confirm Resolution</Text>
            <Text style={{ color: c.sub, marginTop: 8 }}>You are about to mark this ticket as resolved. You can add an optional note for the institution admin.</Text>

            <TextInput
              value={resolutionNote}
              onChangeText={setResolutionNote}
              placeholder="Optional resolution note"
              placeholderTextColor={c.sub}
              multiline
              style={{
                marginTop: 12,
                minHeight: 90,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 10,
                padding: 10,
                color: c.text,
                backgroundColor: c.input,
                textAlignVertical: 'top',
              }}
            />

            <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setResolveConfirmOpen(false)} style={{ paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 }}>
                <Text style={{ color: c.sub, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  setResolveConfirmOpen(false);
                  await updateTicketStatus('resolved', resolutionNote.trim());
                  setResolutionNote('');
                }}
                style={{ backgroundColor: c.success, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Confirm Resolve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
