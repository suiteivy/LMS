import { useTheme } from '@/contexts/ThemeContext';
import { LogEntry, logger } from '@/services/LoggingService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export const DebugOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { isDark } = useTheme();

  useEffect(() => {
    logger.info('DebugOverlay mounted');
  }, []);

  useEffect(() => {
    if (visible) {
      setLogs(logger.getLogs());
    }
  }, [visible]);

  const toggleOverlay = () => setVisible(!visible);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'fatal': return '#ef4444';
      case 'error': return '#f87171';
      case 'warn': return '#fbbf24';
      default: return isDark ? '#9ca3af' : '#6b7280';
    }
  };

  if (!visible) {
    return (
      <TouchableOpacity
        onPress={toggleOverlay}
        className="absolute top-10 right-0 w-12 h-12 bg-red-600 rounded-full items-center justify-center elevation-5"
        style={{
          zIndex: 999999,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4.65,
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="bug" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    );
  }

  return (
    <View
      className="absolute top-10 left-0 right-0 bg-white dark:bg-[#000000]"
      style={{ zIndex: 1000000 }}
    >
      <SafeAreaView className="flex-1">
        <View className="flex-row justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#121212]">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">Debug Hub</Text>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => logger.copyToClipboard()} className="mr-6 p-2 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border border-transparent dark:border-gray-800">
              <Ionicons name="copy" size={20} color={isDark ? "#FF6900" : "#333333"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => logger.clearLogs().then(() => setLogs([]))} className="mr-6 p-2 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border border-transparent dark:border-gray-800">
              <Ionicons name="trash" size={20} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleOverlay} className="p-2 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg border border-transparent dark:border-gray-800">
              <Ionicons name="close" size={24} color={isDark ? "#FFFFFF" : "#1A1A1A"} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-2 height-[80vh]">
          {logs.length === 0 ? (
            <Text className="text-center text-gray-500 mt-10">No logs found</Text>
          ) : (
            logs.map((log, index) => (
              <View key={index} className="mb-4 pb-2 border-b border-gray-50 dark:border-gray-900 ">
                <View className="flex-row justify-between mb-1">
                  <Text style={{ color: getLevelColor(log.level) }} className="font-bold text-xs uppercase">
                    {log.level}
                  </Text>
                  <Text className="text-[10px] text-gray-400 dark:text-gray-500">                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Text className="text-sm text-gray-700 dark:text-gray-300">{log.message}</Text>
                {log.details && (
                  <Text className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-mono bg-gray-50 dark:bg-[#1a1a1a] p-1 rounded border border-transparent dark:border-gray-800">
                    {log.details}
                  </Text>
                )}
              </View>
            ))
          )}
        </ScrollView>

        <TouchableOpacity
          className="bg-orange-500 p-4 items-center m-4 rounded-2xl"
          onPress={() => setLogs(logger.getLogs())}
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-lg">Refresh Log View</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};
