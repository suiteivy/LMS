import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Payment } from "@/types/types";

interface PaymentManagementSectionProps {
  payments: Payment[];
  loading: boolean;
  onPaymentSubmit: (payment: Omit<Payment, "id">) => void;
  onRefresh?: () => void;
}

export const PaymentManagementSection: React.FC<
  PaymentManagementSectionProps
> = ({ payments, loading, onPaymentSubmit, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    student_id: "",
    student_name: "",
    amount: "",
    payment_method: "cash" as Payment["payment_method"],
    reference_number: "",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      student_id: "",
      student_name: "",
      amount: "",
      payment_method: "cash",
      reference_number: "",
      notes: "",
    });
  };

  const handleSubmit = () => {
    if (!formData.student_name || !formData.amount) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const payment: Omit<Payment, "id"> = {
      ...formData,
      amount: parseFloat(formData.amount),
      payment_date: new Date().toISOString(),
      status: "completed",
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
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <View
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#D0E8E6" }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold" style={{ color: "#2C3E50" }}>
          {item.student_name}
        </Text>
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
                  ? "#128C7E"
                  : item.status === "pending"
                    ? "#16A085"
                    : "#2C3E50",
            }}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View className="space-y-1">
        <Text className="text-2xl font-bold mb-2" style={{ color: "#1ABC9C" }}>
          {formatAmount(item.amount)}
        </Text>

        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600">Method:</Text>
          <Text className="text-sm font-medium text-gray-900 capitalize">
            {item.payment_method.replace("_", " ")}
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600">Date:</Text>
          <Text className="text-sm text-gray-900">
            {new Date(item.payment_date).toLocaleDateString()}
          </Text>
        </View>

        {item.reference_number && (
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">Reference:</Text>
            <Text className="text-sm text-gray-900">
              {item.reference_number}
            </Text>
          </View>
        )}

        {item.notes && (
          <View className="mt-2 p-2 bg-gray-50 rounded">
            <Text className="text-sm text-gray-700">{item.notes}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View className="flex-1">
      <Text className="text-2xl font-bold text-gray-800">Student Payments Record</Text>
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Loading payments...</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Text className="text-gray-500 text-lg">
                No payments recorded yet
              </Text>
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                className="bg-teal-600 px-4 py-2 rounded-lg shadow-sm"
              >
                <Text className="text-white font-semibold">Record Payment</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Payment Form Modal */}
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
            <Text className="text-lg font-semibold">Record Payment</Text>
            <TouchableOpacity onPress={handleSubmit}>
              <Text className=" text-sm border border-[#10B981] px-3 py-2 rounded-full font-semibold">
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Student Name *
                </Text>
                <TextInput
                  value={formData.student_name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, student_name: text })
                  }
                  placeholder="Enter student name"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Amount (KES) *
                </Text>
                <TextInput
                  value={formData.amount}
                  onChangeText={(text) =>
                    setFormData({ ...formData, amount: text })
                  }
                  placeholder="0.00"
                  keyboardType="numeric"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </Text>
                <View className="border border-gray-300 rounded-lg bg-white">
                  <Picker
                    selectedValue={formData.payment_method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, payment_method: value })
                    }
                  >
                    <Picker.Item label="Cash" value="cash" />
                    <Picker.Item label="Bank Transfer" value="bank_transfer" />
                    <Picker.Item label="Mobile Money" value="mobile_money" />
                  </Picker>
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Reference Number
                </Text>
                <TextInput
                  value={formData.reference_number}
                  onChangeText={(text) =>
                    setFormData({ ...formData, reference_number: text })
                  }
                  placeholder="Transaction reference (optional)"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Notes
                </Text>
                <TextInput
                  value={formData.notes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, notes: text })
                  }
                  placeholder="Additional notes (optional)"
                  multiline
                  numberOfLines={3}
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};
