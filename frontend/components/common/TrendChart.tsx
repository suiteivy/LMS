import React from "react";
import { View, Text } from "react-native";

interface TrendDataPoint {
  label: string;
  value: number | null;
}

interface TrendChartProps {
  title?: string;
  data: TrendDataPoint[];
  color?: string;
  barColor?: string;
  maxValue?: number;
  showLabels?: boolean;
  height?: number;
}

export function TrendChart({
  title,
  data,
  color = "#FF6B00",
  barColor,
  maxValue: overrideMax,
  showLabels = true,
  height = 140,
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <View className="bg-white p-5 rounded-2xl border border-gray-100">
        {title ? <Text className="text-gray-500 text-sm font-medium mb-3">{title}</Text> : null}
        <View style={{ height }} className="items-center justify-center">
          <Text className="text-gray-400 text-sm">No trend data available</Text>
        </View>
      </View>
    );
  }

  const values = data.map((d) => d.value ?? 0);
  const maxVal = overrideMax || Math.max(...values, 1);
  const filledBarColor = barColor || color;

  return (
    <View className="bg-white p-5 rounded-2xl border border-gray-100">
      {title ? <Text className="text-gray-900 font-bold text-sm mb-4">{title}</Text> : null}
      <View style={{ height }} className="flex-row items-end justify-between gap-1">
        {data.map((point, idx) => {
          const barHeight = point.value !== null && point.value > 0
            ? Math.max((point.value / maxVal) * (height - 28), 4)
            : 4;
          const isNull = point.value === null;
          return (
            <View key={idx} className="flex-1 items-center justify-end" style={{ height }}>
              {/* Value label */}
              {showLabels && point.value !== null && (
                <Text className="text-xs font-semibold mb-1" style={{ color: filledBarColor }}>
                  {Math.round(point.value)}
                </Text>
              )}
              {isNull && (
                <Text className="text-gray-300 text-xs mb-1">—</Text>
              )}
              {/* Bar */}
              <View
                style={{
                  width: "70%",
                  height: barHeight,
                  backgroundColor: isNull ? "#e5e7eb" : filledBarColor,
                  borderRadius: 4,
                  opacity: isNull ? 0.3 : 1,
                }}
              />
              {/* Label */}
              <Text
                className="text-xs text-gray-400 mt-1 text-center"
                numberOfLines={1}
                style={{ fontSize: 10 }}
              >
                {point.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface SubjectTrendCardProps {
  subjectName: string;
  trend: { term_name: string; average: number | null }[];
  color?: string;
}

export function SubjectTrendCard({ subjectName, trend, color = "#FF6B00" }: SubjectTrendCardProps) {
  if (!trend || trend.length === 0) return null;

  const data: TrendDataPoint[] = trend.map((t) => ({
    label: t.term_name,
    value: t.average,
  }));

  const current = trend[trend.length - 1]?.average;
  const previous = trend.length >= 2 ? trend[trend.length - 2]?.average : null;
  const change = current !== null && previous !== null ? Math.round(current - previous) : null;

  return (
    <View className="bg-white p-4 rounded-2xl border border-gray-100 mb-3">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>{subjectName}</Text>
        {change !== null && (
          <View
            className={`px-2 py-0.5 rounded-full ${
              change > 0 ? "bg-emerald-50" : change < 0 ? "bg-red-50" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                change > 0 ? "text-emerald-600" : change < 0 ? "text-red-600" : "text-gray-500"
              }`}
            >
              {change > 0 ? `+${change}` : change}%
            </Text>
          </View>
        )}
      </View>
      <TrendChart data={data} color={color} height={100} showLabels />
    </View>
  );
}
