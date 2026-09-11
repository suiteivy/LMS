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
    const color = active ? "#FF6900" : isDark ? "#8B949E" : "#6E7681";
    if (mode === "light") return <Sun size={13} color={color} strokeWidth={2.4} />;
    if (mode === "dark") return <Moon size={13} color={color} strokeWidth={2.4} />;
    return <Laptop size={13} color={color} strokeWidth={2.4} />;
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignSelf: "flex-start",
        alignItems: "center",
        backgroundColor: isDark ? "#161B22" : "#F3F4F6",
        borderRadius: 9999,
        padding: 3,
        borderWidth: 1,
        borderColor: isDark ? "#30363D" : "#E5E7EB",
      }}
    >
      {modes.map((mode) => {
        const isActive = theme === mode.key;
        return (
          <TouchableOpacity
            key={mode.key}
            onPress={() => setTheme(mode.key)}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 9999,
              backgroundColor: isActive
                ? isDark
                  ? "#21262D"
                  : "#FFFFFF"
                : "transparent",
              borderWidth: isActive ? 1 : 0,
              borderColor: isActive
                ? isDark
                  ? "#30363D"
                  : "rgba(0,0,0,0.06)"
                : "transparent",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isActive ? (isDark ? 0.3 : 0.08) : 0,
              shadowRadius: 2,
              elevation: isActive ? 1 : 0,
            }}
          >
            {iconFor(mode.key, isActive)}
            <Text
              style={{
                marginLeft: 5,
                fontSize: 11,
                fontWeight: isActive ? "700" : "500",
                color: isActive
                  ? isDark
                    ? "#F0F6FC"
                    : "#111827"
                  : isDark
                  ? "#8B949E"
                  : "#6B7280",
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
