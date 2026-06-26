import { ThemeMode, useTheme } from "@/contexts/ThemeContext";
import { Laptop, Moon, Sun } from "lucide-react-native";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

export function ThemeSegmentedControl() {
  const { isDark, theme, setTheme } = useTheme();

  const modes = [
    { key: "light", label: "Light" },
    { key: "dark", label: "Dark" },
    ...(Platform.OS !== "web" ? [{ key: "system", label: "System" }] : []),
  ] as { key: ThemeMode; label: string }[];

  const iconFor = (mode: ThemeMode, active: boolean) => {
    const color = active ? "#FF6B00" : isDark ? "#94A3B8" : "#9CA3AF";
    if (mode === "light") return <Sun size={12} color={color} strokeWidth={2.4} />;
    if (mode === "dark") return <Moon size={12} color={color} strokeWidth={2.4} />;
    return <Laptop size={12} color={color} strokeWidth={2.4} />;
  };

  return (
    <View
      style={{
        width: "100%",
        flexDirection: "row",
        backgroundColor: isDark ? "#161B22" : "#F8FAFC",
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "#E5E7EB",
      }}
    >
      {modes.map((mode) => {
        const isActive = theme === mode.key;
        return (
          <TouchableOpacity
            key={mode.key}
            onPress={() => setTheme(mode.key)}
            activeOpacity={0.85}
            style={{
              minWidth: 86,
              flex: 1,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isActive ? (isDark ? "#1F2937" : "#FFFFFF") : "transparent",
              borderWidth: isActive ? 1 : 0,
              borderColor: isActive ? (isDark ? "#374151" : "#E5E7EB") : "transparent",
            }}
          >
            {iconFor(mode.key, isActive)}
            <Text
              style={{
                marginLeft: 5,
                fontSize: 10,
                fontWeight: "700",
                color: isActive ? (isDark ? "#FFFFFF" : "#111827") : isDark ? "#94A3B8" : "#9CA3AF",
              }}
            >
              {mode.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
