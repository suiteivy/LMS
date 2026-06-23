const supabase = require("../utils/supabaseClient.js");
const {
    sendInAppNotificationWithHistory,
    retryScheduledNotificationDeliveries,
} = require('../services/notificationDelivery.service.js');

exports.createNotificationInternal = async ({ userId, title, message, type = 'info', data = {} }) => {
    try {
        // We need to fetch the user's institution_id if not provided
        // But usually it's better to pass it in.
        // For now, I'll fetch it to ensure correctness since internal calls might miss it.
        const { data: user } = await supabase.from('users').select('institution_id').eq('id', userId).single();
        const instId = user?.institution_id;

        // Calculate expiry based on type
        let expiryDate = new Date();
        if (type === 'warning' || type === 'error') {
            expiryDate.setDate(expiryDate.getDate() + 14); // 14 days for important alerts
        } else {
            expiryDate.setDate(expiryDate.getDate() + 7); // 7 days for info/success
        }

        const result = await sendInAppNotificationWithHistory({
            user_id: userId,
            title,
            message,
            type,
            data,
            expires_at: expiryDate.toISOString(),
            institution_id: instId,
            maxRetries: 3,
        });

        return result.ok;
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
        let { userId, institution_id } = req;

        // Forced sanitization to prevent Postgres UUID syntax errors (invalid input "null")
        if (institution_id === "null" || institution_id === "") institution_id = null;
        if (userId === "null" || userId === "") {
            console.error("[NotificationController] Invalid userId 'null' detected.");
            return res.status(401).json({ error: "Invalid session" });
        }

        if (!userId) {
            return res.status(401).json({ error: "User ID missing from request" });
        }

        const now = new Date().toISOString();
        let query = supabase
            .from("notifications")
            .select("*");

        // --- Workaround Mechanism for Master Admins ---
        // Master Admins are not bound to a specific institution.
        // They should receive notifications specifically sent to them (user_id = userId)
        // or global system-level notifications (user_id is null).
        if (req.isPlatformAdmin) {
            query = query.or(`user_id.eq.${userId},user_id.is.null`);
            // We omit the institution_id filter entirely for Master Admins to avoid UUID "null" errors
            // and ensure they see cross-institution platform alerts.
        } else {
            // Normal users are restricted to their own notifications within their institution context.
            query = query.eq("user_id", userId);
            
            if (institution_id) {
                query = query.eq("institution_id", institution_id);
            } else {
                query = query.is("institution_id", null);
            }
        }

        const { data, error } = await query
            .or(`expires_at.is.null,expires_at.gt.${now}`)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) {
            console.error("getUserNotifications Supabase error:", error);
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

/**
 * Delete a single notification.
 */
exports.deleteNotification = async (req, res) => {
    try {
        const { userId } = req;
        const { id } = req.params;

        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("id", id)
            .eq("user_id", userId);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.json({ message: "Notification deleted" });
    } catch (err) {
        console.error("deleteNotification error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Delete ALL notifications for the user.
 */
exports.clearAllNotifications = async (req, res) => {
    try {
        const { userId } = req;

        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("user_id", userId);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.json({ message: "All notifications cleared" });
    } catch (err) {
        console.error("clearAllNotifications error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};

/**
 * Delivery attempt history (admin / master_admin)
 */
exports.getDeliveryAttempts = async (req, res) => {
    try {
        const { userRole, institution_id } = req;
        const { status, limit = 100 } = req.query;

        if (!['admin', 'master_admin'].includes(userRole)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        let query = supabase
            .from('notification_delivery_attempts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(Number(limit) || 100);

        if (userRole !== 'master_admin') {
            query = query.eq('institution_id', institution_id);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        return res.json({ success: true, data: data || [] });
    } catch (err) {
        console.error('getDeliveryAttempts error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};

/**
 * Trigger retry worker manually (admin / master_admin)
 */
exports.runNotificationRetryNow = async (req, res) => {
    try {
        const { userRole } = req;
        const { limit = 50 } = req.body || {};

        if (!['admin', 'master_admin'].includes(userRole)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await retryScheduledNotificationDeliveries({ limit: Number(limit) || 50 });
        return res.json({ success: true, data: result });
    } catch (err) {
        console.error('runNotificationRetryNow error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
};
