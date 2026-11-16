const supabase = require('./supabaseClient.js');

/**
 * Log record modifications to record_change_log for audit trails.
 * Required for grade corrections, report card edits, and exam updates.
 */
async function logRecordChange({
    institution_id,
    table_name,
    record_id,
    changed_by,
    change_type,
    old_values = null,
    new_values = null,
    reason = null,
}) {
    if (!institution_id || !table_name || !record_id || !changed_by || !change_type) {
        console.warn('[AuditLogger] Missing required audit log fields:', {
            institution_id,
            table_name,
            record_id,
            changed_by,
            change_type,
        });
        return;
    }

    try {
        const { error } = await supabase
            .from('record_change_log')
            .insert([{
                institution_id,
                table_name,
                record_id: String(record_id),
                changed_by,
                change_type,
                old_values: old_values ? JSON.stringify(old_values) : null,
                new_values: new_values ? JSON.stringify(new_values) : null,
                reason: reason || null,
            }]);

        if (error) {
            console.error('[AuditLogger] Failed to write audit record:', error);
        }
    } catch (err) {
        console.error('[AuditLogger] Unexpected error writing audit record:', err);
    }
}

async function logAuditEvent({
    institution_id,
    actor_id,
    action,
    domain = null,
    target_type = null,
    target_id = null,
    before_state = null,
    after_state = null,
    ip_address = null,
    user_agent = null,
}) {
    if (!institution_id || !action) return;
    try {
        await supabase.from('audit_logs').insert([{
            institution_id,
            actor_id: actor_id || null,
            action,
            domain: domain || null,
            target_type: target_type || null,
            target_id: target_id ? String(target_id) : null,
            before_state: before_state || null,
            after_state: after_state || null,
            ip_address: ip_address || null,
            user_agent: user_agent || null,
        }]);
    } catch (err) {
        console.error('[AuditLogger] Failed to write audit_log:', err);
    }
}

module.exports = {
    logRecordChange,
    logAuditEvent,
};
