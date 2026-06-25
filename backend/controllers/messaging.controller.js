const supabase = require("../utils/supabaseClient.js");

const ADMIN_ROLES = new Set(["admin", "master_admin", "school_admin", "platform_admin"]);
const DEFAULT_DELETE_FOR_EVERYONE_WINDOW_MINUTES = Number(process.env.MESSAGE_DELETE_FOR_EVERYONE_WINDOW_MINUTES || 15);
const DEFAULT_CONVERSATION_TTL_DAYS = Number(process.env.CHAT_CONVERSATION_TTL_DAYS || 7);

const normalizeRole = (role) => {
    if (!role) return "";
    if (role === "school_admin") return "admin";
    if (role === "platform_admin") return "master_admin";
    return role;
};

const canMessage = (senderRole, receiverRole) => {
    const sender = normalizeRole(senderRole);
    const receiver = normalizeRole(receiverRole);

    if (sender === "teacher") {
        return receiver === "teacher" || receiver === "parent" || ADMIN_ROLES.has(receiver);
    }

    if (sender === "parent") {
        return receiver === "teacher" || ADMIN_ROLES.has(receiver);
    }

    if (ADMIN_ROLES.has(sender)) {
        return receiver === "teacher" || receiver === "parent" || ADMIN_ROLES.has(receiver);
    }

    return true;
};

const DELETED_PLACEHOLDER = "This message was deleted";

const computeConversationExpiryIso = (baseDate = new Date()) => {
    const ttlMs = DEFAULT_CONVERSATION_TTL_DAYS * 24 * 60 * 60 * 1000;
    return new Date(baseDate.getTime() + ttlMs).toISOString();
};

const isConversationExpired = (conversation) => {
    if (!conversation?.expires_at) return false;
    const expiresAtMs = new Date(conversation.expires_at).getTime();
    return Number.isFinite(expiresAtMs) && Date.now() > expiresAtMs;
};

const cleanupExpiredConversations = async (institutionId) => {
    const nowIso = new Date().toISOString();
    let query = supabase
        .from("conversations")
        .delete()
        .lt("expires_at", nowIso);

    if (institutionId) {
        query = query.eq("institution_id", institutionId);
    }

    const { error } = await query;
    if (error && !String(error.message || "").toLowerCase().includes("does not exist")) {
        throw new Error(error.message);
    }
};

const isMessagingMigrationRequiredError = (errorMessage = "") => {
    const normalized = String(errorMessage).toLowerCase();
    if (!normalized.includes("does not exist")) return false;

    return (
        normalized.includes("last_delivered_at") ||
        normalized.includes("client_request_id") ||
        normalized.includes("direct_key")
    );
};

const handleMessagingSupabaseError = (res, error) => {
    if (isMessagingMigrationRequiredError(error?.message)) {
        return res.status(503).json({
            error: "Database migrations are required for messaging. Apply latest Supabase migrations and retry.",
            code: "DB_MIGRATION_REQUIRED",
        });
    }

    return res.status(500).json({ error: error.message });
};

const normalizeConversationMessageForUser = (message, userId) => {
    const hidden = Array.isArray(message.hidden_for_user_ids)
        ? message.hidden_for_user_ids.includes(userId)
        : false;
    if (hidden) return null;

    return {
        ...message,
        content: message.deleted_for_everyone_at ? DELETED_PLACEHOLDER : message.content,
        is_deleted_for_everyone: Boolean(message.deleted_for_everyone_at),
    };
};

const getConversationParticipant = async (conversationId, userId) => {
    const { data, error } = await supabase
        .from("conversation_participants")
        .select("id, conversation_id, user_id, deleted_at, last_read_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

const ensureConversationMembership = async (conversationId, userId, institutionId) => {
    const membership = await getConversationParticipant(conversationId, userId);
    if (!membership) return null;

    const { data: conversation, error } = await supabase
        .from("conversations")
        .select("id, institution_id, type, last_message_at, expires_at")
        .eq("id", conversationId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!conversation || conversation.institution_id !== institutionId) {
        return null;
    }

    if (isConversationExpired(conversation)) {
        await supabase
            .from("conversations")
            .delete()
            .eq("id", conversation.id)
            .eq("institution_id", institutionId);
        return null;
    }

    return { membership, conversation };
};

const computeDirectKey = (userA, userB) => {
    return [userA, userB].sort().join(":");
};

/**
 * Start or reuse a direct conversation between current user and other user.
 */
exports.startConversation = async (req, res) => {
    try {
        const { userId, institution_id, userRole } = req;
        const { otherUserId } = req.body;
        await cleanupExpiredConversations(institution_id);

        if (!otherUserId) {
            return res.status(400).json({ error: "otherUserId is required" });
        }

        if (otherUserId === userId) {
            return res.status(400).json({ error: "Cannot start a conversation with yourself" });
        }

        if (!institution_id) {
            return res.status(403).json({ error: "Institution context is required" });
        }

        const { data: otherUser, error: otherUserError } = await supabase
            .from("users")
            .select("id, role, institution_id, full_name, avatar_url")
            .eq("id", otherUserId)
            .maybeSingle();

        if (otherUserError || !otherUser) {
            return res.status(404).json({ error: "Other user not found" });
        }

        if (otherUser.institution_id !== institution_id) {
            return res.status(403).json({ error: "Cross-institution conversations are not allowed" });
        }

        if (!canMessage(userRole, otherUser.role)) {
            return res.status(403).json({ error: "Conversation between these roles is not allowed" });
        }

        const directKey = computeDirectKey(userId, otherUserId);
        const now = new Date().toISOString();
        const expiresAt = computeConversationExpiryIso(new Date());

        let conversation = null;

        const upsertResult = await supabase
            .from("conversations")
            .upsert(
                {
                    type: "DIRECT",
                    institution_id,
                    direct_key: directKey,
                    updated_at: now,
                    expires_at: expiresAt,
                },
                {
                    onConflict: "institution_id,direct_key",
                    ignoreDuplicates: false,
                }
            )
            .select("id, type, institution_id, direct_key, created_at, last_message_at")
                .single();

        if (upsertResult.error) {
            return handleMessagingSupabaseError(res, upsertResult.error);
        }

        conversation = upsertResult.data;

        const participantsUpsert = await supabase
            .from("conversation_participants")
            .upsert(
                [
                    {
                        conversation_id: conversation.id,
                        user_id: userId,
                        deleted_at: null,
                    },
                    {
                        conversation_id: conversation.id,
                        user_id: otherUserId,
                        deleted_at: null,
                    },
                ],
                { onConflict: "conversation_id,user_id", ignoreDuplicates: false }
            );

        if (participantsUpsert.error) {
            return handleMessagingSupabaseError(res, participantsUpsert.error);
        }

        return res.status(200).json({
            conversation,
            partner: {
                id: otherUser.id,
                full_name: otherUser.full_name,
                avatar_url: otherUser.avatar_url,
                role: otherUser.role,
            },
        });
    } catch (err) {
        console.error("startConversation error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * List direct conversations visible to the authenticated user.
 */
exports.listConversations = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        await cleanupExpiredConversations(institution_id);

        if (!institution_id) {
            return res.status(403).json({ error: "Institution context is required" });
        }

        const { data: ownParticipants, error: ownError } = await supabase
            .from("conversation_participants")
            .select(`
                conversation_id,
                deleted_at,
                last_read_at,
                last_delivered_at,
                conversation:conversation_id(id, institution_id, type, created_at, last_message_at, expires_at)
            `)
            .eq("user_id", userId);

        if (ownError) {
            return handleMessagingSupabaseError(res, ownError);
        }

        const scoped = (ownParticipants || []).filter((row) => {
            const c = row.conversation;
            return c && c.institution_id === institution_id && c.type === "DIRECT" && !isConversationExpired(c);
        });

        if (!scoped.length) {
            return res.status(200).json([]);
        }

        const conversationIds = scoped.map((row) => row.conversation_id);

        const { data: allParticipants, error: allParticipantsError } = await supabase
            .from("conversation_participants")
            .select(`
                conversation_id,
                user_id,
                last_read_at,
                last_delivered_at,
                user:user_id(id, full_name, avatar_url, role)
            `)
            .in("conversation_id", conversationIds);

        if (allParticipantsError) {
            return handleMessagingSupabaseError(res, allParticipantsError);
        }

        const participantsByConversation = new Map();
        for (const row of allParticipants || []) {
            const arr = participantsByConversation.get(row.conversation_id) || [];
            arr.push(row);
            participantsByConversation.set(row.conversation_id, arr);
        }

        const { data: unreadRows, error: unreadError } = await supabase
            .from("messages")
            .select("conversation_id, sender_id, created_at")
            .in("conversation_id", conversationIds)
            .neq("sender_id", userId)
            .order("created_at", { ascending: false });

        if (unreadError) {
            return handleMessagingSupabaseError(res, unreadError);
        }

        const unreadRowsByConversation = new Map();
        for (const row of unreadRows || []) {
            const arr = unreadRowsByConversation.get(row.conversation_id) || [];
            arr.push(row);
            unreadRowsByConversation.set(row.conversation_id, arr);
        }

        const { data: lastMessages, error: lastMessagesError } = await supabase
            .from("messages")
            .select("id, conversation_id, sender_id, content, created_at, edited_at, deleted_for_everyone_at, hidden_for_user_ids, client_request_id")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: false });

        if (lastMessagesError) {
            return handleMessagingSupabaseError(res, lastMessagesError);
        }

        const lastMessageByConversation = new Map();
        for (const msg of lastMessages || []) {
            if (!lastMessageByConversation.has(msg.conversation_id)) {
                lastMessageByConversation.set(msg.conversation_id, msg);
            }
        }

        const conversations = [];

        for (const ownRow of scoped) {
            const convo = ownRow.conversation;

            if (ownRow.deleted_at && convo.last_message_at && new Date(convo.last_message_at) > new Date(ownRow.deleted_at)) {
                await supabase
                    .from("conversation_participants")
                    .update({ deleted_at: null })
                    .eq("conversation_id", ownRow.conversation_id)
                    .eq("user_id", userId);
                ownRow.deleted_at = null;
            }

            if (ownRow.deleted_at) {
                continue;
            }

            const participants = participantsByConversation.get(ownRow.conversation_id) || [];
            const partnerParticipant = participants.find((p) => p.user_id !== userId) || null;
            const partner = partnerParticipant?.user || null;

            const lastMessageData = lastMessageByConversation.get(ownRow.conversation_id) || null;

            let unreadCount = 0;
            const unreadCandidates = unreadRowsByConversation.get(ownRow.conversation_id) || [];
            unreadCount = unreadCandidates.filter((m) => {
                if (!ownRow.last_read_at) return true;
                return new Date(m.created_at) > new Date(ownRow.last_read_at);
            }).length;

            conversations.push({
                id: convo.id,
                type: convo.type,
                institution_id: convo.institution_id,
                created_at: convo.created_at,
                last_message_at: convo.last_message_at,
                expires_at: convo.expires_at || null,
                last_read_at: ownRow.last_read_at,
                last_delivered_at: ownRow.last_delivered_at || null,
                unread_count: unreadCount,
                partner,
                partner_last_read_at: partnerParticipant?.last_read_at || null,
                partner_last_delivered_at: partnerParticipant?.last_delivered_at || null,
                last_message: lastMessageData ? normalizeConversationMessageForUser(lastMessageData, userId) : null,
            });
        }

        conversations.sort((a, b) => {
            const at = new Date(a.last_message_at || a.created_at).getTime();
            const bt = new Date(b.last_message_at || b.created_at).getTime();
            return bt - at;
        });

        return res.status(200).json(conversations);
    } catch (err) {
        console.error("listConversations error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * List conversation messages (cursor pagination, oldest->newest in payload)
 */
exports.listConversationMessages = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { conversationId } = req.params;
        const { cursor, limit = 30 } = req.query;

        const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);

        const membership = await ensureConversationMembership(conversationId, userId, institution_id);
        if (!membership) {
            return res.status(403).json({ error: "Not allowed to access this conversation" });
        }

        let query = supabase
            .from("messages")
            .select("id, conversation_id, sender_id, content, created_at, edited_at, deleted_for_everyone_at, hidden_for_user_ids, client_request_id")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: false })
            .limit(safeLimit + 1);

        if (cursor) {
            query = query.lt("created_at", String(cursor));
        }

        const { data, error } = await query;

        if (error) {
            return handleMessagingSupabaseError(res, error);
        }

        const normalized = (data || [])
            .map((m) => normalizeConversationMessageForUser(m, userId))
            .filter(Boolean);

        const hasMore = normalized.length > safeLimit;
        const sliced = normalized.slice(0, safeLimit).reverse();
        const nextCursor = sliced.length ? sliced[0].created_at : null;

        return res.status(200).json({
            messages: sliced,
            hasMore,
            nextCursor,
        });
    } catch (err) {
        console.error("listConversationMessages error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Send a message inside a conversation.
 */
exports.sendConversationMessage = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { conversationId } = req.params;
        const { content, clientRequestId } = req.body;

        if (!content || !String(content).trim()) {
            return res.status(400).json({ error: "Message content is required" });
        }

        const membership = await ensureConversationMembership(conversationId, userId, institution_id);
        if (!membership) {
            return res.status(403).json({ error: "Not allowed to message in this conversation" });
        }

        const trimmed = String(content).trim();
        const now = new Date().toISOString();
        const expiresAt = computeConversationExpiryIso(new Date());

        // Legacy compatibility: messages.receiver_id may still be NOT NULL in some environments.
        // Resolve direct-conversation partner and populate receiver_id on insert.
        const { data: participantRows, error: participantError } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conversationId);

        if (participantError) {
            return handleMessagingSupabaseError(res, participantError);
        }

        const partnerUserId = (participantRows || []).find((p) => p.user_id !== userId)?.user_id || null;
        if (!partnerUserId) {
            return res.status(400).json({ error: "Conversation recipient could not be resolved" });
        }

        if (clientRequestId && typeof clientRequestId !== "string") {
            return res.status(400).json({ error: "clientRequestId must be a string" });
        }

        if (clientRequestId && clientRequestId.length > 128) {
            return res.status(400).json({ error: "clientRequestId too long" });
        }

        if (clientRequestId) {
            const { data: existing, error: existingError } = await supabase
                .from("messages")
                .select("id, conversation_id, sender_id, content, created_at, edited_at, deleted_for_everyone_at, hidden_for_user_ids, client_request_id")
                .eq("conversation_id", conversationId)
                .eq("sender_id", userId)
                .eq("client_request_id", clientRequestId)
                .maybeSingle();

            if (existingError) {
                return handleMessagingSupabaseError(res, existingError);
            }

            if (existing) {
                return res.status(200).json(existing);
            }
        }

        const { data: message, error: insertError } = await supabase
            .from("messages")
            .insert({
                conversation_id: conversationId,
                sender_id: userId,
                receiver_id: partnerUserId,
                content: trimmed,
                institution_id,
                client_request_id: clientRequestId || null,
            })
            .select("id, conversation_id, sender_id, content, created_at, edited_at, deleted_for_everyone_at, hidden_for_user_ids, client_request_id")
            .single();

        if (insertError) {
            return handleMessagingSupabaseError(res, insertError);
        }

        await supabase
            .from("conversations")
            .update({ last_message_at: now, updated_at: now, expires_at: expiresAt })
            .eq("id", conversationId);

        await supabase
            .from("conversation_participants")
            .update({ deleted_at: null })
            .eq("conversation_id", conversationId);

        return res.status(201).json(message);
    } catch (err) {
        console.error("sendConversationMessage error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Edit own message and store pre-edit snapshot.
 */
exports.editMessage = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { messageId } = req.params;
        const { content } = req.body;

        if (!content || !String(content).trim()) {
            return res.status(400).json({ error: "newContent is required" });
        }

        const { data: message, error: messageError } = await supabase
            .from("messages")
            .select("id, conversation_id, sender_id, content, created_at, deleted_for_everyone_at")
            .eq("id", messageId)
            .maybeSingle();

        if (messageError || !message) {
            return res.status(404).json({ error: "Message not found" });
        }

        const membership = await ensureConversationMembership(message.conversation_id, userId, institution_id);
        if (!membership) {
            return res.status(403).json({ error: "Not allowed to edit this message" });
        }

        if (message.sender_id !== userId) {
            return res.status(403).json({ error: "Only the sender can edit this message" });
        }

        if (message.deleted_for_everyone_at) {
            return res.status(400).json({ error: "Deleted messages cannot be edited" });
        }

        const trimmed = String(content).trim();

        const { error: historyError } = await supabase
            .from("message_edit_history")
            .insert({
                message_id: message.id,
                content: message.content,
            });

        if (historyError) {
            return handleMessagingSupabaseError(res, historyError);
        }

        const { data: updated, error: updateError } = await supabase
            .from("messages")
            .update({
                content: trimmed,
                edited_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", messageId)
            .select("id, conversation_id, sender_id, content, created_at, edited_at, deleted_for_everyone_at, hidden_for_user_ids, client_request_id")
            .single();

        if (updateError) {
            return handleMessagingSupabaseError(res, updateError);
        }

        return res.status(200).json(updated);
    } catch (err) {
        console.error("editMessage error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Delete message for requester only (visibility hide).
 */
exports.deleteMessageForMe = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { messageId } = req.params;

        const { data: message, error: messageError } = await supabase
            .from("messages")
            .select("id, conversation_id, hidden_for_user_ids")
            .eq("id", messageId)
            .maybeSingle();

        if (messageError || !message) {
            return res.status(404).json({ error: "Message not found" });
        }

        const membership = await ensureConversationMembership(message.conversation_id, userId, institution_id);
        if (!membership) {
            return res.status(403).json({ error: "Not allowed to update this message" });
        }

        const hidden = Array.isArray(message.hidden_for_user_ids) ? [...message.hidden_for_user_ids] : [];
        if (!hidden.includes(userId)) {
            hidden.push(userId);
        }

        const { error: updateError } = await supabase
            .from("messages")
            .update({
                hidden_for_user_ids: hidden,
                updated_at: new Date().toISOString(),
            })
            .eq("id", messageId);

        if (updateError) {
            return handleMessagingSupabaseError(res, updateError);
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("deleteMessageForMe error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Delete message for both participants inside sender-only time window.
 */
exports.deleteMessageForEveryone = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { messageId } = req.params;

        const { data: message, error: messageError } = await supabase
            .from("messages")
            .select("id, conversation_id, sender_id, created_at, deleted_for_everyone_at")
            .eq("id", messageId)
            .maybeSingle();

        if (messageError || !message) {
            return res.status(404).json({ error: "Message not found" });
        }

        const membership = await ensureConversationMembership(message.conversation_id, userId, institution_id);
        if (!membership) {
            return res.status(403).json({ error: "Not allowed to update this message" });
        }

        if (message.sender_id !== userId) {
            return res.status(403).json({ error: "Only sender can delete for everyone" });
        }

        if (message.deleted_for_everyone_at) {
            return res.status(200).json({ success: true });
        }

        const createdAtMs = new Date(message.created_at).getTime();
        const maxWindowMs = DEFAULT_DELETE_FOR_EVERYONE_WINDOW_MINUTES * 60 * 1000;
        if (Date.now() - createdAtMs > maxWindowMs) {
            return res.status(400).json({
                error: "Delete for everyone window has expired",
                code: "DELETE_WINDOW_EXPIRED",
            });
        }

        const { error: updateError } = await supabase
            .from("messages")
            .update({
                content: DELETED_PLACEHOLDER,
                deleted_for_everyone_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", messageId);

        if (updateError) {
            return handleMessagingSupabaseError(res, updateError);
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("deleteMessageForEveryone error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Delete conversation for requester only (hide from list).
 */
exports.deleteConversationForMe = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { conversationId } = req.params;

        const membership = await ensureConversationMembership(conversationId, userId, institution_id);
        if (!membership) {
            return res.status(403).json({ error: "Not allowed to delete this conversation" });
        }

        const { error } = await supabase
            .from("conversation_participants")
            .update({ deleted_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("user_id", userId);

        if (error) {
            return handleMessagingSupabaseError(res, error);
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("deleteConversationForMe error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Clear conversation history for requester only (hide all current messages for this user).
 */
exports.clearConversationForMe = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { conversationId } = req.params;

        const membership = await ensureConversationMembership(conversationId, userId, institution_id);
        if (!membership) {
            return res.status(403).json({ error: "Not allowed to clear this conversation" });
        }

        const { data: rows, error: rowsError } = await supabase
            .from("messages")
            .select("id, hidden_for_user_ids")
            .eq("conversation_id", conversationId);

        if (rowsError) {
            return handleMessagingSupabaseError(res, rowsError);
        }

        const updates = (rows || []).map((row) => {
            const hidden = Array.isArray(row.hidden_for_user_ids) ? [...row.hidden_for_user_ids] : [];
            if (!hidden.includes(userId)) hidden.push(userId);
            return supabase
                .from("messages")
                .update({
                    hidden_for_user_ids: hidden,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", row.id);
        });

        if (updates.length) {
            const results = await Promise.all(updates);
            const failed = results.find((r) => r.error);
            if (failed?.error) {
                return handleMessagingSupabaseError(res, failed.error);
            }
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("clearConversationForMe error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Mark conversation read for current user.
 */
exports.markConversationRead = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { conversationId } = req.params;

        const membership = await ensureConversationMembership(conversationId, userId, institution_id);
        if (!membership) {
            return res.status(403).json({ error: "Not allowed" });
        }

        const now = new Date().toISOString();

        const { error } = await supabase
            .from("conversation_participants")
            .update({
                last_read_at: now,
                last_delivered_at: now,
            })
            .eq("conversation_id", conversationId)
            .eq("user_id", userId);

        if (error) {
            return handleMessagingSupabaseError(res, error);
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("markConversationRead error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Mark conversation delivery watermark for current user.
 */
exports.acknowledgeDelivery = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { conversationId } = req.params;

        const membership = await ensureConversationMembership(conversationId, userId, institution_id);
        if (!membership) {
            return res.status(403).json({ error: "Not allowed" });
        }

        const { error } = await supabase
            .from("conversation_participants")
            .update({ last_delivered_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("user_id", userId);

        if (error) {
            return handleMessagingSupabaseError(res, error);
        }

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error("acknowledgeDelivery error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Send a direct message
 */
exports.sendMessage = async (req, res) => {
    try {
        const { userId: sender_id, institution_id, userRole } = req;
        const { receiver_id, subject, content } = req.body;

        if (!receiver_id || !content) {
            return res.status(400).json({ error: "Receiver ID and content are required" });
        }

        if (!institution_id) {
            return res.status(403).json({ error: "Messaging requires an institution context" });
        }

        const { data: receiver, error: receiverError } = await supabase
            .from("users")
            .select("id, role, institution_id")
            .eq("id", receiver_id)
            .single();

        if (receiverError || !receiver) {
            return res.status(404).json({ error: "Recipient not found" });
        }

        if (receiver.institution_id !== institution_id) {
            return res.status(403).json({ error: "Recipient must belong to your institution" });
        }

        if (!canMessage(userRole, receiver.role)) {
            return res.status(403).json({ error: "Messaging between these roles is not allowed" });
        }

        const { data, error } = await supabase
            .from("messages")
            .insert({
                sender_id,
                receiver_id,
                subject,
                content,
                institution_id
            })
            .select()
            .single();

        if (error) {
            return handleMessagingSupabaseError(res, error);
        }

        return res.status(201).json(data);
    } catch (err) {
        console.error("sendMessage error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Get messages for the authenticated user (Inbox and Sent)
 */
exports.getMessages = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { type = 'inbox' } = req.query; // 'inbox' or 'sent'

        let query = supabase
            .from("messages")
            .select(`
                *,
                sender:sender_id ( id, full_name, avatar_url ),
                receiver:receiver_id ( id, full_name, avatar_url )
            `)
            .eq("institution_id", institution_id)
            .order("created_at", { ascending: false });

        if (type === 'sent') {
            query = query.eq("sender_id", userId);
        } else {
            query = query.eq("receiver_id", userId);
        }

        const { data, error } = await query;

        if (error) {
            return handleMessagingSupabaseError(res, error);
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error("getMessages error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Mark a message as read
 */
exports.markAsRead = async (req, res) => {
    try {
        const { userId } = req;
        const { id } = req.params;

        const { data, error } = await supabase
            .from("messages")
            .update({ is_read: true })
            .eq("id", id)
            .eq("receiver_id", userId)
            .select()
            .single();

        if (error) {
            return handleMessagingSupabaseError(res, error);
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error("markAsRead error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
