import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { FinanceService } from "@/services/FinanceService";
import { Spinner } from "@/components/ui/Spinner";
import Toast from "react-native-toast-message";
import {
  Check,
  CreditCard,
  FileText,
  Flag,
  Plus,
  Save,
  Settings,
  ShieldAlert,
  Sliders,
  X,
} from "lucide-react-native";

export const FinanceSettingsSection: React.FC = () => {
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState({
    currency_code: "KES",
    receipt_prefix: "REC-",
    receipt_padding: 5,
    receipt_footer_text: "Official computer-generated receipt. Valid without signature.",
    allow_overpayment_credit: true,
    allow_partial_payments: true,
    grace_period_days: 14,
    late_penalty_percent: 0,
    max_upload_size_mb: 10,
  });

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [flagReasons, setFlagReasons] = useState<any[]>([]);

  // Method Modal
  const [methodModalVisible, setMethodModalVisible] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any | null>(null);
  const [methodForm, setMethodForm] = useState({
    name: "",
    code: "",
    instructions: "",
    requires_reference: true,
    requires_proof: false,
    is_active: true,
  });

  // Flag Reason Modal
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [reasonForm, setReasonForm] = useState({
    code: "",
    label: "",
    requires_note: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await FinanceService.getFinanceSettings();
      if (res) {
        if (res.settings) {
          setSettings({
            currency_code: res.settings.currency_code || "KES",
            receipt_prefix: res.settings.receipt_prefix || "REC-",
            receipt_padding: Number(res.settings.receipt_padding) || 5,
            receipt_footer_text:
              res.settings.receipt_footer_text ||
              "Official computer-generated receipt. Valid without signature.",
            allow_overpayment_credit: res.settings.allow_overpayment_credit !== false,
            allow_partial_payments: res.settings.allow_partial_payments !== false,
            grace_period_days: Number(res.settings.grace_period_days) || 14,
            late_penalty_percent: Number(res.settings.late_penalty_percent) || 0,
            max_upload_size_mb: Number(res.settings.max_upload_size_mb) || 10,
          });
        }
        if (Array.isArray(res.payment_methods)) {
          setPaymentMethods(res.payment_methods);
        }
        if (Array.isArray(res.flag_reasons)) {
          setFlagReasons(res.flag_reasons);
        }
      }
    } catch (e: any) {
      console.error("fetchSettings error:", e);
      Toast.show({ type: "error", text1: "Error", text2: e?.message || "Failed to load finance settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneralSettings = async () => {
    try {
      setSaving(true);
      await FinanceService.updateFinanceSettings(settings);
      Toast.show({
        type: "success",
        text1: "Settings Saved",
        text2: "Finance configuration updated successfully.",
      });
    } catch (e: any) {
      Alert.alert("Save Error", e?.message || "Unable to save finance settings");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMethodActive = async (method: any) => {
    try {
      const nextActive = !method.is_active;
      await FinanceService.updatePaymentMethod(method.id, { is_active: nextActive });
      setPaymentMethods((prev) =>
        prev.map((m) => (m.id === method.id ? { ...m, is_active: nextActive } : m))
      );
      Toast.show({
        type: "info",
        text1: method.name,
        text2: nextActive ? "Enabled for parents" : "Disabled",
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not toggle payment method");
    }
  };

  const openCreateMethod = () => {
    setEditingMethod(null);
    setMethodForm({
      name: "",
      code: "",
      instructions: "",
      requires_reference: true,
      requires_proof: false,
      is_active: true,
    });
    setMethodModalVisible(true);
  };

  const openEditMethod = (method: any) => {
    setEditingMethod(method);
    setMethodForm({
      name: method.name || "",
      code: method.code || "",
      instructions: method.instructions || "",
      requires_reference: method.requires_reference !== false,
      requires_proof: !!method.requires_proof,
      is_active: method.is_active !== false,
    });
    setMethodModalVisible(true);
  };

  const handleSaveMethod = async () => {
    if (!methodForm.name.trim() || !methodForm.code.trim()) {
      Alert.alert("Validation", "Name and code are required.");
      return;
    }
    try {
      if (editingMethod?.id) {
        await FinanceService.updatePaymentMethod(editingMethod.id, methodForm);
      } else {
        await FinanceService.createPaymentMethod(methodForm);
      }
      setMethodModalVisible(false);
      fetchSettings();
      Toast.show({ type: "success", text1: "Payment Method", text2: "Successfully saved." });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save payment method.");
    }
  };

  const handleSaveFlagReason = async () => {
    if (!reasonForm.label.trim() || !reasonForm.code.trim()) {
      Alert.alert("Validation", "Reason label and code are required.");
      return;
    }
    try {
      await FinanceService.createFlagReason(reasonForm);
      setReasonModalVisible(false);
      setReasonForm({ code: "", label: "", requires_note: false });
      fetchSettings();
      Toast.show({ type: "success", text1: "Flag Reason Added", text2: "Successfully created." });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save flag reason.");
    }
  };

  if (loading) {
    return (
      <View className="py-20 items-center justify-center">
        <Spinner size="large" label="Loading finance configuration..." />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-2xl font-bold text-gray-800 dark:text-white">Finance Settings</Text>
          <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
            Rules, Numbering, Methods & Flag Codes
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSaveGeneralSettings}
          disabled={saving}
          className="bg-[#10B981] px-4 py-2.5 rounded-xl flex-row items-center shadow-sm"
        >
          {saving ? (
            <Spinner color="#FFF" size="small" />
          ) : (
            <>
              <Save size={16} color="#FFF" />
              <Text className="text-white font-bold text-xs ml-1.5 uppercase tracking-wider">Save Rules</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* SECTION 1: RECEIPT NUMBERING & FORMAT */}
      <View className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-3xl p-5 mb-5 border border-[#D0D7DE] dark:border-[#21262D]">
        <View className="flex-row items-center mb-4">
          <FileText size={18} color="#FF6900" />
          <Text className="text-base font-bold text-gray-900 dark:text-white ml-2">
            Receipt Numbering & Branding
          </Text>
        </View>

        <View className="flex-row gap-4 mb-3">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Receipt Prefix
            </Text>
            <TextInput
              value={settings.receipt_prefix}
              onChangeText={(t) => setSettings({ ...settings, receipt_prefix: t })}
              placeholder="REC-"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              className="bg-white dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white font-mono"
            />
          </View>

          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Digit Padding
            </Text>
            <TextInput
              value={String(settings.receipt_padding)}
              onChangeText={(t) =>
                setSettings({ ...settings, receipt_padding: Number(t.replace(/[^0-9]/g, "")) || 5 })
              }
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              className="bg-white dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white font-mono"
            />
          </View>
        </View>

        <View className="bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40 mb-3">
          <Text className="text-xs text-amber-800 dark:text-amber-300 font-medium">
            Sample Generated Receipt Number:{" "}
            <Text className="font-bold font-mono">
              {settings.receipt_prefix}
              {String(1).padStart(settings.receipt_padding, "0")}
            </Text>
          </Text>
        </View>

        <View>
          <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
            Official Receipt Footer Disclaimer
          </Text>
          <TextInput
            value={settings.receipt_footer_text}
            onChangeText={(t) => setSettings({ ...settings, receipt_footer_text: t })}
            multiline
            numberOfLines={2}
            className="bg-white dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white"
          />
        </View>
      </View>

      {/* SECTION 2: BILLING, CREDIT & LATE RULES */}
      <View className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-3xl p-5 mb-5 border border-[#D0D7DE] dark:border-[#21262D]">
        <View className="flex-row items-center mb-4">
          <Sliders size={18} color="#FF6900" />
          <Text className="text-base font-bold text-gray-900 dark:text-white ml-2">
            Billing, Credit & Instalment Rules
          </Text>
        </View>

        <View className="flex-row justify-between items-center py-2.5 border-b border-[#D0D7DE] dark:border-[#21262D]">
          <View className="flex-1 mr-4">
            <Text className="text-sm font-semibold text-gray-900 dark:text-white">
              Allow Overpayment Credit
            </Text>
            <Text className="text-xs text-gray-500">
              Surplus payments automatically roll forward as credits for upcoming terms.
            </Text>
          </View>
          <Switch
            value={settings.allow_overpayment_credit}
            onValueChange={(v) => setSettings({ ...settings, allow_overpayment_credit: v })}
            trackColor={{ false: "#D1D5DB", true: "#10B981" }}
          />
        </View>

        <View className="flex-row justify-between items-center py-2.5 border-b border-[#D0D7DE] dark:border-[#21262D]">
          <View className="flex-1 mr-4">
            <Text className="text-sm font-semibold text-gray-900 dark:text-white">
              Allow Partial Payments
            </Text>
            <Text className="text-xs text-gray-500">
              Parents may make partial payments / instalments on applicable fee items.
            </Text>
          </View>
          <Switch
            value={settings.allow_partial_payments}
            onValueChange={(v) => setSettings({ ...settings, allow_partial_payments: v })}
            trackColor={{ false: "#D1D5DB", true: "#10B981" }}
          />
        </View>

        <View className="flex-row gap-4 mt-3">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Grace Period (Days)
            </Text>
            <TextInput
              value={String(settings.grace_period_days)}
              onChangeText={(t) =>
                setSettings({ ...settings, grace_period_days: Number(t.replace(/[^0-9]/g, "")) || 0 })
              }
              keyboardType="numeric"
              className="bg-white dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white font-mono"
            />
          </View>

          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Max Upload (MB)
            </Text>
            <TextInput
              value={String(settings.max_upload_size_mb)}
              onChangeText={(t) =>
                setSettings({ ...settings, max_upload_size_mb: Number(t.replace(/[^0-9]/g, "")) || 10 })
              }
              keyboardType="numeric"
              className="bg-white dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white font-mono"
            />
          </View>
        </View>
      </View>

      {/* SECTION 3: PAYMENT METHODS */}
      <View className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-3xl p-5 mb-5 border border-[#D0D7DE] dark:border-[#21262D]">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <CreditCard size={18} color="#FF6900" />
            <Text className="text-base font-bold text-gray-900 dark:text-white ml-2">
              Payment Methods ({paymentMethods.length})
            </Text>
          </View>
          <TouchableOpacity
            onPress={openCreateMethod}
            className="bg-[#FF6900] px-3 py-1.5 rounded-lg flex-row items-center"
          >
            <Plus size={14} color="#FFF" />
            <Text className="text-white font-bold text-xs ml-1 uppercase">Add Method</Text>
          </TouchableOpacity>
        </View>

        {paymentMethods.map((m) => (
          <View
            key={m.id}
            className="bg-white dark:bg-[#0F141C] p-3.5 rounded-xl mb-2.5 border border-[#D0D7DE] dark:border-[#21262D] flex-row justify-between items-center"
          >
            <View className="flex-1 mr-3">
              <View className="flex-row items-center">
                <Text className="text-sm font-bold text-gray-900 dark:text-white">{m.name}</Text>
                <View
                  className={`ml-2 px-1.5 py-0.5 rounded ${
                    m.is_active ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-gray-200 dark:bg-gray-800"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      m.is_active ? "text-emerald-700 dark:text-emerald-400" : "text-gray-500"
                    }`}
                  >
                    {m.is_active ? "Active" : "Disabled"}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-gray-400 font-mono mt-0.5">
                Code: {m.code} • Proof: {m.requires_proof ? "Required" : "Optional"} • Ref:{" "}
                {m.requires_reference ? "Required" : "Optional"}
              </Text>
              {m.instructions ? (
                <Text className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">
                  "{m.instructions}"
                </Text>
              ) : null}
            </View>

            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => openEditMethod(m)}
                className="bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg"
              >
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">Edit</Text>
              </TouchableOpacity>
              <Switch
                value={m.is_active}
                onValueChange={() => handleToggleMethodActive(m)}
                trackColor={{ false: "#D1D5DB", true: "#10B981" }}
              />
            </View>
          </View>
        ))}
      </View>

      {/* SECTION 4: FLAG REASONS */}
      <View className="bg-[#F6F8FA] dark:bg-[#161B22] rounded-3xl p-5 mb-12 border border-[#D0D7DE] dark:border-[#21262D]">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <Flag size={18} color="#EF4444" />
            <Text className="text-base font-bold text-gray-900 dark:text-white ml-2">
              Flag / Query Reasons ({flagReasons.length})
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setReasonModalVisible(true)}
            className="bg-[#EF4444] px-3 py-1.5 rounded-lg flex-row items-center"
          >
            <Plus size={14} color="#FFF" />
            <Text className="text-white font-bold text-xs ml-1 uppercase">Add Reason</Text>
          </TouchableOpacity>
        </View>

        {flagReasons.map((r) => (
          <View
            key={r.id}
            className="bg-white dark:bg-[#0F141C] p-3 rounded-xl mb-2 border border-[#D0D7DE] dark:border-[#21262D] flex-row justify-between items-center"
          >
            <View>
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">{r.label}</Text>
              <Text className="text-xs text-gray-400 font-mono">Code: {r.code}</Text>
            </View>
            {r.requires_note && (
              <View className="bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  Note Mandatory
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* METHOD MODAL */}
      <Modal visible={methodModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="w-full max-w-md bg-white dark:bg-[#161B22] rounded-3xl p-6 border border-[#D0D7DE] dark:border-[#21262D]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {editingMethod ? "Edit Payment Method" : "Add Payment Method"}
              </Text>
              <TouchableOpacity onPress={() => setMethodModalVisible(false)}>
                <X size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>

            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Method Name *</Text>
            <TextInput
              value={methodForm.name}
              onChangeText={(t) =>
                setMethodForm({
                  ...methodForm,
                  name: t,
                  code: editingMethod ? methodForm.code : t.toLowerCase().replace(/\s+/g, "_"),
                })
              }
              placeholder="e.g. M-Pesa Paybill or Bank Wire"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              className="bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white mb-3"
            />

            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Method Code *</Text>
            <TextInput
              value={methodForm.code}
              onChangeText={(t) => setMethodForm({ ...methodForm, code: t })}
              placeholder="e.g. mpesa or bank_wire"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              className="bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white mb-3 font-mono"
            />

            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Parent Instructions</Text>
            <TextInput
              value={methodForm.instructions}
              onChangeText={(t) => setMethodForm({ ...methodForm, instructions: t })}
              placeholder="e.g. Paybill 522123, Account: Admission Number"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              className="bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white mb-3"
              multiline
              numberOfLines={2}
            />

            <View className="flex-row justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
              <Text className="text-xs font-semibold text-gray-800 dark:text-gray-200">Requires Transaction Code?</Text>
              <Switch
                value={methodForm.requires_reference}
                onValueChange={(v) => setMethodForm({ ...methodForm, requires_reference: v })}
                trackColor={{ false: "#D1D5DB", true: "#10B981" }}
              />
            </View>

            <View className="flex-row justify-between items-center py-2 mb-4">
              <Text className="text-xs font-semibold text-gray-800 dark:text-gray-200">Requires Photo Proof?</Text>
              <Switch
                value={methodForm.requires_proof}
                onValueChange={(v) => setMethodForm({ ...methodForm, requires_proof: v })}
                trackColor={{ false: "#D1D5DB", true: "#10B981" }}
              />
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setMethodModalVisible(false)}
                className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 items-center"
              >
                <Text className="font-bold text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveMethod}
                className="flex-1 py-3 rounded-xl bg-[#10B981] items-center"
              >
                <Text className="font-bold text-white uppercase tracking-wider">Save Method</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FLAG REASON MODAL */}
      <Modal visible={reasonModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <View className="w-full max-w-md bg-white dark:bg-[#161B22] rounded-3xl p-6 border border-[#D0D7DE] dark:border-[#21262D]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">Add Flag Reason</Text>
              <TouchableOpacity onPress={() => setReasonModalVisible(false)}>
                <X size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
              </TouchableOpacity>
            </View>

            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Reason Label *</Text>
            <TextInput
              value={reasonForm.label}
              onChangeText={(t) =>
                setReasonForm({
                  ...reasonForm,
                  label: t,
                  code: reasonForm.code || t.toLowerCase().replace(/\s+/g, "_"),
                })
              }
              placeholder="e.g. Reference code not found on statement"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              className="bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white mb-3"
            />

            <Text className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Reason Code *</Text>
            <TextInput
              value={reasonForm.code}
              onChangeText={(t) => setReasonForm({ ...reasonForm, code: t })}
              placeholder="e.g. statement_unmatched"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              className="bg-[#F6F8FA] dark:bg-[#0F141C] p-3 rounded-xl border border-[#D0D7DE] dark:border-[#21262D] text-sm text-gray-900 dark:text-white mb-3 font-mono"
            />

            <View className="flex-row justify-between items-center py-2 mb-4">
              <Text className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                Requires Explanatory Admin Note?
              </Text>
              <Switch
                value={reasonForm.requires_note}
                onValueChange={(v) => setReasonForm({ ...reasonForm, requires_note: v })}
                trackColor={{ false: "#D1D5DB", true: "#10B981" }}
              />
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setReasonModalVisible(false)}
                className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 items-center"
              >
                <Text className="font-bold text-gray-700 dark:text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveFlagReason}
                className="flex-1 py-3 rounded-xl bg-[#EF4444] items-center"
              >
                <Text className="font-bold text-white uppercase tracking-wider">Add Reason</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default FinanceSettingsSection;