const process = require('node:process');
const path = require('node:path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const A_EMAIL = process.env.DM_TEST_USER_A_EMAIL || 'dm.security.user.a@test.local';
const B_EMAIL = process.env.DM_TEST_USER_B_EMAIL || 'dm.security.user.b@test.local';
const C_EMAIL = process.env.DM_TEST_USER_C_EMAIL || 'dm.security.user.c@test.local';
const D_EMAIL = process.env.DM_TEST_USER_D_EMAIL || 'dm.security.user.d@test.local';
const FIXTURE_PASSWORD = process.env.DM_TEST_USER_PASSWORD || 'DmFixture123!';

const OUTPUT_MODE = (process.env.DM_FIXTURE_OUTPUT || 'env').toLowerCase();

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function pickInstitutionId(usersRows) {
  const explicit = process.env.DM_TEST_INSTITUTION_ID;
  if (explicit) return explicit;
  const fromUsers = usersRows.find((u) => u?.institution_id)?.institution_id;
  return fromUsers || null;
}

async function ensureAuthUser(email, role) {
  const { data: listData, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;

  let user = (listData?.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase());

  if (!user) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: FIXTURE_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: email, role },
    });
    if (createError) throw createError;
    user = created.user;
  }

  return user;
}

async function ensurePublicUser(authUserId, email, role, institutionId) {
  const { data: existing, error: existingError } = await admin
    .from('users')
    .select('id, institution_id, role')
    .eq('id', authUserId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (!existing) {
    const { error: insertError } = await admin.from('users').insert({
      id: authUserId,
      email,
      full_name: email,
      role,
      institution_id: institutionId,
    });
    if (insertError) throw insertError;
    return;
  }

  if (institutionId && existing.institution_id !== institutionId) {
    const { error: updateError } = await admin
      .from('users')
      .update({ institution_id: institutionId })
      .eq('id', authUserId);
    if (updateError) throw updateError;
  }
}

async function ensureDirectConversation(institutionId, user1Id, user2Id) {
  const directKey = [user1Id, user2Id].sort().join(':');

  const { data: convo, error: convoError } = await admin
    .from('conversations')
    .upsert(
      {
        institution_id: institutionId,
        type: 'DIRECT',
        direct_key: directKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'institution_id,direct_key' }
    )
    .select('id')
    .single();

  if (convoError) throw convoError;

  const { error: participantsError } = await admin.from('conversation_participants').upsert(
    [
      { conversation_id: convo.id, user_id: user1Id, deleted_at: null },
      { conversation_id: convo.id, user_id: user2Id, deleted_at: null },
    ],
    { onConflict: 'conversation_id,user_id' }
  );
  if (participantsError) throw participantsError;

  return convo.id;
}

async function createJwtForEmail(email) {
  const anon = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await anon.auth.signInWithPassword({ email, password: FIXTURE_PASSWORD });
  if (error) throw error;
  return data.session?.access_token;
}

async function main() {
  const userA = await ensureAuthUser(A_EMAIL, 'admin');
  const userB = await ensureAuthUser(B_EMAIL, 'teacher');
  const userC = await ensureAuthUser(C_EMAIL, 'teacher');
  const userD = await ensureAuthUser(D_EMAIL, 'parent');

  const { data: publicUsers, error: publicUsersError } = await admin
    .from('users')
    .select('id, institution_id')
    .in('id', [userA.id, userB.id, userC.id, userD.id]);
  if (publicUsersError) throw publicUsersError;

  const institutionId = pickInstitutionId(publicUsers || []);
  if (!institutionId) {
    throw new Error('Unable to resolve institution_id. Set DM_TEST_INSTITUTION_ID or ensure fixture users have institution_id.');
  }

  await ensurePublicUser(userA.id, A_EMAIL, 'admin', institutionId);
  await ensurePublicUser(userB.id, B_EMAIL, 'teacher', institutionId);
  await ensurePublicUser(userC.id, C_EMAIL, 'teacher', institutionId);
  await ensurePublicUser(userD.id, D_EMAIL, 'parent', institutionId);

  const convAOnly = await ensureDirectConversation(institutionId, userA.id, userC.id);
  const convBOnly = await ensureDirectConversation(institutionId, userB.id, userD.id);
  const convShared = await ensureDirectConversation(institutionId, userA.id, userB.id);

  const jwtA = await createJwtForEmail(A_EMAIL);
  const jwtB = await createJwtForEmail(B_EMAIL);

  const output = {
    DM_TEST_USER_A_EMAIL: A_EMAIL,
    DM_TEST_USER_B_EMAIL: B_EMAIL,
    DM_TEST_USER_A_JWT: jwtA,
    DM_TEST_USER_B_JWT: jwtB,
    DM_TEST_CONV_A_ONLY: convAOnly,
    DM_TEST_CONV_B_ONLY: convBOnly,
    DM_TEST_CONV_SHARED: convShared,
    DM_TEST_INSTITUTION_ID: institutionId,
  };

  if (OUTPUT_MODE === 'json') {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  Object.entries(output).forEach(([k, v]) => {
    console.log(`${k}=${v}`);
  });
}

main().catch((err) => {
  console.error('Failed to seed DM security fixture:', err.message || err);
  process.exit(1);
});
