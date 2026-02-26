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
            // Set dates far in the future just in case
            trial_end_date: new Date('2099-12-31')
        })
        .eq('name', 'Demo Academy')
        .select();

    console.log('Restored Demo Academy:', data ? data : error);
}

restoreDemoAcademy();
