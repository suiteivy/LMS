const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

dotenv.config();

let supabaseInstance = null;

function getClient() {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
        let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseKey) {
            console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY not found. Using ANON key.");
            supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        }

        if (!supabaseUrl || !supabaseKey) {
            console.error("ERROR: Supabase URL or Key missing during initialization.");
        }
        supabaseInstance = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
    }
    return supabaseInstance;
}

const supabaseProxy = new Proxy({}, {
    get: function (target, prop) {
        const client = getClient();
        const value = client[prop];
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    }
});

module.exports = supabaseProxy;
