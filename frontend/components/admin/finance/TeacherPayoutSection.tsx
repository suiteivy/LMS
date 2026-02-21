import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { TeacherPayout } from '@/types/types';

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
    teacher_id: 'TEA-2024-001',
    teacher_name: 'Sarah Johnson',
    teacher_display_id: 'TEA-2024-001',
    amount: 25000,
    hours_taught: 40,
    rate_per_hour: 625,
    period_start: '2024-07-01',
    period_end: '2024-07-31',
    status: 'pending',
  },
  {
    id: '2',
    teacher_id: 'TEA-2024-002',
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
    teacher_id: 'TEA-2024-003',
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
    teacher_id: 'TEA-2024-004',
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
    teacher_id: 'TEA-2024-005',
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

const TeacherPayoutSection: React.FC<TeacherPayoutSectionProps> = ({
  payouts,
  loading = false,
  onPayoutProcess,
  onRefresh,
}) => {
  const { isDark } = useTheme();
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
        return 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400';
      case 'processing':
        return 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
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
      className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-800"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
      }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {item.teacher_name}
          </Text>
          {item.teacher_display_id && (
            <Text className="text-xs text-[#FF6B00] font-medium">
              ID: {item.teacher_display_id}
            </Text>
          )}
        </View>
        <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
          <Text className="text-xs font-medium capitalize">{item.status}</Text>
        </View>
      </View>

      <View className="space-y-2">
        <Text className="text-2xl font-bold text-[#FF6B00] mb-2">
          {formatAmount(item.amount)}
        </Text>

        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600 dark:text-gray-400">Hours Taught:</Text>
          <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {item.hours_taught} hrs
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600 dark:text-gray-400">Rate:</Text>
          <Text className="text-sm text-gray-900 dark:text-gray-200">
            {formatAmount(item.rate_per_hour || 0)}/hr
          </Text>
        </View>

        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600 dark:text-gray-400">Period:</Text>
          <Text className="text-sm text-gray-900 dark:text-gray-200">
            {new Date(item.period_start).toLocaleDateString()} - {' '}
            {new Date(item.period_end).toLocaleDateString()}
          </Text>
        </View>

        {item.payment_date && (
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600 dark:text-gray-400">Paid On:</Text>
            <Text className="text-sm text-gray-900 dark:text-gray-200">
              {new Date(item.payment_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {item.status === 'pending' && (
        <View className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Text className="text-[#FF6B00] text-sm font-medium text-center">
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
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <Text className="text-2xl font-bold text-gray-800 dark:text-white mb-2 ml-4 mt-2">Teachers Payouts</Text>
      <View className="p-4">
        {/* Summary Cards */}
        <View className="flex-row space-x-3 mb-4">
          <View className="flex-1 rounded-lg p-4" style={{ backgroundColor: isDark ? '#451a03' : '#FFF3CD' }}>
            <Text className="text-sm font-medium" style={{ color: isDark ? '#fdba74' : '#856404' }}>
              Total Pending
            </Text>
            <Text className="text-2xl font-bold" style={{ color: isDark ? '#fb923c' : '#B45309' }}>
              {formatAmount(totalPending)}
            </Text>
            <Text className="text-sm" style={{ color: isDark ? '#fdba74' : '#856404' }}>
              {pendingPayouts.length} teacher{pendingPayouts.length !== 1 ? 's' : ''}
            </Text>
          </View>

          <View className="flex-1 rounded-lg p-4" style={{ backgroundColor: isDark ? '#064e3b' : '#D1F2EB' }}>
            <Text className="text-sm font-medium" style={{ color: isDark ? '#6ee7b7' : '#0C5460' }}>
              Total Paid
            </Text>
            <Text className="text-2xl font-bold" style={{ color: isDark ? '#34d399' : '#16A085' }}>
              {formatAmount(totalPaid)}
            </Text>
            <Text className="text-sm" style={{ color: isDark ? '#6ee7b7' : '#0C5460' }}>
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
            className="bg-[#FF6B00] px-4 py-3 rounded-lg mb-4 shadow-sm dark:shadow-md dark:shadow-orange-950/20"
          >
            <Text className="text-white font-semibold text-center text-base">
              Process All Pending Payouts ({formatAmount(totalPending)})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {
        loading ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500 dark:text-gray-400 text-lg">Loading payouts...</Text>
            <Text className="text-gray-400 dark:text-gray-500 text-sm mt-2">Please wait...</Text>
          </View>
        ) : (
          <View className="px-4 pb-20">
            {displayPayouts.length > 0 ? (
              <>
                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  All Payouts ({displayPayouts.length})
                </Text>
                {displayPayouts.map((item) => (
                  <View key={item.id}>
                    {renderPayoutItem({ item })}
                  </View>
                ))}
              </>
            ) : (
              <View className="flex-1 justify-center items-center py-20">
                <Text className="text-gray-500 dark:text-gray-400 text-lg">No payouts found</Text>
                <Text className="text-gray-400 dark:text-gray-500 text-sm mt-2 text-center">
                  Teacher payouts will appear here when hours are logged
                </Text>
              </View>
            )}
          </View>
        )
      }

      {/* Payout Details Modal */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white dark:bg-[#121212]">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Text className="text-blue-600 dark:text-blue-400 text-lg font-medium">Close</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">Payout Details</Text>
            <View className="w-12" />
          </View>

          {selectedPayout && (
            <ScrollView className="flex-1 p-4">
              <View className="bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-4">
                <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedPayout.teacher_name}
                </Text>

                <View className={`px-3 py-1 rounded-full mb-4 self-start ${getStatusColor(selectedPayout.status)}`}>
                  <Text className="font-medium capitalize">{selectedPayout.status}</Text>
                </View>

                <View className="space-y-3">
                  <View className="flex-row justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                    <Text className="text-gray-600 dark:text-gray-400 text-base">Amount</Text>
                    <Text className="text-xl font-bold text-blue-600 dark:text-blue-400">
                      {formatAmount(selectedPayout.amount)}
                    </Text>
                  </View>

                  <View className="flex-row justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                    <Text className="text-gray-600 dark:text-gray-400 text-base">Hours Taught</Text>
                    <Text className="font-medium text-base dark:text-gray-200">{selectedPayout.hours_taught} hours</Text>
                  </View>

                  <View className="flex-row justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                    <Text className="text-gray-600 dark:text-gray-400 text-base">Hourly Rate</Text>
                    <Text className="font-medium text-base dark:text-gray-200">{formatAmount(selectedPayout.rate_per_hour || 0)}</Text>
                  </View>

                  <View className="flex-row justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                    <Text className="text-gray-600 dark:text-gray-400 text-base">Period Start</Text>
                    <Text className="font-medium text-base dark:text-gray-200">
                      {new Date(selectedPayout.period_start).toLocaleDateString()}
                    </Text>
                  </View>

                  <View className="flex-row justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                    <Text className="text-gray-600 dark:text-gray-400 text-base">Period End</Text>
                    <Text className="font-medium text-base dark:text-gray-200">
                      {new Date(selectedPayout.period_end).toLocaleDateString()}
                    </Text>
                  </View>

                  {selectedPayout.payment_date && (
                    <View className="flex-row justify-between py-3 border-b border-gray-100 dark:border-gray-800">
                      <Text className="text-gray-600 dark:text-gray-400 text-base">Payment Date</Text>
                      <Text className="font-medium text-base dark:text-gray-200">
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
                      backgroundColor: '#FF6B00',
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
    </View >
  );
};

export { TeacherPayoutSection };
export default TeacherPayoutSection;
