import { User } from '@/types/types';
import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';

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
  if (loading) {
    return (
      <View className="py-4">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <>
    <View>
      
      <Text className="text-xl font-bold mb-2">All Users</Text>
    </View>
    <View className="mt-4 bg-white p-4 rounded-lg shadow">
  
      {users.map((user) => (
        <View
          key={user.id}
          className="py-2 border-b border-gray-200 flex-row justify-between items-center"
        >
          <TouchableOpacity onPress={() => onUserPress?.(user)} className="flex-1">
            <Text className="text-lg font-semibold text-black">{user.name} </Text>
            <Text className="text-base text-gray-500 font-medium ">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Text>
            <View className="flex-row w-full gap-4 items-center justify-between flex-1 mt-1 ">
                          <Text className="text-xs text-gray-400 ">{user.email}</Text>
              {/* Status badge on the left */}
              <View className={`rounded-full py-1 px-3 ${user.status === 'pending' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                <Text className={`text-xs ${user.status === 'pending' ? 'text-orange-500' : 'text-green-950'}`}>
                  {(user.status || 'Active').charAt(0).toUpperCase() + (user.status || 'Active').slice(1).toLowerCase()}
                </Text>
              </View>
              {/* Role badge on the right */}
              {/* <View
                className={`rounded-full py-1 px-3 ${
                  user.role === 'admin'
                    ? 'bg-blue-100'
                    : user.role === 'teacher'
                    ? 'bg-purple-100'
                    : 'bg-green-100'
                }`}
              >
                <Text
                  className={`text-xs ${
                    user.role === 'admin'
                      ? 'text-blue-700'
                      : user.role === 'teacher'
                      ? 'text-purple-700'
                      : 'text-green-700'
                  }`}
                >
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Text>
              </View> */}
            </View>
            
          </TouchableOpacity>

          {user.status === 'pending' && (
            <View className="flex-row gap-2">
              <Text className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded overflow-hidden">Pending</Text>
              {onApproveUser && (
                <TouchableOpacity
                  onPress={() => onApproveUser(user.id)}
                  className="bg-green-500 px-3 py-1 rounded"
                >
                  <Text className="text-white text-xs font-bold">Approve</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ))}
    </View>
    </>
  );
};


export { UsersTableSection };
export default UsersTableSection;
