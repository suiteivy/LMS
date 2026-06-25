export type ChatMessageLike = {
  id: string;
  created_at: string;
};

export type DateSeparator = {
  type: "date-separator";
  id: string;
  dayKey: string;
  label: string;
  timestamp: string;
};

export type GroupedChatItem<T extends ChatMessageLike> = T | DateSeparator;

const DAY_MS = 24 * 60 * 60 * 1000;

const getDayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getLocalDayKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const formatChatDateLabel = (messageDate: Date, nowDate: Date = new Date()) => {
  const messageStart = getDayStart(messageDate);
  const nowStart = getDayStart(nowDate);
  const deltaDays = Math.floor((nowStart.getTime() - messageStart.getTime()) / DAY_MS);

  if (deltaDays === 0) return "Today";
  if (deltaDays === 1) return "Yesterday";
  if (deltaDays > 1 && deltaDays <= 6) {
    return new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(messageDate);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(messageDate);
};

export const groupMessagesByDate = <T extends ChatMessageLike>(
  messages: T[],
  nowDate: Date = new Date()
): GroupedChatItem<T>[] => {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const sorted = [...messages].sort((a, b) => {
    const at = new Date(a.created_at).getTime();
    const bt = new Date(b.created_at).getTime();
    if (at === bt) return a.id.localeCompare(b.id);
    return at - bt;
  });

  const output: GroupedChatItem<T>[] = [];
  let lastDayKey: string | null = null;

  for (const message of sorted) {
    const createdAt = new Date(message.created_at);
    const safeDate = Number.isNaN(createdAt.getTime()) ? nowDate : createdAt;
    const dayKey = getLocalDayKey(safeDate);

    if (dayKey !== lastDayKey) {
      output.push({
        type: "date-separator",
        id: `sep-${dayKey}`,
        dayKey,
        label: formatChatDateLabel(safeDate, nowDate),
        timestamp: safeDate.toISOString(),
      });
      lastDayKey = dayKey;
    }

    output.push(message);
  }

  return output;
};

export const isDateSeparator = <T extends ChatMessageLike>(
  item: GroupedChatItem<T>
): item is DateSeparator => {
  return (item as DateSeparator).type === "date-separator";
};
