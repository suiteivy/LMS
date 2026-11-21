import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { FinanceService } from '@/services/FinanceService';
import { showSuccess, showError } from '@/utils/toast';

export interface ChooseOptionalFeesModalProps {
  visible: boolean;
  studentId: string;
  studentName: string;
  onClose: () => void;
  onSaved: () => void;
}

export const ChooseOptionalFeesModal: React.FC<ChooseOptionalFeesModalProps> = ({
  visible,
  studentId,
  studentName,
  onClose,
  onSaved,
}) => {
  const { isDark } = useTheme();
  const { formatAmount } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [structureData, setStructureData] = useState<any | null>(null);

  // Form state: map of fee_type_id -> { selected: boolean, variant_id: string | null, quantity: number, opt_out_reason: string }
  const [selections, setSelections] = useState<
    Record<
      string,
      {
        selected: boolean;
        variant_id?: string | null;
        quantity: number;
        opt_out_reason?: string;
      }
    >
  >({});

  useEffect(() => {
    if (!visible || !studentId) return;

    let mounted = true;
    setLoading(true);

    FinanceService.getParentChildFeeStructure(studentId)
      .then((data) => {
        if (!mounted) return;
        setStructureData(data);

        // Pre-populate selections from existing_selections
        const initialMap: Record<string, any> = {};
        const optionalList = data.optional_items || [];
        const existingMap = new Map((data.existing_selections || []).map((s: any) => [s.fee_type_id, s]));

        optionalList.forEach((item: any) => {
          const existing: any = existingMap.get(item.id);
          if (existing) {
            initialMap[item.id] = {
              selected: existing.status === 'selected' || existing.status === 'approved',
              variant_id: existing.variant_id || (item.variants?.[0]?.id ?? null),
              quantity: existing.quantity || 1,
              opt_out_reason: existing.opt_out_reason || '',
            };
          } else {
            initialMap[item.id] = {
              selected: !!item.optional_default,
              variant_id: item.variants?.[0]?.id ?? null,
              quantity: 1,
              opt_out_reason: '',
            };
          }
        });

        setSelections(initialMap);
      })
      .catch((err) => {
        console.error('Failed to load child fee structure:', err);
        showError('Error', 'Unable to load fee options.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [visible, studentId]);

  const toggleSelect = (feeTypeId: string) => {
    setSelections((prev) => {
      const current = prev[feeTypeId] || { selected: false, quantity: 1 };
      return {
        ...prev,
        [feeTypeId]: {
          ...current,
          selected: !current.selected,
        },
      };
    });
  };

  const setVariant = (feeTypeId: string, variantId: string) => {
    setSelections((prev) => ({
      ...prev,
      [feeTypeId]: {
        ...(prev[feeTypeId] || { selected: true, quantity: 1 }),
        variant_id: variantId,
      },
    }));
  };

  const updateQuantity = (feeTypeId: string, delta: number, min = 1, max = 99) => {
    setSelections((prev) => {
      const current = prev[feeTypeId] || { selected: true, quantity: 1 };
      const nextQty = Math.max(min, Math.min(max, (current.quantity || 1) + delta));
      return {
        ...prev,
        [feeTypeId]: {
          ...current,
          quantity: nextQty,
        },
      };
    });
  };

  // Calculate live optional total
  const optionalTotal = React.useMemo(() => {
    if (!structureData?.optional_items) return 0;
    let sum = 0;
    structureData.optional_items.forEach((item: any) => {
      const sel = selections[item.id];
      if (sel && sel.selected) {
        let price = Number(item.amount || 0);
        if (item.variants && item.variants.length > 0) {
          const chosenVariant = item.variants.find((v: any) => v.id === sel.variant_id) || item.variants[0];
          if (chosenVariant) price = Number(chosenVariant.amount || chosenVariant.price || price);
        }
        sum += price * (sel.quantity || 1);
      }
    });
    return sum;
  }, [structureData, selections]);

  const mandatoryTotal = Number(structureData?.total_mandatory || 0);
  const grandTotal = mandatoryTotal + optionalTotal;

  const handleSave = async () => {
    if (!structureData?.optional_items) return;
    try {
      setSaving(true);
      const payload = structureData.optional_items.map((item: any) => {
        const sel = selections[item.id] || { selected: false, quantity: 1 };
        return {
          fee_type_id: item.id,
          variant_id: sel.variant_id || null,
          quantity: sel.quantity || 1,
          is_opt_out: !sel.selected,
          opt_out_reason: !sel.selected ? sel.opt_out_reason : undefined,
        };
      });

      await FinanceService.saveChildOptionalSelections(studentId, payload);
      showSuccess('Selections Saved', 'Optional fee choices have been updated successfully.');
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to save optional selections:', err);
      showError('Save Failed', err?.response?.data?.error || 'Unable to update selections.');
    } finally {
      setSaving(false);
    }
  };

  const bg = isDark ? '#161B22' : '#FFFFFF';
  const cardBg = isDark ? '#21262D' : '#F6F8FA';
  const border = isDark ? '#30363D' : '#E5E7EB';
  const textPrimary = isDark ? '#FFFFFF' : '#111827';
  const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: bg,
            width: '100%',
            maxWidth: 620,
            maxHeight: '90%',
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
              padding: 18,
              borderBottomWidth: 1,
              borderBottomColor: border,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: cardBg,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '800' }}>
                Choose Optional Fees
              </Text>
              <Text style={{ color: textSecondary, fontSize: 12, marginTop: 2 }}>
                For {studentName} · Customize transport, meals, and optional programs
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#FF6900" />
              <Text style={{ color: textSecondary, marginTop: 12, fontSize: 13 }}>
                Loading available fee options...
              </Text>
            </View>
          ) : (
            <ScrollView style={{ flex: 1, padding: 18 }} contentContainerStyle={{ gap: 16 }}>
              {/* Mandatory Summary Banner */}
              <View
                style={{
                  padding: 14,
                  backgroundColor: isDark ? '#1C2733' : '#EBF5FB',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDark ? '#2E4C6E' : '#AED6F1',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 13 }}>
                    Mandatory Tuition & Levies
                  </Text>
                  <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                    Standard required fees for this term
                  </Text>
                </View>
                <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 15 }}>
                  {formatAmount(mandatoryTotal)}
                </Text>
              </View>

              {/* Optional Items List */}
              <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>
                OPTIONAL FEE SERVICES
              </Text>

              {(!structureData?.optional_items || structureData.optional_items.length === 0) ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: textSecondary, fontSize: 13 }}>
                    No optional fee items are configured for this class level.
                  </Text>
                </View>
              ) : (
                structureData.optional_items.map((item: any) => {
                  const sel = selections[item.id] || { selected: false, quantity: 1 };
                  const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
                  const activeVariant = hasVariants
                    ? item.variants.find((v: any) => v.id === sel.variant_id) || item.variants[0]
                    : null;
                  const itemPrice = activeVariant
                    ? Number(activeVariant.amount || activeVariant.price || item.amount || 0)
                    : Number(item.amount || 0);

                  return (
                    <View
                      key={item.id}
                      style={{
                        backgroundColor: cardBg,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: sel.selected ? '#FF6900' : border,
                        padding: 14,
                        gap: 12,
                      }}
                    >
                      {/* Title & Checkbox */}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <TouchableOpacity
                          onPress={() => toggleSelect(item.id)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
                        >
                          <Ionicons
                            name={sel.selected ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={sel.selected ? '#FF6900' : textSecondary}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 14 }}>
                              {item.name}
                            </Text>
                            <Text style={{ color: textSecondary, fontSize: 11, marginTop: 2 }}>
                              {item.category?.toUpperCase() || 'OPTIONAL'} · {item.description || 'Optional school service'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 15 }}>
                          {formatAmount(itemPrice * (sel.quantity || 1))}
                        </Text>
                      </View>

                      {/* Variant Selection if available */}
                      {sel.selected && hasVariants && (
                        <View style={{ gap: 6, paddingTop: 4 }}>
                          <Text style={{ color: textSecondary, fontSize: 11, fontWeight: '700' }}>
                            Choose Plan / Route Option:
                          </Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {item.variants.map((v: any) => {
                              const isVarSelected = (sel.variant_id || item.variants[0].id) === v.id;
                              return (
                                <TouchableOpacity
                                  key={v.id}
                                  onPress={() => setVariant(item.id, v.id)}
                                  style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: isVarSelected ? '#FF6900' : border,
                                    backgroundColor: isVarSelected ? (isDark ? 'rgba(255,105,0,0.2)' : '#FFF0E5') : bg,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: '700',
                                      color: isVarSelected ? '#FF6900' : textPrimary,
                                    }}
                                  >
                                    {v.name} ({formatAmount(v.amount || v.price)})
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {/* Quantity Stepper if enabled */}
                      {sel.selected && item.allows_quantity && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: 6,
                          }}
                        >
                          <Text style={{ color: textSecondary, fontSize: 12 }}>
                            Quantity ({item.unit_label || 'units'}):
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                              onPress={() => updateQuantity(item.id, -1, item.min_quantity || 1, item.max_quantity || 10)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: bg,
                                borderWidth: 1,
                                borderColor: border,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Ionicons name="remove" size={16} color={textPrimary} />
                            </TouchableOpacity>
                            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 14, width: 24, textAlign: 'center' }}>
                              {sel.quantity || 1}
                            </Text>
                            <TouchableOpacity
                              onPress={() => updateQuantity(item.id, 1, item.min_quantity || 1, item.max_quantity || 10)}
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                backgroundColor: bg,
                                borderWidth: 1,
                                borderColor: border,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Ionicons name="add" size={16} color={textPrimary} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Opt-out reason input if deselected */}
                      {!sel.selected && (
                        <View style={{ paddingTop: 2 }}>
                          <TextInput
                            value={sel.opt_out_reason || ''}
                            onChangeText={(text) =>
                              setSelections((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...(prev[item.id] || { selected: false, quantity: 1 }),
                                  opt_out_reason: text,
                                },
                              }))
                            }
                            placeholder="Optional reason for declining (e.g. self-transport, home lunch)"
                            placeholderTextColor={textSecondary}
                            style={{
                              fontSize: 11,
                              color: textPrimary,
                              borderWidth: 1,
                              borderColor: border,
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              backgroundColor: bg,
                            }}
                          />
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Footer with Live Totals & Save */}
          <View
            style={{
              padding: 16,
              backgroundColor: cardBg,
              borderTopWidth: 1,
              borderTopColor: border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ color: textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                ESTIMATED TERM TOTAL
              </Text>
              <Text style={{ color: '#FF6900', fontSize: 18, fontWeight: '900' }}>
                {formatAmount(grandTotal)}
              </Text>
              <Text style={{ color: textSecondary, fontSize: 10 }}>
                Mandatory {formatAmount(mandatoryTotal)} + Optional {formatAmount(optionalTotal)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: border,
                }}
              >
                <Text style={{ color: textSecondary, fontSize: 13, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: '#FF6900',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                    Save Selections
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
