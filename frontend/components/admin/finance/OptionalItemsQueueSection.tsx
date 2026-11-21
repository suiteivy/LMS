import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { FinanceService } from '@/services/FinanceService';
import { showSuccess, showError } from '@/utils/toast';

export const OptionalItemsQueueSection: React.FC = () => {
  const { isDark } = useTheme();
  const { formatAmount } = useCurrency();

  const [activeTab, setActiveTab] = useState<'queue' | 'rosters'>('queue');
  const [loading, setLoading] = useState(false);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  // Operational Rosters
  const [rosterType, setRosterType] = useState<string>('transport');
  const [rosterItems, setRosterItems] = useState<any[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  // Modal for admin action notes
  const [modalVisible, setModalVisible] = useState(false);
  const [modalItem, setModalItem] = useState<any | null>(null);
  const [modalAction, setModalAction] = useState<'confirm_opt_out' | 'mark_taking'>('confirm_opt_out');
  const [modalNotes, setModalNotes] = useState('');

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const params = filterStatus !== 'all' ? { status: filterStatus } : undefined;
      const data = await FinanceService.getOptionalItemsQueue(params);
      setQueueItems(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (err: any) {
      console.error('Failed to load optional queue:', err);
      showError('Error', 'Failed to load optional fee review queue.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRosters = async () => {
    try {
      setLoadingRoster(true);
      const data = await FinanceService.getOperationalRosters({ catalog_type: rosterType });
      setRosterItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load rosters:', err);
      showError('Error', 'Failed to load operational roster.');
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'queue') {
      fetchQueue();
    } else {
      fetchRosters();
    }
  }, [activeTab, filterStatus, rosterType]);

  const handleConfirmOptOut = async (id: string, notes?: string) => {
    try {
      setBusyActionId(id);
      await FinanceService.confirmOptOut(id, { admin_notes: notes });
      showSuccess('Opt-Out Confirmed', 'The student opt-out has been confirmed and verified.');
      fetchQueue();
    } catch (err: any) {
      console.error('Failed to confirm opt out:', err);
      showError('Action Failed', err?.response?.data?.error || 'Unable to confirm opt-out.');
    } finally {
      setBusyActionId(null);
      setModalVisible(false);
    }
  };

  const handleMarkTaking = async (item: any, notes?: string) => {
    try {
      setBusyActionId(item.id);
      await FinanceService.markTakingItem({
        student_id: item.student_id,
        fee_type_id: item.fee_type_id,
        variant_id: item.variant_id,
        quantity: item.quantity || 1,
        admin_notes: notes,
      });
      showSuccess('Item Approved', 'Item confirmed as taken and applied to student account.');
      fetchQueue();
    } catch (err: any) {
      console.error('Failed to mark item as taking:', err);
      showError('Action Failed', err?.response?.data?.error || 'Unable to mark item.');
    } finally {
      setBusyActionId(null);
      setModalVisible(false);
    }
  };

  const handleSendReminder = async (id: string) => {
    try {
      setBusyActionId(id);
      await FinanceService.sendOptionalItemReminder(id);
      showSuccess('Reminder Dispatched', 'A notification reminder was sent to the student guardian.');
    } catch (err: any) {
      console.error('Failed to send reminder:', err);
      showError('Reminder Failed', 'Unable to send reminder to parent.');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleBulkAction = async (action: 'confirm_opt_out' | 'mark_taking') => {
    if (selectedIds.length === 0) return;
    try {
      setLoading(true);
      await FinanceService.bulkConfirmOptionalItems({
        action,
        selection_ids: selectedIds,
      });
      showSuccess('Batch Processed', `Successfully updated ${selectedIds.length} item(s).`);
      fetchQueue();
    } catch (err: any) {
      console.error('Bulk update error:', err);
      showError('Bulk Action Failed', 'Unable to complete bulk update.');
    } finally {
      setLoading(false);
    }
  };

  const filteredQueue = queueItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const studentName = (item.students?.users?.full_name || '').toLowerCase();
    const admNo = (item.students?.admission_number || '').toLowerCase();
    const itemName = (item.fee_types?.name || '').toLowerCase();
    return studentName.includes(query) || admNo.includes(query) || itemName.includes(query);
  });

  const bg = isDark ? '#161B22' : '#FFFFFF';
  const cardBg = isDark ? '#21262D' : '#F6F8FA';
  const border = isDark ? '#30363D' : '#E5E7EB';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <View style={{ gap: 16 }}>
      {/* Sub-navigation tabs */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: isDark ? '#21262D' : '#E5E7EB',
          borderRadius: 10,
          padding: 4,
          alignSelf: 'flex-start',
        }}
      >
        <TouchableOpacity
          onPress={() => setActiveTab('queue')}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: activeTab === 'queue' ? '#FF6900' : 'transparent',
          }}
        >
          <Text
            style={{
              color: activeTab === 'queue' ? '#FFFFFF' : textPrimary,
              fontWeight: '700',
              fontSize: 13,
            }}
          >
            Review Queue
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('rosters')}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: activeTab === 'rosters' ? '#FF6900' : 'transparent',
          }}
        >
          <Text
            style={{
              color: activeTab === 'rosters' ? '#FFFFFF' : textPrimary,
              fontWeight: '700',
              fontSize: 13,
            }}
          >
            Operational Rosters
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================
          TAB 1: REVIEW QUEUE
         ========================================================= */}
      {activeTab === 'queue' && (
        <View style={{ gap: 16 }}>
          {/* Filter Bar */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Search */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: bg,
                borderWidth: 1,
                borderColor: border,
                borderRadius: 8,
                paddingHorizontal: 12,
                flex: 1,
                minWidth: 240,
                height: 40,
              }}
            >
              <Ionicons name="search-outline" size={18} color={textSecondary} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search student or optional item..."
                placeholderTextColor={textSecondary}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  color: textPrimary,
                  fontSize: 13,
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Status Pills */}
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'selected', label: 'Selected' },
                { id: 'opted_out', label: 'Opted Out' },
                { id: 'confirmed_opt_out', label: 'Verified Opt-Out' },
              ].map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setFilterStatus(s.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: filterStatus === s.id ? '#FF6900' : border,
                    backgroundColor: filterStatus === s.id ? (isDark ? 'rgba(255,105,0,0.2)' : '#FFF0E5') : bg,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: filterStatus === s.id ? '#FF6900' : textSecondary,
                    }}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bulk actions banner if items selected */}
          {selectedIds.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isDark ? '#1C2733' : '#E6F4EA',
                padding: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isDark ? '#2E4C6E' : '#B7E1CD',
              }}
            >
              <Text style={{ color: textPrimary, fontSize: 13, fontWeight: '700' }}>
                {selectedIds.length} item(s) selected
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => handleBulkAction('confirm_opt_out')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: '#EF4444',
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                    Confirm Opt-Outs
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBulkAction('mark_taking')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: '#10B981',
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                    Mark as Taking
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Queue List */}
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#FF6900" />
              <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13 }}>
                Loading review queue...
              </Text>
            </View>
          ) : filteredQueue.length === 0 ? (
            <View
              style={{
                padding: 40,
                alignItems: 'center',
                backgroundColor: bg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <Ionicons name="checkbox-outline" size={48} color={textSecondary} />
              <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 16, marginTop: 12 }}>
                Review Queue Clean
              </Text>
              <Text style={{ color: textSecondary, fontSize: 13, marginTop: 4 }}>
                No pending optional item choices or opt-outs requiring review.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filteredQueue.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const isOptOut = item.status === 'opted_out' || item.status === 'confirmed_opt_out';
                const statusColor =
                  item.status === 'confirmed_opt_out'
                    ? '#6B7280'
                    : item.status === 'opted_out'
                    ? '#EF4444'
                    : '#10B981';

                return (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: bg,
                      borderWidth: 1,
                      borderColor: isSelected ? '#FF6900' : border,
                      borderRadius: 10,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    {/* Checkbox */}
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedIds((prev) =>
                          prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                        );
                      }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={isSelected ? '#FF6900' : textSecondary}
                      />
                    </TouchableOpacity>

                    {/* Details */}
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 14 }}>
                          {item.students?.users?.full_name || 'Student'}
                        </Text>
                        <Text style={{ color: textSecondary, fontSize: 12 }}>
                          ({item.students?.admission_number || 'No Adm'})
                        </Text>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 10,
                            backgroundColor: `${statusColor}20`,
                          }}
                        >
                          <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700' }}>
                            {item.status.replace(/_/g, ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <Text style={{ color: textSecondary, fontSize: 12 }}>
                        Item:{' '}
                        <Text style={{ color: textPrimary, fontWeight: '600' }}>
                          {item.fee_types?.name || 'Optional Fee'}
                        </Text>
                        {item.fee_item_variants?.name ? ` · Variant: ${item.fee_item_variants?.name}` : ''}
                        {item.quantity && item.quantity > 1 ? ` · Qty: ${item.quantity}` : ''}
                      </Text>

                      {item.opt_out_reason ? (
                        <Text style={{ color: '#EF4444', fontSize: 11, fontStyle: 'italic' }}>
                          Reason: "{item.opt_out_reason}"
                        </Text>
                      ) : null}

                      {item.admin_notes ? (
                        <Text style={{ color: textSecondary, fontSize: 11 }}>
                          Admin Note: {item.admin_notes}
                        </Text>
                      ) : null}
                    </View>

                    {/* Amount & Actions */}
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 14 }}>
                        {formatAmount(item.calculated_amount || item.unit_price || 0)}
                      </Text>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {item.status === 'opted_out' && (
                          <TouchableOpacity
                            onPress={() => {
                              setModalItem(item);
                              setModalAction('confirm_opt_out');
                              setModalNotes('');
                              setModalVisible(true);
                            }}
                            disabled={busyActionId === item.id}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              backgroundColor: '#6B7280',
                              borderRadius: 6,
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                              Confirm Opt-Out
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => {
                            setModalItem(item);
                            setModalAction('mark_taking');
                            setModalNotes('');
                            setModalVisible(true);
                          }}
                          disabled={busyActionId === item.id}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            backgroundColor: '#10B981',
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                            Mark Taking
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleSendReminder(item.id)}
                          disabled={busyActionId === item.id}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            backgroundColor: isDark ? '#30363D' : '#E5E7EB',
                            borderRadius: 6,
                          }}
                          accessibilityLabel="Send reminder"
                        >
                          <Ionicons name="notifications-outline" size={14} color={textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* =========================================================
          TAB 2: OPERATIONAL ROSTERS
         ========================================================= */}
      {activeTab === 'rosters' && (
        <View style={{ gap: 16 }}>
          {/* Roster Type Selector */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { id: 'transport', label: 'Transport / Bus Routes' },
              { id: 'meals', label: 'Meal Plans & Dietary' },
              { id: 'activities', label: 'Clubs & Activities' },
            ].map((r) => (
              <TouchableOpacity
                key={r.id}
                onPress={() => setRosterType(r.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: rosterType === r.id ? '#FF6900' : border,
                  backgroundColor: rosterType === r.id ? (isDark ? 'rgba(255,105,0,0.2)' : '#FFF0E5') : bg,
                }}
              >
                <Text
                  style={{
                    color: rosterType === r.id ? '#FF6900' : textSecondary,
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Rosters View */}
          {loadingRoster ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#FF6900" />
              <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13 }}>
                Generating operational roster...
              </Text>
            </View>
          ) : rosterItems.length === 0 ? (
            <View
              style={{
                padding: 40,
                alignItems: 'center',
                backgroundColor: bg,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <Ionicons name="bus-outline" size={48} color={textSecondary} />
              <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 16, marginTop: 12 }}>
                No Active Roster Enrollees
              </Text>
              <Text style={{ color: textSecondary, fontSize: 13, marginTop: 4 }}>
                No students currently enrolled in this option category.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {rosterItems.map((rosterGroup, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: bg,
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      padding: 12,
                      backgroundColor: cardBg,
                      borderBottomWidth: 1,
                      borderBottomColor: border,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 14 }}>
                      {rosterGroup.group_name || 'Roster Group'} ({rosterGroup.students?.length || 0} students)
                    </Text>
                    {rosterGroup.capacity ? (
                      <Text style={{ color: textSecondary, fontSize: 12 }}>
                        Capacity: {rosterGroup.students?.length || 0} / {rosterGroup.capacity}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ padding: 12, gap: 8 }}>
                    {(rosterGroup.students || []).map((st: any, sIdx: number) => (
                      <View
                        key={sIdx}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 6,
                          borderBottomWidth: sIdx < rosterGroup.students.length - 1 ? 1 : 0,
                          borderBottomColor: border,
                        }}
                      >
                        <View>
                          <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 13 }}>
                            {st.full_name}
                          </Text>
                          <Text style={{ color: textSecondary, fontSize: 11 }}>
                            Adm: {st.admission_number} · Class: {st.class_name || 'Unassigned'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: textPrimary, fontSize: 12 }}>
                            {st.guardian_contact || 'No emergency contact'}
                          </Text>
                          {st.pickup_notes ? (
                            <Text style={{ color: textSecondary, fontSize: 11, fontStyle: 'italic' }}>
                              {st.pickup_notes}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Confirmation / Notes Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: bg,
              borderRadius: 12,
              padding: 20,
              width: '100%',
              maxWidth: 440,
              gap: 14,
              borderWidth: 1,
              borderColor: border,
            }}
          >
            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 16 }}>
              {modalAction === 'confirm_opt_out' ? 'Confirm Student Opt-Out' : 'Mark Item as Taking'}
            </Text>
            <Text style={{ color: textSecondary, fontSize: 13 }}>
              {modalAction === 'confirm_opt_out'
                ? 'Confirming opt-out records this as official and removes any pending fee charges.'
                : 'Marking as taking enrolls the student and updates their payable account balance.'}
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>Admin Notes (Optional)</Text>
              <TextInput
                value={modalNotes}
                onChangeText={setModalNotes}
                placeholder="Enter notes for audit trail..."
                placeholderTextColor={textSecondary}
                style={{
                  borderWidth: 1,
                  borderColor: border,
                  borderRadius: 8,
                  padding: 10,
                  color: textPrimary,
                  fontSize: 13,
                  minHeight: 60,
                }}
                multiline
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: border,
                }}
              >
                <Text style={{ color: textSecondary, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (modalAction === 'confirm_opt_out') {
                    handleConfirmOptOut(modalItem.id, modalNotes);
                  } else {
                    handleMarkTaking(modalItem, modalNotes);
                  }
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: modalAction === 'confirm_opt_out' ? '#EF4444' : '#10B981',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
