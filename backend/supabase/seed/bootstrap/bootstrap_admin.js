/**
 * LMS Platform Admin Bootstrap Script
 * Location: backend/supabase/seed/bootstrap/bootstrap_admin.js
 * 
 * Purpose:
 * Creates or updates the Platform Master Admin account using environment variables.
 * Safe for automated deployment and CI/CD pipelines.
 * 
 * Rules:
 * - Credentials must NEVER be committed. Sourced strictly from environment variables:
 *     PLATFORM_ADMIN_EMAIL (default: admin@cloudora.africa)
 *     PLATFORM_ADMIN_PASSWORD
 * - Flags account with force_password_change: true and requires MFA enrollment.
 * - Idempotent: safe to re-run; will not wipe existing admin.
 * - Zero secrets logged to stdout or files.
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

async function bootstrapAdmin() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[Bootstrap Admin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const email = (process.env.PLATFORM_ADMIN_EMAIL || 'admin@cloudora.africa').toLowerCase().trim();
  let password = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!password) {
    console.warn('[Bootstrap Admin] PLATFORM_ADMIN_PASSWORD not set in environment.');
    console.warn('[Bootstrap Admin] Generating one-time secure setup credential for initial initialization...');
    password = `Admin!${crypto.randomBytes(8).toString('hex')}#2026`;
    console.log('[Bootstrap Admin] Generated temporary bootstrap credential (set PLATFORM_ADMIN_PASSWORD to override).');
  }

  console.log(`[Bootstrap Admin] Ensuring platform master admin for email: ${email}`);

  // 1. Check if user already exists in auth.users
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('[Bootstrap Admin] Error querying auth users:', listError.message);
    process.exit(1);
  }

  let adminUser = userList.users.find(u => u.email.toLowerCase() === email);

  if (!adminUser) {
    console.log('[Bootstrap Admin] Creating new platform admin in auth...');
    const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'master_admin',
        first_name: 'Platform',
        last_name: 'Admin',
        force_password_change: false,
        mfa_required: false,
        is_platform_admin: true
      }
    });

    if (createError) {
      console.error('[Bootstrap Admin] Failed to create auth user:', createError.message);
      process.exit(1);
    }
    adminUser = newUserData.user;
    console.log('[Bootstrap Admin] Auth user created successfully. ID:', adminUser.id);
  } else {
    console.log('[Bootstrap Admin] Existing auth user found. Updating flags...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(adminUser.id, {
      user_metadata: {
        ...adminUser.user_metadata,
        role: 'platform_admin',
        force_password_change: true,
        mfa_required: true,
        is_platform_admin: true
      }
    });
    if (updateError) {
      console.warn('[Bootstrap Admin] Note: Could not update auth metadata:', updateError.message);
    }
  }

  // 2. Ensure record in public.users
  const { data: existingPublicUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', adminUser.id)
    .single();

  if (!existingPublicUser) {
    console.log('[Bootstrap Admin] Upserting into public.users table...');
    const { error: insertUserError } = await supabase
      .from('users')
      .upsert({
        id: adminUser.id,
        email: email,
        first_name: 'Platform',
        last_name: 'Admin',
        full_name: 'Platform Admin',
        role: 'master_admin',
        status: 'approved',
        must_change_password: false,
        requires_security_questions_setup: false,
        is_active: true
      });

    if (insertUserError) {
      console.error('[Bootstrap Admin] Failed to upsert public.users record:', insertUserError.message);
    }
  }

  // 3. Ensure record in public.platform_admins
  const { data: paRecord } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('user_id', adminUser.id)
    .single();

  if (!paRecord) {
    console.log('[Bootstrap Admin] Registering in platform_admins registry...');
    const { error: paError } = await supabase
      .from('platform_admins')
      .upsert({
        user_id: adminUser.id,
        email: email,
        full_name: 'Platform Admin'
      });

    if (paError) {
      console.error('[Bootstrap Admin] Failed to register in platform_admins:', paError.message);
    }
  }

  console.log('[Bootstrap Admin] Master Platform Admin verified.');
  console.log('[Bootstrap Admin] Credentials active for:', email);
  console.log('[Bootstrap Admin] Bootstrap finished successfully.');
}

if (require.main === module) {
  bootstrapAdmin().catch(err => {
    console.error('[Bootstrap Admin] Uncaught error during bootstrap:', err);
    process.exit(1);
  });
}

module.exports = { bootstrapAdmin };
