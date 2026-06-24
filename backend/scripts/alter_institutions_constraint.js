const process = require("node:process");
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function alterConstraint() {
    console.log('Altering constraint on:', supabaseUrl);

    const sql = `
        ALTER TABLE institutions DROP CONSTRAINT IF EXISTS institutions_subscription_plan_check;
        ALTER TABLE institutions ADD CONSTRAINT institutions_subscription_plan_check 
        CHECK (subscription_plan IN ('trial', 'demo', 'beta', 'beta_free', 'free', 'basic', 'pro', 'premium', 'custom'));
    `;

    try {
        const { data, error } = await supabase.rpc('execute_sql_internal', { sql_query: sql });
        if (error) {
            console.error('RPC Error:', error);
            throw error;
        }
        console.log('Constraint successfully altered via RPC!');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

alterConstraint();
