const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyInstitutions() {
    console.log("Verifying Institution Data...");

    // 1. Check if institutions table exists
    const { data: insts, error: instError } = await supabase.from('institutions').select('*');
    if (instError) {
        console.error("❌ Error fetching institutions:", instError.message);
    } else {
        console.log(`✅ Table 'institutions' exists. Count: ${insts.length}`);
        if (insts.length > 0) {
            console.log("Found institutions:", insts.map(i => `${i.name} (${i.id})`));
        }
    }

    // 2. Check for users without institution_id
    const { data: users, error: usersError } = await supabase.from('users').select('id, email, full_name, role').is('institution_id', null);
    if (usersError) {
        console.error("❌ Error fetching users without institution:", usersError.message);
    } else {
        console.log(`⚠️ Users missing institution_id: ${users.length}`);
        if (users.length > 0) {
            users.forEach(u => console.log(`- ${u.email} (${u.role})`));
        }
    }
}

verifyInstitutions();
