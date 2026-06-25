import { Spinner } from '@/components/ui/Spinner';
import { useTheme } from '@/contexts/ThemeContext';
import { ClassService } from '@/services/ClassService';
import { GradingAPI } from '@/services/GradingService';
import { FeeStructure } from '@/types/types';
import { formatCurrency } from '@/utils/currency';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AcademicYearOption {
  id: string;
  name: string;
  is_current?: boolean;
}

interface TermOption {
  id: string;
  name: string;
  academic_year_id: string;
  is_current?: boolean;
}

interface FeeStructureSectionProps {
  feeStructures: FeeStructure[];
  loading: boolean;
  onFeeStructureUpdate: (feeStructure: Partial<FeeStructure>) => void;
  onFeeStructureCreate: (feeStructure: Partial<FeeStructure>) => void;
  onFeeStructureRelease: (feeStructureId: string) => void;
  onFeeStructureDelete: (feeStructureId: string) => void;
  onRefresh?: () => void;
}

type LevelScope = 'all' | 'grade' | 'form' | 'range';

const ANNUAL_TERM_ID = '__annual';
const ANNUAL_TERM_NAME = 'Annual';

const FeeStructureSection: React.FC<FeeStructureSectionProps> = ({
  feeStructures,
  loading,
  onFeeStructureUpdate,
  onFeeStructureCreate,
  onFeeStructureRelease,
  onFeeStructureDelete,
}) => {
  const { isDark } = useTheme();

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);

  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [classLevels, setClassLevels] = useState<number[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    academic_year: '',
    academic_year_id: '',
    term: ANNUAL_TERM_NAME,
    term_id: ANNUAL_TERM_ID,
    level_scope: 'all' as LevelScope,
    level_value: '',
    level_from: '',
    level_to: '',
    is_active: true,
  });

  useEffect(() => {
    let mounted = true;
    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        const [yearsData, termsData, classesData] = await Promise.all([
          GradingAPI.getAcademicYears(),
          GradingAPI.getTerms(),
          ClassService.getClasses(),
        ]);

        if (!mounted) return;

        const normalizedYears: AcademicYearOption[] = (yearsData || []).map((y: any) => ({
          id: y.id,
          name: y.name,
          is_current: !!y.is_current,
        }));

        const normalizedTerms: TermOption[] = (termsData || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          academic_year_id: t.academic_year_id,
          is_current: !!t.is_current,
        }));

        const extractedLevels = new Set<number>();
        (classesData || []).forEach((cls: any) => {
          if (Number.isFinite(Number(cls.grade_level))) extractedLevels.add(Number(cls.grade_level));
          if (Number.isFinite(Number(cls.form_level))) extractedLevels.add(Number(cls.form_level));
        });

        setAcademicYears(normalizedYears);
        setTerms(normalizedTerms);
        setClassLevels(Array.from(extractedLevels).sort((a, b) => a - b));

        if (!formData.academic_year_id && normalizedYears.length > 0) {
          const current = normalizedYears.find((y) => y.is_current) || normalizedYears[0];
          setFormData((prev) => ({ ...prev, academic_year_id: current.id, academic_year: current.name }));
        }
      } catch (error) {
        console.error('Error loading fee structure options:', error);
      } finally {
        if (mounted) {
          setLoadingOptions(false);
        }
      }
    };

    loadOptions();
    return () => {
      mounted = false;
    };
  }, []);

  const yearTerms = useMemo(() => {
    const scopedTerms = terms.filter((t) => t.academic_year_id === formData.academic_year_id);
    return [{ id: ANNUAL_TERM_ID, name: ANNUAL_TERM_NAME, academic_year_id: formData.academic_year_id }, ...scopedTerms];
  }, [terms, formData.academic_year_id]);

  const defaultYear = useMemo(() => academicYears.find((y) => y.is_current) || academicYears[0], [academicYears]);

  const resetForm = () => {
    const year = defaultYear;
    setFormData({
      title: '',
      description: '',
      amount: '',
      academic_year: year?.name || '',
      academic_year_id: year?.id || '',
      term: ANNUAL_TERM_NAME,
      term_id: ANNUAL_TERM_ID,
      level_scope: 'all',
      level_value: '',
      level_from: '',
      level_to: '',
      is_active: true,
    });
    setEditingStructure(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (structure: FeeStructure) => {
    setEditingStructure(structure);
    setFormData({
      title: (structure as any).title || (structure as any).Subject_name || '',
      description: (structure as any).description || '',
      amount: String((structure as any).amount ?? (structure as any).base_fee ?? ''),
      academic_year: (structure as any).academic_year || defaultYear?.name || '',
      academic_year_id: (structure as any).academic_year_id || defaultYear?.id || '',
      term: (structure as any).term || ANNUAL_TERM_NAME,
      term_id: (structure as any).term_id || ANNUAL_TERM_ID,
      level_scope: ((structure as any).level_scope as LevelScope) || 'all',
      level_value: (structure as any).level_value !== null && (structure as any).level_value !== undefined
        ? String((structure as any).level_value)
        : '',
      level_from: (structure as any).level_from !== null && (structure as any).level_from !== undefined
        ? String((structure as any).level_from)
        : '',
      level_to: (structure as any).level_to !== null && (structure as any).level_to !== undefined
        ? String((structure as any).level_to)
        : '',
      is_active: !!structure.is_active,
    });
    setShowForm(true);
  };

  const parseAmount = () => {
    const cleaned = formData.amount.replace(/,/g, '').trim();
    const numeric = Number(cleaned);
    return Number.isFinite(numeric) ? numeric : NaN;
  };

  const validateLevel = () => {
    if (formData.level_scope === 'all') return true;

    if (formData.level_scope === 'grade' || formData.level_scope === 'form') {
      return formData.level_value !== '';
    }

    if (formData.level_scope === 'range') {
      const from = Number(formData.level_from);
      const to = Number(formData.level_to);
      return Number.isFinite(from) && Number.isFinite(to) && from <= to;
    }

    return false;
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation', 'Title is required.');
      return;
    }

    const parsedAmount = parseAmount();
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      Alert.alert('Validation', 'Amount must be a valid number.');
      return;
    }

    if (!formData.academic_year_id || !formData.academic_year) {
      Alert.alert('Validation', 'Academic year is required.');
      return;
    }

    if (!validateLevel()) {
      Alert.alert('Validation', 'Select a valid level target for this fee structure.');
      return;
    }

    const payload: Partial<FeeStructure> = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      amount: parsedAmount,
      academic_year: formData.academic_year,
      academic_year_id: formData.academic_year_id,
      term: formData.term,
      term_id: formData.term_id === ANNUAL_TERM_ID ? undefined : formData.term_id,
      level_scope: formData.level_scope,
      level_value: formData.level_scope === 'grade' || formData.level_scope === 'form' ? Number(formData.level_value) : undefined,
      level_from: formData.level_scope === 'range' ? Number(formData.level_from) : undefined,
      level_to: formData.level_scope === 'range' ? Number(formData.level_to) : undefined,
      is_active: formData.is_active,
    };

    try {
      setSubmitting(true);
      if (editingStructure?.id) {
        await Promise.resolve(onFeeStructureUpdate({ ...payload, id: editingStructure.id }));
      } else {
        await Promise.resolve(onFeeStructureCreate(payload));
      }
      setShowForm(false);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const renderLevelBadge = (item: FeeStructure) => {
    const scope = ((item as any).level_scope || 'all') as LevelScope;
    const value = (item as any).level_value;
    const from = (item as any).level_from;
    const to = (item as any).level_to;

    let label = 'All Levels';
    if (scope === 'grade' && value !== null && value !== undefined) label = `Grade ${value}`;
    if (scope === 'form' && value !== null && value !== undefined) label = `Form ${value}`;
    if (scope === 'range' && from !== null && to !== null && from !== undefined && to !== undefined) {
      label = `${from} - ${to}`;
    }

    return (
      <View className="bg-slate-700/50 px-3 py-1 rounded-full">
        <Text className="text-slate-300 text-xs font-semibold">{label}</Text>
      </View>
    );
  };

  const renderFeeStructureItem = (item: FeeStructure) => {
    const title = (item as any).title || (item as any).Subject_name || 'Unnamed';
    const amount = Number((item as any).amount ?? (item as any).base_fee ?? 0);
    const termLabel = (item as any).term || ANNUAL_TERM_NAME;
    const yearLabel = (item as any).academic_year || 'N/A';
    const description = (item as any).description;
    const isReleased = item.is_active;

    return (
      <View
        key={(item as any).id}
        className="bg-white dark:bg-navy-surface rounded-3xl p-6 mb-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-gray-800"
      >
        <View className="flex-row justify-between items-start mb-5">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">{title}</Text>
            {description ? (
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</Text>
            ) : null}
          </View>
          <View className="items-end gap-2">
            <View className={`px-2 py-1 rounded-full ${isReleased ? 'bg-green-100 dark:bg-green-950/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <Text className={`text-xs font-medium ${isReleased ? 'text-green-800 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {isReleased ? 'Released' : 'Draft'}
              </Text>
            </View>
            <View className="flex-row gap-2">
              {!isReleased ? (
                <TouchableOpacity
                  onPress={() => onFeeStructureRelease((item as any).id)}
                  className="p-1 px-3 bg-green-600 rounded-xl"
                >
                  <Text className="text-white text-[10px] font-black uppercase tracking-widest">Release</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => openEditForm(item)} className="p-1 px-3 bg-slate-900 dark:bg-gray-700 rounded-xl">
                <Text className="text-white text-[10px] font-black uppercase tracking-widest">Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Delete Fee Structure', 'This action cannot be undone. Continue?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onFeeStructureDelete((item as any).id) },
                  ]);
                }}
                className="p-1 px-3 bg-red-600 rounded-xl"
              >
                <Text className="text-white text-[10px] font-black uppercase tracking-widest">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="bg-[#111827] rounded-3xl p-6 mb-5 border border-slate-800">
          <View className="flex-row justify-between items-center">
            <Text className="text-slate-400 text-sm font-semibold">Fee Amount</Text>
            <Text className="text-white text-2xl font-black">{formatCurrency(amount)}</Text>
          </View>

          <View className="flex-row gap-3 mt-4 pt-4 border-t border-slate-800 flex-wrap">
            <View className="bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
              <Text className="text-orange-400 text-xs font-bold">{termLabel}</Text>
            </View>
            <View className="bg-slate-700/50 px-3 py-1 rounded-full">
              <Text className="text-slate-300 text-xs font-semibold">{yearLabel}</Text>
            </View>
            {renderLevelBadge(item)}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between px-2 mb-4">
        <Text className="text-gray-900 dark:text-white font-bold text-xl">Fee Structures</Text>
        <TouchableOpacity
          onPress={openCreateForm}
          className="bg-gray-900 dark:bg-gray-700 px-4 py-2 rounded-xl flex-row items-center gap-2"
        >
          <Text className="text-white text-xs font-black uppercase tracking-widest">+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center py-20">
          <Spinner label="Loading fee structures" color={isDark ? '#FF6900' : '#FF6900'} />
        </View>
      ) : feeStructures.length === 0 ? (
        <View className="flex-1 items-center justify-center py-20 border border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
          <Text className="text-gray-400 font-bold text-center">No fee structures yet</Text>
          <Text className="text-gray-400 text-sm text-center mt-2">Tap &quot;+ New&quot; to create one.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {feeStructures.map((item) => renderFeeStructureItem(item))}
        </ScrollView>
      )}

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowForm(false);
          resetForm();
        }}
      >
        <ScrollView className="flex-1 bg-white dark:bg-navy" contentContainerStyle={{ padding: 24, paddingBottom: 80 }}>
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-gray-900 dark:text-white font-black text-2xl">
              {editingStructure ? 'Edit Fee Structure' : 'New Fee Structure'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowForm(false);
                resetForm();
              }}
              className="bg-gray-100 dark:bg-gray-800 w-10 h-10 rounded-full items-center justify-center"
            >
              <Text className="text-gray-600 dark:text-gray-400 font-bold text-lg">X</Text>
            </TouchableOpacity>
          </View>

          {loadingOptions ? (
            <View className="py-12 items-center">
              <Spinner label="Loading academic setup options" color={isDark ? '#FF6900' : '#FF6900'} />
            </View>
          ) : null}

          <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Title *</Text>
          <TextInput
            value={formData.title}
            onChangeText={(v) => setFormData((p) => ({ ...p, title: v }))}
            placeholder="e.g. Grade 10 Annual Fees"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-gray-900 dark:text-white font-medium mb-5"
          />

          <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Description</Text>
          <TextInput
            value={formData.description}
            onChangeText={(v) => setFormData((p) => ({ ...p, description: v }))}
            placeholder="Optional details"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-gray-900 dark:text-white font-medium mb-5"
          />

          <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Amount (KSh) *</Text>
          <TextInput
            value={formData.amount}
            onChangeText={(v) => setFormData((p) => ({ ...p, amount: v }))}
            placeholder="0.00"
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-gray-900 dark:text-white font-medium mb-5"
          />

          <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Academic Year</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {academicYears.map((year) => (
              <TouchableOpacity
                key={year.id}
                onPress={() =>
                  setFormData((p) => ({
                    ...p,
                    academic_year_id: year.id,
                    academic_year: year.name,
                    term_id: ANNUAL_TERM_ID,
                    term: ANNUAL_TERM_NAME,
                  }))
                }
                className={`px-4 py-2 rounded-xl border ${formData.academic_year_id === year.id ? 'bg-gray-900 border-gray-900' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
              >
                <Text className={`text-xs font-bold ${formData.academic_year_id === year.id ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {year.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Term</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {yearTerms.map((term) => (
              <TouchableOpacity
                key={term.id}
                onPress={() =>
                  setFormData((p) => ({
                    ...p,
                    term_id: term.id,
                    term: term.name,
                  }))
                }
                className={`px-4 py-2 rounded-xl border ${formData.term_id === term.id ? 'bg-gray-900 border-gray-900' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
              >
                <Text className={`text-xs font-bold ${formData.term_id === term.id ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {term.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Level Target</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {(['all', 'grade', 'form', 'range'] as LevelScope[]).map((scope) => (
              <TouchableOpacity
                key={scope}
                onPress={() => setFormData((p) => ({ ...p, level_scope: scope }))}
                className={`px-4 py-2 rounded-xl border ${formData.level_scope === scope ? 'bg-gray-900 border-gray-900' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
              >
                <Text className={`text-xs font-bold ${formData.level_scope === scope ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                  {scope === 'all' ? 'All' : scope === 'grade' ? 'Grade' : scope === 'form' ? 'Form' : 'Range'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(formData.level_scope === 'grade' || formData.level_scope === 'form') ? (
            <View className="flex-row flex-wrap gap-2 mb-6">
              {classLevels.map((lvl) => (
                <TouchableOpacity
                  key={`lvl-${lvl}`}
                  onPress={() => setFormData((p) => ({ ...p, level_value: String(lvl) }))}
                  className={`px-4 py-2 rounded-xl border ${formData.level_value === String(lvl) ? 'bg-gray-900 border-gray-900' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                >
                  <Text className={`text-xs font-bold ${formData.level_value === String(lvl) ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {formData.level_scope === 'grade' ? `Grade ${lvl}` : `Form ${lvl}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {formData.level_scope === 'range' ? (
            <View className="mb-6">
              <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Range From</Text>
              <TextInput
                value={formData.level_from}
                onChangeText={(v) => setFormData((p) => ({ ...p, level_from: v }))}
                keyboardType="numeric"
                placeholder="e.g. 1"
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-gray-900 dark:text-white font-medium mb-4"
              />
              <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Range To</Text>
              <TextInput
                value={formData.level_to}
                onChangeText={(v) => setFormData((p) => ({ ...p, level_to: v }))}
                keyboardType="numeric"
                placeholder="e.g. 8"
                placeholderTextColor="#9CA3AF"
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-gray-900 dark:text-white font-medium"
              />
            </View>
          ) : null}

          <View className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-2xl px-4 py-4 mb-8 border border-gray-200 dark:border-gray-700">
            <Text className="text-gray-900 dark:text-white font-bold">Active</Text>
            <Switch
              value={formData.is_active}
              onValueChange={(v) => setFormData((p) => ({ ...p, is_active: v }))}
              trackColor={{ false: '#374151', true: '#FF6900' }}
              thumbColor="white"
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            className="bg-gray-900 py-5 rounded-2xl items-center"
            disabled={submitting}
            accessibilityState={{ disabled: submitting, busy: submitting }}
          >
            {submitting ? (
              <Spinner label={editingStructure ? 'Saving changes' : 'Creating fee structure'} color="#FFFFFF" />
            ) : (
              <Text className="text-white font-black text-base uppercase tracking-widest">
                {editingStructure ? 'Save Changes' : 'Create Fee Structure'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
};

export default FeeStructureSection;
