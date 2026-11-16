// Run from anywhere with: node backend/scripts/diagnoseCrmSnapshot.js
// Calls the same LMS Supabase RPC as the CRM route. Prints only a status or
// database error, never the read key, service key, or customer records.
const path = require('node:path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

async function main() {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing LMS Supabase server URL or service role key.');
    process.exitCode = 1;
    return;
  }

  try {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await db.rpc('crm_lms_snapshot', {
      after_id: null,
      page_size: 2,
    });

    if (error) {
      console.error('LMS snapshot RPC failed.');
      console.error('Code:', error.code || '(none)');
      console.error('Message:', error.message || '(none)');
      if (error.hint) console.error('Hint:', error.hint);
      process.exitCode = 1;
      return;
    }
    if (!data?.summary || !Array.isArray(data?.page?.accounts)) {
      console.error('LMS snapshot RPC returned an incomplete response.');
      process.exitCode = 1;
      return;
    }
    console.log('LMS snapshot RPC succeeded; page size:', data.page.accounts.length);
  } catch (error) {
    console.error('LMS snapshot request failed:', error?.message || String(error));
    process.exitCode = 1;
  }
}

main();
