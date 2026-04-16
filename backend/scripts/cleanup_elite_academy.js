const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ELITE_INSTITUTION_ID = "dff6eed3-4e43-4d98-8e92-51cf41fa5338";

async function cleanup() {
  console.log('--- Deleting Elite International Academy & Data ---');
  
  try {
    // 1. Find all users associated with this institution to delete auth accounts
    const { data: users, error: userFetchError } = await supabase
      .from('users')
      .select('id, email')
      .eq('institution_id', ELITE_INSTITUTION_ID);

    if (userFetchError) throw userFetchError;

    console.log(`Found ${users.length} users to delete from Auth.`);

    for (const u of users) {
      if (u.id) {
        console.log(`Deleting Auth User: ${u.email} (${u.id})`);
        const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
        if (delErr) console.error(`Error deleting auth user ${u.email}:`, delErr.message);
      }
    }

    // 2. Cascade delete will handle most things, but let's be thorough if needed.
    // In Supabase/Postgres, if ON DELETE CASCADE is set, deleting the institution is enough.
    // However, we'll delete the users first to satisfy FKs if they aren't cascadable.
    
    console.log('Deleting database records for institution...');
    const { error: instDelError } = await supabase
      .from('institutions')
      .delete()
      .eq('id', ELITE_INSTITUTION_ID);

    if (instDelError) throw instDelError;

    console.log('--- Cleanup Finished Successfully ---');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

cleanup();
