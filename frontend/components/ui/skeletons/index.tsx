import React from "react";
import { Text, View } from "react-native";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useTheme } from "@/contexts/ThemeContext";

type SkeletonTone = "light" | "dark";

interface SkeletonBlockProps {
  className?: string;
  tone?: SkeletonTone;
}

const SkeletonBlock = ({ className = "h-4 w-full rounded-xl", tone = "light" }: SkeletonBlockProps) => {
  const { isDark } = useTheme();
  const bg = tone === "dark"
    ? (isDark ? "bg-[#161B22]" : "bg-[#EAEEF2]")
    : (isDark ? "bg-[#21262D]" : "bg-[#D0D7DE]");
  return <View className={`${className} ${bg}`} />;
};

const LoadingA11y = ({ label }: { label: string }) => (
  <>
    <Text className="sr-only" accessibilityLiveRegion="polite">
      {label}
    </Text>
  </>
);

interface BaseSkeletonProps {
  loading?: boolean;
  count?: number;
  label?: string;
  showAfter?: number;
  minVisible?: number;
}

const shouldRender = (
  loading: boolean,
  showAfter: number,
  minVisible: number
) => useDelayedLoading(loading, { showAfter, minVisible });

export const ListItemSkeleton = ({
  loading = true,
  count = 4,
  label = "Loading list items...",
  showAfter = 200,
  minVisible = 300,
}: BaseSkeletonProps & { withAvatar?: boolean; lines?: number }) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }}>
      <LoadingA11y label={label} />
      <View style={{ gap: 12 }}>
        {Array.from({ length: count }).map((_, idx) => (
          <View key={`list-skeleton-${idx}`} className="rounded-xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-4">
            <SkeletonBlock className="h-4 w-2/5 rounded mb-3" />
            <SkeletonBlock className="h-3 w-full rounded mb-2" />
            <SkeletonBlock className="h-3 w-4/5 rounded" />
          </View>
        ))}
      </View>
    </View>
  );
};

export const TableRowSkeleton = ({
  loading = true,
  count = 6,
  label = "Loading table rows...",
  showAfter = 200,
  minVisible = 300,
  columns = 4,
}: BaseSkeletonProps & { columns?: number; columnWidths?: string[] }) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }}>
      <LoadingA11y label={label} />
      <View className="rounded-xl border border-[#D0D7DE] dark:border-[#21262D] overflow-hidden">
        {Array.from({ length: count }).map((_, row) => (
          <View
            key={`table-row-skeleton-${row}`}
            className="flex-row items-center bg-[#F6F8FA] dark:bg-[#161B22] px-4 py-3 border-b border-[#D0D7DE] dark:border-[#21262D]"
            style={{ gap: 10 }}
          >
            {Array.from({ length: Math.max(1, columns) }).map((__, col) => (
              <SkeletonBlock key={`cell-skeleton-${row}-${col}`} className="h-3 rounded flex-1" />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

export const CardSkeleton = ({ loading = true, label = "Loading card...", showAfter = 200, minVisible = 300 }: BaseSkeletonProps) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }} className="rounded-xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-4">
      <LoadingA11y label={label} />
      <SkeletonBlock className="h-4 w-1/3 rounded mb-3" />
      <SkeletonBlock className="h-8 w-1/2 rounded mb-2" />
      <SkeletonBlock className="h-3 w-full rounded" />
    </View>
  );
};

export const CardGridSkeleton = ({
  loading = true,
  count = 4,
  label = "Loading cards...",
  showAfter = 200,
  minVisible = 300,
}: BaseSkeletonProps & { columns?: number }) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }}>
      <LoadingA11y label={label} />
      <View style={{ gap: 12 }}>
        {Array.from({ length: count }).map((_, idx) => (
          <CardSkeleton key={`card-grid-skeleton-${idx}`} loading={true} label={label} />
        ))}
      </View>
    </View>
  );
};

export const DetailHeaderSkeleton = ({ loading = true, label = "Loading details...", showAfter = 200, minVisible = 300 }: BaseSkeletonProps) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }} className="mb-4">
      <LoadingA11y label={label} />
      <SkeletonBlock className="h-6 w-2/5 rounded mb-2" />
      <SkeletonBlock className="h-4 w-3/5 rounded" />
    </View>
  );
};

export const DashboardStatCardSkeleton = ({ loading = true, count = 4, label = "Loading dashboard stats...", showAfter = 200, minVisible = 300 }: BaseSkeletonProps) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }}>
      <LoadingA11y label={label} />
      <View style={{ gap: 12 }}>
        {Array.from({ length: count }).map((_, idx) => (
          <View key={`stat-skeleton-${idx}`} className="rounded-xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-4">
            <SkeletonBlock className="h-3 w-1/3 rounded mb-3" />
            <SkeletonBlock className="h-7 w-1/2 rounded" />
          </View>
        ))}
      </View>
    </View>
  );
};

export const ConversationListItemSkeleton = ({ loading = true, count = 5, label = "Loading conversations...", showAfter = 200, minVisible = 300 }: BaseSkeletonProps) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }}>
      <LoadingA11y label={label} />
      <View style={{ gap: 10 }}>
        {Array.from({ length: count }).map((_, idx) => (
          <View key={`conversation-skeleton-${idx}`} className="flex-row items-center rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-4">
            <SkeletonBlock className="h-11 w-11 rounded-2xl mr-3" />
            <View className="flex-1">
              <SkeletonBlock className="h-3 w-1/2 rounded mb-2" />
              <SkeletonBlock className="h-3 w-4/5 rounded" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const ChatMessageSkeleton = ({ loading = true, count = 6, label = "Loading messages...", showAfter = 200, minVisible = 300 }: BaseSkeletonProps) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }} className="px-3 py-2">
      <LoadingA11y label={label} />
      {Array.from({ length: count }).map((_, idx) => {
        const own = idx % 2 === 0;
        return (
          <View key={`chat-message-skeleton-${idx}`} className={`mb-3 ${own ? "items-end" : "items-start"}`}>
            <SkeletonBlock className={`h-10 rounded-2xl ${own ? "w-2/3" : "w-3/5"}`} />
          </View>
        );
      })}
    </View>
  );
};

export const FormFieldSkeleton = ({ loading = true, count = 5, label = "Loading form...", showAfter = 200, minVisible = 300 }: BaseSkeletonProps) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }}>
      <LoadingA11y label={label} />
      <View style={{ gap: 14 }}>
        {Array.from({ length: count }).map((_, idx) => (
          <View key={`form-field-skeleton-${idx}`}>
            <SkeletonBlock className="h-3 w-1/4 rounded mb-2" />
            <SkeletonBlock className="h-10 w-full rounded-xl" />
          </View>
        ))}
      </View>
    </View>
  );
};

export const AdminDashboardSkeleton = ({ loading = true, label = "Loading admin overview...", showAfter = 200, minVisible = 300 }: BaseSkeletonProps) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }} className="px-5 pt-4">
      <LoadingA11y label={label} />
      {/* Top action pill skeleton */}
      <View className="flex-row justify-end mb-4" style={{ gap: 8 }}>
        <SkeletonBlock className="h-8 w-24 rounded-xl" />
        <SkeletonBlock className="h-8 w-24 rounded-xl" />
      </View>
      {/* Hero inline stats */}
      <View className="flex-row justify-between mb-6 mt-2">
        <View className="w-2/5">
          <SkeletonBlock className="h-3 w-1/2 rounded mb-2" />
          <SkeletonBlock className="h-8 w-4/5 rounded" />
        </View>
        <View className="w-2/5 items-end">
          <SkeletonBlock className="h-3 w-1/2 rounded mb-2" />
          <SkeletonBlock className="h-8 w-4/5 rounded" />
        </View>
      </View>
      {/* Institution Capacity Card */}
      <View className="rounded-xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-5 mb-4">
        <View className="flex-row justify-between mb-3">
          <SkeletonBlock className="h-4 w-1/3 rounded" />
          <SkeletonBlock className="h-3 w-1/4 rounded" />
        </View>
        <SkeletonBlock className="h-2 w-full rounded-full mb-2" />
        <View className="flex-row justify-between">
          <SkeletonBlock className="h-3 w-1/4 rounded" />
          <SkeletonBlock className="h-3 w-1/4 rounded" />
        </View>
      </View>
      {/* Today's Presence Card */}
      <View className="rounded-xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-5 mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <SkeletonBlock className="h-4 w-1/3 rounded" />
          <SkeletonBlock className="h-7 w-16 rounded" />
        </View>
        <SkeletonBlock className="h-2 w-full rounded-full mb-2" />
        <SkeletonBlock className="h-3 w-2/3 rounded" />
      </View>
      {/* Quick Actions Grid */}
      <SkeletonBlock className="h-4 w-1/3 rounded mb-3" />
      <View className="flex-row flex-wrap justify-between">
        {Array.from({ length: 6 }).map((_, idx) => (
          <View key={`qa-skel-${idx}`} className="w-[48.5%] rounded-xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-4 mb-3 flex-row items-center">
            <SkeletonBlock className="h-5 w-5 rounded-lg mr-3" />
            <SkeletonBlock className="h-4 flex-1 rounded" />
          </View>
        ))}
      </View>
    </View>
  );
};

export const TeacherDashboardSkeleton = ({ loading = true, label = "Loading teacher portal...", showAfter = 200, minVisible = 300 }: BaseSkeletonProps) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }} className="p-6 pt-2">
      <LoadingA11y label={label} />
      {/* Role badges row */}
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-row gap-2">
          <SkeletonBlock className="h-6 w-24 rounded-xl" />
          <SkeletonBlock className="h-6 w-24 rounded-xl" />
        </View>
        <SkeletonBlock className="h-8 w-20 rounded-xl" />
      </View>
      {/* Quick Action / Stats Cards */}
      <View className="flex-row justify-between mb-6">
        <View className="w-[48%] rounded-3xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-6 items-center">
          <SkeletonBlock className="h-10 w-10 rounded-2xl mb-3" />
          <SkeletonBlock className="h-4 w-3/4 rounded mb-2" />
          <SkeletonBlock className="h-3 w-1/2 rounded" />
        </View>
        <View className="w-[48%] rounded-3xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-6 items-center">
          <SkeletonBlock className="h-10 w-10 rounded-2xl mb-3" />
          <SkeletonBlock className="h-4 w-3/4 rounded mb-2" />
          <SkeletonBlock className="h-3 w-1/2 rounded" />
        </View>
      </View>
      {/* Mode Switcher Skeleton */}
      <View className="rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-2 mb-6">
        <SkeletonBlock className="h-10 w-full rounded-xl" />
      </View>
      {/* Schedule Header + Cards */}
      <SkeletonBlock className="h-4 w-1/3 rounded mb-3" />
      <View style={{ gap: 12 }}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <View key={`teach-sched-skel-${idx}`} className="rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-4 flex-row items-center">
            <SkeletonBlock className="h-12 w-12 rounded-xl mr-4" />
            <View className="flex-1">
              <SkeletonBlock className="h-4 w-1/2 rounded mb-2" />
              <SkeletonBlock className="h-3 w-3/4 rounded" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const StudentDashboardSkeleton = ({ loading = true, label = "Loading student portal...", showAfter = 200, minVisible = 300 }: BaseSkeletonProps) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }} className="p-5 pt-4">
      <LoadingA11y label={label} />
      {/* Top action row */}
      <View className="flex-row justify-end mb-4">
        <SkeletonBlock className="h-8 w-24 rounded-xl" />
      </View>
      {/* Metric Cards Row */}
      <View className="flex-row mb-6" style={{ gap: 12 }}>
        <View className="flex-1 rounded-3xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-5">
          <SkeletonBlock className="h-5 w-5 rounded-lg mb-3" />
          <SkeletonBlock className="h-8 w-1/2 rounded mb-2" />
          <SkeletonBlock className="h-3 w-3/4 rounded" />
        </View>
        <View className="flex-1 rounded-3xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-5">
          <SkeletonBlock className="h-5 w-5 rounded-lg mb-3" />
          <SkeletonBlock className="h-8 w-1/2 rounded mb-2" />
          <SkeletonBlock className="h-3 w-3/4 rounded" />
        </View>
      </View>
      {/* Today's Classes Skeleton */}
      <SkeletonBlock className="h-4 w-1/3 rounded mb-3" />
      <View className="flex-row mb-6" style={{ gap: 12 }}>
        <View className="w-52 rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-4">
          <SkeletonBlock className="h-3 w-2/3 rounded mb-2" />
          <SkeletonBlock className="h-5 w-4/5 rounded mb-2" />
          <SkeletonBlock className="h-3 w-1/2 rounded" />
        </View>
        <View className="w-52 rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-4">
          <SkeletonBlock className="h-3 w-2/3 rounded mb-2" />
          <SkeletonBlock className="h-5 w-4/5 rounded mb-2" />
          <SkeletonBlock className="h-3 w-1/2 rounded" />
        </View>
      </View>
      {/* Quick Actions Grid */}
      <SkeletonBlock className="h-4 w-1/3 rounded mb-3" />
      <View className="flex-row flex-wrap justify-between">
        {Array.from({ length: 6 }).map((_, idx) => (
          <View key={`stud-qa-skel-${idx}`} className="w-[31%] rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-4 mb-3 items-center">
            <SkeletonBlock className="h-6 w-6 rounded-xl mb-2" />
            <SkeletonBlock className="h-3 w-3/4 rounded" />
          </View>
        ))}
      </View>
    </View>
  );
};

export const ParentDashboardSkeleton = ({ loading = true, label = "Loading parent portal...", showAfter = 200, minVisible = 300 }: BaseSkeletonProps) => {
  const visible = shouldRender(loading, showAfter, minVisible);
  if (!visible) return null;
  return (
    <View accessibilityRole="progressbar" accessibilityState={{ busy: true }} className="p-5 pt-4">
      <LoadingA11y label={label} />
      {/* Child selector pill row */}
      <View className="flex-row mb-6" style={{ gap: 10 }}>
        <SkeletonBlock className="h-10 w-28 rounded-full" />
        <SkeletonBlock className="h-10 w-28 rounded-full" />
      </View>
      {/* Active Child Summary Card */}
      <View className="rounded-3xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-6 mb-6">
        <View className="flex-row items-center mb-4">
          <SkeletonBlock className="h-12 w-12 rounded-full mr-4" />
          <View className="flex-1">
            <SkeletonBlock className="h-5 w-1/2 rounded mb-2" />
            <SkeletonBlock className="h-3 w-1/3 rounded" />
          </View>
        </View>
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="flex-1 rounded-2xl bg-[#EAEEF2] dark:bg-[#21262D] p-3">
            <SkeletonBlock className="h-3 w-1/2 rounded mb-2" />
            <SkeletonBlock className="h-6 w-3/4 rounded" />
          </View>
          <View className="flex-1 rounded-2xl bg-[#EAEEF2] dark:bg-[#21262D] p-3">
            <SkeletonBlock className="h-3 w-1/2 rounded mb-2" />
            <SkeletonBlock className="h-6 w-3/4 rounded" />
          </View>
        </View>
      </View>
      {/* Quick Actions Skeleton */}
      <SkeletonBlock className="h-4 w-1/3 rounded mb-3" />
      <View className="flex-row flex-wrap justify-between">
        {Array.from({ length: 4 }).map((_, idx) => (
          <View key={`parent-qa-skel-${idx}`} className="w-[48.5%] rounded-2xl border border-[#D0D7DE] dark:border-[#21262D] bg-[#F6F8FA] dark:bg-[#161B22] p-4 mb-3 flex-row items-center">
            <SkeletonBlock className="h-8 w-8 rounded-xl mr-3" />
            <SkeletonBlock className="h-4 flex-1 rounded" />
          </View>
        ))}
      </View>
    </View>
  );
};

