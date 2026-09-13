import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceService } from '@/services/FinanceService';
import { showError, showSuccess } from '@/utils/toast';
import { Shield, ShieldAlert, ShieldCheck, UserCheck, UserX, History, Search } from 'lucide-react-native';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_finance_admin: boolean;
  assigned_at?: string | null;
  assigned_by?: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  target_user_id: string;
  target_user?: { name: string; email: string };
  changed_by?: { name: string; email: string };
  reason: string;
  created_at: string;
}

export const FinanceDesignationSection: React.FC = () => {
  const { isDark } = useTheme();
  const { isMain } = useAuth();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'designations' | 'audit'>('designations');

  // Modal for toggle action
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [adminsData, logsData] = await Promise.all([
        FinanceService.getFinanceAdmins(),
        FinanceService.getFinanceAdminAuditLogs(30),
      ]);
      const rawUsers: any[] = Array.isArray(adminsData) 
        ? adminsData 
        : (adminsData?.eligibleUsers || adminsData?.designations || (adminsData as any)?.data || []);
      const normalizedUsers: StaffUser[] = rawUsers.map((u: any) => ({
        id: u.id || u.user_id,
        name: u.name || u.full_name || u.user?.full_name || 'Staff Member',
        email: u.email || u.user?.email || '',
        role: u.role || u.user?.role || 'staff',
        is_finance_admin: !!(u.is_finance_admin || u.is_active || u.assigned_at),
        assigned_at: u.assigned_at || null,
        assigned_by: u.assigned_by || null,
      }));
      setUsers(normalizedUsers);

      const rawLogs: any[] = Array.isArray(logsData) 
        ? logsData 
        : (logsData?.logs || (logsData as any)?.data || []);
      const normalizedLogs: AuditLog[] = rawLogs.map((l: any) => ({
        id: l.id,
        action: l.action,
        target_user_id: l.target_user_id || l.user_id,
        target_user: l.target_user || { name: l.target_name || 'User', email: '' },
        changed_by: l.changed_by || { name: l.actor_name || 'Admin', email: '' },
        reason: l.reason || '',
        created_at: l.created_at,
      }));
      setAuditLogs(normalizedLogs);
    } catch (err: any) {
      showError('Failed to load designations', err?.message || 'Could not fetch records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleInitiate = (user: StaffUser) => {
    if (!isMain) {
      Alert.alert('Restricted Action', 'Only the Main School Administrator can designate or revoke Finance Administrators.');
      return;
    }
    setSelectedUser(user);
    setActionReason('');
  };

  const handleToggleConfirm = async () => {
    if (!selectedUser) return;
    if (!actionReason.trim()) {
      showError('Reason Required', 'Please enter a clear justification for this designation change.');
      return;
    }

    try {
      setSubmitting(true);
      const willDesignate = !selectedUser.is_finance_admin;
      await FinanceService.toggleFinanceAdmin(selectedUser.id, willDesignate, actionReason.trim());
      showSuccess(
        willDesignate ? 'Designated Finance Admin' : 'Revoked Finance Admin',
        `${selectedUser.name} has been ${willDesignate ? 'granted' : 'revoked'} Finance Administrator access.`
      );
      setSelectedUser(null);
      setActionReason('');
      await fetchData();
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Unable to update designation');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const cardBg = isDark ? '#161B22' : '#FFFFFF';
  const borderCol = isDark ? '#30363D' : '#E1E4E8';
  const textMuted = isDark ? '#8B949E' : '#586069';

  return (
    <View style={{ flex: 1 }}>
      {/* Sub tabs: Designations vs Audit Log */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => setActiveSubTab('designations')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 12,
            backgroundColor: activeSubTab === 'designations' ? '#FF6900' : isDark ? '#21262D' : '#F0F2F5',
          }}
        >
          <Shield size={16} color={activeSubTab === 'designations' ? '#FFF' : textMuted} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: activeSubTab === 'designations' ? '#FFF' : textMuted,
            }}
          >
            Staff Designations
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveSubTab('audit')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 12,
            backgroundColor: activeSubTab === 'audit' ? '#FF6900' : isDark ? '#21262D' : '#F0F2F5',
          }}
        >
          <History size={16} color={activeSubTab === 'audit' ? '#FFF' : textMuted} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: activeSubTab === 'audit' ? '#FFF' : textMuted,
            }}
          >
            Forensic Audit Trail
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF6900" />
          <Text style={{ marginTop: 12, color: textMuted, fontSize: 13 }}>Loading Finance Administrators...</Text>
        </View>
      ) : activeSubTab === 'designations' ? (
        <View>
          {/* Information banner */}
          <View
            style={{
              backgroundColor: isDark ? 'rgba(255, 105, 0, 0.1)' : '#FFF5EC',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 105, 0, 0.3)' : '#FFD9B3',
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <ShieldCheck size={24} color="#FF6900" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: isDark ? '#FFF' : '#111', fontSize: 13 }}>
                Dual-Role Finance Delegation
              </Text>
              <Text style={{ color: textMuted, fontSize: 12, marginTop: 2 }}>
                The Main Admin may designate Teachers or Operational Admins as Finance Administrators. Appointees gain
                access to fee structures, payment recording, and individual financial ledgers with an immutable audit log.
              </Text>
            </View>
          </View>

          {/* Search bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: borderCol,
              borderRadius: 12,
              paddingHorizontal: 12,
              marginBottom: 16,
            }}
          >
            <Search size={18} color={textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search staff by name, email, or role..."
              placeholderTextColor={textMuted}
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 8,
                color: isDark ? '#FFF' : '#111',
                fontSize: 14,
              }}
            />
          </View>

          {/* Users List */}
          {filteredUsers.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ color: textMuted, fontSize: 14 }}>No staff members match your search.</Text>
            </View>
          ) : (
            filteredUsers.map((user) => (
              <View
                key={user.id}
                style={{
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: user.is_finance_admin ? '#FF6900' : borderCol,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontWeight: '700', fontSize: 15, color: isDark ? '#FFF' : '#111' }}>
                      {user.name}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: isDark ? '#21262D' : '#EAECEF',
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: textMuted, textTransform: 'capitalize' }}>
                        {user.role}
                      </Text>
                    </View>
                    {user.is_finance_admin && (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: '#10B981',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFF' }}>
                          Finance Administrator
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: textMuted, fontSize: 12, marginTop: 4 }}>{user.email}</Text>
                  {user.is_finance_admin && user.assigned_at && (
                    <Text style={{ color: textMuted, fontSize: 11, marginTop: 4 }}>
                      Designated on {new Date(user.assigned_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => handleToggleInitiate(user)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    backgroundColor: user.is_finance_admin ? '#EF4444' : '#FF6900',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {user.is_finance_admin ? (
                    <>
                      <UserX size={15} color="#FFF" />
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Revoke</Text>
                    </>
                  ) : (
                    <>
                      <UserCheck size={15} color="#FFF" />
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>Designate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      ) : (
        /* Forensic Audit Trail */
        <View>
          {auditLogs.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <Text style={{ color: textMuted, fontSize: 14 }}>No designation audit logs recorded yet.</Text>
            </View>
          ) : (
            auditLogs.map((log) => (
              <View
                key={log.id}
                style={{
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: borderCol,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                        backgroundColor: log.action === 'assigned' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: log.action === 'assigned' ? '#10B981' : '#EF4444',
                          textTransform: 'uppercase',
                        }}
                      >
                        {log.action}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: '700', color: isDark ? '#FFF' : '#111', fontSize: 13 }}>
                      {log.target_user?.name || log.target_user?.email || 'Staff Member'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: textMuted }}>
                    {new Date(log.created_at).toLocaleString()}
                  </Text>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 12, color: textMuted }}>
                    <Text style={{ fontWeight: '600' }}>Changed by: </Text>
                    {log.changed_by?.name || log.changed_by?.email || 'Main Admin'}
                  </Text>
                  <Text style={{ fontSize: 12, color: isDark ? '#D1D5DB' : '#374151', marginTop: 2 }}>
                    <Text style={{ fontWeight: '600', color: textMuted }}>Reason: </Text>
                    {log.reason}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Confirmation & Reason Modal */}
      <Modal
        visible={!!selectedUser}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.65)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: isDark ? '#161B22' : '#FFFFFF',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: borderCol,
              maxWidth: 480,
              width: '100%',
              padding: 22,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {selectedUser?.is_finance_admin ? (
                <ShieldAlert size={26} color="#EF4444" />
              ) : (
                <ShieldCheck size={26} color="#FF6900" />
              )}
              <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#FFF' : '#111' }}>
                {selectedUser?.is_finance_admin
                  ? 'Revoke Finance Administrator'
                  : 'Designate Finance Administrator'}
              </Text>
            </View>

            <Text style={{ fontSize: 13, color: textMuted, marginBottom: 16, lineHeight: 18 }}>
              {selectedUser?.is_finance_admin
                ? `You are revoking Finance Administrator privileges from ${selectedUser?.name}. They will immediately lose access to finance operation portals.`
                : `You are designating ${selectedUser?.name} (${selectedUser?.role}) as a Finance Administrator. They will be granted full access to school financial accounts, ledgers, and fee structures.`}
            </Text>

            <Text style={{ fontWeight: '700', fontSize: 12, color: isDark ? '#FFF' : '#111', marginBottom: 6 }}>
              Justification / Reason (Mandatory Audit Note) *
            </Text>
            <TextInput
              value={actionReason}
              onChangeText={setActionReason}
              placeholder="e.g., Appointed interim bursar for Term 2 duties"
              placeholderTextColor={textMuted}
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: borderCol,
                borderRadius: 10,
                padding: 10,
                color: isDark ? '#FFF' : '#111',
                backgroundColor: isDark ? '#0D1117' : '#F6F8FA',
                textAlignVertical: 'top',
                minHeight: 70,
                fontSize: 13,
                marginBottom: 18,
              }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setSelectedUser(null)}
                disabled={submitting}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor: isDark ? '#21262D' : '#EAECEF',
                }}
              >
                <Text style={{ fontWeight: '600', color: isDark ? '#FFF' : '#111', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleConfirm}
                disabled={submitting}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  borderRadius: 10,
                  backgroundColor: selectedUser?.is_finance_admin ? '#EF4444' : '#FF6900',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 110,
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ fontWeight: '700', color: '#FFF', fontSize: 13 }}>
                    {selectedUser?.is_finance_admin ? 'Revoke Access' : 'Confirm Access'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
