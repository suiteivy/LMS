import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/contexts/ThemeContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { FinanceService } from '@/services/FinanceService';
import { DatePicker } from '@/components/common/DatePicker';
import { supabase } from '@/libs/supabase';
import Toast from 'react-native-toast-message';

interface ChildOption {
  id: string;
  admission_number?: string | null;
  grade_level?: number | string | null;
  users?: {
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}

interface RecordPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  linkedStudents: ChildOption[];
  preselectedStudentId?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  linkedStudents,
  preselectedStudentId
}) => {
  const { isDark } = useTheme();
  const { formatAmount } = useCurrency();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isMultiChild, setIsMultiChild] = useState<boolean>(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Fee items fetched per student: studentId -> items[]
  const [payableItemsMap, setPayableItemsMap] = useState<Record<string, any[]>>({});
  const [loadingItems, setLoadingItems] = useState<boolean>(false);

  // Selected fee items per student: studentId -> { [feeId]: { selected: boolean, amount: string } }
  const [selectedFeesMap, setSelectedFeesMap] = useState<Record<string, Record<string, { selected: boolean; amount: string }>>>({});

  // Payment Details
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('mpesa');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [payerName, setPayerName] = useState<string>('');
  const [payerPhone, setPayerPhone] = useState<string>('');
  const [paidDate, setPaidDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>('');

  // Proof image upload
  const [proofImageUri, setProofImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      loadSettings();
      const initialStudent = preselectedStudentId || linkedStudents[0]?.id;
      if (initialStudent) {
        setSelectedStudentIds([initialStudent]);
        loadStudentFees(initialStudent);
      }
    } else {
      resetState();
    }
  }, [visible, preselectedStudentId]);

  const resetState = () => {
    setStep(1);
    setIsMultiChild(false);
    setSelectedStudentIds([]);
    setPayableItemsMap({});
    setSelectedFeesMap({});
    setReferenceNumber('');
    setNotes('');
    setProofImageUri(null);
  };

  const loadSettings = async () => {
    try {
      const data = await FinanceService.getFinanceSettings();
      if (data?.payment_methods?.length) {
        setPaymentMethods(data.payment_methods.filter((m: any) => m.is_active));
        const defaultMethod = data.payment_methods[0]?.code || 'mpesa';
        setSelectedMethod(defaultMethod);
      }
    } catch (e) {
      console.warn('Failed to load payment settings:', e);
    }
  };

  const loadStudentFees = async (studentId: string) => {
    if (payableItemsMap[studentId]) return;
    try {
      setLoadingItems(true);
      const items = await FinanceService.getChildPayableItems(studentId);
      setPayableItemsMap(prev => ({ ...prev, [studentId]: items }));

      // Auto-initialize selected fees with mandatory items selected
      const initFees: Record<string, { selected: boolean; amount: string }> = {};
      items.forEach((item: any) => {
        const bal = Number(item.outstanding_balance) || Number(item.total_amount) || 0;
        initFees[item.id] = {
          selected: item.is_mandatory && bal > 0,
          amount: bal > 0 ? String(bal) : '0'
        };
      });
      setSelectedFeesMap(prev => ({ ...prev, [studentId]: initFees }));
    } catch (e) {
      console.error('Error loading student fees:', e);
    } finally {
      setLoadingItems(false);
    }
  };

  const toggleStudentSelection = async (studentId: string) => {
    if (isMultiChild) {
      let updated: string[];
      if (selectedStudentIds.includes(studentId)) {
        if (selectedStudentIds.length === 1) return; // Keep at least one
        updated = selectedStudentIds.filter(id => id !== studentId);
      } else {
        updated = [...selectedStudentIds, studentId];
        await loadStudentFees(studentId);
      }
      setSelectedStudentIds(updated);
    } else {
      setSelectedStudentIds([studentId]);
      await loadStudentFees(studentId);
    }
  };

  const handleToggleFeeItem = (studentId: string, feeId: string, item: any) => {
    const studentFees = selectedFeesMap[studentId] || {};
    const current = studentFees[feeId] || { selected: false, amount: '0' };
    const nextSelected = !current.selected;
    const defaultAmount = nextSelected
      ? String(Number(item.outstanding_balance) || Number(item.total_amount) || 0)
      : '0';

    setSelectedFeesMap({
      ...selectedFeesMap,
      [studentId]: {
        ...studentFees,
        [feeId]: {
          selected: nextSelected,
          amount: defaultAmount
        }
      }
    });
  };

  const handleFeeAmountChange = (studentId: string, feeId: string, text: string) => {
    const studentFees = selectedFeesMap[studentId] || {};
    const current = studentFees[feeId] || { selected: true, amount: '0' };
    setSelectedFeesMap({
      ...selectedFeesMap,
      [studentId]: {
        ...studentFees,
        [feeId]: {
          ...current,
          amount: text
        }
      }
    });
  };

  // Compute Grand Total and Allocations
  const { grandTotal, allocationsList } = useMemo(() => {
    let total = 0;
    const allocations: Array<{ student_id: string; fee_type_id: string; amount: number; notes: string }> = [];

    selectedStudentIds.forEach(studentId => {
      const studentFees = selectedFeesMap[studentId] || {};
      const items = payableItemsMap[studentId] || [];

      items.forEach(item => {
        const feeConfig = studentFees[item.id];
        if (feeConfig?.selected) {
          const amt = Number(feeConfig.amount) || 0;
          if (amt > 0) {
            total += amt;
            allocations.push({
              student_id: studentId,
              fee_type_id: item.id,
              amount: amt,
              notes: item.name
            });
          }
        }
      });
    });

    return { grandTotal: total, allocationsList: allocations };
  }, [selectedStudentIds, selectedFeesMap, payableItemsMap]);

  // Image Picker & Upload
  const handlePickProof = async (useCamera = false) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Please allow camera/photo access to attach your payment receipt proof.');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setProofImageUri(result.assets[0].uri);
      }
    } catch (e: any) {
      console.error('Pick proof error:', e);
      Alert.alert('Error', 'Unable to pick photo. Please try again.');
    }
  };

  const uploadProofImage = async (uri: string): Promise<string> => {
    try {
      setUploadingImage(true);
      const filename = `proof_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `receipts/${filename}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;
      return filePath;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (grandTotal <= 0) {
      Alert.alert('Amount Required', 'Please select at least one fee item with an amount greater than zero.');
      return;
    }

    if (!referenceNumber.trim()) {
      Alert.alert('Reference Required', 'Please enter your transaction or reference code (e.g. M-Pesa code or bank slip number).');
      return;
    }

    try {
      setSubmitting(true);
      let uploadedPath: string | null = null;
      if (proofImageUri) {
        uploadedPath = await uploadProofImage(proofImageUri);
      }

      const idempotencyKey = `pay_${Date.now()}_${referenceNumber.trim().toUpperCase()}`;

      await FinanceService.recordParentPayment({
        student_id: selectedStudentIds[0],
        total_amount: grandTotal,
        payment_method: selectedMethod,
        reference_number: referenceNumber.trim().toUpperCase(),
        payer_name: payerName.trim() || undefined,
        payer_phone: payerPhone.trim() || undefined,
        paid_date: paidDate,
        proof_urls: uploadedPath ? [uploadedPath] : [],
        allocations: allocationsList,
        idempotency_key: idempotencyKey
      });

      Toast.show({
        type: 'success',
        text1: 'Payment Recorded!',
        text2: 'Your payment submission was received and is awaiting verification.'
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Submit payment error:', err);
      Alert.alert('Submission Error', err?.response?.data?.error || err.message || 'Failed to submit payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const getChildName = (child?: ChildOption) => {
    if (!child) return 'Student';
    return child.users?.full_name || `${child.users?.first_name || ''} ${child.users?.last_name || ''}`.trim() || 'Student';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/60 justify-end">
        <View className="bg-white dark:bg-[#161B22] rounded-t-[32px] max-h-[92%] flex-col border-t border-gray-100 dark:border-gray-800">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <View>
              <Text className="text-gray-900 dark:text-white font-extrabold text-lg">Record a Payment</Text>
              <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                {step === 1 ? 'Step 1: Select child & fee breakdown' : 'Step 2: Enter payment details & proof'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center">
              <Ionicons name="close" size={18} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
            {step === 1 && (
              <View>
                {/* Child Selector */}
                {linkedStudents.length > 1 && (
                  <View className="mb-5">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                        Who are you paying for?
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          const nextMulti = !isMultiChild;
                          setIsMultiChild(nextMulti);
                          if (!nextMulti && selectedStudentIds.length > 1) {
                            setSelectedStudentIds([selectedStudentIds[0]]);
                          }
                        }}
                        className="flex-row items-center"
                      >
                        <Text className="text-[#FF6900] text-xs font-bold mr-1">
                          {isMultiChild ? 'Pay for 1 child only' : 'Pay for multiple children'}
                        </Text>
                        <Ionicons name={isMultiChild ? 'person' : 'people'} size={14} color="#FF6900" />
                      </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                      {linkedStudents.map(child => {
                        const isSelected = selectedStudentIds.includes(child.id);
                        return (
                          <TouchableOpacity
                            key={child.id}
                            onPress={() => toggleStudentSelection(child.id)}
                            className={`mr-2.5 px-4 py-2.5 rounded-2xl border flex-row items-center ${
                              isSelected
                                ? 'bg-[#FF6900] border-[#FF6900]'
                                : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                            }`}
                          >
                            <Ionicons
                              name={isSelected ? 'checkbox' : 'square-outline'}
                              size={16}
                              color={isSelected ? '#fff' : (isDark ? '#9ca3af' : '#6b7280')}
                              style={{ marginRight: 6 }}
                            />
                            <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                              {getChildName(child)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Loading indicator */}
                {loadingItems ? (
                  <View className="py-12 items-center justify-center">
                    <ActivityIndicator size="large" color="#FF6900" />
                    <Text className="text-gray-400 dark:text-gray-500 text-xs mt-3">Loading applicable fee items...</Text>
                  </View>
                ) : (
                  <View>
                    {selectedStudentIds.map(studentId => {
                      const child = linkedStudents.find(s => s.id === studentId);
                      const items = payableItemsMap[studentId] || [];
                      const studentFees = selectedFeesMap[studentId] || {};

                      return (
                        <View key={studentId} className="mb-6 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                          {selectedStudentIds.length > 1 && (
                            <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-gray-800">
                              <Text className="text-gray-900 dark:text-white font-black text-sm">
                                {getChildName(child)}
                              </Text>
                              <Text className="text-gray-400 text-xs">
                                Adm: {child?.admission_number || 'N/A'}
                              </Text>
                            </View>
                          )}

                          <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                            Select items to pay
                          </Text>

                          {items.length === 0 ? (
                            <Text className="text-gray-400 text-xs py-2 italic">No outstanding fee items found for this student.</Text>
                          ) : (
                            items.map(item => {
                              const feeConfig = studentFees[item.id] || { selected: false, amount: '0' };
                              return (
                                <View
                                  key={item.id}
                                  className={`p-3 rounded-xl mb-2.5 border ${
                                    feeConfig.selected
                                      ? 'bg-white dark:bg-[#161B22] border-[#FF6900]'
                                      : 'bg-white/60 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800'
                                  }`}
                                >
                                  <TouchableOpacity
                                    onPress={() => handleToggleFeeItem(studentId, item.id, item)}
                                    className="flex-row items-start justify-between"
                                  >
                                    <View className="flex-row items-start flex-1 mr-3">
                                      <Ionicons
                                        name={feeConfig.selected ? 'checkbox' : 'square-outline'}
                                        size={20}
                                        color={feeConfig.selected ? '#FF6900' : '#9ca3af'}
                                        style={{ marginTop: 2, marginRight: 8 }}
                                      />
                                      <View className="flex-1">
                                        <View className="flex-row items-center gap-1.5 flex-wrap">
                                          <Text className="text-gray-900 dark:text-white font-bold text-sm">
                                            {item.name}
                                          </Text>
                                          {item.is_mandatory ? (
                                            <View className="bg-amber-100 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                                              <Text className="text-[9px] font-extrabold text-amber-800 dark:text-amber-300 uppercase">Mandatory</Text>
                                            </View>
                                          ) : (
                                            <View className="bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                                              <Text className="text-[9px] font-extrabold text-blue-800 dark:text-blue-300 uppercase">Optional</Text>
                                            </View>
                                          )}
                                        </View>
                                        <Text className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                                          Outstanding: {formatAmount(item.outstanding_balance)}
                                        </Text>
                                      </View>
                                    </View>

                                    <Text className="text-gray-900 dark:text-white font-extrabold text-sm">
                                      {formatAmount(item.total_amount)}
                                    </Text>
                                  </TouchableOpacity>

                                  {feeConfig.selected && (
                                    <View className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800 flex-row items-center justify-between">
                                      <Text className="text-gray-500 dark:text-gray-400 text-xs font-medium">
                                        Paying:
                                      </Text>
                                      <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 w-36">
                                        <Text className="text-gray-400 text-xs mr-1 font-bold">KES</Text>
                                        <TextInput
                                          value={feeConfig.amount}
                                          onChangeText={val => handleFeeAmountChange(studentId, item.id, val)}
                                          keyboardType="numeric"
                                          className="flex-1 text-right text-gray-900 dark:text-white text-xs font-extrabold p-0"
                                          placeholder="0"
                                          placeholderTextColor="#9ca3af"
                                        />
                                      </View>
                                    </View>
                                  )}
                                </View>
                              );
                            })
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {step === 2 && (
              <View>
                {/* Payment Method Selector */}
                <Text className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Select Payment Method
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {paymentMethods.map(method => {
                    const isSelected = selectedMethod === method.code;
                    return (
                      <TouchableOpacity
                        key={method.id}
                        onPress={() => setSelectedMethod(method.code)}
                        className={`px-4 py-2.5 rounded-xl border flex-row items-center ${
                          isSelected
                            ? 'bg-[#FF6900] border-[#FF6900]'
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                        }`}
                      >
                        <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                          {method.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Reference Number */}
                <View className="mb-4">
                  <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold mb-1.5">
                    Transaction / Reference Code *
                  </Text>
                  <TextInput
                    value={referenceNumber}
                    onChangeText={setReferenceNumber}
                    placeholder="e.g. M-Pesa Code (QKB7492H10) or Bank Slip No"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="characters"
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white"
                  />
                  <Text className="text-gray-400 text-[10px] mt-1">
                    For M-Pesa, this is the 10-character code in your confirmation SMS.
                  </Text>
                </View>

                {/* Payer Name and Phone */}
                <View className="flex-row gap-3 mb-4">
                  <View className="flex-1">
                    <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold mb-1.5">Payer Name</Text>
                    <TextInput
                      value={payerName}
                      onChangeText={setPayerName}
                      placeholder="Your full name"
                      placeholderTextColor="#9ca3af"
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-900 dark:text-white"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold mb-1.5">Payer Phone</Text>
                    <TextInput
                      value={payerPhone}
                      onChangeText={setPayerPhone}
                      placeholder="07..."
                      keyboardType="phone-pad"
                      placeholderTextColor="#9ca3af"
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-900 dark:text-white"
                    />
                  </View>
                </View>

                {/* Proof Attachment */}
                <View className="mb-4">
                  <Text className="text-gray-700 dark:text-gray-300 text-xs font-bold mb-1.5">
                    Attach Receipt / Payment Proof
                  </Text>
                  {proofImageUri ? (
                    <View className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 h-44 mb-2">
                      <Image source={{ uri: proofImageUri }} className="w-full h-full" resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => setProofImageUri(null)}
                        className="absolute top-2 right-2 bg-black/70 w-8 h-8 rounded-full items-center justify-center"
                      >
                        <Ionicons name="trash" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() => handlePickProof(true)}
                        className="flex-1 bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-4 items-center justify-center"
                      >
                        <Ionicons name="camera" size={24} color="#FF6900" />
                        <Text className="text-gray-700 dark:text-gray-200 text-xs font-bold mt-1">Take Photo</Text>
                        <Text className="text-gray-400 text-[10px]">Camera capture</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handlePickProof(false)}
                        className="flex-1 bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-4 items-center justify-center"
                      >
                        <Ionicons name="image" size={24} color="#FF6900" />
                        <Text className="text-gray-700 dark:text-gray-200 text-xs font-bold mt-1">Upload Photo</Text>
                        <Text className="text-gray-400 text-[10px]">From gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Summary Box */}
                <View className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-2xl border border-orange-200 dark:border-orange-900/40 mb-4">
                  <Text className="text-orange-900 dark:text-orange-200 font-extrabold text-xs mb-1">
                    What happens next?
                  </Text>
                  <Text className="text-orange-800 dark:text-orange-300/80 text-[11px] leading-relaxed">
                    Once submitted, your payment will be marked <Text className="font-bold">Awaiting confirmation</Text>. The school accounts office will verify the transaction code and issue an official sequential receipt immediately.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Sticky Bottom Total & Action Bar */}
          <View className="p-4 px-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#161B22] flex-row items-center justify-between">
            <View>
              <Text className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Payment</Text>
              <Text className="text-gray-900 dark:text-white font-black text-xl">
                {formatAmount(grandTotal)}
              </Text>
            </View>

            <View className="flex-row gap-2">
              {step === 2 && (
                <TouchableOpacity
                  onPress={() => setStep(1)}
                  disabled={submitting}
                  className="px-4 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800"
                >
                  <Text className="text-gray-700 dark:text-gray-200 font-bold text-xs">Back</Text>
                </TouchableOpacity>
              )}

              {step === 1 ? (
                <TouchableOpacity
                  onPress={() => {
                    if (grandTotal <= 0) {
                      Alert.alert('Selection Required', 'Please select at least one fee item to pay.');
                      return;
                    }
                    setStep(2);
                  }}
                  className="px-6 py-3 rounded-2xl bg-[#FF6900] flex-row items-center"
                >
                  <Text className="text-white font-extrabold text-xs mr-1">Next: Details</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleSubmitPayment}
                  disabled={submitting || uploadingImage}
                  className="px-6 py-3 rounded-2xl bg-[#FF6900] flex-row items-center"
                >
                  {submitting || uploadingImage ? (
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                  ) : null}
                  <Text className="text-white font-extrabold text-xs">
                    {submitting ? 'Submitting...' : 'Confirm & Submit'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
