const supabase = require("../utils/supabaseClient");

/**
 * Send a direct message
 */
exports.sendMessage = async (req, res) => {
    try {
        const { userId: sender_id, institution_id } = req;
        const { receiver_id, subject, content } = req.body;

        if (!receiver_id || !content) {
            return res.status(400).json({ error: "Receiver ID and content are required" });
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
            return res.status(500).json({ error: error.message });
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
            return res.status(500).json({ error: error.message });
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
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error("markAsRead error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
