import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { ListItemSkeleton } from '@/components/ui/skeletons';

import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/libs/supabase';

const NativeDateTimePicker =
  Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;
const NativeDateTimePickerAndroid =
  Platform.OS === 'android' ? require('@react-native-community/datetimepicker').DateTimePickerAndroid : null;

type Institution = {
  id: string;
  name: string;
  location?: string | null;
  phone?: string | null;
  email?: string | null;
  email_domain?: string | null;
  principal_name?: string | null;
  category_id?: string | null;
  currency_id?: string | null;
  category_ids?: string[];
  categories?: Array<{ id?: string; name?: string | null; class_type?: string | null; class_types?: string[] | null }>;
  category_name?: string | null;
  subscription_plan?: string | null;
  subscription_status?: string | null;
  subscription_cycle?: string | null;
  subscription_tracking_start_date?: string | null;
  custom_student_limit?: number | null;
  subscription_start_date?: string | null;
  admin_first_name?: string | null;
  admin_last_name?: string | null;
  addon_library?: boolean;
  addon_messaging?: boolean;
  addon_diary?: boolean;
  addon_bursary?: boolean;
  users?: Array<{ count: number }>;
};

type CurrencyOption = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_default?: boolean;
  is_active?: boolean;
};

type SchoolCategory = {
  id: string;
  name: string;
  class_type: string;
  class_types?: string[];
};

type AdminUser = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  is_main?: boolean;
};

type EnrollmentStep = 0 | 1 | 2 | 3;

const PLAN_OPTIONS = ['basic', 'pro', 'premium', 'beta'];
const STATUS_OPTIONS = ['active', 'suspended', 'expired', 'cancelled'];

const ADDON_ROWS: Array<{ key: keyof Institution; label: string }> = [
  { key: 'addon_library', label: 'Digital Library' },
  { key: 'addon_messaging', label: 'Messaging' },
  { key: 'addon_diary', label: 'Virtual Diary' },
  { key: 'addon_bursary', label: 'Bursary' },
];

const useThemeColors = (isDark: boolean) => ({
  bg: isDark ? '#0D1117' : '#F6F8FA',
  card: isDark ? '#161B22' : '#FFFFFF',
  input: isDark ? '#0F141C' : '#F3F4F6',
  border: isDark ? '#4B5563' : '#9CA3AF',
  text: isDark ? '#F0F6FC' : '#1F2328',
  sub: isDark ? '#8B949E' : '#57606A',
  primary: '#FF6900',
  danger: '#CF222E',
  success: '#1A7F37',
});

export default function MasterInstitutionsPage() {
  const { isDark } = useTheme();
  const c = useThemeColors(isDark);

  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [categories, setCategories] = useState<SchoolCategory[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [activeInstitutionId, setActiveInstitutionId] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; body: string; onConfirm?: () => Promise<void> | void }>({
    open: false,
    title: '',
    body: '',
  });

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryClassType, setCategoryClassType] = useState('Grade');
  const [editCategoryModalOpen, setEditCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryClassType, setEditCategoryClassType] = useState('Grade');
  const [editCategorySaving, setEditCategorySaving] = useState(false);

  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollSaving, setEnrollSaving] = useState(false);
  const [enrollStep, setEnrollStep] = useState<EnrollmentStep>(0);
  const [enrollResult, setEnrollResult] = useState<any>(null);
  const [enrollForm, setEnrollForm] = useState({
    institution_name: '',
    location: '',
    email_domain: '',
    admin_first_name: '',
    admin_last_name: '',
    subscription_plan: 'basic',
    subscription_start_date: new Date().toISOString().slice(0, 10),
    custom_student_limit: '',
    currency_id: '',
    category_ids: [] as string[],
  });
  const [planStartDateModalOpen, setPlanStartDateModalOpen] = useState(false);
  const [planStartDateDraft, setPlanStartDateDraft] = useState(new Date());

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Institution>>({});
  const [editPlanStartDateModalOpen, setEditPlanStartDateModalOpen] = useState(false);
  const [editPlanStartDateDraft, setEditPlanStartDateDraft] = useState(new Date());
  const [categoryPickerModal, setCategoryPickerModal] = useState<{ open: boolean; target: 'enroll' | 'edit' | null }>({
    open: false,
    target: null,
  });
  const [editOptionModal, setEditOptionModal] = useState<{ open: boolean; type: 'plan' | null }>({
    open: false,
    type: null,
  });
  const [planPickerModalOpen, setPlanPickerModalOpen] = useState(false);

  const [adminsModalOpen, setAdminsModalOpen] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminResetLoadingId, setAdminResetLoadingId] = useState<string | null>(null);
  const [adminResetResult, setAdminResetResult] = useState<any>(null);
  const [adminResetResultOpen, setAdminResetResultOpen] = useState(false);

  const [addonsModalOpen, setAddonsModalOpen] = useState(false);
  const [addonsSaving, setAddonsSaving] = useState(false);
  const [addonsForm, setAddonsForm] = useState<Record<string, boolean>>({});

  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsData, setStatsData] = useState<{ students: number; teachers: number; classes: number } | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'bank_transfer',
    reference_id: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const activeInstitution = useMemo(
    () => institutions.find((i) => i.id === activeInstitutionId) || null,
    [institutions, activeInstitutionId]
  );

  const backendUrl = useMemo(() => {
    let url = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4001';
    if (Platform.OS === 'android') url = url.replace('localhost', '10.0.2.2');
    return url;
  }, []);

  const authedFetch = useCallback(async (path: string, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      throw new Error('Session expired. Please sign in again.');
    }
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init?.headers as Record<string, string>),
    };
    headers.Authorization = `Bearer ${token}`;
    if (init?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${backendUrl}${path}`, { ...init, headers });
    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      throw new Error(payload?.error || `Request failed: ${response.status}`);
    }
    return payload;
  }, [backendUrl]);

  const loadInstitutions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await authedFetch('/api/master-admin/institutions');
      setInstitutions(data?.institutions || []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Institutions', text2: e.message || 'Failed to fetch institutions', position: 'top' });
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await authedFetch('/api/master-admin/school-categories');
      setCategories(Array.isArray(data) ? data : data?.categories || []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Categories', text2: e.message || 'Failed to load categories', position: 'top' });
    }
  }, [authedFetch]);

  const loadCurrencies = useCallback(async () => {
    try {
      const data = await authedFetch('/api/master-admin/currencies');
      const rows = (data?.currencies || []).filter((item: CurrencyOption) => item.is_active !== false);
      setCurrencies(rows);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Currencies', text2: e.message || 'Failed to load currencies', position: 'top' });
    }
  }, [authedFetch]);

  useEffect(() => {
    loadInstitutions();
    loadCategories();
    loadCurrencies();
  }, [loadCategories, loadInstitutions, loadCurrencies]);

  useEffect(() => {
    if (!enrollForm.currency_id && currencies.length > 0) {
      const defaultCurrency = currencies.find((currency) => currency.is_default) || currencies[0];
      setEnrollForm((prev) => ({ ...prev, currency_id: defaultCurrency?.id || '' }));
    }
  }, [currencies, enrollForm.currency_id]);

  const askConfirm = (title: string, body: string, onConfirm: () => Promise<void> | void) => {
    setConfirmModal({ open: true, title, body, onConfirm });
  };

  const saveCategory = async () => {
    if (!categoryName.trim() || !categoryClassType.trim()) {
      Toast.show({ type: 'error', text1: 'Category', text2: 'Name and class type are required', position: 'top' });
      return;
    }
    try {
      setCategorySaving(true);
      await authedFetch('/api/master-admin/school-categories', {
        method: 'POST',
        body: JSON.stringify({ name: categoryName.trim(), class_type: categoryClassType.trim() }),
      });
      Toast.show({ type: 'success', text1: 'Category', text2: 'Category added', position: 'top' });
      setCategoryName('');
      setCategoryClassType('Grade');
      await loadCategories();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Category', text2: e.message || 'Unable to save category', position: 'top' });
    } finally {
      setCategorySaving(false);
    }
  };

  const startEditCategory = (cat: SchoolCategory) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setEditCategoryClassType(cat.class_type);
    setEditCategoryModalOpen(true);
  };

  const saveEditedCategory = async () => {
    if (!editingCategoryId || !editCategoryName.trim() || !editCategoryClassType.trim()) {
      Toast.show({ type: 'error', text1: 'Category', text2: 'Name and class type are required', position: 'top' });
      return;
    }
    try {
      setEditCategorySaving(true);
      await authedFetch('/api/master-admin/school-categories', {
        method: 'POST',
        body: JSON.stringify({ id: editingCategoryId, name: editCategoryName.trim(), class_type: editCategoryClassType.trim() }),
      });
      Toast.show({ type: 'success', text1: 'Category', text2: 'Category updated', position: 'top' });
      setEditCategoryModalOpen(false);
      setEditingCategoryId(null);
      setEditCategoryName('');
      setEditCategoryClassType('Grade');
      await loadCategories();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Category', text2: e.message || 'Unable to save category', position: 'top' });
    } finally {
      setEditCategorySaving(false);
    }
  };

  const deleteCategory = (cat: SchoolCategory) => {
    askConfirm('Delete Category', `Delete ${cat.name}?`, async () => {
      await authedFetch(`/api/master-admin/school-categories/${cat.id}`, { method: 'DELETE' });
      Toast.show({ type: 'success', text1: 'Category', text2: 'Category deleted', position: 'top' });
      await loadCategories();
    });
  };

  const enrollInstitution = async () => {
    const first = (enrollForm.admin_first_name || '').trim();
    const last = (enrollForm.admin_last_name || '').trim();

    if (!enrollForm.institution_name || !enrollForm.email_domain.trim() || enrollForm.category_ids.length === 0 || !first || !last || !enrollForm.currency_id) {
      Toast.show({ type: 'error', text1: 'Enrollment', text2: 'Complete all required fields', position: 'top' });
      return;
    }
    try {
      setEnrollSaving(true);
      const data = await authedFetch('/api/master-admin/institutions', {
        method: 'POST',
        body: JSON.stringify({
          institution_name: enrollForm.institution_name,
          location: enrollForm.location,
          email_domain: enrollForm.email_domain.trim(),
          admin_first_name: first,
          admin_last_name: last,
          currency_id: enrollForm.currency_id,
          subscription_plan: enrollForm.subscription_plan,
          subscription_start_date:
            enrollForm.subscription_plan === 'beta' ? null : enrollForm.subscription_start_date || null,
          category_ids: enrollForm.category_ids,
          custom_student_limit:
            enrollForm.subscription_plan === 'beta' && enrollForm.custom_student_limit
              ? Number(enrollForm.custom_student_limit)
              : null,
        }),
      });
      setEnrollResult(data);
      setEnrollStep(3);
      Toast.show({ type: 'success', text1: 'Institution', text2: 'Institution enrolled', position: 'top' });
      await loadInstitutions();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Institution', text2: e.message || 'Enrollment failed', position: 'top' });
    } finally {
      setEnrollSaving(false);
    }
  };

  const resetEnrollmentState = () => {
    setEnrollResult(null);
    setEnrollStep(0);
    setEnrollSaving(false);
    setEnrollForm({
      institution_name: '',
      location: '',
      email_domain: '',
      admin_first_name: '',
      admin_last_name: '',
      subscription_plan: 'basic',
      subscription_start_date: new Date().toISOString().slice(0, 10),
      custom_student_limit: '',
      currency_id: currencies.find((currency) => currency.is_default)?.id || currencies[0]?.id || '',
      category_ids: [],
    });
    setPlanStartDateModalOpen(false);
  };

  const closeEnrollModal = () => {
    setEnrollModalOpen(false);
    resetEnrollmentState();
  };

  const canGoNextEnroll = () => {
    if (enrollStep === 0) {
      return !!enrollForm.institution_name.trim()
        && !!enrollForm.email_domain.trim()
        && enrollForm.category_ids.length > 0
        && !!enrollForm.currency_id;
    }
    if (enrollStep === 1) {
      if (!enrollForm.subscription_plan) return false;
      if (enrollForm.subscription_plan === 'beta') {
        return !!String(enrollForm.custom_student_limit || '').trim();
      }
      return !!enrollForm.subscription_start_date;
    }
    if (enrollStep === 2) return !!enrollForm.admin_first_name.trim() && !!enrollForm.admin_last_name.trim();
    return false;
  };

  const nextEnrollStep = () => {
    if (enrollStep < 2 && canGoNextEnroll()) {
      setEnrollStep((s) => (s + 1) as EnrollmentStep);
    } else if (enrollStep === 2) {
      enrollInstitution();
    }
  };

  const prevEnrollStep = () => {
    if (enrollStep > 0 && enrollStep < 3) {
      setEnrollStep((s) => (s - 1) as EnrollmentStep);
      return;
    }
    closeEnrollModal();
  };

  const openCategoryPicker = (target: 'enroll' | 'edit') => {
    setCategoryPickerModal({ open: true, target });
  };

  const closeCategoryPicker = () => {
    setCategoryPickerModal({ open: false, target: null });
  };

  const toggleCategorySelection = (value: string) => {
    if (!value) return;
    if (categoryPickerModal.target === 'enroll') {
      setEnrollForm((p) => {
        const exists = p.category_ids.includes(value);
        return {
          ...p,
          category_ids: exists
            ? p.category_ids.filter((id) => id !== value)
            : [...new Set([...p.category_ids, value])],
        };
      });
    }
    if (categoryPickerModal.target === 'edit') {
      setEditForm((p) => {
        const current = Array.isArray(p.category_ids)
          ? p.category_ids
          : (p.category_id ? [String(p.category_id)] : []);
        const exists = current.includes(value);
        const next = exists ? current.filter((id) => id !== value) : [...current, value];
        return {
          ...p,
          category_ids: [...new Set(next)],
          category_id: next[0] || null,
        };
      });
    }
  };

  const clearCategorySelection = () => {
    if (categoryPickerModal.target === 'enroll') {
      setEnrollForm((p) => ({ ...p, category_ids: [] }));
    }
    if (categoryPickerModal.target === 'edit') {
      setEditForm((p) => ({ ...p, category_ids: [], category_id: null }));
    }
  };

  const getCategoryNames = (ids: string[]) => {
    const names = ids
      .map((id) => categories.find((cat) => cat.id === id)?.name)
      .filter((name): name is string => !!name);
    return names;
  };

  const selectedEnrollCategoryName = (() => {
    const names = getCategoryNames(enrollForm.category_ids);
    if (names.length === 0) return 'Select categories';
    return names.join(', ');
  })();
  const selectedEditCategoryName = (() => {
    const ids = Array.isArray(editForm.category_ids)
      ? editForm.category_ids
      : (editForm.category_id ? [String(editForm.category_id)] : []);
    const names = getCategoryNames(ids);
    if (names.length === 0) return 'No category';
    return names.join(', ');
  })();
  const selectedEnrollPlanName = (enrollForm.subscription_plan || 'trial').toUpperCase();
  const selectedEditPlanName = String(editForm.subscription_plan || 'basic').toUpperCase();
  const selectedEditPlanStartDate = String(editForm.subscription_start_date || '').slice(0, 10);
  const editPlanStartDatePlaceholder = new Date().toISOString().slice(0, 10);
  const hasEditPlanChanged =
    !!activeInstitution &&
    String(editForm.subscription_plan || 'basic') !== String(activeInstitution.subscription_plan || 'basic');

  const openPlanStartDatePicker = () => {
    const base = enrollForm.subscription_start_date ? new Date(enrollForm.subscription_start_date) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = new Date().toISOString().slice(0, 10);
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const picker = document.createElement('input');
        picker.type = 'date';
        picker.value = enrollForm.subscription_start_date || new Date().toISOString().slice(0, 10);
        picker.min = todayIso;
        // Keep the input in the viewport so browser date popover can anchor reliably.
        picker.style.position = 'fixed';
        picker.style.top = '120px';
        picker.style.left = '50%';
        picker.style.transform = 'translateX(-50%)';
        picker.style.zIndex = '99999';
        picker.style.opacity = '0.01';
        picker.style.width = '1px';
        picker.style.height = '1px';

        const handleChange = () => {
          const selected = picker.value;
          if (!selected) return;
          if (selected < todayIso) {
            Toast.show({ type: 'error', text1: 'Invalid date', text2: 'Start date cannot be before today', position: 'top' });
            return;
          }
          setEnrollForm((p) => ({ ...p, subscription_start_date: selected }));
        };

        const cleanup = () => {
          picker.removeEventListener('change', handleChange);
          picker.removeEventListener('blur', cleanup);
          if (picker.parentNode) picker.parentNode.removeChild(picker);
        };

        picker.addEventListener('change', handleChange);
        picker.addEventListener('blur', cleanup, { once: true });
        document.body.appendChild(picker);
        try {
          if (typeof picker.showPicker === 'function') {
            picker.showPicker();
          } else {
            picker.focus();
            picker.click();
          }
        } catch {
          picker.focus();
          picker.click();
        }
      }
      return;
    }

    if (Platform.OS === 'android') {
      if (!NativeDateTimePickerAndroid) {
        Toast.show({ type: 'error', text1: 'Date Picker', text2: 'Date picker is unavailable on this device', position: 'top' });
        return;
      }
      NativeDateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        display: 'calendar',
        minimumDate: today,
        is24Hour: true,
        onChange: (_event: any, selectedDate: Date | undefined) => {
          if (!selectedDate) return;
          if (selectedDate < today) {
            Toast.show({ type: 'error', text1: 'Invalid date', text2: 'Start date cannot be before today', position: 'top' });
            return;
          }
          const yyyy = selectedDate.getFullYear();
          const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
          const dd = String(selectedDate.getDate()).padStart(2, '0');
          setEnrollForm((p) => ({ ...p, subscription_start_date: `${yyyy}-${mm}-${dd}` }));
        },
      });
      return;
    }
    setPlanStartDateDraft(base);
    setPlanStartDateModalOpen(true);
  };

  const openEditInstitution = (inst: Institution) => {
    const resolvedCategoryIds = Array.isArray(inst.category_ids)
      ? inst.category_ids
      : (inst.category_id ? [String(inst.category_id)] : []);
    setActiveInstitutionId(inst.id);
    setEditForm({
      ...inst,
      category_ids: resolvedCategoryIds,
      category_id: resolvedCategoryIds[0] || null,
      currency_id: inst.currency_id || '',
      subscription_start_date:
        String(inst.subscription_tracking_start_date || '').slice(0, 10) || String(inst.subscription_start_date || '').slice(0, 10) || '',
    });
    setEditModalOpen(true);
  };

  const openEditPlanStartDatePicker = () => {
    const base = selectedEditPlanStartDate ? new Date(selectedEditPlanStartDate) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = new Date().toISOString().slice(0, 10);

    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        const picker = document.createElement('input');
        picker.type = 'date';
        picker.value = selectedEditPlanStartDate || todayIso;
        picker.min = todayIso;
        picker.style.position = 'fixed';
        picker.style.top = '120px';
        picker.style.left = '50%';
        picker.style.transform = 'translateX(-50%)';
        picker.style.zIndex = '99999';
        picker.style.opacity = '0.01';
        picker.style.width = '1px';
        picker.style.height = '1px';

        const handleChange = () => {
          const selected = picker.value;
          if (!selected) return;
          if (selected < todayIso) {
            Toast.show({ type: 'error', text1: 'Invalid date', text2: 'Start date cannot be before today', position: 'top' });
            return;
          }
          setEditForm((p) => ({ ...p, subscription_start_date: selected }));
        };

        const cleanup = () => {
          picker.removeEventListener('change', handleChange);
          picker.removeEventListener('blur', cleanup);
          if (picker.parentNode) picker.parentNode.removeChild(picker);
        };

        picker.addEventListener('change', handleChange);
        picker.addEventListener('blur', cleanup, { once: true });
        document.body.appendChild(picker);
        try {
          if (typeof picker.showPicker === 'function') picker.showPicker();
          else {
            picker.focus();
            picker.click();
          }
        } catch {
          picker.focus();
          picker.click();
        }
      }
      return;
    }

    if (Platform.OS === 'android') {
      if (!NativeDateTimePickerAndroid) {
        Toast.show({ type: 'error', text1: 'Date Picker', text2: 'Date picker is unavailable on this device', position: 'top' });
        return;
      }
      NativeDateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        display: 'calendar',
        minimumDate: today,
        is24Hour: true,
        onChange: (_event: any, selectedDate: Date | undefined) => {
          if (!selectedDate) return;
          const yyyy = selectedDate.getFullYear();
          const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
          const dd = String(selectedDate.getDate()).padStart(2, '0');
          setEditForm((p) => ({ ...p, subscription_start_date: `${yyyy}-${mm}-${dd}` }));
        },
      });
      return;
    }

    setEditPlanStartDateDraft(base);
    setEditPlanStartDateModalOpen(true);
  };

  const submitEditInstitution = async () => {
    if (!activeInstitutionId) return;
    try {
      setEditSaving(true);
      const response = await authedFetch(`/api/master-admin/institutions/${activeInstitutionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editForm,
          admin_first_name: String(editForm.admin_first_name || '').trim() || null,
          admin_last_name: String(editForm.admin_last_name || '').trim() || null,
          custom_student_limit:
            editForm.custom_student_limit === null || editForm.custom_student_limit === undefined
              ? null
              : Number(editForm.custom_student_limit),
          currency_id: editForm.currency_id || null,
          subscription_start_date: editForm.subscription_plan === 'beta' ? null : (editForm.subscription_start_date || null),
          subscription_tracking_start_date: editForm.subscription_tracking_start_date || null,
          category_ids: Array.isArray(editForm.category_ids)
            ? editForm.category_ids
            : (editForm.category_id ? [String(editForm.category_id)] : []),
        }),
      });

      if (response?.main_admin_new_email) {
        Toast.show({
          type: 'success',
          text1: 'Main Admin Login Updated',
          text2: `New login email: ${response.main_admin_new_email}`,
          position: 'top',
        });
      }

      if (response?.domain_migration?.migrated_count > 0) {
        Toast.show({
          type: 'success',
          text1: 'Domain Migration Completed',
          text2: `${response.domain_migration.migrated_count} account(s) moved to ${response.domain_migration.next_domain}. Passwords preserved; users notified.`,
          position: 'top',
        });
      } else {
        Toast.show({ type: 'success', text1: 'Institution', text2: 'Institution updated', position: 'top' });
      }

      setEditModalOpen(false);
      await loadInstitutions();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Institution', text2: e.message || 'Update failed', position: 'top' });
    } finally {
      setEditSaving(false);
    }
  };

  const saveEditInstitution = async () => {
    if (!activeInstitution) {
      await submitEditInstitution();
      return;
    }

    const previousDomain = String(activeInstitution.email_domain || '').trim().toLowerCase();
    const nextDomain = String(editForm.email_domain || '').trim().toLowerCase();
    const hasDomainChange = !!previousDomain && !!nextDomain && previousDomain !== nextDomain;

    if (hasDomainChange) {
      askConfirm(
        'Confirm Domain Migration',
        `This will change institution login emails from ${previousDomain} to ${nextDomain} for all institution users and admins. Passwords will remain unchanged, active sessions will be revoked, and users will be notified. Continue?`,
        async () => {
          await submitEditInstitution();
        }
      );
      return;
    }

    await submitEditInstitution();
  };

  const openManageAdmins = async (institutionId: string) => {
    try {
      setActiveInstitutionId(institutionId);
      setAdminsModalOpen(true);
      setAdminsLoading(true);
      const data = await authedFetch(`/api/master-admin/institutions/${institutionId}`);
      setAdmins((data?.admins || []).filter((u: any) => !!u?.id));
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Admins', text2: e.message || 'Unable to load admins', position: 'top' });
    } finally {
      setAdminsLoading(false);
    }
  };

  const executeAdminPasswordReset = async (adminUser: AdminUser) => {
    try {
      setAdminResetLoadingId(adminUser.id);
      const response = await authedFetch('/api/auth/admin-reset-password', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: adminUser.id }),
      });

      setAdminResetResult(response || null);
      setAdminResetResultOpen(true);
      Toast.show({
        type: 'success',
        text1: 'Admin Password Reset',
        text2: 'Temporary credential regenerated. All active sessions were revoked.',
        position: 'top',
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Admin', text2: e.message || 'Password reset failed', position: 'top' });
    } finally {
      setAdminResetLoadingId(null);
    }
  };

  const resetAdminPassword = (adminUser: AdminUser) => {
    askConfirm(
      'Confirm Password Reset',
      `Reset password for ${(`${adminUser.first_name || ''} ${adminUser.last_name || ''}`).trim() || adminUser.email}? This will generate a new temporary credential, force logout all active sessions, and require password + security question setup at next login.`,
      async () => {
        await executeAdminPasswordReset(adminUser);
      }
    );
  };

  const removeAdmin = (adminUser: AdminUser) => {
    if (!activeInstitutionId) return;
    askConfirm(
      'Remove Admin',
      `Remove ${(`${adminUser.first_name || ''} ${adminUser.last_name || ''}`).trim() || adminUser.email} from this institution?`,
      async () => {
        await authedFetch(`/api/master-admin/institutions/admins/${adminUser.id}`, { method: 'DELETE' });
        Toast.show({ type: 'success', text1: 'Admin', text2: 'Admin removed', position: 'top' });
        await openManageAdmins(activeInstitutionId);
      }
    );
  };

  const openAddons = (inst: Institution) => {
    setActiveInstitutionId(inst.id);
    const next: Record<string, boolean> = {};
    ADDON_ROWS.forEach((a) => {
      next[a.key] = !!inst[a.key];
    });
    setAddonsForm(next);
    setAddonsModalOpen(true);
  };

  const saveAddons = async () => {
    if (!activeInstitutionId) return;
    try {
      setAddonsSaving(true);
      await authedFetch(`/api/master-admin/institutions/${activeInstitutionId}/subscription`, {
        method: 'PUT',
        body: JSON.stringify(addonsForm),
      });
      Toast.show({ type: 'success', text1: 'Add-ons', text2: 'Add-ons updated', position: 'top' });
      setAddonsModalOpen(false);
      await loadInstitutions();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Add-ons', text2: e.message || 'Unable to update add-ons', position: 'top' });
    } finally {
      setAddonsSaving(false);
    }
  };

  const openStats = async (institutionId: string) => {
    try {
      setActiveInstitutionId(institutionId);
      setStatsModalOpen(true);
      setStatsLoading(true);
      const data = await authedFetch(`/api/master-admin/analytics/${institutionId}`);
      setStatsData({
        students: Number(data?.students || 0),
        teachers: Number(data?.teachers || 0),
        classes: Number(data?.classes || 0),
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Stats', text2: e.message || 'Unable to load stats', position: 'top' });
    } finally {
      setStatsLoading(false);
    }
  };

  const openRecordPayment = (institutionId: string) => {
    setActiveInstitutionId(institutionId);
    setPaymentModalOpen(true);
  };

  const savePayment = async () => {
    if (!activeInstitutionId) return;
    if (!paymentForm.amount) {
      Toast.show({ type: 'error', text1: 'Payment', text2: 'Amount is required', position: 'top' });
      return;
    }
    try {
      setPaymentSaving(true);
      await authedFetch('/api/master-admin/payments', {
        method: 'POST',
        body: JSON.stringify({
          institution_id: activeInstitutionId,
          amount: Number(paymentForm.amount),
          method: paymentForm.method,
          reference_id: paymentForm.reference_id,
          notes: paymentForm.notes,
          date: paymentForm.date,
        }),
      });
      Toast.show({ type: 'success', text1: 'Payment', text2: 'Payment recorded', position: 'top' });
      setPaymentModalOpen(false);
      setPaymentForm({ amount: '', method: 'bank_transfer', reference_id: '', date: new Date().toISOString().slice(0, 10), notes: '' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Payment', text2: e.message || 'Unable to record payment', position: 'top' });
    } finally {
      setPaymentSaving(false);
    }
  };

  const toggleInstitutionStatus = (inst: Institution) => {
    const current = String(inst.subscription_status || '').toLowerCase();
    const nextStatus = current === 'suspended' ? 'active' : 'suspended';
    const isDisabling = nextStatus === 'suspended';
    askConfirm(
      isDisabling ? 'Disable Institution' : 'Enable Institution',
      isDisabling
        ? 'This will immediately block login and revoke active sessions for all users in the institution.'
        : 'This will restore institution access.',
      async () => {
        await authedFetch(`/api/master-admin/institutions/${inst.id}/subscription`, {
          method: 'PUT',
          body: JSON.stringify({ subscription_status: nextStatus }),
        });
        Toast.show({
          type: 'success',
          text1: 'Institution',
          text2: isDisabling ? 'Institution disabled and active sessions revoked' : 'Institution enabled',
          position: 'top',
        });
        await loadInstitutions();
      }
    );
  };

  const deleteInstitution = (inst: Institution) => {
    askConfirm('Delete Institution', `Delete ${inst.name}? This cannot be undone.`, async () => {
      await authedFetch(`/api/master-admin/institutions/${inst.id}`, { method: 'DELETE' });
      Toast.show({ type: 'success', text1: 'Institution', text2: 'Institution deleted', position: 'top' });
      await loadInstitutions();
    });
  };

  const renderInstitution = ({ item }: { item: Institution }) => {
    const usersCount = item.users?.[0]?.count || 0;
    const suspended = String(item.subscription_status || '').toLowerCase() === 'suspended';
    const institutionCurrency = currencies.find((currency) => currency.id === item.currency_id);

    return (
      <View
        style={{
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>{item.name}</Text>
            <Text style={{ color: c.sub, marginTop: 4 }}>
              {item.email_domain || 'No domain'}  •  {usersCount} users
            </Text>
            <Text style={{ color: c.sub, marginTop: 2 }}>
              Currency: {institutionCurrency ? `${institutionCurrency.code} (${institutionCurrency.symbol})` : 'USD ($)'}
            </Text>
            <Text style={{ color: suspended ? c.danger : c.success, marginTop: 4, fontWeight: '700' }}>
              {String(item.subscription_status || 'unknown').toUpperCase()}  •  {String(item.subscription_plan || 'basic').toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => toggleInstitutionStatus(item)}
            style={{
              backgroundColor: suspended ? 'rgba(26,127,55,0.16)' : 'rgba(207,34,46,0.16)',
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
          >
            <Text style={{ color: suspended ? c.success : c.danger, fontWeight: '700' }}>
              {suspended ? 'Enable' : 'Disable'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <ActionChip c={c} icon="puzzle" label="Add-ons" onPress={() => openAddons(item)} />
          <ActionChip c={c} icon="chart-bar" label="Stats" onPress={() => openStats(item.id)} />
          <ActionChip c={c} icon="account-cog" label="Admins" onPress={() => openManageAdmins(item.id)} />
          <ActionChip c={c} icon="pencil" label="Edit" onPress={() => openEditInstitution(item)} />
          <ActionChip c={c} icon="cash-plus" label="Record Payment" onPress={() => openRecordPayment(item.id)} />
          <ActionChip c={c} icon="trash-can-outline" danger label="Delete" onPress={() => deleteInstitution(item)} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="office-building-cog" size={24} color={c.primary} />
          <View>
            <Text style={{ color: c.text, fontSize: 23, fontWeight: '800' }}>Institutions</Text>
            <Text style={{ color: c.sub, marginTop: 2 }}>Manage institutions and operational controls</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => setCategoryModalOpen(true)}>
            <MaterialCommunityIcons name="tag-outline" size={22} color={c.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={loadInstitutions}>
            <MaterialCommunityIcons name="refresh" size={22} color={c.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { resetEnrollmentState(); setEnrollModalOpen(true); }}>
            <MaterialCommunityIcons name="plus-circle" size={24} color={c.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 24 }}>
          <ListItemSkeleton loading={loading} count={6} label="Loading institutions..." />
        </View>
      ) : (
        <FlatList
          data={institutions}
          keyExtractor={(i) => i.id}
          renderItem={renderInstitution}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <MaterialCommunityIcons name="domain-off" size={48} color={c.border} />
              <Text style={{ color: c.sub, marginTop: 10 }}>No institutions found.</Text>
            </View>
          }
        />
      )}

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        body={confirmModal.body}
        c={c}
        onCancel={() => setConfirmModal({ open: false, title: '', body: '' })}
        onConfirm={async () => {
          const fn = confirmModal.onConfirm;
          setConfirmModal({ open: false, title: '', body: '' });
          if (fn) await fn();
        }}
      />

      <Modal visible={categoryModalOpen} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border, maxHeight: '82%' }]}>
            <ModalHeader title="Manage Categories" c={c} onClose={() => setCategoryModalOpen(false)} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: c.sub, fontSize: 12, marginBottom: 6 }}>Category Name</Text>
              <TextInput
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder="e.g. Senior School"
                placeholderTextColor={c.sub}
                style={inputStyle(c)}
              />

              <Text style={{ color: c.sub, fontSize: 12, marginTop: 10, marginBottom: 6 }}>Class Type</Text>
              <TextInput
                value={categoryClassType}
                onChangeText={setCategoryClassType}
                placeholder="e.g. Grade/Form/KG"
                placeholderTextColor={c.sub}
                style={inputStyle(c)}
              />

              <TouchableOpacity
                onPress={saveCategory}
                disabled={categorySaving}
                style={{ marginTop: 12, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: categorySaving ? 0.7 : 1 }}
              >
                {categorySaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Add Category</Text>}
              </TouchableOpacity>

              <Text style={{ color: c.text, fontWeight: '700', marginTop: 18, marginBottom: 10 }}>Active Categories</Text>
              {categories.map((cat) => (
                <View
                  key={cat.id}
                  style={{
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8,
                    backgroundColor: c.bg,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View>
                    <Text style={{ color: c.text, fontWeight: '700' }}>{cat.name}</Text>
                    <Text style={{ color: c.sub, marginTop: 2 }}>Type: {cat.class_type}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => startEditCategory(cat)}>
                      <MaterialCommunityIcons name="pencil" size={18} color={c.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteCategory(cat)}>
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color={c.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={enrollModalOpen && enrollStep < 3} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border, maxHeight: '90%' }]}> 
            <ModalHeader title="Enroll Institution" c={c} onClose={closeEnrollModal} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {enrollStep < 3 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: i <= enrollStep ? c.primary : c.border }} />
                  ))}
                </View>
              )}

              {enrollStep === 0 && (
                <>
                  <Field label="Institution Name*" c={c} value={enrollForm.institution_name} onChangeText={(v) => setEnrollForm((p) => ({ ...p, institution_name: v }))} />
                  <Field label="Location" c={c} value={enrollForm.location} onChangeText={(v) => setEnrollForm((p) => ({ ...p, location: v }))} />
                  <Field label="Email Domain*" c={c} value={enrollForm.email_domain} onChangeText={(v) => setEnrollForm((p) => ({ ...p, email_domain: v }))} />

                  <Text style={labelStyle(c)}>Currency*</Text>
                  <View style={pickerWrap(c)}>
                    <Picker
                      selectedValue={enrollForm.currency_id}
                      onValueChange={(v) => setEnrollForm((p) => ({ ...p, currency_id: String(v || '') }))}
                      style={{ color: c.text }}
                    >
                      {currencies.map((currency) => (
                        <Picker.Item
                          key={currency.id}
                          label={`${currency.code} (${currency.symbol}) - ${currency.name}`}
                          value={currency.id}
                        />
                      ))}
                    </Picker>
                  </View>

                  <Text style={labelStyle(c)}>Category*</Text>
                  <TouchableOpacity
                    onPress={() => openCategoryPicker('enroll')}
                    style={{
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                      backgroundColor: c.bg,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: enrollForm.category_ids.length > 0 ? c.text : c.sub, fontWeight: '600' }}>{selectedEnrollCategoryName}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={c.sub} />
                  </TouchableOpacity>
                </>
              )}

              {enrollStep === 1 && (
                <>
                  <Text style={labelStyle(c)}>Subscription Plan</Text>
                  <TouchableOpacity
                    onPress={() => setPlanPickerModalOpen(true)}
                    style={{
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                      backgroundColor: c.bg,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: c.text, fontWeight: '600' }}>{selectedEnrollPlanName}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={c.sub} />
                  </TouchableOpacity>

                  {enrollForm.subscription_plan !== 'beta' && (
                    <>
                      <Text style={labelStyle(c)}>Subscription Tracking Start Date*</Text>
                      <TouchableOpacity
                        onPress={openPlanStartDatePicker}
                        style={{
                          borderWidth: 1,
                          borderColor: c.border,
                          borderRadius: 12,
                          backgroundColor: c.bg,
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: c.text, fontWeight: '600' }}>{enrollForm.subscription_start_date || 'Select date'}</Text>
                        <MaterialCommunityIcons name="calendar-month" size={20} color={c.sub} />
                      </TouchableOpacity>
                    </>
                  )}

                  {enrollForm.subscription_plan === 'beta' && (
                    <Field
                      label="Custom Student Limit*"
                      c={c}
                      value={enrollForm.custom_student_limit}
                      keyboardType="number-pad"
                      onChangeText={(v) => {
                        const numericOnly = String(v || '').replace(/\D/g, '');
                        setEnrollForm((p) => ({ ...p, custom_student_limit: numericOnly }));
                      }}
                    />
                  )}

                </>
              )}

              {enrollStep === 2 && (
                <>
                  <Field label="Admin First Name*" c={c} value={enrollForm.admin_first_name} onChangeText={(v) => setEnrollForm((p) => ({ ...p, admin_first_name: v }))} />
                  <Field label="Admin Last Name*" c={c} value={enrollForm.admin_last_name} onChangeText={(v) => setEnrollForm((p) => ({ ...p, admin_last_name: v }))} />
                  <Text style={{ color: c.sub, marginTop: 10 }}>
                    Admin email and temporary password will be auto-generated using first + last name and institution domain.
                  </Text>
                </>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 24 }}>
                <TouchableOpacity
                  onPress={prevEnrollStep}
                  style={{ flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: c.text, fontWeight: '700' }}>{enrollStep === 0 ? 'Cancel' : enrollStep === 3 ? 'Close' : 'Back'}</Text>
                </TouchableOpacity>

                {enrollStep < 3 && (
                  <TouchableOpacity
                    onPress={nextEnrollStep}
                    disabled={!canGoNextEnroll() || enrollSaving}
                    style={{
                      flex: 1,
                      backgroundColor: c.primary,
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: 'center',
                      opacity: !canGoNextEnroll() || enrollSaving ? 0.7 : 1,
                    }}
                  >
                    {enrollSaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>{enrollStep === 2 ? 'Confirm & Enroll' : 'Next'}</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={enrollModalOpen && enrollStep === 3} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border }]}> 
            <ModalHeader title="Admin Credentials" c={c} onClose={closeEnrollModal} />
            <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, backgroundColor: c.bg }}>
              <Text style={{ color: c.sub, marginBottom: 4 }}>Institution ID: {enrollResult?.institution_id || 'N/A'}</Text>
              <Text style={{ color: c.sub, marginBottom: 4 }}>Admin Email: {enrollResult?.admin_email || 'N/A'}</Text>
              <Text style={{ color: c.sub, marginBottom: 4 }}>Temp Password: {enrollResult?.tempPassword || 'N/A'}</Text>
              {!!enrollResult?.credential_delivery?.url && <Text style={{ color: c.sub, marginTop: 6 }}>One-time credential link generated.</Text>}
            </View>
            <TouchableOpacity
              onPress={closeEnrollModal}
              style={{ marginTop: 14, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editCategoryModalOpen} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border }]}> 
            <ModalHeader
              title="Edit Category"
              c={c}
              onClose={() => {
                setEditCategoryModalOpen(false);
                setEditingCategoryId(null);
              }}
            />

            <Text style={{ color: c.sub, fontSize: 12, marginBottom: 6 }}>Category Name</Text>
            <TextInput
              value={editCategoryName}
              onChangeText={setEditCategoryName}
              placeholder="e.g. Senior School"
              placeholderTextColor={c.sub}
              style={inputStyle(c)}
            />

            <Text style={{ color: c.sub, fontSize: 12, marginTop: 10, marginBottom: 6 }}>Class Type</Text>
            <TextInput
              value={editCategoryClassType}
              onChangeText={setEditCategoryClassType}
              placeholder="e.g. Grade/Form/KG"
              placeholderTextColor={c.sub}
              style={inputStyle(c)}
            />

            <TouchableOpacity
              onPress={saveEditedCategory}
              disabled={editCategorySaving}
              style={{ marginTop: 14, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: editCategorySaving ? 0.7 : 1 }}
            >
              {editCategorySaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Save Category</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalOpen} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border, maxHeight: '90%' }]}> 
            <ModalHeader title="Edit Institution" c={c} onClose={() => setEditModalOpen(false)} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Field label="Institution Name" c={c} value={String(editForm.name || '')} onChangeText={(v) => setEditForm((p) => ({ ...p, name: v }))} />
              <Field label="Location" c={c} value={String(editForm.location || '')} onChangeText={(v) => setEditForm((p) => ({ ...p, location: v }))} />
              <Field label="Email Domain" c={c} value={String(editForm.email_domain || '')} onChangeText={(v) => setEditForm((p) => ({ ...p, email_domain: v }))} />
              <Text style={labelStyle(c)}>Currency</Text>
              <View style={pickerWrap(c)}>
                <Picker
                  selectedValue={String(editForm.currency_id || '')}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, currency_id: String(v || '') }))}
                  style={{ color: c.text }}
                >
                  {currencies.map((currency) => (
                    <Picker.Item
                      key={currency.id}
                      label={`${currency.code} (${currency.symbol}) - ${currency.name}`}
                      value={currency.id}
                    />
                  ))}
                </Picker>
              </View>
              <Field label="Main Admin First Name" c={c} value={String(editForm.admin_first_name || '')} onChangeText={(v) => setEditForm((p) => ({ ...p, admin_first_name: v }))} />
              <Field label="Main Admin Last Name" c={c} value={String(editForm.admin_last_name || '')} onChangeText={(v) => setEditForm((p) => ({ ...p, admin_last_name: v }))} />

              <Text style={labelStyle(c)}>Category</Text>
              <TouchableOpacity
                onPress={() => openCategoryPicker('edit')}
                style={{
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 12,
                  backgroundColor: c.bg,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color:
                    ((Array.isArray(editForm.category_ids) ? editForm.category_ids.length : 0) > 0 || !!editForm.category_id)
                      ? c.text
                      : c.sub,
                  fontWeight: '600',
                }}>{selectedEditCategoryName}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={c.sub} />
              </TouchableOpacity>

              <Text style={labelStyle(c)}>Subscription Plan</Text>
              <TouchableOpacity
                onPress={() => setEditOptionModal({ open: true, type: 'plan' })}
                style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.bg, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={{ color: c.text, fontWeight: '600' }}>{selectedEditPlanName}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={c.sub} />
              </TouchableOpacity>

              {hasEditPlanChanged && String(editForm.subscription_plan || 'basic') !== 'beta' && (
                <>
                  <Text style={labelStyle(c)}>Subscription Tracking Start Date*</Text>
                  <TouchableOpacity
                    onPress={openEditPlanStartDatePicker}
                    style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.bg, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Text style={{ color: selectedEditPlanStartDate ? c.text : c.sub, fontWeight: '600' }}>{selectedEditPlanStartDate || editPlanStartDatePlaceholder}</Text>
                    <MaterialCommunityIcons name="calendar-month" size={20} color={c.sub} />
                  </TouchableOpacity>
                </>
              )}

              {String(editForm.subscription_plan || 'basic') === 'beta' && (
                <Field
                  label="Custom Student Limit*"
                  c={c}
                  value={String(editForm.custom_student_limit ?? '')}
                  keyboardType="number-pad"
                  onChangeText={(v) => {
                    const numericOnly = String(v || '').replace(/\D/g, '');
                    setEditForm((p) => ({ ...p, custom_student_limit: numericOnly === '' ? null : Number(numericOnly) }));
                  }}
                />
              )}

              <TouchableOpacity
                onPress={saveEditInstitution}
                disabled={editSaving}
                style={{ marginTop: 14, marginBottom: 30, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', opacity: editSaving ? 0.7 : 1 }}
              >
                {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={editOptionModal.open} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border, maxHeight: '70%' }]}>
            <ModalHeader
              title={
                editOptionModal.type === 'plan'
                  ? 'Select Subscription Plan'
                  : 'Select Option'
              }
              c={c}
              onClose={() => setEditOptionModal({ open: false, type: null })}
            />
            <ScrollView showsVerticalScrollIndicator={false}>
              {(editOptionModal.type === 'plan'
                ? PLAN_OPTIONS
                : []
              ).map((option) => {
                const selected =
                  editOptionModal.type === 'plan' && String(editForm.subscription_plan || 'basic') === option;
                return (
                  <TouchableOpacity
                    key={option}
                    onPress={() => {
                      if (editOptionModal.type === 'plan') setEditForm((p) => ({ ...p, subscription_plan: option }));
                      setEditOptionModal({ open: false, type: null });
                    }}
                    style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8, backgroundColor: c.bg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Text style={{ color: c.text, fontWeight: '700' }}>{option.toUpperCase()}</Text>
                    {selected && <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={editPlanStartDateModalOpen} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border }]}> 
            <ModalHeader title="Select Start Date" c={c} onClose={() => setEditPlanStartDateModalOpen(false)} />
            {Platform.OS !== 'web' && NativeDateTimePicker && (
              <NativeDateTimePicker
                value={editPlanStartDateDraft}
                mode="date"
                display="inline"
                minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                onChange={(_: any, selectedDate: Date | undefined) => {
                  if (!selectedDate) return;
                  setEditPlanStartDateDraft(selectedDate);
                }}
              />
            )}
            <TouchableOpacity
              onPress={() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (editPlanStartDateDraft < today) {
                  Toast.show({ type: 'error', text1: 'Invalid date', text2: 'Start date cannot be before today', position: 'top' });
                  return;
                }
                const yyyy = editPlanStartDateDraft.getFullYear();
                const mm = String(editPlanStartDateDraft.getMonth() + 1).padStart(2, '0');
                const dd = String(editPlanStartDateDraft.getDate()).padStart(2, '0');
                setEditForm((p) => ({ ...p, subscription_start_date: `${yyyy}-${mm}-${dd}` }));
                setEditPlanStartDateModalOpen(false);
              }}
              style={{ marginTop: 14, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Use Selected Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={addonsModalOpen} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border }]}>
            <ModalHeader title="Manage Add-ons" c={c} onClose={() => setAddonsModalOpen(false)} />
            {ADDON_ROWS.map((row) => {
              const value = !!addonsForm[row.key];
              return (
                <TouchableOpacity
                  key={String(row.key)}
                  onPress={() => setAddonsForm((prev) => ({ ...prev, [row.key]: !prev[row.key] }))}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    marginBottom: 8,
                    backgroundColor: c.bg,
                  }}
                >
                  <Text style={{ color: c.text, fontWeight: '700' }}>{row.label}</Text>
                  <MaterialCommunityIcons
                    name={value ? 'toggle-switch' : 'toggle-switch-off-outline'}
                    size={32}
                    color={value ? c.success : c.sub}
                  />
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={saveAddons}
              disabled={addonsSaving}
              style={{ marginTop: 10, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: addonsSaving ? 0.7 : 1 }}
            >
              {addonsSaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Save Add-ons</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={adminsModalOpen} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border, maxHeight: '80%' }]}>
            <ModalHeader title="Institution Admins" c={c} onClose={() => setAdminsModalOpen(false)} />

            {adminsLoading ? (
              <ListItemSkeleton loading={adminsLoading} count={4} label="Loading institution admins..." />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {admins.length === 0 && <Text style={{ color: c.sub, textAlign: 'center' }}>No admins found.</Text>}
                {admins.map((a) => (
                  <View
                    key={a.id}
                    style={{
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      backgroundColor: c.bg,
                    }}
                  >
                    <Text style={{ color: c.text, fontWeight: '700' }}>{`${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Admin User'}</Text>
                    <Text style={{ color: c.sub, marginTop: 2 }}>{a.email}</Text>
                    {a.is_main && <Text style={{ color: c.primary, marginTop: 4, fontWeight: '700' }}>Main Admin</Text>}

                    <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
                      <TouchableOpacity onPress={() => resetAdminPassword(a)} disabled={adminResetLoadingId === a.id}>
                        <Text style={{ color: c.primary, fontWeight: '700' }}>{adminResetLoadingId === a.id ? 'Resetting...' : 'Reset Password'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeAdmin(a)} disabled={admins.length <= 1 || !!a.is_main}>
                        <Text style={{ color: admins.length <= 1 || !!a.is_main ? c.sub : c.danger, fontWeight: '700' }}>
                          Remove Admin
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={adminResetResultOpen} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border }]}> 
            <ModalHeader title="Temporary Credential" c={c} onClose={() => setAdminResetResultOpen(false)} />
            <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, backgroundColor: c.bg }}>
              <Text style={{ color: c.sub, marginBottom: 4 }}>Generated Password: {adminResetResult?.tempPassword || 'N/A'}</Text>
              {!!adminResetResult?.credential_delivery?.url && <Text style={{ color: c.sub, marginBottom: 4 }}>One-time credential link generated.</Text>}
              <Text style={{ color: c.sub }}>User will be forced to re-login and complete setup on next sign in.</Text>
            </View>
            <TouchableOpacity
              onPress={() => setAdminResetResultOpen(false)}
              style={{ marginTop: 14, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={statsModalOpen} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border }]}>
            <ModalHeader title="Institution Stats" c={c} onClose={() => setStatsModalOpen(false)} />
            {statsLoading ? (
              <ListItemSkeleton loading={statsLoading} count={3} label="Loading institution stats..." />
            ) : (
              <View style={{ gap: 10 }}>
                <StatRow c={c} label="Students" value={String(statsData?.students || 0)} />
                <StatRow c={c} label="Teachers" value={String(statsData?.teachers || 0)} />
                <StatRow c={c} label="Classes" value={String(statsData?.classes || 0)} />
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={paymentModalOpen} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border }]}>
            <ModalHeader title="Record Payment" c={c} onClose={() => setPaymentModalOpen(false)} />

            <Field
              label="Amount*"
              c={c}
              value={paymentForm.amount}
              keyboardType="numeric"
              onChangeText={(v) => setPaymentForm((p) => ({ ...p, amount: v }))}
            />

            <Text style={labelStyle(c)}>Method</Text>
            <View style={pickerWrap(c)}>
              <Picker
                selectedValue={paymentForm.method}
                onValueChange={(v) => setPaymentForm((p) => ({ ...p, method: v }))}
                style={{ color: c.text }}
              >
                <Picker.Item label="BANK_TRANSFER" value="bank_transfer" />
                <Picker.Item label="MOBILE_MONEY" value="mobile_money" />
                <Picker.Item label="CARD" value="card" />
                <Picker.Item label="CASH" value="cash" />
              </Picker>
            </View>

            <Field
              label="Reference"
              c={c}
              value={paymentForm.reference_id}
              onChangeText={(v) => setPaymentForm((p) => ({ ...p, reference_id: v }))}
            />
            <Field
              label="Date"
              c={c}
              value={paymentForm.date}
              onChangeText={(v) => setPaymentForm((p) => ({ ...p, date: v }))}
            />
            <Field
              label="Notes"
              c={c}
              value={paymentForm.notes}
              onChangeText={(v) => setPaymentForm((p) => ({ ...p, notes: v }))}
            />

            <TouchableOpacity
              onPress={savePayment}
              disabled={paymentSaving}
              style={{ marginTop: 10, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: paymentSaving ? 0.7 : 1 }}
            >
              {paymentSaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>Record Payment</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={categoryPickerModal.open} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border, maxHeight: '80%' }]}>
            <ModalHeader title="Select Category" c={c} onClose={closeCategoryPicker} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                onPress={clearCategorySelection}
                style={{
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  marginBottom: 8,
                  backgroundColor: c.bg,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                  <Text style={{ color: c.text, fontWeight: '700' }}>No categories</Text>
                {((categoryPickerModal.target === 'enroll' && enrollForm.category_ids.length === 0) ||
                  (categoryPickerModal.target === 'edit' && (!Array.isArray(editForm.category_ids) || editForm.category_ids.length === 0))) && (
                  <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} />
                )}
              </TouchableOpacity>

              {categories.map((cat) => {
                const editIds = Array.isArray(editForm.category_ids)
                  ? editForm.category_ids
                  : (editForm.category_id ? [String(editForm.category_id)] : []);
                const selected =
                  (categoryPickerModal.target === 'enroll' && enrollForm.category_ids.includes(cat.id)) ||
                  (categoryPickerModal.target === 'edit' && editIds.includes(cat.id));
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => toggleCategorySelection(cat.id)}
                    style={{
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      marginBottom: 8,
                      backgroundColor: c.bg,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View>
                      <Text style={{ color: c.text, fontWeight: '700' }}>{cat.name}</Text>
                      <Text style={{ color: c.sub, marginTop: 2 }}>{cat.class_type}</Text>
                    </View>
                    {selected && <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={closeCategoryPicker}
              style={{ marginTop: 10, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={planPickerModalOpen} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border, maxHeight: '80%' }]}>
            <ModalHeader title="Select Subscription Plan" c={c} onClose={() => setPlanPickerModalOpen(false)} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {PLAN_OPTIONS.map((plan) => {
                const selected = enrollForm.subscription_plan === plan;
                return (
                  <TouchableOpacity
                    key={plan}
                    onPress={() => {
                      setEnrollForm((p) => ({ ...p, subscription_plan: plan }));
                      setPlanPickerModalOpen(false);
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      marginBottom: 8,
                      backgroundColor: c.bg,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: c.text, fontWeight: '700' }}>{plan.toUpperCase()}</Text>
                    {selected && <MaterialCommunityIcons name="check-circle" size={18} color={c.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={planStartDateModalOpen} animationType="fade" transparent>
        <View style={overlayStyle}>
          <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border }]}> 
            <ModalHeader title="Select Start Date" c={c} onClose={() => setPlanStartDateModalOpen(false)} />
            {Platform.OS !== 'web' && NativeDateTimePicker && (
              <NativeDateTimePicker
                value={planStartDateDraft}
                mode="date"
                display="inline"
                minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                onChange={(_: any, selectedDate: Date | undefined) => {
                  if (!selectedDate) return;
                  setPlanStartDateDraft(selectedDate);
                }}
              />
            )}
            <TouchableOpacity
              onPress={() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (planStartDateDraft < today) {
                  Toast.show({ type: 'error', text1: 'Invalid date', text2: 'Start date cannot be before today', position: 'top' });
                  return;
                }
                const yyyy = planStartDateDraft.getFullYear();
                const mm = String(planStartDateDraft.getMonth() + 1).padStart(2, '0');
                const dd = String(planStartDateDraft.getDate()).padStart(2, '0');
                setEnrollForm((p) => ({ ...p, subscription_start_date: `${yyyy}-${mm}-${dd}` }));
                setPlanStartDateModalOpen(false);
              }}
              style={{ marginTop: 14, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Use Selected Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ActionChip({
  c,
  icon,
  label,
  onPress,
  danger,
}: {
  c: ReturnType<typeof useThemeColors>;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: danger ? 'rgba(207,34,46,0.35)' : c.border,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: danger ? 'rgba(207,34,46,0.08)' : 'transparent',
      }}
    >
      <MaterialCommunityIcons name={icon} size={14} color={danger ? c.danger : c.text} />
      <Text style={{ color: danger ? c.danger : c.text, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function ModalHeader({ title, c, onClose }: { title: string; c: ReturnType<typeof useThemeColors>; onClose: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <Text style={{ color: c.text, fontSize: 20, fontWeight: '800' }}>{title}</Text>
      <TouchableOpacity onPress={onClose}>
        <MaterialCommunityIcons name="close" size={22} color={c.sub} />
      </TouchableOpacity>
    </View>
  );
}

function ConfirmModal({
  open,
  title,
  body,
  c,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  c: ReturnType<typeof useThemeColors>;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  return (
    <Modal visible={open} animationType="fade" transparent>
      <View style={overlayStyle}>
        <View style={[modalCardStyle, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={{ color: c.text, fontSize: 19, fontWeight: '800' }}>{title}</Text>
          <Text style={{ color: c.sub, marginTop: 8 }}>{body}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <TouchableOpacity onPress={onCancel} style={{ flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 12, alignItems: 'center', paddingVertical: 11 }}>
              <Text style={{ color: c.text, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={{ flex: 1, backgroundColor: c.primary, borderRadius: 12, alignItems: 'center', paddingVertical: 11 }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  c,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
}: {
  label: string;
  c: ReturnType<typeof useThemeColors>;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'numeric' | 'number-pad';
  secureTextEntry?: boolean;
}) {
  return (
    <>
      <Text style={labelStyle(c)}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        style={inputStyle(c)}
        placeholderTextColor={c.sub}
      />
    </>
  );
}

function StatRow({ c, label, value }: { c: ReturnType<typeof useThemeColors>; label: string; value: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: c.bg, flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: c.sub, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: c.text, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}

const overlayStyle = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  padding: 16,
};

const overlayBottomStyle = {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'flex-end' as const,
};

const modalCardStyle = {
  width: '100%' as const,
  maxWidth: 560,
  borderRadius: 18,
  borderWidth: 1,
  padding: 16,
};

const sheetStyle = {
  borderTopLeftRadius: 18,
  borderTopRightRadius: 18,
  borderWidth: 1,
  padding: 16,
  maxHeight: '90%' as const,
};

const labelStyle = (c: ReturnType<typeof useThemeColors>) => ({
  color: c.sub,
  fontSize: 12,
  marginBottom: 6,
  marginTop: 8,
  fontWeight: '700' as const,
});

const inputStyle = (c: ReturnType<typeof useThemeColors>) => ({
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: c.text,
  backgroundColor: c.input,
});

const pickerWrap = (c: ReturnType<typeof useThemeColors>) => ({
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: 12,
  backgroundColor: c.input,
  marginBottom: 4,
});
