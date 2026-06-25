import React from "react";
import { View } from "react-native";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "h-4 w-full rounded bg-gray-200 dark:bg-gray-800" }: SkeletonProps) {
  return <View className={className} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

export function SkeletonCard() {
  return (
    <View className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-navy-surface p-4 mb-3">
      <Skeleton className="h-4 w-2/5 rounded bg-gray-200 dark:bg-gray-800 mb-3" />
      <Skeleton className="h-3 w-full rounded bg-gray-200 dark:bg-gray-800 mb-2" />
      <Skeleton className="h-3 w-4/5 rounded bg-gray-200 dark:bg-gray-800" />
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={`skeleton-${index}`} />
      ))}
    </View>
  );
}

export default Skeleton;
