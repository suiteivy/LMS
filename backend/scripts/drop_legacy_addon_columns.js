const process = require('node:process');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function ensureRpc() {
  const fnSql = `
CREATE OR REPLACE FUNCTION public.execute_sql_internal(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;
`;

  const { error } = await supabase.rpc('execute_sql_internal', { sql_query: fnSql });
  if (error && !String(error.message || '').toLowerCase().includes('does not exist')) {
    return;
  }
}

async function main() {
  console.log('Dropping legacy add-on columns from institutions...');
  await ensureRpc();

  const sql = `
ALTER TABLE institutions DROP COLUMN IF EXISTS addon_finance;
ALTER TABLE institutions DROP COLUMN IF EXISTS addon_analytics;
ALTER TABLE institutions DROP COLUMN IF EXISTS addon_attendance;
`;

  const { error } = await supabase.rpc('execute_sql_internal', { sql_query: sql });
  if (error) {
    console.error('Failed to drop columns:', error.message || error);
    process.exit(1);
  }

  console.log('Legacy columns removed: addon_finance, addon_analytics, addon_attendance');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
