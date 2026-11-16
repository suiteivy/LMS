const { createClient } = require('@supabase/supabase-js');
const { createCrmSnapshotRouter } = require('../utils/crmSnapshotRouter.js');

function getLmsClient() {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('LMS Supabase server credentials are missing');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const adapter = {
  async getSnapshot({ limit, cursor }) {
    const db = getLmsClient();
    // One read-only RPC gives totals and a page from one database snapshot.
    // It excludes school fee payments from product subscription revenue.
    const { data, error } = await db.rpc('crm_lms_snapshot', {
      after_id: cursor,
      page_size: limit,
    });
    if (error) throw error;
    return {
      product: { external_id: 'lms', name: 'Cloudora LMS' },
      summary: data?.summary,
      accounts: data?.page?.accounts,
      next_cursor: data?.page?.next_cursor,
    };
  },
};

module.exports = createCrmSnapshotRouter(adapter);
