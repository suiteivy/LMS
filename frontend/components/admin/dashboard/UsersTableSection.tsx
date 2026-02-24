import { useTheme } from '@/contexts/ThemeContext';
import { User } from '@/types/types';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

interface UsersTableSectionProps {
  users: User[];
  loading?: boolean;
  onUserPress?: (user: User) => void;
  onApproveUser?: (userId: string) => void;
}

const UsersTableSection: React.FC<UsersTableSectionProps> = ({
  users,
  loading = false,
  onUserPress,
  onApproveUser
}) => {
  const { isDark } = useTheme();
  if (loading) {
    return (
      <View className="py-4">
        <ActivityIndicator size="large" color={isDark ? "#FF6900" : "#000"} />
      </View>
    );
  }

  return (
    <>
      <View>
        <Text className="text-xl font-bold mb-2 text-gray-900 dark:text-white">All Users</Text>
      </View>
      <View className="mt-4 bg-white dark:bg-[#1a1a1a] p-4 rounded-xl shadow-sm border border-transparent dark:border-gray-800">

        {users.map((user) => (
          <View
            key={user.id}
            className="py-2 border-b border-gray-100 dark:border-gray-800 flex-row justify-between items-center"
          >
            <TouchableOpacity onPress={() => onUserPress?.(user)} className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">{user.name} </Text>
              <Text className="text-base text-gray-500 dark:text-gray-400 font-medium ">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Text>
              <View className="flex-row w-full gap-4 items-center justify-between flex-1 mt-1 ">
                <Text className="text-xs text-gray-400 dark:text-gray-500">{user.email}</Text>
                {/* Role badge on the right */}
                <View
                  className={`rounded-full py-1 px-3 ${user.role === 'admin'
                    ? 'bg-blue-100 dark:bg-blue-950/30'
                    : user.role === 'teacher'
                      ? 'bg-purple-100 dark:bg-purple-950/30'
                      : 'bg-green-100 dark:bg-green-950/30'
                    }`}
                >
                  <Text
                    className={`text-xs ${user.role === 'admin'
                      ? 'text-blue-700 dark:text-blue-300'
                      : user.role === 'teacher'
                        ? 'text-purple-700 dark:text-purple-300'
                        : 'text-green-700 dark:text-green-300'
                      }`}
                  >
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </>
  );
};


export { UsersTableSection };
export default UsersTableSection;
