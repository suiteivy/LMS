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
