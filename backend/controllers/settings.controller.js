// controllers/settings.controller.js
const supabase = require("../utils/supabaseClient");
const axios = require("axios");

/**
 * Get current exchange rates
 */
exports.getCurrencyRates = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("system_settings")
            .select("*")
            .eq("key", "exchange_rates")
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            return res.json({ KES: 130.0, last_updated: null });
        }

        res.json(data.value);
    } catch (err) {
        console.error("Get currency rates error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update exchange rates from external API
 */
exports.updateCurrencyRates = async (req, res) => {
    try {
        console.log("[Settings] Updating currency rates...");

        // Use open.er-api.com (Free, no key required for basic USD rates)
        const response = await axios.get("https://open.er-api.com/v6/latest/USD");

        if (!response.data || !response.data.rates) {
            throw new Error("Invalid response from exchange rate API");
        }

        const kesRate = response.data.rates.KES;
        if (!kesRate) throw new Error("KES rate not found in API response");

        const newValue = {
            KES: kesRate,
            last_updated: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from("system_settings")
            .upsert({ key: "exchange_rates", value: newValue }, { onConflict: 'key' })
            .select()
            .single();

        if (error) throw error;

        console.log(`[Settings] Updated KES rate to ${kesRate}`);
        res.json(data.value);
    } catch (err) {
        console.error("Update currency rates error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Check and auto-update if stale (24h)
 */
exports.checkAndAutoUpdateRates = async () => {
    try {
        const { data } = await supabase
            .from("system_settings")
            .select("*")
            .eq("key", "exchange_rates")
            .single();

        if (data && data.value && data.value.last_updated) {
            const lastUpdate = new Date(data.value.last_updated);
            const now = new Date();
            const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

            if (hoursSinceUpdate < 24) {
                console.log(`[Settings] Rates are fresh (${hoursSinceUpdate.toFixed(1)}h old). Skipping auto-update.`);
                return;
            }
        }

        // Trigger update
        await exports.updateCurrencyRates({}, { json: () => { } });
    } catch (err) {
        console.error("Auto-update rates error:", err);
    }
};
