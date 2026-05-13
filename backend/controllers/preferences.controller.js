// controllers/preferences.controller.js
const supabase = require("../utils/supabaseClient.js");

/**
 * Get user notification preferences
 */
exports.getPreferences = async (req, res) => {
    try {
        const { userId, institution_id: _inst_id } = req;

        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // No preferences found, return defaults
            return res.json({
                push_notifications: true,
                submission_alerts: true,
                system_alerts: true,
                email_notifications: true,
                subscription_alerts: true,
                issues_requests_alerts: true,
                support_cases_alerts: true,
            });
        }

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("getPreferences error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update user notification preferences (upsert)
 */
exports.updatePreferences = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { 
            push_notifications, 
            submission_alerts, 
            system_alerts, 
            email_notifications,
            subscription_alerts,
            issues_requests_alerts,
            support_cases_alerts
        } = req.body;

        const prefData = {
            user_id: userId,
            institution_id: institution_id,
        };

        if (push_notifications !== undefined) prefData.push_notifications = push_notifications;
        if (submission_alerts !== undefined) prefData.submission_alerts = submission_alerts;
        if (system_alerts !== undefined) prefData.system_alerts = system_alerts;
        if (email_notifications !== undefined) prefData.email_notifications = email_notifications;
        if (subscription_alerts !== undefined) prefData.subscription_alerts = subscription_alerts;
        if (issues_requests_alerts !== undefined) prefData.issues_requests_alerts = issues_requests_alerts;
        if (support_cases_alerts !== undefined) prefData.support_cases_alerts = support_cases_alerts;

        const { data, error } = await supabase
            .from('user_preferences')
            .upsert(prefData, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;
        res.json({ message: "Preferences updated", preferences: data });
    } catch (err) {
        console.error("updatePreferences error:", err);
        res.status(500).json({ error: err.message });
    }
};
