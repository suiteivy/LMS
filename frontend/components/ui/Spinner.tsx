import React from "react";
import { ActivityIndicator, StyleProp, View, ViewStyle } from "react-native";

type SpinnerSize = "small" | "large";

interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  className?: string;
  centered?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function Spinner({
  size = "small",
  color = "#FF6900",
  className,
  centered = false,
  label = "Loading",
  style,
}: SpinnerProps) {
  const indicator = (
    <ActivityIndicator
      size={size}
      color={color}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    />
  );

  if (!centered && !className && !style) {
    return indicator;
  }

  return (
    <View className={className || (centered ? "items-center justify-center" : undefined)} style={style}>
      {indicator}
    </View>
  );
}

export default Spinner;
