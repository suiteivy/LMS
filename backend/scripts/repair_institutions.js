const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function repairUserInstitutions() {
    console.log("Starting User Institution Repair...");

    // 1. Get the default institution ID
    const { data: insts, error: instError } = await supabase
        .from('institutions')
        .select('id')
        .ilike('name', '%Momentum%')
        .limit(1);

    if (instError || !insts || insts.length === 0) {
        console.error("❌ Could not find Momentum school institution:", instError?.message || "Not found");
        return;
    }

    const defaultId = insts[0].id;
    console.log(`✅ Using default institution ID: ${defaultId}`);

    // 2. Update users who have null institution_id
    const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({ institution_id: defaultId })
        .is('institution_id', null)
        .select('email');

    if (updateError) {
        console.error("❌ Error updating users:", updateError.message);
    } else {
        console.log(`✅ Successfully linked ${updated.length} users to the institution.`);
        updated.forEach(u => console.log(`- Updated: ${u.email}`));
    }
}

repairUserInstitutions();
