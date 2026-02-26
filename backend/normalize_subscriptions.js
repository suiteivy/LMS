const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Projects/LMS/backend/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function normalizeSubscriptions() {
    console.log('Starting subscription normalization...');

    // 1. Update all institutions with 'trial' status to 'active'
    const { data: updated, error: updateError } = await supabase
        .from('institutions')
        .update({ subscription_status: 'active' })
        .eq('subscription_status', 'trial')
        .select();

    if (updateError) {
        console.error('Error updating status:', updateError);
    } else {
        console.log(`Updated ${updated?.length || 0} institutions from 'trial' to 'active' status.`);
    }

    // 2. Ensure all institutions have a subscription_cycle set to 'monthly' if null
    const { data: updatedCycle, error: cycleError } = await supabase
        .from('institutions')
        .update({ subscription_cycle: 'monthly' })
        .is('subscription_cycle', null)
        .select();

    if (cycleError) {
        console.error('Error updating cycle:', cycleError);
    } else {
        console.log(`Updated ${updatedCycle?.length || 0} institutions with default 'monthly' cycle.`);
    }

    console.log('Normalization complete.');
}

normalizeSubscriptions();
