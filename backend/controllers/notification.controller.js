const supabase = require("../utils/supabaseClient");

/**
 * Get internal helper to create notifications without HTTP request context.
 * Useful for calling from other controllers.
 */
exports.createNotificationInternal = async ({ userId, title, message, type = 'info', data = {} }) => {
    try {
        const { error } = await supabase
            .from("notifications")
            .insert({
                user_id: userId,
                title,
                message,
                type,
                data,
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
        const { userId } = req;
        // Fetch unread first, then read, limit to 20 or so
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
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
