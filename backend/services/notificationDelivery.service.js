const supabase = require('../utils/supabaseClient.js');

const MAX_RETRY_ATTEMPTS_DEFAULT = 3;

const resolvePreferenceKey = (payload = {}) => {
  const source = String(payload?.source || '').toLowerCase();
  if (source === 'subscription_lifecycle') return 'subscription_alerts';
  if (source === 'support_ticket' || source === 'support_case') return 'support_cases_alerts';
  if (source === 'issue_request' || source === 'addon_request') return 'issues_requests_alerts';
  if (
    source === 'master_admin_notice' ||
    source === 'system_maintenance' ||
    source === 'institution_domain_migration' ||
    source === 'import' ||
    source === 'assignment' ||
    source === 'exam' ||
    source === 'student_linked' ||
    source === 'institution_default'
  ) return 'system_alerts';
  return 'push_notifications';
};

const getUserPreferences = async (userId) => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    const missingTable = /relation/i.test(error.message || '') && (error.message || '').includes('user_preferences');
    if (missingTable) return null;
    throw error;
  }

  return data || null;
};

const isNotificationAllowedByPreferences = async ({ userId, payload = {}, cache = new Map() }) => {
  if (!userId) return true;

  let prefs = cache.get(userId);
  if (prefs === undefined) {
    prefs = await getUserPreferences(userId);
    cache.set(userId, prefs);
  }

  if (!prefs) return true;

  if (prefs.push_notifications === false) return false;

  const prefKey = resolvePreferenceKey(payload);
  if (prefKey && Object.prototype.hasOwnProperty.call(prefs, prefKey)) {
    return prefs[prefKey] !== false;
  }

  return true;
};

const computeNextRetryAt = (attemptNumber) => {
  const safeAttempt = Math.max(1, Number(attemptNumber) || 1);
  const delayMinutes = Math.min(60, 2 ** (safeAttempt - 1));
  const next = new Date();
  next.setMinutes(next.getMinutes() + delayMinutes);
  return next.toISOString();
};

const insertAttemptLog = async ({
  notificationId = null,
  recipientUserId,
  title,
  message,
  payload = {},
  status,
  attempt,
  maxRetries,
  errorMessage = null,
  nextRetryAt = null,
  deliveredAt = null,
  institutionId = null,
}) => {
  const now = new Date().toISOString();
  const { error } = await supabase.from('notification_delivery_attempts').insert({
    notification_id: notificationId,
    channel: 'in_app',
    recipient_user_id: recipientUserId,
    title,
    message,
    payload,
    status,
    attempt_number: attempt,
    max_retries: maxRetries,
    error_message: errorMessage,
    next_retry_at: nextRetryAt,
    delivered_at: deliveredAt,
    institution_id: institutionId,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    console.error('insertAttemptLog error:', error.message);
  }
};

const sendInAppNotificationWithHistory = async ({
  user_id,
  title,
  message,
  type = 'info',
  data = {},
  institution_id = null,
  expires_at = null,
  maxRetries = MAX_RETRY_ATTEMPTS_DEFAULT,
  preferenceCache,
}) => {
  const prefCache = preferenceCache || new Map();
  const allowed = await isNotificationAllowedByPreferences({ userId: user_id, payload: data, cache: prefCache });
  if (!allowed) {
    await insertAttemptLog({
      notificationId: null,
      recipientUserId: user_id,
      title,
      message,
      payload: data,
      status: 'skipped_preference',
      attempt: 1,
      maxRetries,
      errorMessage: 'Notification skipped due to user preference settings',
      institutionId: institution_id,
    });
    return { ok: true, skipped: true };
  }

  const payload = {
    user_id,
    title,
    message,
    type,
    data,
    institution_id,
    expires_at,
    created_at: new Date().toISOString(),
  };

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const { data: inserted, error } = await supabase
      .from('notifications')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      const missingExpiresAtColumn = /column/i.test(error.message || '') && (error.message || '').includes('expires_at');
      if (missingExpiresAtColumn) {
        const fallbackPayload = { ...payload };
        delete fallbackPayload.expires_at;
        // eslint-disable-next-line no-await-in-loop
        const fallback = await supabase
          .from('notifications')
          .insert(fallbackPayload)
          .select('id')
          .single();

        if (!fallback.error && fallback.data?.id) {
          await insertAttemptLog({
            notificationId: fallback.data.id,
            recipientUserId: user_id,
            title,
            message,
            payload: data,
            status: 'delivered',
            attempt,
            maxRetries,
            deliveredAt: new Date().toISOString(),
            institutionId: institution_id,
          });
          return { ok: true, notification_id: fallback.data.id };
        }
      }
    }

    if (!error && inserted?.id) {
      await insertAttemptLog({
        notificationId: inserted.id,
        recipientUserId: user_id,
        title,
        message,
        payload: data,
        status: 'delivered',
        attempt,
        maxRetries,
        deliveredAt: new Date().toISOString(),
        institutionId: institution_id,
      });
      return { ok: true, notification_id: inserted.id };
    }

    const hasMoreRetries = attempt < maxRetries;
    const nextRetryAt = hasMoreRetries ? computeNextRetryAt(attempt + 1) : null;
    await insertAttemptLog({
      notificationId: null,
      recipientUserId: user_id,
      title,
      message,
      payload: data,
      status: hasMoreRetries ? 'retry_scheduled' : 'failed',
      attempt,
      maxRetries,
      errorMessage: error?.message || 'Unknown notification delivery error',
      nextRetryAt,
      institutionId: institution_id,
    });

    if (!hasMoreRetries) {
      return { ok: false, error: error?.message || 'Failed to deliver notification' };
    }
  }

  return { ok: false, error: 'Failed to deliver notification' };
};

const sendBulkInAppNotificationsWithHistory = async (notifications) => {
  const results = [];
  const preferenceCache = new Map();
  for (const item of notifications || []) {
    // eslint-disable-next-line no-await-in-loop
    const result = await sendInAppNotificationWithHistory({ ...item, preferenceCache });
    results.push({
      user_id: item.user_id,
      ok: result.ok,
      notification_id: result.notification_id || null,
      error: result.error || null,
      skipped: !!result.skipped,
    });
  }
  return results;
};

const retryScheduledNotificationDeliveries = async ({ limit = 50 } = {}) => {
  const now = new Date().toISOString();
  const { data: queued, error } = await supabase
    .from('notification_delivery_attempts')
    .select('*')
    .eq('channel', 'in_app')
    .eq('status', 'retry_scheduled')
    .lte('next_retry_at', now)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  let processed = 0;
  let delivered = 0;
  let failed = 0;

  for (const attemptRow of queued || []) {
    processed += 1;

    // eslint-disable-next-line no-await-in-loop
    const allowed = await isNotificationAllowedByPreferences({ userId: attemptRow.recipient_user_id, payload: attemptRow.payload || {}, cache: new Map() });
    if (!allowed) {
      // eslint-disable-next-line no-await-in-loop
      await supabase
        .from('notification_delivery_attempts')
        .update({
          status: 'skipped_preference',
          attempt_number: (attemptRow.attempt_number || 0) + 1,
          error_message: 'Notification skipped due to user preference settings',
          next_retry_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', attemptRow.id);
      // eslint-disable-next-line no-continue
      continue;
    }

    const nextAttempt = (attemptRow.attempt_number || 0) + 1;
    const maxRetries = attemptRow.max_retries || MAX_RETRY_ATTEMPTS_DEFAULT;

    // eslint-disable-next-line no-await-in-loop
    const { data: inserted, error: insertErrorInitial } = await supabase
      .from('notifications')
      .insert({
        user_id: attemptRow.recipient_user_id,
        title: attemptRow.title,
        message: attemptRow.message,
        type: (attemptRow.payload && attemptRow.payload.type) || 'info',
        data: attemptRow.payload || {},
        institution_id: attemptRow.institution_id,
        expires_at: attemptRow.payload?.expires_at || null,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    let insertError = insertErrorInitial;
    let insertedData = inserted;

    if (insertError) {
      const missingExpiresAtColumn = /column/i.test(insertError.message || '') && (insertError.message || '').includes('expires_at');
      if (missingExpiresAtColumn) {
        // eslint-disable-next-line no-await-in-loop
        const fallback = await supabase
          .from('notifications')
          .insert({
            user_id: attemptRow.recipient_user_id,
            title: attemptRow.title,
            message: attemptRow.message,
            type: (attemptRow.payload && attemptRow.payload.type) || 'info',
            data: attemptRow.payload || {},
            institution_id: attemptRow.institution_id,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        insertError = fallback.error;
        insertedData = fallback.data;
      }
    }

    if (!insertError && insertedData?.id) {
      delivered += 1;
      // eslint-disable-next-line no-await-in-loop
      await supabase
        .from('notification_delivery_attempts')
        .update({
          status: 'delivered',
          notification_id: insertedData.id,
          delivered_at: new Date().toISOString(),
          attempt_number: nextAttempt,
          updated_at: new Date().toISOString(),
          error_message: null,
          next_retry_at: null,
        })
        .eq('id', attemptRow.id);
      // eslint-disable-next-line no-continue
      continue;
    }

    const exhausted = nextAttempt >= maxRetries;
    if (exhausted) {
      failed += 1;
    }

    // eslint-disable-next-line no-await-in-loop
    await supabase
      .from('notification_delivery_attempts')
      .update({
        status: exhausted ? 'failed' : 'retry_scheduled',
        attempt_number: nextAttempt,
        error_message: insertError?.message || 'Retry delivery failed',
        next_retry_at: exhausted ? null : computeNextRetryAt(nextAttempt + 1),
        updated_at: new Date().toISOString(),
      })
      .eq('id', attemptRow.id);
  }

  return { processed, delivered, failed };
};

module.exports = {
  sendInAppNotificationWithHistory,
  sendBulkInAppNotificationsWithHistory,
  retryScheduledNotificationDeliveries,
};
