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
import { FeeStructure } from "../index";

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
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
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
    const totalFee = structure.base_fee + structure.registration_fee + structure.material_fee;
    const bursaryAmount = (totalFee * structure.bursary_percentage) / 100;
    return totalFee - bursaryAmount;
  };

  const renderFeeStructureItem = ({ item }: { item: FeeStructure }) => (
    <View className="bg-bgLight rounded-lg p-4 mb-3 border border-dark/10">
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-lg font-semibold text-dark flex-1">{item.course_name}</Text>
        <View className="flex-row items-center space-x-2">
          {item.is_active ? (
            <View className="px-2 py-1 rounded-full bg-primary/20">
              <Text className="text-xs font-medium text-primary">Active</Text>
            </View>
          ) : (
            <View className="px-2 py-1 rounded-full bg-dark/10">
              <Text className="text-xs font-medium text-dark">Inactive</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => openEditForm(item)} className="p-1">
            <Text className="text-primary text-sm">Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Fee Breakdown */}
      <View className="space-y-2 mb-3">
        <View className="flex-row justify-between">
          <Text className="text-sm text-dark/70">Base Fee:</Text>
          <Text className="text-sm font-medium text-dark">{formatAmount(item.base_fee)}</Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-sm text-dark/70">Registration:</Text>
          <Text className="text-sm font-medium text-dark">{formatAmount(item.registration_fee)}</Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-sm text-dark/70">Materials:</Text>
          <Text className="text-sm font-medium text-dark">{formatAmount(item.material_fee)}</Text>
        </View>

        <View className="flex-row justify-between border-t border-dark/10 pt-2">
          <Text className="text-sm font-medium text-dark">Total Course Fee:</Text>
          <Text className="text-sm font-bold text-dark">
            {formatAmount(item.base_fee + item.registration_fee + item.material_fee)}
          </Text>
        </View>
      </View>

      {/* Bursary */}
      <View className="bg-primary/10 rounded-lg p-3 mb-3">
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm font-medium text-primary">Bursary Coverage:</Text>
          <Text className="text-sm font-bold text-primary">{item.bursary_percentage}%</Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-sm text-primary/80">Student Pays:</Text>
          <Text className="text-sm font-bold text-primary">{formatAmount(calculateStudentFee(item))}</Text>
        </View>
      </View>

      {/* Teacher Rate */}
      <View className="flex-row justify-between bg-bgLight rounded-lg p-3 border border-dark/10">
        <Text className="text-sm text-dark/70">Teacher Rate:</Text>
        <Text className="text-sm font-medium text-dark">
          {formatAmount(item.teacher_rate)}/hour
        </Text>
      </View>

      <Text className="text-xs text-dark/50 mt-2">
        Effective: {new Date(item.effective_date).toLocaleDateString()}
      </Text>
    </View>
  );

  const activeFeeStructures = feeStructures.filter((fs) => fs.is_active);

  return (
    <View className="flex-1 bg-bgLight p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold text-dark">Fee Structure</Text>
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-primary px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-semibold">Add Course</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View className="flex-row space-x-3 mb-4">
        <View className="flex-1 bg-primary/10 rounded-lg p-4">
          <Text className="text-sm text-primary font-medium">Active Courses</Text>
          <Text className="text-2xl font-bold text-primary">
            {activeFeeStructures.length}
          </Text>
        </View>

        <View className="flex-1 bg-primary/10 rounded-lg p-4">
          <Text className="text-sm text-primary font-medium">Avg Bursary</Text>
          <Text className="text-2xl font-bold text-primary">
            {activeFeeStructures.length > 0
              ? Math.round(
                  activeFeeStructures.reduce((sum, fs) => sum + fs.bursary_percentage, 0) /
                    activeFeeStructures.length
                )
              : 0}
            %
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-dark/50">Loading fee structures...</Text>
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
              <Text className="text-dark/50 text-lg">No fee structures created yet</Text>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="mt-4 bg-primary px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-semibold">Create First Structure</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};
