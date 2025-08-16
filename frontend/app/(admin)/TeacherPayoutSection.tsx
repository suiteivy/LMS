import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';

// Define the TeacherPayout interface
interface TeacherPayout {
  id: string;
  teacher_name: string;
  amount: number;
  hours_taught: number;
  rate_per_hour: number;
  period_start: string;
  period_end: string;
  status: 'pending' | 'processing' | 'paid';
  payment_date?: string;
}

interface TeacherPayoutSectionProps {
  payouts?: TeacherPayout[];
  loading?: boolean;
  onPayoutProcess: (payoutId: string) => void;
  onRefresh?: () => void;
}

// Mock/Placeholder data for testing
const PLACEHOLDER_PAYOUTS: TeacherPayout[] = [
  {
    id: '1',
    teacher_name: 'Sarah Johnson',
    amount: 25000,
    hours_taught: 40,
    rate_per_hour: 625,
    period_start: '2024-07-01',
    period_end: '2024-07-31',
    status: 'pending',
  },
  {
    id: '2',
    teacher_name: 'Michael Chen',
    amount: 30000,
    hours_taught: 48,
    rate_per_hour: 625,
    period_start: '2024-07-01',
    period_end: '2024-07-31',
    status: 'processing',
  },
  {
    id: '3',
    teacher_name: 'Emma Davis',
    amount: 18750,
    hours_taught: 30,
    rate_per_hour: 625,
    period_start: '2024-06-01',
    period_end: '2024-06-30',
    status: 'paid',
    payment_date: '2024-07-05',
  },
  {
    id: '4',
    teacher_name: 'James Wilson',
    amount: 22500,
    hours_taught: 36,
    rate_per_hour: 625,
    period_start: '2024-07-01',
    period_end: '2024-07-31',
    status: 'pending',
  },
  {
    id: '5',
    teacher_name: 'Lisa Rodriguez',
    amount: 31250,
    hours_taught: 50,
    rate_per_hour: 625,
    period_start: '2024-06-01',
    period_end: '2024-06-30',
    status: 'paid',
    payment_date: '2024-07-03',
  },
];

export const TeacherPayoutSection: React.FC<TeacherPayoutSectionProps> = ({
  payouts,
  loading = false,
  onPayoutProcess,
  onRefresh,
}) => {
  const [selectedPayout, setSelectedPayout] = useState<TeacherPayout | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [displayPayouts, setDisplayPayouts] = useState<TeacherPayout[]>([]);

  // Use placeholder data if no payouts provided
  useEffect(() => {
    if (payouts && payouts.length > 0) {
      setDisplayPayouts(payouts);
    } else {
      // Use placeholder data for demonstration
      setDisplayPayouts(PLACEHOLDER_PAYOUTS);
    }
  }, [payouts]);

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
    return displayPayouts
      .filter(payout => payout.status === 'pending')
      .reduce((total, payout) => total + payout.amount, 0);
  };

  const calculateTotalPaid = () => {
    return displayPayouts
      .filter(payout => payout.status === 'paid')
      .reduce((total, payout) => total + payout.amount, 0);
  };

  const renderPayoutItem = ({ item }: { item: TeacherPayout }) => (
    <TouchableOpacity
      onPress={() => handlePayoutAction(item)}
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
      }}
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

  const pendingPayouts = displayPayouts.filter(p => p.status === 'pending');
  const paidPayouts = displayPayouts.filter(p => p.status === 'paid');
  const totalPending = calculateTotalPending();
  const totalPaid = calculateTotalPaid();

  return (
    <View className="flex-1 bg-gray-50">
          <Text className="text-2xl font-bold text-gray-800">Teachers Payouts</Text>
      <View className="p-4">
        {/* Summary Cards */}
        <View className="flex-row space-x-3 mb-4">
          <View className="flex-1 rounded-lg p-4" style={{ backgroundColor: '#FFF3CD' }}>
            <Text className="text-sm font-medium" style={{ color: '#856404' }}>
              Total Pending
            </Text>
            <Text className="text-2xl font-bold" style={{ color: '#B45309' }}>
              {formatAmount(totalPending)}
            </Text>
            <Text className="text-sm" style={{ color: '#856404' }}>
              {pendingPayouts.length} teacher{pendingPayouts.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <View className="flex-1 rounded-lg p-4" style={{ backgroundColor: '#D1F2EB' }}>
            <Text className="text-sm font-medium" style={{ color: '#0C5460' }}>
              Total Paid
            </Text>
            <Text className="text-2xl font-bold" style={{ color: '#16A085' }}>
              {formatAmount(totalPaid)}
            </Text>
            <Text className="text-sm" style={{ color: '#0C5460' }}>
              {paidPayouts.length} completed
            </Text>
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
            className="px-4 py-3 rounded-lg mb-4"
            style={{ 
              backgroundColor: '#1ABC9C',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 3,
              elevation: 3,
            }}
          >
            <Text className="text-white font-semibold text-center text-base">
              Process All Pending Payouts ({formatAmount(totalPending)})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500 text-lg">Loading payouts...</Text>
          <Text className="text-gray-400 text-sm mt-2">Please wait...</Text>
        </View>
      ) : (
        <FlatList
          data={displayPayouts}
          renderItem={renderPayoutItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Text className="text-gray-500 text-lg">No payouts found</Text>
              <Text className="text-gray-400 text-sm mt-2 text-center">
                Teacher payouts will appear here when hours are logged
              </Text>
            </View>
          }
          ListHeaderComponent={
            displayPayouts.length > 0 ? (
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                All Payouts ({displayPayouts.length})
              </Text>
            ) : null
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
              <Text className="text-blue-600 text-lg font-medium">Close</Text>
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
                  <View className="flex-row justify-between py-3 border-b border-gray-100">
                    <Text className="text-gray-600 text-base">Amount</Text>
                    <Text className="text-xl font-bold text-blue-600">
                      {formatAmount(selectedPayout.amount)}
                    </Text>
                  </View>

                  <View className="flex-row justify-between py-3 border-b border-gray-100">
                    <Text className="text-gray-600 text-base">Hours Taught</Text>
                    <Text className="font-medium text-base">{selectedPayout.hours_taught} hours</Text>
                  </View>

                  <View className="flex-row justify-between py-3 border-b border-gray-100">
                    <Text className="text-gray-600 text-base">Hourly Rate</Text>
                    <Text className="font-medium text-base">{formatAmount(selectedPayout.rate_per_hour)}</Text>
                  </View>

                  <View className="flex-row justify-between py-3 border-b border-gray-100">
                    <Text className="text-gray-600 text-base">Period Start</Text>
                    <Text className="font-medium text-base">
                      {new Date(selectedPayout.period_start).toLocaleDateString()}
                    </Text>
                  </View>

                  <View className="flex-row justify-between py-3 border-b border-gray-100">
                    <Text className="text-gray-600 text-base">Period End</Text>
                    <Text className="font-medium text-base">
                      {new Date(selectedPayout.period_end).toLocaleDateString()}
                    </Text>
                  </View>

                  {selectedPayout.payment_date && (
                    <View className="flex-row justify-between py-3 border-b border-gray-100">
                      <Text className="text-gray-600 text-base">Payment Date</Text>
                      <Text className="font-medium text-base">
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
                    className="px-4 py-3 rounded-lg mt-6"
                    style={{ 
                      backgroundColor: '#3B82F6',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 3,
                      elevation: 3,
                    }}
                  >
                    <Text className="text-white font-semibold text-center text-base">
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