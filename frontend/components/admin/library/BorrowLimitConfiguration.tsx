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

  // ── Material Dark tokens ──────────────────────────────────────────────────
  const bg = isDark ? '#121212' : '#fff7ed';           // light green bg preserved in light
  const surface = isDark ? '#1e1e1e' : '#ffffff';
  const surfaceAlt = isDark ? '#242424' : '#f9fafb';
  const border = isDark ? '#2c2c2c' : '#e2e8f0';
  const textPrimary = isDark ? '#f1f1f1' : '#1e293b';
  const textSecondary = isDark ? '#9ca3af' : '#64748b';
  const textMuted = isDark ? '#6b7280' : '#6b7280';
  const inputBg = isDark ? '#242424' : '#f9fafb';
  const inputBorder = isDark ? '#2c2c2c' : '#e2e8f0';
  const orangeBg = isDark ? 'rgba(255,107,0,0.08)' : '#fff7ed';
  const orangeBorder = isDark ? 'rgba(255,107,0,0.2)' : 'rgba(255,107,0,0.2)';

  const defaultRoles: UserRole[] = [
    { id: "1", name: "Student", description: "Regular students", maxBooks: 3, borrowDuration: 14, canRenew: true, maxRenewals: 1, finePerDay: 0.5, isActive: true },
    { id: "2", name: "Faculty", description: "Teaching staff and professors", maxBooks: 10, borrowDuration: 30, canRenew: true, maxRenewals: 3, finePerDay: 1.0, isActive: true },
    { id: "3", name: "Graduate Student", description: "PhD and Masters students", maxBooks: 5, borrowDuration: 21, canRenew: true, maxRenewals: 2, finePerDay: 0.75, isActive: true },
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

  const renderRoleCard = (role: UserRole) => {
    const isExpanded = expandedRole === role.id;
    return (
      <View key={role.id} style={{ backgroundColor: surface, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: border }}>
        {/* Role Header */}
        <TouchableOpacity
          style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isExpanded ? orangeBg : 'transparent', borderRadius: isExpanded ? 0 : 12 }}
          onPress={() => setExpandedRole(isExpanded ? null : role.id)}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: role.isActive ? '#10b981' : '#6b7280', marginRight: 8 }} />
              <View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: textPrimary }}>{role.name}</Text>
                <Text style={{ fontSize: 11, color: textMuted }}>{role.maxBooks} books • {role.borrowDuration} days</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 4 }}>{role.description}</Text>
            <Text style={{ fontSize: 11, color: '#FF6B00' }}>Max {role.maxBooks} books • {role.borrowDuration} days duration</Text>
          </View>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={textSecondary} />
        </TouchableOpacity>

        {/* Expanded */}
        {isExpanded && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: border }}>
            <View style={{ paddingTop: 16 }}>
              {/* Name */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>Role Name</Text>
                <TextInput
                  style={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 12, fontSize: 13, color: textPrimary }}
                  value={role.name}
                  onChangeText={(text) => handleUpdateRole(role.id, "name", text)}
                />
              </View>

              {/* Description */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>Description</Text>
                <TextInput
                  style={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 12, fontSize: 13, color: textPrimary }}
                  value={role.description}
                  onChangeText={(text) => handleUpdateRole(role.id, "description", text)}
                  multiline
                />
              </View>

              {/* Borrowing Limits */}
              <View style={{ backgroundColor: orangeBg, borderWidth: 1, borderColor: orangeBorder, padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <Text style={{ fontWeight: '600', color: textPrimary, marginBottom: 12 }}>Borrowing Limits</Text>

                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 4 }}>Max Books</Text>
                    <TextInput
                      style={{ backgroundColor: surface, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 8, textAlign: 'center', color: textPrimary }}
                      value={role.maxBooks.toString()}
                      onChangeText={(text) => handleUpdateRole(role.id, "maxBooks", parseInt(text) || 1)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 4 }}>Duration (days)</Text>
                    <TextInput
                      style={{ backgroundColor: surface, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 8, textAlign: 'center', color: textPrimary }}
                      value={role.borrowDuration.toString()}
                      onChangeText={(text) => handleUpdateRole(role.id, "borrowDuration", parseInt(text) || 1)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, color: textSecondary }}>Allow Renewals</Text>
                  <Switch value={role.canRenew} onValueChange={(value) => handleUpdateRole(role.id, "canRenew", value)} thumbColor={role.canRenew ? "#FF6B00" : "#f4f3f4"} trackColor={{ false: "#767577", true: "rgba(255,107,0,0.2)" }} />
                </View>

                {role.canRenew && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 4 }}>Max Renewals</Text>
                    <TextInput
                      style={{ backgroundColor: surface, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 8, textAlign: 'center', color: textPrimary }}
                      value={role.maxRenewals.toString()}
                      onChangeText={(text) => handleUpdateRole(role.id, "maxRenewals", parseInt(text) || 0)}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 4 }}>Fine per Day ($)</Text>
                  <TextInput
                    style={{ backgroundColor: surface, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 8, textAlign: 'center', color: textPrimary }}
                    value={role.finePerDay.toString()}
                    onChangeText={(text) => handleUpdateRole(role.id, "finePerDay", parseFloat(text) || 0)}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: textSecondary }}>Active Role</Text>
                  <Switch value={role.isActive} onValueChange={(value) => handleUpdateRole(role.id, "isActive", value)} thumbColor={role.isActive ? "#FF6B00" : "#f4f3f4"} trackColor={{ false: "#767577", true: "rgba(255,107,0,0.2)" }} />
                </View>
              </View>

              {/* Delete */}
              <TouchableOpacity
                style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2', padding: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={() => handleDeleteRole(role.id, role.name)}
              >
                <Text style={{ color: isDark ? '#fca5a5' : '#b91c1c', fontWeight: '500' }}>Delete Role</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderAddRoleForm = () => {
    if (!showAddForm) return null;
    return (
      <View style={{ backgroundColor: surface, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: textPrimary }}>Add New Role</Text>
          <TouchableOpacity onPress={() => setShowAddForm(false)}>
            <Ionicons name="close" size={20} color={textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>Role Name</Text>
          <TextInput style={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 12, color: textPrimary }} value={newRole.name} onChangeText={(text) => setNewRole({ ...newRole, name: text })} placeholder="Enter role name" placeholderTextColor={textMuted} />
        </View>

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 6 }}>Description</Text>
          <TextInput style={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 12, color: textPrimary }} value={newRole.description} onChangeText={(text) => setNewRole({ ...newRole, description: text })} placeholder="Enter role description" placeholderTextColor={textMuted} multiline />
        </View>

        <View style={{ backgroundColor: orangeBg, borderWidth: 1, borderColor: orangeBorder, padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 4 }}>Max Books</Text>
              <TextInput style={{ backgroundColor: surface, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 8, textAlign: 'center', color: textPrimary }} value={newRole.maxBooks.toString()} onChangeText={(text) => setNewRole({ ...newRole, maxBooks: parseInt(text) || 1 })} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 4 }}>Duration (days)</Text>
              <TextInput style={{ backgroundColor: surface, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 8, textAlign: 'center', color: textPrimary }} value={newRole.borrowDuration.toString()} onChangeText={(text) => setNewRole({ ...newRole, borrowDuration: parseInt(text) || 1 })} keyboardType="numeric" />
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 13, color: textSecondary }}>Allow Renewals</Text>
            <Switch value={newRole.canRenew} onValueChange={(value) => setNewRole({ ...newRole, canRenew: value })} thumbColor={newRole.canRenew ? "#FF6B00" : "#f4f3f4"} trackColor={{ false: "#767577", true: "rgba(255,107,0,0.2)" }} />
          </View>

          {newRole.canRenew && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 4 }}>Max Renewals</Text>
              <TextInput style={{ backgroundColor: surface, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 8, textAlign: 'center', color: textPrimary }} value={newRole.maxRenewals.toString()} onChangeText={(text) => setNewRole({ ...newRole, maxRenewals: parseInt(text) || 0 })} keyboardType="numeric" />
            </View>
          )}

          <View>
            <Text style={{ fontSize: 12, color: textSecondary, marginBottom: 4 }}>Fine per Day ($)</Text>
            <TextInput style={{ backgroundColor: surface, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 8, textAlign: 'center', color: textPrimary }} value={newRole.finePerDay.toString()} onChangeText={(text) => setNewRole({ ...newRole, finePerDay: parseFloat(text) || 0 })} keyboardType="decimal-pad" />
          </View>
        </View>

        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: isDark ? '#242424' : '#f1f5f9', padding: 12, borderRadius: 8, marginRight: 8, alignItems: 'center' }} onPress={() => setShowAddForm(false)}>
            <Text style={{ color: textSecondary, fontWeight: '500' }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, backgroundColor: '#FF6B00', padding: 12, borderRadius: 8, marginLeft: 8, alignItems: 'center' }} onPress={handleAddRole}>
            <Text style={{ color: 'white', fontWeight: '500' }}>Add Role</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={{ backgroundColor: surface, padding: 16, borderBottomWidth: 1, borderBottomColor: border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 19, fontWeight: 'bold', color: textPrimary }}>Borrow Limit Configuration</Text>
          <TouchableOpacity style={{ backgroundColor: '#FF6B00', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }} onPress={() => setShowAddForm(true)}>
            <Text style={{ color: 'white', fontWeight: '500' }}>Add Role</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: orangeBg, borderWidth: 1, borderColor: orangeBorder, padding: 12, borderRadius: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name="information-circle" size={16} color="#FF6B00" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: isDark ? '#FF6B00' : '#c2410c', marginLeft: 6 }}>Configuration Tips</Text>
          </View>
          <Text style={{ fontSize: 12, color: isDark ? '#9ca3af' : '#c2410c' }}>
            Set different borrowing limits for different user types. Changes will apply to new borrows immediately.
          </Text>
        </View>
      </View>

      {/* Roles List */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {renderAddRoleForm()}

        {displayRoles.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
            <Ionicons name="people-outline" size={64} color={isDark ? '#2c2c2c' : 'rgba(255,107,0,0.2)'} />
            <Text style={{ color: textMuted, textAlign: 'center', marginTop: 16 }}>No user roles configured yet. Add your first role to get started.</Text>
          </View>
        ) : (
          displayRoles.map(renderRoleCard)
        )}

        {/* Global Settings — now fully dark mode */}
        <View style={{ backgroundColor: surface, borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: border }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: textPrimary, marginBottom: 16 }}>Global Library Settings</Text>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 4 }}>Grace Period (days)</Text>
            <Text style={{ fontSize: 11, color: textMuted, marginBottom: 8 }}>Grace period before fines start accumulating</Text>
            <TextInput style={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 12, width: 96, color: textPrimary }} value={globalSettings.gracePeriod.toString()} onChangeText={(text) => setGlobalSettings({ ...globalSettings, gracePeriod: parseInt(text) || 0 })} keyboardType="numeric" />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 4 }}>Maximum Fine Amount ($)</Text>
            <Text style={{ fontSize: 11, color: textMuted, marginBottom: 8 }}>Cap on total fines per book</Text>
            <TextInput style={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 12, width: 128, color: textPrimary }} value={globalSettings.maxFineAmount.toString()} onChangeText={(text) => setGlobalSettings({ ...globalSettings, maxFineAmount: parseFloat(text) || 0 })} keyboardType="decimal-pad" />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 4 }}>Reminder Days Before Due</Text>
            <Text style={{ fontSize: 11, color: textMuted, marginBottom: 8 }}>Days before due date to send reminders</Text>
            <TextInput style={{ backgroundColor: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: 8, padding: 12, width: 96, color: textPrimary }} value={globalSettings.reminderDays.toString()} onChangeText={(text) => setGlobalSettings({ ...globalSettings, reminderDays: parseInt(text) || 1 })} keyboardType="numeric" />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: textSecondary, marginBottom: 2 }}>Auto-reminder Emails</Text>
              <Text style={{ fontSize: 11, color: textMuted }}>Send automatic reminders for due books</Text>
            </View>
            <Switch value={globalSettings.autoReminders} onValueChange={(value) => setGlobalSettings({ ...globalSettings, autoReminders: value })} thumbColor={globalSettings.autoReminders ? "#FF6B00" : "#f4f3f4"} trackColor={{ false: "#767577", true: "rgba(255,107,0,0.2)" }} />
          </View>

          <TouchableOpacity
            style={{ backgroundColor: '#FF6B00', padding: 12, borderRadius: 8, alignItems: 'center' }}
            onPress={() => Alert.alert("Settings Saved", "Global settings have been updated successfully")}
          >
            <Text style={{ color: 'white', fontWeight: '500' }}>Save Global Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export { BorrowLimitConfiguration };
export default BorrowLimitConfiguration;