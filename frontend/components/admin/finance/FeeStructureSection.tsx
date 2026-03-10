import { useTheme } from "@/contexts/ThemeContext";
import { FeeStructure } from "@/types/types";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

interface FeeStructureSectionProps {
  feeStructures: FeeStructure[];
  loading: boolean;
  onFeeStructureUpdate: (feeStructure: Partial<FeeStructure>) => void;
  onRefresh?: () => void;
}

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Semester 1', 'Semester 2', 'Annual'];

const FeeStructureSection: React.FC<FeeStructureSectionProps> = ({
  feeStructures,
  loading,
  onFeeStructureUpdate,
  onRefresh,
}) => {
  const { isDark } = useTheme();

  const [showForm, setShowForm] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    academic_year: new Date().getFullYear().toString(),
    term: "Term 1",
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      amount: "",
      academic_year: new Date().getFullYear().toString(),
      term: "Term 1",
      is_active: true,
    });
    setEditingStructure(null);
  };

  const openEditForm = (structure: FeeStructure) => {
    setEditingStructure(structure);
    setFormData({
      title: (structure as any).title || "",
      description: (structure as any).description || "",
      amount: String((structure as any).amount ?? (structure as any).base_fee ?? ""),
      academic_year: (structure as any).academic_year || new Date().getFullYear().toString(),
      term: (structure as any).term || "Term 1",
      is_active: structure.is_active ?? true,
    });
    setShowForm(true);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.amount) {
      Alert.alert("Validation", "Title and Amount are required.");
      return;
    }
    const parsed = parseFloat(formData.amount);
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert("Validation", "Please enter a valid amount.");
      return;
    }

    const payload: Partial<FeeStructure> = {
      ...(editingStructure && { id: editingStructure.id }),
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      amount: parsed,
      academic_year: formData.academic_year.trim(),
      term: formData.term,
      is_active: formData.is_active,
    } as any;

    onFeeStructureUpdate(payload);
    resetForm();
    setShowForm(false);
  };

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount ?? 0);

  const renderFeeStructureItem = ({ item }: { item: FeeStructure }) => {
    // Support both old (Subject_name / base_fee) and new (title / amount) shapes
    const displayTitle = (item as any).title || (item as any).Subject_name || "Unnamed";
    const displayAmount = (item as any).amount ?? (item as any).base_fee ?? 0;
    const displayTerm = (item as any).term;
    const displayYear = (item as any).academic_year;
    const displayDesc = (item as any).description;

    return (
      <View className="bg-white dark:bg-navy-surface rounded-3xl p-6 mb-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-gray-800">
        {/* Header */}
        <View className="flex-row justify-between items-start mb-5">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">{displayTitle}</Text>
            {displayDesc ? (
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">{displayDesc}</Text>
            ) : null}
          </View>
          <View className="flex-row items-center gap-2">
            {item.is_active ? (
              <View className="px-2 py-1 bg-green-100 dark:bg-green-950/30 rounded-full">
                <Text className="text-xs font-medium text-green-800 dark:text-green-400">Active</Text>
              </View>
            ) : (
              <View className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">Inactive</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => openEditForm(item)} className="p-1 px-4 bg-slate-900 dark:bg-gray-700 rounded-xl">
              <Text className="text-white text-xs font-black uppercase tracking-widest">Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount Block */}
        <View className="bg-[#111827] rounded-3xl p-6 mb-5 border border-slate-800">
          <View className="flex-row justify-between items-center">
            <Text className="text-slate-400 text-sm font-semibold">Fee Amount</Text>
            <Text className="text-white text-2xl font-black">{formatAmount(displayAmount)}</Text>
          </View>

          {(displayTerm || displayYear) && (
            <View className="flex-row gap-3 mt-4 pt-4 border-t border-slate-800">
              {displayTerm && (
                <View className="bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                  <Text className="text-orange-400 text-xs font-bold">{displayTerm}</Text>
                </View>
              )}
              {displayYear && (
                <View className="bg-slate-700/50 px-3 py-1 rounded-full">
                  <Text className="text-slate-300 text-xs font-semibold">{displayYear}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1">
      {/* Header + New Button */}
      <View className="flex-row items-center justify-between px-2 mb-4">
        <Text className="text-gray-900 dark:text-white font-bold text-xl">Fee Structures</Text>
        <TouchableOpacity
          onPress={openCreateForm}
          className="bg-gray-900 dark:bg-gray-700 px-4 py-2 rounded-xl flex-row items-center gap-2"
        >
          <Text className="text-white text-xs font-black uppercase tracking-widest">+ New</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-gray-400 text-sm">Loading fee structures…</Text>
        </View>
      ) : feeStructures.length === 0 ? (
        <View className="flex-1 items-center justify-center py-20 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
          <Text className="text-gray-400 font-bold text-center">No fee structures yet</Text>
          <Text className="text-gray-400 text-sm text-center mt-2">Tap "+ New" to create one.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {feeStructures.map(item => (
            <View key={(item as any).id}>{renderFeeStructureItem({ item })}</View>
          ))}
        </ScrollView>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowForm(false); resetForm(); }}>
        <ScrollView className="flex-1 bg-white dark:bg-navy" contentContainerStyle={{ padding: 24, paddingBottom: 80 }}>
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-gray-900 dark:text-white font-black text-2xl">
              {editingStructure ? "Edit Fee Structure" : "New Fee Structure"}
            </Text>
            <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }} className="bg-gray-100 dark:bg-gray-800 w-10 h-10 rounded-full items-center justify-center">
              <Text className="text-gray-600 dark:text-gray-400 font-bold text-lg">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Title */}
          <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Title *</Text>
          <TextInput
            value={formData.title}
            onChangeText={v => setFormData(p => ({ ...p, title: v }))}
            placeholder="e.g. Grade 10 Annual Fees"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-gray-900 dark:text-white font-medium mb-5"
          />

          {/* Description */}
          <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Description</Text>
          <TextInput
            value={formData.description}
            onChangeText={v => setFormData(p => ({ ...p, description: v }))}
            placeholder="Optional details"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-gray-900 dark:text-white font-medium mb-5"
          />

          {/* Amount */}
          <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Amount (KES) *</Text>
          <TextInput
            value={formData.amount}
            onChangeText={v => setFormData(p => ({ ...p, amount: v }))}
            placeholder="0.00"
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-gray-900 dark:text-white font-medium mb-5"
          />

          {/* Academic Year */}
          <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Academic Year</Text>
          <TextInput
            value={formData.academic_year}
            onChangeText={v => setFormData(p => ({ ...p, academic_year: v }))}
            placeholder="2025"
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-gray-900 dark:text-white font-medium mb-5"
          />

          {/* Term picker */}
          <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Term</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {TERMS.map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setFormData(p => ({ ...p, term: t }))}
                className={`px-4 py-2 rounded-xl border ${formData.term === t ? 'bg-gray-900 border-gray-900' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
              >
                <Text className={`text-xs font-bold ${formData.term === t ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Active toggle */}
          <View className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-4 mb-8 border border-gray-200 dark:border-gray-700">
            <Text className="text-gray-900 dark:text-white font-bold">Active</Text>
            <Switch
              value={formData.is_active}
              onValueChange={v => setFormData(p => ({ ...p, is_active: v }))}
              trackColor={{ false: '#374151', true: '#FF6900' }}
              thumbColor="white"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-gray-900 py-5 rounded-2xl items-center"
          >
            <Text className="text-white font-black text-base uppercase tracking-widest">
              {editingStructure ? "Save Changes" : "Create Fee Structure"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
};

export default FeeStructureSection;
