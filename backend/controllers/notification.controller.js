const supabase = require("../utils/supabaseClient");

exports.createNotificationInternal = async ({ userId, title, message, type = 'info', data = {} }) => {
    try {
        // We need to fetch the user's institution_id if not provided
        // But usually it's better to pass it in.
        // For now, I'll fetch it to ensure correctness since internal calls might miss it.
        const { data: user } = await supabase.from('users').select('institution_id').eq('id', userId).single();
        const instId = user?.institution_id;

        const { error } = await supabase
            .from("notifications")
            .insert({
                user_id: userId,
                title,
                message,
                type,
                data,
                institution_id: instId
            });

        if (error) {
            console.error("Failed to create notification:", error);
            return false;
        }
        return true;
    } catch (err) {
        console.error("Error creating notification:", err);
        return false;
    }
};

/**
 * Fetch notifications for the authenticated user.
 */
exports.getUserNotifications = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        // Fetch unread first, then read, limit to 20 or so
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .eq("institution_id", institution_id)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json(data);
    } catch (err) {
        console.error("getUserNotifications error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Mark a notification as read.
 */
exports.markAsRead = async (req, res) => {
    try {
        const { userId } = req;
        const { id } = req.params;

        const { data, error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", id)
            .eq("user_id", userId) // Ensure ownership
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.json({ message: "Marked as read", notification: data });
    } catch (err) {
        console.error("markAsRead error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Mark ALL notifications as read for the user.
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const { userId } = req;

        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", userId)
            .eq("is_read", false);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.json({ message: "All marked as read" });
    } catch (err) {
        console.error("markAllAsRead error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
