const test = require('node:test');
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'DM_TEST_USER_A_JWT',
  'DM_TEST_USER_B_JWT',
  'DM_TEST_CONV_A_ONLY',
  'DM_TEST_CONV_B_ONLY',
  'DM_TEST_CONV_SHARED',
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

function authClient(jwt) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}

async function selectConversation(client, conversationId) {
  const { data, error } = await client
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .maybeSingle();
  assert.equal(error, null, error?.message || 'conversation select failed');
  return data;
}

async function selectParticipants(client, conversationId) {
  const { data, error } = await client
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .eq('conversation_id', conversationId);
  assert.equal(error, null, error?.message || 'participants select failed');
  return data || [];
}

async function selectMessages(client, conversationId) {
  const { data, error } = await client
    .from('messages')
    .select('id, conversation_id, sender_id, content, deleted_for_everyone_at')
    .eq('conversation_id', conversationId)
    .limit(20);
  assert.equal(error, null, error?.message || 'messages select failed');
  return data || [];
}

test('RLS: A/B/shared DM visibility matrix', async (t) => {
  if (missingEnv.length) {
    t.skip(`Missing env for DM RLS integration harness: ${missingEnv.join(', ')}`);
    return;
  }

  const clientA = authClient(process.env.DM_TEST_USER_A_JWT);
  const clientB = authClient(process.env.DM_TEST_USER_B_JWT);

  const convAOnly = process.env.DM_TEST_CONV_A_ONLY;
  const convBOnly = process.env.DM_TEST_CONV_B_ONLY;
  const convShared = process.env.DM_TEST_CONV_SHARED;

  // A-only conversation
  assert.ok(await selectConversation(clientA, convAOnly), 'A must see A-only conversation');
  assert.equal(await selectConversation(clientB, convAOnly), null, 'B must not see A-only conversation');
  assert.ok((await selectParticipants(clientA, convAOnly)).length > 0, 'A must see participants in A-only conversation');
  assert.equal((await selectParticipants(clientB, convAOnly)).length, 0, 'B must not see participants in A-only conversation');
  assert.equal((await selectMessages(clientB, convAOnly)).length, 0, 'B must not see messages in A-only conversation');

  // B-only conversation
  assert.ok(await selectConversation(clientB, convBOnly), 'B must see B-only conversation');
  assert.equal(await selectConversation(clientA, convBOnly), null, 'A must not see B-only conversation');
  assert.ok((await selectParticipants(clientB, convBOnly)).length > 0, 'B must see participants in B-only conversation');
  assert.equal((await selectParticipants(clientA, convBOnly)).length, 0, 'A must not see participants in B-only conversation');
  assert.equal((await selectMessages(clientA, convBOnly)).length, 0, 'A must not see messages in B-only conversation');

  // Shared conversation
  assert.ok(await selectConversation(clientA, convShared), 'A must see shared conversation');
  assert.ok(await selectConversation(clientB, convShared), 'B must see shared conversation');

  const sharedForA = await selectMessages(clientA, convShared);
  const sharedForB = await selectMessages(clientB, convShared);

  // Both users can query shared message stream and never receive data from other conversations.
  for (const row of [...sharedForA, ...sharedForB]) {
    assert.equal(row.conversation_id, convShared);
  }
});
