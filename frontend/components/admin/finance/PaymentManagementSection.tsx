import { EmptyState } from "@/components/common/EmptyState";
import { useTheme } from "@/contexts/ThemeContext";
import { Payment } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { Receipt } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Toast from 'react-native-toast-message';

interface PaymentManagementSectionProps {
  payments: Payment[];
  loading: boolean;
  onPaymentSubmit: (payment: Omit<Payment, "id">) => void;
  onRefresh?: () => void;
}

const PaymentManagementSection: React.FC<
  PaymentManagementSectionProps
> = ({ payments, loading, onPaymentSubmit, onRefresh }) => {
  const { isDark } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    payment_method: "cash" as Payment["payment_method"],
    reference_number: "",
    notes: "",
  });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPayments = payments.filter((p) =>
    p.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.student_display_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.reference_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      student_id: "",
      amount: "",
      payment_method: "cash" as Payment["payment_method"],
      reference_number: "",
      notes: "",
    });
  };

  const handleSubmit = () => {
    console.log("Submitting payment:", formData);
    if (!formData.student_id || !formData.payment_method || !formData.amount) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all required fields including Student ID',
        position: 'top',
      });
      Alert.alert("Error", "Please fill in all required fields including Student ID");
      return;
    }

    const payment: Omit<Payment, "id"> = {
      amount: parseFloat(formData.amount),
      payment_date: new Date().toISOString(),
      status: "completed",
      student_id: formData.student_id,
      student_name: " ", // Set to empty string or fetch if available
      payment_method: formData.payment_method,
      reference_number: formData.reference_number,
      notes: formData.notes,
    };

    onPaymentSubmit(payment);
    resetForm();
    setShowForm(false);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  const getStatusColor = (status: Payment["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400";
      case "failed":
        return "bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-400";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200";
    }
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <View
      className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-800"
      style={{ backgroundColor: isDark ? "#1a1a1a" : "#FFFFFF", borderColor: isDark ? "#333" : "#D0E8E6" }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View>
          <Text className="text-lg font-semibold text-black" style={{ color: isDark ? "#fff" : "#2C3E50" }}>
            {item.student_name}
          </Text>
          {item.student_display_id && (
            <Text className="text-xs text-[#FF6B00] font-medium">
              ID: {item.student_display_id}
            </Text>
          )}
        </View>
        <View
          className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}
          style={{
            backgroundColor:
              item.status === "completed"
                ? "#A1EBE5"
                : item.status === "pending"
                  ? "#F1FFF8"
                  : "#FFFFFF",
          }}
        >
          <Text
            className="text-xs font-medium capitalize"
            style={{
              color:
                item.status === "completed"
                  ? (isDark ? "#2DD4BF" : "#128C7E")
                  : item.status === "pending"
                    ? (isDark ? "#4FD1C5" : "#16A085")
                    : (isDark ? "#fff" : "#2C3E50"),
            }}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View className="space-y-1">
        <Text className="text-2xl font-bold mb-2" style={{ color: "#FF6B00" }}>
          {formatAmount(item.amount)}
        </Text>
        
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600 dark:text-gray-400">Method:</Text>
          <Text className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
            {item.payment_method ? item.payment_method.replace("_", " ") : ""}
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600 dark:text-gray-400">Date:</Text>
          <Text className="text-sm text-gray-900 dark:text-gray-200">
            {new Date(item.payment_date).toLocaleDateString()}
          </Text>
        </View>

        {item.reference_number && (
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600 dark:text-gray-400">Reference:</Text>
            <Text className="text-sm text-gray-900 dark:text-gray-200">
              {item.reference_number}
            </Text>
          </View>
        )}

        {item.notes && (
          <View className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded">
            <Text className="text-sm text-gray-700 dark:text-gray-300">{item.notes}</Text>
          </View>
        )}
      </View>
    </View >
  );

  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-2xl font-bold text-gray-800 dark:text-white">Student Payments</Text>
        <TouchableOpacity
          onPress={() => setShowForm(true)}
          className="bg-black dark:shadow-md dark:shadow-white/10 dark:bg-orange-500 px-4 py-2 rounded-lg"
        >
          <Text className="text-white dark:text-white font-medium">Record Payment</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 mb-6">
        <Ionicons name="search" size={20} color={isDark ? "#9CA3AF" : "#6B7280"} />
        <TextInput
          className="flex-1 ml-2 text-gray-900 dark:text-white font-medium"
          placeholder="Search by student name, ID or reference..."
          placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500 dark:text-gray-400">Loading payments...</Text>
        </View>
      ) : (
        <View className="pb-20">
          {filteredPayments.length > 0 ? (
            filteredPayments.map((item) => (
              <View key={item.id}>
                {renderPaymentItem({ item })}
              </View>
            ))
          ) : (
            <EmptyState
              title={searchQuery ? "No matching payments" : "No payments recorded"}
              message={searchQuery
                ? `We couldn't find any payments matching "${searchQuery}"`
                : "No payments have been recorded in the system yet."
              }
              icon={Receipt}
              color="#FF6B00"
              actionLabel={searchQuery ? "Clear Search" : "Record Payment"}
              onAction={() => searchQuery ? setSearchQuery("") : setShowForm(true)}
            />
          )}
        </View>
      )}

      {/* Payment Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white dark:bg-[#121212]">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text className="text-blue-600 dark:text-blue-400 text-lg">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">Record Payment</Text>
            <TouchableOpacity onPress={handleSubmit}>
              <Text className=" text-sm border border-[#10B981] dark:border-green-500 px-3 py-2 rounded-full font-semibold text-[#10B981] dark:text-green-500">
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Student ID (STU-...) *
                </Text>
                <TextInput
                  value={formData.student_id}
                  onChangeText={(text) =>
                    setFormData({ ...formData, student_id: text })
                  }
                  placeholder="e.g. STU-2026-000001"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a]"
                />
              </View>
{/* 
                <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Student Name *
                </Text>
                <TextInput
                  value={formData.student_name}
                  onChangeText={(text) =>
                  setFormData({ ...formData, student_name: text })
                  }
                  placeholder="Enter student name"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a]"
                  editable={false}
                />
                </View> */}

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (KES) *
                </Text>
                <TextInput
                  value={formData.amount}
                  onChangeText={(text) =>
                    setFormData({ ...formData, amount: text })
                  }
                  placeholder="0.00"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  keyboardType="numeric"
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a]"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </Text>
                <View className="border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#1a1a1a]">
                  <Picker
                    selectedValue={formData.payment_method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, payment_method: value })
                    }
                    dropdownIconColor={isDark ? "#fff" : "#000"}
                    style={{ color: isDark ? "#fff" : "#000" }}
                  >
                    <Picker.Item label="Please select a payment method" value="" color={isDark ? "#fff" : "#000"} />
                    <Picker.Item label="Cash" value="cash" color={isDark ? "#fff" : "#000"} />
                    <Picker.Item label="Bank Transfer" value="bank_transfer" color={isDark ? "#fff" : "#000"} />
                    <Picker.Item label="Mobile Money" value="mobile_money" color={isDark ? "#fff" : "#000"} />
                  </Picker>
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reference Number
                </Text>
                <TextInput
                  value={formData.reference_number}
                  onChangeText={(text) =>
                    setFormData({ ...formData, reference_number: text })
                  }
                  placeholder="Transaction reference (optional)"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a]"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </Text>
                <TextInput
                  value={formData.notes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, notes: text })
                  }
                  placeholder="Additional notes (optional)"
                  placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
                  multiline
                  numberOfLines={3}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-3 text-base text-gray-900 dark:text-white bg-white dark:bg-[#1a1a1a]"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal >
    </View >
  );
};


export { PaymentManagementSection };
export default PaymentManagementSection;
