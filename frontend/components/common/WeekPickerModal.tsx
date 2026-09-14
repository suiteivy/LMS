import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import {
  Calendar,
  CalendarDays,
  Check,
  Clock,
  Info,
  X,
  AlertCircle
} from 'lucide-react-native';
import { ActionTooltip } from '@/components/common/ActionTooltip';
import { InstructionalWeek } from '@/utils/academicWeekEngine';

interface WeekPickerModalProps {
  visible: boolean;
  onClose: () => void;
  weeks: InstructionalWeek[];
  selectedWeekNumber?: number | string | null;
  onSelectWeek: (week: InstructionalWeek) => void;
  title?: string;
  subtitle?: string;
}

export const WeekPickerModal: React.FC<WeekPickerModalProps> = ({
  visible,
  onClose,
  weeks,
  selectedWeekNumber,
  onSelectWeek,
  title = "Select Instructional Week",
  subtitle = "Choose from the admin-configured academic calendar"
}) => {
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('all');

  // Extract unique terms from weeks
  const terms = Array.from(new Set(weeks.map(w => w.termName)));

  const filteredWeeks = selectedTermFilter === 'all'
    ? weeks
    : weeks.filter(w => w.termName === selectedTermFilter);

  const numericSelectedWeek = selectedWeekNumber ? Number(selectedWeekNumber) : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end md:justify-center md:items-center p-0 md:p-6">
        <View className="bg-white dark:bg-[#161B22] rounded-t-[36px] md:rounded-[32px] p-6 pb-10 md:pb-6 border-t md:border border-gray-200 dark:border-gray-800 w-full md:max-w-2xl max-h-[85%] shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/40 items-center justify-center mr-3 border border-orange-200 dark:border-orange-800/40">
                <CalendarDays size={20} color="#FF6900" />
              </View>
              <View>
                <Text className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {title}
                </Text>
                <Text className="text-gray-400 text-xs font-medium mt-0.5">
                  {subtitle}
                </Text>
              </View>
            </View>

            <ActionTooltip text="Close week selector">
              <TouchableOpacity
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#0D1117] items-center justify-center active:bg-gray-200"
                onPress={onClose}
              >
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </ActionTooltip>
          </View>

          {/* Term Filter Pills (if multiple terms present) */}
          {terms.length > 1 && (
            <View className="mb-4">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                <TouchableOpacity
                  onPress={() => setSelectedTermFilter('all')}
                  className={`mr-2 px-3.5 py-1.5 rounded-xl border ${selectedTermFilter === 'all' ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-gray-100 dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                >
                  <Text className={`font-bold text-xs ${selectedTermFilter === 'all' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                    All Terms
                  </Text>
                </TouchableOpacity>
                {terms.map(termName => (
                  <TouchableOpacity
                    key={termName}
                    onPress={() => setSelectedTermFilter(termName)}
                    className={`mr-2 px-3.5 py-1.5 rounded-xl border ${selectedTermFilter === termName ? 'bg-[#FF6900] border-[#FF6900]' : 'bg-gray-100 dark:bg-[#0D1117] border-gray-200 dark:border-gray-800'}`}
                  >
                    <Text className={`font-bold text-xs ${selectedTermFilter === termName ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {termName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Weeks List */}
          <ScrollView showsVerticalScrollIndicator={false} className="max-h-[500px]">
            {filteredWeeks.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <AlertCircle size={40} color="#9CA3AF" />
                <Text className="text-gray-500 font-semibold text-sm mt-3">
                  No instructional weeks available
                </Text>
                <Text className="text-gray-400 text-xs text-center mt-1 max-w-xs">
                  Academic periods have not been configured for this time frame.
                </Text>
              </View>
            ) : (
              <View className="space-y-2.5">
                {filteredWeeks.map((week) => {
                  const isSelected = numericSelectedWeek === week.weekNumber;
                  const isPartial = week.status === 'partial';
                  const isBreak = week.status === 'non_instructional';

                  return (
                    <TouchableOpacity
                      key={week.id}
                      onPress={() => {
                        onSelectWeek(week);
                        onClose();
                      }}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-orange-50/50 dark:bg-orange-950/20 border-[#FF6900]'
                          : 'bg-[#F6F8FA] dark:bg-[#0D1117] border-gray-200 dark:border-gray-800 hover:border-orange-300'
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        {/* Left Info */}
                        <View className="flex-1 mr-3">
                          <View className="flex-row items-center flex-wrap gap-2 mb-1">
                            <Text className={`font-bold text-sm ${isSelected ? 'text-[#FF6900]' : 'text-gray-900 dark:text-white'}`}>
                              {week.label}
                            </Text>
                            {week.termName && (
                              <View className="bg-gray-200/60 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                                <Text className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                  {week.termName}
                                </Text>
                              </View>
                            )}
                          </View>

                          {/* Event / Holiday Notice */}
                          {week.events.length > 0 ? (
                            <View className="flex-row items-center mt-1">
                              <Info size={12} color="#D97706" />
                              <Text className="text-amber-600 dark:text-amber-400 text-xs font-medium ml-1">
                                {week.events.map(e => `${e.title} (${e.date})`).join(', ')}
                              </Text>
                            </View>
                          ) : (
                            <View className="flex-row items-center mt-1">
                              <Clock size={12} color="#9CA3AF" />
                              <Text className="text-gray-400 text-xs font-medium ml-1">
                                Full teaching week (5 instructional days)
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Right Status Badge */}
                        <View className="items-end gap-1.5">
                          <View
                            className={`px-2.5 py-1 rounded-full border ${
                              isBreak
                                ? 'bg-purple-100 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40'
                                : isPartial
                                ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40'
                                : 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40'
                            }`}
                          >
                            <Text
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                isBreak
                                  ? 'text-purple-700 dark:text-purple-300'
                                  : isPartial
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {week.badgeText}
                            </Text>
                          </View>

                          {isSelected && (
                            <View className="w-5 h-5 rounded-full bg-[#FF6900] items-center justify-center">
                              <Check size={12} color="white" />
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer Close Button */}
          <View className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <TouchableOpacity
              onPress={onClose}
              className="py-3 bg-gray-100 dark:bg-[#0D1117] rounded-xl items-center active:bg-gray-200"
            >
              <Text className="text-gray-700 dark:text-gray-300 font-bold text-xs uppercase tracking-wider">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
