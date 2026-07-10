const process = require("node:process");
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreDemoAcademy() {
    const { data, error } = await supabase.from('institutions')
        .update({
            subscription_status: 'active',
            subscription_plan: 'premium',
            // Ensure tracking starts now for reconciliation logic
            subscription_tracking_start_date: new Date().toISOString()
        })
        .eq('name', 'Demo Academy')
        .select();

    console.log('Restored Demo Academy:', data ? data : error);
}

restoreDemoAcademy();
