import { CompactAdminTooltip } from "@/components/ui/AdminTooltip";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { TouchableOpacity } from "react-native";
import { Text, View } from "react-native";

export default function admin() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showCompact, setShowCompact] = useState(false);

  return (
    <View
      className="flex-1 justify-center px-6"
      style={{ backgroundColor: "#F1FFF8" }}
    >
      <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <Text
          className="text-xl font-bold mb-4 text-center"
          style={{ color: "#2C3E50" }}
        >
          Public Access Portal
        </Text>

        <Text className="text-gray-600 text-center mb-6">This version hides admin tools unless you're authorized.</Text>

        {/* Admin Access Section */}
        <TouchableOpacity
          onPress={() => setShowTooltip(true)}
          className="w-full py-4 px-6 border-2 border-dashed border-gray-300 rounded-lg items-center mb-4"
        >
          <View className="flex-row items-center">
            <Ionicons name="settings" size={20} color="#6B7280" />
            <Text className="ml-2 text-gray-500 font-medium">
              Admin Panel (Restricted)
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowCompact(true)}
          className="w-full py-4 px-6 border-2 border-dashed border-gray-300 rounded-lg items-center"
        >
          <View className="flex-row items-center">
            <Ionicons name="create" size={20} color="#6B7280" />
            <Text className="ml-2 text-gray-500 font-medium">
              Log In (Admin Only)
            </Text>
          </View>
        </TouchableOpacity>
      </View>


      {/* Compact Tooltip */}
      <CompactAdminTooltip
        visible={showCompact}
        onClose={() => setShowCompact(false)}
      />
    </View>
  );
}
