import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

export interface CredentialRequestItem {
  id: string;
  institution_id: string;
  user_id: string;
  request_type: 'name_change' | 'email_reset';
  current_value: string;
  requested_value: string;
  reason: string;
  document_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string | null;
  temp_credential?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  user?: {
    id: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email: string;
    role: string;
    avatar_url?: string;
  };
  reviewer?: {
    id: string;
    full_name?: string;
    email: string;
  };
}

export function CredentialRequestsSection() {
  const { isDark } = useTheme();
  const { width } = useWindowDimensions();

  const [requests, setRequests] = useState<CredentialRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | 'name_change' | 'email_reset'>('all');
  const [search, setSearch] = useState('');

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState<CredentialRequestItem | null>(null);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Result / Copy Credential Modal
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [generatedCredential, setGeneratedCredential] = useState<string>('');

  const bg = isDark ? '#161B22' : '#FFFFFF';
  const card = isDark ? '#0F141C' : '#F6F8FA';
  const border = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#F0F6FC' : '#1F2328';
  const textSecondary = isDark ? '#8B949E' : '#656D76';

  const copyToClipboard = (text: string, label = 'Credentials') => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any)?.clipboard?.writeText) {
      (navigator as any).clipboard.writeText(text);
    } else {
      try {
        const { Clipboard } = require('react-native');
        Clipboard.setString(text);
      } catch (err) {
        console.error('Clipboard copy error:', err);
      }
    }
    Toast.show({
      type: 'success',
      text1: 'Copied',
      text2: `${label} copied to clipboard`,
      position: 'top',
    });
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/credential-requests', {
        params: {
          status: statusFilter,
          request_type: typeFilter === 'all' ? undefined : typeFilter,
        },
      });
      setRequests(res.data?.data || []);
    } catch (err: any) {
      console.error('Error fetching credential requests:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.response?.data?.error || 'Failed to load requests',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, typeFilter]);

  const handleApprove = async () => {
    if (!selectedRequest || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/auth/credential-requests/${selectedRequest.id}/approve`, {
        admin_notes: adminNotes.trim(),
      });
      Toast.show({
        type: 'success',
        text1: 'Request Approved',
        text2: res.data?.message || 'The user credentials were updated successfully.',
      });

      if (res.data?.temp_credential?.copy_text || selectedRequest.request_type === 'email_reset') {
        const credentialText = res.data?.temp_credential?.copy_text || res.data?.temp_credential || '';
        setGeneratedCredential(credentialText);
        setApproveModalVisible(false);
        setResultModalVisible(true);
      } else {
        setApproveModalVisible(false);
      }

      fetchRequests();
    } catch (err: any) {
      console.error('Approval error:', err);
      Alert.alert('Approval Failed', err?.response?.data?.error || err.message || 'Failed to approve request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || submitting) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for rejecting this request.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/auth/credential-requests/${selectedRequest.id}/reject`, {
        rejection_reason: rejectionReason.trim(),
      });
      Toast.show({
        type: 'success',
        text1: 'Request Rejected',
        text2: res.data?.message || 'Request was rejected.',
      });
      setRejectModalVisible(false);
      fetchRequests();
    } catch (err: any) {
      console.error('Rejection error:', err);
      Alert.alert('Rejection Failed', err?.response?.data?.error || err.message || 'Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const term = search.toLowerCase();
    const name = (r.user?.full_name || `${r.user?.first_name || ''} ${r.user?.last_name || ''}`).toLowerCase();
    const email = (r.user?.email || '').toLowerCase();
    const reqVal = (r.requested_value || '').toLowerCase();
    return name.includes(term) || email.includes(term) || reqVal.includes(term);
  });

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Top Filter Bar */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: border }}>
        {/* Status filters */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => {
            const isActive = statusFilter === s;
            return (
              <TouchableOpacity
                key={s}
                onPress={() => setStatusFilter(s)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: isActive ? '#FF6900' : card,
                  borderWidth: 1,
                  borderColor: isActive ? '#FF6900' : border,
                }}
              >
                <Text
                  style={{
                    color: isActive ? '#FFFFFF' : textSecondary,
                    fontWeight: '700',
                    fontSize: 12,
                    textTransform: 'capitalize',
                  }}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={{ width: 1, height: 24, backgroundColor: border, marginHorizontal: 4, alignSelf: 'center' }} />

          {/* Type filters */}
          {(['all', 'name_change', 'email_reset'] as const).map((t) => {
            const isActive = typeFilter === t;
            const label = t === 'all' ? 'All Types' : t === 'name_change' ? 'Name Change' : 'Email Reset';
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setTypeFilter(t)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: isActive ? (isDark ? '#374151' : '#E5E7EB') : 'transparent',
                  borderWidth: 1,
                  borderColor: isActive ? border : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: isActive ? textPrimary : textSecondary,
                    fontWeight: '700',
                    fontSize: 12,
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? '#0F141C' : '#F6F8FA',
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: border,
          }}
        >
          <Ionicons name="search" size={16} color={textSecondary} />
          <TextInput
            style={{ flex: 1, marginLeft: 8, color: textPrimary, fontSize: 13 }}
            placeholder="Search by user name, email, or requested value..."
            placeholderTextColor={textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <ActivityIndicator size="large" color="#FF6900" />
          <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13 }}>Loading credential requests...</Text>
        </View>
      ) : filteredRequests.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Ionicons name="shield-checkmark-outline" size={48} color={textSecondary} />
          <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 16, marginTop: 14 }}>
            No Credential Requests Found
          </Text>
          <Text style={{ color: textSecondary, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
            {statusFilter === 'pending'
              ? 'All name change and email reset requests have been reviewed.'
              : 'No requests match your current filters.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => {
            const userName = item.user?.full_name || `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim() || 'User';
            const isEmail = item.request_type === 'email_reset';

            return (
              <View
                style={{
                  backgroundColor: card,
                  borderWidth: 1,
                  borderColor: border,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                {/* Header row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 15 }}>{userName}</Text>
                      <View
                        style={{
                          backgroundColor: item.user?.role === 'teacher' ? '#3B82F620' : '#10B98120',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: item.user?.role === 'teacher' ? '#3B82F6' : '#10B981',
                        }}
                      >
                        <Text
                          style={{
                            color: item.user?.role === 'teacher' ? '#3B82F6' : '#10B981',
                            fontSize: 10,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                          }}
                        >
                          {item.user?.role || 'user'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>{item.user?.email}</Text>
                  </View>

                  {/* Type & Status Badges */}
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View
                      style={{
                        backgroundColor: isEmail ? '#8B5CF620' : '#FF690020',
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: isEmail ? '#8B5CF6' : '#FF6900',
                      }}
                    >
                      <Text
                        style={{
                          color: isEmail ? '#8B5CF6' : '#FF6900',
                          fontSize: 10,
                          fontWeight: '800',
                          textTransform: 'uppercase',
                        }}
                      >
                        {isEmail ? 'Email Reset' : 'Name Change'}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor:
                          item.status === 'approved' ? '#10B98120' : item.status === 'rejected' ? '#EF444420' : '#F59E0B20',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            item.status === 'approved' ? '#10B981' : item.status === 'rejected' ? '#EF4444' : '#F59E0B',
                          fontSize: 10,
                          fontWeight: '800',
                          textTransform: 'uppercase',
                        }}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Change details */}
                <View
                  style={{
                    backgroundColor: isDark ? '#161B22' : '#FFFFFF',
                    borderRadius: 10,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: border,
                    marginBottom: 10,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700' }}>CURRENT</Text>
                    <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '600' }}>{item.current_value}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#FF6900', fontSize: 11, fontWeight: '800' }}>REQUESTED</Text>
                    <Text style={{ color: '#FF6900', fontSize: 13, fontWeight: '800' }}>{item.requested_value}</Text>
                  </View>
                  <View style={{ borderTopWidth: 1, borderTopColor: border, paddingTop: 6, marginTop: 2 }}>
                    <Text style={{ color: textSecondary, fontSize: 11 }}>Reason: {item.reason}</Text>
                  </View>
                </View>

                {/* Admin notes if rejected or reviewed */}
                {item.admin_notes && (
                  <Text style={{ color: textSecondary, fontSize: 11, fontStyle: 'italic', marginBottom: 8 }}>
                    Admin Note: {item.admin_notes}
                  </Text>
                )}

                {/* Stored Temp Credential if previously approved */}
                {item.temp_credential && (
                  <View
                    style={{
                      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5',
                      borderColor: '#10B981',
                      borderWidth: 1,
                      borderRadius: 10,
                      padding: 10,
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 11, marginBottom: 4 }}>
                      ISSUED TEMPORARY CREDENTIALS
                    </Text>
                    <Text style={{ color: textPrimary, fontSize: 11, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
                      {item.temp_credential}
                    </Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(item.temp_credential!, 'Credentials')}
                      style={{
                        marginTop: 6,
                        alignSelf: 'flex-start',
                        backgroundColor: '#10B981',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>Copy Credential Package</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Action buttons (Pending only) */}
                {item.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedRequest(item);
                        setRejectionReason('');
                        setRejectModalVisible(true);
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#EF4444',
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setSelectedRequest(item);
                        setAdminNotes('');
                        setApproveModalVisible(true);
                      }}
                      style={{
                        flex: 2,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: '#10B981',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Approve & Issue</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Approve Modal */}
      <Modal visible={approveModalVisible} transparent animationType="fade" onRequestClose={() => setApproveModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: card, borderRadius: 20, borderWidth: 1, borderColor: border, width: '100%', maxWidth: 460, padding: 20 }}>
            <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 6 }}>
              Approve Credential Request
            </Text>
            <Text style={{ color: textSecondary, fontSize: 12, marginBottom: 14 }}>
              {selectedRequest?.request_type === 'email_reset'
                ? 'Approving will update the user email address, revoke all active sessions, and automatically generate a secure temporary password. User relational history and data will be strictly preserved.'
                : 'Approving will update the user full name across all institutional records.'}
            </Text>

            <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
              ADMINISTRATIVE NOTES (OPTIONAL)
            </Text>
            <TextInput
              style={{
                backgroundColor: isDark ? '#161B22' : '#FFFFFF',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                color: textPrimary,
                padding: 10,
                fontSize: 13,
                minHeight: 60,
                marginBottom: 16,
              }}
              placeholder="e.g. Identity verified via original government ID / enrolled form"
              placeholderTextColor={textSecondary}
              value={adminNotes}
              onChangeText={setAdminNotes}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setApproveModalVisible(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: textSecondary, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApprove}
                disabled={submitting}
                style={{
                  flex: 2,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: '#10B981',
                  alignItems: 'center',
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Confirm Approval</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade" onRequestClose={() => setRejectModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: card, borderRadius: 20, borderWidth: 1, borderColor: border, width: '100%', maxWidth: 460, padding: 20 }}>
            <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '800', marginBottom: 6 }}>
              Reject Credential Request
            </Text>
            <Text style={{ color: textSecondary, fontSize: 12, marginBottom: 14 }}>
              The requester will be able to see the rejection reason on their profile view.
            </Text>

            <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
              REJECTION REASON (MANDATORY) *
            </Text>
            <TextInput
              style={{
                backgroundColor: isDark ? '#161B22' : '#FFFFFF',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: border,
                color: textPrimary,
                padding: 10,
                fontSize: 13,
                minHeight: 80,
                marginBottom: 16,
              }}
              placeholder="Provide a clear explanation for rejection..."
              placeholderTextColor={textSecondary}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setRejectModalVisible(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: textSecondary, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReject}
                disabled={submitting}
                style={{
                  flex: 2,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: '#EF4444',
                  alignItems: 'center',
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Confirm Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Result Credential Copy Modal */}
      <Modal visible={resultModalVisible} transparent animationType="fade" onRequestClose={() => setResultModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: card, borderRadius: 20, borderWidth: 1, borderColor: border, width: '100%', maxWidth: 480, padding: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Ionicons name="checkmark-circle" size={26} color="#10B981" />
              <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '800' }}>
                New Credentials Ready
              </Text>
            </View>

            <Text style={{ color: textSecondary, fontSize: 12, marginBottom: 14 }}>
              The email has been reset and a temporary password generated. Copy this package and communicate it securely to the user.
            </Text>

            <View
              style={{
                backgroundColor: isDark ? '#161B22' : '#FFFFFF',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: textPrimary,
                  fontSize: 12,
                  lineHeight: 18,
                  fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
                }}
                selectable
              >
                {generatedCredential}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setResultModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: textSecondary, fontWeight: '700', fontSize: 12 }}>Done</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => copyToClipboard(generatedCredential, 'Full Credential Package')}
                style={{
                  flex: 2,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: '#FF6900',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Copy Credentials</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
