import { FeeStructure } from "@/types/types";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  Switch,
  ScrollView,
} from "react-native";

interface FeeStructureSectionProps {
  feeStructures: FeeStructure[];
  loading: boolean;
  onFeeStructureUpdate: (feeStructure: Partial<FeeStructure>) => void;
  onRefresh?: () => void;
}

export const FeeStructureSection: React.FC<FeeStructureSectionProps> = ({
  feeStructures,
  loading,
  onFeeStructureUpdate,
  onRefresh,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(
    null
  );
  const [formData, setFormData] = useState({
    course_name: "",
    base_fee: "",
    registration_fee: "",
    material_fee: "",
    teacher_rate: "",
    bursary_percentage: "",
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      course_name: "",
      base_fee: "",
      registration_fee: "",
      material_fee: "",
      teacher_rate: "",
      bursary_percentage: "",
      is_active: true,
    });
    setEditingStructure(null);
  };

  const openEditForm = (structure: FeeStructure) => {
    setEditingStructure(structure);
    setFormData({
      course_name: structure.course_name,
      base_fee: structure.base_fee.toString(),
      registration_fee: structure.registration_fee.toString(),
      material_fee: structure.material_fee.toString(),
      teacher_rate: structure.teacher_rate.toString(),
      bursary_percentage: structure.bursary_percentage.toString(),
      is_active: structure.is_active,
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.course_name || !formData.base_fee) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const feeStructureData: Partial<FeeStructure> = {
      ...(editingStructure && { id: editingStructure.id }),
      course_name: formData.course_name,
      base_fee: parseFloat(formData.base_fee),
      registration_fee: parseFloat(formData.registration_fee) || 0,
      material_fee: parseFloat(formData.material_fee) || 0,
      teacher_rate: parseFloat(formData.teacher_rate) || 0,
      bursary_percentage: parseFloat(formData.bursary_percentage) || 0,
      is_active: formData.is_active,
      effective_date: new Date().toISOString(),
    };

    onFeeStructureUpdate(feeStructureData);
    resetForm();
    setShowForm(false);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  const calculateStudentFee = (structure: FeeStructure) => {
    const totalFee =
      structure.base_fee + structure.registration_fee + structure.material_fee;
    const bursaryAmount = (totalFee * structure.bursary_percentage) / 100;
    return totalFee - bursaryAmount;
  };

  const renderFeeStructureItem = ({ item }: { item: FeeStructure }) => (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-lg font-semibold text-gray-900 flex-1">
          {item.course_name}
        </Text>
        <View className="flex-row items-center space-x-2">
          {item.is_active ? (
            <View className="px-2 py-1 bg-green-100 rounded-full">
              <Text className="text-xs font-medium text-green-800">Active</Text>
            </View>
          ) : (
            <View className="px-2 py-1 bg-gray-100 rounded-full">
              <Text className="text-xs font-medium text-gray-600">
                Inactive
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={() => openEditForm(item)} className="p-1">
            <Text className="text-blue-600 text-sm">Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Fee Breakdown */}
      <View className="space-y-2 mb-3">
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600">Base Fee:</Text>
          <Text className="text-sm font-medium">
            {formatAmount(item.base_fee)}
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600">Registration:</Text>
          <Text className="text-sm font-medium">
            {formatAmount(item.registration_fee)}
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600">Materials:</Text>
          <Text className="text-sm font-medium">
            {formatAmount(item.material_fee)}
          </Text>
        </View>

        <View className="flex-row justify-between border-t border-gray-100 pt-2">
          <Text className="text-sm font-medium text-gray-900">
            Total Course Fee:
          </Text>
          <Text className="text-sm font-bold">
            {formatAmount(
              item.base_fee + item.registration_fee + item.material_fee
            )}
          </Text>
        </View>
      </View>

      {/* Bursary Information */}
      <View className="bg-blue-50 rounded-lg p-3 mb-3">
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm font-medium text-blue-800">
            Bursary Coverage:
          </Text>
          <Text className="text-sm font-bold text-blue-800">
            {item.bursary_percentage}%
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-sm text-blue-700">Student Pays:</Text>
          <Text className="text-sm font-bold text-blue-900">
            {formatAmount(calculateStudentFee(item))}
          </Text>
        </View>
      </View>

      {/* Teacher Rate */}
      <View className="flex-row justify-between bg-gray-50 rounded-lg p-3">
        <Text className="text-sm text-gray-600">Teacher Rate:</Text>
        <Text className="text-sm font-medium text-gray-900">
          {formatAmount(item.teacher_rate)}/hour
        </Text>
      </View>

      <Text className="text-xs text-gray-500 mt-2">
        Effective: {new Date(item.effective_date).toLocaleDateString()}
      </Text>
    </View>
  );

  const activeFeeStructures = feeStructures.filter((fs) => fs.is_active);

  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold text-gray-900">Fee Structure</Text>
      </View>

      {/* Summary Cards */}
      <View className="flex-row space-x-3 mb-4">
        <View className="flex-1 bg-green-50 rounded-lg p-4">
          <Text className="text-sm text-green-600 font-medium">
            Active Courses
          </Text>
          <Text className="text-2xl font-bold text-green-700">
            {activeFeeStructures.length}
          </Text>
        </View>

        <View className="flex-1 bg-blue-50 rounded-lg p-4">
          <Text className="text-sm text-blue-600 font-medium">Avg Bursary</Text>
          <Text className="text-2xl font-bold text-blue-700">
            {activeFeeStructures.length > 0
              ? Math.round(
                  activeFeeStructures.reduce(
                    (sum, fs) => sum + fs.bursary_percentage,
                    0
                  ) / activeFeeStructures.length
                )
              : 0}
            %
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Loading fee structures...</Text>
        </View>
      ) : (
        <FlatList
          data={feeStructures}
          renderItem={renderFeeStructureItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Text className="text-gray-500 text-lg">
                No fee structures created yet
              </Text>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setShowForm(true);
                }}
               className="bg-teal-600 px-4 py-2 mt-2 rounded-lg shadow-sm"
              >
                <Text className="text-white font-semibold">
                  Create First Structure
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Fee Structure Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text className="text-blue-600 text-lg">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold">
              {editingStructure ? "Edit" : "Add"} Fee Structure
            </Text>
            <TouchableOpacity onPress={handleSubmit}>
              <Text className=" text-sm border border-[#10B981] px-3 py-2 rounded-full font-semibold">
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-[#2C3E50] mb-2">
                  Course Name *
                </Text>
                <TextInput
                  value={formData.course_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, course_name: text })
                  }
                  placeholder="Enter course name"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-[#2C3E50] mb-2">
                  Base Fee (KES) *
                </Text>
                <TextInput
                  value={formData.base_fee}
                  onChangeText={(text) =>
                    setFormData({ ...formData, base_fee: text })
                  }
                  placeholder="0.00"
                  keyboardType="numeric"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-[#2C3E50] mb-2">
                  Registration Fee (KES)
                </Text>
                <TextInput
                  value={formData.registration_fee}
                  onChangeText={(text) =>
                    setFormData({ ...formData, registration_fee: text })
                  }
                  placeholder="0.00"
                  keyboardType="numeric"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </View>

              <View>
                <Text className="text-sm font-mediumtext-[#2C3E50] mb-2">
                  Material Fee (KES)
                </Text>
                <TextInput
                  value={formData.material_fee}
                  onChangeText={(text) =>
                    setFormData({ ...formData, material_fee: text })
                  }
                  placeholder="0.00"
                  keyboardType="numeric"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-[#2C3E50] mb-2">
                  Teacher Rate (KES/hour)
                </Text>
                <TextInput
                  value={formData.teacher_rate}
                  onChangeText={(text) =>
                    setFormData({ ...formData, teacher_rate: text })
                  }
                  placeholder="0.00"
                  keyboardType="numeric"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-[#2C3E50] mb-2">
                  Bursary Percentage (%)
                </Text>
                <TextInput
                  value={formData.bursary_percentage}
                  onChangeText={(text) =>
                    setFormData({ ...formData, bursary_percentage: text })
                  }
                  placeholder="0"
                  keyboardType="numeric"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
                <Text className="text-xs text-[#2C3E50] mt-1">
                  Percentage of total fee covered by bursary
                </Text>
              </View>

              <View className="flex-row items-center justify-between py-3">
                <Text className="text-sm font-medium text-[#2C3E50]">
                  Active Course
                </Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_active: value })
                  }
                />
              </View>

              {/* Fee Preview */}
              {formData.base_fee && (
                <View className="bg-gray-50 rounded-lg p-4 mt-4">
                  <Text className="text-sm font-medium text-[#2C3E50] mb-2">
                    Fee Preview
                  </Text>
                  <View className="space-y-1">
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-[#2C3E50]">
                        Total Course Fee:
                      </Text>
                      <Text className="text-sm font-medium">
                        {formatAmount(
                          (parseFloat(formData.base_fee) || 0) +
                            (parseFloat(formData.registration_fee) || 0) +
                            (parseFloat(formData.material_fee) || 0)
                        )}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-sm text-[#2C3E50]">
                        Bursary Coverage:
                      </Text>
                      <Text className="text-sm font-medium">
                        {formData.bursary_percentage || 0}%
                      </Text>
                    </View>
                    <View className="flex-row justify-between border-t border-gray-200 pt-1">
                      <Text className="text-sm font-medium text-gray-900">
                        Student Pays:
                      </Text>
                      <Text className="text-sm font-bold text-[#2C3E50]">
                        {formatAmount(
                          ((parseFloat(formData.base_fee) || 0) +
                            (parseFloat(formData.registration_fee) || 0) +
                            (parseFloat(formData.material_fee) || 0)) *
                            (1 -
                              (parseFloat(formData.bursary_percentage) || 0) /
                                100)
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};
