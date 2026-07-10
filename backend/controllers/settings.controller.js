// controllers/settings.controller.js
const supabase = require("../utils/supabaseClient.js");
const axios = require("axios");
const { isTransientSupabaseError, withSupabaseRetry } = require('../utils/supabaseRetry.js');

const FX_PROVIDERS = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.frankfurter.app/latest?from=USD&to=KES',
];

const isNetworkLookupError = (err) => {
    const code = err?.code || err?.cause?.code;
    return ['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT'].includes(code);
};

const extractKesRate = (payload) => {
    const kes = Number(payload?.rates?.KES);
    return Number.isFinite(kes) && kes > 0 ? kes : null;
};

const fetchKesRateFromProviders = async () => {
    const failures = [];

    for (const url of FX_PROVIDERS) {
        try {
            const response = await axios.get(url, { timeout: 10000 });
            const kesRate = extractKesRate(response?.data);
            if (kesRate) return { kesRate, source: url };
            failures.push({ url, reason: 'KES rate missing from response' });
        } catch (error) {
            failures.push({
                url,
                reason: error?.message || 'request failed',
                code: error?.code || error?.cause?.code || null,
            });
        }
    }

    const err = new Error('Failed to fetch KES rate from all providers');
    err.failures = failures;
    throw err;
};

const getCurrentKesRate = async () => {
    const { data } = await supabase
        .from('currencies')
        .select('usd_rate, updated_at')
        .eq('code', 'KES')
        .maybeSingle();

    return {
        KES: Number(data?.usd_rate || 130),
        last_updated: data?.updated_at || null,
    };
};

/**
 * Get active currencies (public read)
 */
exports.getCurrencies = async (_req, res) => {
    try {
        const { data, error } = await withSupabaseRetry(() =>
            supabase
                .from('currencies')
                .select('id, code, name, symbol, usd_rate, decimal_places, is_default, is_active, created_at, updated_at')
                .eq('is_active', true)
                .order('is_default', { ascending: false })
                .order('code', { ascending: true })
        );

        if (error) throw error;
        return res.status(200).json({ currencies: data || [] });
    } catch (err) {
        console.error('Get currencies error:', err);
        if (isTransientSupabaseError(err)) {
            return res.status(200).json({ currencies: [], stale: true });
        }
        return res.status(500).json({ error: 'Failed to fetch currencies' });
    }
};

/**
 * Backward-compatible exchange-rate endpoint used by legacy clients
 */
exports.getCurrencyRates = async (_req, res) => {
    const defaultRates = { KES: 130.0, last_updated: null };

    try {
        const { data, error } = await withSupabaseRetry(() =>
            supabase
                .from('currencies')
                .select('usd_rate, updated_at')
                .eq('code', 'KES')
                .eq('is_active', true)
                .maybeSingle()
        );

        if (error) throw error;

        const legacyKes = Number(data?.value?.KES);
        const numericKes = Number(data?.usd_rate);
        return res.status(200).json({
            KES: Number.isFinite(numericKes) && numericKes > 0
                ? numericKes
                : (Number.isFinite(legacyKes) && legacyKes > 0 ? legacyKes : defaultRates.KES),
            last_updated: data?.updated_at || data?.value?.last_updated || null,
        });
    } catch (err) {
        console.error('Get currency rates error:', err);
        if (isTransientSupabaseError(err)) {
            return res.status(200).json({ ...defaultRates, stale: true });
        }
        return res.status(200).json(defaultRates);
    }
};

/**
 * Public maintenance mode status for clients.
 */
exports.getMaintenanceStatus = async (_req, res) => {
    try {
        const { data, error } = await withSupabaseRetry(() =>
            supabase
                .from("system_settings")
                .select("value")
                .eq("key", "maintenance_mode")
                .maybeSingle()
        );

        if (error) throw error;

        const value = data?.value || {};
        const enabled = !!value.enabled;
        const message = String(value.message || 'System maintenance is in progress. Please try again later.');

        return res.status(200).json({
            enabled,
            message,
        });
    } catch (err) {
        console.error('getMaintenanceStatus error:', err);
        if (isTransientSupabaseError(err)) {
            return res.status(200).json({
                enabled: false,
                message: 'System maintenance status is temporarily unavailable.',
                stale: true,
            });
        }
        return res.status(200).json({
            enabled: false,
            message: 'System maintenance is in progress. Please try again later.',
        });
    }
};

/**
 * Institution subscription snapshot for admin-side sync views
 */
exports.getInstitutionSubscriptionSnapshot = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data: userRow, error: userError } = await supabase
            .from('users')
            .select('institution_id')
            .eq('id', userId)
            .single();

        if (userError || !userRow?.institution_id) {
            return res.status(404).json({ error: 'Institution not found for user' });
        }

        const institutionId = userRow.institution_id;
        const [{ data: institution, error: instError }, { data: txRows, error: txError }] = await Promise.all([
            supabase
                .from('institutions')
                .select('id, name, subscription_plan, subscription_status')
                .eq('id', institutionId)
                .single(),
            supabase
                .from('financial_transactions')
                .select('amount, status, type, direction')
                .eq('institution_id', institutionId)
                .eq('type', 'subscription')
                .eq('direction', 'inflow'),
        ]);

        if (instError) throw instError;
        if (txError) throw txError;

        const planPrice = {
            beta: 0,
            basic: 100,
            pro: 300,
            premium: 500,
        };

        const plan = String(institution.subscription_plan || 'basic').toLowerCase();
        const expectedAmount = planPrice[plan] ?? 0;
        const paidAmount = (txRows || []).reduce((sum, row) => {
            if (row.status !== 'completed') return sum;
            return sum + Number(row.amount || 0);
        }, 0);

        const difference = paidAmount - expectedAmount;

        return res.status(200).json({
            institution_id: institution.id,
            institution_name: institution.name,
            subscription_plan: institution.subscription_plan,
            subscription_status: institution.subscription_status,
            expected_amount: expectedAmount,
            paid_amount: paidAmount,
            balance_due: difference < 0 ? Math.abs(difference) : 0,
            excess_amount: difference > 0 ? difference : 0,
            is_balanced: difference === 0,
        });
    } catch (err) {
        console.error('getInstitutionSubscriptionSnapshot error:', err);
        return res.status(500).json({ error: 'Failed to fetch subscription snapshot' });
    }
};

/**
 * Update KES exchange rate from external API (legacy compatibility)
 */
exports.updateCurrencyRates = async (_req, res) => {
    try {
        const { kesRate, source } = await fetchKesRateFromProviders();

        const { data, error } = await supabase
            .from('currencies')
            .update({
                usd_rate: kesRate,
                is_active: true,
            })
            .eq('code', 'KES')
            .select('usd_rate, updated_at')
            .single();

        if (error) throw error;

        res.json({
            KES: Number(data?.usd_rate || kesRate),
            last_updated: data?.updated_at || new Date().toISOString(),
            source,
        });
    } catch (err) {
        if (isNetworkLookupError(err) || (Array.isArray(err?.failures) && err.failures.some((f) => isNetworkLookupError({ code: f.code })))) {
            console.warn('Currency update skipped due to DNS/network issue.', {
                reason: err?.message,
                failures: err?.failures || [],
            });

            const fallback = await getCurrentKesRate();
            if (res && typeof res.status === "function") {
                return res.status(200).json({ ...fallback, stale: true, source: 'cache' });
            }
            return;
        }

        console.error("Update currency rates error:", err?.message || err);
        const fallback = await getCurrentKesRate();
        if (res && typeof res.status === "function") {
            res.status(200).json({ ...fallback, stale: true, source: 'cache' });
        }
    }
};

/**
 * Check and auto-update if stale (24h)
 */
exports.checkAndAutoUpdateRates = async () => {
    try {
        const { data } = await supabase
            .from('currencies')
            .select('updated_at')
            .eq('code', 'KES')
            .maybeSingle();

        if (data?.updated_at) {
            const lastUpdate = new Date(data.updated_at);
            const now = new Date();
            const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

            if (hoursSinceUpdate < 24) {
                return;
            }
        }

        // Trigger update with stub res (no HTTP context)
        const stubRes = { status: () => ({ json: () => {} }), json: () => {} };
        await exports.updateCurrencyRates({}, stubRes);
    } catch (err) {
        console.error("Auto-update rates error:", err);
    }
};

/**
 * Create a new support request from a user
 */
exports.createSupportRequest = async (req, res) => {
    try {
        const { subject, description, priority } = req.body;
        const userId = req.userId;
        const _userRole = req.userRole;

        if (!subject || !description) {
            return res.status(400).json({ error: "Subject and description are required" });
        }

        // Fetch user's institution
        const { data: user } = await supabase
            .from('users')
            .select('institution_id')
            .eq('id', userId)
            .single();

        const institutionId = user?.institution_id || null;

        const { data, error } = await supabase
            .from('support_requests')
            .insert([{
                user_id: userId,
                institution_id: institutionId,
                subject: subject,
                description: description,
                priority: priority || 'normal',
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: "Support request created", request: data });
    } catch (err) {
        console.error("Create support request error:", err);
        res.status(500).json({ error: "Failed to create support request" });
    }
};
