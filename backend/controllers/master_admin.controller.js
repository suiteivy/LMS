const process = require("node:process");
const crypto = require("node:crypto");
const _supabase = require("../utils/supabaseClient.js");
const { createClient } = require("@supabase/supabase-js");
const { sendBulkInAppNotificationsWithHistory } = require('../services/notificationDelivery.service.js');
const { logSystemActivity, readSystemActivityLogs, clearSystemActivityLogs } = require('../services/systemActivityLog.service.js');
const { canonicalRoleFrom, withRoleAliases } = require("../utils/roleAlias.js");
const { isTransientSupabaseError, withSupabaseRetry } = require('../utils/supabaseRetry.js');
const { buildReceiptHtml } = require('../utils/receiptTemplate.js');

let serviceClientFactory = createClient;

// We MUST use the service role key for platform-wide operations to bypass RLS,
// since normal user tokens are strictly scoped to their institution.
const getServiceSupabase = () => {
    return serviceClientFactory(
        process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
};

const NOTICE_EXPIRY_DEFAULT_DAYS = 2;
const NOTICE_EXPIRY_MIN_DAYS = 1;
const NOTICE_EXPIRY_MAX_DAYS = 365;

const parseDays = (rawValue, fallback = NOTICE_EXPIRY_DEFAULT_DAYS) => {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return parsed;
};

const validateDaysInput = (rawValue, fieldName = 'expiry_days') => {
    const hasValue = !(rawValue === undefined || rawValue === null || String(rawValue).trim() === '');
    if (!hasValue) {
        return { ok: true, value: NOTICE_EXPIRY_DEFAULT_DAYS };
    }

    const parsed = parseDays(rawValue, NaN);
    if (!Number.isFinite(parsed) || parsed < NOTICE_EXPIRY_MIN_DAYS || parsed > NOTICE_EXPIRY_MAX_DAYS) {
        return {
            ok: false,
            error: `${fieldName} must be an integer between ${NOTICE_EXPIRY_MIN_DAYS} and ${NOTICE_EXPIRY_MAX_DAYS}`,
        };
    }

    return { ok: true, value: parsed };
};

const PLAN_MONTHLY_PRICE = {
    beta: 0,
    basic: 100,
    pro: 300,
    premium: 500,
};

const normalizeInstitutionPlan = (plan) => {
    const map = {
        free: 'beta',
        beta_free: 'beta',
        beta: 'beta',
        basic: 'basic',
        basic_basic: 'basic',
        pro: 'pro',
        basic_pro: 'pro',
        premium: 'premium',
        basic_premium: 'premium',
    };
    const p = String(plan || 'basic').toLowerCase();
    return map[p] || 'basic';
};

const resolveInstitutionAddonFlags = ({ plan, addon_library, addon_messaging, addon_diary, addon_bursary }) => {
    const normalizedPlan = normalizeInstitutionPlan(plan);
    if (normalizedPlan === 'beta') {
        return {
            addon_library: true,
            addon_messaging: true,
            addon_diary: true,
            addon_bursary: true,
        };
    }

    return {
        addon_library: !!addon_library,
        addon_messaging: !!addon_messaging,
        addon_diary: !!addon_diary,
        addon_bursary: !!addon_bursary,
    };
};

const isMissingRelationError = (error) => {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || '').toLowerCase();
    return code === '42p01' || code === '42703' || message.includes('does not exist');
};

const sortAndNormalizeTypeNames = (types) => {
    const pairs = (types || [])
        .map((row) => ({
            name: String(row?.category_types?.name || '').trim(),
            sort_order: Number(row?.category_types?.sort_order) || 100,
        }))
        .filter((row) => row.name);

    pairs.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
    return [...new Set(pairs.map((row) => row.name))];
};

const toUuidString = (value) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized || null;
};

const getDefaultCurrencyId = async (adminClient) => {
    const { data: defaultCurrency, error } = await adminClient
        .from('currencies')
        .select('id')
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle();

    if (error) throw error;
    return defaultCurrency?.id || null;
};

const ensureActiveCurrencyId = async (adminClient, currencyId, { allowDefaultFallback = false } = {}) => {
    const normalizedCurrencyId = toUuidString(currencyId);
    if (!normalizedCurrencyId) {
        if (!allowDefaultFallback) return null;
        return getDefaultCurrencyId(adminClient);
    }

    const { data: currency, error } = await adminClient
        .from('currencies')
        .select('id, is_active')
        .eq('id', normalizedCurrencyId)
        .maybeSingle();

    if (error) throw error;
    if (!currency || !currency.is_active) return null;
    return currency.id;
};

const getInstitutionCurrency = async (adminClient, institutionId) => {
    const normalizedInstitutionId = toUuidString(institutionId);
    if (!normalizedInstitutionId) {
        return { code: 'USD', symbol: '$', decimal_places: 2 };
    }

    const { data } = await adminClient
        .from('institutions')
        .select('currency:currency_id(code, symbol, decimal_places)')
        .eq('id', normalizedInstitutionId)
        .maybeSingle();

    return data?.currency || { code: 'USD', symbol: '$', decimal_places: 2 };
};

const normalizeCategoryIds = (payload) => {
    if (Array.isArray(payload?.category_ids)) {
        return [...new Set(payload.category_ids.map(toUuidString).filter(Boolean))];
    }
    const single = toUuidString(payload?.category_id);
    return single ? [single] : [];
};

const loadInstitutionCategoryMap = async (adminClient, institutionIds) => {
    const cleanIds = [...new Set((institutionIds || []).map(toUuidString).filter(Boolean))];
    if (cleanIds.length === 0) return new Map();

    let data = null;
    let error = null;
    let usedLegacyShape = false;

    ({ data, error } = await adminClient
        .from('institution_categories')
        .select('institution_id, category_id, school_categories:category_id(id, name, school_category_types(type_id, category_types:type_id(name, sort_order)))')
        .in('institution_id', cleanIds));

    if (error && isMissingRelationError(error)) {
        usedLegacyShape = true;
        ({ data, error } = await adminClient
            .from('institution_categories')
            .select('institution_id, category_id, school_categories:category_id(id, name, level_label)')
            .in('institution_id', cleanIds));
    }

    if (error) {
        if (isMissingRelationError(error)) {
            const fallback = new Map();
            for (const id of cleanIds) fallback.set(id, []);
            return fallback;
        }
        throw error;
    }

    const map = new Map();
    for (const row of data || []) {
        const institutionId = toUuidString(row.institution_id);
        if (!institutionId) continue;
        if (!map.has(institutionId)) map.set(institutionId, []);

        const classTypes = usedLegacyShape
            ? (row.school_categories?.level_label ? [String(row.school_categories.level_label).trim()] : [])
            : sortAndNormalizeTypeNames(row.school_categories?.school_category_types || []);

        map.get(institutionId).push({
            id: row.school_categories?.id || row.category_id,
            name: row.school_categories?.name || null,
            class_type: classTypes[0] || null,
            class_types: classTypes,
        });
    }

    for (const id of cleanIds) {
        if (!map.has(id)) map.set(id, []);
    }

    return map;
};

const syncInstitutionCategories = async (adminClient, institutionId, categoryIds = []) => {
    const normalizedInstitutionId = toUuidString(institutionId);
    if (!normalizedInstitutionId) return;
    const normalizedCategoryIds = [...new Set((categoryIds || []).map(toUuidString).filter(Boolean))];

    const { data: existingRows, error: existingError } = await adminClient
        .from('institution_categories')
        .select('category_id')
        .eq('institution_id', normalizedInstitutionId);

    if (existingError) {
        if (isMissingRelationError(existingError)) return;
        throw existingError;
    }

    const existingIds = new Set((existingRows || []).map((row) => toUuidString(row.category_id)).filter(Boolean));
    const nextIds = new Set(normalizedCategoryIds);

    const toInsert = normalizedCategoryIds.filter((id) => !existingIds.has(id));
    const toDelete = [...existingIds].filter((id) => !nextIds.has(id));

        if (toInsert.length > 0) {
            const payload = toInsert.map((categoryId) => ({
                institution_id: normalizedInstitutionId,
                category_id: categoryId,
            }));
            const { error: insertError } = await adminClient
                .from('institution_categories')
                .insert(payload);
            if (insertError) {
                if (isMissingRelationError(insertError)) return;
                throw insertError;
            }
        }

        if (toDelete.length > 0) {
            const { error: deleteError } = await adminClient
                .from('institution_categories')
                .delete()
                .eq('institution_id', normalizedInstitutionId)
                .in('category_id', toDelete);
            if (deleteError) {
                if (isMissingRelationError(deleteError)) return;
                throw deleteError;
            }
        }
};

const parseIsoDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
};

const addMonthsUtc = (date, months) => {
    const d = new Date(date.getTime());
    d.setUTCMonth(d.getUTCMonth() + months);
    return d;
};

const computeCyclesElapsed = (plan, startDateIso, cycle = 'monthly') => {
    const normalizedPlan = String(plan || 'basic').toLowerCase();
    if (normalizedPlan === 'beta') return 0;
    const start = parseIsoDate(startDateIso);
    if (!start) return 0;

    const now = new Date();
    if (now < start) return 0;

    const isYearly = String(cycle || '').toLowerCase() === 'yearly';
    if (isYearly) {
        const years = now.getUTCFullYear() - start.getUTCFullYear();
        const sameOrAfterAnniversary =
            now.getUTCMonth() > start.getUTCMonth() ||
            (now.getUTCMonth() === start.getUTCMonth() && now.getUTCDate() >= start.getUTCDate());
        return Math.max(1, years + (sameOrAfterAnniversary ? 1 : 0));
    }

    const yearDiff = now.getUTCFullYear() - start.getUTCFullYear();
    const monthDiff = now.getUTCMonth() - start.getUTCMonth();
    const months = yearDiff * 12 + monthDiff;
    const sameOrAfterBillingDay = now.getUTCDate() >= start.getUTCDate();
    return Math.max(1, months + (sameOrAfterBillingDay ? 1 : 0));
};

const computeCurrentCycleEnd = (startDateIso, cycle = 'monthly') => {
    const start = parseIsoDate(startDateIso);
    if (!start) return null;
    const isYearly = String(cycle || '').toLowerCase() === 'yearly';
    const now = new Date();

    let cursor = new Date(start.getTime());
    const stepMonths = isYearly ? 12 : 1;
    while (cursor <= now) {
        cursor = addMonthsUtc(cursor, stepMonths);
    }
    return cursor;
};

const getLifecycleForInstitution = (inst, paidAmount = 0) => {
    const plan = String(inst?.subscription_plan || 'basic').toLowerCase();
    const cycle = String(inst?.subscription_cycle || 'monthly').toLowerCase();
    const monthlyPrice = PLAN_MONTHLY_PRICE[plan] ?? 0;
    const cycles = computeCyclesElapsed(plan, inst?.subscription_tracking_start_date, cycle);
    const multiplier = cycle === 'yearly' ? 12 : 1;
    const expectedAmount = monthlyPrice * cycles * multiplier;
    const balanceDue = Math.max(0, expectedAmount - Number(paidAmount || 0));
    const cycleEnd = computeCurrentCycleEnd(inst?.subscription_tracking_start_date, cycle);
    const daysToExpiry = cycleEnd ? Math.ceil((cycleEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
    const shouldExpire = plan !== 'beta' && cycleEnd && daysToExpiry !== null && daysToExpiry < 0 && balanceDue > 0;
    const shouldWarn = plan !== 'beta' && cycleEnd && daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 7 && balanceDue > 0;

    return {
        plan,
        cycle,
        expectedAmount,
        paidAmount: Number(paidAmount || 0),
        balanceDue,
        cycleEnd,
        daysToExpiry,
        shouldExpire,
        shouldWarn,
    };
};

const computeExpiryIsoFromDays = (days, fromIso = null) => {
    const fromMs = fromIso ? new Date(fromIso).getTime() : Date.now();
    const baselineMs = Number.isFinite(fromMs) && fromMs > Date.now() ? fromMs : Date.now();
    return new Date(baselineMs + (days * 24 * 60 * 60 * 1000)).toISOString();
};

const SUPPORT_STATUS_ORDER = {
    pending: 0,
    acknowledged: 1,
    in_progress: 2,
    resolved: 3,
};

const PASSWORD_AUDIT_RETENTION_DAYS = 5;
const PASSWORD_AUDIT_CLEAR_WINDOWS = {
    '1h': 60 * 60 * 1000,
    '5h': 5 * 60 * 60 * 1000,
    '10h': 10 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
};

const resolvePasswordAuditWindowMs = (windowLabel) => {
    const normalized = String(windowLabel || '').trim().toLowerCase();
    return PASSWORD_AUDIT_CLEAR_WINDOWS[normalized] || null;
};

const isSupportedClearWindow = (windowLabel) => {
    const normalized = String(windowLabel || '').trim().toLowerCase();
    return normalized === 'all' || !!resolvePasswordAuditWindowMs(normalized);
};

const INTERNAL_SUPPORT_STATUS = {
    pending: 'pending',
    acknowledged: 'open',
    in_progress: 'in_progress',
    resolved: 'resolved',
};

const toWorkflowSupportStatus = (status) => {
    if (status === INTERNAL_SUPPORT_STATUS.acknowledged) return 'acknowledged';
    if (status === INTERNAL_SUPPORT_STATUS.in_progress) return 'in_progress';
    if (status === INTERNAL_SUPPORT_STATUS.resolved) return 'resolved';
    return 'pending';
};

const canDeleteSupportTicket = (internalStatus) => {
    return internalStatus === INTERNAL_SUPPORT_STATUS.pending || internalStatus === INTERNAL_SUPPORT_STATUS.resolved;
};

const mapSupportTicketForClient = (ticket) => ({
    ...ticket,
    workflow_status: toWorkflowSupportStatus(ticket.status),
    can_delete: canDeleteSupportTicket(ticket.status),
});

const sendSupportTicketNotification = async ({ userId, institutionId, ticketId, title, message, action, actorRole }) => {
    if (!userId) return;
    try {
        const adminClient = getServiceSupabase();
        await adminClient.from('notifications').insert([{
            user_id: userId,
            institution_id: institutionId || null,
            title,
            message,
            type: 'info',
            is_read: false,
            data: {
                source: 'support_ticket',
                support_ticket_id: ticketId,
                action,
                actor_role: actorRole || 'master_admin',
            },
        }]);
    } catch (error) {
        console.error('Failed to send support ticket notification:', error);
    }
};

const generateTempPassword = () => {
    const randomBytes = crypto.randomBytes(8);
    return `LMS_${randomBytes.toString('hex')}`;
};

const buildCredentialDeliveryUrl = (token) => {
    const base =
        process.env.CREDENTIAL_DELIVERY_BASE_URL ||
        process.env.EXPO_PUBLIC_APP_URL ||
        'http://localhost:8081';
    return `${base.replace(/\/+$/, '')}/credential-delivery?token=${encodeURIComponent(token)}`;
};

const createCredentialDeliveryToken = async ({
    adminClient,
    createdBy,
    targetUserId,
    targetEmail,
    temporaryPassword,
    metadata = {},
}) => {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { error } = await adminClient.from('credential_delivery_tokens').insert({
        token,
        created_by: createdBy || null,
        target_user_id: targetUserId || null,
        target_email: targetEmail,
        temporary_password: temporaryPassword,
        metadata,
        expires_at: expiresAt,
    });

    if (error) throw error;

    return {
        token,
        expiresAt,
        url: buildCredentialDeliveryUrl(token),
    };
};

const buildCredentialDocument = ({
    fullName,
    role,
    email,
    temporaryPassword,
    credentialUrl,
    expiresAt,
}) => {
    const lines = [
        'Cloudora LMS Credential Delivery',
        `Name: ${fullName || 'N/A'}`,
        `Role: ${role || 'N/A'}`,
        `Email: ${email}`,
        `Temporary password: ${temporaryPassword}`,
    ];

    if (credentialUrl) lines.push(`One-time credential link: ${credentialUrl}`);
    if (expiresAt) lines.push(`Link expires at (UTC): ${expiresAt}`);

    lines.push('Security notice: Change password immediately on first login.');
    return lines.join('\n');
};

const sanitizeNameForEmail = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const buildEmailBaseFromNames = (firstName, lastName) => {
    const cleanFirst = sanitizeNameForEmail(firstName);
    const cleanLast = sanitizeNameForEmail(lastName);
    if (cleanFirst && cleanLast) return `${cleanFirst}.${cleanLast}`;
    return cleanFirst;
};

const generateUniqueInstitutionEmail = async (adminClient, { firstName, lastName, emailDomain, excludeUserId = null }) => {
    const baseEmailName = buildEmailBaseFromNames(firstName, lastName);
    if (!baseEmailName) throw new Error('Unable to generate email from provided name.');
    if (!emailDomain) throw new Error('Institution email domain is missing.');

    let candidate = `${baseEmailName}@${String(emailDomain).trim().toLowerCase()}`;
    let suffix = 1;

    for (;;) {
        const { data: existingRows, error } = await adminClient
            .from('users')
            .select('id')
            .ilike('email', candidate)
            .limit(1);
        if (error) throw error;

        const existing = Array.isArray(existingRows) ? existingRows[0] : null;

        if (!existing || (excludeUserId && existing.id === excludeUserId)) {
            return candidate;
        }

        suffix += 1;
        candidate = `${baseEmailName}${suffix}@${String(emailDomain).trim().toLowerCase()}`;
    }
};

const revokeInstitutionUserSessions = async (adminClient, userIds = []) => {
    const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
    if (uniqueIds.length === 0) return;

    await adminClient
        .from('user_sessions')
        .update({ is_revoked: true })
        .in('user_id', uniqueIds)
        .eq('is_revoked', false);
};

const migrateInstitutionDomainUsers = async ({
    adminClient,
    institutionId,
    previousDomain,
    nextDomain,
}) => {
    const changedUsers = [];
    const skippedUsers = [];

    const { data: users, error: usersError } = await adminClient
        .from('users')
        .select('id, email, first_name, last_name, full_name, role')
        .eq('institution_id', institutionId)
        .in('role', ['admin', 'school_admin', 'teacher', 'student', 'bursary']);

    if (usersError) throw usersError;

    for (const user of users || []) {
        const fullName = String(user.full_name || '').trim();
        const firstName = String(user.first_name || '').trim() || (fullName ? fullName.split(/\s+/)[0] : 'user');
        const lastName = String(user.last_name || '').trim() || (fullName ? fullName.split(/\s+/).slice(1).join(' ') : '');

        let nextEmail = null;
        try {
            nextEmail = await generateUniqueInstitutionEmail(adminClient, {
                firstName,
                lastName,
                emailDomain: nextDomain,
                excludeUserId: user.id,
            });
        } catch (err) {
            skippedUsers.push({ user_id: user.id, reason: err?.message || 'email_generation_failed', email: user.email });
            continue;
        }

        if (!nextEmail || nextEmail === user.email) {
            skippedUsers.push({ user_id: user.id, reason: 'no_change', email: user.email });
            continue;
        }

        const { error: updateUserError } = await adminClient
            .from('users')
            .update({ email: nextEmail })
            .eq('id', user.id);
        if (updateUserError) {
            skippedUsers.push({ user_id: user.id, reason: updateUserError.message || 'users_update_failed', email: user.email });
            continue;
        }

        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(user.id, {
            email: nextEmail,
            user_metadata: {
                full_name: fullName || `${firstName} ${lastName}`.trim(),
                first_name: firstName,
                last_name: lastName,
            },
        });

        if (authUpdateError) {
            await adminClient.from('users').update({ email: user.email }).eq('id', user.id);
            skippedUsers.push({ user_id: user.id, reason: authUpdateError.message || 'auth_update_failed', email: user.email });
            continue;
        }

        changedUsers.push({
            user_id: user.id,
            role: user.role,
            old_email: user.email,
            new_email: nextEmail,
        });
    }

    if (changedUsers.length > 0) {
        const notifications = changedUsers.map((entry) => ({
            user_id: entry.user_id,
            title: 'Institution Login Email Updated',
            message: `Your institution domain changed from ${previousDomain} to ${nextDomain}. Use your new email (${entry.new_email}) on your next login. Your password remains unchanged.`,
            type: 'warning',
            institution_id: institutionId,
            data: {
                source: 'institution_domain_migration',
                old_email: entry.old_email,
                new_email: entry.new_email,
                previous_domain: previousDomain,
                next_domain: nextDomain,
            },
        }));
        await sendBulkInAppNotificationsWithHistory(notifications);
    }

    return {
        changedUsers,
        skippedUsers,
    };
};

const getMaintenanceSetting = async (adminClient) => {
    const { data, error } = await adminClient
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();

    if (error) throw error;

    const value = data?.value || {};
    return {
        enabled: !!value.enabled,
        message: String(value.message || 'System maintenance is in progress. Please try again later.'),
        updated_at: value.updated_at || null,
    };
};

const upsertMaintenanceSetting = async (adminClient, { enabled, message, updatedBy }) => {
    const payload = {
        enabled: !!enabled,
        message: String(message || 'System maintenance is in progress. Please try again later.'),
        updated_at: new Date().toISOString(),
        updated_by: updatedBy || null,
    };

    const { error } = await adminClient
        .from('system_settings')
        .upsert({ key: 'maintenance_mode', value: payload }, { onConflict: 'key' });

    if (error) throw error;

    return payload;
};

exports.__setServiceClientFactoryForTest = (factory) => {
    serviceClientFactory = typeof factory === 'function' ? factory : createClient;
};

exports.getMaintenanceMode = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const setting = await getMaintenanceSetting(adminClient);

        return res.status(200).json(setting);
    } catch (error) {
        console.error('Error getting maintenance mode:', error);
        return res.status(500).json({ error: 'Failed to get maintenance mode' });
    }
};

exports.updateMaintenanceMode = async (req, res) => {
    try {
        const { enabled, message } = req.body || {};
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled (boolean) is required' });
        }

        const adminClient = getServiceSupabase();
        const payload = await upsertMaintenanceSetting(adminClient, {
            enabled,
            message,
            updatedBy: req.userId || null,
        });

        return res.status(200).json({
            message: enabled ? 'Global maintenance mode enabled' : 'Global maintenance mode disabled',
            maintenance: {
                enabled: payload.enabled,
                message: payload.message,
                updated_at: payload.updated_at,
            },
        });
    } catch (error) {
        console.error('Error updating maintenance mode:', error);
        return res.status(500).json({ error: 'Failed to update maintenance mode' });
    }
};

exports.getDashboardStats = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();

        const [
            { count: totalInstitutions },
            { count: activeSubscriptions },
            { count: totalUsers },
            { count: totalStudents },
            { count: totalTeachers },
            { count: totalAdmins },
            { count: totalMasterAdmins },
            { count: openSupportTickets },
            { data: recentInstitutions },
            { data: allInstitutions },
            { data: paymentRows },
        ] = await Promise.all([
            adminClient.from('institutions').select('*', { count: 'exact', head: true }),
            adminClient.from('institutions').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
            adminClient.from('users').select('*', { count: 'exact', head: true }),
            adminClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
            adminClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
            adminClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
            adminClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'master_admin'),
            adminClient.from('support_tickets')
                .select('*', { count: 'exact', head: true })
                .in('status', ['pending', 'open', 'in_progress', 'escalated']),
            adminClient
                .from('institutions')
                .select('id, name, created_at, subscription_status, subscription_plan')
                .order('created_at', { ascending: false })
                .limit(5),
            adminClient
                .from('institutions')
                .select('id, name, subscription_plan, subscription_status, subscription_cycle, subscription_tracking_start_date'),
            adminClient
                .from('financial_transactions')
                .select('institution_id, amount, status, type, direction')
                .eq('type', 'subscription')
                .eq('direction', 'inflow')
        ]);

        const paidByInstitution = new Map();
        for (const row of (paymentRows || [])) {
            if (!row?.institution_id || row?.status !== 'completed') continue;
            const prev = paidByInstitution.get(row.institution_id) || 0;
            paidByInstitution.set(row.institution_id, prev + Number(row.amount || 0));
        }

        const lifecycleSummary = (allInstitutions || []).map((inst) => {
            const lifecycle = getLifecycleForInstitution(inst, paidByInstitution.get(inst.id) || 0);
            return {
                institution_id: inst.id,
                institution_name: inst.name,
                ...lifecycle,
                cycle_end: lifecycle.cycleEnd ? lifecycle.cycleEnd.toISOString() : null,
            };
        });

        const expiringInstitutions = lifecycleSummary
            .filter((i) => i.shouldWarn)
            .sort((a, b) => (a.daysToExpiry ?? 9999) - (b.daysToExpiry ?? 9999))
            .slice(0, 20);

        const expiredInstitutions = lifecycleSummary
            .filter((i) => i.shouldExpire || String((allInstitutions || []).find((x) => x.id === i.institution_id)?.subscription_status || '').toLowerCase() === 'expired')
            .slice(0, 20);

        res.status(200).json({
            totalInstitutions,
            activeSubscriptions,
            totalUsers,
            totalStudents,
            totalTeachers,
            totalAdmins,
            totalMasterAdmins,
            openSupportTickets,
            recentInstitutions: recentInstitutions || [],
            expiringInstitutions,
            expiredInstitutions,
        });
    } catch (error) {
        console.error("Error fetching platform stats:", error);
        res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
};

exports.getPasswordAuditLogs = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const {
            page = '1',
            limit = '50',
            action,
            outcome,
            target_email,
            actor_user_id,
            target_user_id,
            from,
            to,
        } = req.query;

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const fromIdx = (pageNum - 1) * limitNum;
        const toIdx = fromIdx + limitNum - 1;

        let query = adminClient
            .from('password_audit_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(fromIdx, toIdx);

        if (action) query = query.eq('action', action);
        if (outcome) query = query.eq('outcome', outcome);
        if (target_email) query = query.ilike('target_email', `%${target_email}%`);
        if (actor_user_id) query = query.eq('actor_user_id', actor_user_id);
        if (target_user_id) query = query.eq('target_user_id', target_user_id);
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to);

        const { data, error, count } = await query;
        if (error) throw error;

        return res.status(200).json({
            logs: data || [],
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: count || 0,
                pages: count ? Math.ceil(count / limitNum) : 0,
            },
        });
    } catch (error) {
        console.error('Error fetching password audit logs:', error);
        return res.status(500).json({ error: 'Failed to fetch password audit logs' });
    }
};

exports.clearPasswordAuditLogs = async (req, res) => {
    try {
        const windowLabel = req.body?.window;
        const normalizedWindow = String(windowLabel || '').trim().toLowerCase();
        const confirmAll = req.body?.confirm === true;
        const windowMs = resolvePasswordAuditWindowMs(normalizedWindow);

        if (!isSupportedClearWindow(normalizedWindow)) {
            return res.status(400).json({
                error: 'Invalid window. Allowed values: 1h, 5h, 10h, 1d, 7d, all',
            });
        }

        if (normalizedWindow === 'all' && !confirmAll) {
            return res.status(400).json({
                error: 'Clearing all logs requires explicit confirm=true',
            });
        }
        const adminClient = getServiceSupabase();

        let cutoffIso = null;
        let rowsToDelete = [];

        if (normalizedWindow === 'all') {
            const { data: allRows, error: fetchAllError } = await adminClient
                .from('password_audit_logs')
                .select('id');
            if (fetchAllError) throw fetchAllError;
            rowsToDelete = allRows || [];
        } else {
            cutoffIso = new Date(Date.now() - windowMs).toISOString();
            const { data: rowsForWindow, error: fetchError } = await adminClient
                .from('password_audit_logs')
                .select('id')
                .lte('created_at', cutoffIso);
            if (fetchError) throw fetchError;
            rowsToDelete = rowsForWindow || [];
        }

        const ids = (rowsToDelete || []).map((row) => row.id).filter(Boolean);
        if (ids.length === 0) {
            return res.status(200).json({
                message: 'No logs matched the selected clear window.',
                deleted: 0,
                window: normalizedWindow,
            });
        }

        const { error: deleteError } = await adminClient
            .from('password_audit_logs')
            .delete()
            .in('id', ids);

        if (deleteError) throw deleteError;

        return res.status(200).json({
            message: 'Password audit logs cleared successfully.',
            deleted: ids.length,
            window: normalizedWindow,
            cutoff: cutoffIso,
        });
    } catch (error) {
        console.error('Error clearing password audit logs:', error);
        return res.status(500).json({ error: 'Failed to clear password audit logs' });
    }
};

exports.clearSystemActivityLogs = async (req, res) => {
    try {
        const normalizedWindow = String(req.body?.window || '').trim().toLowerCase();
        const confirmAll = req.body?.confirm === true;
        if (!isSupportedClearWindow(normalizedWindow)) {
            return res.status(400).json({
                error: 'Invalid window. Allowed values: 1h, 5h, 10h, 1d, 7d, all',
            });
        }

        if (normalizedWindow === 'all' && !confirmAll) {
            return res.status(400).json({
                error: 'Clearing all logs requires explicit confirm=true',
            });
        }

        const result = clearSystemActivityLogs({ window: normalizedWindow });
        return res.status(200).json({
            message: 'System activity logs cleared successfully.',
            deleted: result.deleted || 0,
            kept: result.kept || 0,
            window: normalizedWindow,
        });
    } catch (error) {
        console.error('Error clearing system activity logs:', error);
        return res.status(500).json({ error: 'Failed to clear system activity logs' });
    }
};

exports.getCredentialDeliveryByToken = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const token = req.params?.token;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        const { data: row, error } = await adminClient
            .from('credential_delivery_tokens')
            .select('id, target_email, temporary_password, expires_at, consumed_at')
            .eq('token', token)
            .maybeSingle();

        if (error || !row) {
            return res.status(404).json({ error: 'Credential token is invalid' });
        }

        const now = Date.now();
        const expiresAtMs = new Date(row.expires_at).getTime();

        if (row.consumed_at) {
            return res.status(410).json({ error: 'Credential token has already been used' });
        }

        if (Number.isFinite(expiresAtMs) && now > expiresAtMs) {
            return res.status(410).json({ error: 'Credential token has expired' });
        }

        await adminClient
            .from('credential_delivery_tokens')
            .update({ consumed_at: new Date().toISOString() })
            .eq('id', row.id);

        return res.status(200).json({
            email: row.target_email,
            temporary_password: row.temporary_password,
            consumed: true,
        });
    } catch (err) {
        console.error('getCredentialDeliveryByToken error:', err);
        return res.status(500).json({ error: err.message || 'Failed to load credentials' });
    }
};

exports.getAllInstitutions = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { data, error } = await adminClient
            .from('institutions')
            .select(`
                *,
                users!institution_id(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const institutionIds = (data || []).map((row) => row.id).filter(Boolean);
        let mainAdminByInstitution = new Map();
        let categoriesByInstitution = new Map();

        if (institutionIds.length > 0) {
            const { data: mainAdmins, error: mainAdminError } = await adminClient
                .from('admins')
                .select('institution_id, is_main, users:user_id(first_name, last_name)')
                .in('institution_id', institutionIds)
                .eq('is_main', true);

            if (mainAdminError) throw mainAdminError;

            mainAdminByInstitution = new Map(
                (mainAdmins || []).map((row) => [row.institution_id, {
                    admin_first_name: row?.users?.first_name || '',
                    admin_last_name: row?.users?.last_name || '',
                }])
            );

            categoriesByInstitution = await loadInstitutionCategoryMap(adminClient, institutionIds);
        }

        const institutions = (data || []).map((inst) => {
            const effectiveAddons = resolveInstitutionAddonFlags({
                plan: inst.subscription_plan,
                addon_library: inst.addon_library,
                addon_messaging: inst.addon_messaging,
                addon_diary: inst.addon_diary,
                addon_bursary: inst.addon_bursary,
            });

            return {
                ...inst,
                ...effectiveAddons,
                category_ids: (categoriesByInstitution.get(inst.id) || []).map((cat) => cat.id).filter(Boolean),
                categories: categoriesByInstitution.get(inst.id) || [],
                ...(mainAdminByInstitution.get(inst.id) || { admin_first_name: '', admin_last_name: '' }),
            };
        });

        res.status(200).json({ institutions });
    } catch (error) {
        console.error("Error fetching institutions:", error);
        res.status(500).json({ error: "Failed to fetch institutions" });
    }
};

exports.getInstitutionDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const adminClient = getServiceSupabase();
        const { data: institution, error: getErr } = await adminClient
            .from('institutions')
            .select('*')
            .eq('id', id)
            .single();

        if (getErr) throw getErr;

        // Fetch administrators for this institution (main admin first)
        const { data: admins } = await adminClient
            .from('admins')
            .select('is_main, users:user_id(id, first_name, last_name, full_name, email, phone)')
            .eq('institution_id', id)
            .order('is_main', { ascending: false });

        const normalizedAdmins = (admins || [])
            .map((row) => ({
                ...(row.users || {}),
                is_main: !!row.is_main,
            }))
            .filter((row) => !!row.id);

        const categoryMap = await loadInstitutionCategoryMap(adminClient, [id]);
        const institutionCategories = categoryMap.get(id) || [];

        res.status(200).json({
            institution: {
                ...institution,
                category_ids: institutionCategories.map((cat) => cat.id).filter(Boolean),
                categories: institutionCategories,
                ...resolveInstitutionAddonFlags({
                    plan: institution.subscription_plan,
                    addon_library: institution.addon_library,
                    addon_messaging: institution.addon_messaging,
                    addon_diary: institution.addon_diary,
                    addon_bursary: institution.addon_bursary,
                }),
            },
            admins: normalizedAdmins,
        });
    } catch (error) {
        console.error("Error fetching institution details:", error);
        res.status(500).json({ error: "Failed to fetch institution details" });
    }
};

/**
 * Update general institution details, including subscription metadata
 */
exports.updateInstitutionDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name,
            location,
            phone,
            email,
            principal_name,
            email_domain,
            currency_id,
            category_id,
            subscription_status, 
            subscription_plan, 
            subscription_cycle,
            subscription_tracking_start_date,
            addon_library, 
            addon_messaging, 
            addon_diary,
            addon_bursary, 
            custom_student_limit,
            admin_first_name,
            admin_last_name,
        } = req.body;

        const normalizedCategoryIds = normalizeCategoryIds(req.body);

        const adminClient = getServiceSupabase();

        if (custom_student_limit !== undefined && custom_student_limit !== null && String(custom_student_limit).trim() !== '') {
            const parsedLimit = Number(custom_student_limit);
            if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
                return res.status(400).json({ error: 'custom_student_limit must be a positive whole number.' });
            }
        }
        
        // Build update object dynamically to only update provided fields
        // updated_at is handled by DB trigger
        const updates = {};
        
        // Metadata fields
        if (name !== undefined) updates.name = name;
        if (location !== undefined) updates.location = location;
        if (phone !== undefined) updates.phone = phone;
        if (email !== undefined) updates.email = email;
        if (principal_name !== undefined) updates.principal_name = principal_name;
        if (email_domain !== undefined) {
            if (req.userRole !== 'master_admin') {
                return res.status(403).json({
                    error: 'Only Master Admin can update institution email domain.',
                    code: 'EMAIL_DOMAIN_EDIT_DENIED',
                });
            }
            updates.email_domain = email_domain;
        }
        if (category_id !== undefined) updates.category_id = category_id;
        if (req.body.category_ids !== undefined) {
            updates.category_id = normalizedCategoryIds[0] || null;
        }
        if (currency_id !== undefined) {
            const resolvedCurrencyId = await ensureActiveCurrencyId(adminClient, currency_id);
            if (!resolvedCurrencyId) {
                return res.status(400).json({ error: 'Invalid or inactive currency_id supplied.' });
            }
            updates.currency_id = resolvedCurrencyId;
        }
        
        // Subscription fields
        if (subscription_status !== undefined) updates.subscription_status = subscription_status;
        if (subscription_plan !== undefined) updates.subscription_plan = normalizeInstitutionPlan(subscription_plan);
        if (subscription_cycle !== undefined) updates.subscription_cycle = subscription_cycle;
        if (subscription_tracking_start_date !== undefined) {
            updates.subscription_tracking_start_date = subscription_tracking_start_date;
        }
        
        // Add-ons (Ensure boolean casting for consistency)
        if (addon_library !== undefined) updates.addon_library = !!addon_library;
        if (addon_messaging !== undefined) updates.addon_messaging = !!addon_messaging;
        if (addon_diary !== undefined) updates.addon_diary = !!addon_diary;
        if (addon_bursary !== undefined) updates.addon_bursary = !!addon_bursary;
        if (custom_student_limit !== undefined) {
            if (custom_student_limit === null || String(custom_student_limit).trim() === '') {
                updates.custom_student_limit = null;
            } else {
                updates.custom_student_limit = Number(custom_student_limit);
            }
        }

        const { data: institutionBeforeUpdate, error: beforeErr } = await adminClient
            .from('institutions')
            .select('id, email_domain, subscription_plan')
            .eq('id', id)
            .single();

        if (beforeErr) throw beforeErr;

        const targetPlan = updates.subscription_plan || normalizeInstitutionPlan(institutionBeforeUpdate?.subscription_plan);
        if (targetPlan === 'beta') {
            Object.assign(updates, resolveInstitutionAddonFlags({ plan: 'beta' }));
        }

        const { data: updatedInst, error } = await adminClient
            .from('institutions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (category_id !== undefined || req.body.category_ids !== undefined) {
            await syncInstitutionCategories(adminClient, id, normalizedCategoryIds);
        }

        const refreshedCategoryMap = await loadInstitutionCategoryMap(adminClient, [id]);
        const refreshedCategories = refreshedCategoryMap.get(id) || [];
        const refreshedCategoryIds = refreshedCategories.map((cat) => cat.id).filter(Boolean);

        const incomingFirst = admin_first_name !== undefined ? String(admin_first_name || '').trim() : undefined;
        const incomingLast = admin_last_name !== undefined ? String(admin_last_name || '').trim() : undefined;

        let mainAdminNewEmail = null;
        if (incomingFirst !== undefined || incomingLast !== undefined) {
            const { data: mainAdminRow, error: mainAdminError } = await adminClient
                .from('admins')
                .select('user_id, users:user_id(id, first_name, last_name, email), institutions:institution_id(email_domain)')
                .eq('institution_id', id)
                .eq('is_main', true)
                .maybeSingle();

            if (mainAdminError) throw mainAdminError;

            if (mainAdminRow?.users?.id) {
                const currentFirst = String(mainAdminRow.users.first_name || '').trim();
                const currentLast = String(mainAdminRow.users.last_name || '').trim();
                const nextFirst = incomingFirst !== undefined ? incomingFirst : currentFirst;
                const nextLast = incomingLast !== undefined ? incomingLast : currentLast;
                const hasNameChange = nextFirst !== currentFirst || nextLast !== currentLast;

                if (hasNameChange) {
                    const domain = String(
                        updates.email_domain ||
                        mainAdminRow?.institutions?.email_domain ||
                        updatedInst?.email_domain ||
                        ''
                    ).trim().toLowerCase();

                    const nextEmail = await generateUniqueInstitutionEmail(adminClient, {
                        firstName: nextFirst,
                        lastName: nextLast,
                        emailDomain: domain,
                        excludeUserId: mainAdminRow.users.id,
                    });

                    const nextFullName = `${nextFirst} ${nextLast}`.trim();

                    const { error: mainUserUpdateError } = await adminClient
                        .from('users')
                        .update({
                            first_name: nextFirst,
                            last_name: nextLast,
                            full_name: nextFullName,
                            email: nextEmail,
                        })
                        .eq('id', mainAdminRow.users.id);

                    if (mainUserUpdateError) throw mainUserUpdateError;

                    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(mainAdminRow.users.id, {
                        email: nextEmail,
                        user_metadata: {
                            full_name: nextFullName,
                            first_name: nextFirst,
                            last_name: nextLast,
                        },
                    });

                    if (authUpdateError) throw authUpdateError;

                    mainAdminNewEmail = nextEmail;
                }
            }
        }

        const previousDomain = String(institutionBeforeUpdate?.email_domain || '').trim().toLowerCase();
        const nextDomain = String(updatedInst?.email_domain || '').trim().toLowerCase();
        let domainMigration = null;

        if (previousDomain && nextDomain && previousDomain !== nextDomain) {
            domainMigration = await migrateInstitutionDomainUsers({
                adminClient,
                institutionId: id,
                previousDomain,
                nextDomain,
            });

            const changedUserIds = (domainMigration?.changedUsers || []).map((u) => u.user_id);
            if (changedUserIds.length > 0) {
                await revokeInstitutionUserSessions(adminClient, changedUserIds);
            }
        }

        res.status(200).json({
            message: "Institution updated successfully",
            institution: {
                ...updatedInst,
                category_ids: refreshedCategoryIds,
                categories: refreshedCategories,
                ...resolveInstitutionAddonFlags({
                    plan: updatedInst?.subscription_plan,
                    addon_library: updatedInst?.addon_library,
                    addon_messaging: updatedInst?.addon_messaging,
                    addon_diary: updatedInst?.addon_diary,
                    addon_bursary: updatedInst?.addon_bursary,
                }),
            },
            main_admin_new_email: mainAdminNewEmail,
            domain_migration: domainMigration
                ? {
                    previous_domain: previousDomain,
                    next_domain: nextDomain,
                    migrated_count: domainMigration.changedUsers.length,
                    migrated_users: domainMigration.changedUsers,
                    skipped_users: domainMigration.skippedUsers,
                    sessions_revoked: domainMigration.changedUsers.length > 0,
                }
                : null,
        });
    } catch (error) {
        console.error("Error updating institution details:", error);
        res.status(500).json({ error: "Failed to update institution details" });
    }
};

/**
 * Specifically update subscription status and plan
 */
exports.updateSubscriptionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            subscription_status, 
            subscription_plan, 
            subscription_cycle,
            subscription_tracking_start_date,
            addon_library,
            addon_messaging,
            addon_diary,
            addon_bursary,
        } = req.body;

        const adminClient = getServiceSupabase();
        
        const updates = {};
        // updated_at is handled by DB trigger
        
        if (subscription_status !== undefined) updates.subscription_status = subscription_status;
        if (subscription_plan !== undefined) updates.subscription_plan = normalizeInstitutionPlan(subscription_plan);
        if (subscription_cycle !== undefined) updates.subscription_cycle = subscription_cycle;
        if (subscription_tracking_start_date !== undefined) {
            updates.subscription_tracking_start_date = subscription_tracking_start_date;
        }

        const { data: beforeUpdate } = await adminClient
            .from('institutions')
            .select('id, name, subscription_plan, subscription_status, subscription_tracking_start_date, addon_library, addon_messaging, addon_diary, addon_bursary')
            .eq('id', id)
            .maybeSingle();

        const effectivePlan = normalizeInstitutionPlan(updates.subscription_plan || beforeUpdate?.subscription_plan);

        if (addon_library !== undefined) updates.addon_library = !!addon_library;
        if (addon_messaging !== undefined) updates.addon_messaging = !!addon_messaging;
        if (addon_diary !== undefined) updates.addon_diary = !!addon_diary;
        if (addon_bursary !== undefined) updates.addon_bursary = !!addon_bursary;

        if (effectivePlan === 'beta') {
            Object.assign(updates, resolveInstitutionAddonFlags({ plan: 'beta' }));
        }

        const { data: updatedInst, error } = await adminClient
            .from('institutions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        logSystemActivity({
            event: 'subscription.updated',
            actor_user_id: req.userId || null,
            actor_role: req.userRole || null,
            institution_id: id,
            details: {
                before: beforeUpdate || null,
                after: {
                    subscription_status: updatedInst?.subscription_status || null,
                    subscription_plan: updatedInst?.subscription_plan || null,
                    subscription_tracking_start_date: updatedInst?.subscription_tracking_start_date || null,
                },
            },
        });

        if (subscription_status === 'suspended' || subscription_status === 'expired' || subscription_status === 'cancelled') {
            try {
                const { data: users } = await adminClient
                    .from('users')
                    .select('id')
                    .eq('institution_id', id);

                const userIds = (users || []).map((u) => u.id).filter(Boolean);
                if (userIds.length > 0) {
                    const { data: sessions } = await adminClient
                        .from('user_sessions')
                        .select('session_id')
                        .in('user_id', userIds)
                        .eq('is_revoked', false);

                    const sessionIds = (sessions || []).map((s) => s.session_id).filter(Boolean);
                    if (sessionIds.length > 0) {
                        await adminClient
                            .from('user_sessions')
                            .update({ is_revoked: true })
                            .in('session_id', sessionIds);
                    }
                }
            } catch (sessionErr) {
                console.error('Failed to revoke sessions after institution suspension:', sessionErr);
            }
        }

        res.status(200).json({
            message: "Subscription updated successfully",
            institution: {
                ...updatedInst,
                ...resolveInstitutionAddonFlags({
                    plan: updatedInst?.subscription_plan,
                    addon_library: updatedInst?.addon_library,
                    addon_messaging: updatedInst?.addon_messaging,
                    addon_diary: updatedInst?.addon_diary,
                    addon_bursary: updatedInst?.addon_bursary,
                }),
            },
        });
    } catch (error) {
        console.error("Error updating subscription status:", error);
        res.status(500).json({ error: "Failed to update subscription status" });
    }
};

exports.notifyTarget = async (req, res) => {
    const { title, message, target, institution_id, expiry_days } = req.body;
    try {
        const expiryValidation = validateDaysInput(expiry_days, 'expiry_days');
        if (!expiryValidation.ok) {
            return res.status(400).json({ error: expiryValidation.error });
        }
        const expiryDays = expiryValidation.value;
        const expiresAt = computeExpiryIsoFromDays(expiryDays);
        const adminClient = getServiceSupabase();

        if (!title || !String(title).trim() || !message || !String(message).trim()) {
            return res.status(400).json({ error: 'Title and message are required.' });
        }

        const resolvedTarget = target === 'specific' ? 'specific' : (target === 'all_admins' ? 'all_admins' : 'all_admins');
        if (resolvedTarget === 'specific' && !institution_id) {
            return res.status(400).json({ error: 'institution_id is required when sending to a specific institution.' });
        }

        const noticeId = `notice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        let institutionName = null;
        if (resolvedTarget === 'specific') {
            const { data: instRow } = await adminClient
                .from('institutions')
                .select('name')
                .eq('id', institution_id)
                .single();
            institutionName = instRow?.name || null;
        }

        let query = adminClient
            .from('users')
            .select('id, institution_id')
            .in('role', ['admin', 'school_admin']);

        if (resolvedTarget === 'specific') {
            query = query.eq('institution_id', institution_id);
        }

        const { data: admins, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;

        if (admins && admins.length > 0) {
            const notifications = admins.map(admin => ({
                user_id: admin.id,
                title,
                message,
                type: 'info',
                is_read: false,
                institution_id: admin.institution_id || null
            }));

            const deliveryResult = await sendBulkInAppNotificationsWithHistory(
              notifications.map((n) => ({
                user_id: n.user_id,
                title: n.title,
                message: n.message,
                type: n.type,
                expires_at: expiresAt,
                data: {
                    source: 'master_admin_notice',
                    notice_id: noticeId,
                    target: resolvedTarget,
                    institution_id: resolvedTarget === 'specific' ? institution_id : null,
                    institution_name: resolvedTarget === 'specific' ? institutionName : null,
                    expires_at: expiresAt,
                    expiry_days: expiryDays,
                },
                institution_id: n.institution_id,
              }))
            );

            const hasFailures = deliveryResult.some((r) => !r.ok);
            if (hasFailures) {
              console.error('Some notifications failed in notifyTarget', deliveryResult.filter((r) => !r.ok));
            }

            const delivered = deliveryResult.filter((r) => r.ok).length;
            const failed = deliveryResult.filter((r) => !r.ok).length;

            return res.status(200).json({
                message: 'Notifications dispatched successfully',
                count: admins.length,
                delivered,
                failed,
                notice_id: noticeId,
                expires_at: expiresAt,
                expiry_days: expiryDays,
            });
        }

        return res.status(200).json({
            message: 'No admins matched the selected target.',
            count: 0,
            delivered: 0,
            failed: 0,
            notice_id: noticeId,
            expires_at: expiresAt,
            expiry_days: expiryDays,
        });
    } catch (error) {
        console.error("Error sending notifications:", error);
        return res.status(500).json({ error: "Failed to send notifications" });
    }
};

/**
 * Notices management list for master admins
 */
exports.getNoticeHistory = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const nowIso = new Date().toISOString();

        const { data: attempts, error: attemptsError } = await adminClient
            .from('notification_delivery_attempts')
            .select('id, notification_id, title, message, status, recipient_user_id, institution_id, payload, created_at, delivered_at, error_message')
            .eq('channel', 'in_app')
            .order('created_at', { ascending: false })
            .limit(1200);

        if (attemptsError) throw attemptsError;

        const sourceRows = (attempts || []).filter((a) => a?.payload?.source === 'master_admin_notice');

        const filtered = sourceRows.filter((a) => {
            if (!a?.payload?.expires_at) return true;
            return new Date(a.payload.expires_at).getTime() > Date.now();
        });

        const grouped = new Map();
        for (const row of filtered) {
            const noticeId = row?.payload?.notice_id || row.id;
            if (!grouped.has(noticeId)) {
                grouped.set(noticeId, {
                    notice_id: noticeId,
                    title: row.title,
                    message: row.message,
                    target: row?.payload?.target || 'all_admins',
                    institution_id: row?.payload?.institution_id || row.institution_id || null,
                    institution_name: row?.payload?.institution_name || null,
                    created_at: row.created_at,
                    expires_at: row?.payload?.expires_at || null,
                    recipients: new Set(),
                    notification_ids: new Set(),
                    delivered_count: 0,
                    failed_count: 0,
                    retry_scheduled_count: 0,
                });
            }

            const bucket = grouped.get(noticeId);
            bucket.recipients.add(row.recipient_user_id);
            if (row.notification_id) bucket.notification_ids.add(row.notification_id);
            if (row.status === 'delivered') bucket.delivered_count += 1;
            else if (row.status === 'failed') bucket.failed_count += 1;
            else if (row.status === 'retry_scheduled') bucket.retry_scheduled_count += 1;
            if (row.created_at > bucket.created_at) bucket.created_at = row.created_at;
            if (!bucket.expires_at && row?.payload?.expires_at) bucket.expires_at = row.payload.expires_at;
        }

        const notices = [...grouped.values()]
            .map((n) => ({
                ...n,
                recipient_count: n.recipients.size,
                notification_ids: [...n.notification_ids],
            }))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const expiredNotificationIds = sourceRows
            .filter((a) => a?.payload?.expires_at && new Date(a.payload.expires_at).toISOString() <= nowIso)
            .map((a) => a.notification_id)
            .filter(Boolean);

        if (expiredNotificationIds.length > 0) {
            await adminClient
                .from('notifications')
                .delete()
                .in('id', expiredNotificationIds);
        }

        return res.status(200).json({ notices });
    } catch (error) {
        console.error('Error fetching notice history:', error);
        return res.status(500).json({ error: 'Failed to fetch notice history' });
    }
};

exports.updateNotice = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { noticeId } = req.params;
        const { title, message } = req.body || {};

        if (!noticeId) {
            return res.status(400).json({ error: 'noticeId is required' });
        }
        if (!title || !String(title).trim() || !message || !String(message).trim()) {
            return res.status(400).json({ error: 'Title and message are required.' });
        }

        const { data: attempts, error: attemptsError } = await adminClient
            .from('notification_delivery_attempts')
            .select('id, notification_id, payload')
            .eq('channel', 'in_app')
            .order('created_at', { ascending: false })
            .limit(2000);

        if (attemptsError) throw attemptsError;

        const matched = (attempts || []).filter((a) => a?.payload?.source === 'master_admin_notice' && a?.payload?.notice_id === noticeId);
        if (matched.length === 0) {
            return res.status(404).json({ error: 'Notice not found' });
        }

        const notificationIds = [...new Set(matched.map((m) => m.notification_id).filter(Boolean))];
        const attemptIds = [...new Set(matched.map((m) => m.id).filter(Boolean))];

        if (notificationIds.length > 0) {
            const { error: notifUpdateError } = await adminClient
                .from('notifications')
                .update({ title: String(title).trim(), message: String(message).trim() })
                .in('id', notificationIds);
            if (notifUpdateError) throw notifUpdateError;
        }

        if (attemptIds.length > 0) {
            const { error: attemptsUpdateError } = await adminClient
                .from('notification_delivery_attempts')
                .update({ title: String(title).trim(), message: String(message).trim() })
                .in('id', attemptIds);
            if (attemptsUpdateError) throw attemptsUpdateError;
        }

        return res.status(200).json({ message: 'Notice updated successfully' });
    } catch (error) {
        console.error('Error updating notice:', error);
        return res.status(500).json({ error: 'Failed to update notice' });
    }
};

exports.deleteNotice = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { noticeId } = req.params;

        if (!noticeId) {
            return res.status(400).json({ error: 'noticeId is required' });
        }

        const { data: attempts, error: attemptsError } = await adminClient
            .from('notification_delivery_attempts')
            .select('id, notification_id, payload')
            .eq('channel', 'in_app')
            .order('created_at', { ascending: false })
            .limit(3000);

        if (attemptsError) throw attemptsError;

        const matched = (attempts || []).filter((a) => a?.payload?.source === 'master_admin_notice' && a?.payload?.notice_id === noticeId);
        if (matched.length === 0) {
            return res.status(404).json({ error: 'Notice not found' });
        }

        const notificationIds = [...new Set(matched.map((m) => m.notification_id).filter(Boolean))];
        const attemptIds = [...new Set(matched.map((m) => m.id).filter(Boolean))];

        if (notificationIds.length > 0) {
            const { error: notifDeleteError } = await adminClient
                .from('notifications')
                .delete()
                .in('id', notificationIds);
            if (notifDeleteError) throw notifDeleteError;
        }

        if (attemptIds.length > 0) {
            const { error: attemptsDeleteError } = await adminClient
                .from('notification_delivery_attempts')
                .delete()
                .in('id', attemptIds);
            if (attemptsDeleteError) throw attemptsDeleteError;
        }

        return res.status(200).json({ message: 'Notice deleted successfully' });
    } catch (error) {
        console.error('Error deleting notice:', error);
        return res.status(500).json({ error: 'Failed to delete notice' });
    }
};

exports.extendNoticeExpiry = async (req, res) => {
    try {
        const { noticeId } = req.params;
        const extendValidation = validateDaysInput(req.body?.extend_days ?? req.body?.expiry_days, 'extend_days');
        if (!extendValidation.ok) {
            return res.status(400).json({ error: extendValidation.error });
        }
        const extendDays = extendValidation.value;
        const adminClient = getServiceSupabase();

        if (!noticeId) {
            return res.status(400).json({ error: 'noticeId is required' });
        }

        const { data: attempts, error: attemptsError } = await adminClient
            .from('notification_delivery_attempts')
            .select('id, notification_id, payload')
            .eq('channel', 'in_app')
            .order('created_at', { ascending: false })
            .limit(3000);

        if (attemptsError) throw attemptsError;

        const matched = (attempts || []).filter((a) => a?.payload?.source === 'master_admin_notice' && a?.payload?.notice_id === noticeId);
        if (matched.length === 0) {
            return res.status(404).json({ error: 'Notice not found' });
        }

        const notificationIds = [...new Set(matched.map((m) => m.notification_id).filter(Boolean))];
        const currentExpiryMs = matched
            .map((m) => new Date(m?.payload?.expires_at || 0).getTime())
            .filter((ms) => Number.isFinite(ms) && ms > 0)
            .sort((a, b) => b - a)[0] || Date.now();

        const nextExpiry = computeExpiryIsoFromDays(extendDays, new Date(currentExpiryMs).toISOString());

        if (notificationIds.length > 0) {
            const { error: notifUpdateError } = await adminClient
                .from('notifications')
                .update({ expires_at: nextExpiry })
                .in('id', notificationIds);
            if (notifUpdateError) throw notifUpdateError;
        }

        const payloadUpdates = matched.map((attempt) => {
            const nextPayload = {
                ...(attempt.payload || {}),
                expires_at: nextExpiry,
            };

            return adminClient
                .from('notification_delivery_attempts')
                .update({ payload: nextPayload })
                .eq('id', attempt.id);
        });

        if (payloadUpdates.length > 0) {
            const payloadResults = await Promise.all(payloadUpdates);
            const payloadFailure = payloadResults.find((r) => r.error);
            if (payloadFailure?.error) throw payloadFailure.error;
        }

        return res.status(200).json({
            message: 'Notice expiry extended successfully',
            notice_id: noticeId,
            expires_at: nextExpiry,
            extended_by_days: extendDays,
        });
    } catch (error) {
        console.error('Error extending notice expiry:', error);
        return res.status(500).json({ error: 'Failed to extend notice expiry' });
    }
};

/**
 * Enroll a new institution and create its main admin user
 */
exports.enrollInstitution = async (req, res) => {
    try {
        const {
            institution_name,
            location,
            admin_full_name,
            admin_first_name,
            admin_last_name,
            email_domain,
            subscription_start_date,
            currency_id,
        } = req.body;
        const normalizedCategoryIds = normalizeCategoryIds(req.body);

        const fName = admin_first_name || admin_full_name?.split(' ')[0] || '';
        const lName = admin_last_name || admin_full_name?.split(' ').slice(1).join(' ') || '';
        const finalFullName = admin_full_name || `${fName} ${lName}`.trim();

        if (!institution_name || !fName) {
            return res.status(400).json({ error: "Missing required fields for enrollment (Institution Name, Admin First Name)." });
        }

        const adminClient = getServiceSupabase();
        const resolvedCurrencyId = await ensureActiveCurrencyId(adminClient, currency_id, { allowDefaultFallback: true });
        if (!resolvedCurrencyId) {
            return res.status(400).json({ error: 'A valid active currency is required.' });
        }

        let resolvedDomain = (email_domain || '').trim().toLowerCase();
        if (!resolvedDomain) {
            resolvedDomain = `${institution_name.toLowerCase().replace(/\s+/g, '')}.edu`;
        }

        const cleanFirst = String(fName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanLast = String(lName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const baseEmailName = cleanFirst && cleanLast ? `${cleanFirst}.${cleanLast}` : cleanFirst;

        if (!baseEmailName) {
            return res.status(400).json({ error: 'Unable to generate admin email from provided name.' });
        }

        let admin_email = `${baseEmailName}@${resolvedDomain}`;
        let suffix = 1;
        for (;;) {
            const { data: existingRows, error: emailCheckError } = await adminClient
                .from('users')
                .select('id')
                .ilike('email', admin_email)
                .limit(1);
            if (emailCheckError) throw emailCheckError;
            const existing = Array.isArray(existingRows) ? existingRows[0] : null;
            if (!existing) break;
            suffix += 1;
            admin_email = `${baseEmailName}${suffix}@${resolvedDomain}`;
        }

        const admin_password = generateTempPassword();
        const effectivePlan = req.body.subscription_plan || 'basic';
        if (!['basic', 'pro', 'premium', 'beta'].includes(effectivePlan)) {
            return res.status(400).json({ error: 'Invalid subscription plan.' });
        }
        if (effectivePlan !== 'beta' && !subscription_start_date) {
            return res.status(400).json({ error: 'subscription_start_date is required for basic/pro/premium plans.' });
        }
        if (effectivePlan === 'beta' && (req.body.custom_student_limit === null || req.body.custom_student_limit === undefined || req.body.custom_student_limit === '')) {
            return res.status(400).json({ error: 'custom_student_limit is required for beta plan.' });
        }
        if (effectivePlan === 'beta') {
            const parsedLimit = Number(req.body.custom_student_limit);
            if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
                return res.status(400).json({ error: 'custom_student_limit must be a positive whole number.' });
            }
        }
        const subscriptionStartIso =
            effectivePlan === 'beta'
                ? null
                : (subscription_start_date
                    ? new Date(`${subscription_start_date}T00:00:00.000Z`).toISOString()
                    : new Date().toISOString());

        // 1. Create the institution record
        const { data: newInst, error: instError } = await adminClient
            .from('institutions')
            .insert([{
                name: institution_name,
                location: location || '',
                email_domain: resolvedDomain,
                currency_id: resolvedCurrencyId,
                type: req.body.type || 'secondary', 
                category_id: normalizedCategoryIds[0] || null,
                subscription_status: 'active',
                subscription_plan: effectivePlan,
                subscription_cycle: req.body.subscription_cycle || 'monthly',
                has_used_trial: true,
                subscription_tracking_start_date: subscriptionStartIso,
                ...resolveInstitutionAddonFlags({
                    plan: effectivePlan,
                    addon_library: req.body.addon_library,
                    addon_messaging: req.body.addon_messaging,
                    addon_diary: req.body.addon_diary,
                    addon_bursary: req.body.addon_bursary,
                }),
                custom_student_limit: effectivePlan === 'beta' ? Number(req.body.custom_student_limit) : null
            }])
            .select('id')
            .single();

        if (instError || !newInst) {
            console.error("Error creating institution:", {
                error: instError,
                payload: {
                    name: institution_name,
                    location: location || '',
                    subscription_plan: req.body.subscription_plan || 'basic',
                    subscription_status: req.body.subscription_status || 'active'
                }
            });
            return res.status(500).json({ 
                error: "Failed to create institution record.",
                details: instError?.message,
                hint: "Check database constraints for subscription_plan or type."
            });
        }

        if (normalizedCategoryIds.length > 0) {
            await syncInstitutionCategories(adminClient, newInst.id, normalizedCategoryIds);
        }

        // 2. Create the admin user in Supabase Auth
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
            email: admin_email,
            password: admin_password,
            email_confirm: true,
            user_metadata: { 
                full_name: finalFullName,
                first_name: fName,
                last_name: lName
            }
        });

        if (authError || !authUser.user) {
            console.error("Error creating auth user:", authError);
            // Clean up the institution if user creation fails
            await adminClient.from('institutions').delete().eq('id', newInst.id);
            return res.status(400).json({ error: authError?.message || "Failed to create admin user." });
        }

        // 3. INSERT the user profile into public.users — NOT update, there is no row yet.
        //    This INSERT fires the `handle_user_role_entry` trigger which auto-creates the admins row.
        const { error: profileError } = await adminClient
            .from('users')
            .upsert({
                id: authUser.user.id,
                email: admin_email,
                role: 'admin',
                institution_id: newInst.id,
                status: 'approved',
                must_change_password: true,
                requires_security_questions_setup: true,
                full_name: finalFullName,
                first_name: fName,
                last_name: lName
            })
            .eq('id', authUser.user.id);       
        
        
        if (profileError) {
            console.error("Error updating user profile:", {
                error: profileError,
                uid: authUser.user.id,
                institution_id: newInst.id
            });
            // Clean up the institution and auth user if mapping fails
            await adminClient.from('institutions').delete().eq('id', newInst.id);
            await adminClient.auth.admin.deleteUser(authUser.user.id);
            return res.status(500).json({ 
                error: "Failed to map new user profile.",
                details: profileError?.message
            });
        }

        // 4. Enforce this seeded institution admin as main admin.
        const { error: mainAdminFlagError } = await adminClient
            .from('admins')
            .update({ is_main: true })
            .eq('user_id', authUser.user.id)
            .eq('institution_id', newInst.id);

        if (mainAdminFlagError) {
            console.error('Failed to mark enrolled admin as main admin:', mainAdminFlagError);
        }

        const credentialDelivery = await createCredentialDeliveryToken({
            adminClient,
            createdBy: req.user?.id || null,
            targetUserId: authUser.user.id,
            targetEmail: admin_email,
            temporaryPassword: admin_password,
            metadata: {
                role: 'admin',
                institution_id: newInst.id,
            },
        });

        return res.status(201).json({
            message: "Institution and Admin User created successfully.",
            institution_id: newInst.id,
            category_ids: normalizedCategoryIds,
            user_id: authUser.user.id,
            admin_email,
            tempPassword: admin_password,
            credential_delivery: credentialDelivery,
            credential_document: buildCredentialDocument({
                fullName: finalFullName,
                role: 'admin',
                email: admin_email,
                temporaryPassword: admin_password,
                credentialUrl: credentialDelivery.url,
                expiresAt: credentialDelivery.expiresAt,
            }),
        });

    } catch (error) {
        console.error("Platform Admin Enroll Error:", error);
        return res.status(500).json({ error: "Server error during enrollment." });
    }
};

/**
 * Delete an institution and all its associated users
 */
exports.deleteInstitution = async (req, res) => {
    const { id } = req.params;
    try {
        const adminClient = getServiceSupabase();

        // 1. Fetch all users in this institution
        const { data: instUsers } = await adminClient
            .from('users')
            .select('id')
            .eq('institution_id', id);

        // 2. Delete each user from auth (cascade will handle DB rows)
        if (instUsers && instUsers.length > 0) {
            for (const u of instUsers) {
                await adminClient.auth.admin.deleteUser(u.id);
            }
        }

        // 3. Defensive cleanup for any profile rows still linked to institution.
        // (Normally removed by auth delete; kept to guarantee full purge.)
        const { error: usersErr } = await adminClient
            .from('users')
            .delete()
            .eq('institution_id', id);

        if (usersErr) throw usersErr;

        // 4. Delete the institution. All remaining institution-scoped records
        // are removed via FK ON DELETE CASCADE migration.
        const { error: instErr } = await adminClient
            .from('institutions')
            .delete()
            .eq('id', id);

        if (instErr) throw instErr;

        return res.status(200).json({ message: "Institution deleted successfully." });
    } catch (error) {
        console.error("Error deleting institution:", error);
        return res.status(500).json({ error: "Failed to delete institution." });
    }
};

/**
 * Enroll a new Master Admin
 */
exports.enrollMasterAdmin = async (req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;

        const fName = String(first_name || '').trim();
        const lName = String(last_name || '').trim();
        const finalFullName = `${fName} ${lName}`.trim();

        if (!fName || !email || !password) {
            return res.status(400).json({ error: "Missing required fields for master admin enrollment (First Name, Email, Password)." });
        }

        const adminClient = getServiceSupabase();

        // Create the user in Supabase Auth
        const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { 
                full_name: finalFullName,
                first_name: fName,
                last_name: lName
            }
        });

        if (authError || !authUser.user) {
            console.error("Error creating auth user:", authError);
            return res.status(400).json({ error: authError?.message || "Failed to create user." });
        }

        // INSERT into public.users (triggers handle_user_role_entry for master_admin role)
        const { error: profileError } = await adminClient
            .from('users')
            .insert({
                id: authUser.user.id,
                email: email,
                full_name: finalFullName,
                first_name: fName,
                last_name: lName,
                role: 'master_admin',
                institution_id: null,
                status: 'approved',
            });

        if (profileError) {
            console.error("Error inserting user profile for master admin:", profileError);
            await adminClient.auth.admin.deleteUser(authUser.user.id);
            return res.status(500).json({ error: "Failed to create master admin profile." });
        }

        // Insert into platform_admins — only columns that exist in the table
        const { error: paError } = await adminClient
            .from('platform_admins')
            .insert([{
                id: authUser.user.id,
                user_id: authUser.user.id,
                full_name: finalFullName,
                email: email
            }]);

        if (paError) {
            console.error("Error inserting into platform_admins:", paError);
            // Non-fatal — user is still functional
        }

        return res.status(201).json({
            message: "Master Admin created successfully."
        });

    } catch (error) {
        console.error("Master Admin Enroll Error:", error);
        return res.status(500).json({ error: "Server error during master admin enrollment." });
    }
};




/**
 * Get all support tickets
 */
exports.getSupportRequests = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { data, error } = await withSupabaseRetry(() =>
            adminClient
                .from('support_tickets')
                .select(`
                    *,
                    users:user_id(first_name, last_name, email),
                    institutions:institution_id(name),
                    assigned_to:assigned_to_id(first_name, last_name)
                `)
                .order('created_at', { ascending: false })
        );

        if (error) throw error;

        // Map to include inst field easily
        const mappedData = data.map(ticket => mapSupportTicketForClient({
            ...ticket,
            inst: ticket.institutions?.name || 'Unknown',
            user_name: ticket.users?.first_name
                       ? `${ticket.users.first_name} ${ticket.users.last_name || ''}`.trim()
                       : 'Unknown',
            title: ticket.subject,
            date: ticket.created_at.split('T')[0],
            assigned_name: ticket.assigned_to?.first_name
                           ? `${ticket.assigned_to.first_name} ${ticket.assigned_to.last_name || ''}`.trim()
                           : 'Unassigned'
        }));

        res.status(200).json({ requests: mappedData });
    } catch (error) {
        console.error("Error fetching support tickets:", error);
        if (isTransientSupabaseError(error)) {
            return res.status(503).json({ error: "Support service temporarily unavailable", code: 'SUPPORT_SERVICE_UNAVAILABLE' });
        }
        res.status(500).json({ error: "Failed to fetch support tickets" });
    }
};

/**
 * Update support ticket
 */
exports.updateSupportRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority, assigned_to_id, escalation_level, resolution_note } = req.body;

        const adminClient = getServiceSupabase();
        const { data: existing, error: existingError } = await adminClient
            .from('support_tickets')
            .select('id, user_id, institution_id, status, metadata')
            .eq('id', id)
            .single();

        if (existingError || !existing) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const currentWorkflow = toWorkflowSupportStatus(existing.status);
        let targetWorkflow = currentWorkflow;
        if (status) {
            targetWorkflow = String(status).toLowerCase();
            if (!(targetWorkflow in SUPPORT_STATUS_ORDER)) {
                return res.status(400).json({ error: 'Invalid status transition target.' });
            }
            if (SUPPORT_STATUS_ORDER[targetWorkflow] < SUPPORT_STATUS_ORDER[currentWorkflow]) {
                return res.status(400).json({ error: 'Status cannot move backwards.' });
            }
            if (SUPPORT_STATUS_ORDER[targetWorkflow] - SUPPORT_STATUS_ORDER[currentWorkflow] > 1) {
                return res.status(400).json({ error: 'Status must move one step at a time.' });
            }
        }

        const updates = { updated_at: new Date().toISOString() };
        if (status) updates.status = INTERNAL_SUPPORT_STATUS[targetWorkflow];
        if (priority) updates.priority = priority;
        if (assigned_to_id !== undefined) updates.assigned_to_id = assigned_to_id;
        if (escalation_level !== undefined) updates.escalation_level = escalation_level;
        if (targetWorkflow === 'resolved') {
            updates.resolved_at = new Date().toISOString();
            updates.metadata = {
                ...(existing.metadata || {}),
                resolution_note: typeof resolution_note === 'string' ? resolution_note.trim() : (existing.metadata?.resolution_note || ''),
            };
        }

        const { data, error } = await adminClient
            .from('support_tickets')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (status) {
            const action = targetWorkflow;
            const actionLabel = action === 'acknowledged'
                ? 'acknowledged'
                : action === 'in_progress'
                    ? 'in progress'
                    : action === 'resolved'
                        ? 'resolved'
                        : 'updated';

            await sendSupportTicketNotification({
                userId: existing.user_id,
                institutionId: existing.institution_id,
                ticketId: existing.id,
                title: `Ticket ${actionLabel}`,
                message: action === 'resolved' && resolution_note
                    ? `Your support ticket has been ${actionLabel}. Note: ${String(resolution_note).trim()}`
                    : `Your support ticket has been ${actionLabel} by the master admin.`,
                action,
                actorRole: req.userRole,
            });
        }

        res.status(200).json({ message: "Ticket updated", request: mapSupportTicketForClient(data) });
    } catch (error) {
        console.error("Error updating support ticket:", error);
        res.status(500).json({ error: "Failed to update support ticket" });
    }
};

exports.deleteSupportRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adminClient = getServiceSupabase();

        const { data: existing, error: existingError } = await adminClient
            .from('support_tickets')
            .select('id, status')
            .eq('id', id)
            .single();

        if (existingError || !existing) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        if (!canDeleteSupportTicket(existing.status)) {
            return res.status(400).json({ error: 'Ticket can only be deleted before acknowledgement or after resolution.' });
        }

        const { error } = await adminClient
            .from('support_tickets')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return res.status(200).json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Error deleting support ticket:', error);
        return res.status(500).json({ error: 'Failed to delete support ticket' });
    }
};

/**
 * Remove an institution administrator with safety check
 */
exports.removeInstitutionAdmin = async (req, res) => {
    try {
        const { userId } = req.params;
        const adminClient = getServiceSupabase();

        // 1. Get the institution_id for this admin
        const { data: user, error: userError } = await adminClient
            .from('users')
            .select('institution_id, role')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: "Administrator not found." });
        }

        if (user.role !== 'admin') {
            return res.status(400).json({ error: "Target user is not an administrator." });
        }

        // 2. Count current admins for this institution
        const { data: adminsInInstitution, error: countError } = await adminClient
            .from('admins')
            .select('user_id, is_main')
            .eq('institution_id', user.institution_id);

        if (countError) throw countError;

        const count = Number((adminsInInstitution || []).length);
        const targetAdmin = (adminsInInstitution || []).find((a) => a.user_id === userId);

        // 3. Safety Check: Must have at least one admin
        if (count <= 1) {
            return res.status(400).json({ 
                error: "Cannot remove the last administrator.", 
                details: "An institution must have at least one administrator at all times." 
            });
        }

        if (targetAdmin?.is_main) {
            return res.status(400).json({
                error: "Cannot remove the current main administrator.",
                details: "Transfer main admin status before removing this account.",
            });
        }

        // 4. Perform Deletion (Cascade handles public.users and admins table)
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
        if (deleteError) throw deleteError;

        return res.status(200).json({ message: "Administrator removed successfully." });

    } catch (error) {
        console.error("Remove Admin Error:", error);
        return res.status(500).json({ error: "Failed to remove administrator." });
    }
};
/**
 * Updates the authenticated Platform Admin's own profile.
 */
exports.updatePlatformProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { first_name, last_name, phone } = req.body;

        const fName = String(first_name || '').trim();
        const lName = String(last_name || '').trim();
        const finalFullName = `${fName} ${lName}`.trim();

        if (!fName) {
            return res.status(400).json({ error: "first_name is required" });
        }

        const adminClient = getServiceSupabase();

        // 1. Update public.users table (which cascades UI changes locally)
        const updates = { 
            full_name: finalFullName,
            phone: phone || null 
        };
        if (fName) updates.first_name = fName;
        if (lName) updates.last_name = lName;

        const { error: dbError } = await adminClient
            .from('users')
            .update(updates)
            .eq('id', userId);

        if (dbError) throw dbError;

        // 2. Update Auth User Metadata
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: { 
                full_name: finalFullName,
                first_name: fName,
                last_name: lName
            }
        });

        if (authError) throw authError;

        res.status(200).json({ 
            message: "Profile updated successfully.", 
            full_name: finalFullName,
            first_name: fName,
            last_name: lName,
            phone 
        });

        logSystemActivity({
            event: 'master_admin.profile.updated',
            actor_user_id: userId,
            actor_role: req.userRole || null,
            institution_id: null,
            details: {
                first_name: fName,
                last_name: lName,
            },
        });
    } catch (err) {
        console.error("updatePlatformProfile error:", err);
        res.status(500).json({ error: "Failed to update profile." });
    }
};

/**
 * Get all payments globally for Master Admin ledger
 */
exports.getAllPayments = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const query = adminClient
            .from('financial_transactions')
            .select(`
                *,
                institutions:institution_id(name),
                users:user_id(first_name, last_name, email)
            `)
            .order('date', { ascending: false });
        const { data, error } = await query;

        if (error) throw error;

        let rows = data || [];
        if (req.userRole === 'master_admin') {
            rows = rows.filter((row) => {
                const recordedByRole = row?.recorded_by_role || row?.meta?.recorded_by_role || row?.meta?.created_by_role;
                return String(recordedByRole || '').toLowerCase() === 'master_admin';
            });
        }

        res.status(200).json({ payments: rows });
    } catch (error) {
        console.error("Error fetching global payments:", error);
        res.status(500).json({ error: "Failed to fetch global payments ledger" });
    }
};

/**
 * Update a platform-level payment
 */
exports.updatePlatformPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            amount,
            method,
            status,
            reference_id,
            notes,
            date,
        } = req.body || {};

        if (!id) {
            return res.status(400).json({ error: 'Payment id is required.' });
        }

        const updates = {};
        if (amount !== undefined && amount !== null && String(amount).trim() !== '') {
            updates.amount = Number(amount);
        }
        if (method !== undefined) updates.method = method;
        if (status !== undefined) updates.status = status;
        if (reference_id !== undefined) updates.reference_id = reference_id;
        if (date !== undefined) updates.date = date;
        if (notes !== undefined) updates.meta = { notes };

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No fields supplied for update.' });
        }

        const adminClient = getServiceSupabase();
        if (req.userRole === 'master_admin') {
            const { data: existing, error: existingError } = await adminClient
                .from('financial_transactions')
                .select('id, meta')
                .eq('id', id)
                .single();

            if (existingError || !existing) {
                return res.status(404).json({ error: 'Payment not found.' });
            }

            const recordedByRole = existing?.meta?.recorded_by_role || existing?.meta?.created_by_role;
            if (String(recordedByRole || '').toLowerCase() !== 'master_admin') {
                return res.status(403).json({ error: 'You can only edit payments recorded by master admins.' });
            }
        }

        const { data, error } = await adminClient
            .from('financial_transactions')
            .update(updates)
            .eq('id', id)
            .select('*, institutions:institution_id(name), users:user_id(first_name, last_name, email)')
            .single();

        if (error) throw error;

        logSystemActivity({
            event: 'payment.updated',
            actor_user_id: req.userId || null,
            actor_role: req.userRole || null,
            institution_id: data?.institution_id || null,
            details: { payment_id: id, updates },
        });

        return res.status(200).json({
            message: 'Payment updated successfully',
            payment: data,
        });
    } catch (error) {
        console.error('Error updating platform payment:', error);
        return res.status(500).json({ error: 'Failed to update payment.' });
    }
};

/**
 * Export platform payments as CSV
 */
exports.exportPlatformPaymentsCsv = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { data, error } = await adminClient
            .from('financial_transactions')
            .select('id, institution_id, type, direction, amount, date, method, status, reference_id, meta, institutions:institution_id(name), users:user_id(first_name, last_name, email)')
            .order('date', { ascending: false });

        if (error) throw error;

        const rows = data || [];
        const header = [
            'transaction_id',
            'institution_name',
            'user_name',
            'user_email',
            'type',
            'direction',
            'amount',
            'date',
            'method',
            'status',
            'reference_id',
            'notes',
        ];

        const esc = (v) => {
            if (v === null || v === undefined) return '';
            const s = String(v);
            if (s.includes('"') || s.includes(',') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };

        const lines = [header.join(',')];
        for (const row of rows) {
            lines.push([
                esc(row.id),
                esc(row.institutions?.name || ''),
                esc(`${row.users?.first_name || ''} ${row.users?.last_name || ''}`.trim()),
                esc(row.users?.email || ''),
                esc(row.type),
                esc(row.direction),
                esc(row.amount),
                esc(row.date),
                esc(row.method),
                esc(row.status),
                esc(row.reference_id),
                esc(row.meta?.notes || ''),
            ].join(','));
        }

        const csv = lines.join('\n');
        const filename = `platform-payments-${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(csv);
    } catch (error) {
        console.error('Error exporting platform payments:', error);
        return res.status(500).json({ error: 'Failed to export payments CSV.' });
    }
};

/**
 * Institution-level payments summary for reconciliation
 */
exports.getPaymentsSummaryByInstitution = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();

        const [{ data: institutions, error: instError }, { data: txs, error: txError }] = await Promise.all([
            adminClient
                .from('institutions')
                .select('id, name, subscription_plan, subscription_status, subscription_tracking_start_date, subscription_cycle'),
            adminClient
                .from('financial_transactions')
                .select('institution_id, amount, status, type, direction')
                .eq('type', 'subscription')
                .eq('direction', 'inflow'),
        ]);

        if (instError) throw instError;
        if (txError) throw txError;

        const totalsByInstitution = new Map();
        for (const tx of txs || []) {
            if (!tx?.institution_id) continue;
            const amount = Number(tx.amount || 0);
            const key = tx.institution_id;
            const prev = totalsByInstitution.get(key) || 0;
            if (tx.status === 'completed') {
                totalsByInstitution.set(key, prev + amount);
            }
        }

        const rows = (institutions || []).map((inst) => {
            const lifecycle = getLifecycleForInstitution(inst, totalsByInstitution.get(inst.id) || 0);
            const difference = lifecycle.paidAmount - lifecycle.expectedAmount;

            return {
                institution_id: inst.id,
                institution_name: inst.name,
                subscription_plan: inst.subscription_plan,
                subscription_status: inst.subscription_status,
                subscription_tracking_start: inst.subscription_tracking_start_date,
                billing_cycles_elapsed: computeCyclesElapsed(inst.subscription_plan, inst.subscription_tracking_start_date, inst.subscription_cycle),
                expected_amount: lifecycle.expectedAmount,
                paid_amount: lifecycle.paidAmount,
                balance_due: difference < 0 ? Math.abs(difference) : 0,
                excess_amount: difference > 0 ? difference : 0,
                is_balanced: difference === 0,
                cycle_end: lifecycle.cycleEnd ? lifecycle.cycleEnd.toISOString() : null,
                days_to_expiry: lifecycle.daysToExpiry,
                is_expired_unpaid: lifecycle.shouldExpire,
                is_expiring_unpaid: lifecycle.shouldWarn,
            };
        });

        return res.status(200).json({ summary: rows });
    } catch (error) {
        console.error('Error building payment summary:', error);
        return res.status(500).json({ error: 'Failed to build payment summary.' });
    }
};

/**
 * Get detailed analytics for a specific institution
 */
exports.getInstitutionAnalytics = async (req, res) => {
    const { id } = req.params;
    try {
        const adminClient = getServiceSupabase();
        
        const [
            { count: studentCount },
            { count: teacherCount },
            { count: classCount },
            { data: revenueData }
        ] = await Promise.all([
            adminClient.from('users').select('*', { count: 'exact', head: true }).eq('institution_id', id).eq('role', 'student'),
            adminClient.from('users').select('*', { count: 'exact', head: true }).eq('institution_id', id).eq('role', 'teacher'),
            adminClient.from('classes').select('*', { count: 'exact', head: true }).eq('institution_id', id),
            adminClient.from('financial_transactions').select('amount').eq('institution_id', id).eq('status', 'completed').eq('type', 'fee_payment')
        ]);

        const totalRevenue = revenueData ? revenueData.reduce((acc, curr) => acc + Number(curr.amount), 0) : 0;

        res.status(200).json({
            students: studentCount || 0,
            teachers: teacherCount || 0,
            classes: classCount || 0,
            revenue: totalRevenue
        });
    } catch (error) {
        console.error("Error fetching institution analytics:", error);
        res.status(500).json({ error: "Failed to fetch institution analytics" });
    }
};

/**
 * Get all users across all institutions (platform-wide)
 * Supports: ?role=, &institution_id=, &search=, &page=, &limit=
 */
exports.getAllUsers = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { role, institution_id, category_id, category_ids, search, page = 1, limit = 30 } = req.query;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        const pageNum = Math.max(1, parseInt(page));
        const pageSize = Math.min(100, parseInt(limit) || 30);
        const offset = (pageNum - 1) * pageSize;

        let query = adminClient
            .from('users')
            .select(`
                id, first_name, last_name, email,
                role, status, created_at, institution_id, phone,
                institutions:institution_id(name)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (role) {
            const normalizedRole = String(role).trim();
            if (normalizedRole === 'admin' || normalizedRole === 'school_admin') {
                query = query.in('role', ['admin', 'school_admin']);
            } else if (normalizedRole === 'master_admin' || normalizedRole === 'platform_admin') {
                query = query.in('role', ['master_admin', 'platform_admin']);
            } else {
                query = query.eq('role', normalizedRole);
            }
        }

        if (institution_id) query = query.eq('institution_id', institution_id);
        const normalizedCategoryIds = (() => {
            if (Array.isArray(category_ids)) {
                return [...new Set(category_ids.map((v) => String(v || '').trim()).filter(Boolean))];
            }
            if (typeof category_ids === 'string' && category_ids.trim()) {
                return [...new Set(category_ids.split(',').map((v) => String(v || '').trim()).filter(Boolean))];
            }
            if (category_id) return [String(category_id).trim()];
            return [];
        })();

        if (normalizedCategoryIds.length > 0) {
            const { data: categoryInstitutions, error: categoryError } = await adminClient
                .from('institution_categories')
                .select('institution_id')
                .in('category_id', normalizedCategoryIds);

            if (categoryError) throw categoryError;

            const institutionIds = (categoryInstitutions || []).map((i) => i.institution_id).filter(Boolean);
            if (institutionIds.length === 0) {
                return res.status(200).json({ users: [] });
            }
            query = query.in('institution_id', institutionIds);
        }

        if (search && search.trim()) {
            query = query.or(`email.ilike.%${search.trim()}%,first_name.ilike.%${search.trim()}%,last_name.ilike.%${search.trim()}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = data || [];
        const userIds = [...new Set(rows.map((u) => u.id).filter(Boolean))];

        let studentByUserId = new Map();
        let teacherByUserId = new Map();
        let parentByUserId = new Map();
        let adminByUserId = new Map();
        let bursarByUserId = new Map();
        let platformAdminByUserId = new Map();

        if (userIds.length > 0) {
            const [studentsRes, teachersRes, parentsRes, adminsRes, bursarsRes, platformAdminsRes] = await Promise.all([
                adminClient.from('students').select('id, user_id').in('user_id', userIds),
                adminClient.from('teachers').select('id, user_id').in('user_id', userIds),
                adminClient.from('parents').select('id, user_id').in('user_id', userIds),
                adminClient.from('admins').select('id, user_id').in('user_id', userIds),
                adminClient.from('bursars').select('id, user_id').in('user_id', userIds),
                adminClient.from('platform_admins').select('id, user_id').in('user_id', userIds),
            ]);

            if (!studentsRes.error) studentByUserId = new Map((studentsRes.data || []).map((r) => [r.user_id, r.id]));
            if (!teachersRes.error) teacherByUserId = new Map((teachersRes.data || []).map((r) => [r.user_id, r.id]));
            if (!parentsRes.error) parentByUserId = new Map((parentsRes.data || []).map((r) => [r.user_id, r.id]));
            if (!adminsRes.error) adminByUserId = new Map((adminsRes.data || []).map((r) => [r.user_id, r.id]));
            if (!bursarsRes.error) bursarByUserId = new Map((bursarsRes.data || []).map((r) => [r.user_id, r.id]));
            if (!platformAdminsRes.error) platformAdminByUserId = new Map((platformAdminsRes.data || []).map((r) => [r.user_id, r.id]));
        }

        const anyCustomByUserId = new Map();
        [studentByUserId, teacherByUserId, parentByUserId, adminByUserId, bursarByUserId, platformAdminByUserId]
            .forEach((mapObj) => {
                mapObj.forEach((idValue, userIdValue) => {
                    if (!idValue) return;
                    if (uuidRegex.test(String(idValue))) return;
                    if (!anyCustomByUserId.has(userIdValue)) {
                        anyCustomByUserId.set(userIdValue, idValue);
                    }
                });
            });

        const users = rows.map((rawUser) => {
            const canonicalRole = canonicalRoleFrom(rawUser.role);

            let customDisplayId = null;
            if (canonicalRole === 'student') customDisplayId = studentByUserId.get(rawUser.id) || null;
            else if (canonicalRole === 'teacher') customDisplayId = teacherByUserId.get(rawUser.id) || null;
            else if (canonicalRole === 'parent') customDisplayId = parentByUserId.get(rawUser.id) || null;
            else if (canonicalRole === 'school_admin') customDisplayId = adminByUserId.get(rawUser.id) || null;
            else if (canonicalRole === 'bursary') customDisplayId = bursarByUserId.get(rawUser.id) || null;
            else if (canonicalRole === 'platform_admin') customDisplayId = platformAdminByUserId.get(rawUser.id) || null;

            if (!customDisplayId || uuidRegex.test(String(customDisplayId))) {
                customDisplayId = anyCustomByUserId.get(rawUser.id) || null;
            }

            if (customDisplayId && uuidRegex.test(String(customDisplayId))) {
                customDisplayId = null;
            }

            const user = withRoleAliases(rawUser, {
                isPlatformAdmin: canonicalRole === 'platform_admin'
            });

            return {
                ...user,
                custom_display_id: customDisplayId,
            };
        });

        res.status(200).json({ users });
    } catch (error) {
        console.error("Error fetching all users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

/**
 * Update a platform user profile (master admin scope)
 */
exports.updateUser = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { id } = req.params;
        const {
            first_name,
            last_name,
            email,
            phone,
            role,
            institution_id,
        } = req.body || {};

        if (!id) {
            return res.status(400).json({ error: "User id is required" });
        }

        const updates = {};
        if (phone !== undefined) updates.phone = phone;
        if (role !== undefined) updates.role = canonicalRoleFrom(role);
        if (institution_id !== undefined) updates.institution_id = institution_id || null;

        const requesterCanonicalRole = canonicalRoleFrom(req.userRole);
        const canEditIdentity = requesterCanonicalRole === 'platform_admin';

        if (canEditIdentity) {
            if (first_name !== undefined) updates.first_name = String(first_name || '').trim();
            if (last_name !== undefined) updates.last_name = String(last_name || '').trim();
            if (email !== undefined) updates.email = String(email || '').trim().toLowerCase();
        }

        if (!canEditIdentity && (first_name !== undefined || last_name !== undefined || email !== undefined)) {
            return res.status(403).json({
                error: 'Only Master Admin can edit first name, last name, or email.',
            });
        }

        // If first/last changed and caller is platform admin, regenerate institution-domain email.
        if (canEditIdentity && (first_name !== undefined || last_name !== undefined)) {
            const { data: existingUser, error: existingUserError } = await adminClient
                .from('users')
                .select('id, first_name, last_name, institution_id')
                .eq('id', id)
                .single();

            if (existingUserError || !existingUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            const nextFirst = first_name !== undefined ? String(first_name || '').trim() : String(existingUser.first_name || '').trim();
            const nextLast = last_name !== undefined ? String(last_name || '').trim() : String(existingUser.last_name || '').trim();

            if (nextFirst && existingUser.institution_id) {
                const { data: inst, error: instError } = await adminClient
                    .from('institutions')
                    .select('email_domain')
                    .eq('id', existingUser.institution_id)
                    .single();
                if (instError) throw instError;

                const regeneratedEmail = await generateUniqueInstitutionEmail(adminClient, {
                    firstName: nextFirst,
                    lastName: nextLast,
                    emailDomain: inst?.email_domain,
                    excludeUserId: id,
                });

                updates.email = regeneratedEmail;
            }
        }

        if (canEditIdentity && updates.role !== undefined) {
            const nextRoleCanonical = canonicalRoleFrom(updates.role);
            if (nextRoleCanonical !== 'school_admin') {
                const { error: demoteMainError } = await adminClient
                    .from('admins')
                    .update({ is_main: false })
                    .eq('user_id', id);
                if (demoteMainError) throw demoteMainError;
            }
        }



        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No fields supplied for update" });
        }

        const { data, error } = await adminClient
            .from('users')
            .update(updates)
            .eq('id', id)
            .select('id, first_name, last_name, email, role, phone, institution_id, status, created_at')
            .single();

        if (error) throw error;

        if (canEditIdentity && (updates.email !== undefined || updates.first_name !== undefined || updates.last_name !== undefined)) {
            const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(id, {
                ...(updates.email !== undefined ? { email: updates.email } : {}),
                user_metadata: {
                    full_name: `${String(data.first_name || '').trim()} ${String(data.last_name || '').trim()}`.trim(),
                    first_name: data.first_name,
                    last_name: data.last_name,
                },
            });
            if (authUpdateError) throw authUpdateError;
        }

        const user = withRoleAliases(data, {
            isPlatformAdmin: canonicalRoleFrom(data.role) === 'platform_admin'
        });

        res.status(200).json({ user });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
};

/**
 * Delete a master admin user (platform admin)
 */
exports.deleteMasterAdminUser = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { id } = req.params;
        const requesterId = req.userId;

        if (!id) {
            return res.status(400).json({ error: 'User id is required' });
        }

        if (id === requesterId) {
            return res.status(400).json({ error: 'You cannot delete your own account.' });
        }

        const { data: targetUser, error: targetError } = await adminClient
            .from('users')
            .select('id, role')
            .eq('id', id)
            .single();

        if (targetError || !targetUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const targetCanonicalRole = canonicalRoleFrom(targetUser.role);
        if (targetCanonicalRole !== 'platform_admin') {
            return res.status(400).json({ error: 'Deletion is only allowed for Master Admin users.' });
        }

        const { count: masterAdminCount, error: countError } = await adminClient
            .from('users')
            .select('*', { count: 'exact', head: true })
            .in('role', ['master_admin', 'platform_admin']);

        if (countError) throw countError;

        if ((masterAdminCount || 0) <= 1) {
            return res.status(400).json({
                error: 'Cannot delete the last Master Admin.',
                details: 'At least one Master Admin must remain on the platform.'
            });
        }

        const { error: deleteError } = await adminClient.auth.admin.deleteUser(id);
        if (deleteError) throw deleteError;

        return res.status(200).json({ message: 'Master Admin deleted successfully.' });
    } catch (error) {
        console.error('Error deleting master admin user:', error);
        return res.status(500).json({ error: 'Failed to delete Master Admin user.' });
    }
};

/**
 * School Category Management
 */

exports.getSchoolCategories = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        let data = null;
        let error = null;
        let usedLegacyShape = false;

        ({ data, error } = await adminClient
            .from('school_categories')
            .select('id, name, school_category_types(type_id, category_types:type_id(name, sort_order))')
            .order('name'));

        if (error && isMissingRelationError(error)) {
            usedLegacyShape = true;
            ({ data, error } = await adminClient
                .from('school_categories')
                .select('id, name, level_label')
                .order('name'));
        }

        if (error) {
            console.error("Supabase error fetching school categories:", error);
            throw error;
        }

        const categories = (data || []).map((row) => {
            const classTypes = usedLegacyShape
                ? (row.level_label ? [String(row.level_label).trim()] : [])
                : sortAndNormalizeTypeNames(row.school_category_types || []);
            return {
                id: row.id,
                name: row.name,
                class_type: classTypes[0] || null,
                class_types: classTypes,
            };
        });

        res.status(200).json(categories);
    } catch (error) {
        console.error("Error fetching school categories:", error.message || error);
        res.status(500).json({ 
            error: "Failed to fetch school categories",
            details: error.message || "Unknown error"
        });
    }
};

exports.getCurrencies = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { data, error } = await adminClient
            .from('currencies')
            .select('id, code, name, symbol, usd_rate, decimal_places, is_default, is_active, deleted_at, created_at, updated_at')
            .order('is_default', { ascending: false })
            .order('code', { ascending: true });

        if (error) throw error;
        return res.status(200).json({ currencies: data || [] });
    } catch (error) {
        console.error('Error fetching currencies:', error);
        return res.status(500).json({ error: 'Failed to fetch currencies' });
    }
};

exports.upsertCurrency = async (req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const {
            id,
            code,
            name,
            symbol,
            usd_rate,
            decimal_places = 2,
            is_default = false,
            is_active = true,
        } = req.body || {};

        const normalizedCode = String(code || '').trim().toUpperCase();
        const normalizedName = String(name || '').trim();
        const normalizedSymbol = String(symbol || '').trim();
        const parsedRate = Number(usd_rate);
        const parsedDecimals = Number(decimal_places);

        if (!normalizedCode || normalizedCode.length !== 3) {
            return res.status(400).json({ error: 'Currency code must be a 3-letter ISO code.' });
        }
        if (!normalizedName || !normalizedSymbol) {
            return res.status(400).json({ error: 'Currency name and symbol are required.' });
        }
        if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
            return res.status(400).json({ error: 'usd_rate must be a positive number.' });
        }
        if (!Number.isInteger(parsedDecimals) || parsedDecimals < 0 || parsedDecimals > 6) {
            return res.status(400).json({ error: 'decimal_places must be an integer between 0 and 6.' });
        }

        if (is_default) {
            await adminClient
                .from('currencies')
                .update({ is_default: false })
                .eq('is_default', true);
        }

        let query = adminClient
            .from('currencies')
            .upsert({
                id: toUuidString(id) || undefined,
                code: normalizedCode,
                name: normalizedName,
                symbol: normalizedSymbol,
                usd_rate: parsedRate,
                decimal_places: parsedDecimals,
                is_default: !!is_default,
                is_active: !!is_active,
                deleted_at: is_active ? null : new Date().toISOString(),
            }, { onConflict: toUuidString(id) ? 'id' : 'code' })
            .select('id, code, name, symbol, usd_rate, decimal_places, is_default, is_active, deleted_at, created_at, updated_at')
            .single();

        const { data, error } = await query;
        if (error) throw error;

        if (!!is_default) {
            await adminClient
                .from('institutions')
                .update({ currency_id: data.id })
                .is('currency_id', null);
        }

        return res.status(200).json({
            message: toUuidString(id) ? 'Currency updated successfully' : 'Currency created successfully',
            currency: data,
        });
    } catch (error) {
        console.error('Error saving currency:', error);
        return res.status(500).json({ error: 'Failed to save currency' });
    }
};

exports.deactivateCurrency = async (req, res) => {
    try {
        const { id } = req.params;
        const adminClient = getServiceSupabase();

        const { data: currency, error: currencyError } = await adminClient
            .from('currencies')
            .select('id, code, is_default, is_active')
            .eq('id', id)
            .single();

        if (currencyError || !currency) {
            return res.status(404).json({ error: 'Currency not found.' });
        }

        if (currency.is_default) {
            return res.status(400).json({ error: 'Default currency cannot be deactivated.' });
        }

        const { count: usageCount, error: usageError } = await adminClient
            .from('institutions')
            .select('*', { count: 'exact', head: true })
            .eq('currency_id', currency.id);

        if (usageError) throw usageError;
        if ((usageCount || 0) > 0) {
            return res.status(400).json({ error: 'Currency is assigned to institutions and cannot be deactivated.' });
        }

        const { data, error } = await adminClient
            .from('currencies')
            .update({ is_active: false, deleted_at: new Date().toISOString() })
            .eq('id', currency.id)
            .select('id, code, name, symbol, usd_rate, decimal_places, is_default, is_active, deleted_at, created_at, updated_at')
            .single();

        if (error) throw error;
        return res.status(200).json({ message: 'Currency deactivated successfully', currency: data });
    } catch (error) {
        console.error('Error deactivating currency:', error);
        return res.status(500).json({ error: 'Failed to deactivate currency' });
    }
};

exports.upsertSchoolCategory = async (req, res) => {
    try {
        const { id, name, class_type } = req.body;
        const normalizedClassType = String(class_type || '').trim();
        if (!name || !normalizedClassType) {
            return res.status(400).json({ error: "Name and class_type are required" });
        }

        const adminClient = getServiceSupabase();
        const categoryData = { name, level_label: normalizedClassType };
        
        let result;
        if (id) {
            result = await adminClient.from('school_categories').update(categoryData).eq('id', id).select().single();
        } else {
            result = await adminClient.from('school_categories').insert([categoryData]).select().single();
        }

        if (result.error) throw result.error;
        res.status(200).json({
            message: "Category saved successfully",
            category: {
                id: result.data?.id,
                name: result.data?.name,
                class_type: result.data?.level_label || normalizedClassType,
                class_types: [result.data?.level_label || normalizedClassType].filter(Boolean),
            },
        });
    } catch (error) {
        console.error("Error upserting school category:", error);
        res.status(500).json({ error: "Failed to save school category", details: error.message || "Unknown error" });
    }
};

exports.deleteSchoolCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const adminClient = getServiceSupabase();
        
        // Check if any institution uses this category
        const { count } = await adminClient
            .from('institution_categories')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', id);

        if (count > 0) {
            return res.status(400).json({ error: "Cannot delete category being used by institutions" });
        }

        const { error } = await adminClient.from('school_categories').delete().eq('id', id);
        if (error) throw error;

        res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error("Error deleting school category:", error);
        res.status(500).json({ error: "Failed to delete school category" });
    }
};

/**
 * Record a manual platform-level payment (subscription revenue)
 */
exports.recordPlatformPayment = async (req, res) => {
    try {
        const { 
            institution_id, 
            amount, 
            method, 
            reference_id, 
            notes, 
            date 
        } = req.body;

        if (!institution_id || !amount) {
            return res.status(400).json({ error: "Institution and amount are required." });
        }

        const adminClient = getServiceSupabase();

        const recordedByRole = req.userRole || 'master_admin';
        const recordedByUserId = req.userId || null;

        const { data, error } = await adminClient
            .from('financial_transactions')
            .insert([{
                institution_id,
                amount: Number(amount),
                type: 'subscription',
                direction: 'inflow',
                method: method || 'manual',
                reference_id: reference_id || `PLAT-${Date.now()}`,
                meta: {
                    notes: notes || 'Manual platform entry',
                    recorded_by_role: recordedByRole,
                    recorded_by_user_id: recordedByUserId,
                },
                date: date || new Date().toISOString().split('T')[0],
                status: 'completed'
            }])
            .select()
            .single();

        if (error) throw error;
        logSystemActivity({
            event: 'payment.recorded',
            actor_user_id: req.userId || null,
            actor_role: req.userRole || null,
            institution_id,
            details: {
                transaction_id: data?.id || null,
                amount: Number(amount),
                reference_id: reference_id || null,
            },
        });

        res.status(201).json({ message: "Platform payment recorded successfully", transaction: data });
    } catch (error) {
        console.error("Error recording platform payment:", error);
        res.status(500).json({ error: "Failed to record platform payment" });
    }
};

exports.getSystemActivityLogs = async (req, res) => {
    try {
        const { from, to, limit } = req.query;
        const logs = readSystemActivityLogs({ from, to, limit: Number(limit) || 500 });
        return res.status(200).json({ logs });
    } catch (error) {
        console.error('Error fetching system activity logs:', error);
        return res.status(500).json({ error: 'Failed to fetch system activity logs' });
    }
};

exports.runSubscriptionLifecycleSweep = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const [{ data: institutions, error: instError }, { data: txs, error: txError }] = await Promise.all([
            adminClient
                .from('institutions')
                .select('id, name, subscription_plan, subscription_status, subscription_cycle, subscription_tracking_start_date'),
            adminClient
                .from('financial_transactions')
                .select('institution_id, amount, status, type, direction')
                .eq('type', 'subscription')
                .eq('direction', 'inflow'),
        ]);

        if (instError) throw instError;
        if (txError) throw txError;

        const paidByInstitution = new Map();
        for (const row of (txs || [])) {
            if (!row?.institution_id || row?.status !== 'completed') continue;
            const prev = paidByInstitution.get(row.institution_id) || 0;
            paidByInstitution.set(row.institution_id, prev + Number(row.amount || 0));
        }

        const changed = [];
        const warnings = [];

        for (const inst of (institutions || [])) {
            const lifecycle = getLifecycleForInstitution(inst, paidByInstitution.get(inst.id) || 0);

            if (lifecycle.shouldExpire && String(inst.subscription_status || '').toLowerCase() !== 'expired') {
                // eslint-disable-next-line no-await-in-loop
                await adminClient
                    .from('institutions')
                    .update({ subscription_status: 'expired' })
                    .eq('id', inst.id);

                changed.push({ institution_id: inst.id, from: inst.subscription_status, to: 'expired', days_to_expiry: lifecycle.daysToExpiry, balance_due: lifecycle.balanceDue });

                logSystemActivity({
                    event: 'subscription.auto_expired',
                    actor_user_id: null,
                    actor_role: 'system',
                    institution_id: inst.id,
                    details: {
                        previous_status: inst.subscription_status,
                        balance_due: lifecycle.balanceDue,
                        days_to_expiry: lifecycle.daysToExpiry,
                    },
                });
            }

            if (lifecycle.shouldWarn) {
                warnings.push({
                    institution_id: inst.id,
                    institution_name: inst.name,
                    days_to_expiry: lifecycle.daysToExpiry,
                    balance_due: lifecycle.balanceDue,
                    cycle_end: lifecycle.cycleEnd ? lifecycle.cycleEnd.toISOString() : null,
                });

                const { data: admins } = await adminClient
                    .from('users')
                    .select('id')
                    .eq('institution_id', inst.id)
                    .in('role', ['admin', 'school_admin']);

                if ((admins || []).length > 0) {
                    // eslint-disable-next-line no-await-in-loop
                    await sendBulkInAppNotificationsWithHistory(
                        admins.map((a) => ({
                            user_id: a.id,
                            title: 'Subscription Expiry Alert',
                            message: `Your subscription is due in ${lifecycle.daysToExpiry} day(s). Outstanding balance: ${lifecycle.balanceDue}.`,
                            type: 'warning',
                            institution_id: inst.id,
                            data: {
                                source: 'subscription_lifecycle',
                                days_to_expiry: lifecycle.daysToExpiry,
                                balance_due: lifecycle.balanceDue,
                                cycle_end: lifecycle.cycleEnd ? lifecycle.cycleEnd.toISOString() : null,
                            },
                        }))
                    );
                }
            }
        }

        return res.status(200).json({ changed, warnings, scanned: (institutions || []).length });
    } catch (error) {
        console.error('Error running subscription lifecycle sweep:', error);
        return res.status(500).json({ error: 'Failed to run subscription lifecycle sweep' });
    }
};

exports.previewSubscriptionLifecycleSweep = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const [{ data: institutions, error: instError }, { data: txs, error: txError }] = await Promise.all([
            adminClient
                .from('institutions')
                .select('id, name, subscription_plan, subscription_status, subscription_cycle, subscription_tracking_start_date'),
            adminClient
                .from('financial_transactions')
                .select('institution_id, amount, status, type, direction')
                .eq('type', 'subscription')
                .eq('direction', 'inflow'),
        ]);

        if (instError) throw instError;
        if (txError) throw txError;

        const paidByInstitution = new Map();
        for (const row of (txs || [])) {
            if (!row?.institution_id || row?.status !== 'completed') continue;
            const prev = paidByInstitution.get(row.institution_id) || 0;
            paidByInstitution.set(row.institution_id, prev + Number(row.amount || 0));
        }

        const lifecycleSummary = (institutions || []).map((inst) => {
            const lifecycle = getLifecycleForInstitution(inst, paidByInstitution.get(inst.id) || 0);
            return {
                institution_id: inst.id,
                institution_name: inst.name,
                plan: lifecycle.plan,
                current_status: inst.subscription_status,
                expected_amount: lifecycle.expectedAmount,
                paid_amount: lifecycle.paidAmount,
                balance_due: lifecycle.balanceDue,
                days_to_expiry: lifecycle.daysToExpiry,
                cycle_end: lifecycle.cycleEnd ? lifecycle.cycleEnd.toISOString() : null,
                should_warn: !!lifecycle.shouldWarn,
                should_expire: !!lifecycle.shouldExpire,
            };
        });

        const warnings = lifecycleSummary.filter((i) => i.should_warn);
        const toExpire = lifecycleSummary.filter((i) => i.should_expire);

        return res.status(200).json({
            scanned: lifecycleSummary.length,
            warnings_count: warnings.length,
            expire_count: toExpire.length,
            warnings,
            to_expire: toExpire,
        });
    } catch (error) {
        console.error('Error previewing subscription lifecycle sweep:', error);
        return res.status(500).json({ error: 'Failed to preview subscription lifecycle sweep' });
    }
};

exports.getPlatformPaymentReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: 'Payment id is required' });

        const adminClient = getServiceSupabase();
        const { data: tx, error } = await adminClient
            .from('financial_transactions')
            .select('id, institution_id, amount, method, status, reference_id, date, meta, created_at, updated_at, institutions:institution_id(name), users:user_id(first_name, last_name, email)')
            .eq('id', id)
            .single();

        if (error || !tx) return res.status(404).json({ error: 'Payment not found' });

        if (req.userRole === 'master_admin') {
            const recordedByRole = tx?.meta?.recorded_by_role || tx?.meta?.created_by_role;
            if (String(recordedByRole || '').toLowerCase() !== 'master_admin') {
                return res.status(403).json({ error: 'You can only access receipts for payments recorded by master admins.' });
            }
        }

        const payerName = tx?.users?.first_name
            ? `${tx.users.first_name} ${tx.users.last_name || ''}`.trim()
            : (tx?.users?.email || 'System');
        const currency = await getInstitutionCurrency(adminClient, tx?.institution_id);

        const html = buildReceiptHtml({
            receiptTitle: 'Platform Payment Receipt',
            currency,
            generatedAt: new Date().toISOString(),
            rows: [
                { label: 'Institution', value: tx?.institutions?.name || 'Unknown Institution' },
                { label: 'Payer', value: payerName },
                { label: 'Amount', value: tx?.amount || 0, isAmount: true },
                { label: 'Method', value: tx?.method || 'N/A' },
                { label: 'Status', value: tx?.status || 'N/A' },
                { label: 'Reference', value: tx?.reference_id || 'N/A' },
                { label: 'Date', value: tx?.date || 'N/A' },
                { label: 'Record Created At', value: tx?.created_at || 'N/A' },
                { label: 'Record Updated At', value: tx?.updated_at || 'N/A' },
            ],
            notes: [
                { label: 'Notes', value: tx?.meta?.notes || 'N/A' },
            ],
        });

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
    } catch (error) {
        console.error('Error generating platform payment receipt:', error);
        return res.status(500).json({ error: 'Failed to generate payment receipt' });
    }
};

/**
 * Get all messages for a specific support ticket (Platform Admin View)
 */
exports.getTicketMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const adminClient = getServiceSupabase();

        // Check if ticket exists
        const { data: ticket, error: ticketError } = await adminClient
            .from('support_tickets')
            .select('*')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) {
            return res.status(404).json({ error: "Ticket not found" });
        }

        const { data: messages, error: msgError } = await adminClient
            .from('ticket_messages')
            .select(`
                *,
                sender:sender_id(id, first_name, last_name, full_name, role)
            `)
            .eq('ticket_id', id)
            .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        res.status(200).json({ 
            ticket,
            messages: messages || [] 
        });
    } catch (error) {
        console.error("Error fetching ticket messages:", error);
        res.status(500).json({ error: "Failed to fetch ticket messages" });
    }
};

/**
 * Add a message to a ticket (Platform Admin View)
 */
exports.addTicketMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req; // From auth middleware
        const { message, is_internal = false, status } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message content is required" });
        }

        const adminClient = getServiceSupabase();

        // 1. Insert the message
        const { data: newMessage, error: msgError } = await adminClient
            .from('ticket_messages')
            .insert([{
                ticket_id: id,
                sender_id: userId,
                message,
                is_internal: !!is_internal
            }])
            .select(`
                *,
                sender:sender_id(id, first_name, last_name, full_name, role)
            `)
            .single();

        if (msgError) throw msgError;

        // 2. Update ticket status and updated_at
        const ticketUpdates = { updated_at: new Date().toISOString() };
        if (status) {
            ticketUpdates.status = status;
        } else if (!is_internal) {
            // If it's a public reply from admin, set status to 'awaiting_customer' if it was 'open'
            ticketUpdates.status = 'awaiting_customer';
        }

        const { error: ticketError } = await adminClient
            .from('support_tickets')
            .update(ticketUpdates)
            .eq('id', id);

        if (ticketError) {
            console.error("Error updating ticket status:", ticketError);
            // Non-fatal for the message insert
        }

        res.status(201).json({ 
            message: "Message added successfully", 
            data: newMessage 
        });
    } catch (error) {
        console.error("Error adding ticket message:", error);
        res.status(500).json({ error: "Failed to add ticket message" });
    }
};

exports.pruneResolvedSupportTickets = async () => {
    try {
        const cutoffIso = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
        const adminClient = getServiceSupabase();
        const { data: staleTickets, error: fetchError } = await adminClient
            .from('support_tickets')
            .select('id')
            .eq('status', INTERNAL_SUPPORT_STATUS.resolved)
            .lte('resolved_at', cutoffIso);

        if (fetchError) throw fetchError;

        const ids = (staleTickets || []).map((row) => row.id).filter(Boolean);
        if (ids.length === 0) {
            return { pruned: 0 };
        }

        const { error: deleteError } = await adminClient
            .from('support_tickets')
            .delete()
            .in('id', ids);

        if (deleteError) throw deleteError;

        return { pruned: ids.length };
    } catch (error) {
        console.error('Error pruning resolved support tickets:', error);
        throw error;
    }
};

exports.prunePasswordAuditLogs = async () => {
    try {
        const cutoffIso = new Date(Date.now() - (PASSWORD_AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000)).toISOString();
        const adminClient = getServiceSupabase();

        const { data: staleRows, error: fetchError } = await adminClient
            .from('password_audit_logs')
            .select('id')
            .lte('created_at', cutoffIso);

        if (fetchError) throw fetchError;

        const ids = (staleRows || []).map((row) => row.id).filter(Boolean);
        if (ids.length === 0) {
            return { pruned: 0 };
        }

        const { error: deleteError } = await adminClient
            .from('password_audit_logs')
            .delete()
            .in('id', ids);

        if (deleteError) throw deleteError;

        return { pruned: ids.length };
    } catch (error) {
        console.error('Error pruning password audit logs:', error);
        throw error;
    }
};
