import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { TeacherPayout } from '.';

interface TeacherPayoutSectionProps {
  payouts: TeacherPayout[];
  loading: boolean;
  onPayoutProcess: (payoutId: string) => void;
  onRefresh?: () => void;
}

export const TeacherPayoutSection: React.FC<TeacherPayoutSectionProps> = ({
  payouts,
  loading,
  onPayoutProcess,
  onRefresh,
}) => {
  const [selectedPayout, setSelectedPayout] = useState<TeacherPayout | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const getStatusColor = (status: TeacherPayout['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePayoutAction = (payout: TeacherPayout) => {
    if (payout.status === 'pending') {
      Alert.alert(
        'Process Payout',
        `Process payout of ${formatAmount(payout.amount)} for ${payout.teacher_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Process',
            onPress: () => onPayoutProcess(payout.id),
          },
        ]
      );
    } else {
      setSelectedPayout(payout);
      setShowDetails(true);
    }
  };

  const calculateTotalPending = () => {
    return payouts
      .filter(payout => payout.status === 'pending')
      .reduce((total, payout) => total + payout.amount, 0);
  };

  const renderPayoutItem = ({ item }: { item: TeacherPayout }) => (
    <TouchableOpacity
      onPress={() => handlePayoutAction(item)}
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100"
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-900">
          {item.teacher_name}
        </Text>
        <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
          <Text className="text-xs font-medium capitalize">{item.status}</Text>
        </View>
      </View>
      
      <View className="space-y-2">
        <Text className="text-2xl font-bold text-blue-600 mb-2">
          {formatAmount(item.amount)}
        </Text>
        
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600">Hours Taught:</Text>
          <Text className="text-sm font-medium text-gray-900">
            {item.hours_taught} hrs
          </Text>
        </View>
        
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600">Rate:</Text>
          <Text className="text-sm text-gray-900">
            {formatAmount(item.rate_per_hour)}/hr
          </Text>
        </View>
        
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600">Period:</Text>
          <Text className="text-sm text-gray-900">
            {new Date(item.period_start).toLocaleDateString()} - {' '}
            {new Date(item.period_end).toLocaleDateString()}
          </Text>
        </View>
        
        {item.payment_date && (
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600">Paid On:</Text>
            <Text className="text-sm text-gray-900">
              {new Date(item.payment_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {item.status === 'pending' && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          <Text className="text-blue-600 text-sm font-medium text-center">
            Tap to process payout
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const totalPending = calculateTotalPending();

  return (
    <View className="flex-1">
      <View className="mb-4">
        {/* Summary Cards */}
        <View className="flex-row space-x-3 mb-4">
          <View className="flex-1 rounded-lg p-4" style={{ backgroundColor: '#F1FFF8' }}>
            <Text className="text-sm font-medium" style={{ color: '#128C7E' }}>Total Pending</Text>
            <Text className="text-2xl font-bold" style={{ color: '#16A085' }}>
              {formatAmount(totalPending)}
            </Text>
            <Text className="text-sm" style={{ color: '#128C7E' }}>
              {pendingPayouts.length} teacher{pendingPayouts.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <View className="flex-1 rounded-lg p-4" style={{ backgroundColor: '#A1EBE5' }}>
            <Text className="text-sm font-medium" style={{ color: '#128C7E' }}>This Month</Text>
            <Text className="text-2xl font-bold" style={{ color: '#16A085' }}>
              {payouts.filter(p => p.status === 'paid').length}
            </Text>
            <Text className="text-sm" style={{ color: '#128C7E' }}>Payouts processed</Text>
          </View>
        </View>

        {/* Bulk Actions */}
        {pendingPayouts.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Bulk Process',
                `Process all ${pendingPayouts.length} pending payouts totaling ${formatAmount(totalPending)}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Process All',
                    onPress: () => {
                      pendingPayouts.forEach(payout => onPayoutProcess(payout.id));
                    },
                  },
                ]
              );
            }}
            className="px-4 py-3 rounded-lg mb-4 shadow-sm"
            style={{ backgroundColor: '#1ABC9C' }}
          >
            <Text className="text-white font-semibold text-center">
              Process All Pending Payouts ({formatAmount(totalPending)})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500">Loading payouts...</Text>
        </View>
      ) : (
        <FlatList
          data={payouts}
          renderItem={renderPayoutItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Text className="text-gray-500 text-lg">No payouts found</Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Teacher payouts will appear here when hours are logged
              </Text>
            </View>
          }
        />
      )}

      {/* Payout Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Text className="text-blue-600 text-lg">Close</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold">Payout Details</Text>
            <View className="w-12" />
          </View>

          {selectedPayout && (
            <ScrollView className="flex-1 p-4">
              <View className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <Text className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedPayout.teacher_name}
                </Text>
                
                <View className={`px-3 py-1 rounded-full mb-4 self-start ${getStatusColor(selectedPayout.status)}`}>
                  <Text className="font-medium capitalize">{selectedPayout.status}</Text>
                </View>

                <View className="space-y-3">
                  <View className="flex-row justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-600">Amount</Text>
                    <Text className="text-xl font-bold text-blue-600">
                      {formatAmount(selectedPayout.amount)}
                    </Text>
                  </View>

                  <View className="flex-row justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-600">Hours Taught</Text>
                    <Text className="font-medium">{selectedPayout.hours_taught} hours</Text>
                  </View>

                  <View className="flex-row justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-600">Hourly Rate</Text>
                    <Text className="font-medium">{formatAmount(selectedPayout.rate_per_hour)}</Text>
                  </View>

                  <View className="flex-row justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-600">Period Start</Text>
                    <Text className="font-medium">
                      {new Date(selectedPayout.period_start).toLocaleDateString()}
                    </Text>
                  </View>

                  <View className="flex-row justify-between py-2 border-b border-gray-100">
                    <Text className="text-gray-600">Period End</Text>
                    <Text className="font-medium">
                      {new Date(selectedPayout.period_end).toLocaleDateString()}
                    </Text>
                  </View>

                  {selectedPayout.payment_date && (
                    <View className="flex-row justify-between py-2 border-b border-gray-100">
                      <Text className="text-gray-600">Payment Date</Text>
                      <Text className="font-medium">
                        {new Date(selectedPayout.payment_date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                {selectedPayout.status === 'pending' && (
                  <TouchableOpacity
                    onPress={() => {
                      onPayoutProcess(selectedPayout.id);
                      setShowDetails(false);
                    }}
                    className="bg-blue-600 px-4 py-3 rounded-lg mt-6"
                  >
                    <Text className="text-white font-semibold text-center">
                      Process Payout
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
};