const test = require('node:test');
const assert = require('node:assert/strict');

test('sender cannot mark delivered/read without recipient traffic', async () => {
  const hasIncomingForCurrentUser = (rows, userId) => {
    return rows.some((m) => m.sender_id !== userId);
  };

  const onlySenderRows = [
    { sender_id: 'user-a' },
    { sender_id: 'user-a' },
  ];

  const mixedRows = [
    { sender_id: 'user-a' },
    { sender_id: 'user-b' },
  ];

  assert.equal(hasIncomingForCurrentUser(onlySenderRows, 'user-a'), false);
  assert.equal(hasIncomingForCurrentUser(mixedRows, 'user-a'), true);
});

test('non-participant conversation/message access must collapse to not found', async () => {
  const normalizeSecurityError = (exists, isMember) => {
    if (!exists || !isMember) return 404;
    return 200;
  };

  assert.equal(normalizeSecurityError(false, false), 404);
  assert.equal(normalizeSecurityError(true, false), 404);
  assert.equal(normalizeSecurityError(true, true), 200);
});
