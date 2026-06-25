import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/libs/supabase";
import { ChatMessage, ChatService, ConversationSummary } from "@/services/ChatService";
import { MessageService } from "@/services/MessageService";
import { groupMessagesByDate, isDateSeparator } from "@/utils/chatDateGrouping";
import { Spinner } from "@/components/ui/Spinner";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Alert, Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { AlertCircle, Check, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock3, MessageCircle, MoreVertical, Plus, Search, Send, User } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Screen = "list" | "thread" | "compose";

interface DirectChatViewProps {
  allowedContactRoles: string[];
  searchPlaceholder?: string;
  emptyListTitle?: string;
  compact?: boolean;
  externalRefreshToken?: number;
  externalComposeToken?: number;
}

const formatTime = (dateStr?: string | null) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (diff < 86400000) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getAvatarUri = (avatarUrl?: string | null): string | null => {
  const raw = (avatarUrl || "").trim();
  if (!raw) return null;

  if (/^(https?:|data:|file:|blob:)/i.test(raw)) {
    return raw;
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(raw);
  return data?.publicUrl || null;
};

const getInitial = (name?: string | null) => {
  const trimmed = (name || "").trim();
  return (trimmed.charAt(0) || "U").toUpperCase();
};

const getConversationExpiryLabel = (expiresAt?: string | null) => {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  const totalDays = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (totalDays <= 0) return "Expires today";
  if (totalDays === 1) return "Expires in 1 day";
  return `Expires in ${totalDays} days`;
};

type DerivedMessageStatus = "pending" | "failed" | "sent" | "delivered" | "read" | null;

const deriveMessageStatus = (
  message: ChatMessage,
  partnerLastDeliveredAt?: string | null,
  partnerLastReadAt?: string | null
): DerivedMessageStatus => {
  if (message.deleted_for_everyone_at) return null;
  if (message.local_status === "pending") return "pending";
  if (message.local_status === "failed") return "failed";

  if (partnerLastReadAt && message.created_at) {
    if (new Date(partnerLastReadAt).getTime() >= new Date(message.created_at).getTime()) {
      return "read";
    }
  }

  if (partnerLastDeliveredAt && message.created_at) {
    if (new Date(partnerLastDeliveredAt).getTime() >= new Date(message.created_at).getTime()) {
      return "delivered";
    }
  }

  return "sent";
};

const sortMessagesByCreatedAt = (messages: ChatMessage[]) => {
  return [...messages].sort((a, b) => {
    const at = new Date(a.created_at).getTime();
    const bt = new Date(b.created_at).getTime();
    if (at === bt) return a.id.localeCompare(b.id);
    return at - bt;
  });
};

const mergeMessagesUnique = (messages: ChatMessage[]) => {
  const byId = new Map<string, ChatMessage>();
  for (const message of messages) {
    byId.set(message.id, message);
  }
  return sortMessagesByCreatedAt(Array.from(byId.values()));
};

export function DirectChatView({
  allowedContactRoles,
  searchPlaceholder = "Search contacts...",
  emptyListTitle = "No conversations yet",
  compact = false,
  externalRefreshToken,
  externalComposeToken,
}: DirectChatViewProps) {
  const { profile, user } = useAuth();
  const isFocused = useIsFocused();

  const [screen, setScreen] = useState<Screen>("list");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationSearch, setConversationSearch] = useState("");

  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [typingText, setTypingText] = useState<string>("");

  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showNewMessagePill, setShowNewMessagePill] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [startingChat, setStartingChat] = useState(false);

  const horizontalPaddingClass = compact ? "px-3" : "px-4";

  const scrollRef = useRef<ScrollView | null>(null);
  const typingTimerRef = useRef<any>(null);
  const typingResetRef = useRef<any>(null);
  const deliveryAckTimerRef = useRef<any>(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const contactsLoadedRef = useRef(false);
  const lastExternalRefreshTokenRef = useRef<number | undefined>(externalRefreshToken);
  const lastExternalComposeTokenRef = useRef<number | undefined>(externalComposeToken);
  const autoRetryTimersRef = useRef<Map<string, any>>(new Map());
  const retryAttemptsRef = useRef<Map<string, number>>(new Map());

  const AUTO_RETRY_DELAYS_MS = [2000, 5000, 10000];

  const canUse = Boolean(profile?.id && profile?.institution_id);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id || null;
  }, [selectedConversation?.id]);

  const fetchConversations = useCallback(async () => {
    if (!canUse || !isFocused) return;
    try {
      const rows = await ChatService.listConversations();
      setConversations(rows || []);
      const selectedId = selectedConversationIdRef.current;
      if (selectedId) {
        const latest = (rows || []).find((c: ConversationSummary) => c.id === selectedId) || null;
        setSelectedConversation((prev) => {
          if (!prev || prev.id !== selectedId) return prev;
          return latest;
        });
      }
    } catch (error) {
      console.error("Failed to fetch conversations", error);
    }
  }, [canUse, isFocused]);

  const loadInitial = useCallback(async () => {
    if (!canUse || !isFocused) {
      setLoading(false);
      return;
    }
    setLoading(true);
    await fetchConversations();
    setLoading(false);
  }, [canUse, fetchConversations, isFocused]);

  const loadMessages = useCallback(
    async (conversationId: string, reset = true) => {
      if (!conversationId) return;
      if (reset) {
        setCursor(null);
        setMessages([]);
      }
      const data = await ChatService.listMessages(conversationId, reset ? undefined : cursor || undefined, 30);
      if (reset) {
        setMessages(sortMessagesByCreatedAt(data.messages || []));
      } else {
        setMessages((prev) => mergeMessagesUnique([...(data.messages || []), ...prev]));
      }
      setHasMore(Boolean(data.hasMore));
      setCursor(data.nextCursor || null);
    },
    [cursor]
  );

  const scheduleAcknowledgeDelivery = useCallback(
    (conversationId: string) => {
      if (deliveryAckTimerRef.current) {
        clearTimeout(deliveryAckTimerRef.current);
      }
      deliveryAckTimerRef.current = setTimeout(() => {
        ChatService.acknowledgeDelivery(conversationId).catch(() => {});
      }, 250);
    },
    []
  );

  const loadMoreHistory = async () => {
    if (!selectedConversation?.id || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadMessages(selectedConversation.id, false);
    } catch (error) {
      console.error("Failed to load older messages", error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isFocused) return;
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!isFocused || !selectedConversation?.id) return;
    loadMessages(selectedConversation.id, true).catch((e) => console.error(e));
    ChatService.markConversationRead(selectedConversation.id).catch(() => {});
  }, [selectedConversation?.id, isFocused]);

  useEffect(() => {
    return () => {
      if (deliveryAckTimerRef.current) {
        clearTimeout(deliveryAckTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isFocused || !selectedConversation?.id) return;

    const channel = supabase
      .channel(`conversation-stream-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload: any) => {
          const incoming = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return mergeMessagesUnique([...prev, incoming]);
          });
          if (incoming.sender_id && incoming.sender_id !== profile?.id) {
            scheduleAcknowledgeDelivery(selectedConversation.id);
          }
          if (isNearBottom) {
            requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
          } else {
            setShowNewMessagePill(true);
          }
          fetchConversations().catch(() => {});
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload: any) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
          fetchConversations().catch(() => {});
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload: any) => {
          const updatedParticipant = payload.new as {
            user_id?: string;
            last_read_at?: string | null;
            last_delivered_at?: string | null;
          };

          if (!updatedParticipant?.user_id || updatedParticipant.user_id === profile?.id) {
            return;
          }

          setSelectedConversation((prev) => {
            if (!prev || prev.id !== selectedConversation.id) return prev;
            return {
              ...prev,
              partner_last_read_at: updatedParticipant.last_read_at ?? prev.partner_last_read_at ?? null,
              partner_last_delivered_at:
                updatedParticipant.last_delivered_at ?? prev.partner_last_delivered_at ?? null,
            };
          });
          fetchConversations().catch(() => {});
        }
      )
      .subscribe();

    const typingChannel = supabase.channel(`conversation:${selectedConversation.id}`, {
      config: {
        broadcast: { self: true },
      },
    });

    typingChannel
      .on("broadcast", { event: "typing" }, (payload: any) => {
        if (!payload?.payload) return;
        const typingUserId = payload.payload.userId;
        if (!typingUserId || typingUserId === profile?.id) return;
        setTypingText(payload.payload.typing ? "Typing..." : "");
        if (typingResetRef.current) clearTimeout(typingResetRef.current);
        typingResetRef.current = setTimeout(() => setTypingText(""), 2000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(typingChannel);
    };
  }, [selectedConversation?.id, fetchConversations, isFocused, profile?.id, scheduleAcknowledgeDelivery]);

  useEffect(() => {
    if (!isFocused) return;
    const listChannel = supabase
      .channel("conversations-list-sync")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchConversations().catch(() => {});
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        fetchConversations().catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(listChannel);
    };
  }, [fetchConversations, isFocused]);

  const filteredConversations = useMemo(() => {
    const sorted = [...conversations].sort((a, b) => {
      const at = new Date(a.last_message_at || a.created_at).getTime();
      const bt = new Date(b.last_message_at || b.created_at).getTime();
      return bt - at;
    });

    const q = conversationSearch.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => {
      const name = c.partner?.full_name?.toLowerCase() || "";
      const preview = c.last_message?.content?.toLowerCase() || "";
      return name.includes(q) || preview.includes(q);
    });
  }, [conversations, conversationSearch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    if (selectedConversation?.id) {
      await loadMessages(selectedConversation.id, true);
    }
    setRefreshing(false);
  }, [fetchConversations, loadMessages, selectedConversation?.id]);

  useEffect(() => {
    if (externalRefreshToken === undefined) return;
    if (lastExternalRefreshTokenRef.current === externalRefreshToken) return;
    lastExternalRefreshTokenRef.current = externalRefreshToken;
    onRefresh().catch(() => {});
  }, [externalRefreshToken, onRefresh]);

  useEffect(() => {
    if (!isFocused) return;
    if (externalComposeToken === undefined) return;
    if (lastExternalComposeTokenRef.current === externalComposeToken) return;
    lastExternalComposeTokenRef.current = externalComposeToken;

    setScreen("compose");
    setSelectedContact(null);
    setContactSearch("");
  }, [externalComposeToken, isFocused]);

  const fetchContacts = useCallback(async () => {
    if (!isFocused) return;
    setLoadingContacts(true);
    try {
      const uniqueRoles = Array.from(new Set(allowedContactRoles));
      const responses = await Promise.all(uniqueRoles.map((role) => MessageService.searchUsers("", role)));
      const flat = responses.flatMap((r) => r || []);
      const map = new Map<string, any>();
      for (const row of flat) {
        if (!row?.id) continue;
        if (row.id === profile?.id) continue;
        if (!allowedContactRoles.includes(row.role)) continue;
        map.set(row.id, row);
      }
      setContacts(Array.from(map.values()));
      contactsLoadedRef.current = true;
    } catch (error) {
      console.error("Failed to load contacts", error);
    } finally {
      setLoadingContacts(false);
    }
  }, [allowedContactRoles, isFocused, profile?.id]);

  useEffect(() => {
    if (screen === "compose" && !contactsLoadedRef.current) {
      fetchContacts().catch(() => {});
    }
  }, [screen, fetchContacts]);

  useEffect(() => {
    if (isFocused) return;

    if (deliveryAckTimerRef.current) {
      clearTimeout(deliveryAckTimerRef.current);
    }
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    if (typingResetRef.current) {
      clearTimeout(typingResetRef.current);
    }

    autoRetryTimersRef.current.forEach((t) => clearTimeout(t));
    autoRetryTimersRef.current.clear();
    retryAttemptsRef.current.clear();

    setScreen("list");
    setSelectedConversation(null);
    setMessages([]);
    setMessageInput("");
    setEditingMessageId(null);
    setTypingText("");
    setShowNewMessagePill(false);
  }, [isFocused]);

  const displayedContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => (c.full_name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q));
  }, [contacts, contactSearch]);

  const failedOutgoingMessages = useMemo(
    () => messages.filter((m) => m.sender_id === profile?.id && m.local_status === "failed"),
    [messages, profile?.id]
  );

  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

  const sendTypingSignal = (typing: boolean) => {
    if (!selectedConversation?.id || !profile?.id) return;
    const channel = supabase.channel(`conversation:${selectedConversation.id}`);
    channel
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.send({
            type: "broadcast",
            event: "typing",
            payload: { userId: profile.id, typing },
          });
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 50);
        }
      });
  };

  const handleInputChanged = (text: string) => {
    setMessageInput(text);
    if (!selectedConversation?.id) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    sendTypingSignal(true);
    typingTimerRef.current = setTimeout(() => sendTypingSignal(false), 1500);
  };

  const handleSend = async () => {
    if (!selectedConversation?.id || !messageInput.trim() || sending) return;
    const payload = messageInput.trim();
    let optimisticId: string | null = null;
    setSending(true);

    try {
      if (editingMessageId) {
        const updated = await ChatService.editMessage(editingMessageId, payload);
        setMessages((prev) => prev.map((m) => (m.id === editingMessageId ? { ...m, ...updated } : m)));
        setEditingMessageId(null);
      } else {
        const clientRequestId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        optimisticId = `temp-${clientRequestId}`;
        const optimistic: ChatMessage = {
          id: optimisticId,
          conversation_id: selectedConversation.id,
          sender_id: profile?.id || "",
          content: payload,
          created_at: new Date().toISOString(),
          client_request_id: clientRequestId,
          local_status: "pending",
        };
        setMessages((prev) => [...prev, optimistic]);
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

        const created = await ChatService.sendMessage(selectedConversation.id, payload, clientRequestId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticId || (m.local_status === "pending" && m.client_request_id === clientRequestId)
              ? created
              : m
          )
        );
      }

      setMessageInput("");
      sendTypingSignal(false);
      await fetchConversations();
    } catch (error: any) {
      console.error("Failed to send message", error);
      if (!editingMessageId) {
        setMessages((prev) =>
          prev.map((m) =>
            optimisticId && m.id === optimisticId && m.local_status === "pending"
              ? {
                  ...m,
                  local_status: "failed",
                }
              : m
          )
        );
      }
      Alert.alert("Message failed", error?.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  const handleMessageAction = (message: ChatMessage) => {
    const isOwn = message.sender_id === profile?.id;
    const options = ["Cancel"] as string[];
    const handlers: Record<string, () => void> = {};

    if (isOwn && !message.deleted_for_everyone_at) {
      options.push("Edit");
      handlers.Edit = () => {
        setEditingMessageId(message.id);
        setMessageInput(message.content || "");
      };
    }

    options.push("Delete for me");
    handlers["Delete for me"] = async () => {
      try {
        await ChatService.deleteMessageForMe(message.id);
        setMessages((prev) => prev.filter((m) => m.id !== message.id));
      } catch (error: any) {
        Alert.alert("Delete failed", error?.message || "Unable to hide message.");
      }
    };

    if (isOwn && !message.deleted_for_everyone_at) {
      options.push("Delete for everyone");
      handlers["Delete for everyone"] = async () => {
        try {
          await ChatService.deleteMessageForEveryone(message.id);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === message.id
                ? {
                    ...m,
                    content: "This message was deleted",
                    deleted_for_everyone_at: new Date().toISOString(),
                    is_deleted_for_everyone: true,
                  }
                : m
            )
          );
        } catch (error: any) {
          const msg = error?.response?.data?.error || error?.message || "Unable to delete for everyone.";
          Alert.alert("Delete for everyone failed", msg);
        }
      };
    }

    Alert.alert(
      "Message actions",
      "Choose an action",
      options.map((opt) => ({
        text: opt,
        style: (opt === "Cancel" ? "cancel" : "default") as "cancel" | "default",
        onPress: handlers[opt],
      }))
    );
  };

  const openConversation = async (conversation: ConversationSummary) => {
    setSelectedConversation(conversation);
    setScreen("thread");
    setShowNewMessagePill(false);
    await ChatService.acknowledgeDelivery(conversation.id).catch(() => {});
    await ChatService.markConversationRead(conversation.id).catch(() => {});
    await fetchConversations();
  };

  const startWithContact = async () => {
    if (!selectedContact?.id || startingChat) return;
    setStartingChat(true);
    try {
      const started = await ChatService.startConversation(selectedContact.id);
      const id = started?.conversation?.id;
      if (!id) throw new Error("Conversation creation failed.");

      const immediateConversation: ConversationSummary = {
        id,
        type: "DIRECT",
        institution_id: started?.conversation?.institution_id || profile?.institution_id || "",
        created_at: started?.conversation?.created_at || new Date().toISOString(),
        last_message_at: started?.conversation?.last_message_at || null,
        unread_count: 0,
        partner: {
          id: selectedContact.id,
          full_name: selectedContact.full_name,
          avatar_url: selectedContact.avatar_url || null,
          role: selectedContact.role,
        },
        last_message: null,
      };

      setSelectedConversation(immediateConversation);
      setScreen("thread");

      await fetchConversations();
      const latest = await ChatService.listConversations();
      const found = (latest || []).find((c: ConversationSummary) => c.id === id) || null;
      if (found) {
        setSelectedConversation(found);
      }
      setSelectedContact(null);
      setContactSearch("");
    } catch (error: any) {
      Alert.alert("Unable to start chat", error?.response?.data?.error || error?.message || "Could not start conversation.");
    } finally {
      setStartingChat(false);
    }
  };

  const deleteChat = async () => {
    if (!selectedConversation?.id) return;
    Alert.alert("Chat options", "Choose what to remove.", [
      {
        text: "Clear messages (for me)",
        onPress: async () => {
          try {
            await ChatService.clearConversationForMe(selectedConversation.id);
            setMessages([]);
            await fetchConversations();
          } catch (error: any) {
            Alert.alert("Clear failed", error?.message || "Could not clear messages.");
          }
        },
      },
      {
        text: "Delete chat from list",
        style: "destructive",
        onPress: async () => {
          try {
            await ChatService.deleteConversation(selectedConversation.id);
            setScreen("list");
            setSelectedConversation(null);
            setMessages([]);
            await fetchConversations();
          } catch (error: any) {
            Alert.alert("Delete failed", error?.message || "Could not delete chat.");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const retryFailedMessage = async (message: ChatMessage) => {
    if (!selectedConversation?.id) return;
    try {
      autoRetryTimersRef.current.get(message.id) && clearTimeout(autoRetryTimersRef.current.get(message.id));
      autoRetryTimersRef.current.delete(message.id);

      const existingClientRequestId = message.client_request_id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                client_request_id: existingClientRequestId,
                local_status: "pending",
              }
            : m
        )
      );

      const created = await ChatService.sendMessage(selectedConversation.id, message.content || "", existingClientRequestId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id || (m.local_status === "pending" && m.client_request_id === existingClientRequestId)
            ? created
            : m
        )
      );
      await fetchConversations();
      retryAttemptsRef.current.delete(message.id);
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                local_status: "failed",
              }
            : m
        )
      );

      const attempt = (retryAttemptsRef.current.get(message.id) || 0) + 1;
      retryAttemptsRef.current.set(message.id, attempt);

      if (attempt <= AUTO_RETRY_DELAYS_MS.length) {
        const delay = AUTO_RETRY_DELAYS_MS[attempt - 1];
        const timer = setTimeout(() => {
          const latest = messages.find((m) => m.id === message.id);
          if (!latest || latest.local_status !== "failed") return;
          retryFailedMessage(latest).catch(() => {});
        }, delay);
        autoRetryTimersRef.current.set(message.id, timer);
      }
    }
  };

  useEffect(() => {
    if (!selectedConversation?.id) return;

    failedOutgoingMessages.forEach((msg) => {
      if (autoRetryTimersRef.current.has(msg.id)) return;

      const attempt = retryAttemptsRef.current.get(msg.id) || 0;
      if (attempt >= AUTO_RETRY_DELAYS_MS.length) return;

      const delay = AUTO_RETRY_DELAYS_MS[attempt];
      const timer = setTimeout(() => {
        const latest = messages.find((m) => m.id === msg.id);
        if (!latest || latest.local_status !== "failed") return;
        retryFailedMessage(latest).catch(() => {});
      }, delay);

      autoRetryTimersRef.current.set(msg.id, timer);
    });

    autoRetryTimersRef.current.forEach((timer, messageId) => {
      const stillFailed = failedOutgoingMessages.some((m) => m.id === messageId);
      if (!stillFailed) {
        clearTimeout(timer);
        autoRetryTimersRef.current.delete(messageId);
        retryAttemptsRef.current.delete(messageId);
      }
    });
  }, [failedOutgoingMessages, messages, selectedConversation?.id]);

  const retryAllFailedMessages = async () => {
    if (!failedOutgoingMessages.length) return;
    for (const failed of failedOutgoingMessages) {
      await retryFailedMessage(failed);
    }
  };

  const renderStatusIndicator = (status: DerivedMessageStatus, onRetry: () => void) => {
    if (!status) return null;
    if (status === "pending") {
      return <Clock3 size={11} color="rgba(255,255,255,0.7)" />;
    }
    if (status === "sent") {
      return <Check size={12} color="rgba(255,255,255,0.7)" />;
    }
    if (status === "delivered") {
      return <CheckCheck size={12} color="rgba(255,255,255,0.7)" />;
    }
    if (status === "read") {
      return <CheckCheck size={12} color="#86EFAC" />;
    }
    return (
      <TouchableOpacity onPress={onRetry} className="ml-1">
        <AlertCircle size={12} color="#FCA5A5" />
      </TouchableOpacity>
    );
  };

  const renderThread = () => {
    const partnerReadAt = selectedConversation?.partner_last_read_at as string | null | undefined;
    const partnerDeliveredAt = selectedConversation?.partner_last_delivered_at as string | null | undefined;
    const selectedPartnerAvatarUri = getAvatarUri(selectedConversation?.partner?.avatar_url);
    return (
      <View className="flex-1">
        <View className={`${horizontalPaddingClass} mt-3 mb-2`}>
          <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-navy-surface rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                setScreen("list");
                setSelectedConversation(null);
                setMessages([]);
                setMessageInput("");
                setEditingMessageId(null);
              }}
              className="mr-3 w-8 h-8 rounded-lg items-center justify-center bg-gray-100 dark:bg-gray-800"
            >
              <ChevronLeft size={16} color="#6B7280" />
            </TouchableOpacity>
            {selectedPartnerAvatarUri ? (
              <Image
                source={{ uri: selectedPartnerAvatarUri }}
                className="w-9 h-9 rounded-xl mr-3"
                resizeMode="cover"
              />
            ) : (
              <View className="w-9 h-9 rounded-xl mr-3 items-center justify-center bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                <Text className="text-gray-700 dark:text-gray-200 font-bold text-xs">
                  {getInitial(selectedConversation?.partner?.full_name)}
                </Text>
              </View>
            )}
            <View>
            <Text className="text-gray-900 dark:text-white font-bold text-base">{selectedConversation?.partner?.full_name || "Conversation"}</Text>
            <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest">
              {typingText || (selectedConversation?.partner?.role || "DIRECT")}
            </Text>
            {selectedConversation?.expires_at ? (
              <Text className="text-amber-600 dark:text-amber-400 text-[9px] font-bold uppercase tracking-widest mt-1">
                {getConversationExpiryLabel(selectedConversation.expires_at)}
              </Text>
            ) : null}
            </View>
          </View>
          <TouchableOpacity onPress={deleteChat} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
            <MoreVertical size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
        </View>

        <View className={`flex-1 ${horizontalPaddingClass} mb-2`}>
          <View className="flex-1 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0D0A28] shadow-sm overflow-hidden">
            <ScrollView
              ref={scrollRef}
              className="flex-1 px-3"
              contentContainerStyle={{ paddingVertical: 12, paddingBottom: 28 }}
          onScroll={(e) => {
            const y = e.nativeEvent.contentOffset.y;
            const { contentSize, layoutMeasurement } = e.nativeEvent;
            const distanceFromBottom = contentSize.height - (y + layoutMeasurement.height);
            setIsNearBottom(distanceFromBottom < 80);
            if (y <= 24) {
              loadMoreHistory();
            }
          }}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (isNearBottom) {
              requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
            }
          }}
            >
              {loadingMore ? <Spinner size="small" color="#FF6900" className="py-2" label="Loading older messages" /> : null}

              {groupedMessages.map((item) => {
                if (isDateSeparator(item)) {
                  return (
                    <View key={item.id} className="items-center my-2">
                      <View className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
                        <Text className="text-[9px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">
                          {item.label}
                        </Text>
                      </View>
                    </View>
                  );
                }

                const m = item;
                const own = m.sender_id === profile?.id;
                const status = own ? deriveMessageStatus(m, partnerDeliveredAt, partnerReadAt) : null;
                return (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.8}
                    onLongPress={() => handleMessageAction(m)}
                    className={`max-w-[80%] px-4 py-3 rounded-2xl mb-2 ${own ? "self-end bg-[#FF6900]" : "self-start bg-white dark:bg-navy-surface border border-gray-100 dark:border-gray-800"}`}
                  >
                    <View className="flex-row items-start">
                      <Text className={`flex-1 ${own ? "text-white" : "text-gray-900 dark:text-white"} text-sm`}>{m.content}</Text>
                      <TouchableOpacity onPress={() => handleMessageAction(m)} className="ml-2 p-1" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MoreVertical size={13} color={own ? "rgba(255,255,255,0.8)" : "#9CA3AF"} />
                      </TouchableOpacity>
                    </View>
                    <View className="flex-row items-center justify-end mt-1 gap-1">
                      {m.edited_at ? <Text className={`${own ? "text-white/70" : "text-gray-400"} text-[9px] font-bold uppercase`}>edited</Text> : null}
                      <Text className={`${own ? "text-white/80" : "text-gray-400"} text-[9px] font-bold`}>{formatTime(m.created_at)}</Text>
                      {own ? renderStatusIndicator(status, () => retryFailedMessage(m)) : null}
                    </View>
                    {own && status === "failed" ? (
                      <TouchableOpacity
                        onPress={() => retryFailedMessage(m)}
                        className="mt-2 self-end bg-white/20 px-2 py-1 rounded-lg"
                      >
                        <Text className="text-white text-[9px] font-bold uppercase tracking-widest">Retry send</Text>
                      </TouchableOpacity>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {showNewMessagePill ? (
          <TouchableOpacity
            className="self-center mb-2 px-4 py-2 rounded-full bg-gray-900 dark:bg-[#FF6900]"
            onPress={() => {
              setShowNewMessagePill(false);
              scrollRef.current?.scrollToEnd({ animated: true });
            }}
          >
            <Text className="text-white text-[10px] font-bold uppercase tracking-widest">New messages</Text>
          </TouchableOpacity>
        ) : null}

        {editingMessageId ? (
          <View className="px-4 py-2 bg-orange-50 dark:bg-orange-950/20 border-t border-orange-100 dark:border-orange-900">
            <View className="flex-row items-center justify-between">
              <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-widest">Editing message</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingMessageId(null);
                  setMessageInput("");
                }}
              >
                <Text className="text-[#FF6900] font-bold text-[10px] uppercase tracking-widest">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {failedOutgoingMessages.length > 0 ? (
          <View className={`${horizontalPaddingClass} py-2 bg-red-50 dark:bg-red-950/20 border-t border-red-100 dark:border-red-900 flex-row items-center justify-between`}>
            <Text className="text-red-600 dark:text-red-300 text-[10px] font-bold uppercase tracking-widest">
              {failedOutgoingMessages.length} message{failedOutgoingMessages.length > 1 ? "s" : ""} failed
            </Text>
            <TouchableOpacity onPress={retryAllFailedMessages} className="bg-red-600 px-3 py-1 rounded-lg">
              <Text className="text-white text-[10px] font-bold uppercase tracking-widest">Retry all</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View className={`${horizontalPaddingClass} pb-3`}>
          <View className="flex-row items-end bg-white dark:bg-navy-surface rounded-2xl border border-gray-100 dark:border-gray-800 p-2 shadow-sm">
            <TextInput
              className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm border border-gray-100 dark:border-gray-800"
              placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
              placeholderTextColor="#9CA3AF"
              value={messageInput}
              onChangeText={handleInputChanged}
              multiline
              textAlignVertical="top"
              style={{ maxHeight: 140 }}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!messageInput.trim() || sending}
              accessibilityState={{ disabled: !messageInput.trim() || sending, busy: false }}
              className="ml-2 w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: !messageInput.trim() || sending ? "#9CA3AF" : "#FF6900" }}
            >
               <Send size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderCompose = () => (
    <View className={`flex-1 ${horizontalPaddingClass}`}>
      <View className="mt-3 mb-4 bg-white dark:bg-navy-surface border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
        <View className="flex-row items-center bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-800">
          <Search size={16} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-gray-900 dark:text-white text-xs font-semibold"
            placeholder={searchPlaceholder}
            placeholderTextColor="#9CA3AF"
            value={contactSearch}
            onChangeText={setContactSearch}
          />
        </View>
        <View className="mt-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-xl px-3 py-2">
          <Text className="text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-widest">
            Chats auto-delete after 7 days of inactivity.
          </Text>
        </View>
      </View>

      {loadingContacts ? (
        <Spinner size="small" color="#FF6900" className="py-4" label="Loading contacts" />
      ) : (
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {(displayedContacts || []).map((c) => {
            const chosen = selectedContact?.id === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                className={`flex-row items-center p-4 mb-2 rounded-2xl border ${chosen ? "border-orange-200 bg-orange-50/30 dark:border-orange-900 dark:bg-orange-950/10" : "border-gray-100 dark:border-gray-800 bg-white dark:bg-navy-surface"}`}
                onPress={() => setSelectedContact(c)}
              >
                <View className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/20 items-center justify-center mr-3">
                  <User size={18} color="#FF6900" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-bold text-sm">{c.full_name}</Text>
                  <Text className="text-gray-400 dark:text-gray-500 text-[9px] font-bold uppercase tracking-widest">{c.role}</Text>
                </View>
                {chosen ? <CheckCircle2 size={16} color="#10B981" /> : null}
              </TouchableOpacity>
            );
          })}

          {(displayedContacts || []).length === 0 ? (
            <View className="items-center py-8">
              <Text className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-[10px]">No contacts found</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <View className="py-3">
        <TouchableOpacity
          onPress={startWithContact}
          disabled={!selectedContact || startingChat}
          className="py-4 rounded-2xl items-center"
          style={{ backgroundColor: selectedContact && !startingChat ? "#FF6900" : "#9CA3AF" }}
        >
          {startingChat ? (
            <View className="flex-row items-center">
              <Spinner size="small" color="#FFFFFF" />
              <Text className="text-white font-bold text-sm uppercase tracking-widest ml-2">Starting chat...</Text>
            </View>
          ) : (
            <Text className="text-white font-bold text-sm uppercase tracking-widest">Start chat</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderList = () => (
    <View className={`flex-1 ${horizontalPaddingClass}`}>
      <View className="mt-3 mb-2 px-1">
        <Text className="text-gray-900 dark:text-white font-extrabold text-[11px] uppercase tracking-widest">Chats</Text>
      </View>

      <View className="mb-4 flex-row items-center bg-white dark:bg-navy-surface px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <Search size={18} color="#9CA3AF" />
        <TextInput
          className="flex-1 ml-2 text-gray-900 dark:text-white font-medium text-sm"
          placeholder="Search conversations..."
          placeholderTextColor="#9CA3AF"
          value={conversationSearch}
          onChangeText={setConversationSearch}
        />
        <TouchableOpacity
          onPress={() => setScreen("compose")}
          className="w-9 h-9 rounded-xl items-center justify-center bg-gray-900 dark:bg-[#FF6900] ml-2"
        >
          <Plus size={18} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6900"]} tintColor="#FF6900" />}
        contentContainerStyle={{ paddingBottom: 12 }}
      >
        {filteredConversations.length === 0 ? (
          <View className="bg-white dark:bg-navy-surface p-10 rounded-3xl items-center border border-gray-100 dark:border-gray-800 border-dashed shadow-sm">
            <MessageCircle size={46} color="#cbd5e1" />
            <Text className="text-gray-400 dark:text-gray-500 font-bold mt-4 text-center">{emptyListTitle}</Text>
          </View>
        ) : (
          filteredConversations.map((c) => {
            const partnerAvatarUri = getAvatarUri(c.partner?.avatar_url);
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => openConversation(c)}
                className="flex-row items-center p-4 rounded-2xl border mb-3 bg-white dark:bg-navy-surface border-gray-100 dark:border-gray-800 shadow-sm"
              >
                {partnerAvatarUri ? (
                  <Image
                    source={{ uri: partnerAvatarUri }}
                    className="w-11 h-11 rounded-2xl mr-3"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-11 h-11 rounded-2xl items-center justify-center mr-3 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                    <Text className="text-gray-700 dark:text-gray-200 font-bold text-sm">
                      {getInitial(c.partner?.full_name)}
                    </Text>
                  </View>
                )}
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-900 dark:text-white font-bold text-sm" numberOfLines={1}>
                      {c.partner?.full_name || "Unknown"}
                    </Text>
                    <Text className="text-gray-400 dark:text-gray-500 text-[9px] font-bold uppercase tracking-widest">
                      {formatTime(c.last_message_at || c.created_at)}
                    </Text>
                  </View>
                  <Text className="text-gray-400 dark:text-gray-500 text-[10px]" numberOfLines={1}>
                    {c.last_message
                      ? c.last_message.sender_id === profile?.id
                        ? "You"
                        : (c.partner?.full_name || "Contact")
                      : "No messages yet"}
                  </Text>
                  {c.expires_at ? (
                    <Text className="text-amber-600 dark:text-amber-400 text-[9px] font-bold uppercase tracking-widest mt-1" numberOfLines={1}>
                      {getConversationExpiryLabel(c.expires_at)}
                    </Text>
                  ) : null}
                </View>
                {c.unread_count > 0 ? (
                  <View className="bg-[#FF6900] px-2 py-1 rounded-full ml-2">
                    <Text className="text-white text-[9px] font-bold">{c.unread_count}</Text>
                  </View>
                ) : (
                  <View className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 items-center justify-center ml-2">
                    <ChevronRight size={14} color="#94A3B8" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View className="h-10" />
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View className={`flex-1 ${horizontalPaddingClass} pt-4`} accessibilityState={{ busy: true }}>
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {screen === "thread" ? renderThread() : screen === "compose" ? renderCompose() : renderList()}

      {screen !== "list" && screen !== "thread" ? (
        <View className="px-4 pb-3">
          <TouchableOpacity
            onPress={() => {
              setScreen("list");
              setSelectedContact(null);
              setContactSearch("");
            }}
            className="py-3 rounded-xl items-center bg-gray-100 dark:bg-gray-800"
          >
            <Text className="text-gray-700 dark:text-gray-200 text-[10px] font-bold uppercase tracking-widest">Back</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
