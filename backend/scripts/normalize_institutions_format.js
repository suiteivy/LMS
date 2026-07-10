const process = require('node:process');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ACCESS_TOKEN ||
  process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (preferred).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const APPLY = process.argv.includes('--apply');

const VALID_PLANS = new Set(['beta', 'beta_free', 'free', 'basic', 'pro', 'premium']);
const VALID_STATUSES = new Set(['active', 'expired', 'cancelled', 'suspended']);
const VALID_TYPES = new Set(['primary', 'secondary', 'tertiary', 'vocational']);

function normalizePlan(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'trial' || raw === 'demo') return 'basic';
  if (raw === 'custom') return 'premium';
  if (VALID_PLANS.has(raw)) return raw;
  if (raw === 'canceled') return 'cancelled';
  return 'basic';
}

function normalizeStatus(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'trial') return 'active';
  if (VALID_STATUSES.has(raw)) return raw;
  if (raw === 'canceled') return 'cancelled';
  if (raw === 'disabled') return 'suspended';
  return 'active';
}

function normalizeType(value) {
  const raw = String(value || '').trim().toLowerCase();
  return VALID_TYPES.has(raw) ? raw : null;
}

function toBoolean(value, fallback = false) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  const raw = String(value).toLowerCase().trim();
  if (raw === 'true' || raw === '1' || raw === 'yes') return true;
  if (raw === 'false' || raw === '0' || raw === 'no') return false;
  return fallback;
}

function deriveEmailDomain(emailDomain, email) {
  if (emailDomain && String(emailDomain).includes('.')) return String(emailDomain).toLowerCase().trim();
  if (!email || !String(email).includes('@')) return null;
  return String(email).split('@')[1].toLowerCase().trim() || null;
}

function normalizeInstitutionRow(row, validCategoryIds) {
  const subscription_plan = normalizePlan(row.subscription_plan);
  const subscription_status = normalizeStatus(row.subscription_status);
  const type = normalizeType(row.type);
  const subscription_tracking_start_date =
    row.subscription_tracking_start_date || row.trial_start_date || row.created_at || new Date().toISOString();

  const category_id = validCategoryIds.has(row.category_id) ? row.category_id : null;

  return {
    name: row.name || 'Unnamed Institution',
    location: row.location || null,
    phone: row.phone || null,
    email: row.email || null,
    type,
    principal_name: row.principal_name || null,
    subscription_status,
    subscription_plan,
    has_used_trial: toBoolean(row.has_used_trial, true),
    subscription_tracking_start_date,
    addon_bursary: toBoolean(row.addon_bursary, false),
    addon_library: toBoolean(row.addon_library, false),
    addon_messaging: toBoolean(row.addon_messaging, false),
    addon_diary: toBoolean(row.addon_diary, false),
    email_domain: deriveEmailDomain(row.email_domain, row.email),
    custom_student_limit:
      row.custom_student_limit === null || row.custom_student_limit === undefined || row.custom_student_limit === ''
        ? null
        : Number.isFinite(Number(row.custom_student_limit))
        ? Number(row.custom_student_limit)
        : null,
    category_id,
  };
}

async function main() {
  console.log(`Starting institutions normalization (${APPLY ? 'APPLY' : 'DRY RUN'})...`);

  const { data: categories, error: categoriesError } = await supabase.from('school_categories').select('id');
  if (categoriesError) {
    console.error('Failed to load school categories:', categoriesError.message);
    process.exit(1);
  }
  const validCategoryIds = new Set((categories || []).map((c) => c.id));

  const { data: institutions, error: institutionsError } = await supabase.from('institutions').select('*').order('created_at');
  if (institutionsError) {
    console.error('Failed to load institutions:', institutionsError.message);
    process.exit(1);
  }

  const rows = institutions || [];
  console.log(`Loaded ${rows.length} institutions.`);

  const updates = rows.map((row) => ({ id: row.id, payload: normalizeInstitutionRow(row, validCategoryIds), original: row }));

  const changed = updates.filter(({ payload, original }) =>
    Object.keys(payload).some((k) => {
      const before = original[k];
      const after = payload[k];
      return before !== after;
    })
  );

  console.log(`Rows requiring normalization: ${changed.length}`);

  if (changed.length > 0) {
    console.log('Preview (first 10 changes):');
    changed.slice(0, 10).forEach(({ id, payload, original }) => {
      const diffKeys = Object.keys(payload).filter((k) => original[k] !== payload[k]);
      console.log(`- ${id}: ${diffKeys.join(', ')}`);
    });
  }

  if (!APPLY) {
    console.log('Dry run complete. Re-run with --apply to write changes.');
    return;
  }

  let success = 0;
  let failed = 0;
  for (const item of changed) {
    const { id, payload } = item;
    const { error } = await supabase.from('institutions').update(payload).eq('id', id);
    if (error) {
      failed += 1;
      console.error(`Failed row ${id}:`, error.message);
    } else {
      success += 1;
    }
  }

  console.log(`Normalization finished. Success: ${success}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error('Unexpected failure:', err);
  process.exit(1);
});
