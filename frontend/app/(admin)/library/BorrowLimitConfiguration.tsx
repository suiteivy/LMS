import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ScrollViewBase,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

export const BorrowLimitConfiguration: React.FC<
  BorrowLimitConfigurationProps
> = ({ userRoles = [], onUpdateRole, onAddRole, onDeleteRole }) => {
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

  const defaultRoles: UserRole[] = [
    {
      id: "1",
      name: "Student",
      description: "Regular students",
      maxBooks: 3,
      borrowDuration: 14,
      canRenew: true,
      maxRenewals: 1,
      finePerDay: 0.5,
      isActive: true,
    },
    {
      id: "2",
      name: "Faculty",
      description: "Teaching staff and professors",
      maxBooks: 10,
      borrowDuration: 30,
      canRenew: true,
      maxRenewals: 3,
      finePerDay: 1.0,
      isActive: true,
    },
    {
      id: "3",
      name: "Graduate Student",
      description: "PhD and Masters students",
      maxBooks: 5,
      borrowDuration: 21,
      canRenew: true,
      maxRenewals: 2,
      finePerDay: 0.75,
      isActive: true,
    },
  ];

  const displayRoles = userRoles.length > 0 ? userRoles : defaultRoles;

  const handleUpdateRole = (
    roleId: string,
    field: keyof UserRole,
    value: any
  ) => {
    onUpdateRole?.(roleId, { [field]: value });
  };

  const handleAddRole = () => {
    if (!newRole.name || !newRole.description) {
      Alert.alert("Error", "Please fill in role name and description");
      return;
    }

    onAddRole?.(newRole);
    setNewRole({
      name: "",
      description: "",
      maxBooks: 3,
      borrowDuration: 14,
      canRenew: true,
      maxRenewals: 1,
      finePerDay: 0.5,
      isActive: true,
    });
    setShowAddForm(false);
  };

  const handleDeleteRole = (roleId: string, roleName: string) => {
    Alert.alert(
      "Delete Role",
      `Are you sure you want to delete the "${roleName}" role?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteRole?.(roleId),
        },
      ]
    );
  };

  const renderRoleCard = (role: UserRole) => {
    const isExpanded = expandedRole === role.id;

    return (
      <View
        key={role.id}
        className="bg-white rounded-xl mb-4 shadow-sm border border-slate-200"
      >
        {/* Role Header */}
        <TouchableOpacity
          className="p-4 flex-row justify-between items-center"
          onPress={() => setExpandedRole(isExpanded ? null : role.id)}
        >
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text className="text-lg font-semibold text-slate-800 mr-2">
                {role.name}
              </Text>
              <View
                className={`px-2 py-1 rounded-full ${
                  role.isActive ? "bg-teal-100" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    role.isActive ? "text-teal-800" : "text-gray-600"
                  }`}
                >
                  {role.isActive ? "ACTIVE" : "INACTIVE"}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-gray-600 mb-2">
              {role.description}
            </Text>
            <Text className="text-xs text-teal-600">
              Max {role.maxBooks} books • {role.borrowDuration} days duration
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#64748B"
          />
        </TouchableOpacity>

        {/* Expanded Configuration */}
        {isExpanded && (
          <View className="px-4 pb-4 border-t border-gray-100">
            <View className="pt-4">
              {/* Basic Settings */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-700 mb-2">
                  Role Name
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm"
                  value={role.name}
                  onChangeText={(text) =>
                    handleUpdateRole(role.id, "name", text)
                  }
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-slate-700 mb-2">
                  Description
                </Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm"
                  value={role.description}
                  onChangeText={(text) =>
                    handleUpdateRole(role.id, "description", text)
                  }
                  multiline
                />
              </View>

              {/* Borrow Limits */}
              <View className="bg-mint-50 p-3 rounded-lg mb-4">
                <Text className="font-medium text-slate-800 mb-3">
                  Borrowing Limits
                </Text>

                <View className="flex-row mb-3">
                  <View className="flex-1 mr-2">
                    <Text className="text-sm text-slate-700 mb-1">
                      Max Books
                    </Text>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-lg p-2 text-center"
                      value={role.maxBooks.toString()}
                      onChangeText={(text) =>
                        handleUpdateRole(
                          role.id,
                          "maxBooks",
                          parseInt(text) || 1
                        )
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  <View className="flex-1 ml-2">
                    <Text className="text-sm text-slate-700 mb-1">
                      Duration (days)
                    </Text>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-lg p-2 text-center"
                      value={role.borrowDuration.toString()}
                      onChangeText={(text) =>
                        handleUpdateRole(
                          role.id,
                          "borrowDuration",
                          parseInt(text) || 1
                        )
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-sm text-slate-700">Allow Renewals</Text>
                  <Switch
                    value={role.canRenew}
                    onValueChange={(value) =>
                      handleUpdateRole(role.id, "canRenew", value)
                    }
                    thumbColor={role.canRenew ? "#128C7E" : "#f4f3f4"}
                    trackColor={{ false: "#767577", true: "#A1EBE5" }}
                  />
                </View>

                {role.canRenew && (
                  <View className="mb-3">
                    <Text className="text-sm text-slate-700 mb-1">
                      Max Renewals
                    </Text>
                    <TextInput
                      className="bg-white border border-gray-200 rounded-lg p-2 text-center"
                      value={role.maxRenewals.toString()}
                      onChangeText={(text) =>
                        handleUpdateRole(
                          role.id,
                          "maxRenewals",
                          parseInt(text) || 0
                        )
                      }
                      keyboardType="numeric"
                    />
                  </View>
                )}

                <View className="mb-3">
                  <Text className="text-sm text-slate-700 mb-1">
                    Fine per Day ($)
                  </Text>
                  <TextInput
                    className="bg-white border border-gray-200 rounded-lg p-2 text-center"
                    value={role.finePerDay.toString()}
                    onChangeText={(text) =>
                      handleUpdateRole(
                        role.id,
                        "finePerDay",
                        parseFloat(text) || 0
                      )
                    }
                    keyboardType="decimal-pad"
                  />
                </View>

                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-slate-700">Active Role</Text>
                  <Switch
                    value={role.isActive}
                    onValueChange={(value) =>
                      handleUpdateRole(role.id, "isActive", value)
                    }
                    thumbColor={role.isActive ? "#128C7E" : "#f4f3f4"}
                    trackColor={{ false: "#767577", true: "#A1EBE5" }}
                  />
                </View>
              </View>

              {/* Actions */}
              <View className="flex-row">
                <TouchableOpacity
                  className="bg-red-100 flex-1 py-3 rounded-lg active:bg-red-200"
                  onPress={() => handleDeleteRole(role.id, role.name)}
                >
                  <Text className="text-red-700 text-center font-medium">
                    Delete Role
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderAddRoleForm = () => {
    if (!showAddForm) return null;

    return (
      <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-slate-200">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-semibold text-slate-800">
            Add New Role
          </Text>
          <TouchableOpacity onPress={() => setShowAddForm(false)}>
            <Ionicons name="close" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View className="mb-3">
          <Text className="text-sm font-medium text-slate-700 mb-2">
            Role Name
          </Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg p-3"
            value={newRole.name}
            onChangeText={(text) => setNewRole({ ...newRole, name: text })}
            placeholder="Enter role name"
          />
        </View>

        <View className="mb-3">
          <Text className="text-sm font-medium text-slate-700 mb-2">
            Description
          </Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-lg p-3"
            value={newRole.description}
            onChangeText={(text) =>
              setNewRole({ ...newRole, description: text })
            }
            placeholder="Enter role description"
            multiline
          />
        </View>

        <View className="bg-mint-50 p-3 rounded-lg mb-4">
          <View className="flex-row mb-3">
            <View className="flex-1 mr-2">
              <Text className="text-sm text-slate-700 mb-1">Max Books</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-lg p-2 text-center"
                value={newRole.maxBooks.toString()}
                onChangeText={(text) =>
                  setNewRole({ ...newRole, maxBooks: parseInt(text) || 1 })
                }
                keyboardType="numeric"
              />
            </View>

            <View className="flex-1 ml-2">
              <Text className="text-sm text-slate-700 mb-1">
                Duration (days)
              </Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-lg p-2 text-center"
                value={newRole.borrowDuration.toString()}
                onChangeText={(text) =>
                  setNewRole({
                    ...newRole,
                    borrowDuration: parseInt(text) || 1,
                  })
                }
                keyboardType="numeric"
              />
            </View>
          </View>

          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-sm text-slate-700">Allow Renewals</Text>
            <Switch
              value={newRole.canRenew}
              onValueChange={(value) =>
                setNewRole({ ...newRole, canRenew: value })
              }
              thumbColor={newRole.canRenew ? "#128C7E" : "#f4f3f4"}
              trackColor={{ false: "#767577", true: "#A1EBE5" }}
            />
          </View>

          {newRole.canRenew && (
            <View className="mb-3">
              <Text className="text-sm text-slate-700 mb-1">Max Renewals</Text>
              <TextInput
                className="bg-white border border-gray-200 rounded-lg p-2 text-center"
                value={newRole.maxRenewals.toString()}
                onChangeText={(text) =>
                  setNewRole({ ...newRole, maxRenewals: parseInt(text) || 0 })
                }
                keyboardType="numeric"
              />
            </View>
          )}

          <View className="mb-3">
            <Text className="text-sm text-slate-700 mb-1">
              Fine per Day ($)
            </Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-lg p-2 text-center"
              value={newRole.finePerDay.toString()}
              onChangeText={(text) =>
                setNewRole({ ...newRole, finePerDay: parseFloat(text) || 0 })
              }
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View className="flex-row">
          <TouchableOpacity
            className="bg-gray-100 flex-1 py-3 rounded-lg mr-2 active:bg-gray-200"
            onPress={() => setShowAddForm(false)}
          >
            <Text className="text-gray-700 text-center font-medium">
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-teal-600 flex-1 py-3 rounded-lg ml-2 active:bg-teal-700"
            onPress={handleAddRole}
          >
            <Text className="text-white text-center font-medium">Add Role</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-mint-50">
      {/* Header */}
      <View className="bg-white p-4 border-b border-slate-200">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-slate-800">
            Borrow Limit Configuration
          </Text>
          <TouchableOpacity
            className="bg-teal-600 px-4 py-2 rounded-lg active:bg-teal-700"
            onPress={() => setShowAddForm(true)}
          >
            <Text className="text-white font-medium">Add Role</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-teal-100 p-3 rounded-lg">
          <View className="flex-row items-center mb-1">
            <Ionicons name="information-circle" size={16} color="#128C7E" />
            <Text className="text-sm font-medium text-teal-800 ml-2">
              Configuration Tips
            </Text>
          </View>
          <Text className="text-xs text-teal-700">
            Set different borrowing limits for different user types. Note
            Changes will apply to new borrows immediately.
          </Text>
        </View>
      </View>

      {/* Roles List */}
      <ScrollView className="flex-1 p-4">
        {renderAddRoleForm()}

        {displayRoles.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Ionicons name="people-outline" size={64} color="#A1EBE5" />
            <Text className="text-gray-500 text-center mt-4">
              No user roles configured yet. Add your first role to get started.
            </Text>
          </View>
        ) : (
          displayRoles.map(renderRoleCard)
        )}

        {/* Global Settings */}
        <View className="bg-white rounded-xl p-4 mt-4 shadow-sm border border-slate-200">
          <Text className="text-lg font-semibold text-slate-800 mb-4">
            Global Library Settings
          </Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-700 mb-2">
              Grace Period (days)
            </Text>
            <Text className="text-xs text-gray-600 mb-2">
              Grace period before fines start accumulating
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 w-24"
              value={globalSettings.gracePeriod.toString()}
              onChangeText={(text) =>
                setGlobalSettings({
                  ...globalSettings,
                  gracePeriod: parseInt(text) || 0,
                })
              }
              keyboardType="numeric"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-700 mb-2">
              Maximum Fine Amount ($)
            </Text>
            <Text className="text-xs text-gray-600 mb-2">
              Cap on total fines per book
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 w-32"
              value={globalSettings.maxFineAmount.toString()}
              onChangeText={(text) =>
                setGlobalSettings({
                  ...globalSettings,
                  maxFineAmount: parseFloat(text) || 0,
                })
              }
              keyboardType="decimal-pad"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-700 mb-2">
              Reminder Days Before Due
            </Text>
            <Text className="text-xs text-gray-600 mb-2">
              Days before due date to send reminders
            </Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-lg p-3 w-24"
              value={globalSettings.reminderDays.toString()}
              onChangeText={(text) =>
                setGlobalSettings({
                  ...globalSettings,
                  reminderDays: parseInt(text) || 1,
                })
              }
              keyboardType="numeric"
            />
          </View>

          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-slate-700 mb-1">
                Auto-reminder Emails
              </Text>
              <Text className="text-xs text-gray-600">
                Send automatic reminders for due books
              </Text>
            </View>
            <Switch
              value={globalSettings.autoReminders}
              onValueChange={(value) =>
                setGlobalSettings({ ...globalSettings, autoReminders: value })
              }
              thumbColor={globalSettings.autoReminders ? "#128C7E" : "#f4f3f4"}
              trackColor={{ false: "#767577", true: "#A1EBE5" }}
            />
          </View>

          <TouchableOpacity
            className="bg-teal-600 py-3 rounded-lg active:bg-teal-700"
            onPress={() =>
              Alert.alert(
                "Settings Saved",
                "Global settings have been updated successfully"
              )
            }
          >
            <Text className="text-white text-center font-medium">
              Save Global Settings
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};
