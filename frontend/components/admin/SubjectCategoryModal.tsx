import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { SubjectAPI, SubjectCategoryData } from '@/services/SubjectService';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { showSuccess, showError } from '@/utils/toast';

interface SubjectCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onCategoriesChanged?: () => void;
  isReadOnly?: boolean;
}

const PRESET_COLORS = [
  { label: 'Emerald', value: '#10B981' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Indigo', value: '#6366F1' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Rose', value: '#F43F5E' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Cyan', value: '#06B6D4' },
  { label: 'Slate', value: '#64748B' },
];

const QUICK_START_SUGGESTIONS = [
  { name: 'Sciences', description: 'Biology, Chemistry, Physics, and Integrated Science', color: '#10B981' },
  { name: 'Languages', description: 'English, Kiswahili, Literature, and Foreign Languages', color: '#3B82F6' },
  { name: 'Humanities', description: 'History, Geography, Religious Education, and Life Skills', color: '#F59E0B' },
  { name: 'Mathematics', description: 'Pure Mathematics, Applied Math, and Statistics', color: '#6366F1' },
  { name: 'Creative Arts', description: 'Art, Craft, Music, and Performing Arts', color: '#F43F5E' },
  { name: 'Technical & Applied', description: 'Computer Studies, Agriculture, Business, and Home Science', color: '#06B6D4' },
];

export const SubjectCategoryModal: React.FC<SubjectCategoryModalProps> = ({
  visible,
  onClose,
  onCategoriesChanged,
  isReadOnly = false,
}) => {
  const { isDark } = useTheme();

  const [categories, setCategories] = useState<SubjectCategoryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editing / Creation mode
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10B981');

  // Deletion Confirmation Modal State
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<SubjectCategoryData | null>(null);
  const [deleteInUseCount, setDeleteInUseCount] = useState<number>(0);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const surface = isDark ? '#161B22' : '#FFFFFF';
  const cardBg = isDark ? '#0D1117' : '#F6F8FA';
  const border = isDark ? '#21262D' : '#D0D7DE';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textMuted = isDark ? '#9CA3AF' : '#6B7280';
  const inputBg = isDark ? '#161B22' : '#FFFFFF';

  useEffect(() => {
    if (visible) {
      loadCategories();
      resetForm();
    }
  }, [visible]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await SubjectAPI.getSubjectCategories();
      setCategories(data);
    } catch (err: any) {
      console.error('Error fetching subject categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setName('');
    setDescription('');
    setSelectedColor('#10B981');
  };

  const startEdit = (cat: SubjectCategoryData) => {
    if (isReadOnly) return;
    setEditingId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setSelectedColor(cat.color || '#10B981');
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (isReadOnly) return;
    if (!name.trim()) {
      showError('Validation Error', 'Please enter a category name');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await SubjectAPI.updateSubjectCategory(editingId, {
          name: name.trim(),
          description: description.trim() || undefined,
          color: selectedColor,
        });
        showSuccess('Category Updated', `Updated "${name.trim()}"`);
      } else {
        await SubjectAPI.createSubjectCategory({
          name: name.trim(),
          description: description.trim() || undefined,
          color: selectedColor,
        });
        showSuccess('Category Created', `Created "${name.trim()}"`);
      }
      resetForm();
      await loadCategories();
      onCategoriesChanged?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Failed to save subject category';
      showError('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAdd = async (suggestion: typeof QUICK_START_SUGGESTIONS[0]) => {
    if (isReadOnly) return;
    setSaving(true);
    try {
      await SubjectAPI.createSubjectCategory({
        name: suggestion.name,
        description: suggestion.description,
        color: suggestion.color,
      });
      showSuccess('Category Added', `Added "${suggestion.name}"`);
      await loadCategories();
      onCategoriesChanged?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Failed to add suggestion';
      showError('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const initiateDelete = async (cat: SubjectCategoryData) => {
    if (isReadOnly) return;
    setCategoryToDelete(cat);
    setDeleteInUseCount(cat.subject_count || 0);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    setDeletingLoading(true);
    try {
      // Pass confirm=true to unassign linked subjects cleanly
      await SubjectAPI.deleteSubjectCategory(categoryToDelete.id, true);
      showSuccess(
        'Category Deleted',
        deleteInUseCount > 0
          ? `Deleted "${categoryToDelete.name}" and unassigned ${deleteInUseCount} subject${deleteInUseCount === 1 ? '' : 's'}.`
          : `Deleted "${categoryToDelete.name}".`
      );
      setDeleteConfirmVisible(false);
      setCategoryToDelete(null);
      await loadCategories();
      onCategoriesChanged?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err.message || 'Failed to delete category';
      showError('Delete Failed', msg);
    } finally {
      setDeletingLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 640,
            maxHeight: '90%',
            backgroundColor: surface,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: border,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: border,
            }}
          >
            <View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: textPrimary }}>Subject Categories</Text>
              <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
                Optional classification to organize subjects across filters and reports
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={textMuted} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Create or Edit Form */}
            {(isCreating || editingId) ? (
              <View
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: border,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary }}>
                    {editingId ? 'Edit Subject Category' : 'New Subject Category'}
                  </Text>
                  <TouchableOpacity onPress={resetForm}>
                    <Text style={{ fontSize: 12, color: '#FF6B00', fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                {/* Name */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary, marginBottom: 6 }}>
                    Category Name *
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: inputBg,
                      borderWidth: 1,
                      borderColor: border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      color: textPrimary,
                      fontSize: 14,
                    }}
                    placeholder="e.g. Sciences, Languages, Humanities"
                    placeholderTextColor={textMuted}
                    value={name}
                    onChangeText={setName}
                    editable={!isReadOnly}
                  />
                </View>

                {/* Description */}
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary, marginBottom: 6 }}>
                    Description (Optional)
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: inputBg,
                      borderWidth: 1,
                      borderColor: border,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      color: textPrimary,
                      fontSize: 13,
                    }}
                    placeholder="Brief description of subjects in this category"
                    placeholderTextColor={textMuted}
                    value={description}
                    onChangeText={setDescription}
                    editable={!isReadOnly}
                  />
                </View>

                {/* Color Selector */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: textPrimary, marginBottom: 8 }}>
                    Badge Color
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {PRESET_COLORS.map((col) => {
                      const isSelected = selectedColor === col.value;
                      return (
                        <TouchableOpacity
                          key={col.value}
                          onPress={() => setSelectedColor(col.value)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: isSelected ? `${col.value}25` : inputBg,
                            borderWidth: 1,
                            borderColor: isSelected ? col.value : border,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 20,
                            gap: 6,
                          }}
                        >
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col.value }} />
                          <Text style={{ fontSize: 12, fontWeight: isSelected ? '700' : '500', color: textPrimary }}>
                            {col.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Save Button */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                  <TouchableOpacity
                    onPress={resetForm}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: border,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: textMuted }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving || isReadOnly}
                    style={{
                      backgroundColor: '#FF6B00',
                      paddingHorizontal: 18,
                      paddingVertical: 8,
                      borderRadius: 10,
                      opacity: saving ? 0.7 : 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {saving && <ActivityIndicator size="small" color="#FFFFFF" />}
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                      {editingId ? 'Update Category' : 'Save Category'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* Top Bar / Actions when not creating */}
            {!isCreating && !editingId && !isReadOnly && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>
                  Configured Categories ({categories.length})
                </Text>
                <TouchableOpacity
                  onPress={() => setIsCreating(true)}
                  style={{
                    backgroundColor: '#FF6B00',
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 10,
                    gap: 6,
                  }}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Add Category</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Loading */}
            {loading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#FF6B00" />
              </View>
            ) : categories.length === 0 && !isCreating ? (
              /* Empty state with Quick-Start Suggestions */
              <View style={{ paddingVertical: 10 }}>
                <View
                  style={{
                    padding: 24,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: border,
                    backgroundColor: cardBg,
                    alignItems: 'center',
                    marginBottom: 20,
                  }}
                >
                  <Ionicons name="albums-outline" size={38} color={textMuted} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary, marginTop: 10 }}>
                    No Subject Categories Yet
                  </Text>
                  <Text style={{ fontSize: 12, color: textMuted, textAlign: 'center', marginTop: 4, maxWidth: 360 }}>
                    Categories are completely optional. When defined, they enable fast filtering across subjects, lesson logs, and reporting.
                  </Text>
                  {!isReadOnly && (
                    <TouchableOpacity
                      onPress={() => setIsCreating(true)}
                      style={{
                        backgroundColor: '#FF6B00',
                        marginTop: 14,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 10,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Create Custom Category</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick Start Suggestions */}
                {!isReadOnly && (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary, marginBottom: 10 }}>
                      Quick-Start Suggestions
                    </Text>
                    <Text style={{ fontSize: 11, color: textMuted, marginBottom: 12 }}>
                      Click any standard category below to add it instantly to your institution:
                    </Text>
                    <View style={{ gap: 8 }}>
                      {QUICK_START_SUGGESTIONS.map((sug) => (
                        <TouchableOpacity
                          key={sug.name}
                          onPress={() => handleQuickAdd(sug)}
                          disabled={saving}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: inputBg,
                            borderWidth: 1,
                            borderColor: border,
                            borderRadius: 12,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sug.color }} />
                              <Text style={{ fontSize: 13, fontWeight: '700', color: textPrimary }}>{sug.name}</Text>
                            </View>
                            <Text style={{ fontSize: 11, color: textMuted, marginTop: 2 }}>{sug.description}</Text>
                          </View>
                          <Ionicons name="add-circle" size={20} color="#FF6B00" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            ) : (
              /* Categories List */
              <View style={{ gap: 10 }}>
                {categories.map((cat) => {
                  const catColor = cat.color || '#10B981';
                  const subjectCount = cat.subject_count || 0;
                  return (
                    <View
                      key={cat.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: cardBg,
                        borderWidth: 1,
                        borderColor: border,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: catColor }} />
                          <Text style={{ fontSize: 14, fontWeight: '700', color: textPrimary }}>{cat.name}</Text>
                          <View
                            style={{
                              backgroundColor: `${catColor}20`,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 10,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: catColor }}>
                              {subjectCount} subject{subjectCount === 1 ? '' : 's'}
                            </Text>
                          </View>
                        </View>
                        {cat.description ? (
                          <Text style={{ fontSize: 12, color: textMuted, marginTop: 4 }}>{cat.description}</Text>
                        ) : null}
                      </View>

                      {!isReadOnly && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <TouchableOpacity
                            onPress={() => startEdit(cat)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="pencil" size={17} color={textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => initiateDelete(cat)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={17} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: border,
              flexDirection: 'row',
              justifyContent: 'flex-end',
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: isDark ? '#21262D' : '#E5E7EB',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: textPrimary }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          visible={deleteConfirmVisible}
          title="Delete Subject Category"
          targetName={categoryToDelete?.name}
          message={
            deleteInUseCount > 0
              ? `Warning: This category is currently assigned to ${deleteInUseCount} subject${deleteInUseCount === 1 ? '' : 's'}. Deleting it will unassign those subjects and label them as "Uncategorized". Are you sure you want to proceed?`
              : `Are you sure you want to delete the category "${categoryToDelete?.name || ''}"?`
          }
          confirmText="Delete Category"
          isDestructive={true}
          loading={deletingLoading}
          onConfirm={confirmDelete}
          onClose={() => {
            if (!deletingLoading) {
              setDeleteConfirmVisible(false);
              setCategoryToDelete(null);
            }
          }}
        />
      </View>
    </Modal>
  );
};

export default SubjectCategoryModal;
