import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export interface UserRole {
  id: string;
  name: string;
  description: string;
  maxBooks: number;
  borrowDuration: number;
  canRenew: boolean;
  maxRenewals: number;
  finePerDay: number;
  isActive: boolean;
}

export interface BorrowLimitConfigurationProps {
  userRoles?: UserRole[];
  onUpdateRole?: (roleId: string, updatedRole: Partial<UserRole>) => void;
  onAddRole?: (role: Omit<UserRole, "id">) => void;
  onDeleteRole?: (roleId: string) => void;
}

const BorrowLimitConfiguration: React.FC<BorrowLimitConfigurationProps> = ({
  userRoles = [],
  onUpdateRole,
  onAddRole,
  onDeleteRole,
}) => {
  const { isDark } = useTheme();
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({
    gracePeriod: 3,
    maxFineAmount: 50.0,
    autoReminders: true,
    reminderDays: 2,
  });
  const [newRole, setNewRole] = useState<Omit<UserRole, "id">>({
    name: "",
    description: "",
    maxBooks: 3,
    borrowDuration: 14,
    canRenew: true,
    maxRenewals: 1,
    finePerDay: 0.5,
    isActive: true,
  });

  // Design system tokens
  const bg          = isDark ? '#0D1117' : '#FFFFFF';
  const card        = isDark ? '#161B22' : '#F6F8FA';
  const elevated    = isDark ? '#1C2128' : '#EAEEF2';
  const border      = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#ffffff' : '#111827';
  const textMuted   = isDark ? '#9ca3af' : '#6b7280';

  const defaultRoles: UserRole[] = [
    { id: "1", name: "Student",          description: "Regular students",               maxBooks: 3,  borrowDuration: 14, canRenew: true, maxRenewals: 1, finePerDay: 0.50, isActive: true },
    { id: "2", name: "Faculty",          description: "Teaching staff and professors",  maxBooks: 10, borrowDuration: 30, canRenew: true, maxRenewals: 3, finePerDay: 1.00, isActive: true },
    { id: "3", name: "Graduate Student", description: "PhD and Masters students",       maxBooks: 5,  borrowDuration: 21, canRenew: true, maxRenewals: 2, finePerDay: 0.75, isActive: true },
  ];

  const displayRoles = userRoles.length > 0 ? userRoles : defaultRoles;

  const handleUpdateRole = (roleId: string, field: keyof UserRole, value: any) => {
    onUpdateRole?.(roleId, { [field]: value });
  };

  const handleAddRole = () => {
    if (!newRole.name || !newRole.description) {
      Alert.alert("Error", "Please fill in role name and description");
      return;
    }
    onAddRole?.(newRole);
    setNewRole({ name: "", description: "", maxBooks: 3, borrowDuration: 14, canRenew: true, maxRenewals: 1, finePerDay: 0.5, isActive: true });
    setShowAddForm(false);
  };

  const handleDeleteRole = (roleId: string, roleName: string) => {
    Alert.alert("Delete Role", `Are you sure you want to delete the "${roleName}" role?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDeleteRole?.(roleId) },
    ]);
  };

  const inputStyle = {
    backgroundColor: elevated,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: textPrimary,
  };

  const renderRoleCard = (role: UserRole) => {
    const isExpanded = expandedRole === role.id;
    return (
      <View key={role.id} style={{ backgroundColor: card, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: border }}>

        {/* Role Header */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          onPress={() => setExpandedRole(isExpanded ? null : role.id)}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: role.isActive ? '#10b981' : '#6b7280', marginRight: 8 }} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }}>{role.name}</Text>
            </View>
            <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{role.description}</Text>
            <Text style={{ fontSize: 11, color: '#FF6900', fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {role.maxBooks} books · {role.borrowDuration} days
            </Text>
          </View>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={textMuted} />
        </TouchableOpacity>

        {/* Expanded */}
        {isExpanded && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: border, paddingTop: 16, gap: 12 }}>

            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Role Name</Text>
              <TextInput style={inputStyle} value={role.name} onChangeText={(t) => handleUpdateRole(role.id, "name", t)} />
            </View>

            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</Text>
              <TextInput style={inputStyle} value={role.description} onChangeText={(t) => handleUpdateRole(role.id, "description", t)} multiline />
            </View>

            {/* Borrowing Limits */}
            <View style={{ backgroundColor: elevated, borderWidth: 1, borderColor: border, padding: 14, borderRadius: 10, gap: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Borrowing Limits</Text>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontWeight: '700' }}>Max Books</Text>
                  <TextInput style={{ ...inputStyle, textAlign: 'center' }} value={role.maxBooks.toString()} onChangeText={(t) => handleUpdateRole(role.id, "maxBooks", parseInt(t) || 1)} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontWeight: '700' }}>Duration (days)</Text>
                  <TextInput style={{ ...inputStyle, textAlign: 'center' }} value={role.borrowDuration.toString()} onChangeText={(t) => handleUpdateRole(role.id, "borrowDuration", parseInt(t) || 1)} keyboardType="numeric" />
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: textMuted }}>Allow Renewals</Text>
                <Switch value={role.canRenew} onValueChange={(v) => handleUpdateRole(role.id, "canRenew", v)} thumbColor="#ffffff" trackColor={{ false: border, true: "#FF6900" }} />
              </View>

              {role.canRenew && (
                <View>
                  <Text style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontWeight: '700' }}>Max Renewals</Text>
                  <TextInput style={{ ...inputStyle, textAlign: 'center' }} value={role.maxRenewals.toString()} onChangeText={(t) => handleUpdateRole(role.id, "maxRenewals", parseInt(t) || 0)} keyboardType="numeric" />
                </View>
              )}

              <View>
                <Text style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontWeight: '700' }}>Fine per Day ($)</Text>
                <TextInput style={{ ...inputStyle, textAlign: 'center' }} value={role.finePerDay.toString()} onChangeText={(t) => handleUpdateRole(role.id, "finePerDay", parseFloat(t) || 0)} keyboardType="decimal-pad" />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: textMuted }}>Active Role</Text>
                <Switch value={role.isActive} onValueChange={(v) => handleUpdateRole(role.id, "isActive", v)} thumbColor="#ffffff" trackColor={{ false: border, true: "#FF6900" }} />
              </View>
            </View>

            {/* Delete */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#fee2e2', borderWidth: 1, borderColor: isDark ? 'rgba(239,68,68,0.2)' : '#fecaca', padding: 12, borderRadius: 10, alignItems: 'center' }}
              onPress={() => handleDeleteRole(role.id, role.name)}
            >
              <Text style={{ color: isDark ? '#fca5a5' : '#b91c1c', fontWeight: '700', fontSize: 13 }}>Delete Role</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderAddRoleForm = () => {
    if (!showAddForm) return null;
    return (
      <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: border, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: textPrimary }}>Add New Role</Text>
          <TouchableOpacity onPress={() => setShowAddForm(false)} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={textMuted} />
          </TouchableOpacity>
        </View>

        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Role Name</Text>
          <TextInput style={inputStyle} value={newRole.name} onChangeText={(t) => setNewRole({ ...newRole, name: t })} placeholder="Enter role name" placeholderTextColor={textMuted} />
        </View>

        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</Text>
          <TextInput style={inputStyle} value={newRole.description} onChangeText={(t) => setNewRole({ ...newRole, description: t })} placeholder="Enter role description" placeholderTextColor={textMuted} multiline />
        </View>

        <View style={{ backgroundColor: elevated, borderWidth: 1, borderColor: border, padding: 14, borderRadius: 10, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontWeight: '700' }}>Max Books</Text>
              <TextInput style={{ ...inputStyle, textAlign: 'center' }} value={newRole.maxBooks.toString()} onChangeText={(t) => setNewRole({ ...newRole, maxBooks: parseInt(t) || 1 })} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontWeight: '700' }}>Duration (days)</Text>
              <TextInput style={{ ...inputStyle, textAlign: 'center' }} value={newRole.borrowDuration.toString()} onChangeText={(t) => setNewRole({ ...newRole, borrowDuration: parseInt(t) || 1 })} keyboardType="numeric" />
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: textMuted }}>Allow Renewals</Text>
            <Switch value={newRole.canRenew} onValueChange={(v) => setNewRole({ ...newRole, canRenew: v })} thumbColor="#ffffff" trackColor={{ false: border, true: "#FF6900" }} />
          </View>

          {newRole.canRenew && (
            <View>
              <Text style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontWeight: '700' }}>Max Renewals</Text>
              <TextInput style={{ ...inputStyle, textAlign: 'center' }} value={newRole.maxRenewals.toString()} onChangeText={(t) => setNewRole({ ...newRole, maxRenewals: parseInt(t) || 0 })} keyboardType="numeric" />
            </View>
          )}

          <View>
            <Text style={{ fontSize: 11, color: textMuted, marginBottom: 4, fontWeight: '700' }}>Fine per Day ($)</Text>
            <TextInput style={{ ...inputStyle, textAlign: 'center' }} value={newRole.finePerDay.toString()} onChangeText={(t) => setNewRole({ ...newRole, finePerDay: parseFloat(t) || 0 })} keyboardType="decimal-pad" />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity activeOpacity={0.7} style={{ flex: 1, backgroundColor: elevated, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: border }} onPress={() => setShowAddForm(false)}>
            <Text style={{ color: textMuted, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={{ flex: 1, backgroundColor: '#FF6900', padding: 12, borderRadius: 10, alignItems: 'center' }} onPress={handleAddRole}>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Add Role</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>

      {/* Header */}
      <View style={{ backgroundColor: card, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '900', color: textPrimary, letterSpacing: -0.3 }}>Borrow Limits</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>Configuration</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            style={{ backgroundColor: '#FF6900', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
            onPress={() => setShowAddForm(true)}
          >
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Add Role</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: elevated, borderWidth: 1, borderColor: border, padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Ionicons name="information-circle-outline" size={16} color="#FF6900" style={{ marginTop: 1 }} />
          <Text style={{ fontSize: 12, color: textMuted, flex: 1, lineHeight: 18 }}>
            Set different borrowing limits per user type. Changes apply to new borrows immediately.
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {renderAddRoleForm()}

        {displayRoles.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="people-outline" size={40} color={textMuted} />
            <Text style={{ color: textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 12 }}>
              No roles configured
            </Text>
          </View>
        ) : (
          displayRoles.map(renderRoleCard)
        )}

        {/* Global Settings */}
        <View style={{ backgroundColor: card, borderRadius: 12, padding: 16, marginTop: 4, borderWidth: 1, borderColor: border, gap: 16 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Global Library Settings</Text>

          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Grace Period (days)</Text>
            <Text style={{ fontSize: 11, color: textMuted, marginBottom: 8 }}>Days before fines start accumulating</Text>
            <TextInput style={{ ...inputStyle, width: 96 }} value={globalSettings.gracePeriod.toString()} onChangeText={(t) => setGlobalSettings({ ...globalSettings, gracePeriod: parseInt(t) || 0 })} keyboardType="numeric" />
          </View>

          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Maximum Fine ($)</Text>
            <Text style={{ fontSize: 11, color: textMuted, marginBottom: 8 }}>Cap on total fines per book</Text>
            <TextInput style={{ ...inputStyle, width: 120 }} value={globalSettings.maxFineAmount.toString()} onChangeText={(t) => setGlobalSettings({ ...globalSettings, maxFineAmount: parseFloat(t) || 0 })} keyboardType="decimal-pad" />
          </View>

          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: textMuted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Reminder Days Before Due</Text>
            <Text style={{ fontSize: 11, color: textMuted, marginBottom: 8 }}>Days before due date to notify</Text>
            <TextInput style={{ ...inputStyle, width: 96 }} value={globalSettings.reminderDays.toString()} onChangeText={(t) => setGlobalSettings({ ...globalSettings, reminderDays: parseInt(t) || 1 })} keyboardType="numeric" />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>Auto-reminder Emails</Text>
              <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>Send automatic reminders for due books</Text>
            </View>
            <Switch value={globalSettings.autoReminders} onValueChange={(v) => setGlobalSettings({ ...globalSettings, autoReminders: v })} thumbColor="#ffffff" trackColor={{ false: border, true: "#FF6900" }} />
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            style={{ backgroundColor: '#FF6900', padding: 13, borderRadius: 10, alignItems: 'center' }}
            onPress={() => Alert.alert("Settings Saved", "Global settings have been updated successfully")}
          >
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Save Global Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export { BorrowLimitConfiguration };
export default BorrowLimitConfiguration;