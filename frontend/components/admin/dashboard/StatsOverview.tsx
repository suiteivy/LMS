import { StatsCard } from '@/components/common/StatsCard';
import { StatsData } from '@/types/types';
import React from 'react';
import { View, Text } from 'react-native';
interface StatsOverviewProps {
  statsData?: StatsData[];
  loading?: boolean;
  onStatsPress?: (stat: StatsData) => void;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  statsData = [],
  loading = false,
  onStatsPress
}) => {
  // Default placeholder stats data  before we connect to backend
  const defaultStatsData: StatsData[] = [
    { 
      title: "Total Students", 
      value: "1,234", 
      icon: "people", 
      color: "blue", 
      trend: { value: "+12%", isPositive: true } 
    },
    { 
      title: "Active Subjects", 
      value: "56", 
      icon: "book", 
      color: "green", 
      trend: { value: "+8%", isPositive: true } 
    },
    { 
      title: "Teachers", 
      value: "89", 
      icon: "person", 
      color: "purple", 
      trend: { value: "+3%", isPositive: true } 
    },
    { 
      title: "Revenue", 
      value: "$45,678", 
      icon: "cash", 
      color: "yellow", 
      trend: { value: "+15%", isPositive: true } 
    },
  ];

  const displayStatsData = statsData.length > 0 ? statsData : defaultStatsData;

  const handleStatsPress = (stat: StatsData) => {
    onStatsPress?.(stat);
  };

  return (
    <View className="mb-6">
      <Text className="text-xl font-semibold text-gray-900 mb-4">
        Overview
      </Text>
      
      <View className="flex-row flex-wrap -mx-2">
        {displayStatsData.map((stat, index) => (
          <View key={index} className="w-1/2 px-2">
            <StatsCard
              {...stat} 
              loading={loading}
              onPress={() => handleStatsPress(stat)}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

export { StatsOverview };
export default StatsOverview;
