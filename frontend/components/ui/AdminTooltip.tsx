import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface FinalAdminTooltipProps {
  visible: boolean;
  onClose: () => void;
  position?: "top" | "bottom" | "center";
}

export const CompactAdminTooltip: React.FC<FinalAdminTooltipProps> = ({
  visible,
  onClose,
}) => {
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.spring(animation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      >
        <Animated.View
          style={{
            transform: [
              {
                scale: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.9, 1],
                }),
              },
            ],
            opacity: animation,
          }}
          className="mx-8"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 ml-5 mr-5 items-center shadow-lg"
            style={{ elevation: 8 }}
          >
            {/* Icon */}
            <View
              className="p-4 rounded-full mb-4"
              style={{ backgroundColor: "#A1EBE5" }}
            >
              <Ionicons name="shield-checkmark" size={32} color="#2C3E50" />
            </View>

            {/* Title */}
            <Text
              className="text-xl font-bold text-center mb-2"
              style={{ color: "#2C3E50" }}
            >
              Admin Access Only
            </Text>

            {/* Message */}
            <Text
              className="text-base text-center mb-6 leading-6"
              style={{ color: "#2C3E50" }}
            >
              Only existing admin can log in.{"\n"}
              Contact support to request access.
            </Text>

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              className="px-8 py-3 rounded-lg"
              style={{ backgroundColor: "#1ABC9C" }}
            >
              <Text className="text-white font-semibold">Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};
